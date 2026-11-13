/**
 * js/studio/ExplainBack.js — อธิบายโค้ดของฉัน / ทำนายผล (Explain-Back) (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: C (โค้ชกันเอง — อธิบายให้คนอื่นเข้าใจ), P
 * ปัญหาที่แก้ (รายงาน v86 ข้อเสนอ 11.2 ข้อ 2): ผู้เรียนนำโค้ดจาก AI ภายนอกมาส่งโดยไม่เข้าใจ
 * หลังผ่านโจทย์สำคัญ ผู้เรียนต้อง
 *   (1) อธิบายโค้ดของตนเอง 2–3 ประโยค → AI ประเมินระดับความเข้าใจ 0–3 + คำถามถามต่อ 1 ข้อ
 *       (ถ้า AI ใช้ไม่ได้ ใช้เกณฑ์สำรองในเครื่อง ระดับสูงสุด 2 และคำถามจากคลัง)
 *   หรือ (2) ทำนายผลลัพธ์ของโค้ดตนเองกับข้อมูลชุดใหม่ (ตรวจอัตโนมัติ ไม่ใช้ AI)
 * ผลนี้ใช้เป็นข้อมูลให้ครู "ไม่ใช่คะแนนตัดเกรดอัตโนมัติ"
 */

const EB_LEVEL_TEXT = ['ยังไม่สะท้อนความเข้าใจ', 'เข้าใจบางส่วน', 'เข้าใจลำดับการทำงาน', 'เข้าใจและอธิบายเหตุผลได้'];
const _EB_CONCEPT_WORDS = ['รับ', 'แสดง', 'เงื่อนไข', 'ถ้า', 'ไม่เช่นนั้น', 'วน', 'ทำซ้ำ', 'รอบ', 'ลิสต์', 'ฟังก์ชัน', 'คืนค่า', 'คำนวณ', 'ตัวแปร', 'เก็บ', 'บวก', 'หาร', 'เศษ', 'เปรียบเทียบ', 'แปลง'];
const _EB_PY_WORDS = new Set(['and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'the']);

const ebFollowUpBank = (code) => {
    const c = code || '';
    if (/\bdef\b/.test(c)) return 'ฟังก์ชันของคุณรับค่าอะไรเข้าไป และคืนค่าอะไรกลับมา ถ้าไม่ใช้ return จะเกิดอะไรขึ้น';
    if (/\bwhile\b/.test(c)) return 'ลูป while ของคุณหยุดเมื่อไร ถ้าลืมบรรทัดที่เปลี่ยนค่าตัวแปรในลูปจะเกิดอะไรขึ้น';
    if (/\bfor\b/.test(c)) return 'ถ้าข้อมูลนำเข้าเป็น 3 ลูปของคุณทำงานกี่รอบ และตัวแปรในลูปมีค่าอะไรบ้าง';
    if (/\bif\b/.test(c)) return 'ถ้าข้อมูลนำเข้าอยู่ที่ค่าขอบพอดี โค้ดของคุณจะเข้าเงื่อนไขไหน เพราะอะไร';
    if (/int\(|float\(/.test(c)) return 'ทำไมต้องใช้ int() หรือ float() กับข้อมูลจาก input() ถ้าไม่ใช้จะเกิดอะไรขึ้น';
    return 'ถ้าลบบรรทัดใดบรรทัดหนึ่งในโค้ดของคุณออก ผลลัพธ์จะเปลี่ยนไปอย่างไร';
};

// เกณฑ์สำรองเมื่อ AI ใช้ไม่ได้ (เช่น โควตาหมด): นับว่าคำอธิบายพูดถึงชื่อในโค้ดและแนวคิดสำคัญกี่อย่าง
const ebHeuristicLevel = (code, text) => {
    const t = (text || '').trim();
    if (t.length < 20) return 0;
    const lower = t.toLowerCase();
    const ids = [...new Set(((code || '').match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(w => w.length > 1 && !_EB_PY_WORDS.has(w)))];
    const hitIds = ids.filter(w => lower.includes(w.toLowerCase())).length;
    const hitConcepts = _EB_CONCEPT_WORDS.filter(w => t.includes(w)).length;
    const hits = hitIds + hitConcepts;
    if (hits >= 4 && t.length >= 60) return 2;
    if (hits >= 2) return 1;
    return 0;
};

const _ebNorm = (s) => String(s || '').replace(/\r\n/g, '\n').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').trim();
const ebCheckPrediction = (answer, expected) => _ebNorm(answer) === _ebNorm(expected);

const ebAiEvaluate = async (assignment, code, explanation) => {
    const prompt = `คุณเป็นครูสอนเขียนโปรแกรมระดับ ม.3 กำลังประเมิน "ความเข้าใจ" ของนักเรียนต่อโค้ดที่นักเรียนเขียนเองและผ่านแล้ว
ห้ามเขียนโค้ดหรือเฉลยให้นักเรียน ให้ประเมินจากคำอธิบายเท่านั้น

โจทย์: ${assignment.title}
โค้ดของนักเรียน:
\`\`\`
${(code || '').slice(0, 2000)}
\`\`\`
คำอธิบายของนักเรียน: """${(explanation || '').slice(0, 1000)}"""

เกณฑ์ระดับ (level):
0 = ไม่สัมพันธ์กับโค้ด คัดลอกโจทย์ หรือสั้นเกินไป
1 = บอกได้บางส่วนว่าโค้ดทำอะไร แต่ไม่ครบลำดับ
2 = อธิบายลำดับการทำงานของโค้ดได้ถูกต้อง (รับข้อมูล ประมวลผล แสดงผล)
3 = อธิบายลำดับได้ถูก และบอกเหตุผลของเงื่อนไข/ลูป/การแปลงชนิดข้อมูลในโค้ดของตนเองได้
ตอบเป็น JSON: level (0-3), feedback (ภาษาไทย 1-2 ประโยค ให้กำลังใจและชี้สิ่งที่ยังขาด), followUp (คำถามถามต่อ 1 ข้อ เกี่ยวกับโค้ดของนักเรียน ให้คิดต่อ ไม่บอกคำตอบ)`;
    const schema = {
        type: 'OBJECT',
        properties: { level: { type: 'INTEGER' }, feedback: { type: 'STRING' }, followUp: { type: 'STRING' } },
        required: ['level', 'feedback', 'followUp'],
    };
    const raw = await callGeminiApi(prompt, schema);
    const data = typeof raw === 'string' ? JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')) : raw;
    const level = Math.max(0, Math.min(3, parseInt(data.level, 10) || 0));
    return { level, feedback: String(data.feedback || '').slice(0, 500), followUp: String(data.followUp || '').slice(0, 300) };
};

const ExplainBack = ({ course, assignment, userId, code }) => {
    const [existing, setExisting] = React.useState(undefined);   // undefined = กำลังโหลด
    const [mode, setMode] = React.useState('explain');
    const [text, setText] = React.useState('');
    const [predictCase, setPredictCase] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    const [followAns, setFollowAns] = React.useState('');
    const [savedFollow, setSavedFollow] = React.useState(false);
    const [later, setLater] = React.useState(false);

    React.useEffect(() => {
        db.collection('studio_explainBack').where('uid', '==', userId).where('assignmentId', '==', assignment.id).limit(1).get()
            .then(s => setExisting(s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() }))
            .catch(() => setExisting(null));
        // ข้อมูลชุดใหม่สำหรับทำนายผล: ใช้ test case ที่ซ่อนอยู่ก่อน (นักเรียนยังไม่เห็น)
        db.collection('testCases').where('assignmentId', '==', assignment.id).get().then(s => {
            const tcs = s.docs.map(d => d.data()).sort((a, b) => (a.order || 0) - (b.order || 0));
            setPredictCase(tcs.find(t => t.isHidden) || tcs[tcs.length - 1] || null);
        }).catch(() => {});
    }, [assignment.id, userId]);

    const submit = async () => {
        setBusy(true);
        const base = {
            courseId: course.id, uid: userId, assignmentId: assignment.id, assignmentTitle: assignment.title,
            skillTag: assignment.skillTag || null, mode, code: (code || '').slice(0, 3000),
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1,
        };
        let rec;
        if (mode === 'predict') {
            const correct = ebCheckPrediction(text, predictCase.expectedOutput);
            rec = {
                ...base, predictInput: predictCase.input || '', predictExpected: predictCase.expectedOutput || '',
                predictAnswer: text.slice(0, 1000), predictCorrect: correct, aiLevel: null, aiStatus: 'not_needed',
                aiFeedback: correct ? 'ทำนายผลได้ถูกต้อง แสดงว่าไล่การทำงานของโค้ดตัวเองได้' : 'ยังทำนายไม่ตรง ลองไล่โค้ดทีละบรรทัดด้วยข้อมูลชุดนี้ แล้วกด ▶ รัน เพื่อตรวจสอบ',
                followUp: ebFollowUpBank(code),
            };
        } else {
            let ai = null, aiStatus = 'ok';
            try { ai = await ebAiEvaluate(assignment, code, text); }
            catch (err) { aiStatus = 'fallback'; console.warn('[explainBack] AI ใช้ไม่ได้ ใช้เกณฑ์สำรอง:', err.message); }
            const level = ai ? ai.level : ebHeuristicLevel(code, text);
            rec = {
                ...base, explanation: text.slice(0, 1000), aiLevel: level, aiStatus,
                aiFeedback: ai ? ai.feedback : (level >= 2 ? 'อธิบายลำดับการทำงานได้ดี' : 'ลองอธิบายให้ครบว่าโค้ดรับข้อมูลอะไร ประมวลผลอย่างไร และแสดงอะไร โดยอ้างชื่อตัวแปรในโค้ดของคุณ'),
                followUp: ai ? ai.followUp : ebFollowUpBank(code),
            };
        }
        try {
            const ref = await db.collection('studio_explainBack').add(rec);
            logStudioEvent('explain_submit', course.id, { assignmentId: assignment.id, mode, level: rec.aiLevel, predictCorrect: rec.predictCorrect, aiStatus: rec.aiStatus });
            setExisting({ id: ref.id, ...rec });
        } catch (err) { alert('บันทึกไม่สำเร็จ: ' + err.message); }
        finally { setBusy(false); }
    };

    const saveFollow = async () => {
        try {
            await db.collection('studio_explainBack').doc(existing.id).update({ followUpAnswer: followAns.slice(0, 1000), updatedAt: serverTimestamp() });
            setSavedFollow(true);
        } catch (err) { alert('บันทึกไม่สำเร็จ: ' + err.message); }
    };

    if (existing === undefined || later) return null;
    const box = { background: '#F3F0FF', border: '1px solid #D1C4E9', borderRadius: 12, padding: 14, marginTop: 16 };

    if (existing) {
        return (
            <div style={box}>
                <div className="text-sm font-bold mb-1" style={{ color: '#4527A0' }}>🗣️ Explain-Back</div>
                {existing.mode === 'predict'
                    ? <p className="text-xs text-gray-700">ทำนายผล: {existing.predictCorrect ? '✅ ถูกต้อง' : '❌ ยังไม่ตรง'}</p>
                    : <p className="text-xs text-gray-700">ระดับความเข้าใจ: <b>{existing.aiLevel}/3</b> — {EB_LEVEL_TEXT[existing.aiLevel] || ''}{existing.aiStatus === 'fallback' ? ' (ประเมินเบื้องต้น ครูจะตรวจอีกครั้ง)' : ''}</p>}
                {existing.aiFeedback && <p className="text-xs text-gray-600 mt-1">{existing.aiFeedback}</p>}
                {existing.mode === 'predict' && !existing.predictCorrect && (
                    <pre className="text-xs mt-1 p-2 rounded bg-white whitespace-pre-wrap">ผลลัพธ์ที่ถูกต้อง:{'\n'}{existing.predictExpected}</pre>
                )}
                {existing.followUp && (
                    <div className="mt-2">
                        <p className="text-xs font-semibold" style={{ color: '#5E35B1' }}>❓ คิดต่อ: {existing.followUp}</p>
                        {existing.followUpAnswer || savedFollow ? (
                            <p className="text-xs text-gray-600 mt-1">✅ ตอบแล้ว: {existing.followUpAnswer || followAns}</p>
                        ) : (
                            <div className="mt-1 flex gap-2">
                                <input value={followAns} onChange={e => setFollowAns(e.target.value)} className="k-input text-xs" style={{ padding: '6px 10px' }} placeholder="พิมพ์คำตอบสั้นๆ (ไม่บังคับ)" />
                                <button onClick={saveFollow} disabled={!followAns.trim()} className="k-btn-outline text-xs px-3">ส่ง</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    const canSubmit = mode === 'predict' ? !!predictCase && text.trim().length > 0 : text.trim().length >= 20;
    return (
        <div style={box}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold" style={{ color: '#4527A0' }}>🗣️ อธิบายโค้ดของฉัน (Explain-Back)</span>
                <button onClick={() => setLater(true)} className="text-xs text-gray-400 underline">ไว้ทีหลัง</button>
            </div>
            <p className="text-xs text-gray-600 mb-2">ผ่านแล้ว! ก่อนไปข้อต่อไป ลองพิสูจน์ว่าเข้าใจโค้ดของตัวเอง (ไม่มีผลกับคะแนน)</p>
            <div className="flex gap-2 mb-2">
                {[['explain', '✍️ อธิบาย'], ['predict', '🔮 ทำนายผล']].map(([m, l]) => (
                    <button key={m} onClick={() => { setMode(m); setText(''); }} disabled={m === 'predict' && !predictCase}
                        className="text-xs px-3 py-1 rounded-full disabled:opacity-40"
                        style={mode === m ? { background: '#7E57C2', color: '#fff' } : { background: '#fff', color: '#5E35B1', border: '1px solid #D1C4E9' }}>
                        {l}
                    </button>
                ))}
            </div>
            {mode === 'explain' ? (
                <textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="k-input text-sm"
                    placeholder="อธิบาย 2–3 ประโยคว่าโค้ดของคุณรับข้อมูลอะไร ทำอะไรกับข้อมูล และแสดงผลอย่างไร (อ้างชื่อตัวแปรในโค้ดได้)" />
            ) : predictCase && (
                <div>
                    <p className="text-xs text-gray-700 mb-1">ถ้าป้อนข้อมูลนี้ให้โค้ดของคุณ ผลลัพธ์จะเป็นอะไร?</p>
                    <pre className="text-xs p-2 rounded mb-2 whitespace-pre-wrap" style={{ background: '#282a36', color: '#f8f8f2' }}>{predictCase.input || '(ไม่มีข้อมูลนำเข้า)'}</pre>
                    <textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="k-input text-sm font-mono" placeholder="พิมพ์ผลลัพธ์ที่คาดว่าจะได้" />
                </div>
            )}
            <div className="flex items-center gap-2 mt-2">
                <button onClick={submit} disabled={!canSubmit || busy} className="k-btn-pink text-sm px-4 py-1.5">
                    {busy ? 'กำลังประเมิน...' : 'ส่งคำตอบ'}
                </button>
                {mode === 'explain' && <span className="text-xs text-gray-400">{text.trim().length}/20 ตัวอักษรขึ้นไป</span>}
            </div>
        </div>
    );
};

Object.assign(window, { ExplainBack, ebHeuristicLevel, ebCheckPrediction, ebFollowUpBank, EB_LEVEL_TEXT });

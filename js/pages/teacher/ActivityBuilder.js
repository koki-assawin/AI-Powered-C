// js/pages/teacher/ActivityBuilder.js - v1.0 Multi-Activity Creator

const _cyI = "w-full bg-gray-900 border border-purple-700/60 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 placeholder-gray-600";
const _cyL = "block text-xs font-semibold text-purple-400 uppercase tracking-widest mb-1";

// ── TestCase Row ──────────────────────────────────────────────────
const _ABTestRow = ({ tc, idx, onChange, onRemove }) => (
    <div className="flex gap-2 items-start mb-2 bg-gray-900/60 rounded-lg p-3 border border-gray-700/40">
        <span className="text-purple-500 text-xs font-mono mt-1.5 w-5 shrink-0">#{idx + 1}</span>
        <div className="flex-1 grid grid-cols-2 gap-2">
            <div>
                <label className={_cyL}>Input (stdin)</label>
                <textarea value={tc.input} rows={3}
                    onChange={e => onChange(idx, 'input', e.target.value)}
                    className={_cyI + " font-mono text-xs"} placeholder="5\n3" />
            </div>
            <div>
                <label className={_cyL}>Expected Output</label>
                <textarea value={tc.expectedOutput} rows={3}
                    onChange={e => onChange(idx, 'expectedOutput', e.target.value)}
                    className={_cyI + " font-mono text-xs"} placeholder="8" />
            </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0 pt-5">
            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={tc.isHidden}
                    onChange={e => onChange(idx, 'isHidden', e.target.checked)}
                    className="accent-purple-500" /> ซ่อน
            </label>
            {idx > 0 && (
                <button onClick={() => onRemove(idx)} className="text-red-500 hover:text-red-400 text-xs font-bold">✕ ลบ</button>
            )}
        </div>
    </div>
);

// ── Autopsy Case Card ─────────────────────────────────────────────
const _ABAutopsyCase = ({ c, idx, onChange, onRemove }) => (
    <div className="bg-gray-900/70 border border-red-900/50 rounded-xl p-4 mb-3">
        <div className="flex justify-between items-center mb-3">
            <span className="text-red-400 font-bold text-sm">🔬 เคสที่ {idx + 1}</span>
            {idx > 0 && <button onClick={() => onRemove(idx)} className="text-red-600 hover:text-red-400 text-xs font-bold">✕ ลบเคส</button>}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
                <label className={_cyL}>ชื่อเคส</label>
                <input value={c.label} onChange={e => onChange(idx, 'label', e.target.value)}
                    className={_cyI} placeholder="กรณีที่ 1: ลูปอนันต์" />
            </div>
            <div>
                <label className={_cyL}>ประเภทบั๊ก</label>
                <select value={c.bugType} onChange={e => onChange(idx, 'bugType', e.target.value)} className={_cyI}>
                    <option value="infinite_loop">♾️ Infinite Loop</option>
                    <option value="off_by_one">📏 Off-by-one Error</option>
                    <option value="logic_error">🧠 Logic Error</option>
                    <option value="runtime_error">💥 Runtime Error</option>
                </select>
            </div>
        </div>
        <div className="mb-3">
            <label className={_cyL}>โค้ดที่มีบั๊ก (นักเรียนจะเห็นนี้)</label>
            <textarea rows={6} value={c.buggyCode} onChange={e => onChange(idx, 'buggyCode', e.target.value)}
                className={_cyI + " font-mono text-xs"} placeholder="#include <stdio.h>&#10;int main() {&#10;    int i = 0;&#10;    while(i < 10) {&#10;        printf(&quot;%d\n&quot;, i);&#10;        // ลืม i++&#10;    }&#10;}" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
                <label className={_cyL}>เฉลย / วิธีแก้</label>
                <textarea rows={3} value={c.expectedFix} onChange={e => onChange(idx, 'expectedFix', e.target.value)}
                    className={_cyI} placeholder="เพิ่ม i++; ใน loop body" />
            </div>
            <div>
                <label className={_cyL}>คำอธิบายบั๊ก</label>
                <textarea rows={3} value={c.explanation} onChange={e => onChange(idx, 'explanation', e.target.value)}
                    className={_cyI} placeholder="ตัวนับ i ไม่เคยเพิ่มค่า จึงวนซ้ำไม่หยุด" />
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className={_cyL}>คะแนน</label>
                <input type="number" value={c.points} onChange={e => onChange(idx, 'points', +e.target.value)} className={_cyI} />
            </div>
            <div>
                <label className={_cyL}>Hints (คั่นด้วย | )</label>
                <input value={(c.hints || []).join('|')} onChange={e => onChange(idx, 'hints', e.target.value.split('|'))}
                    className={_cyI} placeholder="ดูตัวแปรใน condition|ตัวนับต้องเปลี่ยนค่า" />
            </div>
        </div>
    </div>
);

// ── Quiz Question Card ────────────────────────────────────────────
const _ABQuestion = ({ q, idx, onChange, onRemove, showBloom }) => {
    const updateOpt = (oi, field, val) => {
        const opts = q.options.map((o, i) => {
            if (field === 'isCorrect') return { ...o, isCorrect: i === oi };
            return i === oi ? { ...o, [field]: val } : o;
        });
        onChange(idx, 'options', opts);
    };
    return (
        <div className="bg-gray-900/70 border border-cyan-900/40 rounded-xl p-4 mb-3">
            <div className="flex justify-between items-center mb-3">
                <span className="text-cyan-400 font-bold text-sm">❓ ข้อที่ {idx + 1}</span>
                {idx > 0 && <button onClick={() => onRemove(idx)} className="text-red-600 hover:text-red-400 text-xs font-bold">✕ ลบข้อ</button>}
            </div>
            <div className="mb-2">
                <label className={_cyL}>โจทย์คำถาม</label>
                <textarea rows={2} value={q.stem} onChange={e => onChange(idx, 'stem', e.target.value)}
                    className={_cyI} placeholder="ผลลัพธ์ของโค้ดนี้คืออะไร?" />
            </div>
            <div className="mb-3">
                <label className={_cyL}>Code Snippet (ถ้ามี)</label>
                <textarea rows={4} value={q.code} onChange={e => onChange(idx, 'code', e.target.value)}
                    className={_cyI + " font-mono text-xs"} placeholder="// วางโค้ดที่ต้องการถามที่นี่..." />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
                {q.options.map((opt, oi) => (
                    <div key={opt.optId} className={`flex items-center gap-2 rounded-lg p-2.5 border cursor-pointer transition-all ${opt.isCorrect ? 'border-green-500/70 bg-green-900/20' : 'border-gray-700/50 bg-gray-900/40 hover:border-gray-600'}`}
                        onClick={() => updateOpt(oi, 'isCorrect', true)}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${opt.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-600'}`}>
                            {opt.isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-gray-400 font-bold text-xs shrink-0">{opt.optId.toUpperCase()}.</span>
                        <input type="text" value={opt.text}
                            onChange={e => { e.stopPropagation(); updateOpt(oi, 'text', e.target.value); }}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 bg-transparent text-gray-300 text-xs outline-none min-w-0"
                            placeholder={`ตัวเลือก ${opt.optId.toUpperCase()}`} />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
                <div>
                    <label className={_cyL}>คะแนน</label>
                    <input type="number" value={q.points} onChange={e => onChange(idx, 'points', +e.target.value)} className={_cyI} />
                </div>
                <div>
                    <label className={_cyL}>ระดับ</label>
                    <select value={q.difficulty} onChange={e => onChange(idx, 'difficulty', e.target.value)} className={_cyI}>
                        <option value="easy">ง่าย</option>
                        <option value="medium">ปานกลาง</option>
                        <option value="hard">ยาก</option>
                    </select>
                </div>
                {showBloom && (
                    <div>
                        <label className={_cyL}>Bloom's Level</label>
                        <select value={q.bloomLevel} onChange={e => onChange(idx, 'bloomLevel', e.target.value)} className={_cyI}>
                            <option value="remember">จำ (Remember)</option>
                            <option value="understand">เข้าใจ (Understand)</option>
                            <option value="apply">ประยุกต์ (Apply)</option>
                            <option value="analyze">วิเคราะห์ (Analyze)</option>
                        </select>
                    </div>
                )}
            </div>
            <div>
                <label className={_cyL}>คำอธิบายเฉลย</label>
                <input type="text" value={q.explanation} onChange={e => onChange(idx, 'explanation', e.target.value)}
                    className={_cyI} placeholder="อธิบายว่าทำไมตัวเลือกนั้นถึงถูก..." />
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────
const ActivityBuilder = () => {
    const { user } = useAuth();
    const [courses, setCourses] = React.useState([]);
    const [courseId, setCourseId] = React.useState('');
    const [activityType, setActivityType] = React.useState('coding');
    const [saving, setSaving] = React.useState(false);
    const [toast, setToast] = React.useState(null);

    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [xpReward, setXpReward] = React.useState(30);
    const [isPublished, setIsPublished] = React.useState(false);
    const [aiCoach, setAiCoach] = React.useState({ allowHint: true, allowAnalysis: true, maxHintsPerSub: 3 });

    const [codingConfig, setCodingConfig] = React.useState({
        language: 'c',
        starterCode: '#include <stdio.h>\nint main() {\n    \n    return 0;\n}',
        solutionCode: '', timeLimit: 0,
    });
    const [testCases, setTestCases] = React.useState([{ input: '', expectedOutput: '', isHidden: false }]);

    const [autopsyCases, setAutopsyCases] = React.useState([
        { caseId: 'case_1', label: 'กรณีที่ 1', buggyCode: '', bugType: 'infinite_loop', expectedFix: '', explanation: '', hints: [''], points: 50 }
    ]);

    const [quizConfig, setQuizConfig] = React.useState({
        timerPerQuestion: 30, shuffleQuestions: false, shuffleOptions: false,
        showCorrectAfter: true, allowReview: true,
        speedBonus: { enabled: true, thresholdPct: 50, bonusXPPerQ: 2 },
    });

    const mkQ = (n) => ({
        qId: `q${n + 1}`, stem: '', code: '',
        options: ['a', 'b', 'c', 'd'].map(id => ({ optId: id, text: '', isCorrect: false })),
        explanation: '', points: 25, difficulty: 'easy', bloomLevel: 'remember',
    });
    const [quizQs, setQuizQs] = React.useState([mkQ(0)]);

    const [prePostConfig, setPrePostConfig] = React.useState({
        pairId: '', testRole: 'pre', timerTotal: 600, showResultsTo: 'teacher_only',
    });
    const [ppQs, setPpQs] = React.useState([mkQ(0)]);

    React.useEffect(() => {
        if (!user?.uid) return;
        db.collection('courses').get().then(snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCourses(list);
            if (list.length) setCourseId(list[0].id);
        }).catch(console.error);
    }, [user?.uid]);

    const mkQHandlers = (setter) => ({
        upd: (i, f, v) => setter(p => p.map((q, j) => j === i ? { ...q, [f]: v } : q)),
        add: (n) => setter(p => [...p, mkQ(p.length)]),
        del: (i) => setter(p => p.filter((_, j) => j !== i)),
    });
    const qhQ = mkQHandlers(setQuizQs);
    const qhP = mkQHandlers(setPpQs);

    const acH = {
        upd: (i, f, v) => setAutopsyCases(p => p.map((c, j) => j === i ? { ...c, [f]: v } : c)),
        add: () => setAutopsyCases(p => [...p, { caseId: `case_${p.length + 1}`, label: `กรณีที่ ${p.length + 1}`, buggyCode: '', bugType: 'infinite_loop', expectedFix: '', explanation: '', hints: [''], points: 50 }]),
        del: (i) => setAutopsyCases(p => p.filter((_, j) => j !== i)),
    };
    const tcH = {
        upd: (i, f, v) => setTestCases(p => p.map((t, j) => j === i ? { ...t, [f]: v } : t)),
        add: () => setTestCases(p => [...p, { input: '', expectedOutput: '', isHidden: false }]),
        del: (i) => setTestCases(p => p.filter((_, j) => j !== i)),
    };

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSave = async () => {
        if (!courseId) return showToast('เลือกรายวิชาก่อน', 'error');
        if (!title.trim()) return showToast('ใส่ชื่อกิจกรรมก่อน', 'error');
        setSaving(true);
        try {
            const now = firebase.firestore.FieldValue.serverTimestamp();
            const base = {
                courseId, title: title.trim(), description: description.trim(),
                activityType, isPublished, xpReward: +xpReward,
                order: Date.now(), aiCoach,
                createdBy: user.uid, createdAt: now, updatedAt: now,
                codingConfig: null, autopsyConfig: null, quizConfig: null, prePostConfig: null,
            };

            let extra = {};
            if (activityType === 'coding') {
                const tcIds = await Promise.all(testCases.map(tc =>
                    db.collection('testCases').add({ ...tc, createdAt: now })
                        .then(r => r.id)
                ));
                extra.codingConfig = { ...codingConfig, testCaseIds: tcIds, allowedLanguages: [codingConfig.language] };
            } else if (activityType === 'autopsy') {
                extra.autopsyConfig = { language: 'c', cases: autopsyCases, totalPoints: autopsyCases.reduce((s, c) => s + (+c.points || 0), 0) };
            } else if (activityType === 'quiz_blitz') {
                extra.quizConfig = { ...quizConfig, questions: quizQs, totalPoints: quizQs.reduce((s, q) => s + (+q.points || 0), 0) };
            } else if (activityType === 'pre_post_test') {
                extra.prePostConfig = { ...prePostConfig, questions: ppQs, totalPoints: ppQs.reduce((s, q) => s + (+q.points || 0), 0) };
            }

            const ref = await db.collection('assignments_v2').add({ ...base, ...extra });
            showToast(`บันทึกสำเร็จ! ID: ${ref.id.slice(0, 8)}… 🎮`);
            setTitle(''); setDescription('');
        } catch (err) {
            console.error(err);
            showToast('Error: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const TABS = [
        { id: 'coding', icon: '💻', label: 'Coding Platform' },
        { id: 'autopsy', icon: '🔬', label: 'Loop Autopsy' },
        { id: 'quiz_blitz', icon: '⚡', label: 'Quiz Blitz' },
        { id: 'pre_post_test', icon: '📊', label: 'Pre / Post Test' },
    ];

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#0d0d1f 0%,#1a1a3e 100%)' }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="🏗️ สร้างกิจกรรม" />

            {toast && (
                <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl font-bold text-sm shadow-2xl ${toast.type === 'error' ? 'bg-red-950 border border-red-500 text-red-200' : 'bg-emerald-950 border border-emerald-500 text-emerald-200'}`}
                    style={{ boxShadow: toast.type === 'error' ? '0 0 25px #ef444455' : '0 0 25px #10b98155' }}>
                    {toast.msg}
                </div>
            )}

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-black mb-1" style={{ background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ⚙️ Activity Builder
                    </h2>
                    <p className="text-gray-500 text-sm">สร้างกิจกรรมการเรียนรู้แบบ Multi-Activity Type สำหรับ APCC</p>
                </div>

                {/* Course */}
                <div className="bg-gray-800/80 border border-purple-800/40 rounded-xl p-4 mb-4">
                    <label className={_cyL}>📚 รายวิชา</label>
                    <select value={courseId} onChange={e => setCourseId(e.target.value)} className={_cyI}>
                        {courses.length === 0 && <option value="">กำลังโหลด...</option>}
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                {/* Common */}
                <div className="bg-gray-800/80 border border-purple-800/40 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="col-span-2">
                            <label className={_cyL}>ชื่อกิจกรรม *</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} className={_cyI}
                                placeholder="ชันสูตรลูป Unit 3: วงวนอนันต์" />
                        </div>
                        <div>
                            <label className={_cyL}>XP รางวัล</label>
                            <input type="number" value={xpReward} onChange={e => setXpReward(e.target.value)} className={_cyI} />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className={_cyL}>คำอธิบาย</label>
                        <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                            className={_cyI} placeholder="รายละเอียดกิจกรรมนี้..." />
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {[
                            [isPublished, v => setIsPublished(v), 'เผยแพร่ทันที', 'accent-purple-500'],
                            [aiCoach.allowHint, v => setAiCoach(p => ({ ...p, allowHint: v })), 'อนุญาต AI Hint', 'accent-cyan-500'],
                            [aiCoach.allowAnalysis, v => setAiCoach(p => ({ ...p, allowAnalysis: v })), 'อนุญาต AI Analysis', 'accent-cyan-500'],
                        ].map(([val, setter, label, cls]) => (
                            <label key={label} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} className={`${cls} w-4 h-4`} />
                                <span className="text-gray-300 text-sm">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Type tabs */}
                <div className="flex gap-2 mb-5 flex-wrap">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActivityType(t.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${activityType === t.id ? 'bg-purple-700/30 border-purple-500 text-purple-200' : 'bg-gray-800/60 border-gray-700/50 text-gray-400 hover:border-purple-700/50'}`}
                            style={activityType === t.id ? { boxShadow: '0 0 18px rgba(139,92,246,0.45)' } : {}}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {/* ── CODING ── */}
                {activityType === 'coding' && (
                    <div>
                        <div className="bg-gray-800/80 border border-purple-800/40 rounded-xl p-4 mb-4">
                            <h3 className="text-cyan-400 font-bold mb-3">⚙️ ตั้งค่า Coding</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className={_cyL}>ภาษา</label>
                                    <select value={codingConfig.language} onChange={e => setCodingConfig(p => ({ ...p, language: e.target.value }))} className={_cyI}>
                                        <option value="c">C</option>
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={_cyL}>Time Limit (วิ, 0=ไม่จำกัด)</label>
                                    <input type="number" value={codingConfig.timeLimit} onChange={e => setCodingConfig(p => ({ ...p, timeLimit: +e.target.value }))} className={_cyI} />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className={_cyL}>Starter Code (นักเรียนเห็น)</label>
                                <textarea rows={8} value={codingConfig.starterCode} onChange={e => setCodingConfig(p => ({ ...p, starterCode: e.target.value }))}
                                    className={_cyI + " font-mono text-xs"} />
                            </div>
                            <div>
                                <label className={_cyL}>Solution Code (ครูเท่านั้น)</label>
                                <textarea rows={5} value={codingConfig.solutionCode} onChange={e => setCodingConfig(p => ({ ...p, solutionCode: e.target.value }))}
                                    className={_cyI + " font-mono text-xs"} placeholder="// เฉลย..." />
                            </div>
                        </div>
                        <div className="bg-gray-800/80 border border-purple-800/40 rounded-xl p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-cyan-400 font-bold">🧪 Test Cases ({testCases.length})</h3>
                                <button onClick={tcH.add} className="px-3 py-1.5 bg-cyan-900/40 border border-cyan-700/50 text-cyan-300 rounded-lg text-xs font-bold hover:bg-cyan-900/60 transition-all">
                                    + เพิ่ม Test Case
                                </button>
                            </div>
                            {testCases.map((tc, i) => (
                                <_ABTestRow key={i} tc={tc} idx={i} onChange={tcH.upd} onRemove={tcH.del} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── AUTOPSY ── */}
                {activityType === 'autopsy' && (
                    <div className="bg-gray-800/80 border border-red-900/40 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-red-400 font-bold">🔬 Autopsy Cases ({autopsyCases.length} เคส)</h3>
                            <button onClick={acH.add} className="px-3 py-1.5 bg-red-900/40 border border-red-700/50 text-red-300 rounded-lg text-xs font-bold hover:bg-red-900/60 transition-all">
                                + เพิ่มเคส
                            </button>
                        </div>
                        {autopsyCases.map((c, i) => (
                            <_ABAutopsyCase key={i} c={c} idx={i} onChange={acH.upd} onRemove={acH.del} />
                        ))}
                    </div>
                )}

                {/* ── QUIZ BLITZ ── */}
                {activityType === 'quiz_blitz' && (
                    <div>
                        <div className="bg-gray-800/80 border border-yellow-900/40 rounded-xl p-4 mb-4">
                            <h3 className="text-yellow-400 font-bold mb-3">⚡ ตั้งค่า Quiz Blitz</h3>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className={_cyL}>เวลา/ข้อ (วิ)</label>
                                    <input type="number" value={quizConfig.timerPerQuestion}
                                        onChange={e => setQuizConfig(p => ({ ...p, timerPerQuestion: +e.target.value }))} className={_cyI} />
                                </div>
                                <div>
                                    <label className={_cyL}>Speed Bonus XP/ข้อ</label>
                                    <input type="number" value={quizConfig.speedBonus.bonusXPPerQ}
                                        onChange={e => setQuizConfig(p => ({ ...p, speedBonus: { ...p.speedBonus, bonusXPPerQ: +e.target.value } }))} className={_cyI} />
                                </div>
                                <div>
                                    <label className={_cyL}>Threshold (% เวลาเหลือ)</label>
                                    <input type="number" value={quizConfig.speedBonus.thresholdPct}
                                        onChange={e => setQuizConfig(p => ({ ...p, speedBonus: { ...p.speedBonus, thresholdPct: +e.target.value } }))} className={_cyI} />
                                </div>
                            </div>
                            <div className="flex gap-6 flex-wrap">
                                {[['shuffleQuestions', 'สุ่มลำดับข้อ'], ['showCorrectAfter', 'แสดงเฉลยทันที'], ['allowReview', 'ดูผลหลังจบ']].map(([k, l]) => (
                                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={quizConfig[k]} onChange={e => setQuizConfig(p => ({ ...p, [k]: e.target.checked }))} className="accent-yellow-500 w-4 h-4" />
                                        <span className="text-gray-300 text-sm">{l}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-800/80 border border-yellow-900/40 rounded-xl p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-yellow-400 font-bold">❓ คำถาม ({quizQs.length} ข้อ)</h3>
                                <button onClick={qhQ.add} className="px-3 py-1.5 bg-yellow-900/40 border border-yellow-700/50 text-yellow-300 rounded-lg text-xs font-bold hover:bg-yellow-900/60 transition-all">
                                    + เพิ่มข้อ
                                </button>
                            </div>
                            {quizQs.map((q, i) => (
                                <_ABQuestion key={i} q={q} idx={i} onChange={qhQ.upd} onRemove={qhQ.del} showBloom={false} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── PRE/POST TEST ── */}
                {activityType === 'pre_post_test' && (
                    <div>
                        <div className="bg-gray-800/80 border border-blue-900/40 rounded-xl p-4 mb-4">
                            <h3 className="text-blue-400 font-bold mb-3">📊 ตั้งค่า Pre / Post Test</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className={_cyL}>Pair ID (ผูก pre ↔ post)</label>
                                    <input value={prePostConfig.pairId} onChange={e => setPrePostConfig(p => ({ ...p, pairId: e.target.value }))}
                                        className={_cyI} placeholder="unit3_loops" />
                                </div>
                                <div>
                                    <label className={_cyL}>บทบาท</label>
                                    <select value={prePostConfig.testRole} onChange={e => setPrePostConfig(p => ({ ...p, testRole: e.target.value }))} className={_cyI}>
                                        <option value="pre">🔵 Pre-test (ก่อนเรียน)</option>
                                        <option value="post">🟢 Post-test (หลังเรียน)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={_cyL}>เวลารวม (วิ)</label>
                                    <input type="number" value={prePostConfig.timerTotal} onChange={e => setPrePostConfig(p => ({ ...p, timerTotal: +e.target.value }))} className={_cyI} />
                                </div>
                                <div>
                                    <label className={_cyL}>แสดงผลให้</label>
                                    <select value={prePostConfig.showResultsTo} onChange={e => setPrePostConfig(p => ({ ...p, showResultsTo: e.target.value }))} className={_cyI}>
                                        <option value="teacher_only">ครูเท่านั้น</option>
                                        <option value="student">นักเรียนด้วย</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-800/80 border border-blue-900/40 rounded-xl p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-blue-400 font-bold">❓ คำถาม + Bloom's Taxonomy ({ppQs.length} ข้อ)</h3>
                                <button onClick={qhP.add} className="px-3 py-1.5 bg-blue-900/40 border border-blue-700/50 text-blue-300 rounded-lg text-xs font-bold hover:bg-blue-900/60 transition-all">
                                    + เพิ่มข้อ
                                </button>
                            </div>
                            {ppQs.map((q, i) => (
                                <_ABQuestion key={i} q={q} idx={i} onChange={qhP.upd} onRemove={qhP.del} showBloom={true} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Save */}
                <button onClick={handleSave} disabled={saving}
                    className="w-full py-4 rounded-xl font-black text-lg text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    style={{
                        background: saving ? '#1f2937' : 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                        boxShadow: saving ? 'none' : '0 0 35px rgba(124,58,237,0.5),0 0 70px rgba(6,182,212,0.25)',
                    }}>
                    {saving ? '⏳ กำลังบันทึก...' : '💾 SAVE ACTIVITY TO FIRESTORE'}
                </button>
            </main>
        </div>
    );
};

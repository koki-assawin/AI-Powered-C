// js/pages/teacher/PollControl.js - QuickPoll teacher control screen
// See Spec_QuickPoll_APCC.md §5.2, §5.4 and act-Plan19.pdf (E1 word cloud, E2 Peer Instruction)

const POLL_PLAN_ID = '19';
const POLL_SUBJECT = 'ว31281';
const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
const POLL_STAGES = ['E1', 'E2', 'E3', 'E4', 'E5'];

// Real content from act-Plan19.pdf: E1 Think-Pair-Share (word cloud) + E2 Peer
// Instruction round 1/2 on the three for-loop trace questions used in Explore.
const SAMPLE_TEMPLATES = [
    {
        subject: POLL_SUBJECT, planId: POLL_PLAN_ID, unitId: '3', stage: 'E1', seq: 1,
        loCode: 'LO4', bloom: 'Understand', type: 'text',
        prompt: 'ที่บ้าน ที่โรงเรียน หรือที่ร้านค้าในชุมชนของเรา มีงานอะไรที่ต้องทำซ้ำๆ บ้าง',
        media: { code: null, language: null, imageUrl: null, text: null },
        options: null, correctOptionId: null, misconceptions: {},
        defaultRounds: 1, defaultSeconds: { r1: 90 }, tags: ['think-pair-share', 'word-cloud', 'engage'],
    },
    {
        subject: POLL_SUBJECT, planId: POLL_PLAN_ID, unitId: '3', stage: 'E2', seq: 1,
        loCode: 'LO7', bloom: 'Analyze', type: 'choice',
        prompt: 'ชุดที่ 1 — ถ้ารันโค้ดชุดนี้ จะได้อะไร',
        media: { code: 'for(i=1; i>0; i++) { printf("%d ", i); }', language: 'c', imageUrl: null, text: null },
        options: [
            { id: 'a', text: 'แสดง 1 2 3 4 5 แล้วจบ' },
            { id: 'b', text: 'แสดงเลข 1 2 3 4 5 ... ไปเรื่อยๆ ไม่รู้จบ' },
            { id: 'c', text: 'ไม่แสดงอะไรเลย' },
            { id: 'd', text: 'คอมไพล์ไม่ผ่าน' },
        ],
        correctOptionId: 'b',
        misconceptions: {
            a: 'เข้าใจว่า for เพิ่มค่าให้เองเหมือน i++',
            c: 'เข้าใจว่าเงื่อนไขเป็นเท็จตั้งแต่รอบแรก',
            d: 'สับสนระหว่างความผิดพลาดเชิงตรรกะกับไวยากรณ์',
        },
        defaultRounds: 2, defaultSeconds: { r1: 50, r2: 70 }, tags: ['for-loop', 'infinite-loop', 'explore'],
    },
    {
        subject: POLL_SUBJECT, planId: POLL_PLAN_ID, unitId: '3', stage: 'E2', seq: 2,
        loCode: 'LO7', bloom: 'Analyze', type: 'choice',
        prompt: 'ชุดที่ 2 — ถ้ารันโค้ดชุดนี้ จะได้อะไร',
        media: { code: 'for(i=5; i<1; i++) { printf("%d ", i); }', language: 'c', imageUrl: null, text: null },
        options: [
            { id: 'a', text: 'พิมพ์ 5 ครั้งเดียว' },
            { id: 'b', text: 'วนซ้ำไม่รู้จบ' },
            { id: 'c', text: 'ไม่พิมพ์อะไรเลย เพราะเงื่อนไขเป็นเท็จตั้งแต่ต้น' },
            { id: 'd', text: 'คอมไพล์ไม่ผ่าน' },
        ],
        correctOptionId: 'c',
        misconceptions: {
            a: 'เข้าใจว่า for ต้องทำงานอย่างน้อย 1 ครั้งเสมอเหมือน do-while',
            b: 'สับสนกับโจทย์ชุดก่อนหน้าที่เป็นลูปไม่รู้จบ',
            d: 'สับสนระหว่างเงื่อนไขเริ่มต้นเป็นเท็จกับข้อผิดพลาดทางไวยากรณ์',
        },
        defaultRounds: 2, defaultSeconds: { r1: 50, r2: 70 }, tags: ['for-loop', 'zero-iterations', 'explore'],
    },
    {
        subject: POLL_SUBJECT, planId: POLL_PLAN_ID, unitId: '3', stage: 'E2', seq: 3,
        loCode: 'LO7', bloom: 'Analyze', type: 'choice',
        prompt: 'ชุดที่ 3 — ลูปนี้จะพิมพ์ตัวเลขกี่ครั้ง',
        media: { code: 'for(i=1; i<=5; i=i+2) { printf("%d ", i); }', language: 'c', imageUrl: null, text: null },
        options: [
            { id: 'a', text: '1 2 3 4 5 (5 ครั้ง)' },
            { id: 'b', text: '1 3 5 (3 ครั้ง)' },
            { id: 'c', text: '1 3 5 7 (4 ครั้ง)' },
            { id: 'd', text: 'ไม่พิมพ์อะไรเลย' },
        ],
        correctOptionId: 'b',
        misconceptions: {
            a: 'เข้าใจว่า i=i+2 เหมือน i++ คือเพิ่มทีละ 1',
            c: 'คำนวณเผื่อรอบที่เงื่อนไขเป็นเท็จ (i=7) ว่ายังพิมพ์อยู่',
            d: 'เข้าใจว่า i ต้องเท่ากับ 5 พอดีเงื่อนไขจึงจะเป็นจริง',
        },
        defaultRounds: 2, defaultSeconds: { r1: 50, r2: 70 }, tags: ['for-loop', 'step', 'explore'],
    },
];

const POLL_ADVICE = (rate) => {
    if (rate < 0.35) return { color: 'red', text: 'ผู้เรียนส่วนใหญ่ยังเข้าใจคลาดเคลื่อน ควรอธิบายเพิ่มเติมก่อนให้ถกเถียง' };
    if (rate <= 0.70) return { color: 'green', text: 'ช่วงที่เหมาะที่สุดสำหรับการถกเถียงกับเพื่อน ให้เปิดรอบที่ 2 ได้เลย' };
    return { color: 'blue', text: 'ผู้เรียนส่วนใหญ่เข้าใจแล้ว อาจข้ามรอบที่ 2 แล้วไปคำถามถัดไปเพื่อประหยัดเวลา' };
};

const emptyTemplate = (type) => ({
    subject: POLL_SUBJECT, planId: POLL_PLAN_ID, unitId: '3', stage: 'E2', seq: 1,
    loCode: '', bloom: 'Analyze', type,
    prompt: '', media: { code: '', language: 'c', imageUrl: null, text: null },
    options: type === 'choice' ? [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }] : null,
    correctOptionId: type === 'choice' ? 'a' : null,
    misconceptions: {},
    defaultRounds: type === 'choice' ? 2 : 1,
    defaultSeconds: type === 'choice' ? { r1: 60, r2: 60 } : { r1: 90 },
    tags: [],
});

const PollControl = () => {
    const { user } = useAuth();

    const [courses, setCourses] = React.useState([]);
    const [courseId, setCourseId] = React.useState('');
    const [expectedN, setExpectedN] = React.useState(0);

    const [templates, setTemplates] = React.useState([]);
    const [seeding, setSeeding] = React.useState(false);
    const [reloadKey, setReloadKey] = React.useState(0);
    const [editing, setEditing] = React.useState(null); // null = closed; object = create/edit form
    const [saving, setSaving] = React.useState(false);

    const [sessionId, setSessionId] = React.useState(null);
    const [session, setSession] = React.useState(null);
    const [responses, setResponses] = React.useState([]);

    const [secondsLeft, setSecondsLeft] = React.useState(null);
    const timerRef = React.useRef(null);

    // Load courses this teacher owns or co-teaches
    React.useEffect(() => {
        if (!user) return;
        Promise.all([
            db.collection('courses').where('teacherId', '==', user.uid).get(),
            db.collection('courses').where('coTeacherIds', 'array-contains', user.uid).get(),
        ]).then(([ownSnap, coSnap]) => {
            const byId = {};
            ownSnap.docs.forEach(d => { byId[d.id] = { id: d.id, ...d.data() }; });
            coSnap.docs.forEach(d => { byId[d.id] = { id: d.id, ...d.data() }; });
            const list = Object.values(byId);
            setCourses(list);
            if (list.length) setCourseId(list[0].id);
        }).catch(console.error);
    }, [user]);

    // Roster count when course changes — unique students via enrollments
    React.useEffect(() => {
        if (!courseId) { setExpectedN(0); return; }
        db.collection('enrollments').where('courseId', '==', courseId).get()
            .then(snap => setExpectedN(new Set(snap.docs.map(d => d.data().studentId)).size))
            .catch(console.error);
    }, [courseId]);

    // Load question bank for plan 19
    React.useEffect(() => {
        db.collection('pollTemplates').where('planId', '==', POLL_PLAN_ID)
            .get()
            .then(snap => setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.stage || '').localeCompare(b.stage || '') || (a.seq || 0) - (b.seq || 0))))
            .catch(console.error);
    }, [reloadKey]);

    // Live session + responses
    React.useEffect(() => {
        if (!sessionId) { setSession(null); setResponses([]); return; }
        const unsubs = [];
        unsubs.push(db.collection('pollSessions').doc(sessionId).onSnapshot(doc => {
            setSession(doc.exists ? { id: doc.id, ...doc.data() } : null);
        }, console.error));
        unsubs.push(db.collection('pollSessions').doc(sessionId).collection('responses').onSnapshot(snap => {
            setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, console.error));
        return () => unsubs.forEach(fn => fn());
    }, [sessionId]);

    // Countdown timer, driven by whichever round is currently open
    React.useEffect(() => {
        clearInterval(timerRef.current);
        const roundKey = session?.status === 'round2_open' ? 'r2' : session?.status === 'round1_open' ? 'r1' : null;
        if (!roundKey || !session?.openedAt?.[roundKey]?.toDate) {
            setSecondsLeft(null);
            return;
        }
        const totalSec = session.snapshot?.defaultSeconds?.[roundKey] || 90;
        const openedAt = session.openedAt[roundKey];
        const tick = () => {
            const elapsed = (Date.now() - openedAt.toDate().getTime()) / 1000;
            setSecondsLeft(Math.max(0, Math.round(totalSec - elapsed)));
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
        return () => clearInterval(timerRef.current);
    }, [session]);

    const seedSamples = async () => {
        setSeeding(true);
        try {
            const batch = db.batch();
            SAMPLE_TEMPLATES.forEach(t => {
                const ref = db.collection('pollTemplates').doc();
                batch.set(ref, { ...t, createdBy: user.uid, createdAt: serverTimestamp(), version: 1 });
            });
            await batch.commit();
            setReloadKey(k => k + 1);
        } catch (err) {
            console.error(err);
            alert('เพิ่มคำถามตัวอย่างไม่สำเร็จ: ' + err.message);
        }
        setSeeding(false);
    };

    // ── Template CRUD ──────────────────────────────────────────────────────
    const saveTemplate = async () => {
        if (!editing.prompt.trim()) return alert('กรุณาใส่คำถาม');
        if (editing.type === 'choice' && editing.options.some(o => !o.text.trim())) {
            return alert('กรุณากรอกตัวเลือกให้ครบทั้ง 4 ข้อ');
        }
        setSaving(true);
        const { id, ...rest } = editing;
        const data = {
            ...rest,
            seq: Number(editing.seq) || 1,
            tags: Array.isArray(editing.tags) ? editing.tags
                : (editing.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        };
        try {
            if (id) {
                await db.collection('pollTemplates').doc(id).update({ ...data, version: (editing.version || 1) + 1 });
            } else {
                await db.collection('pollTemplates').add({
                    ...data, createdBy: user.uid, createdAt: serverTimestamp(), version: 1,
                });
            }
            setEditing(null);
            setReloadKey(k => k + 1);
        } catch (err) {
            console.error(err);
            alert('บันทึกไม่สำเร็จ: ' + err.message);
        }
        setSaving(false);
    };

    const deleteTemplate = async (t) => {
        if (!confirm(`ลบคำถาม "${t.prompt}" ออกจากคลังหรือไม่? กู้คืนไม่ได้`)) return;
        try {
            await db.collection('pollTemplates').doc(t.id).delete();
            setReloadKey(k => k + 1);
        } catch (err) {
            alert('ลบไม่สำเร็จ: ' + err.message);
        }
    };

    const updateOption = (idx, text) => {
        setEditing(prev => {
            const options = prev.options.map((o, i) => i === idx ? { ...o, text } : o);
            return { ...prev, options };
        });
    };
    const updateMisconception = (id, text) => {
        setEditing(prev => ({ ...prev, misconceptions: { ...prev.misconceptions, [id]: text } }));
    };

    // ── Session lifecycle ───────────────────────────────────────────────────
    const startSession = async (template) => {
        if (!courseId) return;
        try {
            const ref = await db.collection('pollSessions').add({
                templateId: template.id,
                snapshot: template,
                courseId,
                teacherUid: user.uid,
                taughtOn: serverTimestamp(),
                status: 'draft',
                expectedN,
                openedAt: {}, closedAt: {},
            });
            setSessionId(ref.id);
        } catch (err) {
            console.error(err);
            alert('เริ่ม session ไม่สำเร็จ: ' + err.message);
        }
    };

    const setStatus = (fields) => {
        if (!sessionId) return;
        db.collection('pollSessions').doc(sessionId).update(fields).catch(console.error);
    };
    const openRound1 = () => setStatus({ status: 'round1_open', 'openedAt.r1': serverTimestamp() });
    const closeRound1 = () => setStatus({ status: 'round1_closed', 'closedAt.r1': serverTimestamp() });
    const openRound2 = () => setStatus({ status: 'round2_open', 'openedAt.r2': serverTimestamp() });
    const closeRound2 = () => setStatus({ status: 'round2_closed', 'closedAt.r2': serverTimestamp() });

    const openPresentWindow = () => {
        if (!sessionId) return;
        window.open('#/teacher/poll/present?sessionId=' + sessionId, '_blank');
    };

    const isChoice = session?.snapshot?.type !== 'text';
    const supportsRound2 = isChoice && (session?.snapshot?.defaultRounds || 1) >= 2;
    const activeRoundField = (session?.status === 'round2_open' || session?.status === 'round2_closed') ? 'r2' : 'r1';
    const answeredCount = responses.filter(r => r[activeRoundField]).length;
    const correctOptionId = session?.snapshot?.correctOptionId;
    const round1CorrectCount = correctOptionId ? responses.filter(r => r.r1?.optionId === correctOptionId).length : 0;
    const round1AnsweredCount = responses.filter(r => r.r1).length;
    const round1CorrectRate = round1AnsweredCount ? round1CorrectCount / round1AnsweredCount : 0;
    const advice = isChoice && session?.status === 'round1_closed' ? POLL_ADVICE(round1CorrectRate) : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="🗳️ QuickPoll" />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-black text-gray-800 mb-6">🗳️ Quick Poll — หน้าควบคุมครู</h2>

                {/* Course selector */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">รายวิชา</label>
                    <select value={courseId} onChange={e => setCourseId(e.target.value)} disabled={!!sessionId}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.title} ({c.grade}/{c.room} เทอม {c.semester}/{c.academicYear})</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">นักเรียนในวิชานี้ {expectedN} คน</p>
                </div>

                {!sessionId && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <h3 className="font-bold text-gray-700">คลังคำถาม แผนที่ 19</h3>
                            <div className="flex gap-2">
                                {templates.length === 0 && (
                                    <button onClick={seedSamples} disabled={seeding}
                                        className="bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                                        {seeding ? 'กำลังเพิ่ม...' : '➕ โหลดชุดคำถามแผนที่ 19 (4 ข้อ)'}
                                    </button>
                                )}
                                <button onClick={() => setEditing(emptyTemplate('choice'))}
                                    className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-gray-900">
                                    ✏️ สร้างคำถามใหม่
                                </button>
                            </div>
                        </div>

                        {editing && (
                            <div className="border-2 border-purple-300 rounded-xl p-4 mb-4 bg-purple-50/40">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-gray-800">{editing.id ? 'แก้ไขคำถาม' : 'สร้างคำถามใหม่'}</h4>
                                    <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:text-gray-800">✕ ปิด</button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">ประเภท</label>
                                        <select value={editing.type} disabled={!!editing.id}
                                            onChange={e => setEditing(prev => ({
                                                ...emptyTemplate(e.target.value),
                                                prompt: prev.prompt, stage: prev.stage, seq: prev.seq, loCode: prev.loCode, bloom: prev.bloom,
                                            }))}
                                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                                            <option value="choice">เลือกตอบ (Peer Instruction)</option>
                                            <option value="text">ปลายเปิด (Word Cloud)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">ขั้น 5Es</label>
                                        <select value={editing.stage} onChange={e => setEditing(prev => ({ ...prev, stage: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                                            {POLL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">ลำดับ (seq)</label>
                                        <input type="number" min="1" value={editing.seq}
                                            onChange={e => setEditing(prev => ({ ...prev, seq: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 block mb-1">Bloom</label>
                                        <select value={editing.bloom} onChange={e => setEditing(prev => ({ ...prev, bloom: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                                            {BLOOM_LEVELS.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="text-xs font-bold text-gray-500 block mb-1">โจทย์ / คำถาม</label>
                                    <textarea value={editing.prompt} rows={2}
                                        onChange={e => setEditing(prev => ({ ...prev, prompt: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                </div>

                                {editing.type === 'choice' ? (
                                    <>
                                        <div className="mb-3">
                                            <label className="text-xs font-bold text-gray-500 block mb-1">โค้ด (ถ้ามี)</label>
                                            <textarea value={editing.media.code || ''} rows={3}
                                                onChange={e => setEditing(prev => ({ ...prev, media: { ...prev.media, code: e.target.value } }))}
                                                placeholder='เช่น for(i=1; i>0; i++) { printf("%d ", i); }'
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
                                        </div>
                                        <div className="mb-3">
                                            <label className="text-xs font-bold text-gray-500 block mb-1">ตัวเลือก (เลือกข้อที่ถูกด้วยปุ่มวิทยุ)</label>
                                            <div className="space-y-2">
                                                {editing.options.map((o, i) => (
                                                    <div key={o.id} className="flex items-center gap-2">
                                                        <input type="radio" name="correctOptionId" checked={editing.correctOptionId === o.id}
                                                            onChange={() => setEditing(prev => ({ ...prev, correctOptionId: o.id }))} />
                                                        <span className="font-bold text-xs w-4">{o.id.toUpperCase()}</span>
                                                        <input value={o.text} onChange={e => updateOption(i, e.target.value)}
                                                            placeholder={`ตัวเลือก ${o.id.toUpperCase()}`}
                                                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="text-xs font-bold text-gray-500 block mb-1">คำอธิบายความเข้าใจคลาดเคลื่อน (ไม่บังคับ)</label>
                                            <div className="space-y-2">
                                                {editing.options.filter(o => o.id !== editing.correctOptionId).map(o => (
                                                    <div key={o.id} className="flex items-center gap-2">
                                                        <span className="font-bold text-xs w-4">{o.id.toUpperCase()}</span>
                                                        <input value={editing.misconceptions[o.id] || ''} onChange={e => updateMisconception(o.id, e.target.value)}
                                                            placeholder="ทำไมผู้เรียนอาจเลือกข้อนี้"
                                                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 mb-3">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 block mb-1">จำนวนรอบ</label>
                                                <select value={editing.defaultRounds}
                                                    onChange={e => setEditing(prev => ({ ...prev, defaultRounds: Number(e.target.value) }))}
                                                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                                                    <option value={1}>1 รอบ</option>
                                                    <option value={2}>2 รอบ (Peer Instruction)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 block mb-1">วินาทีรอบ 1</label>
                                                <input type="number" min="10" value={editing.defaultSeconds.r1 || 60}
                                                    onChange={e => setEditing(prev => ({ ...prev, defaultSeconds: { ...prev.defaultSeconds, r1: Number(e.target.value) } }))}
                                                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                                            </div>
                                            {editing.defaultRounds >= 2 && (
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 block mb-1">วินาทีรอบ 2</label>
                                                    <input type="number" min="10" value={editing.defaultSeconds.r2 || 60}
                                                        onChange={e => setEditing(prev => ({ ...prev, defaultSeconds: { ...prev.defaultSeconds, r2: Number(e.target.value) } }))}
                                                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 block mb-1">บริบท/ข้อความประกอบ (ไม่บังคับ)</label>
                                            <textarea value={editing.media.text || ''} rows={2}
                                                onChange={e => setEditing(prev => ({ ...prev, media: { ...prev.media, text: e.target.value } }))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 block mb-1">วินาทีที่ให้ตอบ</label>
                                            <input type="number" min="10" value={editing.defaultSeconds.r1 || 90}
                                                onChange={e => setEditing(prev => ({ ...prev, defaultSeconds: { ...prev.defaultSeconds, r1: Number(e.target.value) } }))}
                                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                                        </div>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="text-xs font-bold text-gray-500 block mb-1">แท็ก (คั่นด้วยจุลภาค)</label>
                                    <input value={Array.isArray(editing.tags) ? editing.tags.join(', ') : editing.tags}
                                        onChange={e => setEditing(prev => ({ ...prev, tags: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                </div>

                                <button onClick={saveTemplate} disabled={saving}
                                    className="bg-green-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
                                    {saving ? 'กำลังบันทึก...' : '💾 บันทึกคำถาม'}
                                </button>
                            </div>
                        )}

                        {templates.length === 0 ? (
                            <p className="text-sm text-gray-500">ยังไม่มีคำถามในคลัง กดปุ่มด้านบนเพื่อโหลดชุดคำถามของแผนที่ 19 หรือสร้างคำถามใหม่เอง</p>
                        ) : (
                            <div className="space-y-2">
                                {templates.map(t => (
                                    <div key={t.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                {t.type === 'text' ? '📝' : '☑️'} {t.stage}#{t.seq} {t.prompt}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {t.type === 'text' ? 'ปลายเปิด/คลังคำ' : `เลือกตอบ • ${t.defaultRounds || 1} รอบ`} • {t.loCode} • {t.bloom}
                                            </p>
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button onClick={() => setEditing({ ...t, tags: t.tags || [] })}
                                                className="text-gray-500 hover:text-gray-800 text-xs font-bold px-2 py-2">แก้ไข</button>
                                            <button onClick={() => deleteTemplate(t)}
                                                className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-2">ลบ</button>
                                            <button onClick={() => startSession(t)} disabled={!courseId}
                                                className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                                เริ่มคำถามนี้
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {sessionId && session && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    คำถามที่กำลังใช้ {isChoice ? '' : '(ปลายเปิด/คลังคำ)'}
                                </p>
                                <p className="text-lg font-bold text-gray-800">{session.snapshot?.prompt}</p>
                            </div>
                            <button onClick={() => setSessionId(null)}
                                className="text-xs text-gray-500 hover:text-gray-800 underline shrink-0">
                                เลือกคำถามอื่น
                            </button>
                        </div>

                        {session.snapshot?.media?.code && (
                            <pre className="bg-gray-900 text-gray-100 text-sm rounded-lg p-3 mb-4 overflow-x-auto font-mono">{session.snapshot.media.code}</pre>
                        )}

                        {/* Live counter */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-bold text-gray-700">
                                    {session.status === 'round2_open' || session.status === 'round2_closed' ? 'รอบ 2 — ' : session.status !== 'draft' ? 'รอบ 1 — ' : ''}
                                    ตอบแล้ว {answeredCount} จาก {session.expectedN} คน
                                </span>
                                {secondsLeft !== null && (
                                    <span className={`font-mono font-black ${secondsLeft <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                                        ⏱ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                                    </span>
                                )}
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${session.expectedN ? Math.min(100, (answeredCount / session.expectedN) * 100) : 0}%` }} />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {session.status === 'draft' && (
                                <button onClick={openRound1}
                                    className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-green-700">
                                    ▶️ เปิดรอบที่ 1
                                </button>
                            )}
                            {session.status === 'round1_open' && (
                                <button onClick={closeRound1}
                                    className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-700">
                                    ⏹ ปิดรอบ
                                </button>
                            )}
                            {session.status === 'round1_closed' && supportsRound2 && (
                                <button onClick={openRound2}
                                    className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-green-700">
                                    ▶️ เปิดรอบที่ 2 (ถกเถียงกับเพื่อนแล้ว)
                                </button>
                            )}
                            {session.status === 'round2_open' && (
                                <button onClick={closeRound2}
                                    className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-700">
                                    ⏹ ปิดรอบ 2
                                </button>
                            )}
                            <button onClick={openPresentWindow}
                                className="bg-purple-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-purple-700">
                                📽️ เปิดหน้าฉายผล
                            </button>
                        </div>

                        {advice && (
                            <div className={`rounded-lg p-4 border-l-4 ${
                                advice.color === 'red' ? 'bg-red-50 border-red-500 text-red-800' :
                                advice.color === 'green' ? 'bg-green-50 border-green-500 text-green-800' :
                                'bg-blue-50 border-blue-500 text-blue-800'}`}>
                                <p className="text-sm font-bold">สัดส่วนตอบถูกรอบที่ 1: {Math.round(round1CorrectRate * 100)}%</p>
                                <p className="text-sm mt-1">{advice.text}</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

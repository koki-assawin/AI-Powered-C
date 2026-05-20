// js/pages/teacher/ActivityBuilder.js - v1.2 Light-pink theme

const _abI = "w-full border border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-200 placeholder-gray-400";
const _abL = "block text-xs font-semibold text-pink-700 uppercase tracking-wide mb-1";
const _abCard = { background: 'white', border: '1px solid #FFD1DC', borderRadius: '12px', padding: '16px', marginBottom: '12px' };
const _abMono = "w-full border border-pink-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-50 font-mono focus:outline-none focus:border-pink-400 placeholder-gray-400";

// ── TestCase Row ──────────────────────────────────────────────────
const _ABTestRow = ({ tc, idx, onChange, onRemove }) => (
    <div className="flex gap-2 items-start mb-2 rounded-lg p-3" style={{ background: '#FFF5F7', border: '1px solid #FFD1DC' }}>
        <span className="text-pink-400 text-xs font-mono mt-1.5 w-5 shrink-0">#{idx + 1}</span>
        <div className="flex-1 grid grid-cols-2 gap-2">
            <div>
                <label className={_abL}>Input (stdin)</label>
                <textarea value={tc.input} rows={3}
                    onChange={e => onChange(idx, 'input', e.target.value)}
                    className={_abMono} placeholder="5&#10;3" />
            </div>
            <div>
                <label className={_abL}>Expected Output</label>
                <textarea value={tc.expectedOutput} rows={3}
                    onChange={e => onChange(idx, 'expectedOutput', e.target.value)}
                    className={_abMono} placeholder="8" />
            </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0 pt-5">
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={tc.isHidden}
                    onChange={e => onChange(idx, 'isHidden', e.target.checked)}
                    className="accent-pink-500" /> ซ่อน
            </label>
            {idx > 0 && (
                <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 text-xs font-bold">✕ ลบ</button>
            )}
        </div>
    </div>
);

// ── Autopsy Case Card ─────────────────────────────────────────────
const _ABAutopsyCase = ({ c, idx, onChange, onRemove }) => (
    <div className="rounded-xl p-4 mb-3" style={{ background: '#FFF5F7', border: '1px solid #FFD1DC' }}>
        <div className="flex justify-between items-center mb-3">
            <span className="text-pink-700 font-bold text-sm">🔬 เคสที่ {idx + 1}</span>
            {idx > 0 && <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 text-xs font-bold">✕ ลบเคส</button>}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
                <label className={_abL}>ชื่อเคส</label>
                <input value={c.label} onChange={e => onChange(idx, 'label', e.target.value)}
                    className={_abI} placeholder="กรณีที่ 1: ลูปอนันต์" />
            </div>
            <div>
                <label className={_abL}>ประเภทบั๊ก</label>
                <select value={c.bugType} onChange={e => onChange(idx, 'bugType', e.target.value)} className={_abI}>
                    <option value="infinite_loop">♾️ Infinite Loop</option>
                    <option value="off_by_one">📏 Off-by-one Error</option>
                    <option value="logic_error">🧠 Logic Error</option>
                    <option value="runtime_error">💥 Runtime Error</option>
                </select>
            </div>
        </div>
        <div className="mb-3">
            <label className={_abL}>โค้ดที่มีบั๊ก (นักเรียนจะเห็นนี้)</label>
            <textarea rows={6} value={c.buggyCode} onChange={e => onChange(idx, 'buggyCode', e.target.value)}
                className={_abMono} placeholder="#include <stdio.h>&#10;int main() { ... }" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
                <label className={_abL}>เฉลย / วิธีแก้</label>
                <textarea rows={3} value={c.expectedFix} onChange={e => onChange(idx, 'expectedFix', e.target.value)}
                    className={_abI} placeholder="เพิ่ม i++; ใน loop body" />
            </div>
            <div>
                <label className={_abL}>คำอธิบายบั๊ก</label>
                <textarea rows={3} value={c.explanation} onChange={e => onChange(idx, 'explanation', e.target.value)}
                    className={_abI} placeholder="ตัวนับ i ไม่เคยเพิ่มค่า จึงวนซ้ำไม่หยุด" />
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className={_abL}>คะแนน</label>
                <input type="number" value={c.points} onChange={e => onChange(idx, 'points', +e.target.value)} className={_abI} />
            </div>
            <div>
                <label className={_abL}>Hints (คั่นด้วย | )</label>
                <input value={(c.hints || []).join('|')} onChange={e => onChange(idx, 'hints', e.target.value.split('|'))}
                    className={_abI} placeholder="ดูตัวแปรใน condition|ตัวนับต้องเปลี่ยนค่า" />
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
        <div className="rounded-xl p-4 mb-3" style={{ background: '#FFF5F7', border: '1px solid #FFD1DC' }}>
            <div className="flex justify-between items-center mb-3">
                <span className="text-pink-700 font-bold text-sm">❓ ข้อที่ {idx + 1}</span>
                {idx > 0 && <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 text-xs font-bold">✕ ลบข้อ</button>}
            </div>
            <div className="mb-2">
                <label className={_abL}>โจทย์คำถาม</label>
                <textarea rows={2} value={q.stem} onChange={e => onChange(idx, 'stem', e.target.value)}
                    className={_abI} placeholder="ผลลัพธ์ของโค้ดนี้คืออะไร?" />
            </div>
            <div className="mb-3">
                <label className={_abL}>Code Snippet (ถ้ามี)</label>
                <textarea rows={4} value={q.code} onChange={e => onChange(idx, 'code', e.target.value)}
                    className={_abMono} placeholder="// วางโค้ดที่ต้องการถามที่นี่..." />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
                {q.options.map((opt, oi) => (
                    <div key={opt.optId}
                        className={`flex items-center gap-2 rounded-lg p-2.5 border cursor-pointer transition-all ${opt.isCorrect ? 'border-green-400 bg-green-50' : 'border-pink-200 bg-white hover:border-pink-400'}`}
                        onClick={() => updateOpt(oi, 'isCorrect', true)}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${opt.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                            {opt.isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-gray-400 font-bold text-xs shrink-0">{opt.optId.toUpperCase()}.</span>
                        <input type="text" value={opt.text}
                            onChange={e => { e.stopPropagation(); updateOpt(oi, 'text', e.target.value); }}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 bg-transparent text-gray-700 text-xs outline-none min-w-0"
                            placeholder={`ตัวเลือก ${opt.optId.toUpperCase()}`} />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
                <div>
                    <label className={_abL}>คะแนน</label>
                    <input type="number" value={q.points} onChange={e => onChange(idx, 'points', +e.target.value)} className={_abI} />
                </div>
                <div>
                    <label className={_abL}>ระดับ</label>
                    <select value={q.difficulty} onChange={e => onChange(idx, 'difficulty', e.target.value)} className={_abI}>
                        <option value="easy">ง่าย</option>
                        <option value="medium">ปานกลาง</option>
                        <option value="hard">ยาก</option>
                    </select>
                </div>
                {showBloom && (
                    <div>
                        <label className={_abL}>Bloom's Level</label>
                        <select value={q.bloomLevel} onChange={e => onChange(idx, 'bloomLevel', e.target.value)} className={_abI}>
                            <option value="remember">จำ (Remember)</option>
                            <option value="understand">เข้าใจ (Understand)</option>
                            <option value="apply">ประยุกต์ (Apply)</option>
                            <option value="analyze">วิเคราะห์ (Analyze)</option>
                        </select>
                    </div>
                )}
            </div>
            <div>
                <label className={_abL}>คำอธิบายเฉลย</label>
                <input type="text" value={q.explanation} onChange={e => onChange(idx, 'explanation', e.target.value)}
                    className={_abI} placeholder="อธิบายว่าทำไมตัวเลือกนั้นถึงถูก..." />
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

    const [existingActivities, setExistingActivities] = React.useState([]);
    const [loadingList, setLoadingList] = React.useState(false);

    React.useEffect(() => {
        if (!user?.uid) return;
        db.collection('courses').get().then(snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCourses(list);
            const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
            const fromUrl = params.get('course');
            const initial = (fromUrl && list.find(c => c.id === fromUrl)) ? fromUrl : (list[0]?.id || '');
            setCourseId(initial);
        }).catch(console.error);
    }, [user?.uid]);

    React.useEffect(() => {
        if (!courseId) { setExistingActivities([]); return; }
        setLoadingList(true);
        db.collection('assignments_v2').where('courseId', '==', courseId).get()
            .then(snap => {
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                list.sort((a, b) => (b.order || 0) - (a.order || 0));
                setExistingActivities(list);
            })
            .catch(console.error)
            .finally(() => setLoadingList(false));
    }, [courseId]);

    const togglePublish = async (act) => {
        await db.collection('assignments_v2').doc(act.id).update({ isPublished: !act.isPublished });
        setExistingActivities(p => p.map(a => a.id === act.id ? { ...a, isPublished: !act.isPublished } : a));
    };

    const deleteActivity = async (act) => {
        if (!window.confirm(`ลบ "${act.title}"?\nไม่สามารถกู้คืนได้`)) return;
        await db.collection('assignments_v2').doc(act.id).delete();
        setExistingActivities(p => p.filter(a => a.id !== act.id));
        showToast('ลบกิจกรรมแล้ว', 'error');
    };

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
                    db.collection('testCases').add({ ...tc, createdAt: now }).then(r => r.id)
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
            showToast(`บันทึกสำเร็จ! ID: ${ref.id.slice(0, 8)}…`);
            setTitle(''); setDescription('');
            // Refresh list
            setExistingActivities(p => [{ id: ref.id, ...base, ...extra, isPublished }, ...p]);
        } catch (err) {
            console.error(err);
            showToast('Error: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const TYPE_STYLE = {
        coding:       { bg: '#F5F0FF', color: '#6D28D9', border: '#DDD6FE', icon: '💻', label: 'Coding' },
        autopsy:      { bg: '#FFF0F5', color: '#AD1457', border: '#FFD1DC', icon: '🔬', label: 'Autopsy' },
        quiz_blitz:   { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', icon: '⚡', label: 'Quiz Blitz' },
        pre_post_test:{ bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', icon: '📊', label: 'Pre/Post' },
    };

    const TABS = [
        { id: 'coding',        icon: '💻', label: 'Coding Platform' },
        { id: 'autopsy',       icon: '🔬', label: 'Loop Autopsy' },
        { id: 'quiz_blitz',    icon: '⚡', label: 'Quiz Blitz' },
        { id: 'pre_post_test', icon: '📊', label: 'Pre / Post Test' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="🎯 สร้างกิจกรรม" />

            {toast && (
                <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl font-bold text-sm shadow-lg ${toast.type === 'error' ? 'bg-red-50 border border-red-300 text-red-700' : 'bg-green-50 border border-green-300 text-green-700'}`}>
                    {toast.msg}
                </div>
            )}

            <main className="max-w-4xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-0.5">⚙️ Activity Builder</h2>
                    <p className="text-gray-400 text-sm">สร้างกิจกรรมการเรียนรู้แบบ Multi-Activity Type สำหรับ APCC</p>
                </div>

                {/* Course selector */}
                <div style={_abCard}>
                    <label className={_abL}>📚 รายวิชา</label>
                    <select value={courseId} onChange={e => setCourseId(e.target.value)} className={_abI}>
                        {courses.length === 0 && <option value="">กำลังโหลด...</option>}
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                {/* ── Existing Activities List ── */}
                {courseId && (
                    <div style={{ background: 'white', border: '1px solid #FFD1DC', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-800 text-sm">
                                📋 กิจกรรมที่สร้างแล้วในวิชานี้
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: '#FFF0F5', color: '#AD1457' }}>
                                    {existingActivities.length}
                                </span>
                            </h3>
                            {loadingList && <span className="text-gray-400 text-xs">กำลังโหลด...</span>}
                        </div>
                        {!loadingList && existingActivities.length === 0 && (
                            <p className="text-gray-400 text-xs text-center py-4">ยังไม่มีกิจกรรม — สร้างใหม่ด้านล่าง</p>
                        )}
                        {existingActivities.map(act => {
                            const ts = TYPE_STYLE[act.activityType] || TYPE_STYLE.coding;
                            return (
                                <div key={act.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid #FFE4EC' }}>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                                        style={{ background: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
                                        {ts.icon} {ts.label}
                                    </span>
                                    <span className="text-gray-700 text-sm flex-1 truncate font-medium">{act.title}</span>
                                    <span className="text-gray-400 text-xs shrink-0">{act.xpReward || 0} XP</span>
                                    <button onClick={() => togglePublish(act)}
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all"
                                        style={act.isPublished
                                            ? { background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC' }
                                            : { background: '#F5F5F5', color: '#6B7280', border: '1px solid #E0E0E0' }}>
                                        {act.isPublished ? '🟢 เผยแพร่' : '⚫ ซ่อน'}
                                    </button>
                                    <a href={`#/student/activity/${act.id}`} target="_blank"
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all"
                                        style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', textDecoration: 'none' }}>
                                        👁 ดู
                                    </a>
                                    <button onClick={() => deleteActivity(act)}
                                        className="text-xs font-bold shrink-0 transition-all"
                                        style={{ color: '#EF4444' }}>✕</button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px" style={{ background: '#FFD1DC' }} />
                    <span className="text-pink-600 font-bold text-sm">➕ สร้างกิจกรรมใหม่</span>
                    <div className="flex-1 h-px" style={{ background: '#FFD1DC' }} />
                </div>

                {/* Common fields */}
                <div style={_abCard}>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="col-span-2">
                            <label className={_abL}>ชื่อกิจกรรม *</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} className={_abI}
                                placeholder="ชันสูตรลูป Unit 3: วงวนอนันต์" />
                        </div>
                        <div>
                            <label className={_abL}>XP รางวัล</label>
                            <input type="number" value={xpReward} onChange={e => setXpReward(e.target.value)} className={_abI} />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className={_abL}>คำอธิบาย</label>
                        <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                            className={_abI} placeholder="รายละเอียดกิจกรรมนี้..." />
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {[
                            [isPublished, v => setIsPublished(v), 'เผยแพร่ทันที'],
                            [aiCoach.allowHint, v => setAiCoach(p => ({ ...p, allowHint: v })), 'อนุญาต AI Hint'],
                            [aiCoach.allowAnalysis, v => setAiCoach(p => ({ ...p, allowAnalysis: v })), 'อนุญาต AI Analysis'],
                        ].map(([val, setter, label]) => (
                            <label key={label} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} className="accent-pink-500 w-4 h-4" />
                                <span className="text-gray-600 text-sm">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Activity type tabs */}
                <div className="flex gap-2 mb-5 flex-wrap">
                    {TABS.map(t => {
                        const ts = TYPE_STYLE[t.id];
                        const active = activityType === t.id;
                        return (
                            <button key={t.id} onClick={() => setActivityType(t.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border"
                                style={active
                                    ? { background: ts.bg, color: ts.color, border: `2px solid ${ts.border}` }
                                    : { background: 'white', color: '#9CA3AF', border: '1px solid #FFD1DC' }}>
                                {t.icon} {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── CODING ── */}
                {activityType === 'coding' && (
                    <div>
                        <div style={_abCard}>
                            <h3 className="font-bold text-purple-700 mb-3">⚙️ ตั้งค่า Coding</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className={_abL}>ภาษา</label>
                                    <select value={codingConfig.language} onChange={e => setCodingConfig(p => ({ ...p, language: e.target.value }))} className={_abI}>
                                        <option value="c">C</option>
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={_abL}>Time Limit (วิ, 0=ไม่จำกัด)</label>
                                    <input type="number" value={codingConfig.timeLimit} onChange={e => setCodingConfig(p => ({ ...p, timeLimit: +e.target.value }))} className={_abI} />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className={_abL}>Starter Code (นักเรียนเห็น)</label>
                                <textarea rows={8} value={codingConfig.starterCode} onChange={e => setCodingConfig(p => ({ ...p, starterCode: e.target.value }))}
                                    className={_abMono} />
                            </div>
                            <div>
                                <label className={_abL}>Solution Code (ครูเท่านั้น)</label>
                                <textarea rows={5} value={codingConfig.solutionCode} onChange={e => setCodingConfig(p => ({ ...p, solutionCode: e.target.value }))}
                                    className={_abMono} placeholder="// เฉลย..." />
                            </div>
                        </div>
                        <div style={_abCard}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-purple-700">🧪 Test Cases ({testCases.length})</h3>
                                <button onClick={tcH.add}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{ background: '#F5F0FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
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
                    <div style={_abCard}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-pink-700">🔬 Autopsy Cases ({autopsyCases.length} เคส)</h3>
                            <button onClick={acH.add}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: '#FFF0F5', color: '#AD1457', border: '1px solid #FFD1DC' }}>
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
                        <div style={_abCard}>
                            <h3 className="font-bold text-amber-700 mb-3">⚡ ตั้งค่า Quiz Blitz</h3>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className={_abL}>เวลา/ข้อ (วิ)</label>
                                    <input type="number" value={quizConfig.timerPerQuestion}
                                        onChange={e => setQuizConfig(p => ({ ...p, timerPerQuestion: +e.target.value }))} className={_abI} />
                                </div>
                                <div>
                                    <label className={_abL}>Speed Bonus XP/ข้อ</label>
                                    <input type="number" value={quizConfig.speedBonus.bonusXPPerQ}
                                        onChange={e => setQuizConfig(p => ({ ...p, speedBonus: { ...p.speedBonus, bonusXPPerQ: +e.target.value } }))} className={_abI} />
                                </div>
                                <div>
                                    <label className={_abL}>Threshold (% เวลาเหลือ)</label>
                                    <input type="number" value={quizConfig.speedBonus.thresholdPct}
                                        onChange={e => setQuizConfig(p => ({ ...p, speedBonus: { ...p.speedBonus, thresholdPct: +e.target.value } }))} className={_abI} />
                                </div>
                            </div>
                            <div className="flex gap-6 flex-wrap">
                                {[['shuffleQuestions', 'สุ่มลำดับข้อ'], ['showCorrectAfter', 'แสดงเฉลยทันที'], ['allowReview', 'ดูผลหลังจบ']].map(([k, l]) => (
                                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={quizConfig[k]} onChange={e => setQuizConfig(p => ({ ...p, [k]: e.target.checked }))} className="accent-amber-500 w-4 h-4" />
                                        <span className="text-gray-600 text-sm">{l}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div style={_abCard}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-amber-700">❓ คำถาม ({quizQs.length} ข้อ)</h3>
                                <button onClick={qhQ.add}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
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
                        <div style={_abCard}>
                            <h3 className="font-bold text-blue-700 mb-3">📊 ตั้งค่า Pre / Post Test</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className={_abL}>Pair ID (ผูก pre ↔ post)</label>
                                    <input value={prePostConfig.pairId} onChange={e => setPrePostConfig(p => ({ ...p, pairId: e.target.value }))}
                                        className={_abI} placeholder="unit3_loops" />
                                </div>
                                <div>
                                    <label className={_abL}>บทบาท</label>
                                    <select value={prePostConfig.testRole} onChange={e => setPrePostConfig(p => ({ ...p, testRole: e.target.value }))} className={_abI}>
                                        <option value="pre">🔵 Pre-test (ก่อนเรียน)</option>
                                        <option value="post">🟢 Post-test (หลังเรียน)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={_abL}>เวลารวม (วิ)</label>
                                    <input type="number" value={prePostConfig.timerTotal} onChange={e => setPrePostConfig(p => ({ ...p, timerTotal: +e.target.value }))} className={_abI} />
                                </div>
                                <div>
                                    <label className={_abL}>แสดงผลให้</label>
                                    <select value={prePostConfig.showResultsTo} onChange={e => setPrePostConfig(p => ({ ...p, showResultsTo: e.target.value }))} className={_abI}>
                                        <option value="teacher_only">ครูเท่านั้น</option>
                                        <option value="student">นักเรียนด้วย</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div style={_abCard}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-blue-700">❓ คำถาม + Bloom's Taxonomy ({ppQs.length} ข้อ)</h3>
                                <button onClick={qhP.add}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                                    + เพิ่มข้อ
                                </button>
                            </div>
                            {ppQs.map((q, i) => (
                                <_ABQuestion key={i} q={q} idx={i} onChange={qhP.upd} onRemove={qhP.del} showBloom={true} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Save button */}
                <button onClick={handleSave} disabled={saving}
                    className="w-full py-3.5 rounded-xl font-bold text-base text-white transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: saving ? '#E0E0E0' : 'linear-gradient(135deg,#e91e8c,#c2185b)', color: saving ? '#9E9E9E' : 'white' }}>
                    {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกกิจกรรมลง Firestore'}
                </button>
            </main>
        </div>
    );
};

// js/pages/teacher/AssignmentManager.js - Create/edit assignments (v4.5)
// Directory schema: [{ name, topics: [] }]  — Groups level removed

// Topic presets for AI generation (same as SelfPractice)
const TEACHER_TOPIC_PRESETS = {
    c: [
        'การแสดงผล (printf)', 'การรับข้อมูล (scanf)', 'ตัวแปรและชนิดข้อมูล',
        'นิพจน์และการคำนวณ', 'การตัดสินใจ (if/else)', 'switch-case',
        'for loop', 'while loop', 'do-while loop', 'การทำซ้ำซ้อน (Nested Loop)',
        'break และ continue', 'ฟังก์ชัน', 'ฟังก์ชัน Recursive',
        'อาร์เรย์ 1 มิติ', 'อาร์เรย์ 2 มิติ (Matrix)',
        'Searching (การค้นหาข้อมูล)', 'Sorting (การเรียงลำดับ)',
        'สตริง (string.h)', 'พอยน์เตอร์',
    ],
    cpp: [
        'การแสดงผล (cout)', 'การรับข้อมูล (cin)', 'ตัวแปรและชนิดข้อมูล',
        'นิพจน์และการคำนวณ', 'การตัดสินใจ (if/else)', 'switch-case',
        'for loop', 'while loop', 'do-while loop', 'การทำซ้ำซ้อน',
        'ฟังก์ชัน', 'ฟังก์ชัน Recursive', 'อาร์เรย์ / vector',
        'Sorting (sort)', 'สตริง (std::string)', 'พอยน์เตอร์', 'OOP เบื้องต้น (class)',
    ],
    python: [
        'การแสดงผล (print)', 'การรับข้อมูล (input)', 'ตัวแปรและชนิดข้อมูล',
        'นิพจน์และการคำนวณ', 'การตัดสินใจ (if/else)', 'for loop', 'while loop',
        'การทำซ้ำซ้อน', 'ฟังก์ชัน (def)', 'ฟังก์ชัน Recursive',
        'List', 'Dictionary', 'String', 'List Comprehension', 'Sorting',
    ],
    java: [
        'การแสดงผล (System.out)', 'การรับข้อมูล (Scanner)', 'ตัวแปรและชนิดข้อมูล',
        'นิพจน์และการคำนวณ', 'การตัดสินใจ (if/else)', 'switch-case',
        'for loop', 'while loop', 'การทำซ้ำซ้อน',
        'Method', 'Recursive Method', 'Array', 'ArrayList', 'String',
        'Sorting (Arrays.sort)', 'OOP เบื้องต้น (class)',
    ],
};

// Migrate old tree format (with groups) to new flat format
const migrateTree = (tree) => {
    if (!Array.isArray(tree)) return [];
    return tree.map(unit => {
        // New format: already has topics array at unit level
        if (Array.isArray(unit.topics)) return { name: unit.name, topics: unit.topics };
        // Old format: had groups → flatten groups' topics
        if (Array.isArray(unit.groups)) {
            const topics = [];
            unit.groups.forEach(g => { if (Array.isArray(g.topics)) topics.push(...g.topics); });
            return { name: unit.name, topics };
        }
        return { name: unit.name, topics: [] };
    });
};

const AssignmentManager = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const courseId = params.get('course');

    const [course, setCourse] = React.useState(null);
    const [assignments, setAssignments] = React.useState([]);
    const [editingAssignment, setEditingAssignment] = React.useState(null);
    const [form, setForm] = React.useState({
        title: '', description: '', language: 'c',
        difficulty: 'ง่าย', timeLimit: 5000, memoryLimit: 256,
        isPublished: false, assignmentType: 'practice', examDurationMinutes: 30,
        unitName: '', topicName: '', rawScore: 0,
    });

    // AI-assist fields (separate from form — don't save to Firestore)
    const [aiTopicPreset, setAiTopicPreset] = React.useState('');
    const [aiTopicCustom, setAiTopicCustom] = React.useState('');
    const [aiHintDesc, setAiHintDesc] = React.useState('');
    const isAiCustomTopic = aiTopicPreset === 'อื่นๆ (ระบุเอง)';
    const aiActiveTopic = isAiCustomTopic ? aiTopicCustom : aiTopicPreset;

    // Directory tree state — new schema: [{ name, topics: [] }]
    const [directoryTree, setDirectoryTree] = React.useState([]);
    const [treeChanged, setTreeChanged] = React.useState(false);
    const [savingTree, setSavingTree] = React.useState(false);
    const [treeMsg, setTreeMsg] = React.useState('');

    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [generating, setGenerating] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const [tab, setTab] = React.useState('list'); // 'list' | 'directory' | 'edit'

    React.useEffect(() => { if (courseId) loadData(); }, [courseId]);

    const loadData = async () => {
        setLoading(true);
        const [courseSnap, assignSnap] = await Promise.all([
            db.collection('courses').doc(courseId).get(),
            db.collection('assignments').where('courseId', '==', courseId).get(),
        ]);
        const courseData = { id: courseSnap.id, ...courseSnap.data() };
        setCourse(courseData);
        setDirectoryTree(migrateTree(courseData.directoryTree || []));
        setAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    // ── Directory Tree helpers (Units → Topics) ──────────────────────
    const addUnit = () => {
        setDirectoryTree(t => [...t, { name: 'หน่วยใหม่', topics: [] }]);
        setTreeChanged(true);
    };

    const updateUnit = (ui, name) => {
        setDirectoryTree(t => t.map((u, i) => i === ui ? { ...u, name } : u));
        setTreeChanged(true);
    };

    const deleteUnit = (ui) => {
        if (!confirm('ลบหน่วยนี้? หัวข้อที่อยู่ในหน่วยจะถูกลบด้วย')) return;
        setDirectoryTree(t => t.filter((_, i) => i !== ui));
        setTreeChanged(true);
    };

    const addTopic = (ui) => {
        setDirectoryTree(t => t.map((u, i) => i === ui
            ? { ...u, topics: [...u.topics, 'หัวข้อใหม่'] }
            : u
        ));
        setTreeChanged(true);
    };

    const updateTopic = (ui, ti, val) => {
        setDirectoryTree(t => t.map((u, i) => i === ui
            ? { ...u, topics: u.topics.map((tp, k) => k === ti ? val : tp) }
            : u
        ));
        setTreeChanged(true);
    };

    const deleteTopic = (ui, ti) => {
        setDirectoryTree(t => t.map((u, i) => i === ui
            ? { ...u, topics: u.topics.filter((_, k) => k !== ti) }
            : u
        ));
        setTreeChanged(true);
    };

    const saveTree = async () => {
        setSavingTree(true);
        setTreeMsg('');
        try {
            await db.collection('courses').doc(courseId).update({ directoryTree });
            setCourse(c => ({ ...c, directoryTree }));
            setTreeChanged(false);
            setTreeMsg('✅ บันทึกโครงสร้างสำเร็จ!');
            setTimeout(() => setTreeMsg(''), 3000);
        } catch (err) {
            setTreeMsg('❌ บันทึกไม่สำเร็จ: ' + err.message);
        } finally {
            setSavingTree(false);
        }
    };

    // Derived: dropdown options
    const unitOptions = directoryTree.map(u => u.name);
    const topicOptionsFor = (unitName) => {
        const unit = directoryTree.find(u => u.name === unitName);
        return unit ? unit.topics : [];
    };

    // ── AI Generate helpers ──────────────────────────────────────────
    const handleGenerateWithAI = async () => {
        setGenerating(true);
        setMsg('');
        try {
            const topic = aiActiveTopic.trim() || form.topicName || 'การเขียนโปรแกรม';
            const problems = await generateProblems(
                form.language || 'c', topic, form.difficulty, 1,
                form.title, aiHintDesc.trim()
            );
            if (problems.length > 0) {
                const p = problems[0];
                setForm(f => ({
                    ...f,
                    title: p.title || f.title,
                    description: `${p.story}\n\n${p.description}\n\nตัวอย่าง Input: ${p.inputExample}\nตัวอย่าง Output: ${p.outputExample}`,
                }));
                setMsg('✅ AI สร้างโจทย์สำเร็จ! ตรวจสอบและแก้ไขก่อนบันทึก');
            }
        } catch (err) {
            setMsg('❌ ไม่สามารถสร้างโจทย์ด้วย AI: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    // ── Save assignment ──────────────────────────────────────────────
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg('');
        try {
            const cleanForm = Object.fromEntries(
                Object.entries(form).map(([k, v]) => [k, v === undefined ? '' : v])
            );
            if (editingAssignment) {
                await db.collection('assignments').doc(editingAssignment.id).update(cleanForm);
                setMsg('✅ บันทึกสำเร็จ!');
            } else {
                const data = { ...cleanForm, courseId, totalPoints: 0, createdAt: serverTimestamp() };
                const ref = await db.collection('assignments').add(data);
                setMsg('✅ สร้างโจทย์สำเร็จ! → จัดการ Test Cases');
                setTimeout(() => { window.location.hash = `#/teacher/testcases?assignment=${ref.id}&course=${courseId}`; }, 1500);
            }
            loadData();
            setTab('list');
        } catch (err) {
            setMsg('❌ เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (a) => {
        setEditingAssignment(a);
        setForm({
            title: a.title || '',
            description: a.description || '',
            language: a.language || course?.language || 'c',
            difficulty: a.difficulty || 'ง่าย',
            timeLimit: a.timeLimit || 5000,
            memoryLimit: a.memoryLimit || 256,
            isPublished: a.isPublished || false,
            assignmentType: a.assignmentType || 'practice',
            examDurationMinutes: a.examDurationMinutes || 30,
            unitName: a.unitName || '',
            topicName: a.topicName || '',
            rawScore: a.rawScore || 0,
        });
        setAiTopicPreset('');
        setAiTopicCustom('');
        setAiHintDesc('');
        setTab('edit');
    };

    const startNew = () => {
        setEditingAssignment(null);
        setForm({
            title: '', description: '', language: course?.language || 'c', difficulty: 'ง่าย',
            timeLimit: 5000, memoryLimit: 256, isPublished: false, assignmentType: 'practice',
            examDurationMinutes: 30, unitName: '', topicName: '', rawScore: 0,
        });
        setAiTopicPreset('');
        setAiTopicCustom('');
        setAiHintDesc('');
        setMsg('');
        setTab('edit');
    };

    const togglePublish = async (id, cur) => {
        await db.collection('assignments').doc(id).update({ isPublished: !cur });
        setAssignments(as => as.map(a => a.id === id ? { ...a, isPublished: !cur } : a));
    };

    const publishAll = async () => {
        const hidden = assignments.filter(a => !a.isPublished);
        if (hidden.length === 0) { setMsg('✅ โจทย์ทุกข้อเปิดอยู่แล้ว'); return; }
        await Promise.all(hidden.map(a => db.collection('assignments').doc(a.id).update({ isPublished: true })));
        setAssignments(as => as.map(a => ({ ...a, isPublished: true })));
        setMsg(`✅ เปิดโจทย์ทั้งหมด ${hidden.length} ข้อสำเร็จ!`);
        setTimeout(() => setMsg(''), 3000);
    };

    const deleteAssignment = async (id) => {
        if (!confirm('ยืนยันการลบโจทย์นี้?')) return;
        await db.collection('assignments').doc(id).delete();
        setAssignments(as => as.filter(a => a.id !== id));
    };

    const tabStyle = (key) => ({
        padding: '10px 18px', fontWeight: 500, fontSize: '14px',
        border: 'none', background: 'none', cursor: 'pointer',
        borderBottom: tab === key ? '2px solid #EC407A' : '2px solid transparent',
        color: tab === key ? '#C2185B' : '#6B7280', transition: 'color .15s',
    });

    const currentPresets = TEACHER_TOPIC_PRESETS[form.language || 'c'] || TEACHER_TOPIC_PRESETS.c;

    // ── Render ───────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Platform" subtitle="จัดการโจทย์" />
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex items-center space-x-3 mb-6">
                    <a href="#/teacher/courses" style={{ color: '#EC407A', fontSize: '14px' }} className="hover:underline">← รายวิชา</a>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-700 font-medium">{course?.title}</span>
                </div>

                {/* Tab Bar */}
                <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-2" style={{ borderColor: '#E0E0E0' }}>
                    <button onClick={() => setTab('list')} style={tabStyle('list')}>
                        📋 โจทย์ทั้งหมด ({assignments.length})
                    </button>
                    <button onClick={() => setTab('directory')} style={tabStyle('directory')}>
                        📂 โครงสร้างหน่วยการเรียนรู้
                    </button>
                    <button onClick={startNew} style={tabStyle('edit')}>
                        ➕ {tab === 'edit' && editingAssignment ? 'แก้ไขโจทย์' : 'สร้างโจทย์ใหม่'}
                    </button>
                </div>

                {/* ── LIST TAB ──────────────────────────────────── */}
                {tab === 'list' && (
                    loading ? <Spinner /> : (
                        <div className="space-y-3">
                            {assignments.length > 0 && (
                                <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-2"
                                    style={{ background: '#FFF5F7', border: '1px solid #FFD1DC' }}>
                                    <span className="text-sm" style={{ color: '#C2185B' }}>
                                        เปิดอยู่ {assignments.filter(a => a.isPublished).length}/{assignments.length} ข้อ
                                    </span>
                                    <button onClick={publishAll} className="k-btn-pink px-4 py-1.5 text-sm">
                                        🟢 เปิดทั้งหมด
                                    </button>
                                </div>
                            )}
                            {msg && <div className={`p-3 rounded-lg text-sm border ${msg.includes('❌') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{msg}</div>}
                            {assignments.length === 0 && (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
                                    <div className="text-4xl mb-3">📝</div>
                                    <p>ยังไม่มีโจทย์ กด "สร้างโจทย์ใหม่" เพื่อเริ่มต้น</p>
                                </div>
                            )}
                            {assignments.map(a => (
                                <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                                    <div className="flex-1 min-w-0 mr-4">
                                        {(a.unitName || a.topicName) && (
                                            <div className="text-xs mb-1" style={{ color: '#F48FB1' }}>
                                                📂 {[a.unitName, a.topicName].filter(Boolean).join(' › ')}
                                            </div>
                                        )}
                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                            <h4 className="font-bold text-gray-800">{a.title}</h4>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                a.difficulty === 'ง่าย' ? 'bg-green-100 text-green-700' :
                                                a.difficulty === 'ปานกลาง' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'}`}>
                                                {a.difficulty}
                                            </span>
                                            {a.assignmentType === 'exam' && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                                                    🏆 ข้อสอบ {a.examDurationMinutes || 30} นาที
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{a.description}</p>
                                        <div className="flex space-x-3 text-xs text-gray-400 mt-1">
                                            <span>⏱ {(a.timeLimit || 5000) / 1000}s</span>
                                            <span>💾 {a.memoryLimit || 256}MB</span>
                                            <span>{LANGUAGES[a.language || 'c']?.icon} {LANGUAGES[a.language || 'c']?.name}</span>
                                            {a.rawScore > 0 && <span style={{ color: '#be185d', fontWeight: 600 }}>📊 {a.rawScore} คะแนนดิบ</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
                                        <a href={`#/teacher/testcases?assignment=${a.id}&course=${courseId}`}
                                            className="px-3 py-1.5 rounded-lg text-xs"
                                            style={{ background: '#F3E5F5', color: '#7B1FA2', textDecoration: 'none' }}>
                                            Test Cases
                                        </a>
                                        <button onClick={() => startEdit(a)}
                                            className="px-3 py-1.5 rounded-lg text-xs"
                                            style={{ background: '#FFF5F7', color: '#C2185B', border: '1px solid #FFD1DC' }}>
                                            แก้ไข
                                        </button>
                                        <button onClick={() => togglePublish(a.id, a.isPublished)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${a.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {a.isPublished ? '🟢 เปิดอยู่' : '⭕ ซ่อน'}
                                        </button>
                                        <button onClick={() => deleteAssignment(a.id)}
                                            className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs hover:bg-red-100">ลบ</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {/* ── DIRECTORY TAB ──────────────────────────────── */}
                {tab === 'directory' && (
                    <div className="max-w-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">📂 โครงสร้างหน่วยการเรียนรู้</h3>
                                <p className="text-xs text-gray-400 mt-0.5">สร้างลำดับ หน่วย → หัวข้อ สำหรับจัดวางโจทย์</p>
                            </div>
                            <button onClick={addUnit} className="k-btn-pink px-4 py-2 text-sm">
                                + เพิ่มหน่วย
                            </button>
                        </div>

                        {treeMsg && (
                            <div className={`p-3 rounded-lg mb-4 text-sm border ${treeMsg.includes('❌') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                {treeMsg}
                            </div>
                        )}

                        {directoryTree.length === 0 && (
                            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
                                <div className="text-4xl mb-3">📂</div>
                                <p className="mb-3">ยังไม่มีโครงสร้าง กด "เพิ่มหน่วย" เพื่อเริ่มสร้าง</p>
                                <p className="text-xs">ตัวอย่าง: หน่วยที่ 1 พื้นฐาน → การแสดงผล, การรับข้อมูล</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            {directoryTree.map((unit, ui) => (
                                <div key={ui} className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#FFD1DC' }}>
                                    {/* Unit header */}
                                    <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#FFF5F7' }}>
                                        <span className="text-sm">📁</span>
                                        <input
                                            value={unit.name}
                                            onChange={e => updateUnit(ui, e.target.value)}
                                            className="flex-1 bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-pink-300 py-0.5"
                                            style={{ color: '#AD1457' }}
                                        />
                                        <button onClick={() => addTopic(ui)}
                                            className="text-xs px-3 py-1 rounded-lg hover:bg-pink-100 transition-colors"
                                            style={{ color: '#C2185B' }}>
                                            + หัวข้อ
                                        </button>
                                        <button onClick={() => deleteUnit(ui)}
                                            className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                                            🗑
                                        </button>
                                    </div>

                                    {/* Topics */}
                                    {unit.topics.length > 0 ? (
                                        <div className="px-4 py-3 flex flex-wrap gap-2">
                                            {unit.topics.map((topic, ti) => (
                                                <div key={ti} className="flex items-center gap-1 bg-white rounded-lg px-2 py-1" style={{ border: '1px solid #E0E0E0' }}>
                                                    <span className="text-xs text-gray-400">📄</span>
                                                    <input
                                                        value={topic}
                                                        onChange={e => updateTopic(ui, ti, e.target.value)}
                                                        className="text-xs outline-none bg-transparent"
                                                        style={{ color: '#555', width: `${Math.max(topic.length, 8)}ch`, minWidth: '6ch', maxWidth: '20ch' }}
                                                    />
                                                    <button onClick={() => deleteTopic(ui, ti)}
                                                        className="text-gray-400 hover:text-red-500 text-xs leading-none">×</button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 px-6 pb-3 pt-2">ยังไม่มีหัวข้อ — กด "+ หัวข้อ" เพื่อเพิ่ม</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {directoryTree.length > 0 && (
                            <div className="mt-6 flex items-center gap-3">
                                <button onClick={saveTree} disabled={savingTree || !treeChanged}
                                    className="k-btn-pink px-6 py-2.5 flex items-center gap-2 disabled:opacity-50">
                                    {savingTree ? <SpinIcon className="w-4 h-4" /> : '💾'}
                                    {savingTree ? 'กำลังบันทึก...' : 'บันทึกโครงสร้าง'}
                                </button>
                                {!treeChanged && <span className="text-xs text-gray-400">✓ บันทึกแล้ว</span>}
                                {treeChanged && <span className="text-xs text-orange-500">● มีการเปลี่ยนแปลง — กด บันทึก</span>}
                            </div>
                        )}

                        {/* Suggested structure hint */}
                        <div className="mt-6 p-4 rounded-xl text-xs text-gray-500" style={{ background: '#F5F5F5', border: '1px dashed #E0E0E0' }}>
                            <p className="font-semibold text-gray-600 mb-2">💡 ตัวอย่างโครงสร้าง ว31281 การเขียนโปรแกรมฯ:</p>
                            <p>หน่วยที่ 1 พื้นฐาน → การแสดงผล, การรับข้อมูล, โครงสร้างโปรแกรม</p>
                            <p>หน่วยที่ 2 ตัวแปร → ชนิดข้อมูลพื้นฐาน, การประกาศตัวแปร, การแปลงชนิด</p>
                            <p>หน่วยที่ 3 นิพจน์ → ตัวดำเนินการคณิต, เปรียบเทียบ, ตรรกะ</p>
                            <p>หน่วยที่ 4 การตัดสินใจ → if/else, if-else if, switch-case</p>
                            <p>หน่วยที่ 5 การทำซ้ำ → for, while, do-while, Nested Loop, break/continue</p>
                            <p>หน่วยที่ 6 ฟังก์ชัน → การนิยาม, การส่งค่า, Recursive</p>
                            <p>หน่วยที่ 7 อาร์เรย์ → 1 มิติ, 2 มิติ, Searching, Sorting</p>
                            <p>หน่วยที่ 8 สตริง → การใช้งาน, ฟังก์ชัน string.h, การประมวลผล</p>
                            <p>หน่วยที่ 9 พอยน์เตอร์ → พอยน์เตอร์เบื้องต้น, Dynamic Memory</p>
                        </div>
                    </div>
                )}

                {/* ── EDIT / CREATE TAB ──────────────────────────── */}
                {tab === 'edit' && (
                    <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl" style={{ borderColor: '#FFD1DC' }}>
                        <h3 className="font-bold text-gray-800 text-lg mb-4">
                            {editingAssignment ? '✏️ แก้ไขโจทย์' : '➕ สร้างโจทย์ใหม่'}
                        </h3>
                        {msg && (
                            <div className={`p-3 rounded-lg mb-4 text-sm border ${msg.includes('❌') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                {msg}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-5">

                            {/* ─ Directory Selector (Unit → Topic) ─ */}
                            <div className="rounded-xl p-4 space-y-3" style={{ background: '#FFF5F7', border: '1px solid #FFD1DC' }}>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#AD1457' }}>📂 วางโจทย์ในโครงสร้าง</p>
                                    {directoryTree.length === 0 && (
                                        <button type="button" onClick={() => setTab('directory')}
                                            className="text-xs underline" style={{ color: '#EC407A' }}>
                                            + สร้างโครงสร้างก่อน
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">หน่วย (Unit)</label>
                                        <select
                                            value={form.unitName}
                                            onChange={e => setForm(f => ({ ...f, unitName: e.target.value, topicName: '' }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400">
                                            <option value="">— ไม่ระบุ —</option>
                                            {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">หัวข้อ (Topic)</label>
                                        <select
                                            value={form.topicName}
                                            onChange={e => setForm(f => ({ ...f, topicName: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400"
                                            disabled={!form.unitName}>
                                            <option value="">— ไม่ระบุ —</option>
                                            {topicOptionsFor(form.unitName).map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {(form.unitName || form.topicName) && (
                                    <p className="text-xs" style={{ color: '#F48FB1' }}>
                                        📂 {[form.unitName, form.topicName].filter(Boolean).join(' › ')} › {form.title || '(ชื่อโจทย์)'}
                                    </p>
                                )}
                            </div>

                            {/* ─ AI Topic + Hint Description ─ */}
                            <div className="rounded-xl p-4 space-y-3" style={{ background: '#F3E5F5', border: '1px solid #E1BEE7' }}>
                                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7B1FA2' }}>🤖 ตัวเลือก AI สร้างโจทย์</p>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-2">หัวข้อสำหรับ AI (เลือกเพื่อช่วย AI สร้างโจทย์)</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {currentPresets.map(p => (
                                            <button key={p} type="button"
                                                onClick={() => { setAiTopicPreset(p); if (p !== 'อื่นๆ (ระบุเอง)') setAiTopicCustom(''); }}
                                                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                                                style={aiTopicPreset === p
                                                    ? { background: '#7B1FA2', color: '#fff', borderColor: '#7B1FA2' }
                                                    : { background: '#fff', color: '#666', borderColor: '#E0E0E0' }}>
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    {isAiCustomTopic && (
                                        <input value={aiTopicCustom} onChange={e => setAiTopicCustom(e.target.value)}
                                            placeholder="ระบุหัวข้อที่ต้องการ..."
                                            className="mt-2 w-full px-3 py-2 rounded-xl text-sm outline-none"
                                            style={{ border: '1.5px solid #7B1FA2' }} />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        💬 คำบรรยายเพิ่มเติม (บอก AI ว่าต้องการโจทย์เกี่ยวกับอะไร)
                                    </label>
                                    <textarea value={aiHintDesc} onChange={e => setAiHintDesc(e.target.value)} rows="2"
                                        placeholder="เช่น: ให้ AI คิดโจทย์เกี่ยวกับการคำนวณเงิน / เหตุการณ์ร้านค้า / โจทย์ที่ต้องใช้ nested loop / ฯลฯ"
                                        className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                                        style={{ border: '1.5px solid #E0E0E0' }} />
                                </div>

                                <button type="button" onClick={handleGenerateWithAI} disabled={generating}
                                    className="px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
                                    style={{ background: '#7B1FA2' }}>
                                    {generating ? <SpinIcon className="w-4 h-4" /> : '🤖'}
                                    {generating ? 'กำลังสร้าง...' : 'สร้างโจทย์ด้วย AI'}
                                </button>
                            </div>

                            {/* ─ Title ─ */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโจทย์ *</label>
                                <input required value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400"
                                    placeholder="เช่น 1.1 Hello World" />
                            </div>

                            {/* ─ Description ─ */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบายโจทย์ *</label>
                                <textarea required value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows="7"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400 resize-none"
                                    placeholder="อธิบายโจทย์ เรื่องราว ตัวอย่าง Input/Output..." />
                            </div>

                            {/* ─ Language + Difficulty ─ */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ภาษา</label>
                                    <select value={form.language}
                                        onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400">
                                        {Object.keys(LANGUAGES).map(l => <option key={l} value={l}>{LANGUAGES[l].icon} {LANGUAGES[l].name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความยาก</label>
                                    <div className="flex gap-1">
                                        {['ง่าย', 'ปานกลาง', 'ยาก'].map(d => (
                                            <button key={d} type="button" onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                                                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                                                style={form.difficulty === d
                                                    ? { background: '#EC407A', color: '#fff' }
                                                    : { background: '#F5F5F5', color: '#555' }}>
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (ms)</label>
                                    <input type="number" value={form.timeLimit}
                                        onChange={e => setForm(f => ({ ...f, timeLimit: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Memory Limit (MB)</label>
                                    <input type="number" value={form.memoryLimit}
                                        onChange={e => setForm(f => ({ ...f, memoryLimit: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        คะแนนดิบ (เต็ม)
                                        <span className="ml-1 text-xs font-normal text-gray-400">— น้ำหนักคะแนนข้อนี้ในหน่วย</span>
                                    </label>
                                    <input type="number" min="0" max="100" value={form.rawScore || 0}
                                        onChange={e => setForm(f => ({ ...f, rawScore: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400"
                                        placeholder="เช่น 5, 3, 4" />
                                    <p className="text-xs text-gray-400 mt-1">ใช้แสดงคะแนนดิบใน Analytics (เช่น 3/5 คะแนน)</p>
                                </div>
                            </div>

                            {/* ─ Assignment Type ─ */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทโจทย์</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { v: 'practice', icon: '📝', label: 'แบบฝึกหัด', desc: 'AI ช่วยได้ มีการ hint' },
                                        { v: 'exam',     icon: '🏆', label: 'ข้อสอบ',   desc: 'ล็อก AI + จับเวลา' },
                                    ].map(opt => (
                                        <button key={opt.v} type="button"
                                            onClick={() => setForm(f => ({ ...f, assignmentType: opt.v }))}
                                            className="p-3 rounded-xl text-left transition-all"
                                            style={{
                                                border: form.assignmentType === opt.v ? '2px solid #EC407A' : '2px solid #E0E0E0',
                                                background: form.assignmentType === opt.v ? '#FFF5F7' : '#fff',
                                            }}>
                                            <div className="text-xl mb-0.5">{opt.icon}</div>
                                            <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                                            <div className="text-xs text-gray-500">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.assignmentType === 'exam' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ระยะเวลาสอบ (นาที)</label>
                                    <input type="number" min="5" max="180" value={form.examDurationMinutes}
                                        onChange={e => setForm(f => ({ ...f, examDurationMinutes: parseInt(e.target.value) }))}
                                        className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400" />
                                </div>
                            )}

                            {/* ─ Publish ─ */}
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="pub" checked={form.isPublished}
                                    onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} />
                                <label htmlFor="pub" className="text-sm text-gray-700">เปิดให้นักเรียนเห็นโจทย์นี้</label>
                            </div>

                            {/* ─ Buttons ─ */}
                            <div className="flex gap-3">
                                <button type="submit" disabled={saving}
                                    className="flex-1 k-btn-pink py-2.5 flex items-center justify-center gap-2">
                                    {saving ? <SpinIcon className="w-4 h-4" /> : null}
                                    {saving ? 'กำลังบันทึก...' : editingAssignment ? '💾 บันทึก' : '➕ สร้างโจทย์'}
                                </button>
                                <button type="button" onClick={() => setTab('list')}
                                    className="px-5 py-2 rounded-xl text-sm text-gray-600"
                                    style={{ border: '1.5px solid #E0E0E0' }}>
                                    ยกเลิก
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
};

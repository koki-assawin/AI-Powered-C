// js/pages/teacher/AssignmentManager.js - Create/edit coding assignments

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
    });
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [generating, setGenerating] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const [tab, setTab] = React.useState('list');

    React.useEffect(() => { if (courseId) loadData(); }, [courseId]);

    const loadData = async () => {
        setLoading(true);
        const [courseSnap, assignSnap] = await Promise.all([
            db.collection('courses').doc(courseId).get(),
            db.collection('assignments').where('courseId', '==', courseId).get(),
        ]);
        setCourse({ id: courseSnap.id, ...courseSnap.data() });
        setAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    const handleGenerateWithAI = async () => {
        setGenerating(true);
        try {
            const problems = await generateProblems(
                form.language, 'การเขียนโปรแกรม', form.difficulty, 1,
                form.title, form.description
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

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg('');
        try {
            const data = { ...form, courseId, totalPoints: 0, createdAt: serverTimestamp() };
            if (editingAssignment) {
                await db.collection('assignments').doc(editingAssignment.id).update({ ...form });
                setMsg('บันทึกสำเร็จ!');
            } else {
                const ref = await db.collection('assignments').add(data);
                setMsg(`สร้างโจทย์สำเร็จ! → จัดการ Test Cases`);
                setTimeout(() => { window.location.hash = `#/teacher/testcases?assignment=${ref.id}&course=${courseId}`; }, 1500);
            }
            loadData();
            setTab('list');
        } catch (err) {
            setMsg('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (a) => {
        setEditingAssignment(a);
        setForm({ title: a.title, description: a.description, language: a.language, difficulty: a.difficulty,
            timeLimit: a.timeLimit || 5000, memoryLimit: a.memoryLimit || 256, isPublished: a.isPublished,
            assignmentType: a.assignmentType || 'practice', examDurationMinutes: a.examDurationMinutes || 30 });
        setTab('edit');
    };

    const startNew = () => {
        setEditingAssignment(null);
        setForm({ title: '', description: '', language: course?.language || 'c', difficulty: 'ง่าย',
            timeLimit: 5000, memoryLimit: 256, isPublished: false, assignmentType: 'practice', examDurationMinutes: 30 });
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

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title={course?.title || 'จัดการโจทย์'} subtitle="Assignment Manager" />
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex items-center space-x-3 mb-6">
                    <a href="#/teacher/courses" className="text-blue-500 text-sm hover:underline">← รายวิชา</a>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-700 font-medium">{course?.title}</span>
                </div>

                <div className="flex border-b border-gray-200 mb-6">
                    <button onClick={() => setTab('list')}
                        className={`px-6 py-3 font-medium text-sm ${tab === 'list' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                        📋 โจทย์ทั้งหมด ({assignments.length})
                    </button>
                    <button onClick={startNew}
                        className={`px-6 py-3 font-medium text-sm ${tab === 'edit' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                        ➕ {editingAssignment ? 'แก้ไขโจทย์' : 'สร้างโจทย์ใหม่'}
                    </button>
                </div>

                {tab === 'list' && (
                    loading ? <Spinner /> : (
                        <div className="space-y-3">
                            {assignments.length > 0 && (
                                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-2">
                                    <span className="text-sm text-blue-700">
                                        เปิดอยู่ {assignments.filter(a => a.isPublished).length}/{assignments.length} ข้อ
                                    </span>
                                    <button onClick={publishAll}
                                        className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 font-medium">
                                        🟢 เปิดทั้งหมด
                                    </button>
                                </div>
                            )}
                            {msg && <div className="p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">{msg}</div>}
                            {assignments.length === 0 && (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
                                    <div className="text-4xl mb-3">📝</div>
                                    <p>ยังไม่มีโจทย์ กด "สร้างโจทย์ใหม่" เพื่อเริ่มต้น</p>
                                </div>
                            )}
                            {assignments.map(a => (
                                <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center space-x-3 mb-1">
                                            <h4 className="font-bold text-gray-800">{a.title}</h4>
                                            <span className={`text-xs px-2 py-0.5 rounded-full
                                                ${a.difficulty === 'ง่าย' ? 'bg-green-100 text-green-700' :
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
                                            <span>⏱ {a.timeLimit / 1000}s</span>
                                            <span>💾 {a.memoryLimit}MB</span>
                                            <span>{LANGUAGES[a.language]?.icon} {LANGUAGES[a.language]?.name}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                        <a href={`#/teacher/testcases?assignment=${a.id}&course=${courseId}`}
                                            className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs hover:bg-purple-200">
                                            Test Cases
                                        </a>
                                        <button onClick={() => startEdit(a)}
                                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200">
                                            แก้ไข
                                        </button>
                                        <button onClick={() => togglePublish(a.id, a.isPublished)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${a.isPublished ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}>
                                            {a.isPublished ? '🟢 เปิดอยู่' : '⭕ ซ่อนอยู่'}
                                        </button>
                                        <button onClick={() => deleteAssignment(a.id)}
                                            className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs hover:bg-red-200">ลบ</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {tab === 'edit' && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-2xl">
                        <h3 className="font-bold text-gray-800 text-lg mb-4">
                            {editingAssignment ? 'แก้ไขโจทย์' : 'สร้างโจทย์ใหม่'}
                        </h3>
                        {msg && <div className={`p-3 rounded-lg mb-4 text-sm ${msg.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="flex space-x-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโจทย์ *</label>
                                    <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="เช่น รวมตัวเลข 1 ถึง N" />
                                </div>
                                <button type="button" onClick={handleGenerateWithAI} disabled={generating}
                                    className="self-end px-3 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50 whitespace-nowrap flex items-center space-x-1">
                                    {generating ? <SpinIcon className="w-4 h-4 mr-1" /> : <span>🤖</span>}
                                    <span>{generating ? 'AI กำลังสร้าง...' : 'AI สร้าง'}</span>
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบายโจทย์ *</label>
                                <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows="6"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="อธิบายโจทย์ เรื่องราว ตัวอย่าง Input/Output..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ภาษา</label>
                                    <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                        {Object.keys(LANGUAGES).map(l => <option key={l} value={l}>{LANGUAGES[l].icon} {LANGUAGES[l].name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความยาก</label>
                                    <div className="flex space-x-1">
                                        {['ง่าย', 'ปานกลาง', 'ยาก'].map(d => (
                                            <button key={d} type="button" onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                                                    ${form.difficulty === d ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{d}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (ms)</label>
                                    <input type="number" value={form.timeLimit} onChange={e => setForm(f => ({ ...f, timeLimit: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Memory Limit (MB)</label>
                                    <input type="number" value={form.memoryLimit} onChange={e => setForm(f => ({ ...f, memoryLimit: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            {/* Assignment Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทโจทย์</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { v:'practice', icon:'📝', label:'แบบฝึกหัด', desc:'AI ช่วยได้ มีการ hint' },
                                        { v:'exam',     icon:'🏆', label:'ข้อสอบ', desc:'ล็อก AI + จับเวลา' },
                                    ].map(opt => (
                                        <button key={opt.v} type="button"
                                            onClick={() => setForm(f => ({ ...f, assignmentType: opt.v }))}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${form.assignmentType === opt.v ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
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
                                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="pub" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} />
                                <label htmlFor="pub" className="text-sm text-gray-700">เปิดให้นักเรียนเห็นโจทย์นี้</label>
                            </div>

                            <div className="flex space-x-3">
                                <button type="submit" disabled={saving}
                                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center">
                                    {saving ? <SpinIcon className="w-4 h-4 mr-2" /> : null}
                                    {saving ? 'กำลังบันทึก...' : editingAssignment ? 'บันทึก' : 'สร้างโจทย์'}
                                </button>
                                <button type="button" onClick={() => setTab('list')}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">ยกเลิก</button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
};

// js/pages/teacher/CourseBuilder.js - Create and manage courses and lessons

const CourseBuilder = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const editId = params.get('edit');

    const [courses, setCourses] = React.useState([]);
    const [form, setForm] = React.useState({
        title: '', description: '', language: 'c', isPublished: false,
    });
    const [lessons, setLessons] = React.useState([]);
    const [newLesson, setNewLesson] = React.useState({ title: '', content: '' });
    const [selectedCourse, setSelectedCourse] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const [tab, setTab] = React.useState('courses'); // 'courses' | 'edit'

    React.useEffect(() => { if (userDoc) loadCourses(); }, [userDoc]);

    const loadCourses = async () => {
        setLoading(true);
        const snap = await db.collection('courses').where('teacherId', '==', userDoc.id).get();
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCourses(list);
        if (editId) {
            const target = list.find(c => c.id === editId);
            if (target) editCourse(target);
        }
        setLoading(false);
    };

    const editCourse = async (course) => {
        setSelectedCourse(course);
        setForm({ title: course.title, description: course.description, language: course.language, isPublished: course.isPublished });
        setTab('edit');
        const snap = await db.collection('lessons').where('courseId', '==', course.id).orderBy('order').get();
        setLessons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg('');
        try {
            const data = { ...form, teacherId: userDoc.id };
            if (selectedCourse) {
                await db.collection('courses').doc(selectedCourse.id).update(data);
                setMsg('บันทึกสำเร็จ!');
            } else {
                const ref = await db.collection('courses').add({ ...data, enrollmentCount: 0, createdAt: serverTimestamp() });
                setSelectedCourse({ id: ref.id, ...data, enrollmentCount: 0 });
                setMsg('สร้างรายวิชาสำเร็จ!');
            }
            loadCourses();
        } catch (err) {
            setMsg('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddLesson = async () => {
        if (!newLesson.title.trim() || !selectedCourse) return;
        const data = {
            courseId: selectedCourse.id,
            title: newLesson.title.trim(),
            content: newLesson.content.trim(),
            order: lessons.length + 1,
            createdAt: serverTimestamp(),
        };
        const ref = await db.collection('lessons').add(data);
        setLessons(l => [...l, { id: ref.id, ...data }]);
        setNewLesson({ title: '', content: '' });
    };

    const handleDeleteLesson = async (id) => {
        await db.collection('lessons').doc(id).delete();
        setLessons(l => l.filter(x => x.id !== id));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding LMS" subtitle="จัดการรายวิชา" />
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex border-b border-gray-200 mb-6">
                    <button onClick={() => setTab('courses')}
                        className={`px-6 py-3 font-medium text-sm transition-colors ${tab === 'courses' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        📚 รายวิชาทั้งหมด
                    </button>
                    <button onClick={() => { setTab('edit'); setSelectedCourse(null); setForm({ title: '', description: '', language: 'c', isPublished: false }); setLessons([]); }}
                        className={`px-6 py-3 font-medium text-sm transition-colors ${tab === 'edit' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        ➕ {selectedCourse ? 'แก้ไขรายวิชา' : 'สร้างรายวิชาใหม่'}
                    </button>
                </div>

                {tab === 'courses' && (
                    loading ? <Spinner /> : (
                        <div>
                            <button onClick={() => setTab('edit')}
                                className="mb-4 bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 flex items-center space-x-1">
                                <span>+</span><span>สร้างรายวิชาใหม่</span>
                            </button>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {courses.map(c => (
                                    <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-gray-800">{c.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full ${c.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {c.isPublished ? 'เปิดสอน' : 'ฉบับร่าง'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{c.description}</p>
                                        <div className="flex space-x-2">
                                            <button onClick={() => editCourse(c)}
                                                className="flex-1 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">แก้ไข</button>
                                            <a href={`#/teacher/assignment?course=${c.id}`}
                                                className="flex-1 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 text-center">โจทย์</a>
                                            <a href={`#/teacher/analytics?course=${c.id}`}
                                                className="flex-1 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 text-center">สถิติ</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {tab === 'edit' && (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Course Form */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <h3 className="font-bold text-gray-800 text-lg mb-4">
                                {selectedCourse ? 'แก้ไขรายวิชา' : 'สร้างรายวิชาใหม่'}
                            </h3>
                            {msg && <div className={`p-3 rounded-lg mb-4 text-sm ${msg.includes('ข้อผิด') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}
                            <form onSubmit={handleSaveCourse} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อรายวิชา *</label>
                                    <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="เช่น การเขียนโปรแกรม C เบื้องต้น" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="คำอธิบายรายวิชา..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ภาษาโปรแกรมหลัก</label>
                                    <div className="flex space-x-2">
                                        {Object.keys(LANGUAGES).map(lang => (
                                            <button key={lang} type="button"
                                                onClick={() => setForm(f => ({ ...f, language: lang }))}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                                                    ${form.language === lang ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                                {LANGUAGES[lang].icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" id="isPublished" checked={form.isPublished}
                                        onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                                        className="rounded" />
                                    <label htmlFor="isPublished" className="text-sm text-gray-700">เปิดเผยให้นักเรียนเห็น</label>
                                </div>
                                <button type="submit" disabled={saving}
                                    className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center">
                                    {saving ? <SpinIcon className="w-4 h-4 mr-2" /> : null}
                                    {saving ? 'กำลังบันทึก...' : selectedCourse ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างรายวิชา'}
                                </button>
                            </form>
                        </div>

                        {/* Lessons */}
                        {selectedCourse && (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-800 text-lg">บทเรียน ({lessons.length})</h3>
                                    <a href={`#/teacher/assignment?course=${selectedCourse.id}`}
                                        className="text-sm text-purple-500 hover:underline">จัดการโจทย์ →</a>
                                </div>

                                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                                    {lessons.map((l, i) => (
                                        <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <span className="text-xs text-gray-400 mr-2">{i + 1}.</span>
                                                <span className="text-sm font-medium text-gray-800">{l.title}</span>
                                            </div>
                                            <button onClick={() => handleDeleteLesson(l.id)} className="text-red-400 hover:text-red-600 text-xs">ลบ</button>
                                        </div>
                                    ))}
                                    {lessons.length === 0 && <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีบทเรียน</p>}
                                </div>

                                <div className="border-t border-gray-100 pt-4 space-y-3">
                                    <h4 className="text-sm font-medium text-gray-700">เพิ่มบทเรียนใหม่</h4>
                                    <input value={newLesson.title} onChange={e => setNewLesson(l => ({ ...l, title: e.target.value }))}
                                        placeholder="ชื่อบทเรียน"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                    <textarea value={newLesson.content} onChange={e => setNewLesson(l => ({ ...l, content: e.target.value }))}
                                        placeholder="เนื้อหา (Markdown หรือข้อความ)" rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                    <button onClick={handleAddLesson}
                                        className="w-full py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                                        + เพิ่มบทเรียน
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

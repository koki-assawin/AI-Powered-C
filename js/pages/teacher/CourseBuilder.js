// js/pages/teacher/CourseBuilder.js - Create and manage courses (v4.7)

const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
};

const CourseBuilder = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const editId = params.get('edit');

    const [courses, setCourses] = React.useState([]);
    const [form, setForm] = React.useState({
        title: '', description: '', language: 'c', isPublished: false,
        grade: 'ม.4', room: '', semester: '1', academicYear: '2568',
    });
    const [selectedCourse, setSelectedCourse] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [msg, setMsg] = React.useState({ text: '', type: 'success' });
    const [tab, setTab] = React.useState('courses');
    const [createdClassCode, setCreatedClassCode] = React.useState('');
    const [showArchived, setShowArchived] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState(null); // courseId of ongoing action

    const showMsg = (text, type = 'success') => {
        setMsg({ text, type });
        setTimeout(() => setMsg({ text: '', type: 'success' }), 4000);
    };

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

    const editCourse = (course) => {
        setSelectedCourse(course);
        setForm({
            title: course.title,
            description: course.description,
            language: course.language,
            isPublished: course.isPublished,
            grade: course.grade || 'ม.4',
            room: course.room || '',
            semester: course.semester || '1',
            academicYear: course.academicYear || '2568',
        });
        setCreatedClassCode(course.classCode || '');
        setTab('edit');
    };

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg({ text: '', type: 'success' });
        try {
            const data = {
                title: form.title,
                description: form.description,
                language: form.language,
                isPublished: form.isPublished,
                grade: form.grade,
                room: form.room,
                semester: form.semester,
                academicYear: form.academicYear,
                teacherId: userDoc.id,
            };
            if (selectedCourse) {
                await db.collection('courses').doc(selectedCourse.id).update(data);
                showMsg('✅ บันทึกสำเร็จ!');
                setCreatedClassCode(selectedCourse.classCode || '');
            } else {
                const classCode = generateClassCode();
                const ref = await db.collection('courses').add({
                    ...data, enrollmentCount: 0, classCode,
                    status: 'active', createdAt: serverTimestamp(),
                });
                const newCourse = { id: ref.id, ...data, enrollmentCount: 0, classCode, status: 'active' };
                setSelectedCourse(newCourse);
                setCreatedClassCode(classCode);
                showMsg('✅ สร้างรายวิชาสำเร็จ!');
            }
            loadCourses();
        } catch (err) {
            showMsg('❌ เกิดข้อผิดพลาด: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // Toggle published (show/hide)
    const togglePublish = async (course) => {
        setActionLoading(course.id + '_publish');
        try {
            const next = !course.isPublished;
            await db.collection('courses').doc(course.id).update({ isPublished: next });
            setCourses(cs => cs.map(c => c.id === course.id ? { ...c, isPublished: next } : c));
            showMsg(next ? '✅ เปิดเผยรายวิชาแล้ว' : '✅ ซ่อนรายวิชาแล้ว');
        } catch (err) {
            showMsg('❌ ' + err.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // Archive / unarchive
    const toggleArchive = async (course) => {
        const isArchived = course.status === 'archived';
        if (!isArchived && !confirm(`จัดเก็บรายวิชา "${course.title}"?\nรายวิชาจะถูกซ่อนในแท็บ "จัดเก็บแล้ว" และนักเรียนจะไม่เห็น`)) return;
        setActionLoading(course.id + '_archive');
        try {
            const newStatus = isArchived ? 'active' : 'archived';
            await db.collection('courses').doc(course.id).update({
                status: newStatus,
                isPublished: isArchived ? course.isPublished : false,
            });
            setCourses(cs => cs.map(c => c.id === course.id
                ? { ...c, status: newStatus, isPublished: isArchived ? c.isPublished : false }
                : c));
            showMsg(isArchived ? '✅ คืนรายวิชากลับสู่ Active แล้ว' : '✅ จัดเก็บรายวิชาแล้ว');
        } catch (err) {
            showMsg('❌ ' + err.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // Delete course
    const handleDelete = async (course) => {
        if (!confirm(`⚠️ ลบรายวิชา "${course.title}" ?\n\nการลบจะลบข้อมูลรายวิชาเท่านั้น\nโจทย์และ Test Cases ของวิชานี้จะยังคงอยู่ใน Firestore\n(แนะนำให้ใช้ "จัดเก็บ" แทน)`)) return;
        setActionLoading(course.id + '_delete');
        try {
            await db.collection('courses').doc(course.id).delete();
            setCourses(cs => cs.filter(c => c.id !== course.id));
            showMsg('✅ ลบรายวิชาแล้ว');
        } catch (err) {
            showMsg('❌ ' + err.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // Duplicate course + copy all assignments + test cases
    const handleDuplicate = async (course) => {
        setActionLoading(course.id + '_dup');
        try {
            // New semester/year
            let newSemester = course.semester === '1' ? '2' : '1';
            let newAcademicYear = course.semester === '1'
                ? (course.academicYear || '2568')
                : String(parseInt(course.academicYear || '2568', 10) + 1);

            const newClassCode = generateClassCode();
            const newCourseRef = await db.collection('courses').add({
                title: course.title,
                description: course.description,
                language: course.language,
                isPublished: false,
                grade: course.grade || 'ม.4',
                room: course.room || '',
                semester: newSemester,
                academicYear: newAcademicYear,
                teacherId: userDoc.id,
                enrollmentCount: 0,
                classCode: newClassCode,
                status: 'active',
                createdAt: serverTimestamp(),
                copiedFrom: course.id,
            });

            // Copy all assignments for this course
            const assignSnap = await db.collection('assignments')
                .where('courseId', '==', course.id).get();

            let copiedAssignments = 0;
            let copiedTestCases = 0;

            for (const aDoc of assignSnap.docs) {
                const aData = aDoc.data();
                // Create new assignment under new course
                const newAssignRef = await db.collection('assignments').add({
                    ...aData,
                    courseId: newCourseRef.id,
                    createdAt: serverTimestamp(),
                });
                copiedAssignments++;

                // Copy test cases for this assignment
                const tcSnap = await db.collection('testCases')
                    .where('assignmentId', '==', aDoc.id).get();
                for (const tcDoc of tcSnap.docs) {
                    await db.collection('testCases').add({
                        ...tcDoc.data(),
                        assignmentId: newAssignRef.id,
                    });
                    copiedTestCases++;
                }
            }

            await loadCourses();
            showMsg(`✅ สำเนาสำเร็จ! เทอม ${newSemester}/${newAcademicYear} · ${copiedAssignments} โจทย์ · ${copiedTestCases} test cases · รหัส: ${newClassCode}`);
        } catch (err) {
            showMsg('❌ เกิดข้อผิดพลาด: ' + err.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const getJoinLink = (code) => {
        const base = window.location.origin + window.location.pathname;
        return `${base}#/student/courses?join=${code}`;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).catch(() => {
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        });
    };

    const gradeOptions = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];

    const activeCourses   = courses.filter(c => c.status !== 'archived');
    const archivedCourses = courses.filter(c => c.status === 'archived');
    const displayedCourses = showArchived ? archivedCourses : activeCourses;

    // ── Course Card ──
    const CourseCard = ({ c }) => {
        const isAct  = actionLoading;
        const busy   = (suffix) => isAct === c.id + suffix;
        const anyBusy = busy('_publish') || busy('_archive') || busy('_delete') || busy('_dup');
        const archived = c.status === 'archived';

        return (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden"
                style={{ border: `1px solid ${archived ? '#E0E0E0' : '#FFD1DC'}`, opacity: archived ? 0.85 : 1 }}>

                {/* Status bar */}
                <div className="px-5 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-gray-800 leading-snug">{c.title}</h3>
                        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                            {archived ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">🗄 จัดเก็บแล้ว</span>
                            ) : (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {c.isPublished ? '✓ เปิดสอน' : '— ซ่อน'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-xs mb-2">
                        {c.grade && <span style={{ background:'#FFF0F5', color:'#AD1457', border:'1px solid #FFD1DC' }} className="px-2 py-0.5 rounded-full">{c.grade}</span>}
                        {c.room  && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">ห้อง {c.room}</span>}
                        {c.semester && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">เทอม {c.semester}/{c.academicYear || ''}</span>}
                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{LANGUAGES[c.language]?.icon} {LANGUAGES[c.language]?.name}</span>
                    </div>

                    {c.classCode && (
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-400">รหัส:</span>
                            <span className="font-mono font-bold text-sm px-2 py-0.5 rounded" style={{ background:'#FFF0F5', color:'#C2185B' }}>{c.classCode}</span>
                            <button onClick={() => copyToClipboard(c.classCode)} className="text-gray-400 hover:text-pink-500 text-xs" title="คัดลอกรหัส">📋</button>
                        </div>
                    )}

                    {c.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mb-1">{c.description}</p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="px-4 pb-4 flex flex-col gap-2">
                    {/* Row 1: main actions */}
                    <div className="flex gap-1.5">
                        <button onClick={() => editCourse(c)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium k-btn-pink">
                            ✏️ แก้ไข
                        </button>
                        <a href={`#/teacher/assignment?course=${c.id}`}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center"
                            style={{ background:'#F5F0FF', color:'#6D28D9', border:'1px solid #DDD6FE', textDecoration:'none' }}>
                            📝 โจทย์
                        </a>
                        <a href={`#/teacher/analytics?course=${c.id}`}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium text-center"
                            style={{ background:'#FFF7ED', color:'#C2410C', border:'1px solid #FED7AA', textDecoration:'none' }}>
                            📊 สถิติ
                        </a>
                    </div>

                    {/* Row 2: management actions */}
                    <div className="flex gap-1.5">
                        {/* Duplicate */}
                        <button onClick={() => handleDuplicate(c)} disabled={anyBusy}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                            style={{ background:'#F0FDF4', color:'#15803D', border:'1px solid #BBF7D0' }}
                            title="สำเนารายวิชา + โจทย์ + Test Cases ทั้งหมด">
                            {busy('_dup') ? '⏳' : '📋 สำเนา'}
                        </button>

                        {/* Toggle publish */}
                        {!archived && (
                            <button onClick={() => togglePublish(c)} disabled={anyBusy}
                                className="flex-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                                style={{ background: c.isPublished ? '#FFF7ED' : '#F0FDF4', color: c.isPublished ? '#C2410C' : '#15803D', border: `1px solid ${c.isPublished ? '#FED7AA' : '#BBF7D0'}` }}
                                title={c.isPublished ? 'ซ่อนไม่ให้นักเรียนค้นพบ' : 'เปิดเผยให้นักเรียนเห็น'}>
                                {busy('_publish') ? '⏳' : c.isPublished ? '👁 ซ่อน' : '👁 เปิด'}
                            </button>
                        )}

                        {/* Archive / Unarchive */}
                        <button onClick={() => toggleArchive(c)} disabled={anyBusy}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                            style={{ background: archived ? '#F0FDF4' : '#F5F5F5', color: archived ? '#15803D' : '#6b7280', border: `1px solid ${archived ? '#BBF7D0' : '#E0E0E0'}` }}
                            title={archived ? 'คืนรายวิชากลับ Active' : 'จัดเก็บรายวิชา (ซ่อนชั่วคราว)'}>
                            {busy('_archive') ? '⏳' : archived ? '↩ คืนค่า' : '🗄 จัดเก็บ'}
                        </button>

                        {/* Delete */}
                        <button onClick={() => handleDelete(c)} disabled={anyBusy}
                            className="py-1.5 px-3 rounded-lg text-xs font-medium disabled:opacity-50"
                            style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}
                            title="ลบรายวิชาถาวร">
                            {busy('_delete') ? '⏳' : '🗑'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Platform" subtitle="จัดการรายวิชา" />
            <main className="max-w-6xl mx-auto px-4 py-8">

                {/* Tabs */}
                <div className="flex border-b mb-6" style={{ borderColor: '#FFD1DC' }}>
                    {[
                        { key: 'courses', label: '📚 รายวิชาทั้งหมด' },
                        { key: 'edit',    label: selectedCourse ? '✏️ แก้ไขรายวิชา' : '➕ สร้างรายวิชาใหม่' },
                    ].map(t => (
                        <button key={t.key}
                            onClick={() => {
                                if (t.key === 'edit' && !selectedCourse) {
                                    setForm({ title: '', description: '', language: 'c', isPublished: false, grade: 'ม.4', room: '', semester: '1', academicYear: '2568' });
                                    setCreatedClassCode('');
                                    setMsg({ text: '', type: 'success' });
                                }
                                setTab(t.key);
                            }}
                            className="px-6 py-3 font-medium text-sm transition-colors"
                            style={{
                                borderBottom: tab === t.key ? '2.5px solid #EC407A' : '2.5px solid transparent',
                                color: tab === t.key ? '#EC407A' : '#9ca3af',
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Courses tab ── */}
                {tab === 'courses' && (
                    loading ? <Spinner /> : (
                        <div>
                            {msg.text && (
                                <div className={`mb-4 p-3 rounded-xl text-sm border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                    {msg.text}
                                </div>
                            )}

                            {/* Toolbar */}
                            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                                <button onClick={() => {
                                    setSelectedCourse(null);
                                    setForm({ title: '', description: '', language: 'c', isPublished: false, grade: 'ม.4', room: '', semester: '1', academicYear: '2568' });
                                    setCreatedClassCode('');
                                    setMsg({ text: '', type: 'success' });
                                    setTab('edit');
                                }} className="k-btn-pink px-4 py-2 text-sm flex items-center gap-1.5">
                                    ➕ สร้างรายวิชาใหม่
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowArchived(false)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                        style={!showArchived ? { background:'#EC407A', color:'#fff' } : { background:'#F5F5F5', color:'#6b7280' }}>
                                        🟢 Active ({activeCourses.length})
                                    </button>
                                    <button
                                        onClick={() => setShowArchived(true)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                        style={showArchived ? { background:'#6b7280', color:'#fff' } : { background:'#F5F5F5', color:'#6b7280' }}>
                                        🗄 จัดเก็บแล้ว ({archivedCourses.length})
                                    </button>
                                </div>
                            </div>

                            {displayedCourses.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    <div className="text-5xl mb-3">{showArchived ? '🗄' : '📚'}</div>
                                    <p>{showArchived ? 'ไม่มีรายวิชาที่จัดเก็บ' : 'ยังไม่มีรายวิชา กดสร้างใหม่ได้เลย'}</p>
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {displayedCourses.map(c => <CourseCard key={c.id} c={c} />)}
                                </div>
                            )}

                            {/* Legend */}
                            <div className="mt-6 p-4 rounded-xl text-xs" style={{ background:'#FEF3C7', border:'1px solid #FDE68A', color:'#92400E' }}>
                                💡 <strong>📋 สำเนา</strong> = คัดลอกรายวิชา + โจทย์ทั้งหมด + Test Cases ไปยังภาคเรียนถัดไป (ยังไม่เปิดเผย) &nbsp;|&nbsp;
                                <strong>🗄 จัดเก็บ</strong> = ซ่อนชั่วคราว เก็บข้อมูลไว้ ไม่ลบ &nbsp;|&nbsp;
                                <strong>👁 ซ่อน/เปิด</strong> = ควบคุมว่านักเรียนค้นพบได้หรือไม่
                            </div>
                        </div>
                    )
                )}

                {/* ── Edit tab ── */}
                {tab === 'edit' && (
                    <div className="max-w-2xl">
                        <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #FFD1DC' }}>
                            <h3 className="font-bold text-gray-800 text-lg mb-4">
                                {selectedCourse ? '✏️ แก้ไขรายวิชา' : '➕ สร้างรายวิชาใหม่'}
                            </h3>
                            {msg.text && (
                                <div className={`p-3 rounded-xl mb-4 text-sm border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                    {msg.text}
                                </div>
                            )}

                            {/* Class Code Info */}
                            {createdClassCode && (
                                <div className="mb-5 p-4 rounded-xl" style={{ background:'#FFF0F5', border:'1px solid #FFD1DC' }}>
                                    <p className="text-sm font-medium mb-1" style={{ color:'#AD1457' }}>รหัสห้องเรียน (Class Code)</p>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono font-bold text-3xl tracking-widest" style={{ color:'#C2185B' }}>{createdClassCode}</span>
                                        <button type="button" onClick={() => copyToClipboard(createdClassCode)}
                                            className="k-btn-pink text-sm px-3 py-1">
                                            📋 คัดลอก
                                        </button>
                                    </div>
                                    <p className="text-xs mb-1" style={{ color:'#EC407A' }}>ลิงก์เข้าร่วม:</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs break-all flex-1 px-2 py-1 rounded font-mono"
                                            style={{ background:'white', border:'1px solid #FFD1DC', color:'#AD1457' }}>
                                            {getJoinLink(createdClassCode)}
                                        </span>
                                        <button type="button" onClick={() => copyToClipboard(getJoinLink(createdClassCode))}
                                            className="text-xs px-2 py-1 rounded whitespace-nowrap"
                                            style={{ background:'#FFE4EC', color:'#C2185B', border:'1px solid #FFD1DC' }}>
                                            📋
                                        </button>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSaveCourse} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อรายวิชา *</label>
                                    <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        className="k-input" placeholder="เช่น การเขียนโปรแกรม C เบื้องต้น" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows="3"
                                        className="k-input resize-none" placeholder="คำอธิบายรายวิชา..." />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ระดับชั้น</label>
                                        <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="k-input" style={{ paddingLeft:'8px' }}>
                                            {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ห้อง</label>
                                        <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                                            className="k-input" placeholder="เช่น 1, 2, ..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ภาคเรียน</label>
                                        <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className="k-input" style={{ paddingLeft:'8px' }}>
                                            <option value="1">ภาคเรียนที่ 1</option>
                                            <option value="2">ภาคเรียนที่ 2</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ปีการศึกษา (พ.ศ.)</label>
                                        <input value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))}
                                            className="k-input" placeholder="2568" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">ภาษาโปรแกรมหลัก</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.keys(LANGUAGES).map(lang => (
                                            <button key={lang} type="button"
                                                onClick={() => setForm(f => ({ ...f, language: lang }))}
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                                                style={form.language === lang
                                                    ? { background:'linear-gradient(135deg,#EC407A,#C2185B)', color:'#fff', border:'none' }
                                                    : { background:'#F5F5F5', color:'#6b7280', border:'1px solid #E0E0E0' }}>
                                                <span>{LANGUAGES[lang].icon}</span>
                                                <span>{LANGUAGES[lang].name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background:'#FFF5F7', border:'1px solid #FFD1DC' }}>
                                    <input type="checkbox" id="isPublished" checked={form.isPublished}
                                        onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                                        style={{ accentColor:'#EC407A', width:'16px', height:'16px' }} />
                                    <label htmlFor="isPublished" className="text-sm text-gray-700 cursor-pointer">
                                        เปิดเผยให้นักเรียนค้นพบได้ <span className="text-gray-400">(join ด้วยรหัสได้เสมอ)</span>
                                    </label>
                                </div>

                                <button type="submit" disabled={saving}
                                    className="w-full k-btn-pink py-2.5 flex items-center justify-center gap-2">
                                    {saving ? <SpinIcon className="w-4 h-4" /> : null}
                                    {saving ? 'กำลังบันทึก...' : selectedCourse ? '💾 บันทึกการเปลี่ยนแปลง' : '✨ สร้างรายวิชา'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

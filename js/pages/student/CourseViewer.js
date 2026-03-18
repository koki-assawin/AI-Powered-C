// js/pages/student/CourseViewer.js - Browse and enroll in courses

const CourseViewer = () => {
    const { userDoc } = useAuth();
    const [allCourses, setAllCourses] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [enrolling, setEnrolling] = React.useState(null);
    const [msg, setMsg] = React.useState('');

    React.useEffect(() => { loadCourses(); }, []);

    const loadCourses = async () => {
        setLoading(true);
        try {
            const snap = await db.collection('courses').where('isPublished', '==', true).get();
            setAllCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isEnrolled = (courseId) => (userDoc?.enrolledCourses || []).includes(courseId);

    const handleEnroll = async (courseId) => {
        if (isEnrolled(courseId)) {
            window.location.hash = `#/student/workspace?course=${courseId}`;
            return;
        }
        setEnrolling(courseId);
        try {
            // Add course to user's enrolledCourses array
            await db.collection('users').doc(userDoc.id).update({
                enrolledCourses: arrayUnion(courseId),
            });
            // Create enrollment document
            await db.collection('enrollments').add({
                studentId: userDoc.id,
                courseId,
                enrolledAt: serverTimestamp(),
                progress: 0,
                completedLessons: [],
                lastAccessedAt: serverTimestamp(),
            });
            // Increment course enrollment count
            await db.collection('courses').doc(courseId).update({
                enrollmentCount: increment(1),
            });
            setMsg('ลงทะเบียนสำเร็จ!');
            setTimeout(() => {
                window.location.hash = `#/student/workspace?course=${courseId}`;
            }, 1000);
        } catch (err) {
            setMsg('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setEnrolling(null);
        }
    };

    const diffColor = { ง่าย: 'green', ปานกลาง: 'yellow', ยาก: 'red' };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding LMS" subtitle="ค้นหารายวิชา" />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">📚 รายวิชาที่เปิดสอน</h2>
                    {msg && <span className="text-green-600 text-sm font-medium">{msg}</span>}
                </div>

                {loading ? <Spinner /> : allCourses.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-5xl mb-3">📭</div>
                        <p className="text-lg">ยังไม่มีรายวิชาที่เปิดสอน</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allCourses.map(course => {
                            const lang = LANGUAGES[course.language];
                            const enrolled = isEnrolled(course.id);
                            return (
                                <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Course card top strip */}
                                    <div className="h-2" style={{ background: lang?.color || '#6b7280' }}></div>
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="text-3xl">{lang?.icon || '📚'}</div>
                                            {enrolled && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                                    ลงทะเบียนแล้ว
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-lg mb-1 leading-snug">{course.title}</h3>
                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                                            <span className="bg-gray-100 px-2 py-1 rounded">{lang?.name}</span>
                                            <span>👥 {course.enrollmentCount || 0} คน</span>
                                        </div>
                                        <button
                                            onClick={() => handleEnroll(course.id)}
                                            disabled={enrolling === course.id}
                                            className={`w-full py-2 rounded-lg font-medium text-sm transition-all
                                                ${enrolled
                                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                                    : 'bg-blue-500 text-white hover:bg-blue-600'}
                                                disabled:opacity-50`}
                                        >
                                            {enrolling === course.id ? 'กำลังลงทะเบียน...' : enrolled ? 'เข้าเรียน →' : 'ลงทะเบียน'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

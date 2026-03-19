// js/pages/student/StudentDashboard.js - Student home dashboard

const StudentDashboard = () => {
    const { userDoc } = useAuth();
    const [courses, setCourses] = React.useState([]);
    const [recentSubmissions, setRecentSubmissions] = React.useState([]);
    const [grades, setGrades] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!userDoc) return;
        loadData();
    }, [userDoc]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load enrolled courses
            const enrolledIds = userDoc.enrolledCourses || [];
            if (enrolledIds.length > 0) {
                const courseSnaps = await Promise.all(
                    enrolledIds.map(id => db.collection('courses').doc(id).get())
                );
                setCourses(courseSnaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() })));
            }

            // Load recent submissions (last 5)
            const subSnap = await db.collection('submissions')
                .where('studentId', '==', userDoc.id)
                .orderBy('submittedAt', 'desc')
                .limit(5)
                .get();
            setRecentSubmissions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Load grades
            const gradeSnap = await db.collection('grades')
                .where('studentId', '==', userDoc.id)
                .get();
            setGrades(gradeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const avgScore = grades.length > 0
        ? Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length)
        : 0;

    const totalAssignments = grades.length;
    const passed = grades.filter(g => g.score >= 60).length;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI Coding Platform" subtitle="Student Portal" />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Welcome */}
                <div className="rounded-2xl p-6 mb-8" style={{
                    background: 'linear-gradient(135deg, #FFF0F5 0%, #FFD1DC 100%)',
                    border: '1px solid #FFB6C8',
                    boxShadow: '0 2px 12px rgba(236,64,122,.08)',
                }}>
                    <h2 className="text-2xl font-bold mb-1" style={{ color: '#AD1457' }}>สวัสดี, {userDoc?.displayName} 👋</h2>
                    <p style={{ color: '#C2185B', fontSize: '14px' }}>พร้อมเรียนรู้การเขียนโปรแกรมวันนี้แล้วหรือยัง?</p>
                </div>

                {loading ? <Spinner text="กำลังโหลดข้อมูล..." /> : (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'รายวิชาที่ลงทะเบียน', value: courses.length, icon: '📚', color: 'blue' },
                                { label: 'งานที่ส่งแล้ว', value: totalAssignments, icon: '📋', color: 'green' },
                                { label: 'ผ่านแล้ว', value: passed, icon: '✅', color: 'emerald' },
                                { label: 'คะแนนเฉลี่ย', value: `${avgScore}%`, icon: '⭐', color: 'yellow' },
                            ].map(stat => (
                                <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                    <div className="text-3xl mb-2">{stat.icon}</div>
                                    <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                                    <div className="text-sm text-gray-500">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Enrolled Courses */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">📚 รายวิชาของฉัน</h3>
                                    <a href="#/student/courses" style={{ color: '#EC407A', fontSize: '14px' }} className="hover:underline">ดูทั้งหมด</a>
                                </div>
                                {courses.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <div className="text-4xl mb-2">📖</div>
                                        <p>ยังไม่ได้ลงทะเบียนรายวิชาใด</p>
                                        <a href="#/student/courses" className="text-blue-500 text-sm hover:underline mt-2 block">
                                            ค้นหารายวิชา →
                                        </a>
                                    </div>
                                ) : courses.map(course => (
                                    <div key={course.id}
                                        className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 cursor-pointer"
                                        onClick={() => { window.location.hash = `#/student/workspace?course=${course.id}`; }}>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                                                style={{ background: LANGUAGES[course.language]?.color + '22' }}>
                                                {LANGUAGES[course.language]?.icon || '📚'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm">{course.title}</p>
                                                <p className="text-xs text-gray-400">{LANGUAGES[course.language]?.name}</p>
                                            </div>
                                        </div>
                                        <span className="text-gray-400 text-sm">→</span>
                                    </div>
                                ))}
                            </div>

                            {/* Recent Submissions */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">📋 การส่งล่าสุด</h3>
                                    <a href="#/student/history" style={{ color: '#EC407A', fontSize: '14px' }} className="hover:underline">ดูทั้งหมด</a>
                                </div>
                                {recentSubmissions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <div className="text-4xl mb-2">📝</div>
                                        <p>ยังไม่มีประวัติการส่งงาน</p>
                                    </div>
                                ) : recentSubmissions.map(sub => {
                                    const statusInfo = STATUS_LABELS[sub.status] || STATUS_LABELS.pending;
                                    return (
                                        <div key={sub.id} className="py-3 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <span>{statusInfo.icon}</span>
                                                    <span className="text-sm text-gray-700">{sub.passedTests}/{sub.totalTests} ผ่าน</span>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full bg-${statusInfo.color}-100 text-${statusInfo.color}-700`}>
                                                    {sub.score}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {sub.submittedAt?.toDate
                                                    ? sub.submittedAt.toDate().toLocaleDateString('th-TH')
                                                    : 'เมื่อกี้'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

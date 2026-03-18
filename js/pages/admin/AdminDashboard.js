// js/pages/admin/AdminDashboard.js

const AdminDashboard = () => {
    const { userDoc } = useAuth();
    const [stats, setStats] = React.useState({
        totalStudents: 0, totalTeachers: 0, totalCourses: 0,
        todaySubmissions: 0, pendingTeachers: 0,
    });
    const [pendingTeachers, setPendingTeachers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const [studentSnap, teacherSnap, courseSnap, pendingSnap] = await Promise.all([
                db.collection('users').where('role', '==', 'student').get(),
                db.collection('users').where('role', '==', 'teacher').get(),
                db.collection('courses').get(),
                db.collection('users').where('role', '==', 'teacher').where('approvedByAdmin', '==', false).get(),
            ]);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todaySnap = await db.collection('submissions')
                .where('submittedAt', '>=', firebase.firestore.Timestamp.fromDate(today))
                .get();

            setStats({
                totalStudents: studentSnap.size,
                totalTeachers: teacherSnap.size,
                totalCourses: courseSnap.size,
                todaySubmissions: todaySnap.size,
                pendingTeachers: pendingSnap.size,
            });

            setPendingTeachers(pendingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const approveTeacher = async (uid) => {
        await db.collection('users').doc(uid).update({ approvedByAdmin: true });
        setPendingTeachers(pt => pt.filter(t => t.id !== uid));
        setStats(s => ({ ...s, pendingTeachers: s.pendingTeachers - 1 }));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding LMS" subtitle="Admin Dashboard" />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white mb-8 shadow-lg">
                    <h2 className="text-2xl font-bold mb-1">แดชบอร์ดผู้ดูแลระบบ 🔐</h2>
                    <p className="text-purple-100">ภาพรวมทั้งระบบ</p>
                </div>

                {loading ? <Spinner /> : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                            {[
                                { label: 'นักเรียน', value: stats.totalStudents, icon: '🎓', color: 'blue' },
                                { label: 'ครูผู้สอน', value: stats.totalTeachers, icon: '👨‍🏫', color: 'green' },
                                { label: 'รายวิชา', value: stats.totalCourses, icon: '📚', color: 'purple' },
                                { label: 'ส่งงานวันนี้', value: stats.todaySubmissions, icon: '📋', color: 'orange' },
                                { label: 'รออนุมัติ', value: stats.pendingTeachers, icon: '⏳', color: 'red' },
                            ].map(s => (
                                <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                    <div className="text-3xl mb-2">{s.icon}</div>
                                    <div className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</div>
                                    <div className="text-sm text-gray-500">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-8">
                            {[
                                { href: '#/admin/users', label: 'จัดการผู้ใช้', icon: '👥', desc: 'อนุมัติครู เปลี่ยนสิทธิ์', color: 'from-blue-500 to-blue-600' },
                                { href: '#/admin/settings', label: 'ตั้งค่าระบบ', icon: '⚙️', desc: 'API Keys & Grader settings', color: 'from-purple-500 to-purple-600' },
                                { href: '#/teacher/analytics', label: 'วิเคราะห์ข้อมูล', icon: '📊', desc: 'สถิติการส่งงาน', color: 'from-orange-500 to-orange-600' },
                            ].map(link => (
                                <a key={link.href} href={link.href}
                                    className={`bg-gradient-to-r ${link.color} text-white rounded-xl p-5 shadow-sm hover:opacity-90 transition-opacity`}>
                                    <div className="text-3xl mb-2">{link.icon}</div>
                                    <div className="font-bold text-lg">{link.label}</div>
                                    <div className="text-sm opacity-80 mt-1">{link.desc}</div>
                                </a>
                            ))}
                        </div>

                        {/* Pending Teacher Approvals */}
                        {pendingTeachers.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                                <h3 className="font-bold text-yellow-800 text-lg mb-4">
                                    ⚠️ ครูรออนุมัติ ({pendingTeachers.length} คน)
                                </h3>
                                <div className="space-y-3">
                                    {pendingTeachers.map(t => (
                                        <div key={t.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800">{t.displayName}</p>
                                                <p className="text-sm text-gray-500">{t.email}</p>
                                            </div>
                                            <button onClick={() => approveTeacher(t.id)}
                                                className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                                                ✓ อนุมัติ
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

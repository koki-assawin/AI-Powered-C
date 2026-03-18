// js/pages/teacher/StudentAnalytics.js - Student performance analytics

const StudentAnalytics = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const courseId = params.get('course');

    const [courses, setCourses] = React.useState([]);
    const [selectedCourse, setSelectedCourse] = React.useState(courseId || '');
    const [assignments, setAssignments] = React.useState([]);
    const [submissions, setSubmissions] = React.useState([]);
    const [enrollments, setEnrollments] = React.useState([]);
    const [students, setStudents] = React.useState({});
    const [loading, setLoading] = React.useState(false);
    const [selectedAssignment, setSelectedAssignment] = React.useState('');

    React.useEffect(() => { loadCourses(); }, [userDoc]);
    React.useEffect(() => { if (selectedCourse) loadAnalytics(); }, [selectedCourse]);

    const loadCourses = async () => {
        const snap = await db.collection('courses').where('teacherId', '==', userDoc.id).get();
        setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const [assignSnap, subSnap, enrollSnap] = await Promise.all([
                db.collection('assignments').where('courseId', '==', selectedCourse).get(),
                db.collection('submissions').where('courseId', '==', selectedCourse).get(),
                db.collection('enrollments').where('courseId', '==', selectedCourse).get(),
            ]);

            const assigns = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAssignments(assigns);
            setSubmissions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Load student names
            const studentIds = [...new Set(enrollSnap.docs.map(d => d.data().studentId))];
            const studentSnaps = await Promise.all(studentIds.map(id => db.collection('users').doc(id).get()));
            const map = {};
            studentSnaps.forEach(s => { if (s.exists) map[s.id] = s.data(); });
            setStudents(map);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Per-assignment stats
    const getAssignmentStats = (assignId) => {
        const subs = submissions.filter(s => s.assignmentId === assignId);
        if (subs.length === 0) return { attempts: 0, passRate: 0, avgScore: 0 };
        const passed = subs.filter(s => s.status === 'accepted').length;
        return {
            attempts: subs.length,
            passRate: Math.round((passed / subs.length) * 100),
            avgScore: Math.round(subs.reduce((sum, s) => sum + (s.score || 0), 0) / subs.length),
            uniqueStudents: new Set(subs.map(s => s.studentId)).size,
        };
    };

    // Per-student stats for selected assignment
    const getStudentResults = () => {
        if (!selectedAssignment) return [];
        const subs = submissions.filter(s => s.assignmentId === selectedAssignment);
        const byStudent = {};
        subs.forEach(s => {
            if (!byStudent[s.studentId] || s.score > byStudent[s.studentId].score) {
                byStudent[s.studentId] = s;
            }
        });
        return Object.values(byStudent).sort((a, b) => b.score - a.score);
    };

    const studentResults = getStudentResults();
    const course = courses.find(c => c.id === selectedCourse);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding LMS" subtitle="วิเคราะห์นักเรียน" />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 วิเคราะห์ผลการเรียน</h2>

                {/* Course Selector */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">เลือกรายวิชา:</label>
                    <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- เลือกรายวิชา --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                {loading ? <Spinner /> : !selectedCourse ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-5xl mb-3">📊</div>
                        <p>เลือกรายวิชาเพื่อดูสถิติ</p>
                    </div>
                ) : (
                    <>
                        {/* Overview */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {[
                                { label: 'นักเรียนลงทะเบียน', value: enrollments.length, icon: '👥' },
                                { label: 'โจทย์ทั้งหมด', value: assignments.length, icon: '📝' },
                                { label: 'การส่งทั้งหมด', value: submissions.length, icon: '📋' },
                                {
                                    label: 'อัตราผ่าน', icon: '✅',
                                    value: submissions.length
                                        ? `${Math.round(submissions.filter(s => s.status === 'accepted').length / submissions.length * 100)}%`
                                        : '0%'
                                },
                            ].map(s => (
                                <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                    <div className="text-2xl mb-1">{s.icon}</div>
                                    <div className="text-xl font-bold text-gray-800">{s.value}</div>
                                    <div className="text-xs text-gray-500">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Assignment Pass Rate Table */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
                            <h3 className="font-bold text-gray-800 mb-4">📝 สถิติแต่ละโจทย์</h3>
                            {assignments.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีโจทย์ในรายวิชานี้</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100">
                                                <th className="text-left py-3 px-2 text-gray-500 font-medium">โจทย์</th>
                                                <th className="text-center py-3 px-2 text-gray-500 font-medium">นักเรียนที่ลอง</th>
                                                <th className="text-center py-3 px-2 text-gray-500 font-medium">ครั้งที่ส่ง</th>
                                                <th className="text-center py-3 px-2 text-gray-500 font-medium">อัตราผ่าน</th>
                                                <th className="text-center py-3 px-2 text-gray-500 font-medium">คะแนนเฉลี่ย</th>
                                                <th className="text-center py-3 px-2 text-gray-500 font-medium">ดูรายละเอียด</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignments.map(a => {
                                                const stats = getAssignmentStats(a.id);
                                                return (
                                                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                        <td className="py-3 px-2">
                                                            <div className="font-medium text-gray-800">{a.title}</div>
                                                            <div className="text-xs text-gray-400">{a.difficulty}</div>
                                                        </td>
                                                        <td className="text-center py-3 px-2 text-gray-600">{stats.uniqueStudents || 0}</td>
                                                        <td className="text-center py-3 px-2 text-gray-600">{stats.attempts}</td>
                                                        <td className="text-center py-3 px-2">
                                                            <span className={`font-bold ${stats.passRate >= 70 ? 'text-green-600' : stats.passRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                {stats.passRate}%
                                                            </span>
                                                        </td>
                                                        <td className="text-center py-3 px-2">
                                                            <span className={`font-bold ${stats.avgScore >= 70 ? 'text-green-600' : stats.avgScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                {stats.avgScore}%
                                                            </span>
                                                        </td>
                                                        <td className="text-center py-3 px-2">
                                                            <button onClick={() => setSelectedAssignment(a.id)}
                                                                className="text-blue-500 text-xs hover:underline">ดูนักเรียน</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Per-student view for selected assignment */}
                        {selectedAssignment && (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-800">
                                        👥 ผลนักเรียน: {assignments.find(a => a.id === selectedAssignment)?.title}
                                    </h3>
                                    <button onClick={() => setSelectedAssignment('')} className="text-gray-400 hover:text-gray-600 text-sm">✕ ปิด</button>
                                </div>
                                {studentResults.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีนักเรียนส่งงานนี้</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100">
                                                    <th className="text-left py-2 px-2 text-gray-500 font-medium">นักเรียน</th>
                                                    <th className="text-center py-2 px-2 text-gray-500 font-medium">สถานะ</th>
                                                    <th className="text-center py-2 px-2 text-gray-500 font-medium">Pass Tests</th>
                                                    <th className="text-center py-2 px-2 text-gray-500 font-medium">คะแนนสูงสุด</th>
                                                    <th className="text-center py-2 px-2 text-gray-500 font-medium">AI Score</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentResults.map(sub => {
                                                    const student = students[sub.studentId];
                                                    const info = STATUS_LABELS[sub.status] || STATUS_LABELS.pending;
                                                    return (
                                                        <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                            <td className="py-2 px-2 font-medium text-gray-800">
                                                                {student?.displayName || sub.studentId.slice(0, 8)}
                                                            </td>
                                                            <td className="text-center py-2 px-2">
                                                                <span>{info.icon} {info.text}</span>
                                                            </td>
                                                            <td className="text-center py-2 px-2 text-gray-600">
                                                                {sub.passedTests}/{sub.totalTests}
                                                            </td>
                                                            <td className="text-center py-2 px-2 font-bold" style={{
                                                                color: sub.score >= 80 ? '#16a34a' : sub.score >= 50 ? '#d97706' : '#dc2626'
                                                            }}>
                                                                {sub.score}%
                                                            </td>
                                                            <td className="text-center py-2 px-2 text-purple-600">
                                                                {sub.aiScore != null ? `${sub.aiScore}%` : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

// js/pages/teacher/StudentAnalytics.js - Teacher Analytics Dashboard

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
    const chartRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    React.useEffect(() => { loadCourses(); }, [userDoc]);
    React.useEffect(() => { if (selectedCourse) loadAnalytics(); }, [selectedCourse]);
    React.useEffect(() => {
        if (assignments.length > 0 && submissions.length >= 0) renderChart();
        return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
    }, [assignments, submissions]);

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
            const studentIds = [...new Set(enrollSnap.docs.map(d => d.data().studentId))];
            const snaps = await Promise.all(studentIds.map(id => db.collection('users').doc(id).get()));
            const map = {};
            snaps.forEach(s => { if (s.exists) map[s.id] = s.data(); });
            setStudents(map);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const getAssignmentStats = (assignId) => {
        const subs = submissions.filter(s => s.assignmentId === assignId);
        if (subs.length === 0) return { attempts: 0, passRate: 0, avgScore: 0, uniqueStudents: 0, studentAttempts: {} };
        const passed = subs.filter(s => s.status === 'accepted').length;
        const byStudent = {};
        subs.forEach(s => { byStudent[s.studentId] = (byStudent[s.studentId] || 0) + 1; });
        return {
            attempts: subs.length,
            passRate: Math.round((passed / subs.length) * 100),
            avgScore: Math.round(subs.reduce((sum, s) => sum + (s.score || 0), 0) / subs.length),
            uniqueStudents: new Set(subs.map(s => s.studentId)).size,
            studentAttempts: byStudent,
        };
    };

    const renderChart = () => {
        if (!chartRef.current || assignments.length === 0) return;
        if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }

        const labels = assignments.map(a => a.title.length > 14 ? a.title.slice(0, 14) + '…' : a.title);
        const passRates = assignments.map(a => getAssignmentStats(a.id).passRate);
        const avgScores = assignments.map(a => getAssignmentStats(a.id).avgScore);

        chartInstance.current = new Chart(chartRef.current, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'อัตราผ่าน (%)',
                        data: passRates,
                        backgroundColor: passRates.map(v => v >= 70 ? 'rgba(34,197,94,.7)' : v >= 40 ? 'rgba(234,179,8,.7)' : 'rgba(239,68,68,.7)'),
                        borderRadius: 6,
                    },
                    {
                        label: 'คะแนนเฉลี่ย (%)',
                        data: avgScores,
                        backgroundColor: 'rgba(236,72,153,.4)',
                        borderColor: '#ec4899',
                        borderWidth: 1.5,
                        borderRadius: 6,
                        type: 'line',
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: '#ec4899',
                    }
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top', labels: { font: { family: 'Prompt', size: 12 } } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}%` } },
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
                    x: { ticks: { font: { size: 11 } } },
                },
            },
        });
    };

    const getStudentResults = () => {
        if (!selectedAssignment) return [];
        const subs = submissions.filter(s => s.assignmentId === selectedAssignment);
        const byStudent = {};
        subs.forEach(s => {
            if (!byStudent[s.studentId] || s.score > byStudent[s.studentId].score)
                byStudent[s.studentId] = { ...s, totalAttempts: (byStudent[s.studentId]?.totalAttempts || 0) + 1 };
        });
        // fix attempt count
        Object.keys(byStudent).forEach(sid => {
            byStudent[sid].totalAttempts = subs.filter(s => s.studentId === sid).length;
        });
        return Object.values(byStudent).sort((a, b) => b.score - a.score);
    };

    // Most problematic assignments (pass rate < 50%, sorted asc)
    const problematicAssignments = assignments
        .map(a => ({ ...a, stats: getAssignmentStats(a.id) }))
        .filter(a => a.stats.attempts > 0 && a.stats.passRate < 50)
        .sort((a, b) => a.stats.passRate - b.stats.passRate)
        .slice(0, 5);

    const studentResults = getStudentResults();
    const overallPassRate = submissions.length
        ? Math.round(submissions.filter(s => s.status === 'accepted').length / submissions.length * 100) : 0;

    return (
        <div className="min-h-screen" style={{ background: '#fdf2f8', fontFamily: "'Prompt', sans-serif" }}>
            <Navbar title="Analytics Dashboard" subtitle="วิเคราะห์ผลการเรียน" />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#be185d' }}>
                    📊 Teacher Analytics Dashboard
                </h2>

                {/* Course Selector */}
                <div className="k-card p-4 mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2">🏫 เลือกรายวิชา:</label>
                    <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                        className="k-input" style={{ maxWidth: '360px' }}>
                        <option value="">-- เลือกรายวิชา --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                {loading ? <Spinner /> : !selectedCourse ? (
                    <div className="text-center py-20 text-gray-400">
                        <div className="text-6xl mb-4">📊</div>
                        <p>เลือกรายวิชาเพื่อดูสถิติ</p>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {[
                                { label: 'นักเรียนลงทะเบียน', value: enrollments.length, icon: '👥', color: '#ec4899' },
                                { label: 'โจทย์ทั้งหมด', value: assignments.length, icon: '📝', color: '#f472b6' },
                                { label: 'การส่งทั้งหมด', value: submissions.length, icon: '📋', color: '#be185d' },
                                { label: 'อัตราผ่านรวม', value: `${overallPassRate}%`, icon: '✅', color: overallPassRate >= 70 ? '#16a34a' : overallPassRate >= 40 ? '#d97706' : '#dc2626' },
                            ].map(s => (
                                <div key={s.label} className="k-card p-5">
                                    <div className="text-2xl mb-2">{s.icon}</div>
                                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Bar Chart */}
                        {assignments.length > 0 && (
                            <div className="k-card p-6 mb-6">
                                <h3 className="font-bold text-gray-700 mb-4">📈 อัตราผ่านและคะแนนเฉลี่ยต่อโจทย์</h3>
                                <canvas ref={chartRef} height={assignments.length > 8 ? 120 : 90}></canvas>
                            </div>
                        )}

                        {/* Problematic Assignments */}
                        {problematicAssignments.length > 0 && (
                            <div className="k-card p-6 mb-6" style={{ borderLeft: '4px solid #fca5a5' }}>
                                <h3 className="font-bold mb-4" style={{ color: '#dc2626' }}>
                                    ⚠️ โจทย์ที่นักเรียนติดขัดมากที่สุด (ผ่านน้อยกว่า 50%)
                                </h3>
                                <div className="space-y-3">
                                    {problematicAssignments.map(a => (
                                        <div key={a.id} className="flex items-center justify-between p-3 rounded-xl"
                                            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                            <div>
                                                <div className="font-semibold text-gray-800 text-sm">{a.title}</div>
                                                <div className="text-xs text-gray-500">
                                                    {a.stats.uniqueStudents} นักเรียน · {a.stats.attempts} ครั้งที่ส่ง
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-red-600">{a.stats.passRate}%</div>
                                                <div className="text-xs text-gray-400">อัตราผ่าน</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Assignment Table */}
                        <div className="k-card p-6 mb-6">
                            <h3 className="font-bold text-gray-700 mb-4">📝 สถิติแต่ละโจทย์</h3>
                            {assignments.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-6">ยังไม่มีโจทย์ในรายวิชานี้</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #fce7f3' }}>
                                                {['โจทย์', 'ประเภท', 'นักเรียนที่ลอง', 'ครั้งส่ง', 'อัตราผ่าน', 'คะแนนเฉลี่ย', ''].map(h => (
                                                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignments.map(a => {
                                                const stats = getAssignmentStats(a.id);
                                                return (
                                                    <tr key={a.id} style={{ borderBottom: '1px solid #fce7f3' }}
                                                        className="hover:bg-pink-50 transition-colors">
                                                        <td className="py-3 px-2">
                                                            <div className="font-medium text-gray-800">{a.title}</div>
                                                            <div className="text-xs text-gray-400">{a.difficulty}</div>
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            {a.assignmentType === 'exam'
                                                                ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🏆 ข้อสอบ</span>
                                                                : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">📝 ฝึกหัด</span>}
                                                        </td>
                                                        <td className="py-3 px-2 text-center text-gray-600">{stats.uniqueStudents}</td>
                                                        <td className="py-3 px-2 text-center text-gray-600">{stats.attempts}</td>
                                                        <td className="py-3 px-2 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div style={{
                                                                    width: `${stats.passRate}%`, height: '6px', borderRadius: '3px', minWidth: '4px',
                                                                    background: stats.passRate >= 70 ? '#22c55e' : stats.passRate >= 40 ? '#eab308' : '#ef4444',
                                                                    maxWidth: '60px',
                                                                }} />
                                                                <span className={`font-bold text-sm ${stats.passRate >= 70 ? 'text-green-600' : stats.passRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                    {stats.passRate}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-2 text-center font-bold"
                                                            style={{ color: stats.avgScore >= 70 ? '#16a34a' : stats.avgScore >= 40 ? '#d97706' : '#dc2626' }}>
                                                            {stats.avgScore}%
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <button onClick={() => setSelectedAssignment(a.id === selectedAssignment ? '' : a.id)}
                                                                className="text-xs px-3 py-1 rounded-lg font-medium transition-all"
                                                                style={{ background: a.id === selectedAssignment ? '#ec4899' : '#fce7f3', color: a.id === selectedAssignment ? 'white' : '#be185d' }}>
                                                                {a.id === selectedAssignment ? 'ปิด' : 'ดูนักเรียน'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Per-student detail */}
                        {selectedAssignment && (
                            <div className="k-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-700">
                                        👥 ผลนักเรียน: {assignments.find(a => a.id === selectedAssignment)?.title}
                                    </h3>
                                    <button onClick={() => setSelectedAssignment('')}
                                        className="text-gray-400 hover:text-gray-600 text-sm px-3 py-1 rounded-lg hover:bg-gray-100">✕ ปิด</button>
                                </div>
                                {studentResults.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-6">ยังไม่มีนักเรียนส่งงานนี้</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid #fce7f3' }}>
                                                    {['#', 'นักเรียน', 'สถานะ', 'ผ่าน Test', 'คะแนนสูงสุด', 'จำนวนครั้ง', 'AI Score'].map(h => (
                                                        <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentResults.map((sub, idx) => {
                                                    const student = students[sub.studentId];
                                                    const info = STATUS_LABELS[sub.status] || STATUS_LABELS.pending;
                                                    return (
                                                        <tr key={sub.id} style={{ borderBottom: '1px solid #fce7f3' }} className="hover:bg-pink-50">
                                                            <td className="py-2 px-2 text-gray-400 text-xs">{idx + 1}</td>
                                                            <td className="py-2 px-2 font-medium text-gray-800">
                                                                {student?.displayName || sub.studentId.slice(0, 8)}
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <span className="text-xs">{info.icon} {info.text}</span>
                                                            </td>
                                                            <td className="py-2 px-2 text-center text-gray-600">
                                                                {sub.passedTests}/{sub.totalTests}
                                                            </td>
                                                            <td className="py-2 px-2 text-center font-bold" style={{
                                                                color: sub.score >= 80 ? '#16a34a' : sub.score >= 50 ? '#d97706' : '#dc2626'
                                                            }}>
                                                                {sub.score}%
                                                            </td>
                                                            <td className="py-2 px-2 text-center">
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${sub.totalAttempts >= 5 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                    {sub.totalAttempts} ครั้ง
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-2 text-center" style={{ color: '#ec4899' }}>
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

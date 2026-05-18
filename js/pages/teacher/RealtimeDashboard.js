// js/pages/teacher/RealtimeDashboard.js - v1.0 Classroom Real-time Monitor

const RealtimeDashboard = () => {
    const { user } = useAuth();
    const [courses, setCourses] = React.useState([]);
    const [courseId, setCourseId] = React.useState('');
    const [students, setStudents] = React.useState([]);
    const [alerts, setAlerts] = React.useState([]);
    const [subs, setSubs] = React.useState([]);
    const [assignments, setAssignments] = React.useState([]);
    const [lastUpdate, setLastUpdate] = React.useState(null);
    const chartRef = React.useRef(null);
    const chartInst = React.useRef(null);

    // Load courses once
    React.useEffect(() => {
        db.collection('courses').get().then(snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCourses(list);
            if (list.length) setCourseId(list[0].id);
        }).catch(console.error);
    }, []);

    // Listeners when course changes
    React.useEffect(() => {
        if (!courseId) return;
        const unsubs = [];

        // Enrolled students
        db.collection('enrollments').where('courseId', '==', courseId).get()
            .then(async snap => {
                const uids = [...new Set(snap.docs.map(d => d.data().studentId))];
                if (!uids.length) { setStudents([]); return; }
                const chunks = [];
                for (let i = 0; i < uids.length; i += 10) chunks.push(uids.slice(i, i + 10));
                const results = await Promise.all(
                    chunks.map(ch =>
                        db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', ch).get()
                    )
                );
                setStudents(results.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))));
            }).catch(console.error);

        // Assignments for this course
        db.collection('assignments_v2').where('courseId', '==', courseId).get()
            .then(snap => setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
            .catch(console.error);

        // Real-time: submissions_v2
        const unsubSubs = db.collection('submissions_v2')
            .where('courseId', '==', courseId)
            .orderBy('submittedAt', 'desc')
            .onSnapshot(snap => {
                setSubs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLastUpdate(new Date());
            }, console.error);
        unsubs.push(unsubSubs);

        // Real-time: runtimeStatus (infinite loop alerts)
        const unsubRT = db.collection('runtimeStatus')
            .where('courseId', '==', courseId)
            .onSnapshot(snap => {
                setAlerts(
                    snap.docs.map(d => ({ id: d.id, ...d.data() }))
                        .filter(d => d.isInfiniteLoopDetected || (d.consecutiveErrors || 0) >= 5)
                );
                setLastUpdate(new Date());
            }, console.error);
        unsubs.push(unsubRT);

        return () => unsubs.forEach(fn => fn());
    }, [courseId]);

    // Rebuild bar chart when data changes
    React.useEffect(() => {
        if (!chartRef.current || !students.length) return;

        const preSubs = subs.filter(s => s.activityType === 'pre_post_test' && s.prePostMeta?.testRole === 'pre');
        const postSubs = subs.filter(s => s.activityType === 'pre_post_test' && s.prePostMeta?.testRole === 'post');

        if (!preSubs.length && !postSubs.length) return;

        if (chartInst.current) chartInst.current.destroy();

        const labels = students.map(s => (s.displayName || s.email || '?').split(' ')[0]);
        const preData = students.map(s => {
            const ss = preSubs.filter(x => x.studentId === s.id);
            return ss.length ? Math.round(ss.reduce((a, b) => a + (b.score || 0), 0) / ss.length) : null;
        });
        const postData = students.map(s => {
            const ss = postSubs.filter(x => x.studentId === s.id);
            return ss.length ? Math.round(ss.reduce((a, b) => a + (b.score || 0), 0) / ss.length) : null;
        });

        chartInst.current = new Chart(chartRef.current.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Pre-test', data: preData, backgroundColor: 'rgba(59,130,246,0.65)', borderColor: '#3b82f6', borderWidth: 1.5, borderRadius: 4 },
                    { label: 'Post-test', data: postData, backgroundColor: 'rgba(16,185,129,0.65)', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 4 },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { size: 12 } } },
                    title: { display: true, text: 'คะแนนเปรียบเทียบ Pre-test vs Post-test รายบุคคล', color: '#c4b5fd', font: { size: 13, weight: 'bold' } },
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { color: '#6b7280', stepSize: 20 }, grid: { color: '#1f2937' } },
                    x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { display: false } },
                },
            },
        });

        return () => { if (chartInst.current) chartInst.current.destroy(); };
    }, [subs, students]);

    // Helpers
    const stuSubs = (uid) => subs.filter(s => s.studentId === uid);
    const autopsyStatus = (uid) => {
        const s = stuSubs(uid).find(x => x.activityType === 'autopsy');
        return s ? (s.isPassed ? 'pass' : 'fail') : 'none';
    };
    const quizStatus = (uid) => stuSubs(uid).some(x => x.activityType === 'quiz_blitz') ? 'done' : 'none';
    const codingProg = (uid) => {
        const cs = stuSubs(uid).filter(x => x.activityType === 'coding');
        if (!cs.length) return null;
        const best = cs.reduce((b, s) => (s.passedTests || 0) >= (b.passedTests || 0) ? s : b, cs[0]);
        return { p: best.passedTests || 0, t: best.totalTests || 0 };
    };
    const avgScore = (uid) => {
        const ss = stuSubs(uid);
        return ss.length ? Math.round(ss.reduce((a, b) => a + (b.score || 0), 0) / ss.length) : null;
    };

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#080814 0%,#0f0f2e 100%)' }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="📡 Classroom Monitor" />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h2 className="text-3xl font-black" style={{ background: 'linear-gradient(90deg,#ef4444,#f97316,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            📡 REAL-TIME DASHBOARD
                        </h2>
                        <p className="text-gray-600 text-xs mt-1">
                            {lastUpdate ? `อัพเดตล่าสุด ${lastUpdate.toLocaleTimeString('th-TH')}` : 'รอรับข้อมูล...'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-700/50 bg-green-900/20">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-green-400 text-xs font-bold">LIVE onSnapshot</span>
                    </div>
                </div>

                {/* Course Selector */}
                <div className="bg-gray-900/80 border border-purple-800/40 rounded-xl p-4 mb-6">
                    <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">📚 รายวิชา</label>
                    <select value={courseId} onChange={e => setCourseId(e.target.value)}
                        className="w-full bg-gray-950 border border-purple-700/50 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'นักเรียนทั้งหมด', val: students.length, icon: '👥', color: '#8b5cf6' },
                        { label: 'ส่งงานแล้ว', val: new Set(subs.map(s => s.studentId)).size, icon: '📨', color: '#06b6d4' },
                        { label: 'แจ้งเตือนฉุกเฉิน', val: alerts.length, icon: '🚨', color: alerts.length > 0 ? '#ef4444' : '#10b981' },
                        { label: 'Submissions', val: subs.length, icon: '📊', color: '#f59e0b' },
                    ].map(s => (
                        <div key={s.label} className="bg-gray-900/80 border rounded-xl p-4 text-center"
                            style={{ borderColor: s.color + '44', boxShadow: `0 0 15px ${s.color}22` }}>
                            <div className="text-2xl mb-1">{s.icon}</div>
                            <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                            <div className="text-gray-500 text-xs">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Emergency Alerts ── */}
                <div className="mb-6">
                    <h3 className="font-black text-lg mb-3 flex items-center gap-2" style={{ color: alerts.length ? '#ef4444' : '#10b981' }}>
                        {alerts.length > 0 ? (
                            <><span className="relative flex w-3 h-3"><span className="animate-ping absolute w-full h-full rounded-full bg-red-500 opacity-75"></span><span className="w-3 h-3 rounded-full bg-red-500"></span></span> 🚨 EMERGENCY ALERTS ({alerts.length})</>
                        ) : (
                            <><span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span> ✅ ไม่มีการแจ้งเตือนฉุกเฉิน</>
                        )}
                    </h3>

                    {alerts.length > 0 && (
                        <div className="space-y-2">
                            {alerts.map(a => (
                                <div key={a.id} className="rounded-xl p-4 border-2 border-red-500 flex items-start justify-between gap-4"
                                    style={{ background: 'rgba(239,68,68,0.08)', boxShadow: '0 0 25px rgba(239,68,68,0.35)', animation: 'pulse 1.5s ease-in-out infinite' }}>
                                    <div className="flex items-start gap-3">
                                        <span className="text-3xl shrink-0">{a.isInfiniteLoopDetected ? '♾️' : '💥'}</span>
                                        <div>
                                            <p className="text-red-200 font-black text-sm">
                                                ⚠️ Warning: {a.studentName || a.studentId} {a.isInfiniteLoopDetected
                                                    ? 'กำลังเผชิญหน้ากับลูปอนันต์!'
                                                    : `พบ Runtime Error ถี่ ${a.consecutiveErrors} ครั้งติดกัน!`}
                                            </p>
                                            <p className="text-red-500 text-xs mt-1">
                                                {a.assignmentTitle || 'กิจกรรม'} •{' '}
                                                {a.lastActivity?.toDate ? a.lastActivity.toDate().toLocaleTimeString('th-TH') : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-xs font-bold text-red-400 px-2 py-1 border border-red-700/60 rounded-lg bg-red-900/30 whitespace-nowrap">
                                        {a.isInfiniteLoopDetected ? '♾️ LOOP' : '💥 ERRORS'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Pre/Post Bar Chart ── */}
                <div className="bg-gray-900/80 border border-purple-800/40 rounded-xl p-5 mb-6">
                    <h3 className="text-purple-300 font-black mb-4">📊 Pre-test vs Post-test เปรียบเทียบรายบุคคล (สำหรับฉายโปรเจคเตอร์)</h3>
                    {subs.filter(s => s.activityType === 'pre_post_test').length === 0 ? (
                        <div className="text-center py-12 text-gray-600">
                            <div className="text-4xl mb-2">📭</div>
                            <p className="text-sm">ยังไม่มีข้อมูล Pre/Post Test ในวิชานี้</p>
                        </div>
                    ) : (
                        <div style={{ position: 'relative', maxHeight: '320px' }}>
                            <canvas ref={chartRef}></canvas>
                        </div>
                    )}
                </div>

                {/* ── Student Progress Matrix ── */}
                <div className="bg-gray-900/80 border border-purple-800/40 rounded-xl overflow-hidden">
                    <div className="px-6 py-3 border-b border-purple-900/40"
                        style={{ background: 'linear-gradient(90deg,rgba(124,58,237,0.2),rgba(6,182,212,0.1))' }}>
                        <h3 className="text-purple-200 font-black">👥 Student Progress Matrix — {students.length} คน</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    {['นักเรียน', '🔬 Autopsy', '⚡ Quiz', '💻 Coding TC', '📈 Avg Score', '🚨 Runtime'].map(h => (
                                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-400 ${h === 'นักเรียน' ? 'text-left' : 'text-center'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900">
                                {students.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-600">
                                        {courseId ? 'กำลังโหลดรายชื่อนักเรียน...' : 'เลือกวิชาก่อน'}
                                    </td></tr>
                                )}
                                {students.map(stu => {
                                    const autSt = autopsyStatus(stu.id);
                                    const quizSt = quizStatus(stu.id);
                                    const coding = codingProg(stu.id);
                                    const avg = avgScore(stu.id);
                                    const alert = alerts.find(a => a.studentId === stu.id);

                                    return (
                                        <tr key={stu.id} className={`transition-colors hover:bg-gray-800/40 ${alert ? 'bg-red-950/20' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                                        style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: 'white' }}>
                                                        {(stu.displayName || stu.email || '?')[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-200 text-xs font-medium">{stu.displayName || stu.email}</p>
                                                        {stu.studentId && <p className="text-gray-600 text-xs">{stu.studentId}</p>}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Autopsy */}
                                            <td className="px-4 py-3 text-center">
                                                {autSt === 'pass' && <span className="text-green-400 text-lg">✅</span>}
                                                {autSt === 'fail' && <span className="text-red-400 text-lg">❌</span>}
                                                {autSt === 'none' && <span className="text-gray-700">—</span>}
                                            </td>

                                            {/* Quiz */}
                                            <td className="px-4 py-3 text-center">
                                                {quizSt === 'done'
                                                    ? <span className="text-xs font-bold px-2 py-0.5 bg-yellow-900/30 border border-yellow-700/40 text-yellow-300 rounded-full">ส่งแล้ว</span>
                                                    : <span className="text-gray-700 text-xs">—</span>}
                                            </td>

                                            {/* Coding */}
                                            <td className="px-4 py-3 text-center">
                                                {coding ? (
                                                    <div>
                                                        <p className={`text-xs font-bold ${coding.p === coding.t && coding.t > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                            {coding.p}/{coding.t}
                                                        </p>
                                                        <div className="w-16 h-1.5 bg-gray-800 rounded-full mx-auto mt-1 overflow-hidden">
                                                            <div className="h-full rounded-full"
                                                                style={{ width: `${coding.t ? (coding.p / coding.t) * 100 : 0}%`, background: coding.p === coding.t ? '#10b981' : '#f59e0b' }} />
                                                        </div>
                                                    </div>
                                                ) : <span className="text-gray-700 text-xs">—</span>}
                                            </td>

                                            {/* Avg */}
                                            <td className="px-4 py-3 text-center">
                                                {avg !== null
                                                    ? <span className={`font-black text-sm ${avg >= 80 ? 'text-green-400' : avg >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{avg}%</span>
                                                    : <span className="text-gray-700 text-xs">—</span>}
                                            </td>

                                            {/* Runtime */}
                                            <td className="px-4 py-3 text-center">
                                                {alert ? (
                                                    <span className="text-xs font-bold text-red-300 px-2 py-1 bg-red-950/60 border border-red-800/50 rounded-lg animate-pulse whitespace-nowrap">
                                                        {alert.isInfiniteLoopDetected ? '♾️ LOOP' : `💥 ×${alert.consecutiveErrors}`}
                                                    </span>
                                                ) : (
                                                    <span className="text-green-600 text-xs">✓</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

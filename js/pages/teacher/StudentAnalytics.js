// js/pages/teacher/StudentAnalytics.js - Teacher Analytics Dashboard (v4.4)

const StudentAnalytics = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const courseId = params.get('course');

    const [activeTab, setActiveTab] = React.useState('overview');
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

    // Tab 2: Individual
    const [selectedStudentId, setSelectedStudentId] = React.useState('');
    const [studentSubs, setStudentSubs] = React.useState([]);
    const [studentReport, setStudentReport] = React.useState(null);
    const [reportLoading, setReportLoading] = React.useState(false);

    // Tab 2: Bulk analysis
    const [bulkReports, setBulkReports] = React.useState({});       // { studentId: reportText }
    const [bulkLoading, setBulkLoading] = React.useState(false);
    const [bulkProgress, setBulkProgress] = React.useState({ current: 0, total: 0 });

    // Tab 3: Self-Practice
    const [practiceData, setPracticeData] = React.useState([]);
    const [practiceLoading, setPracticeLoading] = React.useState(false);

    // Tab 5: AI Report
    const [classReport, setClassReport] = React.useState(null);
    const [classReportLoading, setClassReportLoading] = React.useState(false);

    // Sort states
    const [overviewSort,  setOverviewSort]  = React.useState('unit');   // 'unit'|'passRate'|'avgScore'
    const [individualSort,setIndividualSort]= React.useState('unit');   // 'unit'|'score'|'date'
    const [summarySort,   setSummarySort]   = React.useState('no');     // 'no'|'score'|'name'
    const [practiceSort,  setPracticeSort]  = React.useState('no');     // 'no'|'score'|'problems'

    React.useEffect(() => { loadCourses(); }, [userDoc]);
    React.useEffect(() => { if (selectedCourse) loadAnalytics(); }, [selectedCourse]);
    React.useEffect(() => {
        if (activeTab === 'overview' && assignments.length > 0) renderChart();
        return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
    }, [assignments, submissions, activeTab]);
    React.useEffect(() => {
        if (activeTab === 'practice' && selectedCourse) loadPracticeData();
    }, [activeTab, selectedCourse]);

    const loadCourses = async () => {
        const [ownSnap, coSnap] = await Promise.all([
            db.collection('courses').where('teacherId', '==', userDoc.id).get(),
            db.collection('courses').where('coTeacherIds', 'array-contains', userDoc.id).get(),
        ]);
        const seen = new Set();
        const list = [];
        [...ownSnap.docs, ...coSnap.docs].forEach(d => {
            if (!seen.has(d.id)) { seen.add(d.id); list.push({ id: d.id, ...d.data() }); }
        });
        setCourses(list);
    };

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const [assignSnap, subSnap, enrollSnap] = await Promise.all([
                db.collection('assignments').where('courseId', '==', selectedCourse).get(),
                db.collection('submissions').where('courseId', '==', selectedCourse).get(),
                db.collection('enrollments').where('courseId', '==', selectedCourse).get(),
            ]);
            setAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setSubmissions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // De-duplicate enrollments by studentId (prevents double-count from duplicate docs)
            const seenEnroll = new Set();
            const dedupedEnrollments = [];
            enrollSnap.docs.forEach(d => {
                const sid = d.data().studentId;
                if (!seenEnroll.has(sid)) { seenEnroll.add(sid); dedupedEnrollments.push({ id: d.id, ...d.data() }); }
            });
            setEnrollments(dedupedEnrollments);

            const studentIds = [...seenEnroll];
            if (studentIds.length > 0) {
                const snaps = await Promise.all(studentIds.map(id => db.collection('users').doc(id).get()));
                const map = {};
                snaps.forEach(s => { if (s.exists) map[s.id] = s.data(); });
                setStudents(map);
            } else {
                setStudents({});
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadPracticeData = async () => {
        if (!selectedCourse) return;
        setPracticeLoading(true);
        try {
            const enrolledIds = enrollments.map(e => e.studentId);
            if (enrolledIds.length === 0) { setPracticeData([]); return; }

            // Firestore 'in' query limit is 30; batch if needed
            const chunks = [];
            for (let i = 0; i < enrolledIds.length; i += 30) chunks.push(enrolledIds.slice(i, i + 30));
            const allDocs = [];
            for (const chunk of chunks) {
                const snap = await db.collection('selfPracticeSubmissions')
                    .where('studentId', 'in', chunk)
                    .get();
                snap.docs.forEach(d => allDocs.push({ id: d.id, ...d.data() }));
            }
            setPracticeData(allDocs);
        } catch (err) { console.error(err); }
        finally { setPracticeLoading(false); }
    };

    const getAssignmentStats = (assignId) => {
        const subs = submissions.filter(s => s.assignmentId === assignId);
        if (subs.length === 0) return { attempts: 0, passRate: 0, avgScore: 0, uniqueStudents: 0 };
        const passed = subs.filter(s => s.status === 'accepted').length;
        return {
            attempts: subs.length,
            passRate: Math.round((passed / subs.length) * 100),
            avgScore: Math.round(subs.reduce((sum, s) => sum + (s.score || 0), 0) / subs.length),
            uniqueStudents: new Set(subs.map(s => s.studentId)).size,
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
                byStudent[s.studentId] = { ...s };
        });
        Object.keys(byStudent).forEach(sid => {
            byStudent[sid].totalAttempts = subs.filter(s => s.studentId === sid).length;
        });
        return Object.values(byStudent).sort((a, b) => b.score - a.score);
    };

    // ── Tab 2: Load individual student submissions + AI report ──
    const loadStudentDetail = async (sid) => {
        setSelectedStudentId(sid);
        setStudentReport(null);
        setBulkReports({});
        if (!sid) { setStudentSubs([]); return; }
        try {
            // Remove orderBy to avoid requiring composite index — sort client-side instead
            const snap = await db.collection('submissions')
                .where('studentId', '==', sid)
                .where('courseId', '==', selectedCourse)
                .get();
            const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
            setStudentSubs(subs);
        } catch (err) {
            console.error('loadStudentDetail error:', err);
            setStudentSubs([]);
        }
    };

    const handleGenerateStudentReport = async () => {
        if (!selectedStudentId) return;
        setReportLoading(true);
        setStudentReport(null);
        try {
            const studentName = students[selectedStudentId]?.displayName || selectedStudentId;
            const courseTitle = courses.find(c => c.id === selectedCourse)?.title || '';
            const practiceItems = practiceData.filter(p => p.studentId === selectedStudentId);
            const data = {
                course: courseTitle,
                totalSubmissions: studentSubs.length,
                avgScore: studentSubs.length ? Math.round(studentSubs.reduce((s, x) => s + (x.score || 0), 0) / studentSubs.length) : 0,
                passedCount: studentSubs.filter(s => s.status === 'accepted').length,
                recentSubmissions: studentSubs.slice(0, 5).map(s => ({
                    assignment: assignments.find(a => a.id === s.assignmentId)?.title || s.assignmentId,
                    score: s.score,
                    status: s.status,
                    passedTests: s.passedTests,
                    totalTests: s.totalTests,
                })),
                selfPractice: {
                    totalProblems: practiceItems.length,
                    totalScore: practiceItems.reduce((s, p) => s + (p.actualScore || 0), 0),
                    byDifficulty: ['ง่าย', 'ปานกลาง', 'ยาก'].map(d => ({
                        difficulty: d,
                        count: practiceItems.filter(p => p.difficulty === d).length,
                        avgScore: (() => {
                            const items = practiceItems.filter(p => p.difficulty === d);
                            return items.length ? Math.round(items.reduce((s, p) => s + (p.actualScore || 0), 0) / items.length) : 0;
                        })(),
                    })),
                },
            };
            const report = await generateStudentReport(studentName, data);
            setStudentReport(report);
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setReportLoading(false);
        }
    };

    // ── Tab 2: Bulk individual AI reports for all students ──
    const handleBulkReport = async () => {
        const studentIds = Object.keys(students);
        if (studentIds.length === 0) return;
        if (!confirm(`วิเคราะห์นักเรียนทั้งหมด ${studentIds.length} คน ด้วย AI?\nอาจใช้เวลาสักครู่`)) return;
        setBulkLoading(true);
        setBulkReports({});
        setBulkProgress({ current: 0, total: studentIds.length });
        const courseTitle = courses.find(c => c.id === selectedCourse)?.title || '';

        for (let i = 0; i < studentIds.length; i++) {
            const sid = studentIds[i];
            setBulkProgress({ current: i + 1, total: studentIds.length });
            try {
                // Load submissions for this student
                const snap = await db.collection('submissions')
                    .where('studentId', '==', sid)
                    .where('courseId', '==', selectedCourse)
                    .get();
                const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));

                const practiceItems = practiceData.filter(p => p.studentId === sid);
                const data = {
                    course: courseTitle,
                    totalSubmissions: subs.length,
                    avgScore: subs.length ? Math.round(subs.reduce((s, x) => s + (x.score || 0), 0) / subs.length) : 0,
                    passedCount: subs.filter(s => s.status === 'accepted').length,
                    recentSubmissions: subs.slice(0, 5).map(s => ({
                        assignment: assignments.find(a => a.id === s.assignmentId)?.title || s.assignmentId,
                        score: s.score, status: s.status,
                        passedTests: s.passedTests, totalTests: s.totalTests,
                    })),
                    selfPractice: {
                        totalProblems: practiceItems.length,
                        totalScore: practiceItems.reduce((s, p) => s + (p.actualScore || 0), 0),
                        byDifficulty: ['ง่าย', 'ปานกลาง', 'ยาก'].map(d => ({
                            difficulty: d,
                            count: practiceItems.filter(p => p.difficulty === d).length,
                            avgScore: (() => {
                                const items = practiceItems.filter(p => p.difficulty === d);
                                return items.length ? Math.round(items.reduce((s, p) => s + (p.actualScore || 0), 0) / items.length) : 0;
                            })(),
                        })),
                    },
                };
                const report = await generateStudentReport(students[sid]?.displayName || sid, data);
                setBulkReports(prev => ({ ...prev, [sid]: report }));
            } catch (err) {
                setBulkReports(prev => ({ ...prev, [sid]: `❌ วิเคราะห์ไม่สำเร็จ: ${err.message}` }));
            }
        }
        setBulkLoading(false);
    };

    // ── Tab 4: Class AI Report ──
    const handleGenerateClassReport = async () => {
        setClassReportLoading(true);
        setClassReport(null);
        try {
            const courseTitle = courses.find(c => c.id === selectedCourse)?.title || '';
            const assignStats = assignments.map(a => {
                const stats = getAssignmentStats(a.id);
                return { title: a.title, difficulty: a.difficulty, ...stats };
            });
            const practiceByStudent = {};
            practiceData.forEach(p => {
                if (!practiceByStudent[p.studentId]) practiceByStudent[p.studentId] = { count: 0, totalScore: 0 };
                practiceByStudent[p.studentId].count++;
                practiceByStudent[p.studentId].totalScore += (p.actualScore || 0);
            });
            const classData = {
                totalStudents: enrollments.length,
                totalSubmissions: submissions.length,
                overallPassRate: submissions.length
                    ? Math.round(submissions.filter(s => s.status === 'accepted').length / submissions.length * 100) : 0,
                assignmentStats: assignStats,
                selfPractice: {
                    participatingStudents: Object.keys(practiceByStudent).length,
                    totalProblems: practiceData.length,
                    avgScore: practiceData.length
                        ? Math.round(practiceData.reduce((s, p) => s + (p.actualScore || 0), 0) / practiceData.length) : 0,
                },
                studentSummaries: Object.entries(students).map(([sid, st]) => {
                    const subs = submissions.filter(s => s.studentId === sid);
                    const prac = practiceByStudent[sid] || { count: 0, totalScore: 0 };
                    return {
                        name: st.displayName,
                        submissions: subs.length,
                        avgScore: subs.length ? Math.round(subs.reduce((s, x) => s + (x.score || 0), 0) / subs.length) : 0,
                        practiceProblems: prac.count,
                        practiceTotalScore: prac.totalScore,
                    };
                }),
            };
            const report = await generateClassReport(courseTitle, classData);
            setClassReport(report);
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setClassReportLoading(false);
        }
    };

    // ── Derived ──
    const problematicAssignments = assignments
        .map(a => ({ ...a, stats: getAssignmentStats(a.id) }))
        .filter(a => a.stats.attempts > 0 && a.stats.passRate < 50)
        .sort((a, b) => a.stats.passRate - b.stats.passRate)
        .slice(0, 5);
    const studentResults = getStudentResults();
    const overallPassRate = submissions.length
        ? Math.round(submissions.filter(s => s.status === 'accepted').length / submissions.length * 100) : 0;

    // Practice scores per student
    const practiceByStudent = React.useMemo(() => {
        const map = {};
        practiceData.forEach(p => {
            if (!map[p.studentId]) map[p.studentId] = { count: 0, totalScore: 0, items: [] };
            map[p.studentId].count++;
            map[p.studentId].totalScore += (p.actualScore || 0);
            map[p.studentId].items.push(p);
        });
        return map;
    }, [practiceData]);

    // ── Sort helpers ──────────────────────────────────────────────────────────
    // Extract unit number from unitName string (e.g. "หน่วยที่ 2 …" → 2)
    const unitNo = (name) => { const m = (name||'').match(/(\d+)/); return m ? parseInt(m[1]) : 99; };

    // Assignments sorted for display (overview / individual tabs)
    const sortedAssignments = React.useMemo(() => {
        const arr = [...assignments];
        if (overviewSort === 'unit') {
            arr.sort((a, b) => {
                const d = unitNo(a.unitName) - unitNo(b.unitName);
                return d !== 0 ? d : (a.title||'').localeCompare(b.title||'', 'th');
            });
        } else if (overviewSort === 'passRate') {
            arr.sort((a, b) => getAssignmentStats(b.id).passRate - getAssignmentStats(a.id).passRate);
        } else if (overviewSort === 'avgScore') {
            arr.sort((a, b) => getAssignmentStats(b.id).avgScore - getAssignmentStats(a.id).avgScore);
        }
        return arr;
    }, [assignments, overviewSort, submissions]);

    // Enrollment order (original index kept for เลขที่)
    const enrollmentsIndexed = React.useMemo(() =>
        enrollments.map((e, i) => ({ ...e, origIdx: i }))
    , [enrollments]);

    // Sorted enrollments for summary tab
    const sortedSummaryEnrollments = React.useMemo(() => {
        const arr = [...enrollmentsIndexed];
        if (summarySort === 'no') arr.sort((a, b) => a.origIdx - b.origIdx);
        else if (summarySort === 'name') arr.sort((a, b) => (students[a.studentId]?.displayName||'').localeCompare(students[b.studentId]?.displayName||'', 'th'));
        else if (summarySort === 'score') {
            // compute grandTotal for each — need bestScore (compute inline)
            const best = {};
            submissions.forEach(sub => {
                if (!best[sub.studentId]) best[sub.studentId] = {};
                const cur = best[sub.studentId][sub.assignmentId] || 0;
                if ((sub.score||0) > cur) best[sub.studentId][sub.assignmentId] = sub.score||0;
            });
            arr.sort((a, b) => {
                const tot = (e) => assignments.reduce((s, asn) => s + (asn.rawScore > 0 ? Math.round((best[e.studentId]?.[asn.id]||0) * asn.rawScore / 100) : 0), 0);
                return tot(b) - tot(a);
            });
        }
        return arr;
    }, [enrollmentsIndexed, summarySort, students, submissions, assignments]);

    // Sorted enrollments for practice tab
    const sortedPracticeEnrollments = React.useMemo(() => {
        const arr = [...enrollmentsIndexed];
        if (practiceSort === 'no') arr.sort((a, b) => a.origIdx - b.origIdx);
        else if (practiceSort === 'score') arr.sort((a, b) => (practiceByStudent[b.studentId]?.totalScore||0) - (practiceByStudent[a.studentId]?.totalScore||0));
        else if (practiceSort === 'problems') arr.sort((a, b) => (practiceByStudent[b.studentId]?.count||0) - (practiceByStudent[a.studentId]?.count||0));
        return arr;
    }, [enrollmentsIndexed, practiceSort, practiceByStudent]);

    // Sort button component
    const SortBtn = ({ active, onClick, children }) => (
        <button onClick={onClick} style={{
            padding: '4px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
            background: active ? '#ec4899' : '#fce7f3',
            color: active ? 'white' : '#be185d',
            border: 'none', fontWeight: active ? 700 : 400,
            fontFamily: "'Prompt', sans-serif",
        }}>{children}</button>
    );

    const TAB_STYLE = (t) => ({
        padding: '10px 20px',
        borderBottom: activeTab === t ? '2.5px solid #EC407A' : '2.5px solid transparent',
        color: activeTab === t ? '#C2185B' : '#9ca3af',
        fontWeight: activeTab === t ? 700 : 400,
        background: 'none',
        border: 'none',
        borderBottom: activeTab === t ? '2.5px solid #EC407A' : '2.5px solid transparent',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: "'Prompt', sans-serif",
        whiteSpace: 'nowrap',
    });

    return (
        <div className="min-h-screen" style={{ background: '#fdf2f8', fontFamily: "'Prompt', sans-serif" }}>
            <Navbar title="AI-Powered Coding Platform" subtitle="วิเคราะห์ผลการเรียน" />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#be185d' }}>
                    📊 Teacher Analytics Dashboard
                </h2>

                {/* Course Selector */}
                <div className="k-card p-4 mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2">🏫 เลือกรายวิชา:</label>
                    <select value={selectedCourse}
                        onChange={e => {
                            setSelectedCourse(e.target.value);
                            setSelectedStudentId('');
                            setStudentSubs([]);
                            setStudentReport(null);
                            setClassReport(null);
                            setPracticeData([]);
                        }}
                        className="k-input" style={{ maxWidth: '360px' }}>
                        <option value="">-- เลือกรายวิชา --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}{c.grade ? ` · ${c.grade}` : ''}{c.room ? ` ห้อง ${c.room}` : ''}{c.semester ? ` เทอม ${c.semester}/${c.academicYear || ''}` : ''}</option>)}
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

                        {/* Tabs */}
                        <div className="k-card mb-6 overflow-hidden">
                            <div style={{ display: 'flex', borderBottom: '1px solid #fce7f3', overflowX: 'auto' }}>
                                {[
                                    { key: 'overview',  label: '📊 ภาพรวม' },
                                    { key: 'individual', label: '👤 รายบุคคล' },
                                    { key: 'summary',   label: '📋 สรุปคะแนนทุกคน' },
                                    { key: 'practice',  label: '🎯 คะแนนฝึกเอง' },
                                    { key: 'aireport',  label: '🤖 รายงาน AI' },
                                ].map(t => (
                                    <button key={t.key} style={TAB_STYLE(t.key)} onClick={() => setActiveTab(t.key)}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6">

                                {/* ─── TAB 1: OVERVIEW ─── */}
                                {activeTab === 'overview' && (
                                    <>
                                        {assignments.length > 0 && (
                                            <div className="mb-6">
                                                <h3 className="font-bold text-gray-700 mb-4">📈 อัตราผ่านและคะแนนเฉลี่ยต่อโจทย์</h3>
                                                <canvas ref={chartRef} height={assignments.length > 8 ? 120 : 90}></canvas>
                                            </div>
                                        )}

                                        {problematicAssignments.length > 0 && (
                                            <div className="mb-6" style={{ borderLeft: '4px solid #fca5a5', paddingLeft: '16px' }}>
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

                                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                            <h3 className="font-bold text-gray-700">📝 สถิติแต่ละโจทย์</h3>
                                            <div className="flex gap-2 flex-wrap">
                                                <span className="text-xs text-gray-400 self-center">เรียงตาม:</span>
                                                <SortBtn active={overviewSort==='unit'}     onClick={()=>setOverviewSort('unit')}>หน่วย 1→4</SortBtn>
                                                <SortBtn active={overviewSort==='passRate'} onClick={()=>setOverviewSort('passRate')}>อัตราผ่าน↓</SortBtn>
                                                <SortBtn active={overviewSort==='avgScore'} onClick={()=>setOverviewSort('avgScore')}>คะแนนเฉลี่ย↓</SortBtn>
                                            </div>
                                        </div>
                                        {assignments.length === 0 ? (
                                            <p className="text-gray-400 text-sm text-center py-6">ยังไม่มีโจทย์ในรายวิชานี้</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr style={{ borderBottom: '2px solid #fce7f3' }}>
                                                            {['#', 'โจทย์', 'คะแนนดิบ', 'ประเภท', 'นักเรียนที่ลอง', 'ครั้งส่ง', 'อัตราผ่าน', 'คะแนนเฉลี่ย', ''].map(h => (
                                                                <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sortedAssignments.map((a, aidx) => {
                                                            const stats = getAssignmentStats(a.id);
                                                            return (
                                                                <tr key={a.id} style={{ borderBottom: '1px solid #fce7f3' }}
                                                                    className="hover:bg-pink-50 transition-colors">
                                                                    <td className="py-3 px-2 text-center text-xs text-gray-400">{aidx+1}</td>
                                                                    <td className="py-3 px-2">
                                                                        <div className="font-medium text-gray-800">{a.title}</div>
                                                                        <div className="text-xs text-gray-400">{a.unitName} · {a.difficulty}</div>
                                                                    </td>
                                                                    <td className="py-3 px-2 text-center">
                                                                        {a.rawScore > 0
                                                                            ? <span className="text-sm font-bold" style={{ color: '#be185d' }}>{a.rawScore}</span>
                                                                            : <span className="text-gray-300 text-xs">-</span>}
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
                                                                    <td className="py-3 px-2 text-center">
                                                                        <div className="font-bold text-sm" style={{ color: stats.avgScore >= 70 ? '#16a34a' : stats.avgScore >= 40 ? '#d97706' : '#dc2626' }}>
                                                                            {stats.avgScore}%
                                                                        </div>
                                                                        {a.rawScore > 0 && (
                                                                            <div className="text-xs text-gray-400">
                                                                                ≈ {(stats.avgScore * a.rawScore / 100).toFixed(1)}/{a.rawScore}
                                                                            </div>
                                                                        )}
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

                                        {selectedAssignment && (
                                            <div className="mt-6 pt-6" style={{ borderTop: '1px solid #fce7f3' }}>
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
                                                                            <td className="py-2 px-2"><span className="text-xs">{info.icon} {info.text}</span></td>
                                                                            <td className="py-2 px-2 text-center text-gray-600">{sub.passedTests}/{sub.totalTests}</td>
                                                                            <td className="py-2 px-2 text-center font-bold" style={{
                                                                                color: sub.score >= 80 ? '#16a34a' : sub.score >= 50 ? '#d97706' : '#dc2626'
                                                                            }}>{sub.score}%</td>
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

                                {/* ─── TAB 2: INDIVIDUAL ─── */}
                                {activeTab === 'individual' && (
                                    <div>
                                        {/* Controls row */}
                                        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-end flex-wrap">
                                            <div className="flex-1 min-w-0">
                                                <label className="block text-sm font-medium text-gray-600 mb-2">👤 เลือกนักเรียน:</label>
                                                <select value={selectedStudentId}
                                                    onChange={e => { loadStudentDetail(e.target.value); setBulkReports({}); }}
                                                    className="k-input">
                                                    <option value="">-- เลือกนักเรียน --</option>
                                                    {Object.entries(students).map(([sid, st]) => (
                                                        <option key={sid} value={sid}>{st.displayName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {selectedStudentId && (
                                                <button onClick={handleGenerateStudentReport}
                                                    disabled={reportLoading || bulkLoading}
                                                    className="k-btn-pink px-4 py-2 text-sm disabled:opacity-50 shrink-0">
                                                    {reportLoading ? '⏳ กำลังวิเคราะห์...' : '🤖 วิเคราะห์คนนี้'}
                                                </button>
                                            )}
                                            {Object.keys(students).length > 0 && (
                                                <button onClick={() => { setSelectedStudentId(''); setStudentSubs([]); setStudentReport(null); handleBulkReport(); }}
                                                    disabled={bulkLoading || reportLoading}
                                                    className="px-4 py-2 text-sm font-bold rounded-xl disabled:opacity-50 shrink-0"
                                                    style={{ background:'linear-gradient(135deg,#7C3AED,#5B21B6)', color:'white', border:'none' }}>
                                                    {bulkLoading
                                                        ? `⏳ กำลังวิเคราะห์ ${bulkProgress.current}/${bulkProgress.total}...`
                                                        : `🤖 วิเคราะห์ทั้งห้อง (${Object.keys(students).length} คน)`}
                                                </button>
                                            )}
                                        </div>

                                        {/* Bulk report progress */}
                                        {bulkLoading && (
                                            <div className="mb-4 p-3 rounded-xl" style={{ background:'#F5F3FF', border:'1px solid #DDD6FE' }}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="text-sm font-medium text-purple-700">
                                                        🤖 กำลังวิเคราะห์ {bulkProgress.current}/{bulkProgress.total} คน...
                                                    </div>
                                                </div>
                                                <div className="w-full bg-purple-100 rounded-full h-2">
                                                    <div className="h-2 rounded-full transition-all"
                                                        style={{ background:'#7C3AED', width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Bulk reports result */}
                                        {!bulkLoading && Object.keys(bulkReports).length > 0 && !selectedStudentId && (
                                            <div className="space-y-4 mb-6">
                                                <h3 className="font-bold text-gray-700">🤖 รายงาน AI รายบุคคลทั้งห้อง ({Object.keys(bulkReports).length} คน)</h3>
                                                {Object.entries(bulkReports).map(([sid, report]) => (
                                                    <div key={sid} className="rounded-2xl p-4" style={{ background:'#F5F3FF', border:'1px solid #DDD6FE' }}>
                                                        <div className="font-bold text-purple-800 mb-2 text-sm">
                                                            👤 {students[sid]?.displayName || sid}
                                                        </div>
                                                        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{report}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {selectedStudentId && (
                                            <>
                                                {/* Student submission history */}
                                                <div className="mb-6">
                                                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                        <h3 className="font-bold text-gray-700">📋 ประวัติการส่งงาน ({studentSubs.length} รายการ)</h3>
                                                        <div className="flex gap-2 flex-wrap">
                                                            <span className="text-xs text-gray-400 self-center">เรียงตาม:</span>
                                                            <SortBtn active={individualSort==='unit'}  onClick={()=>setIndividualSort('unit')}>หน่วย 1→4</SortBtn>
                                                            <SortBtn active={individualSort==='score'} onClick={()=>setIndividualSort('score')}>คะแนนสูง↓</SortBtn>
                                                            <SortBtn active={individualSort==='date'}  onClick={()=>setIndividualSort('date')}>วันที่ล่าสุด</SortBtn>
                                                        </div>
                                                    </div>
                                                    {studentSubs.length === 0 ? (
                                                        <p className="text-gray-400 text-sm text-center py-6">ยังไม่มีการส่งงาน</p>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr style={{ borderBottom: '2px solid #fce7f3' }}>
                                                                        {['#', 'โจทย์', 'สถานะ', 'ผ่าน', 'คะแนน%', 'คะแนนดิบ', 'วันที่'].map(h => (
                                                                            <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-gray-500">{h}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(() => {
                                                                        const sorted = [...studentSubs];
                                                                        if (individualSort === 'unit') {
                                                                            sorted.sort((a, b) => {
                                                                                const aa = assignments.find(x => x.id === a.assignmentId);
                                                                                const bb = assignments.find(x => x.id === b.assignmentId);
                                                                                const d = unitNo(aa?.unitName) - unitNo(bb?.unitName);
                                                                                return d !== 0 ? d : (aa?.title||'').localeCompare(bb?.title||'', 'th');
                                                                            });
                                                                        } else if (individualSort === 'score') {
                                                                            sorted.sort((a, b) => (b.score||0) - (a.score||0));
                                                                        } else if (individualSort === 'date') {
                                                                            sorted.sort((a, b) => (b.submittedAt?.seconds||0) - (a.submittedAt?.seconds||0));
                                                                        }
                                                                        return sorted;
                                                                    })().map((sub, sidx) => {
                                                                        const assign = assignments.find(a => a.id === sub.assignmentId);
                                                                        const info = STATUS_LABELS[sub.status] || STATUS_LABELS.pending;
                                                                        const earned = assign?.rawScore > 0 ? Math.round((sub.score || 0) * assign.rawScore / 100) : null;
                                                                        return (
                                                                            <tr key={sub.id} style={{ borderBottom: '1px solid #fce7f3' }} className="hover:bg-pink-50">
                                                                                <td className="py-2 px-2 text-center text-xs text-gray-400">{sidx+1}</td>
                                                                                <td className="py-2 px-2">
                                                                                    <div className="font-medium text-gray-800">{assign?.title || sub.assignmentId?.slice(0, 10)}</div>
                                                                                    <div className="text-xs text-gray-400">{assign?.unitName}</div>
                                                                                </td>
                                                                                <td className="py-2 px-2 text-xs">{info.icon} {info.text}</td>
                                                                                <td className="py-2 px-2 text-center text-gray-600">{sub.passedTests}/{sub.totalTests}</td>
                                                                                <td className="py-2 px-2 text-center font-bold"
                                                                                    style={{ color: sub.score >= 80 ? '#16a34a' : sub.score >= 50 ? '#d97706' : '#dc2626' }}>
                                                                                    {sub.score}%
                                                                                </td>
                                                                                <td className="py-2 px-2 text-center font-bold" style={{ color: '#be185d' }}>
                                                                                    {earned !== null ? `${earned}/${assign.rawScore}` : <span className="text-gray-300">-</span>}
                                                                                </td>
                                                                                <td className="py-2 px-2 text-xs text-gray-400">
                                                                                    {sub.submittedAt?.toDate ? sub.submittedAt.toDate().toLocaleDateString('th-TH') : '-'}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* AI Report Card */}
                                                {reportLoading && (
                                                    <div className="text-center py-10 text-gray-400">
                                                        <div className="text-4xl mb-3 animate-pulse">🤖</div>
                                                        <p>AI กำลังวิเคราะห์นักเรียน...</p>
                                                    </div>
                                                )}
                                                {studentReport && (
                                                    <div className="space-y-4">
                                                        <h3 className="font-bold text-gray-700">🤖 รายงาน AI: {students[selectedStudentId]?.displayName}</h3>

                                                        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#FFF0F5,#FFD1DC)', border: '1px solid #FFB6C8' }}>
                                                            <div className="text-sm font-semibold mb-1" style={{ color: '#AD1457' }}>ภาพรวม</div>
                                                            <p className="text-gray-700 text-sm leading-relaxed">{studentReport.overview}</p>
                                                        </div>

                                                        <div className="grid sm:grid-cols-2 gap-4">
                                                            <div className="rounded-2xl p-5 bg-green-50 border border-green-100">
                                                                <div className="font-semibold text-green-700 mb-2 text-sm">✅ จุดแข็ง</div>
                                                                <ul className="space-y-1">
                                                                    {(studentReport.strengths || []).map((s, i) => (
                                                                        <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500">•</span>{s}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                            <div className="rounded-2xl p-5 bg-orange-50 border border-orange-100">
                                                                <div className="font-semibold text-orange-700 mb-2 text-sm">📈 จุดที่ต้องพัฒนา</div>
                                                                <ul className="space-y-1">
                                                                    {(studentReport.improvements || []).map((s, i) => (
                                                                        <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-orange-500">•</span>{s}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>

                                                        {studentReport.pattern && (
                                                            <div className="rounded-2xl p-5 bg-blue-50 border border-blue-100">
                                                                <div className="font-semibold text-blue-700 mb-1 text-sm">🔍 รูปแบบการเรียนรู้</div>
                                                                <p className="text-sm text-gray-700">{studentReport.pattern}</p>
                                                            </div>
                                                        )}

                                                        <div className="rounded-2xl p-5" style={{ background: '#fdf2f8', border: '1px solid #fce7f3' }}>
                                                            <div className="font-semibold mb-1 text-sm" style={{ color: '#be185d' }}>💡 คำแนะนำสำหรับนักเรียนคนนี้</div>
                                                            <p className="text-sm text-gray-700">{studentReport.advice}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {!selectedStudentId && (
                                            <div className="text-center py-16 text-gray-400">
                                                <div className="text-5xl mb-3">👤</div>
                                                <p>เลือกนักเรียนเพื่อดูรายละเอียด</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─── TAB 3: SUMMARY SCORES ─── */}
                                {activeTab === 'summary' && (() => {
                                    // Group assignments by unitName sorted by unit number
                                    const unitNames = [];
                                    const unitMap = {};
                                    [...assignments]
                                        .sort((a, b) => {
                                            const d = unitNo(a.unitName) - unitNo(b.unitName);
                                            return d !== 0 ? d : (a.title||'').localeCompare(b.title||'', 'th');
                                        })
                                        .forEach(a => {
                                            const u = a.unitName || 'ไม่ระบุหน่วย';
                                            if (!unitMap[u]) { unitMap[u] = []; unitNames.push(u); }
                                            unitMap[u].push(a);
                                        });

                                    // Best score per student per assignment
                                    const bestScore = {}; // { studentId: { assignmentId: score% } }
                                    submissions.forEach(sub => {
                                        if (!bestScore[sub.studentId]) bestScore[sub.studentId] = {};
                                        const cur = bestScore[sub.studentId][sub.assignmentId] || 0;
                                        if ((sub.score || 0) > cur) bestScore[sub.studentId][sub.assignmentId] = sub.score || 0;
                                    });

                                    const hasRawScore = assignments.some(a => a.rawScore > 0);
                                    const totalRaw = assignments.reduce((s, a) => s + (a.rawScore || 0), 0);

                                    // Export CSV
                                    const exportCSV = () => {
                                        const header = ['#', 'รหัส', 'ชื่อ-สกุล',
                                            ...unitNames.flatMap(u => [
                                                ...unitMap[u].map(a => `${a.title} (/${a.rawScore||'?'})`),
                                                `รวม ${u} (/${unitMap[u].reduce((s,a)=>s+(a.rawScore||0),0)})`
                                            ]),
                                            `รวมทั้งหมด (/${totalRaw})`, 'ร้อยละ'
                                        ];
                                        const rows = enrollments.map((enroll, idx) => {
                                            const sid = enroll.studentId;
                                            const st = students[sid];
                                            const code = st?.studentCode || st?.email?.split('@')[0] || '';
                                            let grandTotal = 0;
                                            const unitCols = unitNames.flatMap(u => {
                                                let unitTotal = 0;
                                                const cols = unitMap[u].map(a => {
                                                    const pct = bestScore[sid]?.[a.id] || 0;
                                                    const earned = a.rawScore > 0 ? Math.round(pct * a.rawScore / 100) : '';
                                                    if (typeof earned === 'number') { unitTotal += earned; grandTotal += earned; }
                                                    return earned;
                                                });
                                                return [...cols, unitTotal];
                                            });
                                            const pct = totalRaw > 0 ? (grandTotal / totalRaw * 100).toFixed(2) : '';
                                            return [idx+1, code, st?.displayName || sid, ...unitCols, grandTotal, pct];
                                        });
                                        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
                                        const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a'); a.href=url; a.download='E1_scores.csv'; a.click();
                                        URL.revokeObjectURL(url);
                                    };

                                    return (
                                        <div>
                                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-700">📋 สรุปคะแนนดิบทุกคน (E1)</h3>
                                                    {hasRawScore
                                                        ? <p className="text-xs text-gray-400 mt-0.5">คะแนนเต็มรวม {totalRaw} คะแนน · {enrollments.length} คน · {assignments.length} โจทย์</p>
                                                        : <p className="text-xs text-orange-500 mt-0.5">⚠️ ยังไม่มีข้อมูลคะแนนดิบ</p>
                                                    }
                                                </div>
                                                <div className="flex gap-2 flex-wrap items-center">
                                                    <span className="text-xs text-gray-400">เรียงตาม:</span>
                                                    <SortBtn active={summarySort==='no'}    onClick={()=>setSummarySort('no')}>เลขที่</SortBtn>
                                                    <SortBtn active={summarySort==='score'} onClick={()=>setSummarySort('score')}>คะแนนสูง↓</SortBtn>
                                                    <SortBtn active={summarySort==='name'}  onClick={()=>setSummarySort('name')}>ชื่อ A→Z</SortBtn>
                                                    <button onClick={exportCSV}
                                                        className="text-sm px-4 py-2 rounded-xl font-medium"
                                                        style={{ background: '#fce7f3', color: '#be185d', border:'none', cursor:'pointer', fontFamily:"'Prompt',sans-serif" }}>
                                                        📥 Export CSV
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="text-xs border-collapse" style={{ minWidth: '100%' }}>
                                                    <thead>
                                                        {/* Unit group header */}
                                                        <tr style={{ background: '#FFF0F5' }}>
                                                            <th className="py-2 px-2 border border-pink-100 text-center sticky left-0 bg-pink-50 whitespace-nowrap" rowSpan={2}>#</th>
                                                            <th className="py-2 px-2 border border-pink-100 text-center bg-pink-50 whitespace-nowrap" rowSpan={2}>รหัส</th>
                                                            <th className="py-2 px-2 border border-pink-100 text-left bg-pink-50 whitespace-nowrap" rowSpan={2} style={{minWidth:'120px'}}>ชื่อ-สกุล</th>
                                                            {unitNames.map(u => (
                                                                <th key={u} className="py-2 px-2 border border-pink-100 text-center font-bold whitespace-nowrap"
                                                                    colSpan={unitMap[u].length + 1}
                                                                    style={{ color: '#AD1457', background: '#FFF0F5' }}>
                                                                    {u}
                                                                    <span className="text-gray-400 font-normal ml-1">
                                                                        (/{unitMap[u].reduce((s,a)=>s+(a.rawScore||0),0)})
                                                                    </span>
                                                                </th>
                                                            ))}
                                                            <th className="py-2 px-2 border border-pink-100 text-center font-bold whitespace-nowrap" rowSpan={2}
                                                                style={{ color: '#be185d', background: '#FFE4EE' }}>
                                                                รวม<br/>/{totalRaw}
                                                            </th>
                                                            <th className="py-2 px-2 border border-pink-100 text-center font-bold whitespace-nowrap" rowSpan={2}
                                                                style={{ color: '#be185d', background: '#FFE4EE' }}>
                                                                ร้อยละ
                                                            </th>
                                                        </tr>
                                                        {/* Assignment names header */}
                                                        <tr style={{ background: '#FFF5F7' }}>
                                                            {unitNames.flatMap(u => [
                                                                ...unitMap[u].map(a => (
                                                                    <th key={a.id} className="py-1 px-1 border border-pink-100 text-center font-medium whitespace-nowrap"
                                                                        style={{ color: '#C2185B', maxWidth: '80px' }}>
                                                                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', maxWidth:'80px', whiteSpace:'nowrap' }}
                                                                            title={a.title}>
                                                                            {a.title.length > 12 ? a.title.slice(0,12)+'…' : a.title}
                                                                        </div>
                                                                        <div className="text-gray-400 font-normal">/{a.rawScore||'?'}</div>
                                                                    </th>
                                                                )),
                                                                <th key={`${u}_sub`} className="py-1 px-2 border border-pink-100 text-center font-bold whitespace-nowrap"
                                                                    style={{ color: '#AD1457', background: '#FFF0F5' }}>
                                                                    รวม
                                                                </th>
                                                            ])}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sortedSummaryEnrollments.map((enroll, dispIdx) => {
                                                            const sid = enroll.studentId;
                                                            const st = students[sid];
                                                            const code = st?.studentCode || st?.email?.split('@')[0] || '';
                                                            let grandTotal = 0;
                                                            const cells = unitNames.flatMap(u => {
                                                                let unitTotal = 0;
                                                                const asnCells = unitMap[u].map(a => {
                                                                    const pct = bestScore[sid]?.[a.id] || 0;
                                                                    const earned = a.rawScore > 0 ? Math.round(pct * a.rawScore / 100) : null;
                                                                    if (earned !== null) { unitTotal += earned; grandTotal += earned; }
                                                                    const color = earned === null ? '#9ca3af' : earned >= a.rawScore * 0.8 ? '#16a34a' : earned >= a.rawScore * 0.5 ? '#d97706' : '#dc2626';
                                                                    return (
                                                                        <td key={a.id} className="py-1 px-1 text-center border border-pink-50"
                                                                            style={{ color }}>
                                                                            {earned !== null ? earned : <span className="text-gray-200">-</span>}
                                                                        </td>
                                                                    );
                                                                });
                                                                return [
                                                                    ...asnCells,
                                                                    <td key={`${u}_sub`} className="py-1 px-2 text-center font-bold border border-pink-100"
                                                                        style={{ background: '#FFF5F7', color: '#be185d' }}>
                                                                        {unitTotal}
                                                                    </td>
                                                                ];
                                                            });
                                                            const pct = totalRaw > 0 ? (grandTotal / totalRaw * 100).toFixed(1) : '-';
                                                            const grandColor = grandTotal / totalRaw >= 0.8 ? '#16a34a' : grandTotal / totalRaw >= 0.5 ? '#d97706' : '#dc2626';
                                                            return (
                                                                <tr key={sid} className="hover:bg-pink-50"
                                                                    style={{ borderBottom: '1px solid #fce7f3' }}>
                                                                    <td className="py-1 px-2 text-center text-gray-400 sticky left-0 bg-white">{enroll.origIdx + 1}</td>
                                                                    <td className="py-1 px-2 text-center text-gray-500 whitespace-nowrap" style={{ fontSize:'11px' }}>{code}</td>
                                                                    <td className="py-1 px-2 font-medium text-gray-800 whitespace-nowrap"
                                                                        style={{ background: 'white', minWidth: '120px' }}>
                                                                        {st?.displayName || sid.slice(0,8)}
                                                                    </td>
                                                                    {cells}
                                                                    <td className="py-1 px-2 text-center font-bold border border-pink-100"
                                                                        style={{ background: '#FFE4EE', color: grandColor, fontSize: '13px' }}>
                                                                        {grandTotal}
                                                                    </td>
                                                                    <td className="py-1 px-2 text-center font-bold border border-pink-100"
                                                                        style={{ background: '#FFE4EE', color: grandColor }}>
                                                                        {pct}%
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {/* Average row */}
                                                        {enrollments.length > 0 && (() => {
                                                            const totals = {};
                                                            assignments.forEach(a => { totals[a.id] = 0; });
                                                            let grandSum = 0;
                                                            enrollments.forEach(e => {
                                                                assignments.forEach(a => {
                                                                    const pct = bestScore[e.studentId]?.[a.id] || 0;
                                                                    const earned = a.rawScore > 0 ? Math.round(pct * a.rawScore / 100) : 0;
                                                                    totals[a.id] += earned;
                                                                    grandSum += earned;
                                                                });
                                                            });
                                                            const n = enrollments.length;
                                                            return (
                                                                <tr style={{ background: '#FFF0F5', fontWeight: 600, borderTop: '2px solid #fce7f3' }}>
                                                                    <td className="py-2 px-2 sticky left-0" style={{ background:'#FFF0F5' }}></td>
                                                                    <td className="py-2 px-2" style={{ background:'#FFF0F5' }}></td>
                                                                    <td className="py-2 px-2 whitespace-nowrap" style={{ background:'#FFF0F5', color:'#AD1457' }}>
                                                                        ค่าเฉลี่ย (x̄)
                                                                    </td>
                                                                    {unitNames.flatMap(u => [
                                                                        ...unitMap[u].map(a => (
                                                                            <td key={a.id} className="py-2 px-1 text-center border border-pink-100" style={{ color:'#C2185B' }}>
                                                                                {(totals[a.id] / n).toFixed(1)}
                                                                            </td>
                                                                        )),
                                                                        <td key={`${u}_avg`} className="py-2 px-2 text-center border border-pink-100" style={{ color:'#AD1457', background:'#FFF0F5' }}>
                                                                            {(unitMap[u].reduce((s,a) => s + totals[a.id], 0) / n).toFixed(1)}
                                                                        </td>
                                                                    ])}
                                                                    <td className="py-2 px-2 text-center border border-pink-100" style={{ background:'#FFE4EE', color:'#be185d' }}>
                                                                        {(grandSum / n).toFixed(1)}
                                                                    </td>
                                                                    <td className="py-2 px-2 text-center border border-pink-100" style={{ background:'#FFE4EE', color:'#be185d' }}>
                                                                        {totalRaw > 0 ? (grandSum / n / totalRaw * 100).toFixed(1) + '%' : '-'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* ─── TAB 4: SELF-PRACTICE SCORES ─── */}
                                {activeTab === 'practice' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                            <h3 className="font-bold text-gray-700">🎯 คะแนนการฝึกทำโจทย์ตามความสนใจ</h3>
                                            <div className="flex gap-2 flex-wrap items-center">
                                                <span className="text-xs text-gray-400">เรียงตาม:</span>
                                                <SortBtn active={practiceSort==='no'}       onClick={()=>setPracticeSort('no')}>เลขที่</SortBtn>
                                                <SortBtn active={practiceSort==='score'}    onClick={()=>setPracticeSort('score')}>คะแนนสูง↓</SortBtn>
                                                <SortBtn active={practiceSort==='problems'} onClick={()=>setPracticeSort('problems')}>โจทย์เยอะ↓</SortBtn>
                                                <button onClick={() => {
                                                    const header = ['เลขที่','รหัส','ชื่อ-สกุล','โจทย์ที่ฝึก','คะแนนรวม','ง่าย','ปานกลาง','ยาก','คะแนนเฉลี่ย'];
                                                    const rows = sortedPracticeEnrollments.map(enroll => {
                                                        const sid = enroll.studentId;
                                                        const st = students[sid];
                                                        const code = st?.studentCode || st?.email?.split('@')[0] || '';
                                                        const prac = practiceByStudent[sid] || { count:0, totalScore:0, items:[] };
                                                        const byD = (d) => prac.items.filter(p=>p.difficulty===d).length;
                                                        return [enroll.origIdx+1, code, st?.displayName||sid.slice(0,8), prac.count, prac.totalScore, byD('ง่าย'), byD('ปานกลาง'), byD('ยาก'), prac.count>0?Math.round(prac.totalScore/prac.count):0];
                                                    });
                                                    const csv = [header,...rows].map(r=>r.join(',')).join('\n');
                                                    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a'); a.href=url; a.download='SelfPractice_scores.csv'; a.click();
                                                    URL.revokeObjectURL(url);
                                                }} style={{ padding:'4px 12px', borderRadius:'8px', fontSize:'12px', background:'#d1fae5', color:'#065f46', border:'none', cursor:'pointer', fontFamily:"'Prompt',sans-serif", fontWeight:600 }}>
                                                    📥 Export CSV
                                                </button>
                                                <button onClick={loadPracticeData} disabled={practiceLoading}
                                                    style={{ padding:'4px 12px', borderRadius:'8px', fontSize:'12px', background:'#fce7f3', color:'#be185d', border:'none', cursor:'pointer', fontFamily:"'Prompt',sans-serif" }}>
                                                    {practiceLoading ? '⏳' : '🔄 รีเฟรช'}
                                                </button>
                                            </div>
                                        </div>

                                        {practiceLoading ? <Spinner /> : (
                                            <>
                                                {/* Summary stats */}
                                                <div className="grid grid-cols-3 gap-4 mb-6">
                                                    {[
                                                        { label: 'นักเรียนที่ฝึก', value: Object.keys(practiceByStudent).length, icon: '👥' },
                                                        { label: 'โจทย์ที่ฝึกรวม', value: practiceData.length, icon: '📝' },
                                                        { label: 'คะแนนรวมทั้งหมด', value: practiceData.reduce((s, p) => s + (p.actualScore || 0), 0), icon: '⭐' },
                                                    ].map(s => (
                                                        <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: '#fdf2f8', border: '1px solid #fce7f3' }}>
                                                            <div className="text-2xl mb-1">{s.icon}</div>
                                                            <div className="text-xl font-bold" style={{ color: '#be185d' }}>{s.value}</div>
                                                            <div className="text-xs text-gray-500">{s.label}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Per-student table */}
                                                {enrollments.length === 0 ? (
                                                    <p className="text-gray-400 text-sm text-center py-6">ยังไม่มีนักเรียนลงทะเบียน</p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr style={{ borderBottom: '2px solid #fce7f3' }}>
                                                                    {['#', 'รหัส', 'นักเรียน', 'โจทย์ที่ฝึก', 'คะแนนรวม', 'ง่าย', 'ปานกลาง', 'ยาก', 'คะแนนเฉลี่ย'].map(h => (
                                                                        <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-gray-500">{h}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {sortedPracticeEnrollments.map((enroll) => {
                                                                    const sid = enroll.studentId;
                                                                    const student = students[sid];
                                                                    const code = student?.studentCode || student?.email?.split('@')[0] || '';
                                                                    const prac = practiceByStudent[sid] || { count: 0, totalScore: 0, items: [] };
                                                                    const byDiff = (d) => prac.items.filter(p => p.difficulty === d);
                                                                    return (
                                                                        <tr key={sid} style={{ borderBottom: '1px solid #fce7f3' }} className="hover:bg-pink-50">
                                                                            <td className="py-2 px-2 text-center text-gray-400 text-xs">{enroll.origIdx + 1}</td>
                                                                            <td className="py-2 px-2 text-gray-500 text-xs whitespace-nowrap">{code}</td>
                                                                            <td className="py-2 px-2 font-medium text-gray-800">
                                                                                {student?.displayName || sid.slice(0, 8)}
                                                                            </td>
                                                                            <td className="py-2 px-2 text-center">
                                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${prac.count > 0 ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-400'}`}>
                                                                                    {prac.count} โจทย์
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-2 px-2 text-center font-bold" style={{ color: prac.totalScore > 0 ? '#be185d' : '#9ca3af' }}>
                                                                                {prac.totalScore} คะแนน
                                                                            </td>
                                                                            {['ง่าย', 'ปานกลาง', 'ยาก'].map(d => (
                                                                                <td key={d} className="py-2 px-2 text-center text-xs text-gray-600">
                                                                                    {byDiff(d).length > 0 ? `${byDiff(d).length} โจทย์` : <span className="text-gray-300">-</span>}
                                                                                </td>
                                                                            ))}
                                                                            <td className="py-2 px-2 text-center text-xs" style={{ color: '#ec4899' }}>
                                                                                {prac.count > 0 ? Math.round(prac.totalScore / prac.count) : '-'}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {/* Recent practice submissions */}
                                                {practiceData.length > 0 && (
                                                    <div className="mt-8">
                                                        <h3 className="font-bold text-gray-700 mb-3">📜 ประวัติการฝึกล่าสุด (20 รายการ)</h3>
                                                        <div className="space-y-2">
                                                            {practiceData
                                                                .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
                                                                .slice(0, 20)
                                                                .map(p => {
                                                                    const diffColor = p.difficulty === 'ยาก' ? '#dc2626' : p.difficulty === 'ปานกลาง' ? '#d97706' : '#16a34a';
                                                                    return (
                                                                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl"
                                                                            style={{ background: '#fdf2f8', border: '1px solid #fce7f3' }}>
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                                                                                    style={{ background: diffColor + '20', color: diffColor }}>
                                                                                    {p.difficulty}
                                                                                </span>
                                                                                <div className="min-w-0">
                                                                                    <div className="font-medium text-gray-800 text-sm truncate">{p.problemTitle}</div>
                                                                                    <div className="text-xs text-gray-400">
                                                                                        {students[p.studentId]?.displayName || p.displayName} · {p.passedTests}/{p.totalTests} ผ่าน
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-right shrink-0 ml-3">
                                                                                <div className="font-bold text-sm" style={{ color: '#be185d' }}>{p.actualScore} คะแนน</div>
                                                                                <div className="text-xs text-gray-400">
                                                                                    {p.submittedAt?.toDate ? p.submittedAt.toDate().toLocaleDateString('th-TH') : '-'}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* ─── TAB 5: AI CLASS REPORT ─── */}
                                {activeTab === 'aireport' && (
                                    <div>
                                        <div className="text-center mb-8">
                                            <div className="text-5xl mb-3">🤖</div>
                                            <h3 className="text-lg font-bold text-gray-700 mb-1">รายงาน AI วิเคราะห์ห้องเรียน</h3>
                                            <p className="text-sm text-gray-500 mb-5">AI จะวิเคราะห์ข้อมูลทั้งหมดและสรุปเป็นรายงาน</p>
                                            <button onClick={handleGenerateClassReport}
                                                disabled={classReportLoading}
                                                className="k-btn-pink px-8 py-3 text-sm disabled:opacity-50">
                                                {classReportLoading ? '⏳ AI กำลังวิเคราะห์ห้องเรียน...' : '✨ สร้างรายงาน AI'}
                                            </button>
                                        </div>

                                        {classReportLoading && (
                                            <div className="text-center py-10 text-gray-400">
                                                <div className="text-4xl mb-3" style={{ animation: 'lms-spin 2s linear infinite', display: 'inline-block' }}>⚙️</div>
                                                <p>กำลังวิเคราะห์ข้อมูลห้องเรียน...</p>
                                            </div>
                                        )}

                                        {classReport && (
                                            <div className="space-y-6">
                                                {/* Summary banner */}
                                                <div className="rounded-2xl p-6" style={{
                                                    background: 'linear-gradient(135deg, #FFF0F5 0%, #FFD1DC 100%)',
                                                    border: '1px solid #FFB6C8',
                                                }}>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="text-3xl">📋</span>
                                                        <div>
                                                            <div className="font-bold text-lg" style={{ color: '#AD1457' }}>สรุปภาพรวมห้องเรียน</div>
                                                            <div className="text-xs text-pink-400">{courses.find(c => c.id === selectedCourse)?.title}</div>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700 leading-relaxed">{classReport.summary}</p>
                                                </div>

                                                {/* Strengths + Challenges */}
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    <div className="rounded-2xl p-5 bg-green-50 border border-green-100">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className="text-xl">💪</span>
                                                            <span className="font-bold text-green-700">จุดแข็งของห้องเรียน</span>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {(classReport.strengths || []).map((s, i) => (
                                                                <li key={i} className="flex gap-2 text-sm text-gray-700">
                                                                    <span className="text-green-500 font-bold shrink-0">✓</span>
                                                                    <span>{s}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div className="rounded-2xl p-5 bg-orange-50 border border-orange-100">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className="text-xl">⚠️</span>
                                                            <span className="font-bold text-orange-700">ความท้าทาย</span>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {(classReport.challenges || []).map((c, i) => (
                                                                <li key={i} className="flex gap-2 text-sm text-gray-700">
                                                                    <span className="text-orange-500 font-bold shrink-0">!</span>
                                                                    <span>{c}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                {/* Needs Help */}
                                                {classReport.needsHelp && classReport.needsHelp.length > 0 && (
                                                    <div className="rounded-2xl p-5 bg-red-50 border border-red-100">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className="text-xl">🆘</span>
                                                            <span className="font-bold text-red-700">นักเรียนที่ควรได้รับความช่วยเหลือเพิ่มเติม</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {classReport.needsHelp.map((name, i) => (
                                                                <span key={i} className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium">{name}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Self-Practice Insight */}
                                                {classReport.practiceInsight && (
                                                    <div className="rounded-2xl p-5" style={{ background: '#fdf2f8', border: '1px solid #fce7f3' }}>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className="text-xl">🎯</span>
                                                            <span className="font-bold" style={{ color: '#be185d' }}>ภาพรวมการฝึกเอง</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed">{classReport.practiceInsight}</p>
                                                    </div>
                                                )}

                                                {/* Recommendations */}
                                                <div className="rounded-2xl p-5 bg-blue-50 border border-blue-100">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-xl">💡</span>
                                                        <span className="font-bold text-blue-700">ข้อเสนอแนะสำหรับครู</span>
                                                    </div>
                                                    <ol className="space-y-2">
                                                        {(classReport.recommendations || []).map((r, i) => (
                                                            <li key={i} className="flex gap-3 text-sm text-gray-700">
                                                                <span className="font-bold text-blue-500 shrink-0">{i + 1}.</span>
                                                                <span>{r}</span>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

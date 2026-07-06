// js/pages/student/Gradebook.js - v5.2 personal scorecard grid (like teacher E1)

const Gradebook = () => {
    const { user, userDoc } = useAuth();
    const [allAssignments, setAllAssignments] = React.useState([]);
    const [gradeMap, setGradeMap]             = React.useState({});
    const [enrolledCourses, setEnrolledCourses] = React.useState([]);
    const [selectedCourseId, setSelectedCourseId] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter]   = React.useState('all'); // 'all'|'done'|'pending'

    // Extract unit number for sort (e.g. "หน่วยที่ 2 …" → 2)
    const unitNo = (name = '') => {
        const m = name.match(/(\d+)/);
        return m ? parseInt(m[1]) : 999;
    };

    React.useEffect(() => {
        if (!user?.uid) return;
        db.collection('enrollments').where('studentId', '==', user.uid).get()
            .then(async snap => {
                const courseIds = [...new Set(snap.docs.map(d => d.data().courseId))];
                if (!courseIds.length) { setLoading(false); return; }
                const snaps = await Promise.all(
                    courseIds.slice(0, 10).map(id => db.collection('courses').doc(id).get())
                );
                const courses = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
                setEnrolledCourses(courses);
                const first = courses[0]?.id || '';
                setSelectedCourseId(first);
                if (first) loadData(first);
                else setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [user?.uid]);

    const loadData = async (courseId) => {
        if (!userDoc || !courseId) return;
        setLoading(true);
        try {
            const [assignSnap, gradeSnap] = await Promise.all([
                db.collection('assignments').where('courseId', '==', courseId).get(),
                db.collection('grades')
                    .where('studentId', '==', userDoc.id)
                    .where('courseId', '==', courseId)
                    .get(),
            ]);
            const assigns = assignSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => {
                    const ud = unitNo(a.unitName) - unitNo(b.unitName);
                    return ud !== 0 ? ud : (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                });
            setAllAssignments(assigns);
            const gmap = {};
            gradeSnap.docs.forEach(d => { gmap[d.data().assignmentId] = { id: d.id, ...d.data() }; });
            setGradeMap(gmap);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleCourseChange = (courseId) => {
        setSelectedCourseId(courseId);
        setAllAssignments([]);
        setGradeMap({});
        setFilter('all');
        loadData(courseId);
    };

    // ── Derived stats ────────────────────────────────────────────
    const selectedCourse = enrolledCourses.find(c => c.id === selectedCourseId);
    const totalCount   = allAssignments.length;
    const doneCount    = allAssignments.filter(a => gradeMap[a.id]).length;
    const pendingCount = totalCount - doneCount;

    // Raw points totals (when maxScore available from grade doc)
    let grandEarned = 0, grandMax = 0;
    allAssignments.forEach(a => {
        const g = gradeMap[a.id];
        if (g && g.maxScore > 0) {
            grandEarned += Math.round((g.score || 0) * g.maxScore / 100);
            grandMax    += g.maxScore;
        }
    });
    const grandPct = grandMax > 0 ? (grandEarned / grandMax * 100).toFixed(1) : null;
    const passCount = allAssignments.filter(a => gradeMap[a.id] && (gradeMap[a.id].score || 0) >= 60).length;

    // ── Group assignments by unit ────────────────────────────────
    const unitNames = [];
    const unitMap   = {};
    allAssignments.forEach(a => {
        const u = a.unitName || 'ไม่ระบุหน่วย';
        if (!unitMap[u]) { unitMap[u] = []; unitNames.push(u); }
        unitMap[u].push(a);
    });

    // Apply filter
    const filteredUnitMap = {};
    unitNames.forEach(u => {
        const rows = filter === 'all'    ? unitMap[u]
                   : filter === 'done'   ? unitMap[u].filter(a =>  gradeMap[a.id])
                   : unitMap[u].filter(a => !gradeMap[a.id]);
        if (rows.length) filteredUnitMap[u] = rows;
    });
    const filteredUnitNames = unitNames.filter(u => filteredUnitMap[u]);

    // ── Score cell helper ────────────────────────────────────────
    const scoreColor = (pct) =>
        pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';

    const TABS = [
        { key: 'all',     label: 'ทุกข้อ',       icon: '📋', count: totalCount },
        { key: 'done',    label: 'ที่ทำแล้ว',     icon: '✅', count: doneCount },
        { key: 'pending', label: 'ยังไม่ได้ทำ',  icon: '⏳', count: pendingCount },
    ];

    let rowIdx = 0; // global row counter across units

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="สมุดเกรด" />
            <main className="max-w-5xl mx-auto px-4 py-8">

                <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 สมุดเกรดของฉัน</h2>

                {/* Course selector */}
                {enrolledCourses.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
                        <label className="block text-sm font-medium text-gray-600 mb-2">📚 เลือกรายวิชา</label>
                        <select value={selectedCourseId} onChange={e => handleCourseChange(e.target.value)} className="k-input">
                            {enrolledCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                )}

                {loading ? <Spinner /> : enrolledCourses.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-5xl mb-3">📭</div>
                        <p>ยังไม่ได้ลงทะเบียนวิชาใด</p>
                    </div>
                ) : totalCount === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-5xl mb-3">📋</div>
                        <p className="text-lg font-medium">ยังไม่มีโจทย์ในวิชานี้</p>
                    </div>
                ) : (
                    <>
                        {/* ── Summary card ── */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">📚 {selectedCourse?.title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        ส่งงานแล้ว {doneCount}/{totalCount} ข้อ
                                        {pendingCount > 0 && <span className="ml-2 text-orange-500">· ยังเหลือ {pendingCount} ข้อ</span>}
                                    </p>
                                </div>
                                <div className="flex gap-6">
                                    {grandPct !== null && (
                                        <div className="text-center">
                                            <div className={`text-3xl font-bold`} style={{ color: scoreColor(parseFloat(grandPct)) }}>
                                                {grandEarned}<span className="text-base text-gray-400">/{grandMax}</span>
                                            </div>
                                            <div className="text-xs text-gray-500">คะแนนรวม</div>
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <div className="text-3xl font-bold" style={{ color: '#EC407A' }}>{passCount}</div>
                                        <div className="text-xs text-gray-500">โจทย์ที่ผ่าน</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-blue-500">
                                            {doneCount}<span className="text-base text-gray-400">/{totalCount}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">ส่งแล้ว</div>
                                    </div>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>ความคืบหน้าการส่งงาน</span>
                                    <span>{totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0}%</span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0}%`,
                                            background: doneCount / totalCount >= 0.8
                                                ? 'linear-gradient(90deg,#16a34a,#4ade80)'
                                                : doneCount / totalCount >= 0.5
                                                    ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                                                    : 'linear-gradient(90deg,#EC407A,#f48fb1)',
                                        }} />
                                </div>
                            </div>
                        </div>

                        {/* ── Filter tabs ── */}
                        <div className="flex gap-2 mb-4">
                            {TABS.map(tab => (
                                <button key={tab.key} onClick={() => setFilter(tab.key)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                        filter === tab.key
                                            ? 'text-white shadow-sm'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600'
                                    }`}
                                    style={filter === tab.key ? { background: 'linear-gradient(135deg,#EC407A,#C2185B)' } : {}}>
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        {/* ── Score grid table ── */}
                        {filteredUnitNames.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                                <div className="text-4xl mb-2">{filter === 'done' ? '📭' : '🎉'}</div>
                                <p>{filter === 'done' ? 'ยังไม่ได้ส่งงานเลย' : 'ทำครบทุกข้อแล้ว!'}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-pink-100 shadow-sm bg-white">
                                <table className="text-xs border-collapse" style={{ minWidth: '100%' }}>
                                    <thead>
                                        <tr style={{ background: '#FFF0F5' }}>
                                            <th className="py-2 px-3 border border-pink-100 text-center font-semibold text-gray-500 whitespace-nowrap" style={{ minWidth: 32 }}>#</th>
                                            <th className="py-2 px-3 border border-pink-100 text-left font-semibold text-gray-500 whitespace-nowrap" style={{ minWidth: 200 }}>โจทย์</th>
                                            <th className="py-2 px-3 border border-pink-100 text-center font-semibold text-gray-500 whitespace-nowrap">คะแนนเต็ม</th>
                                            <th className="py-2 px-3 border border-pink-100 text-center font-semibold text-gray-500 whitespace-nowrap">ได้</th>
                                            <th className="py-2 px-3 border border-pink-100 text-center font-semibold text-gray-500 whitespace-nowrap">%</th>
                                            <th className="py-2 px-3 border border-pink-100 text-center font-semibold text-gray-500 whitespace-nowrap">สถานะ</th>
                                            <th className="py-2 px-3 border border-pink-100 text-center font-semibold text-gray-500 whitespace-nowrap">วันที่ส่ง</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUnitNames.map(unitName => {
                                            const rows = filteredUnitMap[unitName];
                                            // Unit subtotals
                                            let unitEarned = 0, unitMax = 0, unitDone = 0;
                                            rows.forEach(a => {
                                                const g = gradeMap[a.id];
                                                if (g) {
                                                    unitDone++;
                                                    if (g.maxScore > 0) {
                                                        unitEarned += Math.round((g.score || 0) * g.maxScore / 100);
                                                        unitMax    += g.maxScore;
                                                    }
                                                }
                                            });
                                            const unitPct = unitMax > 0 ? (unitEarned / unitMax * 100).toFixed(1) : null;

                                            return (
                                                <React.Fragment key={unitName}>
                                                    {/* Unit header row */}
                                                    <tr style={{ background: '#FFF0F5' }}>
                                                        <td colSpan={7} className="py-2 px-3 border border-pink-100">
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                <span className="font-bold text-sm" style={{ color: '#AD1457' }}>
                                                                    📁 {unitName}
                                                                </span>
                                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                    <span>ส่งแล้ว <strong style={{ color: '#EC407A' }}>{unitDone}/{rows.length}</strong> ข้อ</span>
                                                                    {unitPct !== null && (
                                                                        <span className="font-semibold" style={{ color: scoreColor(parseFloat(unitPct)) }}>
                                                                            {unitEarned}/{unitMax} คะแนน ({unitPct}%)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Assignment rows */}
                                                    {rows.map(a => {
                                                        rowIdx++;
                                                        const g     = gradeMap[a.id];
                                                        const done  = !!g;
                                                        const pct   = done ? (g.score || 0) : null;
                                                        const max   = done && g.maxScore > 0 ? g.maxScore : null;
                                                        const earned = max !== null ? Math.round((pct) * max / 100) : null;
                                                        const passed = done && pct >= 60;
                                                        const dateStr = done && g.gradedAt?.toDate
                                                            ? g.gradedAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                                                            : null;

                                                        return (
                                                            <tr key={a.id} className="hover:bg-pink-50"
                                                                style={{ borderBottom: '1px solid #fce7f3', opacity: done ? 1 : 0.7 }}>
                                                                {/* # */}
                                                                <td className="py-2 px-3 text-center text-gray-400 border border-pink-50">{rowIdx}</td>
                                                                {/* Title */}
                                                                <td className="py-2 px-3 border border-pink-50">
                                                                    <p className="font-medium text-gray-800" style={{ fontSize: '13px' }}>{a.title || 'โจทย์'}</p>
                                                                    {a.difficulty && (
                                                                        <p className="text-gray-400" style={{ fontSize: '11px' }}>{a.difficulty}</p>
                                                                    )}
                                                                </td>
                                                                {/* Max score */}
                                                                <td className="py-2 px-3 text-center border border-pink-50 text-gray-500">
                                                                    {max !== null ? max : <span className="text-gray-200">—</span>}
                                                                </td>
                                                                {/* Earned */}
                                                                <td className="py-2 px-3 text-center border border-pink-50 font-bold"
                                                                    style={{ color: done ? scoreColor(pct) : '#d1d5db', fontSize: '13px' }}>
                                                                    {earned !== null ? earned : done ? <span style={{ color: scoreColor(pct) }}>{pct}%</span> : <span className="text-gray-200">—</span>}
                                                                </td>
                                                                {/* % */}
                                                                <td className="py-2 px-3 text-center border border-pink-50 font-semibold"
                                                                    style={{ color: done ? scoreColor(pct) : '#d1d5db' }}>
                                                                    {done ? `${pct}%` : <span className="text-gray-200">—</span>}
                                                                </td>
                                                                {/* Status */}
                                                                <td className="py-2 px-3 text-center border border-pink-50">
                                                                    {done ? (
                                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                                            {passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-50 text-orange-500 border border-orange-200">
                                                                            ⏳ ยังไม่ส่ง
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {/* Date */}
                                                                <td className="py-2 px-3 text-center border border-pink-50 text-gray-400">
                                                                    {dateStr || '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}

                                        {/* Grand total row */}
                                        {filter === 'all' && grandMax > 0 && (
                                            <tr style={{ background: '#FFE4EE', borderTop: '2px solid #fce7f3', fontWeight: 700 }}>
                                                <td colSpan={2} className="py-3 px-3 border border-pink-100" style={{ color: '#AD1457' }}>
                                                    🏆 รวมทั้งหมด
                                                </td>
                                                <td className="py-3 px-3 text-center border border-pink-100" style={{ color: '#AD1457' }}>{grandMax}</td>
                                                <td className="py-3 px-3 text-center border border-pink-100 text-lg"
                                                    style={{ color: scoreColor(parseFloat(grandPct)) }}>
                                                    {grandEarned}
                                                </td>
                                                <td className="py-3 px-3 text-center border border-pink-100"
                                                    style={{ color: scoreColor(parseFloat(grandPct)) }}>
                                                    {grandPct}%
                                                </td>
                                                <td colSpan={2} className="py-3 px-3 border border-pink-100 text-gray-400 text-center" style={{ fontSize: '11px' }}>
                                                    ผ่าน {passCount}/{doneCount} ข้อที่ส่ง
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

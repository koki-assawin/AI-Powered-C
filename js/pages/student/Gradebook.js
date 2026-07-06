// js/pages/student/Gradebook.js - Student grade summary v5.1 (filter: all/done/pending)

const Gradebook = () => {
    const { user, userDoc } = useAuth();
    const [allAssignments, setAllAssignments] = React.useState([]);
    const [gradeMap, setGradeMap]             = React.useState({});
    const [enrolledCourses, setEnrolledCourses] = React.useState([]);
    const [selectedCourseId, setSelectedCourseId] = React.useState('');
    const [loading, setLoading]   = React.useState(true);
    const [filter, setFilter]     = React.useState('all'); // 'all' | 'done' | 'pending'

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
                .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            setAllAssignments(assigns);

            const gmap = {};
            gradeSnap.docs.forEach(d => { gmap[d.data().assignmentId] = { id: d.id, ...d.data() }; });
            setGradeMap(gmap);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCourseChange = (courseId) => {
        setSelectedCourseId(courseId);
        setAllAssignments([]);
        setGradeMap({});
        setFilter('all');
        loadData(courseId);
    };

    const selectedCourse = enrolledCourses.find(c => c.id === selectedCourseId);
    const totalCount  = allAssignments.length;
    const doneCount   = allAssignments.filter(a => gradeMap[a.id]).length;
    const pendingCount = totalCount - doneCount;
    const doneGrades  = allAssignments.filter(a => gradeMap[a.id]).map(a => gradeMap[a.id]);
    const avgScore    = doneGrades.length
        ? Math.round(doneGrades.reduce((s, g) => s + (g.score || 0), 0) / doneGrades.length)
        : 0;
    const passCount   = doneGrades.filter(g => (g.score || 0) >= 60).length;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    const filteredAssignments = allAssignments.filter(a => {
        if (filter === 'done')    return !!gradeMap[a.id];
        if (filter === 'pending') return !gradeMap[a.id];
        return true;
    });

    const TABS = [
        { key: 'all',     label: 'ทุกข้อ',          icon: '📋', count: totalCount },
        { key: 'done',    label: 'ที่ทำแล้ว',        icon: '✅', count: doneCount },
        { key: 'pending', label: 'ยังไม่ได้ทำ',     icon: '⏳', count: pendingCount },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="สมุดเกรด" />
            <main className="max-w-4xl mx-auto px-4 py-8">

                <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 สมุดเกรดของฉัน</h2>

                {/* Course selector */}
                {enrolledCourses.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                        <label className="block text-sm font-medium text-gray-600 mb-2">📚 เลือกรายวิชา</label>
                        <select
                            value={selectedCourseId}
                            onChange={e => handleCourseChange(e.target.value)}
                            className="k-input"
                        >
                            {enrolledCourses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
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
                        {/* Summary card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">📚 {selectedCourse?.title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        ทำแล้ว {doneCount}/{totalCount} ข้อ
                                        {pendingCount > 0 && (
                                            <span className="ml-2 text-orange-500">· ยังเหลือ {pendingCount} ข้อ</span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex gap-6">
                                    <div className="text-center">
                                        <div className={`text-3xl font-bold ${avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-yellow-600' : avgScore > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                            {doneCount > 0 ? `${avgScore}%` : '—'}
                                        </div>
                                        <div className="text-xs text-gray-500">คะแนนเฉลี่ย</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold" style={{color:'#EC407A'}}>{passCount}</div>
                                        <div className="text-xs text-gray-500">โจทย์ที่ผ่าน</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-blue-500">{doneCount}<span className="text-base text-gray-400">/{totalCount}</span></div>
                                        <div className="text-xs text-gray-500">ส่งแล้ว</div>
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div>
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>ความคืบหน้าการส่งงาน</span>
                                    <span>{progressPct}%</span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${progressPct}%`,
                                            background: progressPct >= 80
                                                ? 'linear-gradient(90deg,#16a34a,#4ade80)'
                                                : progressPct >= 50
                                                    ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                                                    : 'linear-gradient(90deg,#EC407A,#f48fb1)',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Filter tabs */}
                        <div className="flex gap-2 mb-4">
                            {TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilter(tab.key)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                        filter === tab.key
                                            ? 'text-white shadow-sm'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600'
                                    }`}
                                    style={filter === tab.key ? { background: 'linear-gradient(135deg,#EC407A,#C2185B)' } : {}}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        {/* Grade list */}
                        {filteredAssignments.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                                <div className="text-4xl mb-2">{filter === 'done' ? '📭' : '🎉'}</div>
                                <p>{filter === 'done' ? 'ยังไม่ได้ส่งงานเลย' : 'ทำครบทุกข้อแล้ว!'}</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-3 border-b border-gray-100">
                                    <div className="grid grid-cols-12 text-xs font-semibold text-gray-500 uppercase">
                                        <div className="col-span-1">#</div>
                                        <div className="col-span-5">โจทย์</div>
                                        <div className="col-span-2 text-center">สถานะ</div>
                                        <div className="col-span-2 text-center">คะแนน</div>
                                        <div className="col-span-2 text-center">วันที่</div>
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {filteredAssignments.map((assign, idx) => {
                                        const g = gradeMap[assign.id];
                                        const done = !!g;
                                        const passed = done && (g.score || 0) >= 60;
                                        return (
                                            <div key={assign.id} className={`grid grid-cols-12 items-center px-6 py-4 hover:bg-gray-50 ${!done ? 'opacity-70' : ''}`}>
                                                <div className="col-span-1 text-sm text-gray-400">{idx + 1}</div>
                                                <div className="col-span-5">
                                                    <p className="font-medium text-gray-800 text-sm">{assign.title || 'โจทย์'}</p>
                                                    {assign.unitName && (
                                                        <p className="text-xs text-gray-400 mt-0.5">{assign.unitName}</p>
                                                    )}
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    {done ? (
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                            {passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-50 text-orange-500 border border-orange-200">
                                                            ⏳ ยังไม่ส่ง
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    {done ? (
                                                        <>
                                                            <span className={`text-lg font-bold ${g.score >= 80 ? 'text-green-600' : g.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                {g.score || 0}%
                                                            </span>
                                                            {g.maxScore > 0 && (
                                                                <div className="text-xs text-gray-400">{g.maxScore} คะแนน</div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-300 text-lg">—</span>
                                                    )}
                                                </div>
                                                <div className="col-span-2 text-center text-xs text-gray-400">
                                                    {done && g.gradedAt?.toDate
                                                        ? g.gradedAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                                                        : '—'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

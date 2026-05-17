// js/pages/student/Gradebook.js - Student grade summary v2 (course selector)

const Gradebook = () => {
    const { user, userDoc } = useAuth();
    const [grades, setGrades]           = React.useState([]);
    const [assignments, setAssignments] = React.useState({});
    const [enrolledCourses, setEnrolledCourses] = React.useState([]);
    const [selectedCourseId, setSelectedCourseId] = React.useState('');
    const [loading, setLoading]         = React.useState(true);

    // Load enrolled courses from enrollments collection
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
                if (first) loadGrades(first);
                else setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [user?.uid]);

    const loadGrades = async (courseId) => {
        if (!userDoc || !courseId) return;
        setLoading(true);
        try {
            const snap = await db.collection('grades')
                .where('studentId', '==', userDoc.id)
                .where('courseId', '==', courseId)
                .get();
            const gradeData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setGrades(gradeData);

            const assignIds = [...new Set(gradeData.map(g => g.assignmentId))];
            if (assignIds.length) {
                const assignSnaps = await Promise.all(assignIds.map(id => db.collection('assignments').doc(id).get()));
                const assignMap = {};
                assignSnaps.forEach(s => { if (s.exists) assignMap[s.id] = s.data(); });
                setAssignments(assignMap);
            } else {
                setAssignments({});
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCourseChange = (courseId) => {
        setSelectedCourseId(courseId);
        setGrades([]);
        loadGrades(courseId);
    };

    const selectedCourse = enrolledCourses.find(c => c.id === selectedCourseId);
    const courseAvg = grades.length
        ? Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length)
        : 0;
    const passCount = grades.filter(g => (g.score || 0) >= 60).length;

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
                ) : grades.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-5xl mb-3">📋</div>
                        <p className="text-lg font-medium">ยังไม่มีคะแนนในวิชานี้</p>
                        <p className="text-sm mt-1">ลองส่งงานในวิชา "{selectedCourse?.title}" ดูก่อน!</p>
                    </div>
                ) : (
                    <>
                        {/* Summary card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">📚 {selectedCourse?.title}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">ส่งงานทั้งหมด {grades.length} รายการ</p>
                                </div>
                                <div className="flex gap-6">
                                    <div className="text-center">
                                        <div className={`text-3xl font-bold ${courseAvg >= 80 ? 'text-green-600' : courseAvg >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {courseAvg}%
                                        </div>
                                        <div className="text-xs text-gray-500">คะแนนเฉลี่ย</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-blue-600">{passCount}</div>
                                        <div className="text-xs text-gray-500">โจทย์ที่ผ่าน</div>
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>ความคืบหน้า</span>
                                    <span>{courseAvg}%</span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${courseAvg}%`,
                                            background: courseAvg >= 80
                                                ? 'linear-gradient(90deg,#16a34a,#4ade80)'
                                                : courseAvg >= 60
                                                    ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                                                    : 'linear-gradient(90deg,#dc2626,#f87171)',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Grade list */}
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
                                {grades
                                    .slice()
                                    .sort((a, b) => (b.gradedAt?.seconds || 0) - (a.gradedAt?.seconds || 0))
                                    .map((g, idx) => {
                                        const assign = assignments[g.assignmentId];
                                        const passed = (g.score || 0) >= 60;
                                        return (
                                            <div key={g.id} className="grid grid-cols-12 items-center px-6 py-4 hover:bg-gray-50">
                                                <div className="col-span-1 text-sm text-gray-400">{idx + 1}</div>
                                                <div className="col-span-5">
                                                    <p className="font-medium text-gray-800 text-sm">{assign?.title || 'โจทย์'}</p>
                                                    {assign?.unitName && (
                                                        <p className="text-xs text-gray-400 mt-0.5">{assign.unitName}</p>
                                                    )}
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                        {passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <span className={`text-lg font-bold ${g.score >= 80 ? 'text-green-600' : g.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {g.score || 0}%
                                                    </span>
                                                    {g.maxScore > 0 && (
                                                        <div className="text-xs text-gray-400">{g.maxScore} คะแนน</div>
                                                    )}
                                                </div>
                                                <div className="col-span-2 text-center text-xs text-gray-400">
                                                    {g.gradedAt?.toDate
                                                        ? g.gradedAt.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                                                        : '—'}
                                                </div>
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

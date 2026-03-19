// js/pages/student/Gradebook.js - Student grade summary

const Gradebook = () => {
    const { userDoc } = useAuth();
    const [grades, setGrades] = React.useState([]);
    const [assignments, setAssignments] = React.useState({});
    const [courses, setCourses] = React.useState({});
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => { if (userDoc) loadGrades(); }, [userDoc]);

    const loadGrades = async () => {
        setLoading(true);
        try {
            const snap = await db.collection('grades')
                .where('studentId', '==', userDoc.id)
                .get();
            const gradeData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setGrades(gradeData);

            // Load assignment details
            const assignIds = [...new Set(gradeData.map(g => g.assignmentId))];
            const courseIds = [...new Set(gradeData.map(g => g.courseId))];

            const [assignSnaps, courseSnaps] = await Promise.all([
                Promise.all(assignIds.map(id => db.collection('assignments').doc(id).get())),
                Promise.all(courseIds.map(id => db.collection('courses').doc(id).get())),
            ]);

            const assignMap = {};
            assignSnaps.forEach(s => { if (s.exists) assignMap[s.id] = s.data(); });
            const courseMap = {};
            courseSnaps.forEach(s => { if (s.exists) courseMap[s.id] = s.data(); });

            setAssignments(assignMap);
            setCourses(courseMap);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Group by course
    const byCourse = grades.reduce((acc, g) => {
        if (!acc[g.courseId]) acc[g.courseId] = [];
        acc[g.courseId].push(g);
        return acc;
    }, {});

    const overallAvg = grades.length
        ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Platform" subtitle="สมุดเกรด" />
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">📊 สมุดเกรดของฉัน</h2>
                    {grades.length > 0 && (
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">{overallAvg}%</div>
                            <div className="text-xs text-gray-500">คะแนนเฉลี่ยรวม</div>
                        </div>
                    )}
                </div>

                {loading ? <Spinner /> : grades.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-5xl mb-3">📋</div>
                        <p>ยังไม่มีคะแนน ลองส่งงานดูก่อน!</p>
                    </div>
                ) : Object.entries(byCourse).map(([cId, cGrades]) => {
                    const course = courses[cId];
                    const courseAvg = Math.round(cGrades.reduce((s, g) => s + g.score, 0) / cGrades.length);
                    return (
                        <div key={cId} className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{course?.title || 'รายวิชา'}</h3>
                                    <p className="text-sm text-gray-500">{LANGUAGES[course?.language]?.name}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold" style={{
                                        color: courseAvg >= 80 ? '#16a34a' : courseAvg >= 60 ? '#d97706' : '#dc2626'
                                    }}>
                                        {courseAvg}%
                                    </div>
                                    <div className="text-xs text-gray-500">เฉลี่ย</div>
                                </div>
                            </div>

                            <div className="divide-y divide-gray-50">
                                {cGrades.map(g => {
                                    const assign = assignments[g.assignmentId];
                                    return (
                                        <div key={g.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                            <div>
                                                <p className="font-medium text-gray-800">{assign?.title || 'โจทย์'}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {g.gradedAt?.toDate
                                                        ? g.gradedAt.toDate().toLocaleDateString('th-TH')
                                                        : ''}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <div className="text-right">
                                                    <div className={`text-xl font-bold ${g.score >= 80 ? 'text-green-600' : g.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {g.score}%
                                                    </div>
                                                    <div className="text-xs text-gray-400">{g.maxScore} คะแนน</div>
                                                </div>
                                                <div className={`w-3 h-3 rounded-full ${g.score >= 60 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </main>
        </div>
    );
};

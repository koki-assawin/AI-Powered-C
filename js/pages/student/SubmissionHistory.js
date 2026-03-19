// js/pages/student/SubmissionHistory.js - Full submission history

const SubmissionHistory = () => {
    const { userDoc } = useAuth();
    const [submissions, setSubmissions] = React.useState([]);
    const [assignments, setAssignments] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [selected, setSelected] = React.useState(null);

    React.useEffect(() => { if (userDoc) loadHistory(); }, [userDoc]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const snap = await db.collection('submissions')
                .where('studentId', '==', userDoc.id)
                .orderBy('submittedAt', 'desc')
                .limit(50)
                .get();
            const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSubmissions(subs);

            // Load assignment names
            const ids = [...new Set(subs.map(s => s.assignmentId))];
            const assignSnaps = await Promise.all(ids.map(id => db.collection('assignments').doc(id).get()));
            const map = {};
            assignSnaps.forEach(s => { if (s.exists) map[s.id] = s.data(); });
            setAssignments(map);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const statusInfo = (status) => STATUS_LABELS[status] || STATUS_LABELS.pending;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Platform" subtitle="ประวัติการส่งงาน" />
            <main className="max-w-6xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 ประวัติการส่งงาน</h2>

                {loading ? <Spinner /> : submissions.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-5xl mb-3">📭</div>
                        <p>ยังไม่มีประวัติการส่งงาน</p>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* List */}
                        <div className="lg:col-span-1 space-y-2">
                            {submissions.map(sub => {
                                const info = statusInfo(sub.status);
                                const assign = assignments[sub.assignmentId];
                                return (
                                    <button
                                        key={sub.id}
                                        onClick={() => setSelected(sub)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all
                                            ${selected?.id === sub.id
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-800 truncate">
                                                {assign?.title || 'โจทย์'}
                                            </span>
                                            <span className="text-lg">{info.icon}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>{sub.passedTests}/{sub.totalTests} ผ่าน</span>
                                            <span className="font-bold" style={{
                                                color: sub.score >= 80 ? '#16a34a' : sub.score >= 50 ? '#d97706' : '#dc2626'
                                            }}>
                                                {sub.score}%
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {sub.submittedAt?.toDate
                                                ? sub.submittedAt.toDate().toLocaleString('th-TH')
                                                : ''}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Detail */}
                        <div className="lg:col-span-2">
                            {!selected ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
                                    <div className="text-4xl mb-2">👆</div>
                                    <p>เลือกการส่งงานเพื่อดูรายละเอียด</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className={`p-4 flex items-center justify-between
                                        ${selected.status === 'accepted' ? 'bg-green-50' : 'bg-red-50'}`}>
                                        <div>
                                            <div className="text-xl font-bold text-gray-800">
                                                {statusInfo(selected.status).icon} {statusInfo(selected.status).text}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {selected.passedTests}/{selected.totalTests} Test Cases •{' '}
                                                {selected.executionTime}ms • {LANGUAGES[selected.language]?.name}
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold" style={{
                                            color: selected.score >= 80 ? '#16a34a' : selected.score >= 50 ? '#d97706' : '#dc2626'
                                        }}>
                                            {selected.score}%
                                        </div>
                                    </div>

                                    {/* Code */}
                                    <div className="p-4 border-b border-gray-100">
                                        <h4 className="font-bold text-gray-700 mb-2 text-sm">โค้ดที่ส่ง:</h4>
                                        <pre className="bg-gray-900 text-gray-200 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                                            {selected.code}
                                        </pre>
                                    </div>

                                    {/* Test results */}
                                    <div className="p-4">
                                        <h4 className="font-bold text-gray-700 mb-3 text-sm">ผลการตรวจ Test Cases:</h4>
                                        {(selected.testResults || []).map((r, i) => (
                                            <div key={i} className={`p-3 rounded-lg mb-2 ${r.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className={r.passed ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                                                        {r.passed ? '✓' : '✗'} Test {i + 1}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{r.executionTime}ms</span>
                                                </div>
                                                {!r.passed && r.errorLog && (
                                                    <pre className="text-xs text-red-600 mt-1 font-mono bg-red-50 p-2 rounded">
                                                        {r.errorLog}
                                                    </pre>
                                                )}
                                            </div>
                                        ))}

                                        {selected.aiMetrics && (
                                            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                                <h5 className="font-bold text-purple-700 text-sm mb-2">🤖 AI Analysis Score: {selected.aiScore}%</h5>
                                                <RadarChart analysis={{ status: 'success', metrics: selected.aiMetrics, feedback: '' }} language={selected.language} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

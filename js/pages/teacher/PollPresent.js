// js/pages/teacher/PollPresent.js - QuickPoll projector screen (Phase 1: single-round bar chart)
// Opened by the teacher in a second tab via window.open (see PollControl.js).
// See Spec_QuickPoll_APCC.md §5.3 — must never show student names/numbers,
// and must never signal the correct answer before the teacher clicks reveal.

const PollPresent = () => {
    const [sessionId] = React.useState(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        return params.get('sessionId');
    });
    const [session, setSession] = React.useState(null);
    const [responses, setResponses] = React.useState([]);
    const [revealed, setRevealed] = React.useState(false);

    React.useEffect(() => {
        if (!sessionId) return;
        const unsubs = [];
        unsubs.push(db.collection('pollSessions').doc(sessionId).onSnapshot(doc => {
            setSession(doc.exists ? { id: doc.id, ...doc.data() } : null);
        }, console.error));
        unsubs.push(db.collection('pollSessions').doc(sessionId).collection('responses').onSnapshot(snap => {
            setResponses(snap.docs.map(d => d.data()));
        }, console.error));
        return () => unsubs.forEach(fn => fn());
    }, [sessionId]);

    if (!sessionId) {
        return <div className="min-h-screen flex items-center justify-center text-2xl text-gray-500">ไม่พบรหัส session</div>;
    }
    if (!session) {
        return <div className="min-h-screen flex items-center justify-center text-2xl text-gray-500">กำลังโหลด...</div>;
    }

    const options = session.snapshot?.options || [];
    const counts = options.map(o => responses.filter(r => r.r1?.optionId === o.id).length);
    const correctOptionId = session.snapshot?.correctOptionId;

    const labels = options.map(o => `${o.id.toUpperCase()}. ${o.text}`);
    const backgroundColor = options.map(o =>
        revealed && o.id === correctOptionId ? 'rgba(16,185,129,0.85)' : 'rgba(59,130,246,0.75)'
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col p-8">
            <h1 className="font-black mb-2" style={{ fontSize: '32pt' }}>{session.snapshot?.prompt}</h1>

            {session.snapshot?.media?.code && (
                <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 font-mono overflow-x-auto"
                    style={{ fontSize: '20pt' }}>{session.snapshot.media.code}</pre>
            )}

            <div className="flex-1" style={{ position: 'relative', minHeight: '400px' }}>
                <BarChart
                    labels={labels}
                    datasets={[{ data: counts, backgroundColor, borderRadius: 6 }]}
                    options={{
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { ticks: { color: '#e5e7eb', font: { size: 20 } } },
                            y: { beginAtZero: true, ticks: { color: '#9ca3af', font: { size: 18 }, precision: 0 } },
                        },
                    }}
                />
            </div>

            <div className="flex items-center justify-between mt-6">
                <p style={{ fontSize: '24pt' }} className="font-bold text-gray-300">
                    ตอบแล้ว {responses.length} จาก {session.expectedN} คน
                </p>
                {!revealed && (session.status === 'round1_closed' || session.status === 'revealed') && (
                    <button onClick={() => setRevealed(true)}
                        className="bg-green-600 hover:bg-green-500 font-black px-8 py-4 rounded-xl"
                        style={{ fontSize: '20pt' }}>
                        ✅ เฉลย
                    </button>
                )}
            </div>
        </div>
    );
};

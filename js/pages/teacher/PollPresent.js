// js/pages/teacher/PollPresent.js - QuickPoll projector screen
// Opened by the teacher in a second tab via window.open (see PollControl.js).
// See Spec_QuickPoll_APCC.md §5.3 — must never show student names/numbers,
// and must never signal the correct answer before the teacher clicks reveal.
// Vote counts also stay hidden while a round is still open (choice type only) —
// otherwise late voters could see the trend and follow the crowd, which defeats
// "vote without consulting anyone" for round 1 and the point of round 2 discussion.
// Word-cloud (text type) is the one exception: act-Plan19.pdf's Think-Pair-Share
// step explicitly shows results live as they come in.

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

    const isText = session.snapshot?.type === 'text';
    const votingOpen = session.status === 'round1_open' || session.status === 'round2_open';

    // ── Word cloud (open text) ──
    if (isText) {
        const words = window.computePollWordCloud ? window.computePollWordCloud(responses.map(r => r.r1?.text).filter(Boolean)) : [];
        return (
            <div className="min-h-screen bg-gray-950 text-white flex flex-col p-8">
                <h1 className="font-black mb-6" style={{ fontSize: '32pt' }}>{session.snapshot?.prompt}</h1>
                <div className="flex-1 flex items-center justify-center">
                    <WordCloud words={words} />
                </div>
                <p style={{ fontSize: '20pt' }} className="font-bold text-gray-400 text-center mt-4">
                    ส่งคำตอบแล้ว {responses.filter(r => r.r1?.text).length} จาก {session.expectedN} คน
                </p>
            </div>
        );
    }

    const options = session.snapshot?.options || [];
    const correctOptionId = session.snapshot?.correctOptionId;
    const correctOption = options.find(o => o.id === correctOptionId);

    // ── Still voting: hide the breakdown, show only a live counter ──
    if (votingOpen) {
        const roundLabel = session.status === 'round2_open' ? 'รอบที่ 2' : 'รอบที่ 1';
        const answered = responses.filter(r => (session.status === 'round2_open' ? r.r2 : r.r1)).length;
        return (
            <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8 text-center">
                <h1 className="font-black mb-8" style={{ fontSize: '32pt' }}>{session.snapshot?.prompt}</h1>
                <div className="text-8xl mb-6 animate-pulse">🗳️</div>
                <p style={{ fontSize: '26pt' }} className="font-black text-blue-400">{roundLabel} — กำลังโหวต...</p>
                <p style={{ fontSize: '22pt' }} className="font-bold text-gray-400 mt-4">
                    ตอบแล้ว {answered} จาก {session.expectedN} คน
                </p>
            </div>
        );
    }

    // ── Closed: show results ──
    const countsR1 = options.map(o => responses.filter(r => r.r1?.optionId === o.id).length);
    const countsR2 = options.map(o => responses.filter(r => r.r2?.optionId === o.id).length);
    const hasRound2Data = responses.some(r => r.r2);

    const labels = options.map(o =>
        `${revealed && o.id === correctOptionId ? '✓ ' : ''}${o.id.toUpperCase()}. ${o.text}`
    );

    const datasets = hasRound2Data
        ? [
            {
                label: 'รอบที่ 1', data: countsR1, borderRadius: 6,
                backgroundColor: options.map(o => revealed && o.id === correctOptionId ? 'rgba(16,185,129,0.55)' : 'rgba(148,163,184,0.8)'),
            },
            {
                label: 'รอบที่ 2', data: countsR2, borderRadius: 6,
                backgroundColor: options.map(o => revealed && o.id === correctOptionId ? 'rgba(16,185,129,0.95)' : 'rgba(59,130,246,0.85)'),
            },
        ]
        : [{
            data: countsR1, borderRadius: 6,
            backgroundColor: options.map(o => revealed && o.id === correctOptionId ? 'rgba(16,185,129,0.85)' : 'rgba(59,130,246,0.75)'),
        }];

    // Wrong→right transition summary (only meaningful once both rounds have data)
    let transitions = null;
    if (hasRound2Data && correctOptionId) {
        transitions = { wrong_to_right: 0, right_to_right: 0, right_to_wrong: 0, wrong_to_wrong: 0 };
        responses.forEach(r => {
            if (!r.r1?.optionId || !r.r2?.optionId) return;
            const wasCorrect = r.r1.optionId === correctOptionId;
            const isCorrect = r.r2.optionId === correctOptionId;
            const key = wasCorrect ? (isCorrect ? 'right_to_right' : 'right_to_wrong') : (isCorrect ? 'wrong_to_right' : 'wrong_to_wrong');
            transitions[key]++;
        });
    }

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
                    datasets={datasets}
                    options={{
                        plugins: { legend: { display: hasRound2Data, labels: { color: '#e5e7eb', font: { size: 18 } } } },
                        scales: {
                            x: { ticks: { color: '#e5e7eb', font: { size: 20 } } },
                            y: { beginAtZero: true, ticks: { color: '#9ca3af', font: { size: 18 }, precision: 0 } },
                        },
                    }}
                />
            </div>

            <div className="flex items-center justify-between mt-6">
                <p style={{ fontSize: '24pt' }} className="font-bold text-gray-300">
                    ตอบแล้ว {hasRound2Data ? responses.filter(r => r.r2).length : responses.filter(r => r.r1).length} จาก {session.expectedN} คน
                </p>
                {!revealed && (
                    <button onClick={() => setRevealed(true)}
                        className="bg-green-600 hover:bg-green-500 font-black px-8 py-4 rounded-xl"
                        style={{ fontSize: '20pt' }}>
                        ✅ เฉลย
                    </button>
                )}
            </div>

            {revealed && correctOption && (
                <div className="mt-6 bg-green-900/40 border-2 border-green-500 rounded-xl p-5 text-center">
                    <p style={{ fontSize: '22pt' }} className="font-black text-green-400">
                        ✅ เฉลย: {correctOption.id.toUpperCase()}. {correctOption.text}
                    </p>
                </div>
            )}

            {revealed && transitions && (
                <div className="mt-4 bg-blue-900/30 border-2 border-blue-500 rounded-xl p-5 text-center">
                    <p style={{ fontSize: '22pt' }} className="font-black text-blue-300">
                        🔄 เปลี่ยนจากผิดเป็นถูก {transitions.wrong_to_right} คน
                    </p>
                    <p style={{ fontSize: '14pt' }} className="text-gray-400 mt-1">
                        ถูกทั้งสองรอบ {transitions.right_to_right} • เปลี่ยนจากถูกเป็นผิด {transitions.right_to_wrong} • ผิดทั้งสองรอบ {transitions.wrong_to_wrong}
                    </p>
                </div>
            )}
        </div>
    );
};

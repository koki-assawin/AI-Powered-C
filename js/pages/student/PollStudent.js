// js/pages/student/PollStudent.js - QuickPoll student screen (Phase 1: round 1 only)
// See Spec_QuickPoll_APCC.md §5.1. Never show room-wide totals here — that would
// let late responders copy earlier answers, defeating the point of round 1.

const PollStudent = () => {
    const { user, userDoc } = useAuth();
    const [session, setSession] = React.useState(null);
    const [myResponse, setMyResponse] = React.useState(null);
    const [submitting, setSubmitting] = React.useState(false);

    // Latest non-draft session for my class
    React.useEffect(() => {
        if (!userDoc?.classId) return;
        const unsub = db.collection('pollSessions')
            .where('classId', '==', userDoc.classId)
            .where('status', 'in', ['round1_open', 'round1_closed', 'revealed'])
            .orderBy('taughtOn', 'desc')
            .limit(1)
            .onSnapshot(snap => {
                setSession(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
            }, console.error);
        return unsub;
    }, [userDoc?.classId]);

    // My own response for this session
    React.useEffect(() => {
        if (!session?.id || !user) { setMyResponse(null); return; }
        const unsub = db.collection('pollSessions').doc(session.id).collection('responses').doc(user.uid)
            .onSnapshot(doc => setMyResponse(doc.exists ? doc.data() : null), console.error);
        return unsub;
    }, [session?.id, user]);

    const answer = async (optionId) => {
        if (!session || session.status !== 'round1_open' || submitting) return;
        setSubmitting(true);
        try {
            await db.collection('pollSessions').doc(session.id).collection('responses').doc(user.uid).set({
                studentUid: user.uid,
                r1: { optionId, at: serverTimestamp() },
            }, { merge: true });
        } catch (err) {
            console.error(err);
            alert('ส่งคำตอบไม่สำเร็จ: ' + err.message);
        }
        setSubmitting(false);
    };

    if (!userDoc?.classId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8 text-center">
                <p className="text-gray-500">บัญชีของคุณยังไม่ถูกกำหนดห้องเรียน กรุณาแจ้งครูผู้สอน</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-xl font-bold text-gray-600">รอครูเปิดคำถาม</p>
            </div>
        );
    }

    const isClosed = session.status === 'round1_closed' || session.status === 'revealed';
    const options = session.snapshot?.options || [];

    if (isClosed) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-xl font-bold text-gray-700">ส่งคำตอบแล้ว</p>
                <p className="text-gray-500 mt-2">รอครูฉายผลหน้าจอ</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 flex flex-col">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{session.snapshot?.stage}</p>
            <h1 className="text-xl font-bold text-gray-800 mb-4">{session.snapshot?.prompt}</h1>

            {session.snapshot?.media?.code && (
                <pre className="bg-gray-900 text-gray-100 text-sm rounded-lg p-3 mb-4 overflow-x-auto font-mono">{session.snapshot.media.code}</pre>
            )}

            <div className="flex flex-col gap-3 mt-2">
                {options.map(o => {
                    const selected = myResponse?.r1?.optionId === o.id;
                    return (
                        <button key={o.id} onClick={() => answer(o.id)} disabled={submitting}
                            style={{ minHeight: 56 }}
                            className={`rounded-xl px-4 text-left font-semibold text-base border-2 transition-colors ${
                                selected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-800 hover:border-blue-400'}`}>
                            <span className="font-black mr-2">{o.id.toUpperCase()}.</span>{o.text}
                            {selected && <span className="float-right">✓</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

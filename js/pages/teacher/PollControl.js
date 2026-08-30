// js/pages/teacher/PollControl.js - QuickPoll teacher control screen (Phase 1: round 1 only)
// See Spec_QuickPoll_APCC.md §5.2, §5.4

const POLL_PLAN_ID = '19';
const POLL_SUBJECT = 'ว31281';

const SAMPLE_TEMPLATES = [
    {
        subject: POLL_SUBJECT, planId: POLL_PLAN_ID, unitId: '3', stage: 'E2', seq: 1,
        loCode: 'LO7', bloom: 'Analyze', type: 'choice',
        prompt: 'ถ้ารันโค้ดชุดนี้ จะได้อะไร',
        media: { code: 'for(i=1; i>0; i++) { printf("%d ", i); }', language: 'c', imageUrl: null, text: null },
        options: [
            { id: 'a', text: 'แสดง 1 2 3 4 5 แล้วจบ' },
            { id: 'b', text: 'แสดงเลข 1 ซ้ำไม่รู้จบ' },
            { id: 'c', text: 'ไม่แสดงอะไรเลย' },
            { id: 'd', text: 'คอมไพล์ไม่ผ่าน' },
        ],
        correctOptionId: 'b',
        misconceptions: {
            a: 'เข้าใจว่า for เพิ่มค่าให้เองเหมือน i++',
            c: 'เข้าใจว่าเงื่อนไขเป็นเท็จตั้งแต่รอบแรก',
            d: 'สับสนระหว่างความผิดพลาดเชิงตรรกะกับไวยากรณ์',
        },
        defaultRounds: 2, defaultSeconds: { r1: 150, r2: 60 }, tags: ['for-loop', 'infinite-loop'],
    },
    {
        subject: POLL_SUBJECT, planId: POLL_PLAN_ID, unitId: '3', stage: 'E2', seq: 2,
        loCode: 'LO7', bloom: 'Analyze', type: 'choice',
        prompt: 'ตัวแปร int x = 5; ถ้าเขียน x++ + ++x; ค่าของ x หลังบรรทัดนี้คือเท่าใด',
        media: { code: 'int x = 5;\nx++ + ++x;', language: 'c', imageUrl: null, text: null },
        options: [
            { id: 'a', text: '5' },
            { id: 'b', text: '6' },
            { id: 'c', text: '7' },
            { id: 'd', text: '8' },
        ],
        correctOptionId: 'c',
        misconceptions: {
            a: 'เข้าใจว่า x ไม่เปลี่ยนแปลงเพราะเป็นนิพจน์เดียว',
            b: 'นับเฉพาะ ++x และลืม x++',
            d: 'นับ x++ และ ++x เป็นการเพิ่มค่าคนละตัวโดยไม่รวมกัน',
        },
        defaultRounds: 2, defaultSeconds: { r1: 150, r2: 60 }, tags: ['increment', 'operator-precedence'],
    },
    {
        subject: POLL_SUBJECT, planId: POLL_PLAN_ID, unitId: '3', stage: 'E2', seq: 3,
        loCode: 'LO7', bloom: 'Analyze', type: 'choice',
        prompt: 'ลูปนี้จะพิมพ์ตัวเลขกี่ครั้ง',
        media: { code: 'for(int i = 0; i < 10; i += 3) {\n    printf("%d\\n", i);\n}', language: 'c', imageUrl: null, text: null },
        options: [
            { id: 'a', text: '3 ครั้ง' },
            { id: 'b', text: '4 ครั้ง' },
            { id: 'c', text: '10 ครั้ง' },
            { id: 'd', text: 'ไม่พิมพ์เลย' },
        ],
        correctOptionId: 'b',
        misconceptions: {
            a: 'หาร 10 ด้วย 3 แล้วปัดเศษทิ้งโดยไม่นับรอบแรกที่ i=0',
            c: 'เข้าใจว่า i += 3 เหมือน i++ คือเพิ่มทีละ 1',
            d: 'เข้าใจว่าเงื่อนไข i < 10 เป็นเท็จตั้งแต่ต้น',
        },
        defaultRounds: 2, defaultSeconds: { r1: 150, r2: 60 }, tags: ['for-loop', 'step'],
    },
];

const POLL_ADVICE = (rate) => {
    if (rate < 0.35) return { color: 'red', text: 'ผู้เรียนส่วนใหญ่ยังเข้าใจคลาดเคลื่อน ควรอธิบายเพิ่มเติมก่อนให้ถกเถียง' };
    if (rate <= 0.70) return { color: 'green', text: 'ช่วงที่เหมาะที่สุดสำหรับการถกเถียงกับเพื่อน ให้เปิดรอบที่ 2 ได้เลย' };
    return { color: 'blue', text: 'ผู้เรียนส่วนใหญ่เข้าใจแล้ว อาจข้ามรอบที่ 2 แล้วไปคำถามถัดไปเพื่อประหยัดเวลา' };
};

const PollControl = () => {
    const { user } = useAuth();

    const [classes, setClasses] = React.useState([]);
    const [classId, setClassId] = React.useState('');
    const [expectedN, setExpectedN] = React.useState(0);

    const [templates, setTemplates] = React.useState([]);
    const [seeding, setSeeding] = React.useState(false);

    const [sessionId, setSessionId] = React.useState(null);
    const [session, setSession] = React.useState(null);
    const [responses, setResponses] = React.useState([]);

    const [secondsLeft, setSecondsLeft] = React.useState(null);
    const timerRef = React.useRef(null);

    // Load classes once
    React.useEffect(() => {
        db.collection('classes').get().then(snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setClasses(list);
            if (list.length) setClassId(list[0].id);
        }).catch(console.error);
    }, []);

    // Roster count when class changes
    React.useEffect(() => {
        if (!classId) { setExpectedN(0); return; }
        db.collection('users').where('classId', '==', classId).get()
            .then(snap => setExpectedN(snap.size))
            .catch(console.error);
    }, [classId]);

    // Load question bank for plan 19
    React.useEffect(() => {
        db.collection('pollTemplates').where('planId', '==', POLL_PLAN_ID)
            .get()
            .then(snap => setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.seq || 0) - (b.seq || 0))))
            .catch(console.error);
    }, [seeding]);

    // Live session + responses
    React.useEffect(() => {
        if (!sessionId) { setSession(null); setResponses([]); return; }
        const unsubs = [];
        unsubs.push(db.collection('pollSessions').doc(sessionId).onSnapshot(doc => {
            setSession(doc.exists ? { id: doc.id, ...doc.data() } : null);
        }, console.error));
        unsubs.push(db.collection('pollSessions').doc(sessionId).collection('responses').onSnapshot(snap => {
            setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, console.error));
        return () => unsubs.forEach(fn => fn());
    }, [sessionId]);

    // Countdown timer, driven by openedAt.r1 + template.defaultSeconds.r1
    React.useEffect(() => {
        clearInterval(timerRef.current);
        if (!session || session.status !== 'round1_open' || !session.openedAt?.r1?.toDate) {
            setSecondsLeft(null);
            return;
        }
        const totalSec = session.snapshot?.defaultSeconds?.r1 || 150;
        const tick = () => {
            const elapsed = (Date.now() - session.openedAt.r1.toDate().getTime()) / 1000;
            setSecondsLeft(Math.max(0, Math.round(totalSec - elapsed)));
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
        return () => clearInterval(timerRef.current);
    }, [session]);

    const seedSamples = async () => {
        setSeeding(true);
        try {
            const batch = db.batch();
            SAMPLE_TEMPLATES.forEach(t => {
                const ref = db.collection('pollTemplates').doc();
                batch.set(ref, { ...t, createdBy: user.uid, createdAt: serverTimestamp(), version: 1 });
            });
            await batch.commit();
        } catch (err) {
            console.error(err);
            alert('เพิ่มคำถามตัวอย่างไม่สำเร็จ: ' + err.message);
        }
        setSeeding(false);
    };

    const startSession = async (template) => {
        if (!classId) return;
        try {
            const ref = await db.collection('pollSessions').add({
                templateId: template.id,
                snapshot: template,
                classId,
                teacherUid: user.uid,
                taughtOn: serverTimestamp(),
                status: 'draft',
                expectedN,
                openedAt: {}, closedAt: {},
            });
            setSessionId(ref.id);
        } catch (err) {
            console.error(err);
            alert('เริ่ม session ไม่สำเร็จ: ' + err.message);
        }
    };

    const openRound1 = () => {
        if (!sessionId) return;
        db.collection('pollSessions').doc(sessionId).update({
            status: 'round1_open',
            'openedAt.r1': serverTimestamp(),
        }).catch(console.error);
    };

    const closeRound1 = () => {
        if (!sessionId) return;
        db.collection('pollSessions').doc(sessionId).update({
            status: 'round1_closed',
            'closedAt.r1': serverTimestamp(),
        }).catch(console.error);
    };

    const openPresentWindow = () => {
        if (!sessionId) return;
        window.open('#/teacher/poll/present?sessionId=' + sessionId, '_blank');
    };

    const answeredCount = responses.length;
    const correctCount = session?.snapshot?.correctOptionId
        ? responses.filter(r => r.r1?.optionId === session.snapshot.correctOptionId).length
        : 0;
    const correctRate = answeredCount ? correctCount / answeredCount : 0;
    const advice = session?.status === 'round1_closed' || session?.status === 'revealed'
        ? POLL_ADVICE(correctRate) : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="🗳️ QuickPoll" />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-black text-gray-800 mb-6">🗳️ Quick Poll — หน้าควบคุมครู</h2>

                {/* Class selector */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">ห้องเรียน</label>
                    <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!!sessionId}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.grade}/{c.room})</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">นักเรียนในห้องนี้ {expectedN} คน</p>
                </div>

                {!sessionId && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-700">คลังคำถาม แผนที่ 19</h3>
                            {templates.length === 0 && (
                                <button onClick={seedSamples} disabled={seeding}
                                    className="bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                                    {seeding ? 'กำลังเพิ่ม...' : '➕ เพิ่มคำถามตัวอย่าง 3 ข้อ'}
                                </button>
                            )}
                        </div>
                        {templates.length === 0 ? (
                            <p className="text-sm text-gray-500">ยังไม่มีคำถามในคลัง กดปุ่มด้านบนเพื่อเพิ่มคำถามตัวอย่าง</p>
                        ) : (
                            <div className="space-y-2">
                                {templates.map(t => (
                                    <div key={t.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">#{t.seq} {t.prompt}</p>
                                            <p className="text-xs text-gray-500">{t.stage} • {t.loCode} • {t.bloom}</p>
                                        </div>
                                        <button onClick={() => startSession(t)} disabled={!classId}
                                            className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0">
                                            เริ่มคำถามนี้
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {sessionId && session && (
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">คำถามที่กำลังใช้</p>
                                <p className="text-lg font-bold text-gray-800">{session.snapshot?.prompt}</p>
                            </div>
                            <button onClick={() => setSessionId(null)}
                                className="text-xs text-gray-500 hover:text-gray-800 underline shrink-0">
                                เลือกคำถามอื่น
                            </button>
                        </div>

                        {session.snapshot?.media?.code && (
                            <pre className="bg-gray-900 text-gray-100 text-sm rounded-lg p-3 mb-4 overflow-x-auto font-mono">{session.snapshot.media.code}</pre>
                        )}

                        {/* Live counter */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-bold text-gray-700">ตอบแล้ว {answeredCount} จาก {session.expectedN} คน</span>
                                {secondsLeft !== null && (
                                    <span className={`font-mono font-black ${secondsLeft <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                                        ⏱ {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                                    </span>
                                )}
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${session.expectedN ? Math.min(100, (answeredCount / session.expectedN) * 100) : 0}%` }} />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {session.status === 'draft' && (
                                <button onClick={openRound1}
                                    className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-green-700">
                                    ▶️ เปิดรอบที่ 1
                                </button>
                            )}
                            {session.status === 'round1_open' && (
                                <button onClick={closeRound1}
                                    className="bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-700">
                                    ⏹ ปิดรอบ
                                </button>
                            )}
                            {(session.status === 'round1_closed' || session.status === 'revealed') && (
                                <button onClick={openPresentWindow}
                                    className="bg-purple-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-purple-700">
                                    📽️ เปิดหน้าฉายผล
                                </button>
                            )}
                        </div>

                        {advice && (
                            <div className={`rounded-lg p-4 border-l-4 ${
                                advice.color === 'red' ? 'bg-red-50 border-red-500 text-red-800' :
                                advice.color === 'green' ? 'bg-green-50 border-green-500 text-green-800' :
                                'bg-blue-50 border-blue-500 text-blue-800'}`}>
                                <p className="text-sm font-bold">สัดส่วนตอบถูกรอบที่ 1: {Math.round(correctRate * 100)}%</p>
                                <p className="text-sm mt-1">{advice.text}</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

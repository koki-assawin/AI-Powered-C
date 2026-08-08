// js/pages/student/games/EthicsQuiz.js — AI Ethics Quiz Challenge v1.0
// หน่วยที่ 4 ว31281 แผนที่ 34 — AI Ethics & Academic Integrity (LO13)
// Depends on: gamification.js (awardXP), gemini.js (callGeminiApi)

// ── Scenario data ─────────────────────────────────────────────────────────────
const ETHICS_SCENARIOS = [
    {
        id: 1,
        situation: 'มีการบ้านเขียนโปรแกรม Array ส่งพรุ่งนี้ แต่คุณยังไม่เข้าใจหลักการเลย',
        context: '📚 หน่วยที่ 4 · Array · ใกล้ส่งงาน',
        choices: [
            {
                id: 'A', label: 'ขอให้ AI อธิบาย concept ของ Array ก่อน แล้วลองเขียนเอง',
                type: 'ethical', score: 30,
                feedback: 'ถูกต้อง! การขอ AI อธิบาย concept แล้วเขียนเองคือวิธีที่ดีที่สุด คุณได้เรียนรู้จริงและผลงานเป็นของคุณ 100%',
            },
            {
                id: 'B', label: 'ให้ AI เขียนโค้ดตัวอย่างมาแล้วทำความเข้าใจ ก่อนเขียนเวอร์ชันตัวเอง',
                type: 'borderline', score: 15,
                feedback: 'พอได้ แต่ระวัง! ถ้าคุณทำความเข้าใจจริงและเขียนใหม่ถือว่าโอเค แต่ต้องซื่อสัตย์กับตัวเองว่าเข้าใจจริงหรือแค่ก๊อปมา',
            },
            {
                id: 'C', label: 'ให้ AI เขียนโค้ดสมบูรณ์แล้วคัดลอกส่งครูเลย',
                type: 'unethical', score: 0,
                feedback: 'ไม่ถูกต้อง! การส่งงานที่ AI เขียนทั้งหมดโดยไม่เรียนรู้เลยคือการโกง คุณจะไม่ได้ทักษะและจะตามไม่ทันในข้อสอบ',
            },
        ],
        coachTip: 'AI เป็น "ครูผู้ช่วย" ไม่ใช่ "คนทำงานแทน" — ใช้ AI เพื่อเรียน ไม่ใช่เพื่อหลีกเลี่ยงการเรียน',
    },
    {
        id: 2,
        situation: 'เพื่อนในกลุ่ม Mini Project ขอให้คุณส่งไฟล์โค้ดที่คุณเขียนให้เลยเพราะเขายังทำไม่เสร็จ',
        context: '👥 Mini Project · หน่วยที่ 4 · ส่งพรุ่งนี้',
        choices: [
            {
                id: 'A', label: 'อธิบายวิธีคิดและ logic ให้เพื่อน แต่ไม่ให้โค้ดโดยตรง',
                type: 'ethical', score: 30,
                feedback: 'ยอดเยี่ยม! คุณช่วยเพื่อนได้เรียนรู้จริง และเพื่อนได้ทักษะ ทั้งคู่ได้ประโยชน์',
            },
            {
                id: 'B', label: 'ให้เพื่อนดูโค้ดของคุณเพื่อเป็น reference แต่ต้องเขียนเองใหม่',
                type: 'borderline', score: 15,
                feedback: 'ระวัง! ขึ้นอยู่กับว่าเพื่อนจะใช้เป็น reference จริงหรือแค่ก๊อปแปะ ถ้าทั้งคู่เข้าใจและส่งงานต่างกัน พอรับได้',
            },
            {
                id: 'C', label: 'ส่งไฟล์โค้ดให้เพื่อนเลย เพราะกำลังรีบ',
                type: 'unethical', score: 0,
                feedback: 'ไม่ถูกต้อง! การให้โค้ดเพื่อนไปส่งคือการร่วมโกง ทั้งคู่เสี่ยงถูกลงโทษและเพื่อนไม่ได้เรียนรู้จริง',
            },
        ],
        coachTip: 'ช่วยเพื่อนเรียนรู้ ≠ ทำงานแทน — ความช่วยเหลือที่แท้จริงคือช่วยให้เพื่อนทำได้เอง',
    },
    {
        id: 3,
        situation: 'โจทย์ยากมาก คุณลองทำอยู่ 1 ชั่วโมงแต่ยังตัน AI น่าจะแก้ได้ภายในวินาที',
        context: '⏱️ หน่วยที่ 3 · Loop Complex · ยังเหลือเวลา',
        choices: [
            {
                id: 'A', label: 'ขอ AI ให้ Hint ทีละขั้น เพื่อไกด์ทิศทาง แล้วยังคิดเองต่อ',
                type: 'ethical', score: 30,
                feedback: 'สุดยอด! Hint แบบขั้นบันได ทำให้คุณยังต้องคิดอยู่ เหมือนครูถามคำถามนำ ไม่ใช่บอกคำตอบ',
            },
            {
                id: 'B', label: 'ขอให้ AI วาง Structure คร่าวๆ ไว้แล้วคุณเติมรายละเอียดเอง',
                type: 'borderline', score: 15,
                feedback: 'ขึ้นกับระดับ Structure ที่ขอ ถ้าเป็น pseudo-code คร่าวๆ พอได้ แต่ถ้า AI ออกแบบทุกอย่างให้คุณแค่เติมคำ ก็ยังได้ประโยชน์น้อยไป',
            },
            {
                id: 'C', label: 'ให้ AI แก้โจทย์ทั้งหมด ก๊อปโค้ดมาส่ง',
                type: 'unethical', score: 0,
                feedback: 'ไม่ถูกต้อง! ความยากของโจทย์คือจุดที่คุณเรียนรู้มากที่สุด การข้ามมันไปด้วย AI ทำให้คุณพลาดการเติบโต',
            },
        ],
        coachTip: 'ความยากคือ "ห้องออกกำลังกาย" ของสมอง — AI ที่ดีช่วยคุณฝึก ไม่ใช่ออกกำลังแทนคุณ',
    },
    {
        id: 4,
        situation: 'คุณเจอโค้ดบน GitHub ที่แก้โจทย์ได้พอดีเป๊ะ license คือ MIT (ใช้ได้เสรี)',
        context: '🔍 หน่วยที่ 4 · Mini Project · Open Source',
        choices: [
            {
                id: 'A', label: 'ศึกษา logic ของโค้ดนั้น แล้วเขียนใหม่ด้วยสไตล์และ comment ของตัวเอง พร้อม cite แหล่งที่มา',
                type: 'ethical', score: 30,
                feedback: 'ถูกต้องแบบ Pro! นี่คือวิธีที่ Developer มืออาชีพทำ: เรียนรู้จาก open source แล้วสร้างงานของตัวเองขึ้นมา พร้อม attribute ผู้เขียนต้นฉบับ',
            },
            {
                id: 'B', label: 'ก๊อปมาใส่ comment บอกว่ามาจาก GitHub แล้วดัดแปลงเล็กน้อย',
                type: 'borderline', score: 10,
                feedback: 'การ cite แหล่งที่มาดีแล้ว แต่ถ้าดัดแปลงน้อยมาก คุณไม่ได้เรียนรู้จริง ลองเขียนใหม่ทั้งหมดจะดีกว่า',
            },
            {
                id: 'C', label: 'ก๊อปมาส่งเลย เพราะ MIT license = ใช้ได้เสรี',
                type: 'unethical', score: 0,
                feedback: 'MIT license อนุญาตให้ใช้โค้ดในโปรเจกต์ได้ แต่ไม่ได้อนุญาตให้ส่งเป็นงานของตัวเองในชั้นเรียนโดยไม่เรียนรู้ นี่ยังถือเป็น academic dishonesty',
            },
        ],
        coachTip: '"Open Source" ≠ "ก๊อปได้ไม่ต้องระบุ" — Academic integrity ยังใช้อยู่เสมอในงานชั้นเรียน',
    },
    {
        id: 5,
        situation: 'ครูถามว่าโค้ดที่ส่งมาทำงานอย่างไร แต่คุณให้ AI เขียนจนไม่เข้าใจมันจริงๆ',
        context: '🎓 สอบปากเปล่า · Mini Project Presentation',
        choices: [
            {
                id: 'A', label: 'บอกความจริงว่าใช้ AI ช่วย และขอโอกาสอธิบายส่วนที่คุณเข้าใจ',
                type: 'ethical', score: 30,
                feedback: 'ความซื่อสัตย์คือคุณสมบัติสำคัญที่สุดของ Developer มืออาชีพ ครูจะช่วยให้คุณเข้าใจมากขึ้น และคุณจะเรียนรู้ได้จริง',
            },
            {
                id: 'B', label: 'บอกว่าลืมรายละเอียดบางส่วน แล้วอธิบายเท่าที่พอเข้าใจ',
                type: 'borderline', score: 10,
                feedback: 'ดีกว่าโกงตรงๆ แต่การไม่บอกความจริงว่าใช้ AI ยังไม่ใช่สิ่งที่ถูกต้องที่สุด ลองคิดว่าถ้าบอกความจริงจะเกิดอะไรขึ้น',
            },
            {
                id: 'C', label: 'อ้างว่าเข้าใจทุกอย่างแล้วอธิบายผิดๆ หวังว่าครูจะไม่รู้',
                type: 'unethical', score: 0,
                feedback: 'การโกหกซ้ำซ้อนอีกครั้งคือปัญหาใหญ่ที่สุด ครูมีประสบการณ์ตรวจสอบได้ และถ้าถูกจับได้ผลที่ตามมาจะหนักกว่าการยอมรับความจริงมาก',
            },
        ],
        coachTip: '"ซื่อสัตย์ต่อตัวเอง" คือทักษะที่สำคัญกว่าโค้ดทุกบรรทัด — นักพัฒนาที่ดีต้องรู้ว่าตัวเองรู้และไม่รู้อะไร',
    },
];

// ── CoachMessage (AI Mindset Coach) ──────────────────────────────────────────
const _CoachMessage = ({ scenario, choice, onNext, isLast }) => {
    const [aiMsg,   setAiMsg]   = React.useState('');
    const [aiLoading, setAiLoading] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        setAiLoading(true);
        setAiMsg('');

        const prompt = `คุณคือ "Mindset Coach" สำหรับนักเรียน ม.4 ที่เรียนวิชาวิทยาการคำนวณ (ว31281)
นักเรียนเพิ่งตอบคำถาม Ethics ด้านการใช้ AI:

สถานการณ์: ${scenario.situation}
นักเรียนเลือก: "${choice.label}"
ประเภท: ${choice.type === 'ethical' ? 'ถูกต้อง' : choice.type === 'borderline' ? 'เส้นแบ่ง' : 'ไม่เหมาะสม'}

Feedback เบื้องต้น: ${choice.feedback}
หลักการ: ${scenario.coachTip}

เขียน Coach Message สั้นๆ (3-4 ประโยค) ภาษาไทย กระตุ้นให้คิด ไม่ตัดสินรุนแรง
ถ้าตอบผิด ให้อธิบายว่าทำไมถึงสำคัญในชีวิตจริงในฐานะนักพัฒนา
ถ้าตอบถูก ให้ชื่นชมและเสริมแรงบวก`;

        if (typeof callGeminiApi === 'function') {
            callGeminiApi(prompt, null).then(res => {
                if (!cancelled) {
                    if (typeof res === 'string') setAiMsg(res);
                    else if (res?.text) setAiMsg(res.text);
                    else setAiMsg(choice.feedback);
                    setAiLoading(false);
                }
            }).catch(() => {
                if (!cancelled) { setAiMsg(choice.feedback); setAiLoading(false); }
            });
        } else {
            setAiMsg(choice.feedback);
            setAiLoading(false);
        }

        return () => { cancelled = true; };
    }, []);

    const isEthical = choice.type === 'ethical';
    const isBorder  = choice.type === 'borderline';
    const bgColor   = isEthical ? '#052e16' : isBorder ? '#1c1917' : '#1c0a0a';
    const borderColor = isEthical ? '#16a34a' : isBorder ? '#d97706' : '#dc2626';
    const icon      = isEthical ? '✅' : isBorder ? '⚠️' : '❌';

    return (
        <div>
            <div style={{
                background: bgColor, border: `1px solid ${borderColor}`,
                borderRadius: 12, padding: '14px 16px', marginBottom: 16,
            }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isEthical ? '#4ade80' : isBorder ? '#fbbf24' : '#f87171', marginBottom: 8 }}>
                    {icon} {isEthical ? 'การเลือกที่ถูกต้อง!' : isBorder ? 'คิดให้รอบคอบกว่านี้' : 'ควรทบทวนใหม่'}
                </div>
                {aiLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}>
                        <Spinner text="AI Coach กำลังวิเคราะห์..." />
                    </div>
                ) : (
                    <p style={{ margin: 0, color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 }}>{aiMsg}</p>
                )}
            </div>

            {/* Coach Tip */}
            <div style={{
                background: '#1e293b', borderRadius: 10, padding: '10px 14px',
                border: '1px solid #334155', marginBottom: 16,
            }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>💡 หลักการ</div>
                <div style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>{scenario.coachTip}</div>
            </div>

            <button onClick={onNext} style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
            }}>
                {isLast ? '🏁 ดูผลคะแนนรวม' : 'โจทย์ถัดไป →'}
            </button>
        </div>
    );
};

// ── Result screen ─────────────────────────────────────────────────────────────
const _ResultScreen = ({ totalScore, maxScore, answers, onRestart }) => {
    const { user } = useAuth();
    const [rewarded, setRewarded] = React.useState(false);
    const pct = Math.round((totalScore / maxScore) * 100);

    const ethicalCount = answers.filter(a => a.type === 'ethical').length;
    const tier =
        pct === 100 ? { label: 'จริยธรรมสมบูรณ์แบบ', icon: '🏆', color: '#f59e0b' } :
        pct >= 70   ? { label: 'มีจิตสำนึกที่ดี', icon: '🌟', color: '#22c55e' } :
        pct >= 40   ? { label: 'ต้องพัฒนาต่อ', icon: '📈', color: '#f97316' } :
                      { label: 'ต้องทบทวนใหม่', icon: '📚', color: '#ef4444' };

    // Award XP/Crystal once
    React.useEffect(() => {
        if (rewarded || !user?.uid) return;
        setRewarded(true);
        const xp   = pct >= 80 ? 80 : pct >= 60 ? 50 : pct >= 40 ? 30 : 10;
        const coin  = pct >= 80 ? 15 : pct >= 60 ? 8 : 3;
        const cryst = pct === 100 ? 2 : 0;
        awardXP(user.uid, xp, coin, cryst, 'ethics_quiz', null, { score: totalScore, pct }).catch(() => {});

        if (typeof checkAchievements === 'function') {
            checkAchievements(user.uid, { event: 'ethics_quiz', score: totalScore, pct }).catch(() => {});
        }
    }, []);

    return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{tier.icon}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: tier.color, margin: '0 0 4px' }}>
                {tier.label}
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
                {ethicalCount}/5 สถานการณ์ · เลือกอย่างมีจริยธรรม
            </p>

            {/* Score circle */}
            <div style={{
                width: 100, height: 100, borderRadius: '50%', margin: '0 auto 20px',
                background: `conic-gradient(${tier.color} ${pct}%, #1e293b ${pct}%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', background: '#0f172a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 800, color: tier.color,
                }}>
                    {pct}%
                </div>
            </div>

            {/* Reward */}
            <div style={{
                display: 'inline-flex', gap: 16, background: '#1e293b', borderRadius: 10,
                padding: '10px 20px', marginBottom: 24, fontSize: 13,
            }}>
                <span style={{ color: '#fbbf24' }}>
                    🪙 +{pct >= 80 ? 15 : pct >= 60 ? 8 : 3} CodeCoin
                </span>
                <span style={{ color: '#818cf8' }}>
                    ⭐ +{pct >= 80 ? 80 : pct >= 60 ? 50 : pct >= 40 ? 30 : 10} XP
                </span>
                {pct === 100 && <span style={{ color: '#c084fc' }}>💎 +2 Crystal</span>}
            </div>

            {/* Answer summary */}
            <div style={{ textAlign: 'left', marginBottom: 20 }}>
                {answers.map((a, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: '#1e293b', borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                        border: `1px solid ${a.type === 'ethical' ? '#166534' : a.type === 'borderline' ? '#92400e' : '#991b1b'}`,
                    }}>
                        <span style={{ fontSize: 16 }}>
                            {a.type === 'ethical' ? '✅' : a.type === 'borderline' ? '⚠️' : '❌'}
                        </span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: '#64748b' }}>สถานการณ์ {i + 1}</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0' }}>{a.label}</div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>+{a.score}</span>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onRestart} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #334155',
                    background: 'transparent', color: '#94a3b8', fontSize: 13,
                    cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                }}>
                    🔄 ลองใหม่
                </button>
                <button onClick={() => { window.location.hash = '#/student/dashboard'; }} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                }}>
                    🏠 กลับ Dashboard
                </button>
            </div>
        </div>
    );
};

// ── Main EthicsQuiz ───────────────────────────────────────────────────────────
const EthicsQuiz = () => {
    const [phase,      setPhase]     = React.useState('intro');     // intro | quiz | coach | result
    const [scenarioIdx, setScenarioIdx] = React.useState(0);
    const [selected,   setSelected]  = React.useState(null);
    const [answers,    setAnswers]   = React.useState([]);
    const [totalScore, setTotalScore] = React.useState(0);

    const scenario = ETHICS_SCENARIOS[scenarioIdx];
    const maxScore = ETHICS_SCENARIOS.reduce((s, sc) => s + Math.max(...sc.choices.map(c => c.score)), 0);

    const handleChoose = (choice) => {
        if (selected) return;
        setSelected(choice);
        setPhase('coach');
        setTotalScore(prev => prev + choice.score);
        setAnswers(prev => [...prev, { label: choice.label, type: choice.type, score: choice.score }]);
    };

    const handleNext = () => {
        if (scenarioIdx < ETHICS_SCENARIOS.length - 1) {
            setScenarioIdx(prev => prev + 1);
            setSelected(null);
            setPhase('quiz');
        } else {
            setPhase('result');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="AI Ethics Quiz" />
            <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>

                {/* ── Intro ──────────────────────────────────────────────────── */}
                {phase === 'intro' && (
                    <div style={{ textAlign: 'center', paddingTop: 20 }}>
                        <div style={{ fontSize: 52, marginBottom: 12 }}>⚖️</div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>AI Ethics Quiz Challenge</h1>
                        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
                            ทดสอบความเข้าใจเรื่องจริยธรรมในการใช้ AI ในชีวิตนักเรียน<br />
                            ผ่าน 5 สถานการณ์จริงที่คุณอาจเจอในห้องเรียน<br />
                            <strong style={{ color: '#f1f5f9' }}>ไม่มีคำตอบที่ถูกหรือผิด 100% — แต่มีการเลือกที่ดีกว่า</strong>
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28, textAlign: 'center', fontSize: 12 }}>
                            <div style={{ background: '#1e293b', borderRadius: 10, padding: '12px 8px' }}>
                                <div style={{ fontSize: 24, marginBottom: 4 }}>📋</div>
                                <div style={{ color: '#94a3b8' }}>5 สถานการณ์</div>
                            </div>
                            <div style={{ background: '#1e293b', borderRadius: 10, padding: '12px 8px' }}>
                                <div style={{ fontSize: 24, marginBottom: 4 }}>🤖</div>
                                <div style={{ color: '#94a3b8' }}>AI Coach วิเคราะห์</div>
                            </div>
                            <div style={{ background: '#1e293b', borderRadius: 10, padding: '12px 8px' }}>
                                <div style={{ fontSize: 24, marginBottom: 4 }}>🪙</div>
                                <div style={{ color: '#94a3b8' }}>ได้รับ XP + Coin</div>
                            </div>
                        </div>

                        <button onClick={() => setPhase('quiz')} style={{
                            padding: '12px 40px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg,#6366f1,#a855f7)',
                            color: '#fff', fontSize: 16, fontWeight: 700,
                            cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                        }}>
                            เริ่มทดสอบ →
                        </button>
                    </div>
                )}

                {/* ── Quiz ───────────────────────────────────────────────────── */}
                {(phase === 'quiz' || phase === 'coach') && (
                    <div>
                        {/* Progress */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                            <span>สถานการณ์ {scenarioIdx + 1} / {ETHICS_SCENARIOS.length}</span>
                            <span>คะแนน: {totalScore} / {maxScore}</span>
                        </div>
                        <div style={{ height: 4, background: '#1e293b', borderRadius: 2, marginBottom: 20 }}>
                            <div style={{
                                height: '100%', borderRadius: 2,
                                width: `${((scenarioIdx) / ETHICS_SCENARIOS.length) * 100}%`,
                                background: 'linear-gradient(90deg,#6366f1,#a855f7)',
                                transition: 'width .4s ease',
                            }} />
                        </div>

                        {/* Scenario card */}
                        <div style={{
                            background: '#1e293b', borderRadius: 14, padding: '16px',
                            border: '1px solid #334155', marginBottom: 16,
                        }}>
                            <div style={{
                                fontSize: 11, color: '#64748b', marginBottom: 8,
                                background: '#0f172a', display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                            }}>
                                {scenario.context}
                            </div>
                            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: '#e2e8f0' }}>
                                {scenario.situation}
                            </p>
                        </div>

                        {/* Choices */}
                        {phase === 'quiz' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {scenario.choices.map(choice => (
                                    <button key={choice.id} onClick={() => handleChoose(choice)} style={{
                                        textAlign: 'left', padding: '12px 14px',
                                        borderRadius: 10, border: '1px solid #334155',
                                        background: '#1e293b', color: '#e2e8f0',
                                        fontSize: 13, cursor: 'pointer', lineHeight: 1.6,
                                        fontFamily: "'Prompt',sans-serif",
                                        transition: 'background .15s, border-color .15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#263548'; e.currentTarget.style.borderColor = '#6366f1'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#334155'; }}>
                                        <span style={{ fontWeight: 700, color: '#818cf8', marginRight: 8 }}>{choice.id}.</span>
                                        {choice.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Coach feedback */}
                        {phase === 'coach' && selected && (
                            <_CoachMessage
                                scenario={scenario}
                                choice={selected}
                                onNext={handleNext}
                                isLast={scenarioIdx === ETHICS_SCENARIOS.length - 1}
                            />
                        )}
                    </div>
                )}

                {/* ── Result ─────────────────────────────────────────────────── */}
                {phase === 'result' && (
                    <_ResultScreen
                        totalScore={totalScore}
                        maxScore={maxScore}
                        answers={answers}
                        onRestart={() => {
                            setPhase('intro');
                            setScenarioIdx(0);
                            setSelected(null);
                            setAnswers([]);
                            setTotalScore(0);
                        }}
                    />
                )}
            </main>
        </div>
    );
};

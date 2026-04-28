// js/pages/student/games/CodeAutopsy.js — Phase 3: Predict Output Game

const CodeAutopsy = () => {
    const { user, userDoc } = useAuth();
    const [phase, setPhase] = React.useState('loading');
    const [content, setContent] = React.useState(null);
    const [currentQ, setCurrentQ] = React.useState(0);
    const [selected, setSelected] = React.useState(null);
    const [showAnswer, setShowAnswer] = React.useState(false);
    const [answers, setAnswers] = React.useState([]);
    const [result, setResult] = React.useState(null);
    const [startTime] = React.useState(Date.now());

    React.useEffect(() => {
        if (!user?.uid) return;
        const unit = window._miniGameUnit || null;
        getOrGenerateDailyContent('code_autopsy', unit).then(c => {
            setContent(c);
            setPhase('playing');
        }).catch(() => setPhase('error'));
    }, [user?.uid]);

    const handleSelect = (idx) => {
        if (showAnswer) return;
        setSelected(idx);
        setShowAnswer(true);
        setAnswers(prev => [...prev, { q: currentQ, selected: idx, correct: content.questions[currentQ].correct, isCorrect: idx === content.questions[currentQ].correct }]);
    };

    const handleNext = () => {
        setSelected(null);
        setShowAnswer(false);
        const nextQ = currentQ + 1;
        if (nextQ >= content.questions.length) {
            finishGame([...answers]);
        } else {
            setCurrentQ(nextQ);
        }
    };

    const finishGame = async (allAnswers) => {
        setPhase('saving');
        const correct = allAnswers.filter(a => a.isCorrect).length;
        const total = content.questions.length;
        const score = Math.round((correct / total) * 100);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const gameResult = await recordGameSession(user.uid, {
            gameType: 'code_autopsy', contentId: content.id,
            unitId: window._miniGameUnit || 'general',
            score, correctAnswers: correct, totalQuestions: total,
            timeSpentSeconds: elapsed, answers: allAnswers,
        });
        if (typeof checkAndAwardAchievements === 'function') {
            checkAndAwardAchievements(user.uid, {
                event: 'minigame', gameType: 'code_autopsy',
                score, isPerfect: gameResult.isPerfect,
            }).catch(() => {});
        }
        setResult({ ...gameResult, correct, total, score });
        setPhase('done');
    };

    if (phase === 'loading') return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Prompt',sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔬</div>
                <p style={{ color: '#3b82f6', fontWeight: 600 }}>กำลังเตรียมโค้ด...</p>
                <p style={{ color: '#9ca3af', fontSize: 12 }}>AI กำลังสร้างโจทย์ Code Autopsy</p>
            </div>
        </div>
    );

    if (phase === 'error') return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Prompt',sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                <p style={{ color: '#ef4444' }}>โหลดเกมไม่สำเร็จ</p>
                <a href="#/student/games" style={{ color: '#3b82f6', fontSize: 13 }}>← กลับ Hub</a>
            </div>
        </div>
    );

    if (phase === 'done' && result) {
        const pct = result.correct / result.total;
        const emoji = pct === 1 ? '🎉' : pct >= 0.6 ? '😊' : '💪';
        return (
            <div style={{ minHeight: '100vh', background: '#FFF5F7', fontFamily: "'Prompt',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', borderRadius: 24, padding: '36px 32px', maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 8px 40px rgba(59,130,246,.12)' }}>
                    <div style={{ fontSize: 56, marginBottom: 8 }}>{emoji}</div>
                    <h2 style={{ color: '#3b82f6', fontWeight: 700, margin: '0 0 4px', fontSize: 22 }}>จบ Code Autopsy!</h2>
                    <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>คุณอ่านโค้ดเก่งแค่ไหน?</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'ถูก', value: `${result.correct}/${result.total}`, color: '#10b981' },
                            { label: 'คะแนน', value: `${result.score}%`, color: '#3b82f6' },
                            { label: 'XP รับได้', value: `+${result.xpEarned}`, color: '#f59e0b' },
                            { label: 'CodeCoin', value: `+${result.coinEarned} 🪙`, color: '#ec4899' },
                        ].map(s => (
                            <div key={s.label} style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 8px' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {result.isPerfect && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
                            🌟 Perfect! คุณอ่านโค้ดแม่นมาก! +{GAME_XP?.code_autopsy?.perfect || 10} XP bonus
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <a href="#/student/games" style={{
                            flex: 1, padding: '11px', borderRadius: 12, textAlign: 'center',
                            border: '1.5px solid #bfdbfe', color: '#3b82f6', textDecoration: 'none',
                            fontWeight: 600, fontSize: 13,
                        }}>← Hub</a>
                        <button onClick={() => window.location.reload()} style={{
                            flex: 1, padding: '11px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white',
                            fontFamily: "'Prompt',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}>🔬 เล่นอีกครั้ง</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!content?.questions) return null;
    const q = content.questions[currentQ];

    return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="Code Autopsy 🔬" subtitle={`โจทย์ ${currentQ + 1}/${content.questions.length}`} />

            <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

                {/* Progress */}
                <div style={{ height: 6, background: '#dbeafe', borderRadius: 3, marginBottom: 24, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#3b82f6,#2563eb)', width: `${((currentQ) / content.questions.length) * 100}%`, transition: 'width .4s' }} />
                </div>

                {/* Question */}
                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #dbeafe', marginBottom: 16, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 11, background: '#3b82f6', color: 'white', borderRadius: 6, padding: '2px 8px' }}>C</span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>ข้อที่ {currentQ + 1}</span>
                        </div>
                        <pre style={{
                            margin: 0, color: '#e2e8f0', fontSize: 13, lineHeight: 1.7,
                            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        }}>
                            {q.code}
                        </pre>
                    </div>
                    <div style={{ padding: '14px 18px' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{q.question}</p>
                    </div>
                </div>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {q.options.map((opt, idx) => {
                        let bg = 'white', border = '#dbeafe', color = '#4b5563';
                        if (showAnswer) {
                            if (idx === q.correct) { bg = '#f0fdf4'; border = '#86efac'; color = '#166534'; }
                            else if (idx === selected && idx !== q.correct) { bg = '#fef2f2'; border = '#fca5a5'; color = '#991b1b'; }
                        } else if (selected === idx) {
                            bg = '#eff6ff'; border = '#3b82f6'; color = '#1d4ed8';
                        }
                        return (
                            <button
                                key={idx}
                                disabled={showAnswer}
                                onClick={() => handleSelect(idx)}
                                style={{
                                    width: '100%', textAlign: 'left', padding: '13px 18px',
                                    borderRadius: 12, border: `1.5px solid ${border}`,
                                    background: bg, color, cursor: showAnswer ? 'default' : 'pointer',
                                    fontFamily: "'JetBrains Mono','Consolas',monospace", fontSize: 13, fontWeight: 500,
                                    transition: 'all .2s',
                                }}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>

                {/* Feedback */}
                {showAnswer && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 18px', marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, color: selected === q.correct ? '#166534' : '#991b1b', marginBottom: 6, fontSize: 14 }}>
                            {selected === q.correct ? '✅ ถูกต้อง!' : '❌ ไม่ถูก'}
                        </div>
                        {q.explanation && (
                            <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                                💡 {q.explanation}
                            </p>
                        )}
                    </div>
                )}

                {showAnswer && (
                    <button
                        onClick={handleNext}
                        style={{
                            width: '100%', padding: '12px', borderRadius: 14, border: 'none',
                            background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'white',
                            fontFamily: "'Prompt',sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        {currentQ + 1 >= content.questions.length ? '📊 ดูผลลัพธ์' : 'ข้อต่อไป →'}
                    </button>
                )}
            </div>
        </div>
    );
};

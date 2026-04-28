// js/pages/student/games/QuizBlitz.js — Phase 3: 5 MCQ Timed Quiz

const QuizBlitz = () => {
    const { user, userDoc } = useAuth();
    const [phase, setPhase] = React.useState('loading'); // loading | playing | done
    const [content, setContent] = React.useState(null);
    const [currentQ, setCurrentQ] = React.useState(0);
    const [timeLeft, setTimeLeft] = React.useState(30);
    const [answers, setAnswers] = React.useState([]);
    const [selected, setSelected] = React.useState(null);
    const [showFeedback, setShowFeedback] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [startTime] = React.useState(Date.now());

    const timerRef = React.useRef(null);

    // Load content
    React.useEffect(() => {
        if (!user?.uid) return;
        const unit = window._miniGameUnit || null;
        getOrGenerateDailyContent('quiz_blitz', unit).then(c => {
            setContent(c);
            setPhase('playing');
        }).catch(() => setPhase('error'));
    }, [user?.uid]);

    // Timer
    React.useEffect(() => {
        if (phase !== 'playing' || showFeedback) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { handleAnswer(null); return 30; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [phase, currentQ, showFeedback]);

    const handleAnswer = (optionIndex) => {
        clearInterval(timerRef.current);
        const q = content.questions[currentQ];
        const isCorrect = optionIndex === q.correct;
        setSelected(optionIndex);
        setShowFeedback(true);
        setAnswers(prev => [...prev, { q: currentQ, selected: optionIndex, correct: q.correct, isCorrect }]);

        setTimeout(() => {
            setShowFeedback(false);
            setSelected(null);
            if (currentQ + 1 >= content.questions.length) {
                finishGame([...answers, { q: currentQ, selected: optionIndex, correct: q.correct, isCorrect }]);
            } else {
                setCurrentQ(c => c + 1);
                setTimeLeft(30);
            }
        }, 1800);
    };

    const finishGame = async (allAnswers) => {
        setPhase('saving');
        const correct = allAnswers.filter(a => a.isCorrect).length;
        const total = content.questions.length;
        const score = Math.round((correct / total) * 100);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const gameResult = await recordGameSession(user.uid, {
            gameType: 'quiz_blitz', contentId: content.id,
            unitId: window._miniGameUnit || 'general',
            score, correctAnswers: correct, totalQuestions: total,
            timeSpentSeconds: elapsed, answers: allAnswers,
        });
        if (typeof checkAndAwardAchievements === 'function') {
            checkAndAwardAchievements(user.uid, {
                event: 'minigame', gameType: 'quiz_blitz',
                score, isPerfect: gameResult.isPerfect,
            }).catch(() => {});
        }
        setResult({ ...gameResult, correct, total, score });
        setPhase('done');
    };

    // ── Loading ──
    if (phase === 'loading') return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Prompt',sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
                <p style={{ color: '#be185d', fontWeight: 600 }}>กำลังโหลดคำถาม...</p>
                <p style={{ color: '#9ca3af', fontSize: 12 }}>AI กำลังสร้างเนื้อหาเกม</p>
            </div>
        </div>
    );

    if (phase === 'error') return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Prompt',sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                <p style={{ color: '#ef4444' }}>โหลดเกมไม่สำเร็จ</p>
                <a href="#/student/games" style={{ color: '#ec4899', fontSize: 13 }}>← กลับ Hub</a>
            </div>
        </div>
    );

    // ── Done screen ──
    if (phase === 'done' && result) {
        const pct = result.correct / result.total;
        const emoji = pct === 1 ? '🎉' : pct >= 0.6 ? '😊' : '💪';
        return (
            <div style={{ minHeight: '100vh', background: '#FFF5F7', fontFamily: "'Prompt',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', borderRadius: 24, padding: '36px 32px', maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 8px 40px rgba(236,72,153,.12)' }}>
                    <div style={{ fontSize: 56, marginBottom: 8 }}>{emoji}</div>
                    <h2 style={{ color: '#be185d', fontWeight: 700, margin: '0 0 4px', fontSize: 22 }}>จบแล้ว!</h2>
                    <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Quiz Blitz</p>

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
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
                            🌟 Perfect Score! รับโบนัส +{GAME_XP?.quiz_blitz?.perfect || 15} XP
                        </div>
                    )}
                    {result.isFirstPlayToday && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
                            ⭐ ครั้งแรกของวัน! รับ XP เต็ม
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <a href="#/student/games" style={{
                            flex: 1, padding: '11px', borderRadius: 12, textAlign: 'center',
                            border: '1.5px solid #fce7f3', color: '#be185d', textDecoration: 'none',
                            fontWeight: 600, fontSize: 13,
                        }}>← Hub</a>
                        <button onClick={() => window.location.reload()} style={{
                            flex: 1, padding: '11px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white',
                            fontFamily: "'Prompt',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}>⚡ เล่นอีกครั้ง</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Playing ──
    if (!content?.questions) return null;
    const q = content.questions[currentQ];
    const timerPct = (timeLeft / 30) * 100;
    const timerColor = timeLeft > 15 ? '#10b981' : timeLeft > 7 ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="Quiz Blitz ⚡" subtitle={`ข้อที่ ${currentQ + 1}/${content.questions.length}`} />

            <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

                {/* Progress + timer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 6, background: '#fce7f3', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#ec4899,#be185d)', width: `${((currentQ) / content.questions.length) * 100}%`, transition: 'width .4s' }} />
                    </div>
                    <div style={{
                        minWidth: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700, fontSize: 16,
                        background: timerColor, color: 'white', boxShadow: `0 2px 10px ${timerColor}66`,
                        transition: 'background .3s',
                    }}>
                        {timeLeft}
                    </div>
                </div>

                {/* Timer bar */}
                <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: timerColor, width: `${timerPct}%`, transition: 'width 1s linear, background .3s' }} />
                </div>

                {/* Question card */}
                <div style={{ background: 'white', borderRadius: 20, padding: '24px', border: '1px solid #fce7f3', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>ข้อที่ {currentQ + 1}</div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', lineHeight: 1.6, margin: 0 }}>
                        {q.question}
                    </p>
                </div>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.options.map((opt, idx) => {
                        let bg = 'white', border = '#fce7f3', color = '#4b5563';
                        if (showFeedback) {
                            if (idx === q.correct) { bg = '#f0fdf4'; border = '#86efac'; color = '#166534'; }
                            else if (idx === selected && idx !== q.correct) { bg = '#fef2f2'; border = '#fca5a5'; color = '#991b1b'; }
                        } else if (selected === idx) {
                            bg = '#fdf2f8'; border = '#ec4899'; color = '#be185d';
                        }
                        return (
                            <button
                                key={idx}
                                disabled={showFeedback}
                                onClick={() => handleAnswer(idx)}
                                style={{
                                    width: '100%', textAlign: 'left', padding: '14px 18px',
                                    borderRadius: 14, border: `1.5px solid ${border}`,
                                    background: bg, color, cursor: showFeedback ? 'default' : 'pointer',
                                    fontFamily: "'Prompt',sans-serif", fontSize: 14, fontWeight: 500,
                                    transition: 'all .2s',
                                }}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>

                {/* Feedback explanation */}
                {showFeedback && q.explanation && (
                    <div style={{ marginTop: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
                        💡 {q.explanation}
                    </div>
                )}
            </div>
        </div>
    );
};

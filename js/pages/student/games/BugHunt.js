// js/pages/student/games/BugHunt.js — Phase 3: Bug Hunt with AI Grading

const BugHunt = () => {
    const { user, userDoc } = useAuth();
    const [phase, setPhase] = React.useState('loading');
    const [content, setContent] = React.useState(null);
    const [currentBug, setCurrentBug] = React.useState(0);
    const [answer, setAnswer] = React.useState('');
    const [grading, setGrading] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const [showHint, setShowHint] = React.useState(false);
    const [answers, setAnswers] = React.useState([]);
    const [result, setResult] = React.useState(null);
    const [startTime] = React.useState(Date.now());

    React.useEffect(() => {
        if (!user?.uid) return;
        const unit = window._miniGameUnit || null;
        getOrGenerateDailyContent('bug_hunt', unit).then(c => {
            setContent(c);
            setPhase('playing');
        }).catch(() => setPhase('error'));
    }, [user?.uid]);

    const handleSubmit = async () => {
        if (!answer.trim() || grading) return;
        setGrading(true);
        const bug = content.questions[currentBug];
        const gradeResult = await gradeBugHuntAnswer(bug, answer);
        setFeedback(gradeResult);
        setAnswers(prev => [...prev, { bug: currentBug, answer, score: gradeResult.score, feedback: gradeResult.feedback }]);
        setGrading(false);
    };

    const handleNext = () => {
        const nextBug = currentBug + 1;
        setFeedback(null);
        setAnswer('');
        setShowHint(false);
        if (nextBug >= content.questions.length) {
            finishGame([...answers]);
        } else {
            setCurrentBug(nextBug);
        }
    };

    const finishGame = async (allAnswers) => {
        setPhase('saving');
        const avgScore = allAnswers.length > 0
            ? Math.round(allAnswers.reduce((s, a) => s + a.score, 0) / allAnswers.length)
            : 0;
        const correct = allAnswers.filter(a => a.score >= 60).length;
        const total = content.questions.length;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const gameResult = await recordGameSession(user.uid, {
            gameType: 'bug_hunt', contentId: content.id,
            unitId: window._miniGameUnit || 'general',
            score: avgScore, correctAnswers: correct, totalQuestions: total,
            timeSpentSeconds: elapsed, answers: allAnswers,
        });
        if (typeof checkAndAwardAchievements === 'function') {
            checkAndAwardAchievements(user.uid, {
                event: 'minigame', gameType: 'bug_hunt',
                score: avgScore, isPerfect: gameResult.isPerfect,
            }).catch(() => {});
        }
        setResult({ ...gameResult, avgScore, correct, total });
        setPhase('done');
    };

    if (phase === 'loading') return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Prompt',sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🐛</div>
                <p style={{ color: '#10b981', fontWeight: 600 }}>กำลังเตรียม Bug...</p>
                <p style={{ color: '#9ca3af', fontSize: 12 }}>AI กำลังสร้างโจทย์ Bug Hunt</p>
            </div>
        </div>
    );

    if (phase === 'error') return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Prompt',sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                <p style={{ color: '#ef4444' }}>โหลดเกมไม่สำเร็จ</p>
                <a href="#/student/games" style={{ color: '#10b981', fontSize: 13 }}>← กลับ Hub</a>
            </div>
        </div>
    );

    if (phase === 'done' && result) {
        const emoji = result.avgScore >= 80 ? '🎉' : result.avgScore >= 50 ? '😊' : '💪';
        return (
            <div style={{ minHeight: '100vh', background: '#FFF5F7', fontFamily: "'Prompt',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', borderRadius: 24, padding: '36px 32px', maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 8px 40px rgba(16,185,129,.12)' }}>
                    <div style={{ fontSize: 56, marginBottom: 8 }}>{emoji}</div>
                    <h2 style={{ color: '#10b981', fontWeight: 700, margin: '0 0 4px', fontSize: 22 }}>Bug Hunt สำเร็จ!</h2>
                    <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>คุณแก้ Bug ได้ {result.correct}/{result.total} ข้อ</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'คะแนนเฉลี่ย', value: `${result.avgScore}%`, color: '#10b981' },
                            { label: 'ผ่าน (≥60%)', value: `${result.correct}/${result.total}`, color: '#3b82f6' },
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
                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#065f46' }}>
                            🐛💀 Bug Exterminator! คุณฆ่า Bug ได้หมดเลย! +{GAME_XP?.bug_hunt?.perfect || 20} XP bonus
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <a href="#/student/games" style={{
                            flex: 1, padding: '11px', borderRadius: 12, textAlign: 'center',
                            border: '1.5px solid #a7f3d0', color: '#10b981', textDecoration: 'none',
                            fontWeight: 600, fontSize: 13,
                        }}>← Hub</a>
                        <button onClick={() => window.location.reload()} style={{
                            flex: 1, padding: '11px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white',
                            fontFamily: "'Prompt',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}>🐛 เล่นอีกครั้ง</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!content?.questions) return null;
    const bug = content.questions[currentBug];
    const feedbackScore = feedback?.score || 0;
    const feedbackColor = feedbackScore >= 80 ? '#10b981' : feedbackScore >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="Bug Hunt 🐛" subtitle={`Bug ${currentBug + 1}/${content.questions.length}`} />

            <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>

                {/* Progress */}
                <div style={{ height: 6, background: '#d1fae5', borderRadius: 3, marginBottom: 24, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#10b981,#059669)', width: `${(currentBug / content.questions.length) * 100}%`, transition: 'width .4s' }} />
                </div>

                {/* Bug description */}
                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #d1fae5', marginBottom: 16, overflow: 'hidden' }}>
                    <div style={{ background: '#ecfdf5', padding: '14px 18px', borderBottom: '1px solid #d1fae5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#065f46', fontSize: 14 }}>
                            🐛 Bug #{currentBug + 1} — พบ Bug ในโค้ดนี้
                        </div>
                        <button
                            onClick={() => setShowHint(h => !h)}
                            style={{
                                background: showHint ? '#fef3c7' : '#f3f4f6', border: 'none',
                                borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                                color: showHint ? '#92400e' : '#6b7280', fontFamily: "'Prompt',sans-serif",
                            }}
                        >
                            💡 {showHint ? 'ซ่อนคำใบ้' : 'ขอคำใบ้'}
                        </button>
                    </div>

                    <div style={{ padding: '14px 18px 8px' }}>
                        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                            <strong>โจทย์:</strong> {bug.description}
                        </p>
                        {showHint && (
                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400e' }}>
                                💡 คำใบ้: {bug.hint}
                            </div>
                        )}
                    </div>

                    {/* Buggy code */}
                    <div style={{ background: '#1e1e1e', padding: '14px 18px 16px' }}>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>โค้ดที่มี Bug:</div>
                        <pre style={{
                            margin: 0, color: '#e2e8f0', fontSize: 13, lineHeight: 1.7,
                            fontFamily: "'JetBrains Mono','Consolas',monospace",
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        }}>
                            {bug.buggyCode}
                        </pre>
                    </div>
                </div>

                {/* Answer area */}
                {!feedback && (
                    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #d1fae5', padding: '18px', marginBottom: 14 }}>
                        <label style={{ fontWeight: 600, color: '#065f46', fontSize: 13, display: 'block', marginBottom: 8 }}>
                            ✏️ บอก Bug ที่พบและวิธีแก้ไข:
                        </label>
                        <textarea
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            placeholder="เช่น: ปัญหาคือ... แก้ไขโดย..."
                            rows={4}
                            style={{
                                width: '100%', border: '1.5px solid #d1fae5', borderRadius: 10,
                                padding: '10px 12px', fontFamily: "'Prompt',sans-serif", fontSize: 13,
                                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                            }}
                            onFocus={e => e.target.style.borderColor = '#10b981'}
                            onBlur={e => e.target.style.borderColor = '#d1fae5'}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!answer.trim() || grading}
                            style={{
                                marginTop: 10, width: '100%', padding: '11px', borderRadius: 12, border: 'none',
                                background: grading ? '#9ca3af' : 'linear-gradient(135deg,#10b981,#059669)',
                                color: 'white', fontFamily: "'Prompt',sans-serif",
                                fontWeight: 700, fontSize: 14, cursor: grading ? 'wait' : 'pointer',
                            }}
                        >
                            {grading ? '🤖 AI กำลังตรวจ...' : '🐛 ส่งคำตอบ'}
                        </button>
                    </div>
                )}

                {/* Feedback */}
                {feedback && (
                    <div style={{
                        background: 'white', borderRadius: 16,
                        border: `2px solid ${feedbackColor}`,
                        padding: '18px', marginBottom: 14,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontWeight: 700, color: feedbackColor, fontSize: 15 }}>
                                คะแนน: {feedbackScore}/100
                            </span>
                            <span style={{ fontSize: 20 }}>{feedbackScore >= 80 ? '✅' : feedbackScore >= 50 ? '🟡' : '❌'}</span>
                        </div>
                        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                            {feedback.feedback}
                        </p>
                        {feedbackScore < 100 && (
                            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>
                                <strong>วิธีแก้ที่ถูกต้อง:</strong> {bug.correctFix}
                            </div>
                        )}
                        <button
                            onClick={handleNext}
                            style={{
                                marginTop: 14, width: '100%', padding: '11px', borderRadius: 12, border: 'none',
                                background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white',
                                fontFamily: "'Prompt',sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer',
                            }}
                        >
                            {currentBug + 1 >= content.questions.length ? '📊 ดูผลลัพธ์' : 'Bug ถัดไป →'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

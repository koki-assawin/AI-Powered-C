// js/pages/student/StudentActivityView.js - v1.0 Multi-Activity Student View

// ── Autopsy View ──────────────────────────────────────────────────
const AutopsyView = ({ assignment, user, userDoc }) => {
    const cases = assignment.autopsyConfig?.cases || [];
    const [caseIdx, setCaseIdx] = React.useState(0);
    const [answers, setAnswers] = React.useState(cases.map(() => ''));
    const [diagnostics, setDiagnostics] = React.useState(cases.map(() => null));
    const [running, setRunning] = React.useState(cases.map(() => false));
    const [runTimers, setRunTimers] = React.useState([]);
    const [submitted, setSubmitted] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [xpEarned, setXpEarned] = React.useState(0);

    const cur = cases[caseIdx] || {};

    const simulateDiagnostic = (idx) => {
        // 1. Kill ALL existing timers from any previous run
        setRunTimers(prev => { prev.forEach(clearTimeout); return []; });
        setRunning(p => p.map(() => false));

        const c = cases[idx];
        setRunning(p => p.map((v, i) => i === idx ? true : v));
        setDiagnostics(p => p.map((v, i) => i === idx ? { lines: [], done: false } : v));

        // Write to runtimeStatus for teacher alert
        if (c.bugType === 'infinite_loop') {
            db.collection('runtimeStatus').doc(user.uid).set({
                studentId: user.uid,
                studentName: userDoc?.displayName || user.email,
                courseId: assignment.courseId,
                assignmentId: assignment.id,
                assignmentTitle: assignment.title,
                isInfiniteLoopDetected: true,
                consecutiveErrors: 0,
                lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
            }).catch(console.error);
        }

        // Case-specific simulation (caseId takes priority over bugType)
        const caseSimOutputs = {
            case_1: { mode: 'counter', loop: true },   // นับ 1,2,3,... ไปไม่มีที่สิ้นสุด
            case_2: { lines: ['[เงื่อนไข i < 1 เป็นเท็จทันที — ลูปไม่ทำงานเลย]', 'จบการทำงาน'], loop: false },
            case_3: { lines: ['1', '3', '5', '[i = 7 > 5 → ลูปจบ]'], loop: false },
        };
        const bugTypeSimOutputs = {
            infinite_loop: { mode: 'counter', loop: true },
            off_by_one: { lines: ['1', '3', '5', '[ข้ามเลขคู่ทั้งหมด]'], loop: false },
            logic_error: { lines: ['[เงื่อนไขเป็นเท็จตั้งแต่แรก — ลูปไม่ทำงาน]', 'จบการทำงาน'], loop: false },
            runtime_error: { lines: ['Segmentation fault (core dumped)', 'Process exited with code 139 ❌'], loop: false },
        };
        const sim = caseSimOutputs[c.caseId] || bugTypeSimOutputs[c.bugType] || bugTypeSimOutputs.logic_error;

        // 2. Use a local array to track timers (avoids stale closure on setRunTimers)
        const localTimers = [];
        let lineIdx = 0;
        let counter = 1; // for counter mode

        const addLine = () => {
            let lineText;
            if (sim.mode === 'counter') {
                lineText = String(counter++);
            } else {
                if (lineIdx >= sim.lines.length) {
                    if (!sim.loop) {
                        setRunning(p => p.map((v, i) => i === idx ? false : v));
                        setDiagnostics(p => p.map((v, i) => i === idx ? { ...v, done: true } : v));
                        db.collection('runtimeStatus').doc(user.uid).set({ isInfiniteLoopDetected: false, lastActivity: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(console.error);
                    }
                    return;
                }
                lineText = sim.lines[lineIdx++];
            }
            setDiagnostics(p => p.map((v, i) => i === idx ? { lines: [...(v?.lines || []), lineText], done: false } : v));
            const tid = setTimeout(addLine, sim.loop ? 250 : 200);
            localTimers.push(tid);
            setRunTimers([...localTimers]);
        };

        // 3. Delay first line so React flushes the clear state first
        const startTid = setTimeout(addLine, 80);
        localTimers.push(startTid);
        setRunTimers([startTid]);
    };

    const killProcess = (idx) => {
        runTimers.forEach(clearTimeout);
        setRunTimers([]);
        setRunning(p => p.map((v, i) => i === idx ? false : v));
        setDiagnostics(p => p.map((v, i) => i === idx ? { ...v, lines: [...(v?.lines || []), '--- KILLED BY USER ---'], done: true } : v));
        db.collection('runtimeStatus').doc(user.uid).set({ isInfiniteLoopDetected: false, killedByUser: true, lastActivity: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(console.error);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const totalPts = cases.reduce((s, c) => s + (+c.points || 0), 0) || 1;
            const earned = cases.reduce((s, c, i) => s + (answers[i].trim().length > 20 ? (+c.points || 0) : 0), 0);
            const score = Math.round((earned / totalPts) * 100);
            const isPassed = score >= 60;

            const now = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('submissions_v2').add({
                assignmentId: assignment.id,
                courseId: assignment.courseId,
                studentId: user.uid,
                activityType: 'autopsy',
                score, rawScore: earned, maxScore: totalPts,
                isPassed, isBestScore: true,
                attemptNumber: 1,
                xpAwarded: isPassed ? (assignment.xpReward || 30) : 5,
                submittedAt: now, gradedAt: now,
                code: null, language: null, testResults: [],
                runtimeMetrics: null,
                autopsyAnswers: cases.map((c, i) => ({
                    caseId: c.caseId,
                    studentAnswer: answers[i],
                    isCorrect: answers[i].trim().length > 20,
                    pointsEarned: answers[i].trim().length > 20 ? (+c.points || 0) : 0,
                    aiFeedback: null,
                })),
                mcqAnswers: null, quizMetrics: null, prePostMeta: null,
                aiAnalysis: { feedback: null, metrics: { quality: null, correctness: null, efficiency: null, readability: null, bestPractices: null }, issues: [], suggestion: null, analyzedAt: null },
            });

            if (isPassed && assignment.xpReward) {
                typeof awardXP === 'function' && awardXP(user.uid, assignment.xpReward, 'submission_accepted', assignment.id).catch(console.error);
            }
            setXpEarned(isPassed ? (assignment.xpReward || 30) : 5);
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0d0d1f,#1a1a3e)' }}>
                <div className="text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-black text-purple-300 mb-2">ส่งการชันสูตรสำเร็จ!</h2>
                    <p className="text-cyan-400 font-bold">+{xpEarned} XP</p>
                    <button onClick={() => window.location.hash = '#/student/dashboard'}
                        className="mt-6 px-6 py-3 rounded-xl font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                        กลับ Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#0d0d1f,#1a1a3e)' }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="🔬 Loop Autopsy" />
            <main className="max-w-6xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-black mb-1" style={{ background: 'linear-gradient(90deg,#ef4444,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    🔬 {assignment.title}
                </h2>
                <p className="text-gray-500 text-sm mb-6">{assignment.description}</p>

                {/* Case tabs */}
                <div className="flex gap-2 mb-5 flex-wrap">
                    {cases.map((c, i) => (
                        <button key={i} onClick={() => setCaseIdx(i)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${caseIdx === i ? 'bg-red-900/30 border-red-500 text-red-300' : 'bg-gray-800/60 border-gray-700/40 text-gray-400 hover:border-red-800/50'}`}
                            style={caseIdx === i ? { boxShadow: '0 0 15px rgba(239,68,68,0.35)' } : {}}>
                            {c.label}
                            {answers[i].trim().length > 20 && <span className="ml-1 text-green-400">✓</span>}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                    {/* Left: Code */}
                    <div className="bg-gray-900/90 border border-red-900/40 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-950/60">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="text-gray-500 text-xs font-mono">{cur.label} — {cur.bugType?.replace('_', ' ')}</span>
                            <span className="text-red-500 text-xs font-bold">READ ONLY</span>
                        </div>
                        <pre className="p-4 text-xs font-mono text-green-300 overflow-auto" style={{ minHeight: '220px', lineHeight: '1.6' }}>
                            {cur.buggyCode || '// โค้ดกำลังโหลด...'}
                        </pre>
                    </div>

                    {/* Right: Diagnostic terminal */}
                    <div className="bg-gray-950 border border-gray-700/40 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/60">
                            <span className="text-gray-400 text-xs font-mono">DIAGNOSTIC TERMINAL</span>
                            <div className="flex gap-2">
                                {running[caseIdx] ? (
                                    <button onClick={() => killProcess(caseIdx)}
                                        className="px-3 py-1 bg-red-700/60 border border-red-600 text-red-200 rounded text-xs font-bold hover:bg-red-700 transition-all">
                                        ■ Kill Process
                                    </button>
                                ) : (
                                    <button onClick={() => simulateDiagnostic(caseIdx)}
                                        className="px-3 py-1 text-xs font-bold rounded border transition-all"
                                        style={{ background: 'rgba(16,185,129,0.2)', borderColor: '#10b981', color: '#10b981' }}>
                                        ▶ Run Diagnostic
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-4 font-mono text-xs" style={{ minHeight: '220px', color: '#22c55e' }}>
                            {diagnostics[caseIdx] === null && !running[caseIdx] && (
                                <span className="text-gray-600">$ กด Run Diagnostic เพื่อจำลองการรันโค้ด...</span>
                            )}
                            {diagnostics[caseIdx]?.lines?.map((ln, i) => (
                                <div key={i} className={ln.includes('KILLED') || ln.includes('fault') ? 'text-red-400' : ln.includes('คาดหวัง') ? 'text-yellow-400' : ''}>
                                    {ln}
                                </div>
                            ))}
                            {running[caseIdx] && (
                                <span className="text-green-400 animate-pulse">█</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Hint */}
                {cur.hints?.filter(h => h.trim()).length > 0 && (
                    <details className="mb-4">
                        <summary className="cursor-pointer text-yellow-400 text-sm font-bold mb-1">💡 Hints (คลิกเพื่อดู)</summary>
                        <div className="mt-2 space-y-1">
                            {cur.hints.filter(h => h.trim()).map((h, i) => (
                                <div key={i} className="text-sm text-gray-300 pl-4 border-l-2 border-yellow-700/50">{i + 1}. {h}</div>
                            ))}
                        </div>
                    </details>
                )}

                {/* Analysis textarea */}
                <div className="bg-gray-900/80 border border-purple-800/40 rounded-xl p-4 mb-5">
                    <label className="block text-sm font-bold text-purple-400 mb-2">
                        📝 บันทึกผลการชันสูตรเชิงตรรกะ — {cur.label}
                    </label>
                    <textarea rows={5}
                        value={answers[caseIdx]}
                        onChange={e => setAnswers(p => p.map((v, i) => i === caseIdx ? e.target.value : v))}
                        className="w-full bg-gray-950 border border-purple-700/50 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                        placeholder={`อธิบายว่าโค้ดนี้พังเพราะอะไร? บั๊กอยู่ที่ไหน? และจะแก้ยังไง?\n\nตัวอย่าง: "โค้ดนี้มีปัญหา ${cur.bugType?.replace('_', ' ')} เพราะ..."`} />
                    <p className="text-gray-600 text-xs mt-1">ขั้นต่ำ 20 ตัวอักษรเพื่อรับคะแนน • ปัจจุบัน: {answers[caseIdx].length} ตัวอักษร</p>
                </div>

                {/* Navigation + Submit */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <button onClick={() => setCaseIdx(p => Math.max(0, p - 1))} disabled={caseIdx === 0}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm font-bold disabled:opacity-30 hover:border-purple-700 transition-all">
                            ← ก่อนหน้า
                        </button>
                        <button onClick={() => setCaseIdx(p => Math.min(cases.length - 1, p + 1))} disabled={caseIdx === cases.length - 1}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm font-bold disabled:opacity-30 hover:border-purple-700 transition-all">
                            ถัดไป →
                        </button>
                    </div>
                    <button onClick={handleSubmit} disabled={submitting || answers.every(a => a.trim().length < 20)}
                        className="px-8 py-3 rounded-xl font-black text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', boxShadow: '0 0 25px rgba(124,58,237,0.45)' }}>
                        {submitting ? '⏳ กำลังส่ง...' : '📤 ส่งผลการชันสูตรทั้งหมด'}
                    </button>
                </div>
            </main>
        </div>
    );
};

// ── Quiz Blitz View ───────────────────────────────────────────────
const QuizBlitzView = ({ assignment, user, userDoc }) => {
    const cfg = assignment.quizConfig || {};
    const questions = cfg.questions || [];
    const timerMax = cfg.timerPerQuestion || 30;

    const [qIdx, setQIdx] = React.useState(0);
    const [timeLeft, setTimeLeft] = React.useState(timerMax);
    const [selected, setSelected] = React.useState(null);
    const [revealed, setRevealed] = React.useState(false);
    const [answers, setAnswers] = React.useState([]);
    const [totalXP, setTotalXP] = React.useState(0);
    const [done, setDone] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const timerRef = React.useRef(null);

    const cur = questions[qIdx] || {};

    const startTimer = () => {
        clearInterval(timerRef.current);
        setTimeLeft(timerMax);
        timerRef.current = setInterval(() => {
            setTimeLeft(p => {
                if (p <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
                return p - 1;
            });
        }, 1000);
    };

    React.useEffect(() => {
        if (!done) startTimer();
        return () => clearInterval(timerRef.current);
    }, [qIdx, done]);

    const handleTimeout = () => {
        if (revealed) return;
        commitAnswer(null, 0, 0);
    };

    const handleSelect = (opt) => {
        if (revealed) return;
        clearInterval(timerRef.current);
        setSelected(opt.optId);
        setRevealed(true);

        const isCorrect = opt.isCorrect;
        const speedBonus = isCorrect && cfg.speedBonus?.enabled
            ? Math.floor((timeLeft / timerMax) >= (cfg.speedBonus.thresholdPct / 100) ? (cfg.speedBonus.bonusXPPerQ || 0) : 0)
            : 0;
        const pts = isCorrect ? (+cur.points || 0) : 0;
        commitAnswer(opt.optId, pts, speedBonus);
    };

    const commitAnswer = (optId, pts, bonus) => {
        const rec = { qId: cur.qId, selectedOptId: optId, isCorrect: optId ? cur.options?.find(o => o.optId === optId)?.isCorrect : false, pointsEarned: pts, timeUsedSec: timerMax - timeLeft, speedBonusXP: bonus };
        setAnswers(p => [...p, rec]);
        setTotalXP(p => p + pts + bonus);
    };

    const nextQuestion = () => {
        if (qIdx + 1 >= questions.length) {
            clearInterval(timerRef.current);
            setDone(true);
            handleFinalSubmit([...answers]);
        } else {
            setSelected(null);
            setRevealed(false);
            setQIdx(p => p + 1);
        }
    };

    const handleFinalSubmit = async (finalAnswers) => {
        setSubmitting(true);
        try {
            const totalPts = questions.reduce((s, q) => s + (+q.points || 0), 0) || 1;
            const earned = finalAnswers.reduce((s, a) => s + (a.pointsEarned || 0), 0);
            const score = Math.round((earned / totalPts) * 100);
            const speedBonus = finalAnswers.reduce((s, a) => s + (a.speedBonusXP || 0), 0);
            const now = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection('submissions_v2').add({
                assignmentId: assignment.id,
                courseId: assignment.courseId,
                studentId: user.uid,
                activityType: 'quiz_blitz',
                score, rawScore: earned, maxScore: totalPts,
                isPassed: score >= 60, isBestScore: true,
                attemptNumber: 1,
                xpAwarded: score >= 60 ? (assignment.xpReward || 25) : 5,
                submittedAt: now, gradedAt: now,
                code: null, language: null, testResults: [],
                runtimeMetrics: null, autopsyAnswers: null,
                mcqAnswers: finalAnswers,
                quizMetrics: {
                    totalTimeUsedSec: finalAnswers.reduce((s, a) => s + (a.timeUsedSec || 0), 0),
                    averageTimePerQ: finalAnswers.length ? Math.round(finalAnswers.reduce((s, a) => s + (a.timeUsedSec || 0), 0) / finalAnswers.length) : 0,
                    fastestAnswerSec: Math.min(...finalAnswers.map(a => a.timeUsedSec || timerMax)),
                    speedBonusXP: speedBonus,
                    correctStreak: 0,
                    perfectScore: score === 100,
                },
                prePostMeta: null,
                aiAnalysis: { feedback: null, metrics: { quality: null, correctness: null, efficiency: null, readability: null, bestPractices: null }, issues: [], suggestion: null, analyzedAt: null },
            });

            if (score >= 60 && typeof awardXP === 'function') {
                awardXP(user.uid, assignment.xpReward || 25, 'submission_accepted', assignment.id).catch(console.error);
            }
        } catch (err) { console.error(err); }
        finally { setSubmitting(false); }
    };

    // ── Quiz End Screen ──
    if (done) {
        const totalPts = questions.reduce((s, q) => s + (+q.points || 0), 0) || 1;
        const earned = answers.reduce((s, a) => s + (a.pointsEarned || 0), 0);
        const score = Math.round((earned / totalPts) * 100);
        const correctCount = answers.filter(a => a.isCorrect).length;
        const speedXP = answers.reduce((s, a) => s + (a.speedBonusXP || 0), 0);

        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0d0d1f,#1a1a3e)' }}>
                <div className="max-w-md w-full mx-4">
                    <div className="bg-gray-900/90 border border-purple-700/50 rounded-2xl p-8 text-center"
                        style={{ boxShadow: '0 0 50px rgba(139,92,246,0.3)' }}>
                        <div className="text-6xl mb-3">{score >= 80 ? '🏆' : score >= 60 ? '✅' : '📚'}</div>
                        <h2 className="text-2xl font-black text-white mb-1">Quiz Blitz จบแล้ว!</h2>
                        <div className="text-5xl font-black my-4" style={{ color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' }}>
                            {score}%
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-xl font-black text-green-400">{correctCount}/{questions.length}</div><div className="text-gray-500 text-xs">ถูก</div></div>
                            <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-xl font-black text-cyan-400">+{assignment.xpReward || 25}</div><div className="text-gray-500 text-xs">XP</div></div>
                            <div className="bg-gray-800/60 rounded-xl p-3"><div className="text-xl font-black text-yellow-400">+{speedXP}</div><div className="text-gray-500 text-xs">Speed XP</div></div>
                        </div>
                        {submitting && <p className="text-gray-500 text-sm mb-3">กำลังบันทึกผล...</p>}
                        <button onClick={() => window.location.hash = '#/student/dashboard'}
                            className="w-full py-3 rounded-xl font-black text-white"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                            กลับ Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const timerPct = (timeLeft / timerMax) * 100;
    const timerColor = timerPct > 60 ? '#10b981' : timerPct > 30 ? '#f59e0b' : '#ef4444';

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#0d0d1f,#1a1a3e)' }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="⚡ Quiz Blitz" />
            <main className="max-w-2xl mx-auto px-4 py-8">
                {/* Progress */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 text-sm font-bold">ข้อ {qIdx + 1} / {questions.length}</span>
                    <span className="text-sm font-bold" style={{ color: timerColor }}>⏱ {timeLeft}s</span>
                </div>

                {/* Timer bar */}
                <div className="h-3 bg-gray-800 rounded-full mb-6 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${timerPct}%`, background: `linear-gradient(90deg,${timerColor},${timerColor}88)`, boxShadow: `0 0 10px ${timerColor}` }} />
                </div>

                {/* XP running total */}
                <div className="text-right mb-4">
                    <span className="text-xs text-purple-400 font-bold">XP สะสม: </span>
                    <span className="text-yellow-400 font-black text-sm">+{totalXP}</span>
                </div>

                {/* Question */}
                <div className="bg-gray-900/90 border border-cyan-800/40 rounded-2xl p-6 mb-5"
                    style={{ boxShadow: '0 0 25px rgba(6,182,212,0.15)' }}>
                    <p className="text-white font-bold text-base mb-3">{cur.stem}</p>
                    {cur.code?.trim() && (
                        <pre className="bg-gray-950 rounded-lg p-3 text-xs font-mono text-green-300 overflow-auto mb-2">{cur.code}</pre>
                    )}
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 gap-3">
                    {(cur.options || []).map(opt => {
                        let style = 'bg-gray-800/60 border-gray-700/50 text-gray-200 hover:border-cyan-600/60 hover:bg-gray-800';
                        if (revealed) {
                            if (opt.isCorrect) style = 'bg-green-900/40 border-green-500 text-green-200';
                            else if (opt.optId === selected && !opt.isCorrect) style = 'bg-red-900/40 border-red-500 text-red-200';
                            else style = 'bg-gray-800/40 border-gray-700/30 text-gray-500 opacity-60';
                        }
                        return (
                            <button key={opt.optId} onClick={() => handleSelect(opt)} disabled={revealed}
                                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border text-left font-medium text-sm transition-all duration-200 ${style}`}
                                style={!revealed ? { cursor: 'pointer' } : { cursor: 'default' }}>
                                <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0 ${revealed && opt.isCorrect ? 'bg-green-500 border-green-400' : revealed && opt.optId === selected ? 'bg-red-500 border-red-400' : 'border-gray-600'}`}>
                                    {opt.optId.toUpperCase()}
                                </span>
                                {opt.text}
                                {revealed && opt.isCorrect && <span className="ml-auto text-green-400">✓ ถูก!</span>}
                                {revealed && opt.optId === selected && !opt.isCorrect && <span className="ml-auto text-red-400">✗</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation + Next */}
                {revealed && (
                    <div className="mt-4">
                        {cur.explanation && (
                            <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-4 mb-4 text-sm text-blue-200">
                                💡 {cur.explanation}
                            </div>
                        )}
                        {answers.slice(-1)[0]?.speedBonusXP > 0 && (
                            <div className="text-center text-yellow-400 font-black text-sm mb-3 animate-bounce">
                                ⚡ Speed Bonus: +{answers.slice(-1)[0].speedBonusXP} XP!
                            </div>
                        )}
                        <button onClick={nextQuestion}
                            className="w-full py-3 rounded-xl font-black text-white"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                            {qIdx + 1 < questions.length ? 'ข้อต่อไป →' : '🏁 จบ Quiz!'}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

// ── End-of-Session Skill Radar ────────────────────────────────────
const SessionEndScreen = ({ studentId }) => {
    const [subs, setSubs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    React.useEffect(() => {
        db.collection('submissions_v2').where('studentId', '==', studentId)
            .orderBy('submittedAt', 'desc').limit(50).get()
            .then(snap => { setSubs(snap.docs.map(d => d.data())); setLoading(false); })
            .catch(() => setLoading(false));
    }, [studentId]);

    React.useEffect(() => {
        if (loading || !canvasRef.current) return;

        const codingSubs = subs.filter(s => s.activityType === 'coding');
        const autopsySubs = subs.filter(s => s.activityType === 'autopsy');
        const quizSubs = subs.filter(s => s.activityType === 'quiz_blitz');

        const syntax = codingSubs.length ? Math.round(codingSubs.reduce((a, b) => a + (b.score || 0), 0) / codingSubs.length) : 0;
        const logic = autopsySubs.length ? Math.round(autopsySubs.reduce((a, b) => a + (b.score || 0), 0) / autopsySubs.length) : 0;
        const debugging = autopsySubs.length ? Math.min(100, autopsySubs.filter(s => s.isPassed).length / Math.max(1, autopsySubs.length) * 100) : 0;
        const timeManagement = quizSubs.length ? Math.round(quizSubs.reduce((a, b) => {
            const avg = b.quizMetrics?.averageTimePerQ || 30;
            const timer = b.quizConfig?.timerPerQuestion || 30;
            return a + Math.max(0, 100 - (avg / timer) * 100);
        }, 0) / quizSubs.length) : 0;
        const aiCollab = Math.min(100, subs.filter(s => s.aiAnalysis?.feedback).length * 20);

        if (chartRef.current) chartRef.current.destroy();
        chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['Syntax\nMastery', 'Logic\nSkill', 'Debugging', 'Time\nManagement', 'AI\nCollaboration'],
                datasets: [{
                    label: 'ทักษะของคุณ',
                    data: [syntax, logic, Math.round(debugging), Math.round(timeManagement), aiCollab],
                    backgroundColor: 'rgba(139,92,246,0.25)',
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    pointBackgroundColor: '#06b6d4',
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                }],
            },
            options: {
                scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20, color: '#6b7280', backdropColor: 'transparent' }, grid: { color: '#1f2937' }, pointLabels: { color: '#c4b5fd', font: { size: 11, weight: 'bold' } } } },
                plugins: { legend: { display: false } },
            },
        });
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [subs, loading]);

    const totalXP = subs.reduce((s, x) => s + (x.xpAwarded || 0), 0);
    const passedCount = subs.filter(s => s.isPassed).length;

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#0d0d1f,#1a1a3e)' }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="🏁 สรุปผลการเรียน" />
            <main className="max-w-2xl mx-auto px-4 py-10 text-center">
                <h2 className="text-3xl font-black mb-2" style={{ background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    🏁 สรุปผลประจำคาบ
                </h2>
                <p className="text-gray-500 text-sm mb-6">กราฟแมงมุมสมรรถนะ 5 มิติของคุณ</p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-gray-900/80 border border-purple-800/40 rounded-xl p-4"><div className="text-2xl font-black text-yellow-400">+{totalXP}</div><div className="text-gray-500 text-xs">XP ทั้งคาบ</div></div>
                    <div className="bg-gray-900/80 border border-purple-800/40 rounded-xl p-4"><div className="text-2xl font-black text-green-400">{passedCount}</div><div className="text-gray-500 text-xs">กิจกรรมผ่าน</div></div>
                    <div className="bg-gray-900/80 border border-purple-800/40 rounded-xl p-4"><div className="text-2xl font-black text-cyan-400">{subs.length}</div><div className="text-gray-500 text-xs">งานที่ส่ง</div></div>
                </div>

                <div className="bg-gray-900/80 border border-purple-800/40 rounded-2xl p-6" style={{ boxShadow: '0 0 40px rgba(139,92,246,0.2)' }}>
                    <h3 className="text-purple-300 font-bold mb-4">🕸️ Skill Radar Chart</h3>
                    {loading ? <div className="py-12 text-gray-500">กำลังโหลด...</div> : <canvas ref={canvasRef}></canvas>}
                </div>

                <button onClick={() => window.location.hash = '#/student/dashboard'}
                    className="mt-6 px-8 py-3 rounded-xl font-black text-white"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', boxShadow: '0 0 25px rgba(124,58,237,0.4)' }}>
                    กลับ Dashboard
                </button>
            </main>
        </div>
    );
};

// ── Main Router ───────────────────────────────────────────────────
const StudentActivityView = () => {
    const { user, userDoc } = useAuth();
    const [assignment, setAssignment] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Parse assignmentId from hash: #/student/activity/ASSIGNMENT_ID
    const hash = window.location.hash;
    const parts = hash.split('/');
    const assignmentId = parts[parts.length - 1];

    React.useEffect(() => {
        if (!assignmentId || assignmentId === 'activity') { setLoading(false); return; }
        db.collection('assignments_v2').doc(assignmentId).get()
            .then(doc => {
                if (doc.exists) setAssignment({ id: doc.id, ...doc.data() });
                else setError('ไม่พบกิจกรรมนี้');
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [assignmentId]);

    if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d1f' }}><Spinner /></div>;

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d1f' }}>
            <div className="text-center"><Spinner /><p className="text-gray-400 mt-3 text-sm">กำลังโหลดกิจกรรม...</p></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d1f' }}>
            <div className="text-center text-red-400"><div className="text-4xl mb-3">❌</div><p>{error}</p></div>
        </div>
    );

    // Special route: end-of-session radar
    if (assignmentId === 'session-end') {
        return <SessionEndScreen studentId={user.uid} />;
    }

    if (!assignment) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d1f' }}>
            <div className="text-center text-gray-500"><div className="text-4xl mb-3">📭</div><p>ไม่พบกิจกรรม</p></div>
        </div>
    );

    if (assignment.activityType === 'autopsy') {
        return <AutopsyView assignment={assignment} user={user} userDoc={userDoc} />;
    }
    if (assignment.activityType === 'quiz_blitz' || assignment.activityType === 'pre_post_test') {
        return <QuizBlitzView assignment={assignment} user={user} userDoc={userDoc} />;
    }

    // Coding → redirect to existing CodingWorkspace
    window.location.hash = `#/student/coding/${assignmentId}`;
    return null;
};

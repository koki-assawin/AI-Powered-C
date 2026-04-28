// js/pages/student/CodingWorkspace.js
// Combined: Auto-Grader + AI Practice Lab

const CodingWorkspace = () => {
    const { userDoc } = useAuth();

    // Parse URL params: #/student/workspace?course=XXX&assignment=YYY
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const courseId = params.get('course');
    const assignmentId = params.get('assignment');

    const [course, setCourse] = React.useState(null);
    const [assignments, setAssignments] = React.useState([]);
    const [currentAssignment, setCurrentAssignment] = React.useState(null);
    const [visibleTestCases, setVisibleTestCases] = React.useState([]);
    const [lessons, setLessons] = React.useState([]);

    const [selectedLanguage, setSelectedLanguage] = React.useState('c');
    const [code, setCode] = React.useState(LANGUAGES.c.defaultCode);
    const [activeTab, setActiveTab] = React.useState('workspace'); // 'workspace' | 'description'

    // Grader state
    const [submitting, setSubmitting] = React.useState(false);
    const [sampleRunning, setSampleRunning] = React.useState(false);
    const [gradeResult, setGradeResult] = React.useState(null);
    const [sampleResults, setSampleResults] = React.useState(null);
    const [cooldown, setCooldown] = React.useState(0);

    // AI state
    const [aiAnalyzing, setAiAnalyzing] = React.useState(false);
    const [aiResult, setAiResult] = React.useState(null);
    const [chatHistory, setChatHistory] = React.useState([]);
    const [chatInput, setChatInput] = React.useState('');
    const [chatLoading, setChatLoading] = React.useState(false);

    // AI Scaffolding state
    const [scaffoldHint, setScaffoldHint] = React.useState('');
    const [hintLoading, setHintLoading] = React.useState(false);
    const [hintLevel, setHintLevel] = React.useState(0); // 0=no hint yet, 1/2/3=level shown

    // Exam Mode state
    const [examTimeLeft, setExamTimeLeft] = React.useState(null); // seconds
    const [examStarted, setExamStarted] = React.useState(false);
    const [tabSwitchCount, setTabSwitchCount] = React.useState(0);
    const [examFinished, setExamFinished] = React.useState(false);

    // Gamification state
    const [xpReward, setXpReward] = React.useState(null);   // { xp, coin, crystal, didRankUp, newTier }
    const [showXpToast, setShowXpToast] = React.useState(false);
    const [newAchievements, setNewAchievements] = React.useState([]);
    const [mindsetMessage, setMindsetMessage] = React.useState('');
    const [challengeMessage, setChallengeMessage] = React.useState('');
    const consecutiveFailRef = React.useRef(0);

    const [loading, setLoading] = React.useState(true);
    const [view, setView] = React.useState('problems'); // 'problems' | 'grade' | 'ai'

    // Collapsible tree state
    const [collapsedUnits, setCollapsedUnits] = React.useState({});
    const [collapsedGroups, setCollapsedGroups] = React.useState({});
    const fileInputRef = React.useRef(null);

    const isExamMode = currentAssignment?.assignmentType === 'exam';

    React.useEffect(() => { if (courseId) loadCourse(); }, [courseId]);
    React.useEffect(() => { if (currentAssignment) loadTestCases(); }, [currentAssignment]);

    // Cooldown timer
    React.useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    // Exam countdown timer
    React.useEffect(() => {
        if (!examStarted || examTimeLeft === null || examTimeLeft <= 0) return;
        const t = setInterval(() => {
            setExamTimeLeft(s => {
                if (s <= 1) {
                    clearInterval(t);
                    setExamFinished(true);
                    handleSubmit();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [examStarted, examTimeLeft]);

    // Tab-switch detection (exam mode only)
    React.useEffect(() => {
        if (!isExamMode || !examStarted || examFinished) return;
        const handler = () => {
            if (!document.hidden) return;
            setTabSwitchCount(prev => {
                const n = prev + 1;
                if (n === 1) alert('⚠️ คำเตือนครั้งที่ 1: ตรวจพบการออกจากหน้าจอสอบ กรุณาอยู่ในหน้านี้');
                else if (n === 2) alert('⚠️ คำเตือนครั้งที่ 2: หากออกอีกครั้งระบบจะส่งงานโดยอัตโนมัติ');
                else if (n >= 3) { handleSubmit(); }
                return n;
            });
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, [isExamMode, examStarted, examFinished]);

    const startExam = () => {
        const minutes = currentAssignment?.examDurationMinutes || 30;
        setExamTimeLeft(minutes * 60);
        setExamStarted(true);
        setTabSwitchCount(0);
        setExamFinished(false);
    };

    const formatExamTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const loadCourse = async () => {
        setLoading(true);
        try {
            const courseSnap = await db.collection('courses').doc(courseId).get();
            if (!courseSnap.exists) return;
            const c = { id: courseSnap.id, ...courseSnap.data() };
            setCourse(c);
            setSelectedLanguage(c.language || 'c');
            setCode(localStorage.getItem(`draft_${courseId}`) || LANGUAGES[c.language || 'c'].defaultCode);

            // Load assignments (critical - must not block on lesson index error)
            const assignSnap = await db.collection('assignments').where('courseId', '==', courseId).get();
            const assigns = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAssignments(assigns);

            // Load lessons separately (needs composite index - may fail silently)
            db.collection('lessons').where('courseId', '==', courseId).orderBy('order').get()
                .then(snap => setLessons(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
                .catch(() => {
                    // Fallback: load without ordering if index not ready
                    db.collection('lessons').where('courseId', '==', courseId).get()
                        .then(snap => setLessons(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
                });

            // Auto-select assignment from URL or first one
            const target = assigns.find(a => a.id === assignmentId) || assigns[0];
            if (target) selectAssignment(target);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleHint = async () => {
        if (!currentAssignment) return;
        const nextLevel = Math.min(hintLevel + 1, 3);
        setHintLevel(nextLevel);
        setHintLoading(true);
        setScaffoldHint('');
        try {
            // Use Socratic Coach (Phase 2) if available, else fall back to legacy
            let hint;
            if (typeof getSocraticHint === 'function') {
                hint = await getSocraticHint(
                    userDoc?.id, currentAssignment.title, currentAssignment.description,
                    code, selectedLanguage, nextLevel
                );
            } else {
                const failedTests = (gradeResult?.testResults || []).filter(r => !r.passed);
                hint = await getScaffoldingHint(
                    code, selectedLanguage,
                    currentAssignment.title, currentAssignment.description,
                    failedTests, nextLevel
                );
            }
            setScaffoldHint(hint);
        } catch (err) {
            setScaffoldHint('ขออภัย ไม่สามารถขอคำใบ้ได้: ' + err.message);
        } finally {
            setHintLoading(false);
        }
    };

    const selectAssignment = (assign) => {
        setCurrentAssignment(assign);
        setGradeResult(null);
        setSampleResults(null);
        setAiResult(null);
        setScaffoldHint('');
        setHintLevel(0);
        setExamStarted(false);
        setExamTimeLeft(null);
        setExamFinished(false);
        setTabSwitchCount(0);
        setView('problems');
        // Restore draft
        const draft = localStorage.getItem(`draft_${assign.id}`);
        if (draft) setCode(draft);
        else setCode(LANGUAGES[assign.language || selectedLanguage]?.defaultCode || '');
    };

    const loadTestCases = async () => {
        const snap = await db.collection('testCases')
            .where('assignmentId', '==', currentAssignment.id)
            .where('isHidden', '==', false)
            .orderBy('order')
            .get();
        setVisibleTestCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    // Save draft on code change
    React.useEffect(() => {
        if (currentAssignment) {
            localStorage.setItem(`draft_${currentAssignment.id}`, code);
        }
    }, [code]);

    const handleRunSample = async () => {
        if (!currentAssignment) return;
        setSampleRunning(true);
        setSampleResults(null);
        setView('grade');
        try {
            const results = await runSampleTests(code, selectedLanguage, currentAssignment.id);
            setSampleResults(results);
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการรันโค้ด: ' + err.message);
        } finally {
            setSampleRunning(false);
        }
    };

    const handleSubmit = async () => {
        if (!currentAssignment || !userDoc) return;

        const check = canSubmit(currentAssignment.id);
        if (!check.allowed) {
            setCooldown(check.waitSeconds);
            return;
        }

        setSubmitting(true);
        setGradeResult(null);
        setView('grade');
        try {
            const result = await gradeSubmission(
                userDoc.id, currentAssignment.id, courseId, code, selectedLanguage
            );
            setGradeResult(result);

            // ── Non-blocking gamification hook ───────────────────────────────
            (async () => {
                try {
                    if (typeof awardXP !== 'function') return;
                    const score = result?.score ?? 0;
                    const passed = score >= 60;

                    // Track consecutive fails for Mindset Coach
                    if (!passed) {
                        consecutiveFailRef.current += 1;
                    } else {
                        consecutiveFailRef.current = 0;
                        setMindsetMessage('');
                    }

                    // ── Mindset Coach (Engage): trigger on 3+ consecutive fails ──
                    if (!passed && consecutiveFailRef.current >= 3 && typeof getMindsetCoach === 'function') {
                        getMindsetCoach(userDoc.id, currentAssignment.title, consecutiveFailRef.current)
                            .then(msg => setMindsetMessage(msg))
                            .catch(() => {});
                    }

                    const { xp, coin, crystal } = calculateSubmissionXP(score);
                    let bonusXP = 0, bonusCoin = 0, bonusCrystal = 0;
                    let isFirstSolve = false;

                    // First-solve bonus (score ≥ 60%)
                    if (passed && typeof checkIsFirstSolve === 'function') {
                        isFirstSolve = await checkIsFirstSolve(userDoc.id, currentAssignment.id);
                        if (isFirstSolve) { bonusXP = 20; bonusCoin = 5; bonusCrystal = 1; }
                    }

                    const rankResult = await awardXP(
                        userDoc.id,
                        xp + bonusXP, coin + bonusCoin, crystal + bonusCrystal,
                        'submission_accepted',
                        currentAssignment.id,
                        { score, assignmentTitle: currentAssignment.title, firstSolve: isFirstSolve }
                    );

                    setXpReward({
                        xp: xp + bonusXP, coin: coin + bonusCoin,
                        crystal: crystal + bonusCrystal,
                        firstSolve: isFirstSolve,
                        didRankUp: rankResult?.didRankUp,
                        newTier: rankResult?.newTier,
                    });
                    setShowXpToast(true);
                    setTimeout(() => setShowXpToast(false), 6000);

                    // ── Challenge Coach (Elaborate): score ≥ 90% ──
                    if (score >= 90 && typeof getChallengeCoach === 'function') {
                        getChallengeCoach(userDoc.id, currentAssignment.title, selectedLanguage, score)
                            .then(msg => setChallengeMessage(msg))
                            .catch(() => {});
                    }

                    // ── Achievement check ──
                    if (typeof checkAndAwardAchievements === 'function') {
                        const ctx = {
                            event: 'submission',
                            score,
                            isFirstSolve,
                            hintLevel,
                            failCountBefore: consecutiveFailRef.current,
                            difficulty: currentAssignment.difficulty || 'medium',
                            timeSpentSeconds: 9999, // placeholder (Phase 4 will track)
                            unitPassRate: 0,
                            unitTotal: 0,
                        };
                        const awarded = await checkAndAwardAchievements(userDoc.id, ctx);
                        if (awarded.length > 0) setNewAchievements(awarded);
                    }

                    // ── Rank-up achievement ──
                    if (rankResult?.didRankUp && typeof checkAndAwardAchievements === 'function') {
                        checkAndAwardAchievements(userDoc.id, {
                            event: 'rankup',
                            newRank: rankResult.newTier?.level || 0,
                        }).catch(() => {});
                    }

                    // Update leaderboard asynchronously
                    if (typeof updateLeaderboard === 'function') {
                        updateLeaderboard().catch(() => {});
                    }
                } catch (gErr) {
                    console.warn('[gamification] award error (non-blocking):', gErr);
                }
            })();
            // ─────────────────────────────────────────────────────────────────
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
            setView('problems');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAIAnalysis = async () => {
        setAiAnalyzing(true);
        setAiResult(null);
        setView('ai');
        try {
            const result = await analyzeCode(code, selectedLanguage);
            setAiResult(result);
            // Update submission with AI metrics if we have a recent submission
            if (gradeResult?.submissionId) {
                await db.collection('submissions').doc(gradeResult.submissionId).update({
                    aiScore: Math.round(Object.values(result.metrics).reduce((a, b) => a + b, 0) / 5),
                    aiMetrics: result.metrics,
                });
            }
        } catch (err) {
            setAiResult({ status: 'error', feedback: 'เกิดข้อผิดพลาด: ' + err.message });
        } finally {
            setAiAnalyzing(false);
        }
    };

    const handleChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const q = chatInput;
        setChatHistory(h => [...h, { role: 'user', text: q }]);
        setChatInput('');
        setChatLoading(true);
        try {
            const reply = await chatWithAI(q, selectedLanguage);
            setChatHistory(h => [...h, { role: 'bot', text: reply }]);
        } catch (err) {
            setChatHistory(h => [...h, { role: 'bot', text: 'ขออภัย: ' + err.message }]);
        } finally {
            setChatLoading(false);
        }
    };

    // Build assignment tree: sorted array of { unitName, groups: sorted array of { groupName, assignments } }
    const assignmentTree = React.useMemo(() => {
        const unitMap = {};
        assignments.forEach(a => {
            const unit  = a.unitName  || '📂 ไม่มีหน่วย';
            const group = a.groupName || '📁 ไม่มีกลุ่ม';
            if (!unitMap[unit]) unitMap[unit] = {};
            if (!unitMap[unit][group]) unitMap[unit][group] = [];
            unitMap[unit][group].push(a);
        });
        const unitNum = (name) => parseInt((name || '').match(/\d+/)?.[0] || '999');
        return Object.keys(unitMap)
            .sort((a, b) => unitNum(a) - unitNum(b))
            .map(unitName => ({
                unitName,
                groups: Object.keys(unitMap[unitName])
                    .sort((a, b) => a.localeCompare(b, 'th'))
                    .map(groupName => ({
                        groupName,
                        assignments: [...unitMap[unitName][groupName]].sort((a, b) =>
                            (a.title || '').localeCompare(b.title || '', 'th')
                        ),
                    })),
            }));
    }, [assignments]);

    const toggleUnit  = (u) => setCollapsedUnits(s => ({ ...s, [u]: !s[u] }));
    const toggleGroup = (k) => setCollapsedGroups(s => ({ ...s, [k]: !s[k] }));

    const handleFileAttach = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setCode(ev.target.result);
        reader.readAsText(file, 'UTF-8');
        // Reset input so the same file can be reloaded
        e.target.value = '';
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8"><Spinner text="กำลังโหลดรายวิชา..." /></div>
        </div>
    );

    // Exam start gate: if exam mode and not started yet
    if (isExamMode && !examStarted && currentAssignment) {
        return (
            <div className="min-h-screen" style={{ background: '#fdf2f8', fontFamily: "'Prompt',sans-serif" }}>
                <Navbar title="AI-Powered Coding Platform" subtitle="โหมดสอบ" />
                <div style={{ maxWidth: '480px', margin: '80px auto', padding: '0 16px' }}>
                    <div className="k-card p-10 text-center">
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#be185d', marginBottom: '8px' }}>
                            โหมดสอบ — {currentAssignment.title}
                        </h2>
                        <p style={{ color: '#9d174d', marginBottom: '24px' }}>
                            ⏱ เวลาสอบ {currentAssignment.examDurationMinutes || 30} นาที
                        </p>
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                            <p style={{ fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>📋 กฎการสอบ:</p>
                            <ul style={{ fontSize: '13px', color: '#6b7280', lineHeight: '2', paddingLeft: '16px' }}>
                                <li>ห้ามสลับหน้าต่างหรือแท็บ (ตรวจจับอัตโนมัติ)</li>
                                <li>สลับหน้าจอ 2 ครั้งแรก = คำเตือน / ครั้งที่ 3 = ส่งงานอัตโนมัติ</li>
                                <li>ปิดระบบ AI ช่วยเหลือชั่วคราว</li>
                                <li>เมื่อหมดเวลาระบบจะส่งงานโดยอัตโนมัติ</li>
                            </ul>
                        </div>
                        <button onClick={startExam} className="k-btn-pink" style={{ width: '100%', padding: '14px', fontSize: '16px' }}>
                            🚀 เริ่มสอบ
                        </button>
                        <a href={`#/student/courses`} style={{ display: 'block', marginTop: '12px', fontSize: '13px', color: '#f472b6', textDecoration: 'none' }}>
                            ← กลับ ไม่สอบตอนนี้
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar title="AI-Powered Coding Platform" subtitle={LANGUAGES[selectedLanguage]?.name} />

            {/* XP Reward Toast */}
            {showXpToast && xpReward && (
                <div style={{
                    position: 'fixed', top: 80, right: 20, zIndex: 9999,
                    background: xpReward.didRankUp
                        ? `linear-gradient(135deg, ${xpReward.newTier?.color || '#818cf8'}, #1e293b)`
                        : 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: `1.5px solid ${xpReward.newTier?.color || '#60a5fa'}`,
                    borderRadius: 16, padding: '14px 20px',
                    color: '#f1f5f9', fontFamily: "'Prompt',sans-serif",
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    minWidth: 220, maxWidth: 300,
                    animation: 'slideIn 0.3s ease',
                }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                        {xpReward.didRankUp
                            ? `🎉 เลื่อนระดับ! ${xpReward.newTier?.icon} ${xpReward.newTier?.name}`
                            : '✨ ได้รับ XP!'}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                        <span style={{ color: '#60a5fa' }}>+{xpReward.xp} XP</span>
                        {xpReward.coin > 0 && <span style={{ color: '#fbbf24' }}>+{xpReward.coin} 🪙</span>}
                        {xpReward.crystal > 0 && <span style={{ color: '#67e8f9' }}>+{xpReward.crystal} 💎</span>}
                    </div>
                    {xpReward.firstSolve && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#a78bfa' }}>
                            🌟 โบนัสแก้โจทย์ครั้งแรก!
                        </div>
                    )}
                </div>
            )}

            {/* Achievement Toast (stacked below XP toast) */}
            {newAchievements.length > 0 && (
                <div style={{
                    position: 'fixed', top: showXpToast ? 210 : 80, right: 20, zIndex: 9998,
                    display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                    {newAchievements.slice(0, 3).map(ach => (
                        <div key={ach.id} style={{
                            background: `linear-gradient(135deg, ${(typeof RARITY_COLOR !== 'undefined' ? RARITY_COLOR[ach.rarity] : '#60a5fa') || '#60a5fa'}33, #1e293b)`,
                            border: `1.5px solid ${(typeof RARITY_COLOR !== 'undefined' ? RARITY_COLOR[ach.rarity] : '#60a5fa') || '#60a5fa'}`,
                            borderRadius: 14, padding: '12px 16px',
                            color: '#f1f5f9', fontFamily: "'Prompt',sans-serif",
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            minWidth: 200, maxWidth: 280,
                        }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                                {ach.icon} Badge ใหม่!
                            </div>
                            <div style={{ fontWeight: 600 }}>{ach.nameTh}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{ach.desc}</div>
                            {ach.xpReward > 0 && (
                                <div style={{ fontSize: 12, color: '#60a5fa', marginTop: 4 }}>+{ach.xpReward} XP</div>
                            )}
                        </div>
                    ))}
                    <button onClick={() => setNewAchievements([])}
                        style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>
                        ปิด ✕
                    </button>
                </div>
            )}

            {/* Mindset Coach Message (Engage — shown below grade result) */}
            {mindsetMessage && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 20, zIndex: 9997,
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: '1.5px solid #f97316',
                    borderRadius: 16, padding: '14px 18px',
                    color: '#f1f5f9', fontFamily: "'Prompt',sans-serif",
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    maxWidth: 320,
                }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#f97316' }}>
                        🧡 AI Coach พูดว่า...
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{mindsetMessage}</p>
                    <button onClick={() => setMindsetMessage('')}
                        style={{ marginTop: 8, fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                        ขอบคุณ ✕
                    </button>
                </div>
            )}

            {/* Challenge Coach Message (Elaborate — shown for high scores) */}
            {challengeMessage && (
                <div style={{
                    position: 'fixed', bottom: 24, left: 20, zIndex: 9997,
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: '1.5px solid #a78bfa',
                    borderRadius: 16, padding: '14px 18px',
                    color: '#f1f5f9', fontFamily: "'Prompt',sans-serif",
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    maxWidth: 320,
                }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#a78bfa' }}>
                        🚀 Challenge Coach
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{challengeMessage}</p>
                    <button onClick={() => setChallengeMessage('')}
                        style={{ marginTop: 8, fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                        รับทราบ ✕
                    </button>
                </div>
            )}

            {/* Exam Mode Banner */}
            {isExamMode && examStarted && (
                <div style={{
                    background: examTimeLeft < 300 ? 'linear-gradient(90deg,#dc2626,#ef4444)' : 'linear-gradient(90deg,#9d174d,#ec4899)',
                    color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', fontFamily: "'Prompt',sans-serif",
                    animation: examTimeLeft < 60 ? 'lms-spin 1s' : 'none',
                }}>
                    <span style={{ fontWeight: 600 }}>🏆 โหมดสอบ — {currentAssignment?.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {tabSwitchCount > 0 && (
                            <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px' }}>
                                ⚠️ สลับหน้าจอ {tabSwitchCount}/3 ครั้ง
                            </span>
                        )}
                        <div style={{
                            background: 'rgba(255,255,255,.15)', borderRadius: '10px', padding: '6px 16px',
                            fontWeight: 700, fontSize: '18px', fontFamily: 'monospace',
                            border: examTimeLeft < 300 ? '2px solid white' : 'none',
                        }}>
                            ⏱ {examTimeLeft !== null ? formatExamTime(examTimeLeft) : '--:--'}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Collapsible assignment tree */}
                <aside className="w-72 bg-white border-r overflow-y-auto hidden lg:flex flex-col" style={{ borderColor: '#E0E0E0' }}>
                    <div className="px-3 py-3 border-b flex items-center justify-between" style={{ borderColor: '#F5F5F5' }}>
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#AD1457' }}>📂 โจทย์</span>
                        <button onClick={() => loadCourse()} title="รีโหลด"
                            className="text-gray-400 hover:text-pink-500 text-xs px-2 py-1 rounded hover:bg-pink-50 transition-colors">
                            🔄
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-2">
                        {assignments.length === 0 ? (
                            <div className="text-center py-8 px-4">
                                <p className="text-gray-400 text-sm">ยังไม่มีโจทย์</p>
                            </div>
                        ) : (
                            assignmentTree.map(({ unitName, groups }) => {
                                const unitCollapsed = collapsedUnits[unitName];
                                return (
                                    <div key={unitName} className="mb-1">
                                        {/* Unit row */}
                                        <button
                                            onClick={() => toggleUnit(unitName)}
                                            className="w-full flex items-center px-3 py-2 text-xs font-bold text-left transition-colors hover:bg-pink-50"
                                            style={{ color: '#AD1457' }}
                                        >
                                            <span className="mr-1.5 text-xs" style={{ minWidth: '12px' }}>
                                                {unitCollapsed ? '▶' : '▼'}
                                            </span>
                                            <span className="truncate">{unitName}</span>
                                        </button>

                                        {!unitCollapsed && groups.map(({ groupName, assignments: groupAssigns }) => {
                                            const groupKey = `${unitName}::${groupName}`;
                                            const groupCollapsed = collapsedGroups[groupKey];
                                            return (
                                                <div key={groupKey}>
                                                    {/* Group row */}
                                                    <button
                                                        onClick={() => toggleGroup(groupKey)}
                                                        className="w-full flex items-center pl-6 pr-3 py-1.5 text-xs text-left transition-colors hover:bg-gray-50"
                                                        style={{ color: '#6B7280' }}
                                                    >
                                                        <span className="mr-1.5" style={{ minWidth: '12px' }}>
                                                            {groupCollapsed ? '▶' : '▼'}
                                                        </span>
                                                        <span className="truncate">{groupName}</span>
                                                    </button>

                                                    {!groupCollapsed && groupAssigns.map(a => (
                                                        <button
                                                            key={a.id}
                                                            onClick={() => selectAssignment(a)}
                                                            className={`w-full text-left pl-10 pr-3 py-2 text-sm transition-colors
                                                                ${currentAssignment?.id === a.id
                                                                    ? 'font-semibold border-r-2'
                                                                    : 'text-gray-600 hover:bg-gray-50'}`}
                                                            style={currentAssignment?.id === a.id
                                                                ? { color: '#C2185B', borderColor: '#EC407A', background: '#FFF5F7' }
                                                                : {}}
                                                        >
                                                            <div className="flex items-start gap-1.5">
                                                                <span className="mt-0.5 text-xs shrink-0" style={{ color: '#F48FB1' }}>
                                                                    {a.assignmentType === 'exam' ? '🏆' : '📝'}
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-xs leading-snug">{a.topicName ? `${a.topicName} — ` : ''}{a.title}</div>
                                                                    <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                                                                        {a.difficulty}{a.timeLimit ? ` • ${a.timeLimit/1000}s` : ''}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Main area */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Code Editor Panel */}
                    <div className="flex-1 flex flex-col p-4 min-w-0">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                                {Object.keys(LANGUAGES).map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => setSelectedLanguage(lang)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                            ${selectedLanguage === lang ? 'text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                        style={selectedLanguage === lang ? { background: '#EC407A' } : {}}
                                    >
                                        {LANGUAGES[lang].icon} {LANGUAGES[lang].name}
                                    </button>
                                ))}
                                {/* Format code button */}
                                <button
                                    onClick={() => setCode(formatCCode(code, selectedLanguage))}
                                    title="จัดรูปแบบโค้ด (Alt+Shift+F)"
                                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1 transition-colors select-none"
                                    style={{ border: '1px solid #E0E0E0' }}
                                >
                                    ✨ Format
                                </button>
                                {/* File attach button */}
                                <label title="โหลดไฟล์โค้ด"
                                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 cursor-pointer flex items-center gap-1 transition-colors select-none"
                                    style={{ border: '1px solid #E0E0E0' }}>
                                    📎 แนบไฟล์
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".c,.cpp,.py,.java,.txt"
                                        onChange={handleFileAttach}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                {/* Run sample: hidden in exam mode */}
                                {!isExamMode && (
                                    <button
                                        onClick={handleRunSample}
                                        disabled={sampleRunning || !currentAssignment}
                                        className="px-4 py-1.5 text-white rounded-lg text-sm disabled:opacity-50 flex items-center space-x-1"
                                        style={{ background: '#455A64' }}
                                    >
                                        {sampleRunning ? <SpinIcon className="w-4 h-4 mr-1" /> : <span>▶</span>}
                                        <span>{sampleRunning ? 'รัน...' : 'ทดสอบตัวอย่าง'}</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || cooldown > 0 || !currentAssignment || examFinished}
                                    className="k-btn-pink px-4 py-1.5 text-sm disabled:opacity-50 flex items-center space-x-1"
                                >
                                    {submitting ? <SpinIcon className="w-4 h-4 mr-1" /> : <span>✓</span>}
                                    <span>{examFinished ? 'ส่งแล้ว' : cooldown > 0 ? `รอ ${cooldown}s` : submitting ? 'กำลังตรวจ...' : 'Submit'}</span>
                                </button>
                                {/* AI buttons: hidden in exam mode */}
                                {!isExamMode && (
                                    <button
                                        onClick={handleAIAnalysis}
                                        disabled={aiAnalyzing}
                                        className="px-4 py-1.5 text-white rounded-lg text-sm disabled:opacity-50 flex items-center space-x-1"
                                        style={{ background: '#7B1FA2' }}
                                    >
                                        {aiAnalyzing ? <SpinIcon className="w-4 h-4 mr-1" /> : <span>🤖</span>}
                                        <span>{aiAnalyzing ? 'AI กำลังวิเคราะห์...' : 'AI วิเคราะห์'}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1">
                            <CodeEditor
                                value={code}
                                onChange={setCode}
                                language={selectedLanguage}
                                placeholder={`// เขียนโค้ด ${LANGUAGES[selectedLanguage].name} ที่นี่...`}
                                minHeight="calc(100vh - 280px)"
                            />
                        </div>

                    </div>

                    {/* Right Panel */}
                    <div className="w-full lg:w-96 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
                        {/* Tab bar */}
                        <div className="flex border-b border-gray-200">
                            {[
                                { key: 'problems', label: '📋 โจทย์' },
                                { key: 'grade', label: '✅ ผลตรวจ' },
                                ...(!isExamMode ? [
                                    { key: 'ai',   label: '🤖 AI Lab' },
                                    { key: 'chat', label: '💬 แชท' },
                                ] : []),
                            ].map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setView(t.key)}
                                    className={`flex-1 py-3 text-xs font-medium transition-colors`}
                                    style={view === t.key
                                        ? { borderBottom: '2px solid #EC407A', color: '#C2185B' }
                                        : { color: '#6B7280' }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            {/* Problem Description */}
                            {view === 'problems' && currentAssignment && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-gray-800 text-lg">{currentAssignment.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium
                                            ${currentAssignment.difficulty === 'ง่าย' ? 'bg-green-100 text-green-700' :
                                              currentAssignment.difficulty === 'ปานกลาง' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-red-100 text-red-700'}`}>
                                            {currentAssignment.difficulty}
                                        </span>
                                    </div>
                                    <div className="flex space-x-3 text-xs text-gray-500 mb-4">
                                        {currentAssignment.timeLimit && (
                                            <span>⏱ Time: {currentAssignment.timeLimit / 1000}s</span>
                                        )}
                                        {currentAssignment.memoryLimit && (
                                            <span>💾 Memory: {currentAssignment.memoryLimit}MB</span>
                                        )}
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-line mb-6">{currentAssignment.description}</p>

                                    {visibleTestCases.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-gray-700 mb-3">ตัวอย่าง Test Cases (Public)</h4>
                                            {visibleTestCases.map((tc, i) => (
                                                <div key={tc.id} className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-100">
                                                    <p className="text-xs font-medium text-gray-600 mb-2">Test {i + 1}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-1">Input:</p>
                                                            <pre className="bg-gray-800 text-green-300 p-2 rounded text-xs font-mono overflow-x-auto">
                                                                {tc.input || '(ไม่มี input)'}
                                                            </pre>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-1">Expected:</p>
                                                            <pre className="bg-gray-800 text-blue-300 p-2 rounded text-xs font-mono overflow-x-auto">
                                                                {tc.expectedOutput || tc.expected || '(ไม่มี)'}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedLanguage === 'java' && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4 text-xs text-yellow-800">
                                            ⚠️ Java: ต้องใช้ชื่อ class ว่า <code className="font-mono">Main</code> เท่านั้น
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Grade Results */}
                            {view === 'grade' && (
                                <div>
                                    {(submitting || sampleRunning) && (
                                        <div className="text-center py-8">
                                            <Spinner text={sampleRunning ? 'กำลังรัน Test Cases...' : 'กำลังตรวจ Test Cases...'} />
                                        </div>
                                    )}
                                    {!submitting && !sampleRunning && !gradeResult && sampleResults && (
                                        <div>
                                            <p className="font-bold text-gray-700 mb-3">ผลการทดสอบตัวอย่าง:</p>
                                            {sampleResults.map((r, i) => (
                                                <div key={i} className={`p-3 rounded-lg mb-2 border ${r.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-sm font-medium ${r.passed ? 'text-green-700' : 'text-red-700'}`}>
                                                            {r.passed ? '✓ ผ่าน' : '✗ ไม่ผ่าน'} — Test {i + 1}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{r.executionTime}ms</span>
                                                    </div>
                                                    {!r.passed && (
                                                        <div className="text-xs mt-2 space-y-1">
                                                            <div><span className="text-gray-500">คาดหวัง: </span><code className="text-blue-600">{r.expectedOutput}</code></div>
                                                            <div><span className="text-gray-500">ได้รับ: </span><code className="text-red-600">{r.actualOutput || '(ไม่มี output)'}</code></div>
                                                            {r.errorLog && <div className="text-red-500 bg-red-50 p-2 rounded mt-1 font-mono text-xs">{r.errorLog}</div>}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!submitting && !sampleRunning && !gradeResult && !sampleResults && (
                                        <div className="text-center py-8 text-gray-400">
                                            <div className="text-4xl mb-2">📝</div>
                                            <p>กด ▶ ทดสอบตัวอย่าง หรือ Submit เพื่อดูผล</p>
                                        </div>
                                    )}
                                    {gradeResult && (
                                        <div>
                                            <div className={`rounded-xl p-4 mb-4 text-center
                                                ${gradeResult.status === 'accepted' ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>

                                                <div className="text-3xl mb-1">
                                                    {STATUS_LABELS[gradeResult.status]?.icon}
                                                </div>
                                                <div className="font-bold text-lg text-gray-800">
                                                    {STATUS_LABELS[gradeResult.status]?.text}
                                                </div>
                                                <div className="text-3xl font-bold mt-2" style={{
                                                    color: gradeResult.score >= 80 ? '#16a34a' : gradeResult.score >= 50 ? '#d97706' : '#dc2626'
                                                }}>
                                                    {gradeResult.score}%
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    ผ่าน {gradeResult.passedTests}/{gradeResult.totalTests} Test Cases
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-gray-700 mb-3">รายละเอียดแต่ละ Test Case:</h4>
                                            {gradeResult.testResults.map((r, i) => (
                                                <div key={i} className={`p-3 rounded-lg mb-2 border ${r.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-sm font-medium ${r.passed ? 'text-green-700' : 'text-red-700'}`}>
                                                            {r.passed ? '✓' : '✗'} Test {i + 1}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{r.executionTime}ms</span>
                                                    </div>
                                                    {!r.passed && (
                                                        <div className="text-xs mt-2 space-y-1">
                                                            <div>
                                                                <span className="text-gray-500">คาดหวัง: </span>
                                                                <code className="text-blue-600">{r.expectedOutput}</code>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">ได้รับ: </span>
                                                                <code className="text-red-600">{r.actualOutput || '(ไม่มี output)'}</code>
                                                            </div>
                                                            {r.errorLog && (
                                                                <div className="text-red-500 bg-red-50 p-2 rounded mt-1 font-mono text-xs">
                                                                    {r.errorLog}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {/* AI Scaffolding Hints — practice mode only, show when failed */}
                                            {!isExamMode && gradeResult.status !== 'accepted' && (
                                                <div className="mt-4" style={{ borderTop: '1px solid #fce7f3', paddingTop: '16px' }}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-bold" style={{ color: '#be185d' }}>
                                                            💡 AI Scaffolding (คำใบ้)
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {hintLevel > 0 ? `ใบ้แล้ว ${hintLevel}/3 ระดับ` : 'ยังไม่ได้ขอใบ้'}
                                                        </span>
                                                    </div>

                                                    {/* Hint level progress */}
                                                    <div className="flex gap-2 mb-3">
                                                        {[
                                                            { l: 1, label: '🔍 ชี้จุดผิด', desc: 'บอกว่าผิดตรงไหน' },
                                                            { l: 2, label: '💡 แนวคิด', desc: 'อธิบาย Algorithm' },
                                                            { l: 3, label: '📝 ตัวอย่าง', desc: 'Code snippet' },
                                                        ].map(h => (
                                                            <button key={h.l}
                                                                onClick={hintLevel < h.l ? handleHint : undefined}
                                                                disabled={hintLoading || hintLevel >= h.l}
                                                                title={h.desc}
                                                                style={{
                                                                    flex: 1, padding: '8px 4px', borderRadius: '10px', fontSize: '11px',
                                                                    fontWeight: 600, border: 'none', cursor: hintLevel >= h.l ? 'default' : 'pointer',
                                                                    background: hintLevel >= h.l ? '#fce7f3' : '#f9fafb',
                                                                    color: hintLevel >= h.l ? '#be185d' : '#9ca3af',
                                                                    opacity: hintLoading && hintLevel + 1 === h.l ? 0.6 : 1,
                                                                }}>
                                                                {hintLevel >= h.l ? '✓ ' : ''}{h.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {hintLevel === 0 && !hintLoading && (
                                                        <button onClick={handleHint} className="k-btn-pink"
                                                            style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
                                                            💡 ขอคำใบ้ระดับที่ 1
                                                        </button>
                                                    )}

                                                    {hintLoading && (
                                                        <div className="text-center py-4">
                                                            <Spinner text="AI กำลังสร้างคำใบ้..." />
                                                        </div>
                                                    )}

                                                    {scaffoldHint && !hintLoading && (
                                                        <div style={{
                                                            background: '#fdf2f8', border: '1px solid #fbcfe8',
                                                            borderRadius: '12px', padding: '14px', marginTop: '8px',
                                                        }}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span style={{ background: '#ec4899', color: 'white', fontSize: '10px',
                                                                               fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                                                                    ระดับ {hintLevel}
                                                                </span>
                                                                {hintLevel < 3 && (
                                                                    <button onClick={handleHint}
                                                                        style={{ fontSize: '11px', color: '#ec4899', background: 'none',
                                                                                 border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                                                        ขอระดับ {hintLevel + 1} →
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{scaffoldHint}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AI Analysis */}
                            {view === 'ai' && (
                                <div>
                                    {aiAnalyzing && <Spinner text="AI กำลังวิเคราะห์โค้ด..." />}
                                    {!aiAnalyzing && !aiResult && (
                                        <div className="text-center py-8 text-gray-400">
                                            <div className="text-4xl mb-2">🤖</div>
                                            <p>กด "AI วิเคราะห์" เพื่อรับคำแนะนำเชิงลึก</p>
                                        </div>
                                    )}
                                    {aiResult && <RadarChart analysis={aiResult} language={selectedLanguage} />}
                                </div>
                            )}

                            {/* Chatbot */}
                            {view === 'chat' && (
                                <div className="flex flex-col h-full" style={{ minHeight: '400px' }}>
                                    <div className="flex-1 overflow-y-auto space-y-3 mb-3" style={{ maxHeight: '350px' }}>
                                        {chatHistory.length === 0 && (
                                            <div className="text-center text-gray-400 text-sm py-8">
                                                👋 ถามคำถามเกี่ยวกับ {LANGUAGES[selectedLanguage].name} ได้เลย
                                            </div>
                                        )}
                                        {chatHistory.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-xs p-3 rounded-2xl text-sm whitespace-pre-line
                                                    ${msg.role === 'user'
                                                        ? 'bg-blue-500 text-white rounded-br-none'
                                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                        {chatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-none">
                                                    <SpinIcon className="w-4 h-4 text-gray-500" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <form onSubmit={handleChat} className="flex space-x-2">
                                        <input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            disabled={chatLoading}
                                            placeholder="ถามคำถาม..."
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={chatLoading || !chatInput.trim()}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                                        >
                                            ส่ง
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

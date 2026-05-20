// js/pages/student/StudentDashboard.js - Student home dashboard

const StudentDashboard = () => {
    const { userDoc } = useAuth();
    const [courses, setCourses] = React.useState([]);
    const [recentSubmissions, setRecentSubmissions] = React.useState([]);
    const [grades, setGrades] = React.useState([]);
    const [activities, setActivities] = React.useState([]);   // assignments_v2
    const [loading, setLoading] = React.useState(true);
    const [playerStats, setPlayerStats] = React.useState(null);
    const [recentAchievements, setRecentAchievements] = React.useState([]);
    const [miniLeaderboard, setMiniLeaderboard] = React.useState([]);
    const [season, setSeason] = React.useState(null);

    // Coach state
    const [diagnosticResult, setDiagnosticResult] = React.useState(null);
    const [diagnosticLoading, setDiagnosticLoading] = React.useState(false);
    const [analyticsResult, setAnalyticsResult] = React.useState('');
    const [analyticsLoading, setAnalyticsLoading] = React.useState(false);

    // Risk & Mastery state
    const [riskAlert, setRiskAlert] = React.useState(null);
    const [allSubmissions, setAllSubmissions] = React.useState([]);

    React.useEffect(() => {
        if (!userDoc) return;
        loadData();

        // Live listener for playerStats
        const unsub = db.collection('playerStats').doc(userDoc.id)
            .onSnapshot(snap => {
                if (snap.exists) setPlayerStats(snap.data());
            }, () => {});

        // Load recent achievements (last 3)
        if (typeof getStudentAchievements === 'function') {
            getStudentAchievements(userDoc.id).then(list => setRecentAchievements(list.slice(0, 3))).catch(() => {});
        }

        // Load mini-leaderboard top 5 + season
        db.collection('leaderboardSnapshots').doc('alltime').get()
            .then(snap => { if (snap.exists) setMiniLeaderboard((snap.data().entries || []).slice(0, 5)); })
            .catch(() => {});
        if (typeof getSeasonInfo === 'function') getSeasonInfo().then(setSeason).catch(() => {});

        return () => unsub();
    }, [userDoc]);

    const handleDiagnosticCoach = async () => {
        if (!userDoc) return;
        setDiagnosticLoading(true);
        setDiagnosticResult(null);
        try {
            const result = await getDiagnosticCoach(userDoc.id, userDoc.displayName);
            setDiagnosticResult(result);
        } catch (_) {
            setDiagnosticResult({ summary: '❌ วิเคราะห์ไม่สำเร็จ', path: [] });
        } finally {
            setDiagnosticLoading(false);
        }
    };

    const handleAnalyticsCoach = async () => {
        if (!userDoc) return;
        setAnalyticsLoading(true);
        setAnalyticsResult('');
        try {
            const result = await getAnalyticsCoach(userDoc.id, userDoc.displayName);
            setAnalyticsResult(result);
        } catch (_) {
            setAnalyticsResult('❌ ไม่สามารถโหลดรายงานได้');
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // Load enrolled courses
            const enrolledIds = userDoc.enrolledCourses || [];
            if (enrolledIds.length > 0) {
                const courseSnaps = await Promise.all(
                    enrolledIds.map(id => db.collection('courses').doc(id).get())
                );
                setCourses(courseSnaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() })));
            }

            // Load recent submissions (last 20 for analytics + risk)
            const subSnap = await db.collection('submissions')
                .where('studentId', '==', userDoc.id)
                .orderBy('submittedAt', 'desc')
                .limit(20)
                .get();
            const allSubs = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllSubmissions(allSubs);
            setRecentSubmissions(allSubs.slice(0, 5));

            // Compute risk alert locally (no API call needed)
            if (allSubs.length >= 3) {
                const last3 = allSubs.slice(0, 3).map(s => s.score || 0);
                const last5 = allSubs.slice(0, 5).map(s => s.score || 0);
                const avg5 = last5.reduce((a, b) => a + b, 0) / last5.length;
                const allFailed3 = last3.every(s => s < 60);
                const decliningTrend = last3[0] < last3[last3.length - 1] - 15;
                const assignCounts = {};
                allSubs.forEach(s => {
                    if ((s.score || 0) < 60 && s.assignmentId) {
                        assignCounts[s.assignmentId] = (assignCounts[s.assignmentId] || 0) + 1;
                    }
                });
                const repeatedFail = Object.values(assignCounts).some(c => c >= 3);
                let level = 'low';
                if (allFailed3 || repeatedFail) level = 'high';
                else if (avg5 < 50 || decliningTrend) level = 'medium';
                if (level !== 'low') {
                    setRiskAlert({ level, avg5: Math.round(avg5), last3, repeatedFail });
                    // Optionally fetch AI message (non-blocking)
                    if (typeof getPredictiveRiskAlert === 'function') {
                        getPredictiveRiskAlert(userDoc.id).then(r => {
                            if (r) setRiskAlert(prev => ({ ...prev, message: r.message }));
                        }).catch(() => {});
                    }
                }
            }

            // Load grades
            const gradeSnap = await db.collection('grades')
                .where('studentId', '==', userDoc.id)
                .get();
            setGrades(gradeSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Load multi-type activities (assignments_v2)
            // Use enrolledCourses from user doc (primary) + enrollments collection (secondary)
            try {
                const enSnap = await db.collection('enrollments').where('studentId', '==', userDoc.id).get();
                const fromCollection = enSnap.docs.map(d => d.data().courseId);
                const cIds = [...new Set([...enrolledIds, ...fromCollection])].slice(0, 10);
                if (cIds.length) {
                    const chunks = [];
                    for (let i = 0; i < cIds.length; i += 10) chunks.push(cIds.slice(i, i + 10));
                    const aSnaps = await Promise.all(
                        chunks.map(ch => db.collection('assignments_v2').where('courseId', 'in', ch).where('isPublished', '==', true).get())
                    );
                    const acts = aSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })))
                        .sort((a, b) => (b.order || 0) - (a.order || 0)).slice(0, 20);
                    const sub2Snap = await db.collection('submissions_v2').where('studentId', '==', userDoc.id).get();
                    const doneIds = new Set(sub2Snap.docs.map(d => d.data().assignmentId));
                    setActivities(acts.map(a => ({ ...a, isDone: doneIds.has(a.id) })));
                }
            } catch (_) { /* non-critical */ }
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const avgScore = grades.length > 0
        ? Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length)
        : 0;

    const totalAssignments = grades.length;
    const passed = grades.filter(g => g.score >= 60).length;

    // Personal Mastery stats (computed from grades, threshold 70%)
    const mastered    = grades.filter(g => (g.score || 0) >= 70).length;
    const inProgress  = grades.filter(g => (g.score || 0) >= 40 && (g.score || 0) < 70).length;
    const needPractice= grades.filter(g => (g.score || 0) < 40).length;
    const masteryPct  = grades.length > 0 ? Math.round((mastered / grades.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="Student Portal" />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Welcome */}
                <div className="rounded-2xl p-6 mb-8" style={{
                    background: 'linear-gradient(135deg, #FFF0F5 0%, #FFD1DC 100%)',
                    border: '1px solid #FFB6C8',
                    boxShadow: '0 2px 12px rgba(236,64,122,.08)',
                }}>
                    <h2 className="text-2xl font-bold mb-1" style={{ color: '#AD1457' }}>สวัสดี, {userDoc?.displayName} 👋</h2>
                    <p style={{ color: '#C2185B', fontSize: '14px' }}>พร้อมเรียนรู้การเขียนโปรแกรมวันนี้แล้วหรือยัง?</p>
                </div>

                {/* XP / Rank Card (shows even while loading other data) */}
                {typeof XPBar !== 'undefined' && (
                    <div className="mb-6">
                        <XPBar stats={playerStats} />
                        {playerStats && (
                            <div style={{
                                display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap',
                            }}>
                                <a href="#/student/leaderboard" style={{
                                    flex: '1 1 auto', textAlign: 'center',
                                    background: '#1e293b', color: '#f1f5f9',
                                    borderRadius: 12, padding: '10px 16px',
                                    textDecoration: 'none', fontSize: 13, fontWeight: 600,
                                    border: '1px solid #334155',
                                }}>
                                    🏆 ดูอันดับชั้นเรียน
                                </a>
                                <a href="#/student/practice" style={{
                                    flex: '1 1 auto', textAlign: 'center',
                                    background: '#1e293b', color: '#f1f5f9',
                                    borderRadius: 12, padding: '10px 16px',
                                    textDecoration: 'none', fontSize: 13, fontWeight: 600,
                                    border: '1px solid #334155',
                                }}>
                                    🎯 ฝึกทักษะ
                                </a>
                                <a href="#/student/games" style={{
                                    flex: '1 1 auto', textAlign: 'center',
                                    background: 'linear-gradient(135deg,#065f46,#047857)', color: '#d1fae5',
                                    borderRadius: 12, padding: '10px 16px',
                                    textDecoration: 'none', fontSize: 13, fontWeight: 600,
                                    border: '1px solid #065f46',
                                }}>
                                    🎮 Mini-Games
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {loading ? <Spinner text="กำลังโหลดข้อมูล..." /> : (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'รายวิชาที่ลงทะเบียน', value: courses.length, icon: '📚', color: 'blue' },
                                { label: 'งานที่ส่งแล้ว', value: totalAssignments, icon: '📋', color: 'green' },
                                { label: 'ผ่านแล้ว', value: passed, icon: '✅', color: 'emerald' },
                                { label: 'คะแนนเฉลี่ย', value: `${avgScore}%`, icon: '⭐', color: 'yellow' },
                            ].map(stat => (
                                <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                    <div className="text-3xl mb-2">{stat.icon}</div>
                                    <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                                    <div className="text-sm text-gray-500">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* ── Predictive Risk Alert ── */}
                        {riskAlert && (
                            <div style={{
                                background: riskAlert.level === 'high'
                                    ? 'linear-gradient(135deg,#7f1d1d,#991b1b)'
                                    : 'linear-gradient(135deg,#78350f,#92400e)',
                                border: `1px solid ${riskAlert.level === 'high' ? '#ef4444' : '#f59e0b'}`,
                                borderRadius: 14, padding: '14px 18px', marginBottom: 20,
                                display: 'flex', alignItems: 'flex-start', gap: 12,
                            }}>
                                <span style={{ fontSize: 24, flexShrink: 0 }}>{riskAlert.level === 'high' ? '🚨' : '⚠️'}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: riskAlert.level === 'high' ? '#fca5a5' : '#fcd34d', marginBottom: 4 }}>
                                        {riskAlert.level === 'high' ? 'AI แจ้งเตือน: ต้องการความช่วยเหลือ' : 'AI แจ้งเตือน: แนวโน้มที่ควรระวัง'}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#fde68a', marginBottom: 6 }}>
                                        คะแนน 3 ครั้งล่าสุด: {riskAlert.last3.join(', ')}% · เฉลี่ย: {riskAlert.avg5}%
                                    </div>
                                    {riskAlert.message ? (
                                        <p style={{ fontSize: 13, color: '#fef3c7', lineHeight: 1.6, margin: 0 }}>{riskAlert.message}</p>
                                    ) : (
                                        <p style={{ fontSize: 13, color: '#fef3c7', margin: 0 }}>
                                            {riskAlert.level === 'high'
                                                ? 'ลองใช้ Hint ระดับ 2-3 ก่อนส่งงาน หรือถามครูเพื่อขอคำอธิบายเพิ่มเติม'
                                                : 'ลองเล่น Quiz Blitz ทบทวน concept แล้วค่อยส่งงานใหม่'}
                                        </p>
                                    )}
                                </div>
                                <button onClick={() => setRiskAlert(null)}
                                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                            </div>
                        )}

                        {/* ── Personal Mastery Progress ── */}
                        {grades.length > 0 && (
                            <div style={{
                                background: 'white', border: '1px solid #fce7f3',
                                borderRadius: 14, padding: '16px 20px', marginBottom: 20,
                                boxShadow: '0 2px 12px rgba(236,64,122,.06)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#be185d' }}>🎯 Personal Mastery Progress</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: masteryPct >= 70 ? '#10b981' : masteryPct >= 40 ? '#f59e0b' : '#ef4444' }}>
                                        {masteryPct}% Mastered
                                    </span>
                                </div>
                                {/* Overall bar */}
                                <div style={{ height: 10, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                                    <div style={{ height: '100%', width: `${masteryPct}%`, borderRadius: 5, transition: 'width .6s',
                                        background: masteryPct >= 70 ? 'linear-gradient(90deg,#10b981,#34d399)' : masteryPct >= 40 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)' }} />
                                </div>
                                {/* 3-segment detail */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    {[
                                        { label: 'Mastered', sublabel: '≥70%', count: mastered, color: '#10b981', bg: '#f0fdf4' },
                                        { label: 'In Progress', sublabel: '40–69%', count: inProgress, color: '#f59e0b', bg: '#fffbeb' },
                                        { label: 'Need Practice', sublabel: '<40%', count: needPractice, color: '#ef4444', bg: '#fef2f2' },
                                    ].map(seg => (
                                        <div key={seg.label} style={{ background: seg.bg, borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: seg.color }}>{seg.count}</div>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: seg.color }}>{seg.label}</div>
                                            <div style={{ fontSize: 10, color: '#9ca3af' }}>{seg.sublabel}</div>
                                        </div>
                                    ))}
                                </div>
                                {needPractice > 0 && (
                                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
                                        💡 มี {needPractice} งานที่ควรฝึกซ้ำ — ลองเล่น Mini-Games เพื่อทบทวน concept
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ── AI Coach Cards ── */}
                        <div className="grid md:grid-cols-2 gap-4 mb-6">

                            {/* Diagnostic Coach (Evaluate) */}
                            <div style={{
                                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                border: '1px solid #334155', borderRadius: 14, padding: '18px 20px',
                            }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 6 }}>
                                    🔍 Diagnostic Coach
                                </div>
                                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                                    วิเคราะห์จุดอ่อน-จุดแข็ง สร้าง Personal Learning Path
                                </p>
                                {diagnosticResult && (
                                    <div style={{ background: '#0f172a', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                                        <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{diagnosticResult.summary}</p>
                                        {diagnosticResult.path?.length > 0 && (
                                            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {diagnosticResult.path.slice(0, 3).map((p, i) => (
                                                    <span key={i} style={{
                                                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                                        background: p.priority === 'high' ? '#ef444433' : '#60a5fa22',
                                                        color: p.priority === 'high' ? '#fca5a5' : '#93c5fd',
                                                    }}>{p.label}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button onClick={handleDiagnosticCoach} disabled={diagnosticLoading}
                                    style={{
                                        width: '100%', padding: '8px', borderRadius: 10, border: 'none',
                                        background: diagnosticLoading ? '#334155' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                        fontFamily: "'Prompt',sans-serif",
                                    }}>
                                    {diagnosticLoading ? '⏳ กำลังวิเคราะห์...' : '🔍 วิเคราะห์จุดอ่อน'}
                                </button>
                            </div>

                            {/* Analytics Coach (Explain) */}
                            <div style={{
                                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                border: '1px solid #334155', borderRadius: 14, padding: '18px 20px',
                            }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', marginBottom: 6 }}>
                                    📊 Analytics Coach
                                </div>
                                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                                    รายงานสัปดาห์: พัฒนาการ, แนวโน้ม, เป้าหมายถัดไป
                                </p>
                                {analyticsResult && (
                                    <div style={{ background: '#0f172a', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                                        <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{analyticsResult}</p>
                                    </div>
                                )}
                                <button onClick={handleAnalyticsCoach} disabled={analyticsLoading}
                                    style={{
                                        width: '100%', padding: '8px', borderRadius: 10, border: 'none',
                                        background: analyticsLoading ? '#334155' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                        fontFamily: "'Prompt',sans-serif",
                                    }}>
                                    {analyticsLoading ? '⏳ กำลังสร้างรายงาน...' : '📊 รายงานประจำสัปดาห์'}
                                </button>
                            </div>
                        </div>

                        {/* ── Recent Achievements preview ── */}
                        {recentAchievements.length > 0 && typeof getAchievementById === 'function' && (
                            <div style={{
                                background: '#1e293b', border: '1px solid #334155',
                                borderRadius: 14, padding: '14px 18px', marginBottom: 20,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>🏅 Badge ล่าสุด</span>
                                    <a href="#/student/achievements" style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>ดูทั้งหมด →</a>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {recentAchievements.map(e => {
                                        const ach = getAchievementById(e.achievementId);
                                        if (!ach) return null;
                                        const color = (typeof RARITY_COLOR !== 'undefined' ? RARITY_COLOR[ach.rarity] : '#60a5fa') || '#60a5fa';
                                        return (
                                            <div key={e.id} style={{
                                                background: `${color}22`, border: `1px solid ${color}55`,
                                                borderRadius: 10, padding: '8px 12px', textAlign: 'center', minWidth: 70,
                                            }}>
                                                <div style={{ fontSize: 22 }}>{ach.icon}</div>
                                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{ach.nameTh}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Season banner ── */}
                        {season && (
                            <div style={{
                                background: 'linear-gradient(135deg,#78350f,#92400e)',
                                border: '1px solid #f59e0b', borderRadius: 14,
                                padding: '12px 18px', marginBottom: 20,
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                <span style={{ fontSize: 24 }}>🌟</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 14 }}>Season: {season.name}</div>
                                    <div style={{ fontSize: 12, color: '#fde68a' }}>XP Multiplier x{season.xpMultiplier} กำลัง Active!</div>
                                </div>
                                {playerStats && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 16 }}>{(playerStats.seasonXP || 0).toLocaleString()}</div>
                                        <div style={{ fontSize: 11, color: '#fde68a' }}>Season XP</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Mini-Leaderboard ── */}
                        {miniLeaderboard.length > 0 && (
                            <div style={{
                                background: '#1e293b', border: '1px solid #334155',
                                borderRadius: 14, padding: '14px 18px', marginBottom: 20,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>🏆 Top 5 ชั้นเรียน</span>
                                    <a href="#/student/leaderboard" style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>ดูทั้งหมด →</a>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {miniLeaderboard.map((e, idx) => {
                                        const tier = typeof getRankFromXP === 'function' ? getRankFromXP(e.xp || 0) : { icon: '🥚', color: '#9ca3af' };
                                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                                        return (
                                            <div key={e.uid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: idx < 3 ? 16 : 12, minWidth: 28, textAlign: 'center', color: '#475569', fontWeight: 700 }}>{medal}</span>
                                                <span style={{ fontSize: 16 }}>{tier.icon}</span>
                                                <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.displayName}</span>
                                                <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700 }}>{(e.xp || 0).toLocaleString()} XP</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Enrolled Courses */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">📚 รายวิชาของฉัน</h3>
                                    <a href="#/student/courses" style={{ color: '#EC407A', fontSize: '14px' }} className="hover:underline">ดูทั้งหมด</a>
                                </div>
                                {courses.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <div className="text-4xl mb-2">📖</div>
                                        <p>ยังไม่ได้ลงทะเบียนรายวิชาใด</p>
                                        <a href="#/student/courses" className="text-blue-500 text-sm hover:underline mt-2 block">
                                            ค้นหารายวิชา →
                                        </a>
                                    </div>
                                ) : courses.map(course => (
                                    <div key={course.id}
                                        className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 cursor-pointer"
                                        onClick={() => { window.location.hash = `#/student/workspace?course=${course.id}`; }}>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                                                style={{ background: LANGUAGES[course.language]?.color + '22' }}>
                                                {LANGUAGES[course.language]?.icon || '📚'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 text-sm">{course.title}</p>
                                                <p className="text-xs text-gray-400">{LANGUAGES[course.language]?.name}</p>
                                            </div>
                                        </div>
                                        <span className="text-gray-400 text-sm">→</span>
                                    </div>
                                ))}
                            </div>

                            {/* ── Activities (assignments_v2) ── */}
                            {activities.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-0">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-800">🎯 กิจกรรมที่ได้รับมอบหมาย</h3>
                                        <span className="text-xs text-gray-400">{activities.filter(a => !a.isDone).length} รายการที่ยังไม่ได้ทำ</span>
                                    </div>
                                    <div className="space-y-2">
                                        {activities.map(act => {
                                            const TYPE_META = {
                                                coding:        { icon: '💻', label: 'Coding',    bg: '#EDE9FE', color: '#6D28D9', border: '#DDD6FE' },
                                                autopsy:       { icon: '🔬', label: 'Autopsy',   bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
                                                quiz_blitz:    { icon: '⚡', label: 'Quiz Blitz', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
                                                pre_post_test: { icon: '📊', label: 'Test',      bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
                                            };
                                            const meta = TYPE_META[act.activityType] || TYPE_META.coding;
                                            return (
                                                <div key={act.id}
                                                    className="flex items-center justify-between py-3 px-3 rounded-xl border hover:shadow-sm transition-all cursor-pointer"
                                                    style={{ borderColor: act.isDone ? '#D1FAE5' : meta.border, background: act.isDone ? '#F0FDF4' : 'white' }}
                                                    onClick={() => { window.location.hash = `#/student/activity/${act.id}`; }}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                                                            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                                                            {act.isDone ? '✅' : meta.icon}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800 text-sm leading-tight">{act.title}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                                                    style={{ background: meta.bg, color: meta.color }}>
                                                                    {meta.label}
                                                                </span>
                                                                {act.xpReward > 0 && (
                                                                    <span className="text-xs text-yellow-600">+{act.xpReward} XP</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-bold shrink-0 px-3 py-1.5 rounded-lg"
                                                        style={act.isDone
                                                            ? { background: '#D1FAE5', color: '#065F46' }
                                                            : { background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                                                        {act.isDone ? 'ดูผล →' : 'เริ่มทำ →'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Recent Submissions */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">📋 การส่งล่าสุด</h3>
                                    <a href="#/student/history" style={{ color: '#EC407A', fontSize: '14px' }} className="hover:underline">ดูทั้งหมด</a>
                                </div>
                                {recentSubmissions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <div className="text-4xl mb-2">📝</div>
                                        <p>ยังไม่มีประวัติการส่งงาน</p>
                                    </div>
                                ) : recentSubmissions.map(sub => {
                                    const statusInfo = STATUS_LABELS[sub.status] || STATUS_LABELS.pending;
                                    return (
                                        <div key={sub.id} className="py-3 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <span>{statusInfo.icon}</span>
                                                    <span className="text-sm text-gray-700">{sub.passedTests}/{sub.totalTests} ผ่าน</span>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full bg-${statusInfo.color}-100 text-${statusInfo.color}-700`}>
                                                    {sub.score}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {sub.submittedAt?.toDate
                                                    ? sub.submittedAt.toDate().toLocaleDateString('th-TH')
                                                    : 'เมื่อกี้'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

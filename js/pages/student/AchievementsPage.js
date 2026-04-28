// js/pages/student/AchievementsPage.js — Badge Gallery (Phase 2)
// Depends on: achievementEngine.js (ACHIEVEMENTS, RARITY_COLOR, getStudentAchievements)

const AchievementsPage = () => {
    const { user } = useAuth();
    const [earnedList, setEarnedList] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState('all'); // all | skill | special

    React.useEffect(() => {
        if (!user?.uid) return;
        getStudentAchievements(user.uid).then(list => {
            setEarnedList(list);
            setLoading(false);
        });
    }, [user]);

    const earnedIds = new Set(earnedList.map(e => e.achievementId));
    const filtered = (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : [])
        .filter(a => filter === 'all' || a.category === filter);

    const earned = filtered.filter(a => earnedIds.has(a.id));
    const unearned = filtered.filter(a => !earnedIds.has(a.id));
    const pct = Math.round((earnedIds.size / (ACHIEVEMENTS?.length || 1)) * 100);

    const CATEGORY_LABELS = { skill: '⚔️ ทักษะ', special: '✨ พิเศษ' };
    const RARITY_LABELS = { common: 'ทั่วไป', uncommon: 'หายาก', rare: 'หายากมาก', epic: 'Epic', legendary: 'Legendary' };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Platform" subtitle="ความสำเร็จ" />
            <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 40 }}>🏅</div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 4px' }}>ความสำเร็จของฉัน</h1>
                    <p style={{ color: '#64748b', fontSize: 13 }}>สะสม Badge ยิ่งมาก ยิ่งแสดงถึงทักษะที่หลากหลาย</p>

                    {/* Progress bar */}
                    <div style={{ margin: '16px auto', maxWidth: 300 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                            <span>สะสมแล้ว {earnedIds.size}/{ACHIEVEMENTS?.length || 0}</span>
                            <span>{pct}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: '#1e293b', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 4,
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                                transition: 'width 0.8s ease',
                            }} />
                        </div>
                    </div>
                </div>

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
                    {[['all', '🎖️ ทั้งหมด'], ['skill', '⚔️ ทักษะ'], ['special', '✨ พิเศษ']].map(([val, label]) => (
                        <button key={val} onClick={() => setFilter(val)} style={{
                            padding: '6px 16px', borderRadius: 20, fontSize: 13, border: 'none', cursor: 'pointer',
                            background: filter === val ? 'linear-gradient(135deg, #60a5fa, #a78bfa)' : '#1e293b',
                            color: filter === val ? '#fff' : '#94a3b8',
                            fontFamily: "'Prompt',sans-serif",
                        }}>{label}</button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>กำลังโหลด...</div>
                ) : (
                    <>
                        {/* Earned badges */}
                        {earned.length > 0 && (
                            <div style={{ marginBottom: 28 }}>
                                <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>
                                    ✅ ได้รับแล้ว ({earned.length})
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                                    {earned.map(ach => (
                                        <_BadgeCard key={ach.id} ach={ach} earned={true}
                                            earnedAt={earnedList.find(e => e.achievementId === ach.id)?.earnedAt} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Unearned badges */}
                        {unearned.length > 0 && (
                            <div>
                                <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>
                                    🔒 ยังไม่ได้รับ ({unearned.length})
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                                    {unearned.map(ach => (
                                        <_BadgeCard key={ach.id} ach={ach} earned={false} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {filtered.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>
                                ไม่มี Badge ในหมวดนี้
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

const _BadgeCard = ({ ach, earned, earnedAt }) => {
    const rarityColor = (typeof RARITY_COLOR !== 'undefined' ? RARITY_COLOR : {})[ach.rarity] || '#9ca3af';
    const RARITY_TH = { common: 'ทั่วไป', uncommon: 'หายาก', rare: 'หายากมาก', epic: 'Epic', legendary: 'Legendary' };

    return (
        <div style={{
            background: earned ? `linear-gradient(135deg, ${rarityColor}22, #1e293b)` : '#1e293b',
            border: `1px solid ${earned ? rarityColor : '#334155'}`,
            borderRadius: 14, padding: '16px',
            opacity: earned ? 1 : 0.55,
            position: 'relative',
            transition: 'transform 0.15s, box-shadow 0.15s',
        }}
            onMouseEnter={e => { if (earned) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${rarityColor}33`; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            {!earned && (
                <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 14 }}>🔒</div>
            )}
            <div style={{ fontSize: 32, marginBottom: 8 }}>{ach.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{ach.nameTh}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{ach.desc}</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: `${rarityColor}33`, color: rarityColor,
                }}>{RARITY_TH[ach.rarity] || ach.rarity}</span>

                {ach.xpReward > 0 && (
                    <span style={{ fontSize: 11, color: '#60a5fa' }}>+{ach.xpReward} XP</span>
                )}
            </div>

            {earned && earnedAt && (
                <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
                    ได้รับ: {earnedAt?.toDate ? earnedAt.toDate().toLocaleDateString('th-TH') : ''}
                </div>
            )}
        </div>
    );
};

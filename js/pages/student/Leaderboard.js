// js/pages/student/Leaderboard.js — class-aware leaderboard (reads playerStats directly)

const Leaderboard = () => {
    const { user } = useAuth();
    const [tab, setTab] = React.useState('alltime');
    const [allEntries, setAllEntries] = React.useState([]);
    const [dataLoading, setDataLoading] = React.useState(true);
    const [myStats, setMyStats] = React.useState(null);
    const [season, setSeason] = React.useState(null);
    const [myClassName, setMyClassName] = React.useState('');

    // Load classmates from user's classId, then fetch their playerStats
    const loadEntries = React.useCallback(async () => {
        if (!user?.uid) return;
        setDataLoading(true);
        try {
            // 1. Get current user's classId
            const userSnap = await db.collection('users').doc(user.uid).get();
            const myClassId = userSnap.data()?.classId;

            // 2. Load class name for display
            if (myClassId) {
                db.collection('classes').doc(myClassId).get()
                    .then(cs => { if (cs.exists) setMyClassName(cs.data().name || ''); })
                    .catch(() => {});
            }

            // 3. Get classmates
            let classmates;
            if (myClassId) {
                const snap = await db.collection('users').where('classId', '==', myClassId).get();
                classmates = snap.docs;
            } else {
                // No class assigned — show all role='student' users as fallback
                const snap = await db.collection('users').where('role', '==', 'student').get();
                classmates = snap.docs;
            }
            const studentMap = {};
            classmates.forEach(d => { studentMap[d.id] = d.data().displayName || 'นักเรียน'; });
            const studentUIDs = new Set(Object.keys(studentMap));

            // 4. Fetch playerStats and filter to classmates
            const statsSnap = await db.collection('playerStats').get();
            const list = statsSnap.docs
                .filter(d => studentUIDs.has(d.id))
                .map(d => {
                    const s = d.data();
                    const tier = getRankFromXP(s.xp || 0);
                    return {
                        uid: d.id,
                        displayName: studentMap[d.id] || 'นักเรียน',
                        xp: s.xp || 0,
                        dailyXP: s.dailyXP || 0,
                        weeklyXP: s.weeklyXP || 0,
                        codeCoin: s.codeCoin || 0,
                        streakDays: s.streakDays || 0,
                        rank: tier.level,
                        rankName: tier.name,
                        rankIcon: tier.icon,
                    };
                });
            setAllEntries(list);
        } catch (err) {
            console.warn('[Leaderboard] load error:', err);
        } finally {
            setDataLoading(false);
        }
    }, [user?.uid]);

    React.useEffect(() => { loadEntries(); }, []);

    React.useEffect(() => {
        if (user?.uid) getPlayerStats(user.uid).then(setMyStats).catch(() => {});
        if (typeof getSeasonInfo === 'function') getSeasonInfo().then(setSeason).catch(() => {});
    }, [user?.uid]);

    const tabs = [
        { key: 'daily',   label: '📅 วันนี้',      field: 'dailyXP',  desc: 'รีเซ็ตทุกเที่ยงคืน' },
        { key: 'weekly',  label: '📆 สัปดาห์นี้', field: 'weeklyXP', desc: 'รีเซ็ตทุกวันจันทร์' },
        { key: 'alltime', label: '🏆 ตลอดกาล',   field: 'xp',       desc: 'XP สะสมทั้งหมด' },
    ];

    const currentTab = tabs.find(t => t.key === tab);
    const field = currentTab?.field || 'xp';
    const currentEntries = [...allEntries].sort((a, b) => (b[field] || 0) - (a[field] || 0));
    const isLoading = dataLoading;
    const myTier = myStats ? getRankFromXP(myStats.xp || 0) : null;
    const myEntry = currentEntries.find(e => e.uid === user?.uid);
    const myRank = myEntry ? currentEntries.indexOf(myEntry) + 1 : null;

    const getXP = (entry) => {
        if (tab === 'daily') return entry.dailyXP || 0;
        if (tab === 'weekly') return entry.weeklyXP || 0;
        return entry.xp || 0;
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: "'Prompt', sans-serif" }}>
            <Navbar title="อันดับชั้นเรียน" subtitle={myClassName || 'Leaderboard'} />

            <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

                {/* Season banner */}
                {season && (
                    <div style={{
                        background: 'linear-gradient(135deg, #78350f, #92400e)',
                        border: '1px solid #f59e0b',
                        borderRadius: 14, padding: '12px 18px', marginBottom: 20,
                        display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        <span style={{ fontSize: 24 }}>🌟</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 14 }}>
                                Season: {season.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#fde68a' }}>
                                XP Multiplier: x{season.xpMultiplier || 1}
                                {season.endDate && ` · สิ้นสุด ${new Date(season.endDate?.toDate?.() || season.endDate).toLocaleDateString('th-TH')}`}
                            </div>
                        </div>
                        {myStats && (
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, color: '#fbbf24' }}>
                                    {(myStats.seasonXP || 0).toLocaleString()}
                                </div>
                                <div style={{ fontSize: 11, color: '#fde68a' }}>Season XP</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 40, marginBottom: 4 }}>🏆</div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>อันดับชั้นเรียน</h1>
                    {myRank && (
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>
                            อันดับของคุณ: <span style={{ color: '#fbbf24', fontWeight: 700 }}>#{myRank}</span>
                            {' '}จาก {currentEntries.length} คน
                        </div>
                    )}
                </div>

                {/* Tab switcher */}
                <div style={{
                    display: 'flex', gap: 4, background: '#1e293b',
                    borderRadius: 12, padding: 4, marginBottom: 16,
                }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{
                            flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: 12,
                            background: tab === t.key ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'transparent',
                            color: tab === t.key ? '#fff' : '#64748b',
                            transition: 'all .2s',
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginBottom: 16 }}>
                    {currentTab?.desc}
                </div>

                {/* My stat card */}
                {myStats && myTier && (
                    <div style={{
                        background: `linear-gradient(135deg, ${myTier.color}22, #1e293b)`,
                        border: `2px solid ${myTier.color}`,
                        borderRadius: 14, padding: '14px 18px',
                        display: 'flex', alignItems: 'center', gap: 14,
                        marginBottom: 16,
                    }}>
                        <span style={{ fontSize: 30 }}>{myTier.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>ฉัน · {myTier.name}</div>
                            <div style={{ fontWeight: 700, color: myTier.color, fontSize: 14 }}>
                                {tab === 'daily'   && `${(myStats.dailyXP  || 0).toLocaleString()} XP วันนี้`}
                                {tab === 'weekly'  && `${(myStats.weeklyXP || 0).toLocaleString()} XP สัปดาห์นี้`}
                                {tab === 'alltime' && `${(myStats.xp       || 0).toLocaleString()} XP สะสม`}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: '#94a3b8' }}>🔥 {myStats.streakDays || 0} วัน</div>
                            <div style={{ fontSize: 11, color: '#475569' }}>🪙 {(myStats.codeCoin || 0).toLocaleString()}</div>
                        </div>
                    </div>
                )}

                {/* List */}
                {isLoading ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>กำลังโหลด...</div>
                ) : currentEntries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                        <p style={{ color: '#64748b', fontSize: 14 }}>
                            {tab === 'daily'  ? 'ยังไม่มีข้อมูลวันนี้ — Login เพื่อเริ่มสะสม XP!' :
                             tab === 'weekly' ? 'ยังไม่มีข้อมูลสัปดาห์นี้' :
                             'ยังไม่มีข้อมูล — ส่งงานเพื่อรับ XP แรก!'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {currentEntries.map((e, idx) => {
                            const isMe = e.uid === user?.uid;
                            const tier = getRankFromXP(e.xp || 0);
                            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                            const xpDisplay = getXP(e);
                            return (
                                <div key={e.uid} style={{
                                    background: isMe
                                        ? `linear-gradient(135deg, ${tier.color}18, #1e293b)`
                                        : '#1e293b',
                                    border: isMe ? `1.5px solid ${tier.color}` : '1px solid #334155',
                                    borderRadius: 12, padding: '12px 16px',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                    <div style={{
                                        minWidth: 34, textAlign: 'center',
                                        fontSize: medal ? 22 : 13, fontWeight: 700,
                                        color: medal ? undefined : '#475569',
                                    }}>
                                        {medal || `#${idx + 1}`}
                                    </div>
                                    <span style={{ fontSize: 20 }}>{tier.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: isMe ? 700 : 500, fontSize: 14,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {e.displayName}{isMe ? ' ✦' : ''}
                                        </div>
                                        <div style={{ fontSize: 11, color: tier.color }}>{tier.name}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                                            {xpDisplay.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#475569' }}>
                                            {tab === 'alltime' ? 'XP' : tab === 'daily' ? 'XP วันนี้' : 'XP/สัปดาห์'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#334155' }}>
                    อันดับอัปเดตทุกครั้งที่มีการส่งงานหรือรับ XP
                </div>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <a href="#/student/dashboard" style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}>
                        ← กลับแดชบอร์ด
                    </a>
                </div>
            </div>
        </div>
    );
};

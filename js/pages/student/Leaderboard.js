// js/pages/student/Leaderboard.js — v6.0

const Leaderboard = () => {
    const { user } = useAuth();
    const [tab, setTab]                   = React.useState('xp');
    const [allEntries, setAllEntries]     = React.useState([]);
    const [dataLoading, setDataLoading]   = React.useState(true);
    const [myStats, setMyStats]           = React.useState(null);
    const [myCourses, setMyCourses]       = React.useState([]);
    const [selectedCourseId, setSelectedCourseId] = React.useState('');

    const loadEntries = async (courseId) => {
        if (!courseId) return;
        setDataLoading(true);
        try {
            // 1. Get enrolled UIDs (enrollments readable by all authenticated users)
            const enrollSnap = await db.collection('enrollments')
                .where('courseId', '==', courseId).get();
            const enrolledUids = [...new Set(enrollSnap.docs.map(d => d.data().studentId))];
            if (enrolledUids.length === 0) { setAllEntries([]); return; }

            // 2. Fetch user names in batches
            const allUserDocs = [];
            for (let i = 0; i < enrolledUids.length; i += 30) {
                const chunk = enrolledUids.slice(i, i + 30);
                const snap = await db.collection('users')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
                snap.docs.forEach(d => allUserDocs.push(d));
            }
            const nameMap = {};
            allUserDocs.forEach(d => { nameMap[d.id] = d.data(); });

            // 3. Fetch playerStats — readable by all authenticated users per Firestore rules
            const statsSnap = await db.collection('playerStats').get();
            const statsMap = {};
            statsSnap.docs.forEach(d => { statsMap[d.id] = d.data(); });

            // 4. Build list — all enrolled students
            const list = enrolledUids.map(uid => {
                const s = statsMap[uid] || {};
                const userData = nameMap[uid] || {};
                const tier = getRankFromXP(s.xp || 0);
                return {
                    uid,
                    displayName: userData.displayName || 'นักเรียน',
                    number: userData.number || '',
                    xp: s.xp || 0,
                    codeCoin: s.codeCoin || 0,
                    crystal: s.crystal || 0,
                    streakDays: s.streakDays || 0,
                    tier,
                };
            });
            setAllEntries(list);
        } catch (err) {
            console.warn('[Leaderboard] load error:', err);
            setAllEntries([]);
        } finally { setDataLoading(false); }
    };

    React.useEffect(() => {
        if (!user?.uid) return;
        db.collection('enrollments').where('studentId', '==', user.uid).get()
            .then(async snap => {
                const courseIds = [...new Set(snap.docs.map(d => d.data().courseId))];
                if (courseIds.length === 0) { setDataLoading(false); return; }
                const snaps = await Promise.all(courseIds.slice(0, 10).map(id => db.collection('courses').doc(id).get()));
                const courses = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
                setMyCourses(courses);
                const firstId = courses[0]?.id || '';
                setSelectedCourseId(firstId);
                loadEntries(firstId);
            })
            .catch(() => setDataLoading(false));
        getPlayerStats(user.uid).then(setMyStats).catch(() => {});
    }, [user?.uid]);

    const selectedCourse = myCourses.find(c => c.id === selectedCourseId);
    const sorted = React.useMemo(() => {
        const arr = [...allEntries];
        arr.sort((a, b) => b.xp - a.xp || b.streakDays - a.streakDays);
        return arr;
    }, [allEntries, tab]);

    const myEntry  = sorted.find(e => e.uid === user?.uid);
    const myRank   = myEntry ? sorted.indexOf(myEntry) + 1 : null;
    const myTier   = myStats ? getRankFromXP(myStats.xp || 0) : (myEntry?.tier || RANK_TIERS[0]);
    const nextXP   = myStats ? getNextRankXP(myStats.xp || 0) : null;
    const curXP    = myStats?.xp || 0;
    const prevTierXP = myTier?.minXP || 0;
    const xpPct    = nextXP ? Math.min(100, Math.round((curXP - prevTierXP) / (nextXP - prevTierXP) * 100)) : 100;
    const myInitial = (myEntry?.displayName || myStats?.displayName || user?.displayName || 'U').charAt(0).toUpperCase();

    const medalOf = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

    // Group entries by tier level for the mountain
    const byTier = React.useMemo(() => {
        const map = {};
        sorted.forEach(e => {
            const lv = e.tier?.level || 1;
            if (!map[lv]) map[lv] = [];
            map[lv].push(e);
        });
        return map;
    }, [sorted]);

    // ── Sub-components ──────────────────────────────────────────────────────────

    // Animated sparkle dots around hero
    const Sparkle = ({ top, left, delay, size = 6 }) => (
        <div style={{
            position: 'absolute', top, left,
            width: size, height: size, borderRadius: '50%',
            background: myTier?.color || '#ec4899',
            opacity: 0.7,
            animation: `lbSparkle 2s ${delay}s ease-in-out infinite`,
        }} />
    );

    // Avatar character standing on rank pedestal
    const HeroPedestal = () => {
        const color = myTier?.color || '#ec4899';
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', padding: '10px 0' }}>
                {/* Sparkles */}
                <Sparkle top={0}   left={-20} delay={0}    size={5} />
                <Sparkle top={10}  left={50}  delay={0.4}  size={4} />
                <Sparkle top={-5}  left={30}  delay={0.8}  size={6} />
                <Sparkle top={20}  left={-10} delay={1.2}  size={3} />
                <Sparkle top={5}   left={60}  delay={1.6}  size={5} />

                {/* Character head (avatar) */}
                <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                    border: `3px solid ${color}`,
                    boxShadow: `0 0 24px ${color}88, 0 0 48px ${color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 900, color: '#fff',
                    animation: 'lbFloat 3s ease-in-out infinite',
                    position: 'relative', zIndex: 2,
                }}>
                    {myInitial}
                </div>

                {/* Body / connecting line */}
                <div style={{
                    width: 4, height: 16,
                    background: `linear-gradient(to bottom, ${color}, transparent)`,
                    margin: '-2px 0',
                }} />

                {/* Rank pedestal */}
                <div style={{
                    width: 110, padding: '8px 12px',
                    background: `linear-gradient(135deg, ${color}33, ${color}11)`,
                    border: `2px solid ${color}66`,
                    borderRadius: '10px 10px 4px 4px',
                    textAlign: 'center',
                    boxShadow: `0 4px 20px ${color}44`,
                }}>
                    <div style={{ fontSize: 22 }}>{myTier?.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>{myTier?.name}</div>
                    {myRank && (
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                            อันดับ #{myRank} ในห้อง
                        </div>
                    )}
                </div>

                {/* Glowing base platform */}
                <div style={{
                    width: 130, height: 8, borderRadius: '50%',
                    background: `radial-gradient(ellipse, ${color}66 0%, transparent 70%)`,
                    marginTop: 2,
                }} />
            </div>
        );
    };

    // Rank mountain: 10 columns
    const RankMountain = () => (
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, minWidth: 'max-content', padding: '8px 4px 0' }}>
                {RANK_TIERS.map(tier => {
                    const isMyTier = tier.level === (myTier?.level || 1);
                    const studentsHere = byTier[tier.level] || [];
                    const colHeight = 28 + tier.level * 16; // 44px (lv1) to 188px (lv10)
                    const colW = 54;

                    return (
                        <div key={tier.level} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: colW }}>
                            {/* Avatars above column */}
                            <div style={{
                                minHeight: 44, display: 'flex', flexWrap: 'wrap',
                                justifyContent: 'center', alignItems: 'flex-end', gap: 2, width: '100%',
                            }}>
                                {studentsHere.slice(0, 6).map(e => {
                                    const isMe = e.uid === user?.uid;
                                    return (
                                        <div key={e.uid} title={e.displayName} style={{
                                            width: isMe ? 28 : 20, height: isMe ? 28 : 20,
                                            borderRadius: '50%',
                                            background: isMe
                                                ? `linear-gradient(135deg, ${tier.color}, ${tier.color}99)`
                                                : '#334155',
                                            border: isMe ? `2px solid ${tier.color}` : '1px solid #475569',
                                            boxShadow: isMe ? `0 0 10px ${tier.color}` : 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: isMe ? 11 : 8, fontWeight: 700, color: '#fff',
                                            animation: isMe ? 'lbFloat 3s ease-in-out infinite' : 'none',
                                            flexShrink: 0, zIndex: isMe ? 2 : 1, position: 'relative',
                                        }}>
                                            {e.displayName.charAt(0).toUpperCase()}
                                        </div>
                                    );
                                })}
                                {studentsHere.length > 6 && (
                                    <div style={{ fontSize: 8, color: '#475569', alignSelf: 'flex-end' }}>
                                        +{studentsHere.length - 6}
                                    </div>
                                )}
                            </div>

                            {/* Column (rank platform) */}
                            <div style={{
                                width: '100%', height: colHeight,
                                background: isMyTier
                                    ? `linear-gradient(to bottom, ${tier.color}cc, ${tier.color}44)`
                                    : `linear-gradient(to bottom, #1e293b, #0f172a)`,
                                border: isMyTier ? `2px solid ${tier.color}` : '1px solid #1e293b',
                                borderRadius: '6px 6px 0 0',
                                boxShadow: isMyTier ? `0 0 20px ${tier.color}55, inset 0 0 20px ${tier.color}22` : 'none',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'flex-start',
                                padding: '6px 3px 4px',
                                transition: 'all .3s',
                                cursor: 'default',
                            }}>
                                <div style={{ fontSize: 16 }}>{tier.icon}</div>
                                <div style={{ fontSize: 7, color: isMyTier ? '#fff' : '#475569', textAlign: 'center', marginTop: 2, lineHeight: 1.2 }}>
                                    Lv.{tier.level}
                                </div>
                                {studentsHere.length > 0 && (
                                    <div style={{ fontSize: 8, color: isMyTier ? '#fbbf24' : '#475569', marginTop: 2 }}>
                                        {studentsHere.length}คน
                                    </div>
                                )}
                            </div>

                            {/* Tier name below */}
                            <div style={{
                                fontSize: 7, color: isMyTier ? tier.color : '#334155',
                                textAlign: 'center', marginTop: 3, lineHeight: 1.2,
                                width: colW, fontWeight: isMyTier ? 700 : 400,
                                wordBreak: 'break-all',
                            }}>
                                {tier.name}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Ground base */}
            <div style={{ height: 4, background: 'linear-gradient(to right, #0f172a, #1e293b, #0f172a)', borderRadius: 2 }} />
        </div>
    );

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: "'Prompt', sans-serif" }}>
            {/* CSS animations */}
            <style>{`
                @keyframes lbFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
                @keyframes lbSparkle { 0%,100%{opacity:.7;transform:scale(1)} 50%{opacity:.2;transform:scale(1.8)} }
                @keyframes lbPulse   { 0%,100%{opacity:1} 50%{opacity:.6} }
                @keyframes lbSlide   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            `}</style>

            <Navbar title="อันดับชั้นเรียน" subtitle={selectedCourse?.title || 'Leaderboard'} />

            <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 14px 40px' }}>

                {/* Course selector */}
                {myCourses.length > 1 && (
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 10, color: '#475569', display: 'block', marginBottom: 5 }}>เลือกรายวิชา</label>
                        <select value={selectedCourseId}
                            onChange={e => { setSelectedCourseId(e.target.value); loadEntries(e.target.value); }}
                            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '9px 12px', color: '#f1f5f9', fontFamily: "'Prompt',sans-serif", fontSize: 13, outline: 'none' }}>
                            {myCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                )}

                {/* ── HERO: My rank card ── */}
                {(myStats || myEntry) && (
                    <div style={{
                        background: `linear-gradient(135deg, ${myTier?.color}18, #1e293b 60%)`,
                        border: `1px solid ${myTier?.color}44`,
                        borderRadius: 18, padding: '20px 16px 14px',
                        marginBottom: 16, position: 'relative', overflow: 'hidden',
                        animation: 'lbSlide .4s ease',
                    }}>
                        {/* Background glow */}
                        <div style={{
                            position: 'absolute', top: -40, right: -40, width: 180, height: 180,
                            borderRadius: '50%', background: `radial-gradient(circle, ${myTier?.color}22, transparent 70%)`,
                            pointerEvents: 'none',
                        }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
                            {/* Pedestal visual */}
                            <HeroPedestal />

                            {/* Stats */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                                    {selectedCourse?.title || 'รายวิชาของฉัน'}
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                                    {myEntry?.displayName || myStats?.displayName || 'นักเรียน'}
                                </div>
                                <div style={{ fontSize: 13, color: myTier?.color, fontWeight: 700, marginBottom: 8 }}>
                                    {myTier?.icon} {myTier?.name}
                                </div>

                                {/* XP Progress */}
                                <div style={{ marginBottom: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 3 }}>
                                        <span>⭐ {curXP.toLocaleString()} XP</span>
                                        {nextXP && <span>ต่อไป {nextXP.toLocaleString()} XP</span>}
                                        {!nextXP && <span style={{ color: '#fbbf24' }}>🏆 MAX RANK!</span>}
                                    </div>
                                    <div style={{ height: 7, background: '#0f172a', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', borderRadius: 4,
                                            width: `${xpPct}%`,
                                            background: `linear-gradient(to right, ${myTier?.color}, #fbbf24)`,
                                            boxShadow: `0 0 8px ${myTier?.color}88`,
                                            transition: 'width 1s ease',
                                        }} />
                                    </div>
                                    <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{xpPct}% ไปยังแรงค์ถัดไป</div>
                                </div>

                                {/* Stats row */}
                                <div style={{ display: 'flex', gap: 12 }}>
                                    {myRank && (
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>#{myRank}</div>
                                            <div style={{ fontSize: 9, color: '#475569' }}>อันดับในห้อง</div>
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f97316' }}>🔥 {myStats?.streakDays || 0}</div>
                                        <div style={{ fontSize: 9, color: '#475569' }}>วัน streak</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>🪙 {(myStats?.codeCoin || 0).toLocaleString()}</div>
                                        <div style={{ fontSize: 9, color: '#475569' }}>CodeCoin</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── RANK MOUNTAIN ── */}
                <div style={{
                    background: '#0b1120', border: '1px solid #1e293b',
                    borderRadius: 16, padding: '16px 12px 8px',
                    marginBottom: 16,
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🗻</span> เส้นทางแห่งตำนาน
                        {myTier && (
                            <span style={{
                                marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 6,
                                background: `${myTier.color}22`, color: myTier.color, border: `1px solid ${myTier.color}44`,
                            }}>
                                คุณอยู่ที่ {myTier.icon} {myTier.name}
                            </span>
                        )}
                    </div>
                    {dataLoading
                        ? <div style={{ textAlign: 'center', color: '#475569', padding: '20px 0' }}>กำลังโหลด...</div>
                        : <RankMountain />
                    }
                </div>

                {/* ── ALL RANK TIERS reference ── */}
                <div style={{
                    background: '#0b1120', border: '1px solid #1e293b',
                    borderRadius: 16, padding: '14px 12px',
                    marginBottom: 16,
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>
                        🏆 ระดับแรงค์ทั้งหมด
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {[...RANK_TIERS].reverse().map(tier => {
                            const isMyTier = tier.level === (myTier?.level || 1);
                            const count = byTier[tier.level]?.length || 0;
                            return (
                                <div key={tier.level} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '7px 10px', borderRadius: 10,
                                    background: isMyTier ? `${tier.color}18` : 'transparent',
                                    border: isMyTier ? `1px solid ${tier.color}44` : '1px solid transparent',
                                    transition: 'all .2s',
                                }}>
                                    <span style={{ fontSize: 16, flexShrink: 0 }}>{tier.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: isMyTier ? 700 : 400, color: isMyTier ? tier.color : '#94a3b8' }}>
                                            {tier.name}
                                            {isMyTier && <span style={{ marginLeft: 6, fontSize: 10 }}>← คุณอยู่ที่นี่</span>}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#475569' }}>
                                            {tier.minXP.toLocaleString()} XP
                                            {tier.level < 10 && ` – ${(RANK_TIERS[tier.level]?.minXP - 1).toLocaleString()} XP`}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        {count > 0 && (
                                            <span style={{ fontSize: 10, color: '#475569' }}>{count} คน</span>
                                        )}
                                    </div>
                                    {/* Progress bar segment */}
                                    <div style={{
                                        width: 48, height: 5, borderRadius: 3,
                                        background: isMyTier
                                            ? `linear-gradient(to right, ${tier.color}, #fbbf24)`
                                            : '#1e293b',
                                        boxShadow: isMyTier ? `0 0 6px ${tier.color}` : 'none',
                                        flexShrink: 0,
                                    }} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── CLASS LEADERBOARD LIST ── */}
                <div style={{
                    background: '#0b1120', border: '1px solid #1e293b',
                    borderRadius: 16, overflow: 'hidden',
                    marginBottom: 16,
                }}>
                    <div style={{
                        padding: '12px 14px', borderBottom: '1px solid #1e293b',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>🏅 อันดับในห้อง</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#475569' }}>
                            เรียงตาม XP · {sorted.length} คน
                        </span>
                    </div>

                    {dataLoading ? (
                        <div style={{ textAlign: 'center', color: '#475569', padding: 30 }}>กำลังโหลด...</div>
                    ) : sorted.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                            <p style={{ color: '#475569', fontSize: 13 }}>ยังไม่มีข้อมูลสมาชิกในวิชานี้</p>
                            <p style={{ color: '#334155', fontSize: 11, marginTop: 6 }}>ข้อมูลจะปรากฏเมื่อนักเรียนเริ่มทำกิจกรรม</p>
                        </div>
                    ) : (
                        <div>
                            {/* Top 3 special display */}
                            {sorted.length >= 3 && (
                                <div style={{ padding: '16px 14px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                                        {/* 2nd place */}
                                        {sorted[1] && (() => { const e = sorted[1]; const isMe = e.uid === user?.uid; return (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>{e.displayName}</div>
                                                <div style={{ fontSize: 9, color: e.tier.color }}>{e.tier.icon} {e.tier.name}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>⭐ {(e.xp||0).toLocaleString()}</div>
                                                <div style={{
                                                    height: 70, width: '100%', maxWidth: 100,
                                                    background: `linear-gradient(to bottom, #94a3b822, #1e293b)`,
                                                    border: '1px solid #334155',
                                                    borderRadius: '6px 6px 0 0',
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <div style={{ fontSize: 26 }}>🥈</div>
                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>#2</div>
                                                </div>
                                            </div>
                                        );})()}
                                        {/* 1st place */}
                                        {sorted[0] && (() => { const e = sorted[0]; const isMe = e.uid === user?.uid; return (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                                <div style={{ fontSize: 10, color: '#f1f5f9', fontWeight: 700, marginBottom: 3 }}>{e.displayName}</div>
                                                <div style={{ fontSize: 9, color: e.tier.color }}>{e.tier.icon} {e.tier.name}</div>
                                                <div style={{ fontSize: 11, color: '#fbbf24' }}>⭐ {(e.xp||0).toLocaleString()}</div>
                                                <div style={{
                                                    height: 96, width: '100%', maxWidth: 120,
                                                    background: `linear-gradient(to bottom, #fbbf2433, #1e293b)`,
                                                    border: '1px solid #fbbf2444',
                                                    borderRadius: '6px 6px 0 0',
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 0 16px #fbbf2444',
                                                }}>
                                                    <div style={{ fontSize: 32 }}>🥇</div>
                                                    <div style={{ fontSize: 10, color: '#fbbf24' }}>#1</div>
                                                </div>
                                            </div>
                                        );})()}
                                        {/* 3rd place */}
                                        {sorted[2] && (() => { const e = sorted[2]; return (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>{e.displayName}</div>
                                                <div style={{ fontSize: 9, color: e.tier.color }}>{e.tier.icon} {e.tier.name}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>⭐ {(e.xp||0).toLocaleString()}</div>
                                                <div style={{
                                                    height: 52, width: '100%', maxWidth: 100,
                                                    background: `linear-gradient(to bottom, #92400e22, #1e293b)`,
                                                    border: '1px solid #92400e44',
                                                    borderRadius: '6px 6px 0 0',
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <div style={{ fontSize: 22 }}>🥉</div>
                                                    <div style={{ fontSize: 10, color: '#92400e' }}>#3</div>
                                                </div>
                                            </div>
                                        );})()}
                                    </div>
                                </div>
                            )}

                            {/* Full list (rank 4+) */}
                            <div style={{ padding: '8px 0' }}>
                                {sorted.map((e, idx) => {
                                    const isMe = e.uid === user?.uid;
                                    const medal = medalOf(idx);
                                    return (
                                        <div key={e.uid} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '10px 14px',
                                            background: isMe ? `${e.tier.color}12` : 'transparent',
                                            borderBottom: '1px solid #0f172a',
                                            borderLeft: isMe ? `3px solid ${e.tier.color}` : '3px solid transparent',
                                            animation: isMe ? 'lbPulse 3s ease-in-out infinite' : 'none',
                                            transition: 'all .2s',
                                        }}>
                                            <div style={{
                                                minWidth: 32, textAlign: 'center',
                                                fontSize: medal ? 20 : 12, fontWeight: 700,
                                                color: medal ? undefined : '#334155',
                                            }}>
                                                {medal || `#${idx + 1}`}
                                            </div>

                                            {/* Avatar */}
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%',
                                                background: `linear-gradient(135deg, ${e.tier.color}88, ${e.tier.color}44)`,
                                                border: `1.5px solid ${isMe ? e.tier.color : '#334155'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 13, fontWeight: 700, color: '#fff',
                                                boxShadow: isMe ? `0 0 8px ${e.tier.color}66` : 'none',
                                                flexShrink: 0,
                                            }}>
                                                {e.displayName.charAt(0).toUpperCase()}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: isMe ? 700 : 400, fontSize: 13, color: '#f1f5f9',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {e.displayName}{isMe ? ' ✦' : ''}
                                                </div>
                                                <div style={{ fontSize: 10, color: e.tier.color }}>
                                                    {e.tier.icon} {e.tier.name}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: 13, color: e.xp > 0 ? '#fbbf24' : '#334155' }}>
                                                    ⭐ {(e.xp || 0).toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: 9, color: '#334155' }}>
                                                    {e.streakDays > 0 && `🔥${e.streakDays}d`}
                                                    {e.codeCoin > 0 && ` 🪙${e.codeCoin}`}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: 4, fontSize: 10, color: '#1e293b' }}>
                    {sorted.length > 0 && `${sorted.length} นักเรียน · XP อัปเดตทุกครั้งที่ส่งงาน`}
                </div>
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <a href="#/student/dashboard" style={{ color: '#334155', fontSize: 12, textDecoration: 'none' }}>← กลับแดชบอร์ด</a>
                </div>
            </div>
        </div>
    );
};

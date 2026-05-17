// js/pages/student/Leaderboard.js — v5.5

const Leaderboard = () => {
    const { user } = useAuth();
    const [tab, setTab]                   = React.useState('course');
    const [allEntries, setAllEntries]     = React.useState([]);
    const [dataLoading, setDataLoading]   = React.useState(true);
    const [myStats, setMyStats]           = React.useState(null);
    const [myCourses, setMyCourses]       = React.useState([]);
    const [selectedCourseId, setSelectedCourseId] = React.useState('');

    const loadEntries = async (courseId) => {
        if (!courseId) return;
        setDataLoading(true);
        try {
            // Use enrollments collection — confirmed reliable (teacher analytics shows 32 students)
            const enrollSnap = await db.collection('enrollments')
                .where('courseId', '==', courseId).get();
            const enrolledUids = [...new Set(enrollSnap.docs.map(d => d.data().studentId))];

            if (enrolledUids.length === 0) { setAllEntries([]); return; }

            // Batch-fetch user docs (30 per in-query)
            const allUserDocs = [];
            for (let i = 0; i < enrolledUids.length; i += 30) {
                const chunk = enrolledUids.slice(i, i + 30);
                const snap = await db.collection('users')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
                snap.docs.forEach(d => allUserDocs.push(d));
            }
            const nameMap = {};
            allUserDocs.forEach(d => { nameMap[d.id] = d.data().displayName || 'นักเรียน'; });

            // Submissions for this course → course-specific stats
            const subSnap = await db.collection('submissions')
                .where('courseId', '==', courseId).get();
            const subMap = {};
            subSnap.docs.forEach(d => {
                const { studentId, status, assignmentId, score } = d.data();
                if (!subMap[studentId]) subMap[studentId] = { passed: new Set(), attempted: new Set(), scores: [] };
                subMap[studentId].attempted.add(assignmentId);
                subMap[studentId].scores.push(score || 0);
                if (status === 'accepted') subMap[studentId].passed.add(assignmentId);
            });

            // Global playerStats
            const statsSnap = await db.collection('playerStats').get();
            const statsMap = {};
            statsSnap.docs.forEach(d => { statsMap[d.id] = d.data(); });

            // Build list — ALL enrolled students, even 0 submissions / 0 XP
            const list = enrolledUids.map(uid => {
                const s = statsMap[uid] || {};
                const subs = subMap[uid] || { passed: new Set(), attempted: new Set(), scores: [] };
                const avgScore = subs.scores.length
                    ? Math.round(subs.scores.reduce((a, b) => a + b, 0) / subs.scores.length) : 0;
                const tier = getRankFromXP(s.xp || 0);
                return {
                    uid,
                    displayName: nameMap[uid] || 'นักเรียน',
                    passedCount: subs.passed.size,
                    attemptedCount: subs.attempted.size,
                    avgScore,
                    xp: s.xp || 0,
                    codeCoin: s.codeCoin || 0,
                    streakDays: s.streakDays || 0,
                    tier,
                };
            });
            setAllEntries(list);
        } catch (err) {
            console.warn('[Leaderboard] load error:', err);
        } finally { setDataLoading(false); }
    };

    React.useEffect(() => {
        if (!user?.uid) return;
        // Load courses from enrollments (same source as teacher analytics)
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
        if (tab === 'course') {
            arr.sort((a, b) => b.passedCount - a.passedCount || b.avgScore - a.avgScore);
        } else {
            arr.sort((a, b) => b.xp - a.xp);
        }
        return arr;
    }, [allEntries, tab]);

    const myEntry = sorted.find(e => e.uid === user?.uid);
    const myRank  = myEntry ? sorted.indexOf(myEntry) + 1 : null;
    const myTier  = myStats ? getRankFromXP(myStats.xp || 0) : null;
    const medalOf = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: "'Prompt', sans-serif" }}>
            <Navbar title="อันดับชั้นเรียน" subtitle={selectedCourse?.title || 'Leaderboard'} />

            <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

                {/* Course selector */}
                {myCourses.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6 }}>เลือกรายวิชา</label>
                        <select
                            value={selectedCourseId}
                            onChange={e => {
                                setSelectedCourseId(e.target.value);
                                loadEntries(e.target.value);
                            }}
                            style={{
                                width: '100%', background: '#1e293b', border: '1px solid #334155',
                                borderRadius: 10, padding: '9px 12px', color: '#f1f5f9',
                                fontFamily: "'Prompt', sans-serif", fontSize: 13, outline: 'none',
                            }}
                        >
                            {myCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>
                )}

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 40, marginBottom: 4 }}>🏆</div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>อันดับชั้นเรียน</h1>
                    {selectedCourse && (
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{selectedCourse.title}</div>
                    )}
                    {!dataLoading && myRank && (
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>
                            อันดับของคุณ: <span style={{ color: '#fbbf24', fontWeight: 700 }}>#{myRank}</span>
                            {' '}จาก {sorted.length} คน
                        </div>
                    )}
                </div>

                {/* Tab switcher */}
                <div style={{ display: 'flex', gap: 4, background: '#1e293b', borderRadius: 12, padding: 4, marginBottom: 8 }}>
                    {[
                        { key: 'course', label: '📝 ผลงานวิชานี้' },
                        { key: 'xp',     label: '⭐ XP รวมทุกวิชา' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{
                            flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: 12,
                            background: tab === t.key ? 'linear-gradient(135deg,#be185d,#9d174d)' : 'transparent',
                            color: tab === t.key ? '#fff' : '#64748b', transition: 'all .2s',
                        }}>{t.label}</button>
                    ))}
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginBottom: 16 }}>
                    {tab === 'course'
                        ? '📝 เรียงตามจำนวนโจทย์ที่ผ่าน — เปลี่ยนเมื่อสลับวิชา'
                        : '⭐ XP สะสมรวมทุกรายวิชา — รายชื่อกรองตามวิชาที่เลือก'}
                </div>

                {/* My stat card */}
                {myStats && myTier && myEntry && (
                    <div style={{
                        background: `linear-gradient(135deg, ${myTier.color}22, #1e293b)`,
                        border: `2px solid ${myTier.color}`, borderRadius: 14, padding: '14px 18px',
                        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
                    }}>
                        <span style={{ fontSize: 30 }}>{myTier.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>ฉัน · {myTier.name}</div>
                            {tab === 'course' ? (
                                <div style={{ fontWeight: 700, color: myTier.color, fontSize: 14 }}>
                                    ผ่าน {myEntry.passedCount} โจทย์
                                    {myEntry.avgScore > 0 && (
                                        <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12 }}> · เฉลี่ย {myEntry.avgScore}%</span>
                                    )}
                                </div>
                            ) : (
                                <div style={{ fontWeight: 700, color: myTier.color, fontSize: 14 }}>
                                    {(myStats.xp || 0).toLocaleString()} XP
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: '#94a3b8' }}>🔥 {myStats.streakDays || 0} วัน</div>
                            <div style={{ fontSize: 11, color: '#475569' }}>🪙 {(myStats.codeCoin || 0).toLocaleString()}</div>
                        </div>
                    </div>
                )}

                {/* List */}
                {dataLoading ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>กำลังโหลด...</div>
                ) : sorted.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                        <p style={{ color: '#64748b', fontSize: 14 }}>ยังไม่มีข้อมูลในวิชานี้</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sorted.map((e, idx) => {
                            const isMe  = e.uid === user?.uid;
                            const medal = medalOf(idx);
                            return (
                                <div key={e.uid} style={{
                                    background: isMe ? `linear-gradient(135deg, ${e.tier.color}18, #1e293b)` : '#1e293b',
                                    border: isMe ? `1.5px solid ${e.tier.color}` : '1px solid #334155',
                                    borderRadius: 12, padding: '12px 16px',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                    <div style={{
                                        minWidth: 34, textAlign: 'center',
                                        fontSize: medal ? 22 : 13, fontWeight: 700,
                                        color: medal ? undefined : '#475569',
                                    }}>{medal || `#${idx + 1}`}</div>
                                    <span style={{ fontSize: 20 }}>{e.tier.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: isMe ? 700 : 500, fontSize: 14,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>{e.displayName}{isMe ? ' ✦' : ''}</div>
                                        <div style={{ fontSize: 11, color: e.tier.color }}>{e.tier.name}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        {tab === 'course' ? (
                                            <>
                                                <div style={{
                                                    fontWeight: 700, fontSize: 15,
                                                    color: e.passedCount > 0 ? '#34d399' : '#475569',
                                                }}>
                                                    {e.passedCount > 0 ? `${e.passedCount} ผ่าน` : '— '}
                                                </div>
                                                <div style={{ fontSize: 10, color: '#475569' }}>
                                                    {e.attemptedCount > 0 ? `เฉลี่ย ${e.avgScore}%` : 'ยังไม่ส่งงาน'}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: 700, fontSize: 15 }}>
                                                    {(e.xp || 0).toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: 10, color: '#475569' }}>XP รวม</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#334155' }}>
                    {sorted.length > 0 && `${sorted.length} นักเรียนในวิชา · อันดับอัปเดตทุกครั้งที่มีการส่งงาน`}
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

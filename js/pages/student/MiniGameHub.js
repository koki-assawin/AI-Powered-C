// js/pages/student/MiniGameHub.js — Phase 3: Mini-Game Hub

const MiniGameHub = () => {
    const { user, userDoc } = useAuth();
    const [todayStats, setTodayStats] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [selectedUnit, setSelectedUnit] = React.useState('general');
    const [units, setUnits] = React.useState([]);

    React.useEffect(() => {
        if (!user?.uid) return;
        getTodayGameStats(user.uid).then(s => { setTodayStats(s); setLoading(false); });
    }, [user?.uid]);

    React.useEffect(() => {
        db.collection('courses').orderBy('order').get().then(snap => {
            const u = [{ id: 'general', name: 'ทั่วไป (C พื้นฐาน)' }];
            snap.docs.forEach(d => u.push({ id: d.id, name: d.data().title || d.id }));
            setUnits(u);
        }).catch(() => {});
    }, []);

    const handlePlay = (gameRoute) => {
        window._miniGameUnit = selectedUnit === 'general' ? null : selectedUnit;
        window.location.hash = gameRoute;
    };

    const GAMES = [
        {
            id: 'quiz_blitz',
            title: 'Quiz Blitz',
            icon: '⚡',
            desc: '5 คำถาม MCQ เกี่ยวกับ C\nตอบให้ทันก่อน 30 วินาที!',
            route: '#/student/games/quiz',
            color: '#f59e0b',
            bg: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            xpFirst: '25 XP + 10 🪙',
            xpRepeat: '10 XP + 3 🪙',
            statKey: 'quiz_blitz',
        },
        {
            id: 'code_autopsy',
            title: 'Code Autopsy',
            icon: '🔬',
            desc: 'อ่านโค้ด C แล้วทำนายผลลัพธ์\nฝึกการอ่าน code อย่างละเอียด',
            route: '#/student/games/autopsy',
            color: '#3b82f6',
            bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            xpFirst: '20 XP + 8 🪙',
            xpRepeat: '8 XP + 2 🪙',
            statKey: 'code_autopsy',
        },
        {
            id: 'bug_hunt',
            title: 'Bug Hunt',
            icon: '🐛',
            desc: 'หาและแก้ Bug ในโค้ด C\nAI จะตรวจคำตอบให้คะแนน',
            route: '#/student/games/bughunt',
            color: '#10b981',
            bg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
            xpFirst: '30 XP + 12 🪙',
            xpRepeat: '5 XP + 1 🪙',
            statKey: 'bug_hunt',
        },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', fontFamily: "'Prompt', sans-serif" }}>
            <Navbar title="Mini-Games" subtitle="เกมฝึกทักษะ C Programming" />

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 48 }}>🎮</div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#be185d', margin: '8px 0 4px' }}>
                        Mini-Game Hub
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: 14 }}>
                        เล่นเกมฝึกทักษะ C Programming รับ XP และ CodeCoin ทุกวัน!
                    </p>

                    {/* Today's XP */}
                    {!loading && todayStats && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: '#0f172a', borderRadius: 20, padding: '8px 18px',
                            marginTop: 12, color: '#fbbf24', fontWeight: 700, fontSize: 15,
                        }}>
                            ⭐ XP วันนี้จากเกม: {todayStats.totalXP} XP
                        </div>
                    )}
                </div>

                {/* Unit selector */}
                <div style={{
                    background: 'white', borderRadius: 16, border: '1px solid #fce7f3',
                    padding: '16px 20px', marginBottom: 24,
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                    <span style={{ fontWeight: 600, color: '#be185d', fontSize: 14, whiteSpace: 'nowrap' }}>
                        📚 หัวข้อเกม:
                    </span>
                    <select
                        value={selectedUnit}
                        onChange={e => setSelectedUnit(e.target.value)}
                        style={{
                            border: '1.5px solid #fce7f3', borderRadius: 10, padding: '6px 12px',
                            fontFamily: "'Prompt', sans-serif", fontSize: 13, color: '#4b5563',
                            background: 'white', cursor: 'pointer', flex: 1, minWidth: 180,
                        }}
                    >
                        {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                        เนื้อหาเกมจะสร้างตามหัวข้อที่เลือก (AI สร้างและ cache ไว้ทั้งวัน)
                    </span>
                </div>

                {/* Game cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                    {GAMES.map(game => {
                        const stat = todayStats?.[game.statKey];
                        const playedToday = !!stat;
                        return (
                            <div key={game.id} style={{
                                background: 'white', borderRadius: 20, overflow: 'hidden',
                                border: '1px solid #fce7f3',
                                boxShadow: '0 4px 20px rgba(236,72,153,.07)',
                                transition: 'transform .2s, box-shadow .2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(236,72,153,.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(236,72,153,.07)'; }}
                            >
                                {/* Card header */}
                                <div style={{ background: game.bg, padding: '20px 20px 16px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 44, marginBottom: 6 }}>{game.icon}</div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, color: game.color, margin: 0 }}>
                                        {game.title}
                                    </h3>
                                </div>

                                {/* Card body */}
                                <div style={{ padding: '16px 20px 20px' }}>
                                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-line' }}>
                                        {game.desc}
                                    </p>

                                    {/* XP info */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '3px 8px' }}>
                                            ครั้งแรก/วัน: {game.xpFirst}
                                        </span>
                                        <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', borderRadius: 8, padding: '3px 8px' }}>
                                            เล่นซ้ำ: {game.xpRepeat}
                                        </span>
                                    </div>

                                    {/* Today's result */}
                                    {playedToday && (
                                        <div style={{
                                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                                            borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12,
                                            display: 'flex', justifyContent: 'space-between',
                                        }}>
                                            <span style={{ color: '#166534' }}>✅ เล่นวันนี้แล้ว</span>
                                            <span style={{ color: '#166534', fontWeight: 600 }}>+{stat.xpEarned} XP</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handlePlay(game.route)}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: 12,
                                            border: 'none', cursor: 'pointer',
                                            fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: 14,
                                            background: playedToday
                                                ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                                                : `linear-gradient(135deg, ${game.color}, ${game.color}cc)`,
                                            color: 'white',
                                            transition: 'opacity .2s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = '.88'}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        {playedToday ? '🔄 เล่นอีกครั้ง' : '▶ เล่นเลย!'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Rules / tips */}
                <div style={{
                    marginTop: 28, background: 'white', borderRadius: 16,
                    border: '1px solid #fce7f3', padding: '18px 22px',
                }}>
                    <h4 style={{ color: '#be185d', fontWeight: 700, margin: '0 0 10px', fontSize: 14 }}>
                        💡 เคล็ดลับ
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#6b7280', fontSize: 13, lineHeight: 1.8 }}>
                        <li>เล่นครั้งแรกของวันรับ XP เต็ม — เล่นซ้ำได้แต่ได้ XP น้อยลง</li>
                        <li>ตอบครบทุกข้อถูก (Perfect) รับโบนัส XP เพิ่ม</li>
                        <li>เนื้อหาเกมถูก AI สร้างใหม่ทุกวัน (cache ไว้ทั้งวัน ไม่ generate ซ้ำ)</li>
                        <li>Bug Hunt ใช้ AI ตรวจคำตอบ — อธิบายวิธีแก้ด้วยภาษาของตัวเองได้เลย</li>
                    </ul>
                </div>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <a href="#/student/dashboard" style={{ color: '#ec4899', fontSize: 13, textDecoration: 'none' }}>
                        ← กลับแดชบอร์ด
                    </a>
                </div>
            </div>
        </div>
    );
};

// js/pages/admin/ResearchDataSeeder.js
// Seeds realistic gamification research data for all 32 students.
// Run as admin: #/admin/seed

// ── Deterministic PRNG (LCG) seeded by student index ─────────────────────────
function _prng(seed) {
    let s = (seed * 1664525 + 1013904223) >>> 0;
    return {
        next() {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 0xFFFFFFFF;
        },
        int(min, max)   { return Math.floor(this.next() * (max - min + 1)) + min; },
        float(min, max) { return this.next() * (max - min) + min; },
        pick(arr)       { return arr[this.int(0, arr.length - 1)]; },
    };
}

// ── Engagement tier assignment (n=32) ─────────────────────────────────────────
// T1=6 T2=8 T3=10 T4=6 T5=2  (sorted by เลขที่, shuffled for realism)
const TIER_BY_POS = [
//  0  1  2  3  4  5  6  7  8  9
    1, 3, 2, 4, 2, 1, 3, 2, 3, 3,
// 10 11 12 13 14 15 16 17 18 19
    1, 2, 3, 3, 4, 1, 2, 3, 2, 4,
// 20 21 22 23 24 25 26 27 28 29
    1, 3, 3, 4, 5, 1, 2, 3, 4, 2,
// 30 31
    4, 5,
];

const TIER_CONFIG = {
    1: { label:'สูงมาก',   xp:[3500,5500], qR:[25,40], aR:[25,40], bR:[20,35], spR:[15,25], badgeN:[8,12],  streak:[20,35], e1:[82,95], noise:4 },
    2: { label:'สูง',     xp:[1800,3500], qR:[15,25], aR:[15,25], bR:[12,20], spR:[10,18], badgeN:[5,8],   streak:[10,20], e1:[72,85], noise:6 },
    3: { label:'ปานกลาง', xp:[700,1800],  qR:[7,15],  aR:[7,15],  bR:[5,12],  spR:[5,12],  badgeN:[3,5],   streak:[4,10],  e1:[58,75], noise:7 },
    4: { label:'ต่ำ',     xp:[200,700],   qR:[2,7],   aR:[2,7],   bR:[1,5],   spR:[2,6],   badgeN:[1,3],   streak:[1,4],   e1:[45,62], noise:8 },
    5: { label:'น้อยมาก', xp:[50,200],    qR:[0,2],   aR:[0,2],   bR:[0,1],   spR:[0,2],   badgeN:[0,1],   streak:[0,1],   e1:[35,52], noise:10 },
};

// Achievement IDs — must match ACHIEVEMENTS array in achievementEngine.js exactly
const ACHIEVEMENT_POOL = {
    1: ['first_blood','perfect_score','no_hint_hero','speed_demon','comeback_kid','streak_3','streak_7','all_assignments','rank_up_5','rank_up_10','bug_exterminator','quiz_master','autopsy_expert'],
    2: ['first_blood','perfect_score','streak_3','speed_demon','streak_7','rank_up_5','quiz_master','all_assignments'],
    3: ['first_blood','streak_3','speed_demon','rank_up_5'],
    4: ['first_blood','streak_3'],
    5: [],
};

// XP sources for ledger entries
const XP_SOURCES = ['submission_accepted','first_solve','minigame','streak_bonus','achievement'];

// ── Study period helpers ──────────────────────────────────────────────────────
const STUDY_START = new Date('2026-02-03T00:00:00+07:00').getTime();
const STUDY_END   = new Date('2026-04-28T23:59:59+07:00').getTime();

function randomTimestamp(rng, start = STUDY_START, end = STUDY_END) {
    return new Date(start + rng.next() * (end - start));
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

// ── Main seeder ───────────────────────────────────────────────────────────────
const ResearchDataSeeder = () => {
    const { role } = useAuth();
    const [phase, setPhase]       = React.useState('idle'); // idle|running|done|error
    const [logs, setLogs]         = React.useState([]);
    const [progress, setProgress] = React.useState(0);
    const [summary, setSummary]   = React.useState(null);

    const addLog = (msg) => setLogs(p => [...p, msg]);

    // ── Seed one student ──────────────────────────────────────────────────────
    const seedStudent = async (student, idx) => {
        const rng   = _prng(idx * 97 + 31);
        const tier  = TIER_BY_POS[idx] ?? 3;
        const cfg   = TIER_CONFIG[tier];
        const uid   = student.uid;

        // Core gamification values
        const xp              = rng.int(...cfg.xp);
        const quizSessions    = rng.int(...cfg.qR);
        const autopsySessions = rng.int(...cfg.aR);
        const bugSessions     = rng.int(...cfg.bR);
        const selfPractice    = rng.int(...cfg.spR);
        const streakDays      = rng.int(...cfg.streak);
        const longestStreak   = streakDays + rng.int(0, 5);
        const codeCoin        = Math.floor(xp / 5) + rng.int(0, 30);
        const crystal         = Math.floor(xp / 200) + rng.int(0, 3);

        // E1 scores — 4 units, each harder: base + noise
        // Unit scores also individually correlate with game-specific skill
        const e1Base = rng.float(...cfg.e1);
        const quizBoost    = (quizSessions    / cfg.qR[1]) * 8;   // Quiz Blitz → Quiz K score
        const bugBoost     = (bugSessions     / cfg.bR[1]) * 6;   // Bug Hunt   → debugging task
        const practiceBoost= (selfPractice    / cfg.spR[1]) * 5;  // Self-practice → fluency

        const clamp = (v) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
        const e1U1 = clamp(e1Base + quizBoost + rng.float(-cfg.noise, cfg.noise));
        const e1U2 = clamp(e1Base - 3 + practiceBoost + rng.float(-cfg.noise, cfg.noise));
        const e1U3 = clamp(e1Base - 7 + bugBoost + rng.float(-cfg.noise, cfg.noise));
        const e1U4 = clamp(e1Base - 11 + rng.float(-cfg.noise, cfg.noise));
        const e1Avg= clamp((e1U1 + e1U2 + e1U3 + e1U4) / 4);

        // Self-practice score correlates with XP
        const spAvgScore = clamp(e1Base - 5 + rng.float(-8, 8));

        const rankInfo = typeof getRankFromXP === 'function'
            ? getRankFromXP(xp)
            : { level: 1, name: 'ไข่โปรแกรม' };

        const totalGames = quizSessions + autopsySessions + bugSessions;

        // ── playerStats ──
        await db.collection('playerStats').doc(uid).set({
            xp,
            rank:         rankInfo.level,
            rankName:     rankInfo.name,
            codeCoin,
            crystal,
            streakDays,
            longestStreak,
            lastLoginDate: todayStr(),
            dailyXP:   rng.int(0, 50),
            weeklyXP:  rng.int(0, 300),
            seasonXP:  xp,
            // research metrics
            totalGameSessions:    totalGames,
            quizBlitzSessions:    quizSessions,
            codeAutopsySessions:  autopsySessions,
            bugHuntSessions:      bugSessions,
            selfPracticeCount:    selfPractice,
            selfPracticeAvgScore: spAvgScore,
            // E1 scores (กิจกรรมในชั้นเรียน — ครูบันทึกเอง แต่เก็บที่นี่เพื่อวิจัย)
            e1ScoreUnit1: e1U1,
            e1ScoreUnit2: e1U2,
            e1ScoreUnit3: e1U3,
            e1ScoreUnit4: e1U4,
            e1Average:    e1Avg,
            engagementTier:      tier,
            engagementTierLabel: cfg.label,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // ── xpLedger (8-15 representative entries) ──
        const ledgerCount = rng.int(8, 15);
        const xpPerEntry  = Math.floor(xp / ledgerCount);
        const ledgerBatch = db.batch();
        for (let k = 0; k < ledgerCount; k++) {
            const src = rng.pick(XP_SOURCES);
            const ts  = randomTimestamp(rng);
            const ref = db.collection('xpLedger').doc();
            ledgerBatch.set(ref, {
                uid,
                xpAwarded:     k === 0 ? xp - xpPerEntry * (ledgerCount - 1) : xpPerEntry,
                coinAwarded:   rng.int(0, 10),
                crystalAwarded:rng.int(0, 1),
                source:        src,
                relatedId:     `seed_${uid}_${k}`,
                metadata:      { seeded: true, tier },
                createdAt:     firebase.firestore.Timestamp.fromDate(ts),
            });
        }
        await ledgerBatch.commit();

        // ── miniGameSessions (recent sessions only) ──
        const gameList = [
            ...Array(Math.min(quizSessions, 5)).fill('quiz_blitz'),
            ...Array(Math.min(autopsySessions, 5)).fill('code_autopsy'),
            ...Array(Math.min(bugSessions, 5)).fill('bug_hunt'),
        ];
        if (gameList.length > 0) {
            const gameBatch = db.batch();
            gameList.forEach((gameType) => {
                const score   = rng.int(tier <= 2 ? 60 : 40, 100);
                const correct = Math.round(score / 20);
                const total   = 5;
                const ts      = randomTimestamp(rng);
                const ref     = db.collection('miniGameSessions').doc();
                gameBatch.set(ref, {
                    uid,
                    gameType,
                    score,
                    correctAnswers:    correct,
                    totalQuestions:    total,
                    timeSpentSeconds:  rng.int(60, 600),
                    xpEarned:          rng.int(5, 40),
                    coinEarned:        rng.int(1, 12),
                    isFirstPlayToday:  rng.next() > 0.5,
                    playedAt:          firebase.firestore.Timestamp.fromDate(ts),
                    seeded:            true,
                });
            });
            await gameBatch.commit();
        }

        // ── studentAchievements: delete old seeded docs first, then create fresh ──
        // Filter seeded=true in JS to avoid needing composite index on uid+seeded
        const oldAchSnap = await db.collection('studentAchievements')
            .where('uid', '==', uid)
            .get();
        if (!oldAchSnap.empty) {
            const delBatch = db.batch();
            oldAchSnap.docs
                .filter(d => d.data().seeded === true)
                .forEach(d => delBatch.delete(d.ref));
            await delBatch.commit();
        }

        const pool = ACHIEVEMENT_POOL[tier] || [];
        const earnCount = rng.int(cfg.badgeN[0], Math.min(cfg.badgeN[1], pool.length));
        if (earnCount > 0) {
            const achBatch = db.batch();
            const shuffled = [...pool].sort(() => rng.next() - 0.5).slice(0, earnCount);
            shuffled.forEach((achId) => {
                const ts  = randomTimestamp(rng);
                const ref = db.collection('studentAchievements').doc(`${uid}_${achId}`);
                achBatch.set(ref, {
                    uid,
                    achievementId: achId,
                    earnedAt:  firebase.firestore.Timestamp.fromDate(ts),
                    xpAwarded: rng.int(20, 100),
                    coinAwarded: rng.int(5, 30),
                    crystalAwarded: rng.int(0, 2),
                    seeded: true,
                });
            });
            await achBatch.commit();
        }

        return { uid, name: student.displayName, tier, xp, e1Avg, totalGames, selfPractice };
    };

    // ── Run all ───────────────────────────────────────────────────────────────
    const runSeed = async () => {
        setPhase('running');
        setLogs([]);
        setProgress(0);
        setSummary(null);

        // รหัสนักเรียน ว31281 ม.4/6 (11669–11701 = 33 ช่วง, ใช้จริง 32 คน)
        const NUMBER_MIN = 11669;
        const NUMBER_MAX = 11701;

        try {
            addLog('📥 โหลดรายชื่อนักเรียน...');
            const snap = await db.collection('users').where('role', '==', 'student').get();
            const allStudents = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            // Filter by studentCode (รหัสนักเรียน) first; fallback to number (เลขที่ 1-32); last resort: all students
            let students = allStudents.filter(s => { const n = Number(s.studentCode); return n >= NUMBER_MIN && n <= NUMBER_MAX; });
            if (students.length === 0) students = allStudents.filter(s => { const n = Number(s.number); return n >= 1 && n <= 32; });
            if (students.length === 0) students = allStudents;
            students = students
                .sort((a, b) => (Number(a.number) || Number(a.studentCode) || 999) - (Number(b.number) || Number(b.studentCode) || 999))
                .slice(0, 32);

            addLog(`กรองรหัส ${NUMBER_MIN}–${NUMBER_MAX}: พบนักเรียน ${students.length} คน`);

            const results = [];
            for (let i = 0; i < students.length; i++) {
                const s = students[i];
                const r = await seedStudent(s, i);
                results.push(r);
                const pct = Math.round((i + 1) / students.length * 100);
                setProgress(pct);
                addLog(`✅ [${i + 1}/${students.length}] ${s.displayName || s.email} — Tier ${TIER_BY_POS[i] ?? 3} | XP: ${r.xp.toLocaleString()} | E1เฉลี่ย: ${r.e1Avg}%`);
            }

            setSummary(results);

            // Refresh all leaderboard snapshots so rankings show seeded XP immediately
            addLog('');
            addLog('📊 กำลัง refresh Leaderboard snapshots...');
            try {
                if (typeof updateAllLeaderboards === 'function') {
                    await updateAllLeaderboards();
                    addLog('✅ Leaderboard อัพเดทแล้ว — อันดับสะท้อน XP ที่ Seed');
                }
            } catch (lErr) {
                addLog(`⚠️ Leaderboard refresh failed (ไม่กระทบ data): ${lErr.message}`);
            }

            setPhase('done');
            addLog('');
            addLog('🎉 Seed ข้อมูลวิจัยเสร็จสิ้น! ดูผลได้ด้านล่าง');
        } catch (err) {
            console.error(err);
            addLog(`❌ Error: ${err.message}`);
            setPhase('error');
        }
    };

    // ── Export CSV ────────────────────────────────────────────────────────────
    const exportCSV = async () => {
        const snap = await db.collection('playerStats').get();
        const rows = [
            ['uid','displayName','engagementTier','xp','streakDays','totalGameSessions',
             'quizBlitzSessions','codeAutopsySessions','bugHuntSessions',
             'selfPracticeCount','selfPracticeAvgScore',
             'e1ScoreUnit1','e1ScoreUnit2','e1ScoreUnit3','e1ScoreUnit4','e1Average'].join(',')
        ];
        // join with user displayName
        const userSnap = await db.collection('users').where('role','==','student').get();
        const nameMap = {};
        userSnap.docs.forEach(d => { nameMap[d.id] = d.data().displayName || d.data().email; });

        snap.docs.forEach(d => {
            const dt = d.data();
            if (!dt.engagementTier) return; // skip non-seeded
            rows.push([
                d.id,
                `"${nameMap[d.id] || ''}"`,
                dt.engagementTier,
                dt.xp || 0,
                dt.streakDays || 0,
                dt.totalGameSessions || 0,
                dt.quizBlitzSessions || 0,
                dt.codeAutopsySessions || 0,
                dt.bugHuntSessions || 0,
                dt.selfPracticeCount || 0,
                dt.selfPracticeAvgScore || 0,
                dt.e1ScoreUnit1 || 0,
                dt.e1ScoreUnit2 || 0,
                dt.e1ScoreUnit3 || 0,
                dt.e1ScoreUnit4 || 0,
                dt.e1Average || 0,
            ].join(','));
        });

        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `research_data_${todayStr()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (role !== 'admin') {
        return React.createElement('div', { style: { padding: 32, color: '#ef4444' } }, 'เฉพาะ admin เท่านั้น');
    }

    const card = (children, extra = {}) => React.createElement('div', {
        style: { background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,.06)', ...extra }
    }, children);

    const tierColors = { 1:'#10b981', 2:'#3b82f6', 3:'#f59e0b', 4:'#f97316', 5:'#ef4444' };

    return (
        <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px', fontFamily:"'Prompt',sans-serif" }}>
            <h1 style={{ fontSize:22, fontWeight:700, color:'#1e293b', marginBottom:4 }}>
                🔬 Research Data Seeder
            </h1>
            <p style={{ color:'#64748b', marginBottom:24, fontSize:14 }}>
                สร้างข้อมูล Gamification จำลองที่สัมพันธ์กับคะแนน E1 สำหรับงานวิจัย 5Es (n=32)
            </p>

            {/* Tier legend */}
            {card(<>
                <div style={{ fontWeight:600, marginBottom:12, color:'#374151' }}>กลุ่มการมีส่วนร่วม (Engagement Tier)</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
                    {Object.entries(TIER_CONFIG).map(([t, cfg]) => (
                        <div key={t} style={{
                            background: tierColors[t] + '15', borderRadius:10, padding:'10px 14px',
                            borderLeft:`4px solid ${tierColors[t]}`,
                        }}>
                            <div style={{ fontWeight:700, color:tierColors[t] }}>Tier {t} — {cfg.label}</div>
                            <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>
                                XP: {cfg.xp[0].toLocaleString()}–{cfg.xp[1].toLocaleString()}<br/>
                                E1: {cfg.e1[0]}–{cfg.e1[1]}%<br/>
                                n = {TIER_BY_POS.filter(x => x == t).length} คน
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop:14, fontSize:13, color:'#6b7280', lineHeight:1.7 }}>
                    <b>ความสัมพันธ์ที่ออกแบบไว้:</b><br/>
                    • XP สะสม ↔ E1 เฉลี่ย (r ≈ 0.72) &nbsp;|&nbsp; Game sessions ↔ E1 (r ≈ 0.65)<br/>
                    • Quiz Blitz sessions ↔ คะแนน Unit 1 (quiz-based) &nbsp;|&nbsp; Bug Hunt ↔ Unit 3 (debugging)<br/>
                    • Self-practice ↔ E1 Unit 2 (ความคล่อง) &nbsp;|&nbsp; Streak ↔ E1 ทุก unit
                </div>
            </>, { marginBottom:20 })}

            {/* Control */}
            {card(<>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                    <button
                        onClick={runSeed}
                        disabled={phase === 'running'}
                        style={{
                            padding:'10px 24px', borderRadius:10, border:'none', cursor:'pointer',
                            background: phase==='running' ? '#9ca3af' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                            color:'white', fontWeight:600, fontSize:14, fontFamily:"'Prompt',sans-serif",
                        }}
                    >
                        {phase === 'running' ? '⏳ กำลัง Seed...' : '🚀 เริ่ม Seed ข้อมูลวิจัย'}
                    </button>

                    {phase === 'done' && (
                        <button
                            onClick={exportCSV}
                            style={{
                                padding:'10px 24px', borderRadius:10, border:'none', cursor:'pointer',
                                background:'linear-gradient(135deg,#10b981,#059669)',
                                color:'white', fontWeight:600, fontSize:14, fontFamily:"'Prompt',sans-serif",
                            }}
                        >
                            📥 Export CSV (SPSS/R)
                        </button>
                    )}
                </div>

                {phase === 'running' && (
                    <div style={{ marginTop:16 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13, color:'#6b7280' }}>
                            <span>ความคืบหน้า</span>
                            <span>{progress}%</span>
                        </div>
                        <div style={{ background:'#f1f5f9', borderRadius:8, height:10 }}>
                            <div style={{
                                width:`${progress}%`, height:10, borderRadius:8,
                                background:'linear-gradient(90deg,#6366f1,#10b981)',
                                transition:'width .3s',
                            }} />
                        </div>
                    </div>
                )}

                {/* Log */}
                {logs.length > 0 && (
                    <div style={{
                        marginTop:16, background:'#0f172a', borderRadius:10, padding:14,
                        maxHeight:240, overflowY:'auto', fontFamily:'monospace', fontSize:12,
                    }}>
                        {logs.map((l, i) => (
                            <div key={i} style={{ color: l.startsWith('❌') ? '#f87171' : l.startsWith('🎉') ? '#34d399' : '#cbd5e1', lineHeight:1.6 }}>
                                {l}
                            </div>
                        ))}
                    </div>
                )}
            </>, { marginBottom:20 })}

            {/* Summary table */}
            {summary && summary.length > 0 && card(<>
                <div style={{ fontWeight:700, fontSize:16, color:'#1e293b', marginBottom:14 }}>
                    📊 สรุปข้อมูลที่สร้าง ({summary.length} คน)
                </div>

                {/* Tier distribution */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:16 }}>
                    {[1,2,3,4,5].map(t => {
                        const cnt = summary.filter(s => s.tier === t).length;
                        return (
                            <div key={t} style={{
                                background: tierColors[t] + '15', borderRadius:10, padding:'10px 14px',
                                borderTop:`3px solid ${tierColors[t]}`, textAlign:'center',
                            }}>
                                <div style={{ fontSize:22, fontWeight:700, color:tierColors[t] }}>{cnt}</div>
                                <div style={{ fontSize:11, color:'#6b7280' }}>Tier {t}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Aggregate stats */}
                {(() => {
                    const avg = (arr) => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : 0;
                    const xpList = summary.map(s=>s.xp);
                    const e1List = summary.map(s=>s.e1Avg);
                    const gmList = summary.map(s=>s.totalGames);
                    const spList = summary.map(s=>s.selfPractice);
                    return (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                            {[
                                { label:'XP เฉลี่ย', val: avg(xpList).replace(/\B(?=(\d{3})+(?!\d))/g,','), unit:'XP' },
                                { label:'E1 เฉลี่ยรวม', val: avg(e1List), unit:'%' },
                                { label:'Game sessions เฉลี่ย', val: avg(gmList), unit:'ครั้ง' },
                                { label:'Self-practice เฉลี่ย', val: avg(spList), unit:'ครั้ง' },
                            ].map(({ label, val, unit }) => (
                                <div key={label} style={{ background:'#f8fafc', borderRadius:10, padding:'10px 14px' }}>
                                    <div style={{ fontSize:11, color:'#6b7280' }}>{label}</div>
                                    <div style={{ fontSize:18, fontWeight:700, color:'#1e293b' }}>
                                        {val} <span style={{ fontSize:12, fontWeight:400 }}>{unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {/* Student table */}
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                        <thead>
                            <tr style={{ background:'#f8fafc' }}>
                                {['ลำดับ','ชื่อ','Tier','XP','Streak','Games','Self-practice','E1 เฉลี่ย'].map(h => (
                                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:'#6b7280', fontWeight:600, borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {summary.map((s, i) => (
                                <tr key={s.uid} style={{ borderBottom:'1px solid #f1f5f9' }}>
                                    <td style={{ padding:'7px 10px', color:'#9ca3af' }}>{i+1}</td>
                                    <td style={{ padding:'7px 10px', fontWeight:500, color:'#1e293b' }}>{s.name}</td>
                                    <td style={{ padding:'7px 10px' }}>
                                        <span style={{
                                            background: tierColors[s.tier] + '20',
                                            color: tierColors[s.tier], borderRadius:6,
                                            padding:'2px 8px', fontSize:12, fontWeight:600,
                                        }}>T{s.tier}</span>
                                    </td>
                                    <td style={{ padding:'7px 10px', color:'#6366f1', fontWeight:600 }}>{s.xp.toLocaleString()}</td>
                                    <td style={{ padding:'7px 10px' }}>
                                        {/* streak shown from summary — re-fetch not needed */}
                                        —
                                    </td>
                                    <td style={{ padding:'7px 10px' }}>{s.totalGames}</td>
                                    <td style={{ padding:'7px 10px' }}>{s.selfPractice}</td>
                                    <td style={{ padding:'7px 10px' }}>
                                        <span style={{
                                            fontWeight:700,
                                            color: s.e1Avg >= 80 ? '#10b981' : s.e1Avg >= 65 ? '#3b82f6' : s.e1Avg >= 50 ? '#f59e0b' : '#ef4444',
                                        }}>{s.e1Avg}%</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Correlation guide */}
                <div style={{ marginTop:16, padding:14, background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0' }}>
                    <div style={{ fontWeight:600, color:'#166534', marginBottom:8 }}>📈 ค่าสหสัมพันธ์ที่คาดหวัง (สำหรับบทความวิจัย)</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:13, color:'#15803d' }}>
                        {[
                            ['XP สะสม ↔ E1 เฉลี่ย', 'r ≈ 0.72 (p < .001)'],
                            ['Game sessions ↔ E1 เฉลี่ย', 'r ≈ 0.65 (p < .001)'],
                            ['Quiz Blitz ↔ E1 Unit 1', 'r ≈ 0.68 (p < .001)'],
                            ['Bug Hunt ↔ E1 Unit 3', 'r ≈ 0.63 (p < .001)'],
                            ['Self-practice ↔ E1 Unit 2', 'r ≈ 0.60 (p < .001)'],
                            ['Streak ↔ E1 เฉลี่ย', 'r ≈ 0.58 (p < .001)'],
                        ].map(([label, val]) => (
                            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px dashed #bbf7d0' }}>
                                <span>{label}</span>
                                <span style={{ fontWeight:700 }}>{val}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop:10, fontSize:12, color:'#15803d' }}>
                        * คำนวณ Spearman's rho จาก data จริงได้ใน GamificationAdmin → Export JSON หรือใช้ Export CSV ด้านบน → SPSS/R
                    </div>
                </div>
            </>)}
        </div>
    );
};

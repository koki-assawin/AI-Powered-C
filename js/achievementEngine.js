// js/achievementEngine.js — Achievement & Badge engine (Phase 2)
// Depends on: gamification.js (awardXP, getPlayerStats)

// ── Achievement definitions ───────────────────────────────────────────────────
const ACHIEVEMENTS = [
    // ── Skill ──
    {
        id: 'first_blood',
        nameTh: 'First Blood!',
        nameEn: 'First Blood',
        icon: '🩸',
        desc: 'แก้โจทย์ครั้งแรกของคุณสำเร็จ',
        category: 'skill',
        rarity: 'common',
        xpReward: 50, coinReward: 10, crystalReward: 0,
        check: (ctx) => ctx.event === 'submission' && ctx.isFirstSolve,
    },
    {
        id: 'perfect_score',
        nameTh: 'เพอร์เฟกต์!',
        nameEn: 'Perfectionist',
        icon: '💯',
        desc: 'ผ่านทุก Test Case (100%)',
        category: 'skill',
        rarity: 'uncommon',
        xpReward: 100, coinReward: 20, crystalReward: 1,
        check: (ctx) => ctx.event === 'submission' && ctx.score === 100,
    },
    {
        id: 'no_hint_hero',
        nameTh: 'No Hint Hero',
        nameEn: 'No Hint Hero',
        icon: '🧠',
        desc: 'ผ่านโจทย์ Hard โดยไม่ใช้ Hint',
        category: 'skill',
        rarity: 'rare',
        xpReward: 200, coinReward: 30, crystalReward: 2,
        check: (ctx) => ctx.event === 'submission' && ctx.score >= 60 && ctx.hintLevel === 0 && ctx.difficulty === 'hard',
    },
    {
        id: 'speed_demon',
        nameTh: 'Speed Demon',
        nameEn: 'Speed Demon',
        icon: '⚡',
        desc: 'ผ่านโจทย์ Medium ภายใน 5 นาที',
        category: 'skill',
        rarity: 'uncommon',
        xpReward: 150, coinReward: 20, crystalReward: 0,
        check: (ctx) => ctx.event === 'submission' && ctx.score >= 60 && ctx.difficulty === 'medium' && ctx.timeSpentSeconds <= 300,
    },
    {
        id: 'comeback_kid',
        nameTh: 'Comeback Kid',
        nameEn: 'Comeback Kid',
        icon: '🦋',
        desc: 'ล้มเหลว 5+ ครั้งแล้วสุดท้ายผ่าน',
        category: 'skill',
        rarity: 'uncommon',
        xpReward: 120, coinReward: 15, crystalReward: 1,
        check: (ctx) => ctx.event === 'submission' && ctx.score >= 60 && ctx.failCountBefore >= 5,
    },
    {
        id: 'streak_3',
        nameTh: 'Hot Streak!',
        nameEn: 'Hot Streak',
        icon: '🔥',
        desc: 'Login ติดกัน 3 วัน',
        category: 'skill',
        rarity: 'common',
        xpReward: 60, coinReward: 10, crystalReward: 0,
        check: (ctx) => ctx.event === 'streak' && ctx.streakDays >= 3,
    },
    {
        id: 'streak_7',
        nameTh: 'Weekly Warrior',
        nameEn: 'Weekly Warrior',
        icon: '🏆',
        desc: 'Login ติดกัน 7 วัน',
        category: 'skill',
        rarity: 'rare',
        xpReward: 200, coinReward: 30, crystalReward: 2,
        check: (ctx) => ctx.event === 'streak' && ctx.streakDays >= 7,
    },
    {
        id: 'all_assignments',
        nameTh: 'หมดทุกข้อ!',
        nameEn: 'Assignment Master',
        icon: '📚',
        desc: 'ผ่านทุกโจทย์ในหน่วยเรียน',
        category: 'skill',
        rarity: 'epic',
        xpReward: 300, coinReward: 50, crystalReward: 5,
        check: (ctx) => ctx.event === 'submission' && ctx.unitPassRate >= 1.0 && ctx.unitTotal >= 3,
    },
    // ── Special ──
    {
        id: 'rank_up_5',
        nameTh: 'จอมเวทย์ Logic',
        nameEn: 'Logic Mage Ascension',
        icon: '🧙',
        desc: 'เลื่อนระดับถึง Rank 5',
        category: 'special',
        rarity: 'rare',
        xpReward: 0, coinReward: 20, crystalReward: 3,
        check: (ctx) => ctx.event === 'rankup' && ctx.newRank >= 5,
    },
    {
        id: 'rank_up_10',
        nameTh: 'เทพเจ้า AI',
        nameEn: 'AI Deity',
        icon: '🤖',
        desc: 'เลื่อนระดับถึง Rank 10 สูงสุด!',
        category: 'special',
        rarity: 'legendary',
        xpReward: 0, coinReward: 100, crystalReward: 20,
        check: (ctx) => ctx.event === 'rankup' && ctx.newRank >= 10,
    },
    {
        id: 'bug_exterminator',
        nameTh: 'Bug Exterminator',
        nameEn: 'Bug Exterminator',
        icon: '🐛',
        desc: 'เล่น Daily Bug Hunt 7 วันติดกัน',
        category: 'special',
        rarity: 'rare',
        xpReward: 150, coinReward: 25, crystalReward: 2,
        check: (ctx) => ctx.event === 'minigame' && ctx.gameType === 'bug_hunt' && ctx.gameStreak >= 7,
    },
    {
        id: 'quiz_master',
        nameTh: 'Quiz Master',
        nameEn: 'Quiz Master',
        icon: '⚡',
        desc: 'ทำคะแนน Perfect ใน Quiz Blitz',
        category: 'special',
        rarity: 'uncommon',
        xpReward: 80, coinReward: 15, crystalReward: 1,
        check: (ctx) => ctx.event === 'minigame' && ctx.gameType === 'quiz_blitz' && ctx.isPerfect,
    },
    {
        id: 'autopsy_expert',
        nameTh: 'Code Autopsy Expert',
        nameEn: 'Code Autopsy Expert',
        icon: '🔬',
        desc: 'ทำคะแนน Perfect ใน Code Autopsy',
        category: 'special',
        rarity: 'uncommon',
        xpReward: 80, coinReward: 15, crystalReward: 1,
        check: (ctx) => ctx.event === 'minigame' && ctx.gameType === 'code_autopsy' && ctx.isPerfect,
    },
];

const RARITY_COLOR = {
    common: '#9ca3af',
    uncommon: '#34d399',
    rare: '#60a5fa',
    epic: '#a78bfa',
    legendary: '#fbbf24',
};

// ── Core: check + award ───────────────────────────────────────────────────────
async function checkAndAwardAchievements(uid, context) {
    const awarded = [];
    try {
        // Fetch already-earned achievement IDs to avoid duplicates
        const earnedSnap = await db.collection('studentAchievements')
            .where('uid', '==', uid)
            .get();
        const earnedIds = new Set(earnedSnap.docs.map(d => d.data().achievementId));

        for (const ach of ACHIEVEMENTS) {
            if (earnedIds.has(ach.id)) continue;
            if (!ach.check(context)) continue;

            // Award
            const batch = db.batch();
            const earnRef = db.collection('studentAchievements').doc();
            batch.set(earnRef, {
                uid,
                achievementId: ach.id,
                earnedAt: firebase.firestore.FieldValue.serverTimestamp(),
                xpAwarded: ach.xpReward,
                coinAwarded: ach.coinReward,
                crystalAwarded: ach.crystalReward,
            });
            await batch.commit();

            // Award XP/currency (non-blocking, separate call)
            if (ach.xpReward > 0 || ach.coinReward > 0 || ach.crystalReward > 0) {
                awardXP(uid, ach.xpReward, ach.coinReward, ach.crystalReward,
                    'achievement', ach.id, { achievementName: ach.nameTh }).catch(() => {});
            }

            awarded.push(ach);
        }
    } catch (err) {
        console.warn('[achievementEngine] error:', err);
    }
    return awarded;
}

async function getStudentAchievements(uid) {
    try {
        const snap = await db.collection('studentAchievements')
            .where('uid', '==', uid)
            .orderBy('earnedAt', 'desc')
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_) { return []; }
}

function getAchievementById(id) {
    return ACHIEVEMENTS.find(a => a.id === id) || null;
}

// ── Expose globals ────────────────────────────────────────────────────────────
window.ACHIEVEMENTS               = ACHIEVEMENTS;
window.RARITY_COLOR               = RARITY_COLOR;
window.checkAndAwardAchievements  = checkAndAwardAchievements;
window.getStudentAchievements     = getStudentAchievements;
window.getAchievementById         = getAchievementById;

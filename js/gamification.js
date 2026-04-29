// js/gamification.js — XP / Rank / Streak / Leaderboard / Season engine
// Uses Firestore compat SDK (db, firebase globals already loaded)

// ── Rank Tiers ───────────────────────────────────────────────────────────────
const RANK_TIERS = [
    { level: 1,  name: 'ไข่โปรแกรม',       minXP: 0,      icon: '🥚', color: '#9ca3af' },
    { level: 2,  name: 'โค้ดเดอร์มือใหม่',  minXP: 200,    icon: '🐣', color: '#6ee7b7' },
    { level: 3,  name: 'นักแก้บัค',         minXP: 500,    icon: '🐛', color: '#34d399' },
    { level: 4,  name: 'ผู้เชี่ยวชาญลูป',   minXP: 1000,   icon: '🔄', color: '#60a5fa' },
    { level: 5,  name: 'จอมเวทย์ Logic',    minXP: 2000,   icon: '🧙', color: '#818cf8' },
    { level: 6,  name: 'อินทรีอัลกอริทึม', minXP: 3500,   icon: '🦅', color: '#c084fc' },
    { level: 7,  name: 'สถาปนิกโค้ด',       minXP: 5500,   icon: '🏗️', color: '#f472b6' },
    { level: 8,  name: 'ดาวสยาม',           minXP: 8500,   icon: '⭐', color: '#fbbf24' },
    { level: 9,  name: 'ราชันโปรแกรม',      minXP: 13000,  icon: '👑', color: '#f97316' },
    { level: 10, name: 'เทพเจ้า AI',        minXP: 20000,  icon: '🤖', color: '#ef4444' },
];

// ── Pure helpers ──────────────────────────────────────────────────────────────
function getRankFromXP(xp) {
    let tier = RANK_TIERS[0];
    for (const t of RANK_TIERS) {
        if (xp >= t.minXP) tier = t;
        else break;
    }
    return tier;
}

function getNextRankXP(xp) {
    for (const t of RANK_TIERS) {
        if (t.minXP > xp) return t.minXP;
    }
    return null;
}

function calculateSubmissionXP(score) {
    if (score >= 100) return { xp: 50, coin: 10, crystal: 0 };
    if (score >= 80)  return { xp: 30, coin: 5,  crystal: 0 };
    if (score >= 50)  return { xp: 15, coin: 2,  crystal: 0 };
    return                    { xp: 5,  coin: 0,  crystal: 0 };
}

function todayDateString() {
    return new Date().toISOString().slice(0, 10);
}

function getWeekString() {
    const d = new Date();
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ── Display name cache (avoids repeat user doc reads) ─────────────────────────
const _nameCache = {};
async function _getDisplayName(uid) {
    if (_nameCache[uid]) return _nameCache[uid];
    try {
        const snap = await db.collection('users').doc(uid).get();
        const name = snap.exists ? (snap.data().displayName || 'นักเรียน') : 'นักเรียน';
        _nameCache[uid] = name;
        return name;
    } catch (_) { return 'นักเรียน'; }
}

// ── Firestore helpers ─────────────────────────────────────────────────────────
async function getOrCreatePlayerStats(uid) {
    const ref = db.collection('playerStats').doc(uid);
    const snap = await ref.get();
    if (snap.exists) return { id: uid, ...snap.data() };

    const init = {
        xp: 0, rank: 1, rankName: RANK_TIERS[0].name,
        codeCoin: 0, crystal: 0,
        streakDays: 0, longestStreak: 0,
        lastLoginDate: null, lastWeekString: null,
        dailyXP: 0, weeklyXP: 0, seasonXP: 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(init);
    return { id: uid, ...init };
}

async function getPlayerStats(uid) {
    const snap = await db.collection('playerStats').doc(uid).get();
    if (!snap.exists) return await getOrCreatePlayerStats(uid);
    return { id: uid, ...snap.data() };
}

// ── Season info ───────────────────────────────────────────────────────────────
async function getSeasonInfo() {
    try {
        const snap = await db.collection('seasons')
            .where('isActive', '==', true)
            .limit(1)
            .get();
        if (snap.empty) return null;
        const d = snap.docs[0].data();
        return { id: snap.docs[0].id, ...d };
    } catch (_) { return null; }
}

// ── Award XP (non-throwing) ───────────────────────────────────────────────────
async function awardXP(uid, xpAmount, coinAmount, crystalAmount, source, relatedId, metadata) {
    const statsRef = db.collection('playerStats').doc(uid);

    // Apply season XP multiplier if active
    let effectiveXP = xpAmount;
    try {
        const season = await getSeasonInfo();
        if (season?.xpMultiplier && season.xpMultiplier > 1) {
            effectiveXP = Math.round(xpAmount * season.xpMultiplier);
        }
    } catch (_) {}

    const batch = db.batch();
    batch.set(statsRef, {
        xp: firebase.firestore.FieldValue.increment(effectiveXP),
        codeCoin: firebase.firestore.FieldValue.increment(coinAmount || 0),
        crystal: firebase.firestore.FieldValue.increment(crystalAmount || 0),
        dailyXP: firebase.firestore.FieldValue.increment(effectiveXP),
        weeklyXP: firebase.firestore.FieldValue.increment(effectiveXP),
        seasonXP: firebase.firestore.FieldValue.increment(effectiveXP),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const ledgerRef = db.collection('xpLedger').doc();
    batch.set(ledgerRef, {
        uid,
        xpAwarded: effectiveXP,
        coinAwarded: coinAmount || 0,
        crystalAwarded: crystalAmount || 0,
        source: source || 'unknown',
        relatedId: relatedId || null,
        metadata: metadata || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Check & persist rank-up
    const newStats = await statsRef.get();
    const newXP = newStats.data()?.xp || effectiveXP;
    const result = await _checkAndSaveRank(uid, newXP);

    // Non-blocking leaderboard update
    updateLeaderboard('alltime').catch(() => {});

    return result;
}

async function _checkAndSaveRank(uid, newXP) {
    const tier = getRankFromXP(newXP);
    const statsRef = db.collection('playerStats').doc(uid);
    const snap = await statsRef.get();
    const oldRank = snap.data()?.rank || 1;
    await statsRef.update({ rank: tier.level, rankName: tier.name });
    return { didRankUp: tier.level > oldRank, newTier: tier, oldRank, newXP };
}

// ── First-solve check ─────────────────────────────────────────────────────────
async function checkIsFirstSolve(uid, assignmentId) {
    const snap = await db.collection('submissions')
        .where('studentId', '==', uid)
        .where('assignmentId', '==', assignmentId)
        .where('passed', '==', true)
        .limit(1)
        .get();
    return snap.empty;
}

// ── Daily streak + period XP reset ───────────────────────────────────────────
async function handleDailyStreak(uid) {
    try {
        const stats = await getOrCreatePlayerStats(uid);
        const today = todayDateString();
        const thisWeek = getWeekString();

        if (stats.lastLoginDate === today) return; // already counted today

        const ref = db.collection('playerStats').doc(uid);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().slice(0, 10);

        const consecutive = stats.lastLoginDate === yStr;
        const newStreak = consecutive ? (stats.streakDays || 0) + 1 : 1;
        const longest = Math.max(newStreak, stats.longestStreak || 0);

        const updates = {
            lastLoginDate: today,
            streakDays: newStreak,
            longestStreak: longest,
        };

        // Reset dailyXP on new day
        updates.dailyXP = 0;

        // Reset weeklyXP on new week
        if (stats.lastWeekString !== thisWeek) {
            updates.weeklyXP = 0;
            updates.lastWeekString = thisWeek;
            updateLeaderboard('weekly').catch(() => {});
        }

        await ref.update(updates);

        // Award streak bonus
        let xp = 10, coin = 2, crystal = 0;
        if (newStreak >= 7)      { xp += 50; coin += 10; crystal += 2; }
        else if (newStreak >= 3) { xp += 20; coin += 5; }

        await awardXP(uid, xp, coin, crystal, 'streak_bonus', null, { streakDays: newStreak });

        // Update daily leaderboard after streak
        updateLeaderboard('daily').catch(() => {});

        // Check streak achievements
        if (typeof checkAndAwardAchievements === 'function') {
            checkAndAwardAchievements(uid, { event: 'streak', streakDays: newStreak }).catch(() => {});
        }
    } catch (err) {
        console.warn('[gamification] handleDailyStreak error:', err);
    }
}

// ── Leaderboard update (all-time / weekly / daily) ────────────────────────────
// courseId: filter to enrolled students in that course; writes to '{courseId}_{period}' doc
async function updateLeaderboard(period = 'alltime', courseId = null) {
    try {
        const field = period === 'daily' ? 'dailyXP' : period === 'weekly' ? 'weeklyXP' : 'xp';

        let studentUIDs;
        if (courseId) {
            const snap = await db.collection('enrollments').where('courseId', '==', courseId).get();
            studentUIDs = new Set(snap.docs.map(d => d.data().studentId));
        } else {
            const snap = await db.collection('users').where('role', '==', 'student').get();
            studentUIDs = new Set(snap.docs.map(d => d.id));
        }

        const statsSnap = await db.collection('playerStats').get();
        const raw = statsSnap.docs
            .filter(doc => studentUIDs.has(doc.id))
            .map(doc => ({ uid: doc.id, ...doc.data() }));
        raw.sort((a, b) => (b[field] || 0) - (a[field] || 0));

        const entries = await Promise.all(raw.map(async d => {
            const displayName = await _getDisplayName(d.uid);
            const tier = getRankFromXP(d.xp || 0);
            return {
                uid: d.uid,
                displayName,
                xp: d.xp || 0,
                dailyXP: d.dailyXP || 0,
                weeklyXP: d.weeklyXP || 0,
                seasonXP: d.seasonXP || 0,
                codeCoin: d.codeCoin || 0,
                streakDays: d.streakDays || 0,
                rank: tier.level,
                rankName: tier.name,
                rankIcon: tier.icon,
            };
        }));

        const docId = courseId ? `${courseId}_${period}` : period;
        await db.collection('leaderboardSnapshots').doc(docId).set({
            period, courseId: courseId || null, entries,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
        console.warn(`[gamification] updateLeaderboard(${period}) error:`, err);
    }
}

// Update all 3 periods for a course (or global if courseId omitted)
async function updateAllLeaderboards(courseId = null) {
    await Promise.all([
        updateLeaderboard('alltime', courseId),
        updateLeaderboard('weekly', courseId),
        updateLeaderboard('daily', courseId),
    ]);
}

// ── Expose globals ────────────────────────────────────────────────────────────
window.RANK_TIERS              = RANK_TIERS;
window.getRankFromXP           = getRankFromXP;
window.getNextRankXP           = getNextRankXP;
window.calculateSubmissionXP   = calculateSubmissionXP;
window.getPlayerStats          = getPlayerStats;
window.getOrCreatePlayerStats  = getOrCreatePlayerStats;
window.awardXP                 = awardXP;
window.checkIsFirstSolve       = checkIsFirstSolve;
window.handleDailyStreak       = handleDailyStreak;
window.updateLeaderboard       = updateLeaderboard;
window.updateAllLeaderboards   = updateAllLeaderboards;
window.getSeasonInfo           = getSeasonInfo;

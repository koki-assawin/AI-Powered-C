#!/usr/bin/env node
/**
 * tools/xp-backfill-selfpractice.js
 * ย้อนหลังให้ XP กับการฝึกเองที่นักเรียนทำไปแล้ว
 *
 * ที่มา: หน้า "ฝึกเอง" (js/pages/student/SelfPractice.js) ไม่เคยเรียก awardXP เลย
 *        คะแนนฝึกเองจึงเก็บแยกใน selfPracticeSubmissions และไม่เคยกลายเป็น XP
 *        โค้ดรุ่นใหม่ให้ XP ตอนส่งแล้ว สคริปต์นี้ใช้เติมย้อนหลังของเดิมเท่านั้น
 *
 * สูตร (ตรงกับ PRACTICE_XP ในหน้าเว็บ): ง่าย 10 / ปานกลาง 15 / ยาก 25 XP
 *        คูณสัดส่วน test case ที่ผ่าน และจำกัดไม่เกิน 200 XP ต่อคนต่อวัน
 *
 * ทำงานซ้ำได้ปลอดภัย — ข้อที่เคยให้ XP ไปแล้วจะถูกข้าม (ดูจาก relatedId ใน xpLedger)
 *
 * วิธีใช้:
 *   node tools/xp-backfill-selfpractice.js                 # ทดลองทั้งห้อง ไม่เขียนข้อมูล
 *   node tools/xp-backfill-selfpractice.js --uid <uid>     # ทดลองเฉพาะคนเดียว
 *   node tools/xp-backfill-selfpractice.js --apply         # เขียนจริง
 */

const path = require('path');
const fs   = require('fs');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
    console.error('\n❌ ไม่พบ serviceAccountKey.json ที่โฟลเดอร์หลักของโปรเจกต์\n');
    process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db = admin.firestore();

const args = process.argv.slice(2);
const argOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
let onlyUid = argOf('--uid');
const numberArg = argOf('--number');
const nameArg = argOf('--name');
const APPLY = args.includes('--apply');
const DAILY_CAP = parseInt(argOf('--daily-cap') || '200', 10);

const PRACTICE_XP = { 'ง่าย': { xp: 10, coin: 2 }, 'ปานกลาง': { xp: 15, coin: 3 }, 'ยาก': { xp: 25, coin: 5 } };
const RANK_TIERS = [
    { level: 1, name: 'ไข่โปรแกรม', minXP: 0 }, { level: 2, name: 'โค้ดเดอร์มือใหม่', minXP: 200 },
    { level: 3, name: 'นักแก้บัค', minXP: 500 }, { level: 4, name: 'ผู้เชี่ยวชาญลูป', minXP: 1000 },
    { level: 5, name: 'จอมเวทย์ Logic', minXP: 2000 }, { level: 6, name: 'อินทรีอัลกอริทึม', minXP: 3500 },
    { level: 7, name: 'สถาปนิกโค้ด', minXP: 5500 }, { level: 8, name: 'ดาวสยาม', minXP: 8500 },
    { level: 9, name: 'ราชันโปรแกรม', minXP: 13000 }, { level: 10, name: 'เทพเจ้า AI', minXP: 20000 },
];
const rankFromXP = (xp) => RANK_TIERS.reduce((t, c) => (xp >= c.minXP ? c : t), RANK_TIERS[0]);
const ts = (v) => (v && v.toDate ? v.toDate() : null);


// ── ค้นหานักเรียนจาก --uid / --number / --name ────────────────────────────────
async function resolveUid(db, { uid, number, name }) {
    if (uid) return uid;
    if (number) {
        const snap = await db.collection('users').where('number', '==', String(number)).limit(2).get();
        if (snap.empty) throw new Error(`ไม่พบนักเรียนเลขประจำตัว ${number}`);
        if (snap.size > 1) throw new Error(`เลขประจำตัว ${number} ซ้ำกันหลายคน ให้ระบุ --uid แทน`);
        return snap.docs[0].id;
    }
    if (name) {
        const snap = await db.collection('users').get();
        const hits = snap.docs.filter(d => String(d.data().displayName || '').includes(name));
        if (hits.length === 0) throw new Error(`ไม่พบนักเรียนที่ชื่อมีคำว่า "${name}"`);
        if (hits.length > 1) {
            console.log('พบหลายคน ให้ระบุ --uid:');
            hits.forEach(h => console.log('  ', h.id, h.data().displayName, '| เลขที่', h.data().number));
            throw new Error('ชื่อไม่เฉพาะเจาะจงพอ');
        }
        return hits[0].id;
    }
    return null;
}

(async () => {
    onlyUid = await resolveUid(db, { uid: onlyUid, number: numberArg, name: nameArg });
    // ── โหลดการฝึกเองทั้งหมด ────────────────────────────────────────────────
    let q = db.collection('selfPracticeSubmissions');
    if (onlyUid) q = q.where('studentId', '==', onlyUid);
    const spSnap = await q.get();
    if (spSnap.empty) { console.log('ไม่พบข้อมูลการฝึกเอง'); process.exit(0); }

    // ── หา relatedId ที่เคยให้ XP ไปแล้ว ────────────────────────────────────
    const ledSnap = await db.collection('xpLedger').where('source', '==', 'self_practice').get();
    const credited = new Set(ledSnap.docs.map(d => d.data().relatedId).filter(Boolean));

    // ── จัดกลุ่มตามนักเรียน แล้วเรียงตามเวลา ────────────────────────────────
    const byStudent = {};
    spSnap.docs.forEach(d => {
        const v = { id: d.id, ...d.data(), _at: ts(d.data().submittedAt) };
        (byStudent[v.studentId] = byStudent[v.studentId] || []).push(v);
    });

    let grandXP = 0, grandRows = 0;
    const plan = [];

    for (const [uid, list] of Object.entries(byStudent)) {
        list.sort((a, b) => (a._at?.getTime() || 0) - (b._at?.getTime() || 0));
        const perDay = {};
        let xpSum = 0, coinSum = 0, rows = 0;
        const entries = [];

        for (const sp of list) {
            if (credited.has(sp.id)) continue;                       // เคยให้ไปแล้ว
            if (!(sp.passedTests > 0) || !(sp.totalTests > 0)) continue;
            const cfg = PRACTICE_XP[sp.difficulty] || PRACTICE_XP['ง่าย'];
            const ratio = sp.passedTests / sp.totalTests;
            let xp = Math.round(cfg.xp * ratio);
            let coin = Math.round(cfg.coin * ratio);
            if (xp <= 0) continue;

            const day = sp._at ? sp._at.toISOString().slice(0, 10) : 'unknown';
            const used = perDay[day] || 0;
            const remaining = Math.max(0, DAILY_CAP - used);
            if (remaining <= 0) continue;                             // ถึงเพดานของวันนั้นแล้ว
            if (xp > remaining) { coin = Math.round(coin * (remaining / xp)); xp = remaining; }
            perDay[day] = used + xp;

            entries.push({ sp, xp, coin });
            xpSum += xp; coinSum += coin; rows++;
        }
        if (rows === 0) continue;

        const name = list[0].displayName || '(ไม่ทราบชื่อ)';
        const statsSnap = await db.collection('playerStats').doc(uid).get();
        const before = statsSnap.exists ? (statsSnap.data().xp || 0) : 0;
        plan.push({ uid, name, entries, xpSum, coinSum, rows, before, after: before + xpSum });
        grandXP += xpSum; grandRows += rows;
    }

    plan.sort((a, b) => b.xpSum - a.xpSum);

    console.log('\n==================================================');
    console.log('โหมด:', APPLY ? '⚠️  เขียนจริง (--apply)' : 'ทดลอง (ยังไม่เขียนข้อมูล)');
    console.log('เพดานต่อคนต่อวัน:', DAILY_CAP, 'XP');
    console.log('การฝึกเองทั้งหมด:', spSnap.size, 'รายการ | เคยได้ XP แล้ว', credited.size, 'รายการ');
    console.log('--------------------------------------------------');
    plan.forEach(p => {
        const tier = rankFromXP(p.after);
        console.log(`  ${p.name.padEnd(28)} +${String(p.xpSum).padStart(5)} XP  (${p.rows} ข้อ)  ${p.before} → ${p.after}  [${tier.name}]`);
    });
    console.log('--------------------------------------------------');
    console.log('รวม:', grandRows, 'รายการ |', grandXP, 'XP |', plan.length, 'คน');

    if (!APPLY) {
        console.log('\nนี่คือผลจำลอง ถ้าถูกต้องแล้วให้รันซ้ำพร้อม --apply');
        console.log('==================================================\n');
        process.exit(0);
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    for (const p of plan) {
        for (let i = 0; i < p.entries.length; i += 400) {
            const batch = db.batch();
            p.entries.slice(i, i + 400).forEach(({ sp, xp, coin }) => {
                batch.set(db.collection('xpLedger').doc(), {
                    uid: p.uid, xpAwarded: xp, coinAwarded: coin, crystalAwarded: 0,
                    source: 'self_practice', relatedId: sp.id,
                    metadata: { difficulty: sp.difficulty, topic: sp.topic || null, backfill: true },
                    createdAt: sp.submittedAt || now,
                });
            });
            await batch.commit();
        }
        const tier = rankFromXP(p.after);
        await db.collection('playerStats').doc(p.uid).set({
            xp: admin.firestore.FieldValue.increment(p.xpSum),
            codeCoin: admin.firestore.FieldValue.increment(p.coinSum),
            seasonXP: admin.firestore.FieldValue.increment(p.xpSum),
            rank: tier.level, rankName: tier.name, updatedAt: now,
        }, { merge: true });
        console.log(`  ✅ ${p.name}  +${p.xpSum} XP`);
    }

    await db.collection('xpCorrections').add({
        type: 'backfill_self_practice',
        reason: 'หน้าฝึกเองรุ่นก่อนไม่ได้ให้ XP จึงเติมย้อนหลังตามสูตรเดียวกับรุ่นปัจจุบัน',
        students: plan.length, entries: grandRows, xpTotal: grandXP, dailyCap: DAILY_CAP,
        correctedAt: now,
    });
    console.log('\n✅ เติม XP ย้อนหลังเรียบร้อย บันทึกไว้ใน xpCorrections');
    console.log('==================================================\n');
    process.exit(0);
})().catch(err => { console.error('❌', err.message); process.exit(1); });

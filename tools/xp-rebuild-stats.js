#!/usr/bin/env node
/**
 * tools/xp-rebuild-stats.js
 * คำนวณ playerStats ใหม่จาก xpLedger ซึ่งเป็นบันทึกต้นทางที่เชื่อถือได้
 *
 * ใช้เมื่อยอด XP ในโปรไฟล์ไม่ตรงกับรายการใน xpLedger เช่นกรณีที่เอกสาร playerStats
 * ถูกเขียนทับด้วยค่าเริ่มต้น (ดูหมายเหตุใน getOrCreatePlayerStats ของ js/gamification.js)
 *
 * - รายการที่ถูกทำเครื่องหมาย voided จะไม่ถูกนับ (มาจาก tools/xp-fix-farmed.js)
 * - สำรอง playerStats เดิมเป็นไฟล์ JSON ก่อนเขียนทุกครั้ง
 * - ไม่แตะ field อื่นที่ไม่เกี่ยวกับคะแนน เช่น ownedItems, equippedFrame, teamId
 *
 * วิธีใช้:
 *   node tools/xp-rebuild-stats.js                  # ตรวจทั้งห้อง ไม่เขียนข้อมูล
 *   node tools/xp-rebuild-stats.js --uid <uid>      # เฉพาะคนเดียว
 *   node tools/xp-rebuild-stats.js --apply          # เขียนจริง
 *   node tools/xp-rebuild-stats.js --only-mismatch  # แสดงเฉพาะคนที่ยอดไม่ตรง
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
const ONLY_MISMATCH = args.includes('--only-mismatch');

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
    let ledgerQuery = db.collection('xpLedger');
    if (onlyUid) ledgerQuery = ledgerQuery.where('uid', '==', onlyUid);
    const ledSnap = await ledgerQuery.get();

    const totals = {};
    ledSnap.docs.forEach(d => {
        const v = d.data();
        if (v.voided === true || !v.uid) return;
        const t = totals[v.uid] = totals[v.uid] || { xp: 0, coin: 0, crystal: 0, n: 0, daily: 0, weekly: 0 };
        const at = ts(v.createdAt);
        const xp = v.xpAwarded || 0;
        t.xp += xp; t.coin += v.coinAwarded || 0; t.crystal += v.crystalAwarded || 0; t.n++;
        if (at) {
            const today = new Date().toISOString().slice(0, 10);
            if (at.toISOString().slice(0, 10) === today) t.daily += xp;
            if (at >= new Date(Date.now() - 7 * 86400000)) t.weekly += xp;
        }
    });

    const uids = onlyUid ? [onlyUid] : Object.keys(totals);
    if (uids.length === 0) { console.log('ไม่พบข้อมูลใน xpLedger'); process.exit(0); }

    const backupDir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = {};
    const rows = [];

    for (const uid of uids) {
        const t = totals[uid] || { xp: 0, coin: 0, crystal: 0, n: 0, daily: 0, weekly: 0 };
        const [statsSnap, userSnap] = await Promise.all([
            db.collection('playerStats').doc(uid).get(),
            db.collection('users').doc(uid).get(),
        ]);
        const cur = statsSnap.exists ? statsSnap.data() : {};
        backup[uid] = cur;
        const name = userSnap.exists ? (userSnap.data().displayName || uid) : uid;
        const diff = t.xp - (cur.xp || 0);
        rows.push({ uid, name, cur, t, diff, tier: rankFromXP(t.xp) });
    }

    const shown = ONLY_MISMATCH ? rows.filter(r => r.diff !== 0) : rows;
    shown.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    const backupFile = path.join(backupDir, `playerStats_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8');

    console.log('\n==================================================');
    console.log('โหมด:', APPLY ? '⚠️  เขียนจริง (--apply)' : 'ทดลอง (ยังไม่เขียนข้อมูล)');
    console.log('สำรอง playerStats เดิมไว้ที่:', backupFile);
    console.log('--------------------------------------------------');
    console.log('ชื่อ'.padEnd(26), 'XP ปัจจุบัน'.padStart(12), 'XP ตาม ledger'.padStart(14), 'ผลต่าง'.padStart(10), '  ระดับใหม่');
    shown.forEach(r => {
        console.log(
            String(r.name).slice(0, 25).padEnd(26),
            String(r.cur.xp ?? 0).padStart(12),
            String(r.t.xp).padStart(14),
            String(r.diff > 0 ? '+' + r.diff : r.diff).padStart(10),
            '  ' + r.tier.name + (r.diff !== 0 ? '   ⚠️' : '')
        );
    });
    const mismatched = rows.filter(r => r.diff !== 0);
    console.log('--------------------------------------------------');
    console.log('ตรวจ', rows.length, 'คน | ยอดไม่ตรง', mismatched.length, 'คน');

    if (!APPLY) {
        console.log('\nนี่คือผลจำลอง ถ้าถูกต้องแล้วให้รันซ้ำพร้อม --apply');
        console.log('==================================================\n');
        process.exit(0);
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    for (const r of mismatched) {
        await db.collection('playerStats').doc(r.uid).set({
            xp: r.t.xp, codeCoin: r.t.coin, crystal: r.t.crystal,
            dailyXP: r.t.daily, weeklyXP: r.t.weekly, seasonXP: r.t.xp,
            rank: r.tier.level, rankName: r.tier.name, updatedAt: now,
        }, { merge: true });
        console.log(`  ✅ ${r.name}  ${r.cur.xp ?? 0} → ${r.t.xp} XP  [${r.tier.name}]`);
    }

    await db.collection('xpCorrections').add({
        type: 'rebuild_from_ledger',
        reason: 'playerStats ไม่ตรงกับ xpLedger จึงคำนวณใหม่จากบันทึกต้นทาง',
        students: mismatched.length, backupFile: path.basename(backupFile), correctedAt: now,
    });
    console.log('\n✅ คำนวณใหม่เรียบร้อย บันทึกไว้ใน xpCorrections');
    console.log('==================================================\n');
    process.exit(0);
})().catch(err => { console.error('❌', err.message); process.exit(1); });

#!/usr/bin/env node
/**
 * tools/xp-fix-farmed.js — ตัด XP ส่วนเกินที่ได้มาจากการกดรัว โดยไม่ลบประวัติทิ้ง
 *
 * หลักการ:
 *   - ในแต่ละนาที เก็บรายการแรก ๆ ไว้ตามจำนวนที่กำหนด (ค่าเริ่มต้น 3 รายการ)
 *     ส่วนที่เกินจะถูกทำเครื่องหมาย voided แทนการลบ เพื่อให้ตรวจสอบย้อนหลังได้
 *   - คำนวณ playerStats (XP / CodeCoin / Crystal / Rank) ใหม่จากรายการที่ยังนับอยู่
 *   - บันทึกสรุปการแก้ไขไว้ใน collection xpCorrections
 *   - สำรองข้อมูล xpLedger ทั้งหมดของนักเรียนคนนั้นเป็นไฟล์ JSON ก่อนเสมอ
 *
 * วิธีใช้ (ค่าเริ่มต้นเป็นโหมดทดลอง ไม่เขียนข้อมูล):
 *   node tools/xp-fix-farmed.js --uid <uid>
 *   node tools/xp-fix-farmed.js --uid <uid> --max-per-minute 3 --sources submission_accepted,task_done
 *   node tools/xp-fix-farmed.js --uid <uid> --apply --reason "นักเรียนแจ้งว่ากดส่งซ้ำเพื่อสะสม XP"
 *
 * ต้องวาง serviceAccountKey.json ไว้ที่โฟลเดอร์หลักของโปรเจกต์
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

// ── argument ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
let uid = argOf('--uid');
const numberArg = argOf('--number');
const nameArg = argOf('--name');
const maxPerMinute = parseInt(argOf('--max-per-minute') || '3', 10);
const sources = (argOf('--sources') || '').split(',').map(s => s.trim()).filter(Boolean);
const reason = argOf('--reason') || 'ตัด XP ส่วนเกินจากการกดรัวในนาทีเดียวกัน';
// --daily-cap N : ตัดตามเพดาน XP ต่อวันของ source นั้น (ใช้แทนเกณฑ์รายนาที)
//                 เช่น มินิเกมมีเพดาน 150 XP/วัน ตาม DAILY_GAME_XP_CAP ใน js/miniGameGenerator.js
const dailyCap = argOf('--daily-cap') ? parseInt(argOf('--daily-cap'), 10) : null;
const APPLY = args.includes('--apply');

if (!uid && !numberArg && !nameArg) {
    console.error('ระบุนักเรียนด้วย --uid, --number หรือ --name');
    process.exit(1);
}

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


// ตารางระดับ ต้องตรงกับ RANK_TIERS ใน js/gamification.js
const RANK_TIERS = [
    { level: 1,  name: 'ไข่โปรแกรม',        minXP: 0 },
    { level: 2,  name: 'โค้ดเดอร์มือใหม่',   minXP: 200 },
    { level: 3,  name: 'นักแก้บัค',          minXP: 500 },
    { level: 4,  name: 'ผู้เชี่ยวชาญลูป',    minXP: 1000 },
    { level: 5,  name: 'จอมเวทย์ Logic',     minXP: 2000 },
    { level: 6,  name: 'อินทรีอัลกอริทึม',  minXP: 3500 },
    { level: 7,  name: 'สถาปนิกโค้ด',        minXP: 5500 },
    { level: 8,  name: 'ดาวสยาม',            minXP: 8500 },
    { level: 9,  name: 'ราชันโปรแกรม',       minXP: 13000 },
    { level: 10, name: 'เทพเจ้า AI',         minXP: 20000 },
];
const rankFromXP = (xp) => RANK_TIERS.reduce((t, c) => (xp >= c.minXP ? c : t), RANK_TIERS[0]);

const ts = (v) => (v && v.toDate ? v.toDate() : null);
const minuteKey = (d) => d.toISOString().slice(0, 16);
const todayStr = () => new Date().toISOString().slice(0, 10);
const weekStr = () => {
    const d = new Date(), start = new Date(d.getFullYear(), 0, 1);
    const w = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(w).padStart(2, '0')}`;
};

(async () => {
    uid = await resolveUid(db, { uid, number: numberArg, name: nameArg });
    const userSnap = await db.collection('users').doc(uid).get();
    const name = userSnap.exists ? userSnap.data().displayName : '(ไม่ทราบชื่อ)';

    const ledSnap = await db.collection('xpLedger').where('uid', '==', uid).get();
    const rows = ledSnap.docs
        .map(d => ({ id: d.id, ...d.data(), _at: ts(d.data().createdAt) }))
        .sort((a, b) => (a._at?.getTime() || 0) - (b._at?.getTime() || 0));

    if (rows.length === 0) { console.log('ไม่พบข้อมูลใน xpLedger ของนักเรียนคนนี้'); process.exit(0); }

    // สำรองข้อมูลก่อนเสมอ แม้ในโหมดทดลอง
    const backupDir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir,
        `xpLedger_${uid}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(rows, null, 2), 'utf8');

    // ── เลือกเฉพาะรายการที่จะตัดออก ──────────────────────────────────────────
    const byMinute = {};
    rows.forEach(r => {
        if (r.voided === true || !r._at) return;
        if (sources.length && !sources.includes(r.source)) return;
        const k = minuteKey(r._at);
        (byMinute[k] = byMinute[k] || []).push(r);
    });

    const toVoid = [];
    if (dailyCap !== null) {
        // โหมดเพดานรายวัน: ไล่ตามเวลา เก็บไว้จนครบเพดานของวันนั้น ที่เหลือตัดออก
        const pool = rows
            .filter(r => r.voided !== true && r._at)
            .filter(r => !sources.length || sources.includes(r.source))
            .sort((a, b) => a._at - b._at);
        const usedByDay = {};
        pool.forEach(r => {
            const day = r._at.toISOString().slice(0, 10);
            const used = usedByDay[day] || 0;
            const xp = r.xpAwarded || 0;
            if (used + xp <= dailyCap) usedByDay[day] = used + xp;
            else toVoid.push(r);
        });
    } else {
        Object.values(byMinute).forEach(list => {
            list.sort((a, b) => a._at - b._at);
            toVoid.push(...list.slice(maxPerMinute));
        });
    }

    const voidIds = new Set(toVoid.map(r => r.id));
    const keep = rows.filter(r => r.voided !== true && !voidIds.has(r.id));

    const sum = (arr, f) => arr.reduce((s, r) => s + (r[f] || 0), 0);
    const newXP      = sum(keep, 'xpAwarded');
    const newCoin    = sum(keep, 'coinAwarded');
    const newCrystal = sum(keep, 'crystalAwarded');
    const today = todayStr(), week = weekStr();
    const newDaily  = sum(keep.filter(r => r._at && r._at.toISOString().slice(0, 10) === today), 'xpAwarded');
    const newWeekly = sum(keep.filter(r => r._at && r._at >= new Date(Date.now() - 7 * 86400000)), 'xpAwarded');
    const tier = rankFromXP(newXP);

    const statsSnap = await db.collection('playerStats').doc(uid).get();
    const before = statsSnap.exists ? statsSnap.data() : {};

    console.log('\n==================================================');
    console.log('นักเรียน:', name, '| uid', uid);
    console.log('โหมด    :', APPLY ? '⚠️  แก้ไขจริง (--apply)' : 'ทดลอง (ยังไม่เขียนข้อมูล)');
    console.log('เกณฑ์   :', dailyCap !== null
                    ? `เก็บไม่เกิน ${dailyCap} XP ต่อวัน`
                    : `เก็บไม่เกิน ${maxPerMinute} รายการต่อนาที`,
                sources.length ? `| เฉพาะ source: ${sources.join(', ')}` : '| ทุก source');
    console.log('สำรองไว้ที่:', backupFile);
    console.log('--------------------------------------------------');
    console.log('รายการทั้งหมด        :', rows.length);
    console.log('รายการที่จะตัดออก    :', toVoid.length);
    console.log('รายการที่ยังนับอยู่  :', keep.length);
    console.log('XP      :', before.xp, '→', newXP);
    console.log('CodeCoin:', before.codeCoin, '→', newCoin);
    console.log('Crystal :', before.crystal, '→', newCrystal);
    console.log('Rank    :', before.rank, before.rankName, '→', tier.level, tier.name);

    const bySource = {};
    toVoid.forEach(r => {
        const s = r.source || 'unknown';
        bySource[s] = (bySource[s] || 0) + (r.xpAwarded || 0);
    });
    console.log('\nXP ที่ตัดออก แยกตาม source:');
    Object.entries(bySource).sort((a, b) => b[1] - a[1])
        .forEach(([s, xp]) => console.log(`   ${s.padEnd(22)} ${String(xp).padStart(8)} XP`));

    if (!APPLY) {
        console.log('\nนี่คือผลจำลอง ยังไม่มีการเขียนข้อมูล');
        console.log('ถ้าตัวเลขถูกต้องแล้ว ให้รันซ้ำพร้อม --apply');
        console.log('==================================================\n');
        process.exit(0);
    }

    // ── เขียนจริง ────────────────────────────────────────────────────────────
    const now = admin.firestore.FieldValue.serverTimestamp();
    for (let i = 0; i < toVoid.length; i += 400) {
        const batch = db.batch();
        toVoid.slice(i, i + 400).forEach(r => {
            batch.update(db.collection('xpLedger').doc(r.id), {
                voided: true, voidedAt: now, voidedReason: reason, voidedBy: 'tools/xp-fix-farmed.js',
            });
        });
        await batch.commit();
        console.log('  ทำเครื่องหมายแล้ว', Math.min(i + 400, toVoid.length), '/', toVoid.length);
    }

    await db.collection('playerStats').doc(uid).set({
        xp: newXP, codeCoin: newCoin, crystal: newCrystal,
        dailyXP: newDaily, weeklyXP: newWeekly, seasonXP: newXP,
        rank: tier.level, rankName: tier.name,
        updatedAt: now,
    }, { merge: true });

    await db.collection('xpCorrections').add({
        uid, displayName: name, reason, maxPerMinute: dailyCap !== null ? null : maxPerMinute, dailyCap,
        sources: sources.length ? sources : null,
        voidedCount: toVoid.length,
        xpBefore: before.xp ?? null, xpAfter: newXP,
        coinBefore: before.codeCoin ?? null, coinAfter: newCoin,
        backupFile: path.basename(backupFile),
        correctedAt: now,
    });

    console.log('\n✅ แก้ไขเรียบร้อย — ประวัติเดิมยังอยู่ครบ แต่ถูกทำเครื่องหมายว่ายกเลิกแล้ว');
    console.log('   บันทึกการแก้ไขอยู่ใน collection xpCorrections');
    console.log('==================================================\n');
    process.exit(0);
})().catch(err => { console.error('❌', err.message); process.exit(1); });

#!/usr/bin/env node
/**
 * tools/xp-audit.js — ตรวจสอบ XP ของนักเรียน 1 คนจาก xpLedger (อ่านอย่างเดียว)
 *
 * วิธีใช้:
 *   node tools/xp-audit.js --email 12175@triamudomsouth.ac.th
 *   node tools/xp-audit.js --uid <firebase-uid>
 *   node tools/xp-audit.js --name "นิติธร"
 *   เพิ่ม --max-per-minute 3 เพื่อดูว่าถ้าจำกัดนาทีละ 3 ครั้ง จะเหลือ XP เท่าไร
 *
 * ต้องวาง serviceAccountKey.json ไว้ที่โฟลเดอร์หลักของโปรเจกต์ก่อน
 * (Firebase Console → Project Settings → Service Accounts → Generate new private key)
 *
 * สคริปต์นี้ไม่เขียนข้อมูลใด ๆ ทั้งสิ้น
 */

const path = require('path');
const fs   = require('fs');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
    console.error('\n❌ ไม่พบ serviceAccountKey.json ที่โฟลเดอร์หลักของโปรเจกต์');
    console.error('   Firebase Console → Project Settings → Service Accounts → Generate new private key\n');
    process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db = admin.firestore();

// ── อ่าน argument ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argOf = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
};
const uidArg   = argOf('--uid');
const emailArg = argOf('--email');
const nameArg  = argOf('--name');
const maxPerMinute = parseInt(argOf('--max-per-minute') || '3', 10);

if (!uidArg && !emailArg && !nameArg) {
    console.error('ระบุนักเรียนด้วย --uid, --email หรือ --name');
    process.exit(1);
}

const ts = (v) => (v && v.toDate ? v.toDate() : null);
const minuteKey = (d) => d.toISOString().slice(0, 16);   // YYYY-MM-DDTHH:MM
const fmt = (d) => d.toLocaleString('th-TH', { hour12: false });

async function findUser() {
    if (uidArg) {
        const snap = await db.collection('users').doc(uidArg).get();
        return { uid: uidArg, data: snap.exists ? snap.data() : null };
    }
    const field = emailArg ? 'email' : 'displayName';
    const value = emailArg || nameArg;
    const snap = await db.collection('users').get();
    const hits = snap.docs.filter(d => String(d.data()[field] || '').includes(value));
    if (hits.length === 0) throw new Error(`ไม่พบนักเรียนที่ ${field} มีคำว่า "${value}"`);
    if (hits.length > 1) {
        console.log('พบหลายคน เลือกให้ชัดเจนด้วย --uid:');
        hits.forEach(h => console.log('  ', h.id, h.data().displayName, h.data().email));
        process.exit(1);
    }
    return { uid: hits[0].id, data: hits[0].data() };
}

(async () => {
    const user = await findUser();
    console.log('\n==================================================');
    console.log('นักเรียน :', user.data?.displayName || '(ไม่ทราบชื่อ)', '| เลขที่', user.data?.number ?? '-');
    console.log('uid      :', user.uid);

    const statsSnap = await db.collection('playerStats').doc(user.uid).get();
    const stats = statsSnap.exists ? statsSnap.data() : {};
    console.log('playerStats: XP', stats.xp, '| CodeCoin', stats.codeCoin, '| Crystal', stats.crystal,
                '| Rank', stats.rank, stats.rankName || '');

    const ledSnap = await db.collection('xpLedger').where('uid', '==', user.uid).get();
    const rows = ledSnap.docs
        .map(d => ({ id: d.id, ...d.data(), _at: ts(d.data().createdAt) }))
        .sort((a, b) => (a._at?.getTime() || 0) - (b._at?.getTime() || 0));

    const live = rows.filter(r => r.voided !== true);
    const sumXP = live.reduce((s, r) => s + (r.xpAwarded || 0), 0);
    console.log('xpLedger : ', rows.length, 'รายการ (ยกเลิกแล้ว', rows.length - live.length, ')',
                '| ผลรวม XP ที่ยังนับอยู่', sumXP);
    if (stats.xp !== undefined && stats.xp !== sumXP) {
        console.log('⚠️  playerStats.xp (', stats.xp, ') ไม่ตรงกับผลรวมใน ledger (', sumXP, ')');
    }

    // ── แยกตามแหล่งที่มา ──────────────────────────────────────────────────────
    console.log('\n--- XP แยกตามแหล่งที่มา (source) ---');
    const bySource = {};
    live.forEach(r => {
        const s = r.source || 'unknown';
        if (!bySource[s]) bySource[s] = { n: 0, xp: 0 };
        bySource[s].n++;
        bySource[s].xp += r.xpAwarded || 0;
    });
    Object.entries(bySource)
        .sort((a, b) => b[1].xp - a[1].xp)
        .forEach(([s, v]) => console.log(`  ${s.padEnd(22)} ${String(v.n).padStart(6)} ครั้ง   ${String(v.xp).padStart(8)} XP`));

    // ── รวมตามนาที ───────────────────────────────────────────────────────────
    const byMinute = {};
    live.forEach(r => {
        if (!r._at) return;
        const k = minuteKey(r._at);
        if (!byMinute[k]) byMinute[k] = [];
        byMinute[k].push(r);
    });
    const minutes = Object.entries(byMinute).sort((a, b) => b[1].length - a[1].length);

    console.log('\n--- นาทีที่ได้ XP ถี่ที่สุด 15 อันดับแรก ---');
    minutes.slice(0, 15).forEach(([k, list]) => {
        const xp = list.reduce((s, r) => s + (r.xpAwarded || 0), 0);
        const src = [...new Set(list.map(r => r.source))].join(', ');
        console.log(`  ${fmt(new Date(k + ':00Z'))}  ${String(list.length).padStart(4)} ครั้ง  ${String(xp).padStart(7)} XP  [${src}]`);
    });

    const burst = minutes.filter(([, l]) => l.length > maxPerMinute);
    const excessRows = burst.reduce((s, [, l]) => s + (l.length - maxPerMinute), 0);
    const excessXP = burst.reduce((s, [, l]) => {
        const sorted = [...l].sort((a, b) => (a._at - b._at));
        return s + sorted.slice(maxPerMinute).reduce((x, r) => x + (r.xpAwarded || 0), 0);
    }, 0);

    console.log('\n--- ถ้าจำกัดไม่เกิน', maxPerMinute, 'ครั้งต่อนาที ---');
    console.log('  นาทีที่เกินเกณฑ์ :', burst.length, 'นาที');
    console.log('  รายการส่วนเกิน  :', excessRows, 'รายการ');
    console.log('  XP ส่วนเกิน      :', excessXP);
    console.log('  XP ที่จะเหลือ    :', sumXP - excessXP);
    console.log('\nยังไม่มีการแก้ไขข้อมูลใด ๆ — ใช้ tools/xp-fix-farmed.js เมื่อต้องการแก้จริง');
    console.log('==================================================\n');
    process.exit(0);
})().catch(err => { console.error('❌', err.message); process.exit(1); });

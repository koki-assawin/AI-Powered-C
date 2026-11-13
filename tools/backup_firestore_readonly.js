#!/usr/bin/env node
/**
 * tools/backup_firestore_readonly.js — สำรองข้อมูลและนับจำนวนเอกสาร Firestore (อ่านอย่างเดียว)
 *
 * APCC v6.0 Studio — Phase 0
 * สคริปต์นี้ไม่เขียน ไม่แก้ และไม่ลบข้อมูลใดๆ ใน Firestore เรียกได้เฉพาะ
 * listCollections(), count() และ get()
 *
 * วิธีใช้
 *   node tools/backup_firestore_readonly.js --counts
 *       นับเอกสารทุกคอลเลกชันระดับบนสุด และ subcollection ที่รู้จัก ใช้ aggregation count()
 *       (คิดค่าอ่าน 1 ครั้งต่อ 1,000 เอกสาร) แล้วเขียน docs/studio/baseline_counts.json
 *
 *   node tools/backup_firestore_readonly.js --counts --out <file.json>
 *       นับแบบเดียวกัน แต่เขียนไปที่ไฟล์อื่น ใช้เทียบหลังพัฒนา (ข้อ 7.3)
 *
 *   node tools/backup_firestore_readonly.js --full
 *       ดึงเอกสารทุกตัวเก็บเป็น JSON ที่ backups/firestore-<วันเวลา>/<collection>.json
 *       (backups/ อยู่ใน .gitignore เพราะมีข้อมูลส่วนบุคคลของนักเรียน)
 *       คิดค่าอ่านเท่าจำนวนเอกสารทั้งหมด ควรเช็กยอดรวมจาก --counts ก่อน
 *
 *   ทางเลือกที่ครบกว่า (รวม index/metadata และกู้คืนได้ด้วย gcloud import):
 *     gcloud firestore export gs://<bucket>/apcc-pre-v6 --project ai-powered-coding-596ed
 *
 * ใช้กับ emulator: ตั้ง FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 ก่อนรัน
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));

const args = process.argv.slice(2);
const MODE_FULL = args.includes('--full');
const MODE_COUNTS = args.includes('--counts') || !MODE_FULL;
const outIdx = args.indexOf('--out');
const OUT_COUNTS = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.join(ROOT, 'docs', 'studio', 'baseline_counts.json');

if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({ projectId: 'ai-powered-coding-596ed' });
} else {
    const keyPath = path.join(ROOT, 'serviceAccountKey.json');
    if (!fs.existsSync(keyPath)) { console.error('❌ ไม่พบ serviceAccountKey.json'); process.exit(1); }
    admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
}
const db = admin.firestore();

// subcollection ที่โค้ดใช้งาน (นับรวมทุก parent ด้วย collectionGroup)
const KNOWN_SUBCOLLECTIONS = ['responses', 'tasks', 'feedback', 'versions'];
// คอลเลกชันที่มี subcollection — โหมด --full จะไล่ listCollections() เฉพาะเอกสารในนี้
// (ไม่ไล่ทุกเอกสาร เพราะจะเรียก API หลายหมื่นครั้ง)
const PARENTS_WITH_SUBCOLLECTIONS = new Set(['pollSessions', 'projectTeams', 'studio_projects']);

const plain = (v) => {
    if (v === null || v === undefined) return v;
    if (v.toDate) return { __ts: v.toDate().toISOString() };
    if (v instanceof admin.firestore.DocumentReference) return { __ref: v.path };
    if (v instanceof admin.firestore.GeoPoint) return { __geo: [v.latitude, v.longitude] };
    if (Array.isArray(v)) return v.map(plain);
    if (typeof v === 'object') {
        const o = {};
        for (const [k, val] of Object.entries(v)) o[k] = plain(val);
        return o;
    }
    return v;
};

async function countAll() {
    const cols = (await db.listCollections()).map(c => c.id).sort();
    const counts = {};
    for (const id of cols) {
        const snap = await db.collection(id).count().get();
        counts[id] = snap.data().count;
        console.log(`  ${id.padEnd(28)} ${String(counts[id]).padStart(8)}`);
    }
    const sub = {};
    for (const id of KNOWN_SUBCOLLECTIONS) {
        const snap = await db.collectionGroup(id).count().get();
        sub[id] = snap.data().count;
        console.log(`  */${id.padEnd(26)} ${String(sub[id]).padStart(8)}  (collectionGroup)`);
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const result = {
        generatedAt: new Date().toISOString(),
        project: process.env.FIRESTORE_EMULATOR_HOST ? 'emulator' : 'ai-powered-coding-596ed',
        note: 'baseline ก่อนพัฒนา APCC v6.0 Studio (อ่านอย่างเดียว) — คอลเลกชันเดิมต้องมีจำนวนเท่าเดิมหลังพัฒนา',
        totalTopLevelDocs: total,
        collections: counts,
        subcollections: sub,
    };
    fs.mkdirSync(path.dirname(OUT_COUNTS), { recursive: true });
    fs.writeFileSync(OUT_COUNTS, JSON.stringify(result, null, 2) + '\n', 'utf8');
    console.log(`\nรวม ${total} เอกสารระดับบนสุด → ${path.relative(ROOT, OUT_COUNTS)}`);
    return result;
}

async function dumpCollection(ref, dir, name) {
    const snap = await ref.get();
    const rows = [];
    for (const d of snap.docs) {
        const row = { id: d.id, ...plain(d.data()) };
        const subs = PARENTS_WITH_SUBCOLLECTIONS.has(name) ? await d.ref.listCollections() : [];
        for (const s of subs) {
            const sSnap = await s.get();
            row['__sub_' + s.id] = sSnap.docs.map(x => ({ id: x.id, ...plain(x.data()) }));
        }
        rows.push(row);
    }
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(rows), 'utf8');
    console.log(`  ✓ ${name.padEnd(28)} ${String(rows.length).padStart(8)}`);
    return rows.length;
}

async function fullBackup() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dir = path.join(ROOT, 'backups', 'firestore-' + stamp);
    fs.mkdirSync(dir, { recursive: true });
    console.log('\nสำรองข้อมูลทั้งหมด (อ่านอย่างเดียว) → ' + path.relative(ROOT, dir) + '\n');
    let n = 0;
    for (const c of await db.listCollections()) n += await dumpCollection(c, dir, c.id);
    console.log(`\nสำรองแล้ว ${n} เอกสาร (ไม่รวม subcollection)`);
}

(async () => {
    if (MODE_COUNTS) { console.log('\nนับเอกสาร (อ่านอย่างเดียว)\n'); await countAll(); }
    if (MODE_FULL) await fullBackup();
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

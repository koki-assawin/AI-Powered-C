#!/usr/bin/env node
/**
 * tools/report/fetch-cache.js — ดึงข้อมูลจาก Firestore ครั้งเดียวแล้วเก็บเป็นไฟล์ JSON
 *
 * อ่านอย่างเดียว ไม่เขียนข้อมูลใด ๆ กลับไปที่ Firestore
 * ไฟล์แคชเก็บไว้ที่ backups/report-cache/ ซึ่งอยู่ใน .gitignore (มีชื่อผู้เรียนจริง)
 * สคริปต์วิเคราะห์ทุกตัวอ่านจากแคชนี้ จึงไม่กินโควตาซ้ำ
 *
 * วิธีใช้: node tools/report/fetch-cache.js [--force]
 *   ถ้ามีไฟล์แคชอยู่แล้วจะข้าม เว้นแต่ใส่ --force
 */
const path = require('path');
const fs = require('fs');
const admin = require(path.join(__dirname, '..', '..', 'functions', 'node_modules', 'firebase-admin'));

const ROOT = path.join(__dirname, '..', '..');
const keyPath = path.join(ROOT, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) { console.error('❌ ไม่พบ serviceAccountKey.json'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db = admin.firestore();

const CID = 'UZGy0pGurry9Dt9YdhYX';
const CACHE = path.join(ROOT, 'backups', 'report-cache');
fs.mkdirSync(CACHE, { recursive: true });
const FORCE = process.argv.includes('--force');

const plain = (v) => {
    if (v === null || v === undefined) return v;
    if (v.toDate) return { __ts: v.toDate().toISOString() };
    if (Array.isArray(v)) return v.map(plain);
    if (typeof v === 'object') {
        const o = {};
        for (const [k, val] of Object.entries(v)) o[k] = plain(val);
        return o;
    }
    return v;
};

let totalReads = 0;

async function cache(name, buildQuery) {
    const file = path.join(CACHE, name + '.json');
    if (fs.existsSync(file) && !FORCE) {
        const n = JSON.parse(fs.readFileSync(file, 'utf8')).length;
        console.log(`  ข้าม ${name} (มีแคชแล้ว ${n} ระเบียน)`);
        return;
    }
    const snap = await buildQuery().get();
    const rows = snap.docs.map(d => ({ id: d.id, ...plain(d.data()) }));
    fs.writeFileSync(file, JSON.stringify(rows, null, 1), 'utf8');
    totalReads += Math.max(snap.size, 1);
    console.log(`  ✓ ${name.padEnd(26)} ${String(snap.size).padStart(6)} ระเบียน`);
}

(async () => {
    console.log('\nดึงข้อมูล (อ่านอย่างเดียว) → ' + CACHE + '\n');

    await cache('courses',        () => db.collection('courses'));
    await cache('users',          () => db.collection('users'));
    await cache('enrollments',    () => db.collection('enrollments').where('courseId', '==', CID));
    await cache('assignments',    () => db.collection('assignments').where('courseId', '==', CID));
    await cache('assignments_v2', () => db.collection('assignments_v2').where('courseId', '==', CID));
    await cache('submissions',    () => db.collection('submissions').where('courseId', '==', CID));
    await cache('submissions_v2', () => db.collection('submissions_v2').where('courseId', '==', CID));
    await cache('grades',         () => db.collection('grades').where('courseId', '==', CID));
    await cache('coachInteractions', () => db.collection('coachInteractions'));
    await cache('usageEvents',    () => db.collection('usageEvents'));
    await cache('selfPractice',   () => db.collection('selfPracticeSubmissions'));
    await cache('pollSessions',   () => db.collection('pollSessions'));
    await cache('miniGameSessions', () => db.collection('miniGameSessions'));
    await cache('xpCorrections',  () => db.collection('xpCorrections'));
    await cache('gradeCorrections', () => db.collection('gradeCorrections'));

    // responses ของแต่ละ pollSession (subcollection)
    const respFile = path.join(CACHE, 'pollResponses.json');
    if (!fs.existsSync(respFile) || FORCE) {
        const sessions = JSON.parse(fs.readFileSync(path.join(CACHE, 'pollSessions.json'), 'utf8'));
        const all = [];
        for (const s of sessions) {
            const snap = await db.collection('pollSessions').doc(s.id).collection('responses').get();
            totalReads += Math.max(snap.size, 1);
            snap.docs.forEach(d => all.push({ sessionId: s.id, id: d.id, ...plain(d.data()) }));
        }
        fs.writeFileSync(respFile, JSON.stringify(all, null, 1), 'utf8');
        console.log(`  ✓ ${'pollResponses'.padEnd(26)} ${String(all.length).padStart(6)} ระเบียน`);
    } else {
        console.log('  ข้าม pollResponses (มีแคชแล้ว)');
    }

    console.log('\nอ่านจาก Firestore รอบนี้ประมาณ', totalReads, 'ครั้ง');
    console.log('แคชพร้อมใช้งาน สคริปต์วิเคราะห์จะไม่อ่าน Firestore อีก\n');
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

// อ่านอย่างเดียว: ดึง testCases ของกิจกรรมที่นับคะแนนทุกข้อในรายวิชา เก็บลงแคช
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));
admin.initializeApp({ credential: admin.credential.cert(require(path.join(ROOT, 'serviceAccountKey.json'))) });
const db = admin.firestore();

const CACHE = path.join(ROOT, 'backups', 'report-cache');
const assignments = JSON.parse(fs.readFileSync(path.join(CACHE, 'assignments.json'), 'utf8'));
const CID = 'UZGy0pGurry9Dt9YdhYX';
const graded = assignments.filter(a => a.courseId === CID && a.isPublished !== false && a.unitName);

(async () => {
    const out = {};
    let reads = 0;
    for (const a of graded) {
        const snap = await db.collection('testCases').where('assignmentId', '==', a.id).get();
        out[a.id] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        reads += Math.max(snap.size, 1);
        console.log(String(snap.size).padStart(3) + '  ' + a.title);
    }
    fs.writeFileSync(path.join(CACHE, 'testcases.json'), JSON.stringify(out, null, 1), 'utf8');
    console.log('\nอ่านจาก Firestore ' + reads + ' ครั้ง · เก็บไว้ที่ backups/report-cache/testcases.json');
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

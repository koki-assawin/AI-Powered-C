// อ่านอย่างเดียว: ดึง assignments / submissions / enrollments ของทุกรายวิชา เก็บลงแคช
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));
admin.initializeApp({ credential: admin.credential.cert(require(path.join(ROOT, 'serviceAccountKey.json'))) });
const db = admin.firestore();
const CACHE = path.join(ROOT, 'backups', 'report-cache');

const plain = v => {
    if (v === null || v === undefined) return v;
    if (v.toDate) return { __ts: v.toDate().toISOString() };
    if (Array.isArray(v)) return v.map(plain);
    if (typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = plain(x); return o; }
    return v;
};

let reads = 0;
const grab = async (name, q) => {
    const snap = await q.get();
    reads += Math.max(snap.size, 1);
    console.log('  ' + String(snap.size).padStart(6) + '  ' + name);
    return snap.docs.map(d => ({ id: d.id, ...plain(d.data()) }));
};

(async () => {
    const courses = JSON.parse(fs.readFileSync(path.join(CACHE, 'courses.json'), 'utf8'));
    const out = { assignments: [], submissions: [], enrollments: [], grades: [] };
    for (const c of courses) {
        console.log('\n' + c.title + ' (' + c.id + ')');
        out.assignments.push(...await grab('assignments', db.collection('assignments').where('courseId', '==', c.id)));
        out.submissions.push(...await grab('submissions', db.collection('submissions').where('courseId', '==', c.id)));
        out.enrollments.push(...await grab('enrollments', db.collection('enrollments').where('courseId', '==', c.id)));
        out.grades.push(...await grab('grades', db.collection('grades').where('courseId', '==', c.id)));
    }
    // ตัดฟิลด์โค้ดออกเพื่อให้ไฟล์เล็กลง ไม่ต้องใช้ในการคำนวณ E1
    out.submissions = out.submissions.map(s => { const { code, testResults, ...rest } = s; return rest; });
    fs.writeFileSync(path.join(CACHE, 'all-courses.json'), JSON.stringify(out), 'utf8');
    console.log('\nอ่านจาก Firestore ' + reads + ' ครั้ง · เก็บไว้ที่ backups/report-cache/all-courses.json');
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

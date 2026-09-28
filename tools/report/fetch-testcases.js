// อ่านอย่างเดียว: ดึง testCases ของกิจกรรมที่ใช้ทำตัวอย่างผลงาน
const path = require('path'), fs = require('fs');
const ROOT = 'C:/xampp/htdocs/AI-Powered-C';
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));
admin.initializeApp({ credential: admin.credential.cert(require(path.join(ROOT, 'serviceAccountKey.json'))) });
const db = admin.firestore();
const AIDS = ['ddKZjnhL5Z52hUWGl00l', 'Mc9RtagmZQzZYIABa5lb'];
(async () => {
    const out = {};
    for (const aid of AIDS) {
        const snap = await db.collection('testCases').where('assignmentId', '==', aid).get();
        out[aid] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log(aid, snap.size, 'test cases');
    }
    fs.writeFileSync(path.join(ROOT, 'backups', 'report-cache', 'testcases.json'), JSON.stringify(out, null, 1), 'utf8');
    process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });

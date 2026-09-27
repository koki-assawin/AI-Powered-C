// วิเคราะห์ความสัมพันธ์ระหว่างการได้คะแนนเต็มกับการใช้ AI Scaffolding (คำใบ้)
// อ่านอย่างเดียว ไม่เขียนข้อมูลใด ๆ
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const ROOT = path.join(__dirname, '..');
admin.initializeApp({ credential: admin.credential.cert(require(ROOT + '/serviceAccountKey.json')) });
const db = admin.firestore();
const CID = 'UZGy0pGurry9Dt9YdhYX';

(async () => {
    const [subSnap, asgSnap, enrSnap, usersSnap, ueSnap, ciSnap] = await Promise.all([
        db.collection('submissions').where('courseId', '==', CID).get(),
        db.collection('assignments').where('courseId', '==', CID).get(),
        db.collection('enrollments').where('courseId', '==', CID).get(),
        db.collection('users').get(),
        db.collection('usageEvents').where('event', '==', 'ai_hint').get(),
        db.collection('coachInteractions').get(),
    ]);

    const names = {}; usersSnap.docs.forEach(d => names[d.id] = d.data().displayName || d.id);
    const asg = {}; asgSnap.docs.forEach(d => {
        const v = d.data();
        if (v.isPublished !== false && v.unitName) asg[d.id] = { title: v.title, unit: v.unitName };
    });
    const students = new Set(enrSnap.docs.map(d => d.data().studentId));

    // คำใบ้: จับคู่ด้วย assignmentId จาก usageEvents และด้วยชื่อโจทย์จาก coachInteractions
    const hintPairs = new Set();      // uid|assignmentId ที่เคยขอคำใบ้
    const hintCountByUid = {};
    ueSnap.docs.forEach(d => {
        const v = d.data();
        if (!v.uid || v.uid === 'demo') return;
        hintCountByUid[v.uid] = (hintCountByUid[v.uid] || 0) + 1;
        if (v.assignmentId) hintPairs.add(v.uid + '|' + v.assignmentId);
    });
    const titleToId = {};
    Object.entries(asg).forEach(([id, a]) => { titleToId[a.title] = id; });
    let ciHintDocs = 0;
    ciSnap.docs.forEach(d => {
        const v = d.data();
        if (!String(v.triggerEvent || '').startsWith('hint_level_')) return;
        ciHintDocs++;
        const id = titleToId[v.relatedId];
        if (id && v.uid) hintPairs.add(v.uid + '|' + id);
    });

    // รวมผลการส่งต่อคู่ (นักเรียน × ข้อ)
    const pair = {};
    subSnap.docs.forEach(d => {
        const v = d.data();
        if (!v.studentId || !asg[v.assignmentId]) return;
        if (!students.has(v.studentId)) return;
        const k = v.studentId + '|' + v.assignmentId;
        const t = v.submittedAt?.seconds || 0;
        const sc = v.score || 0;
        const c = pair[k] || { best: -1, first: null, firstAt: Infinity, n: 0 };
        c.n++;
        if (sc > c.best) c.best = sc;
        if (t < c.firstAt) { c.firstAt = t; c.first = sc; }
        pair[k] = c;
    });

    const rows = Object.entries(pair).map(([k, v]) => {
        const [uid, aid] = k.split('|');
        return { uid, aid, ...v, hinted: hintPairs.has(k) };
    });

    const full = rows.filter(r => r.best === 100);
    const fullNoHint = full.filter(r => !r.hinted);
    const firstTryFull = rows.filter(r => r.first === 100 && r.n >= 1);
    const firstTryFullNoHint = firstTryFull.filter(r => !r.hinted);

    const pct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '-';

    console.log('\n===== การใช้ AI Scaffolding (คำใบ้) เทียบกับการได้คะแนนเต็ม =====');
    console.log('รายวิชา ว31281 1/69 | โจทย์ที่นับคะแนน', Object.keys(asg).length, 'ข้อ | นักเรียน', students.size, 'คน');
    console.log('คู่ (นักเรียน × ข้อ) ที่มีการส่ง:', rows.length);
    console.log('');
    console.log('คู่ที่ได้คะแนนเต็ม 100          :', full.length, pct(full.length, rows.length), 'ของคู่ทั้งหมด');
    console.log('  ในจำนวนนี้ ไม่เคยขอคำใบ้เลย  :', fullNoHint.length, pct(fullNoHint.length, full.length), 'ของคู่ที่ได้เต็ม');
    console.log('  เคยขอคำใบ้                   :', full.length - fullNoHint.length, pct(full.length - fullNoHint.length, full.length));
    console.log('');
    console.log('คู่ที่ได้เต็มตั้งแต่ส่งครั้งแรก  :', firstTryFull.length, pct(firstTryFull.length, rows.length), 'ของคู่ทั้งหมด');
    console.log('  และไม่เคยขอคำใบ้เลย          :', firstTryFullNoHint.length, pct(firstTryFullNoHint.length, firstTryFull.length), 'ของคู่ที่ได้เต็มครั้งแรก');
    console.log('');

    // ระดับรายคน
    const byStu = {};
    rows.forEach(r => {
        const s = byStu[r.uid] = byStu[r.uid] || { done: 0, full: 0, fullNoHint: 0, firstFull: 0, hints: hintCountByUid[r.uid] || 0 };
        s.done++;
        if (r.best === 100) { s.full++; if (!r.hinted) s.fullNoHint++; }
        if (r.first === 100) s.firstFull++;
    });
    const stu = Object.entries(byStu).map(([uid, v]) => ({ uid, name: names[uid] || uid, ...v }));
    const neverHinted = stu.filter(s => s.hints === 0);
    console.log('ระดับรายคน (', stu.length, 'คนที่มีการส่งงาน )');
    console.log('  ไม่เคยขอคำใบ้เลยทั้งภาคเรียน :', neverHinted.length, 'คน', pct(neverHinted.length, stu.length));
    console.log('  ขอคำใบ้ 1-5 ครั้ง             :', stu.filter(s => s.hints >= 1 && s.hints <= 5).length, 'คน');
    console.log('  ขอคำใบ้มากกว่า 5 ครั้ง        :', stu.filter(s => s.hints > 5).length, 'คน');
    console.log('  รวมการขอคำใบ้ทั้งห้อง         :', Object.values(hintCountByUid).reduce((a, b) => a + b, 0), 'ครั้ง (usageEvents)');
    console.log('  บันทึกใน coachInteractions    :', ciHintDocs, 'รายการ');
    console.log('');
    console.log('10 คนที่ได้เต็มมากที่สุดโดยไม่ขอคำใบ้:');
    stu.sort((a, b) => b.fullNoHint - a.fullNoHint).slice(0, 10).forEach(s => {
        console.log('   ' + String(s.name).slice(0, 26).padEnd(28) +
            'ได้เต็ม ' + String(s.full).padStart(2) + '/' + String(s.done).padStart(2) + ' ข้อ' +
            ' | ไม่ขอคำใบ้ ' + String(s.fullNoHint).padStart(2) + ' ข้อ' +
            ' | เต็มครั้งแรก ' + String(s.firstFull).padStart(2) + ' ข้อ' +
            ' | ขอคำใบ้รวม ' + s.hints + ' ครั้ง');
    });
    process.exit(0);
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });

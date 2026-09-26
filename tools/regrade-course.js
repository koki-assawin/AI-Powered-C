#!/usr/bin/env node
/**
 * tools/regrade-course.js
 * คำนวณคะแนนในสมุดเกรด (collection `grades`) ใหม่ทั้งรายวิชา ตามเกณฑ์ที่เลือก
 *
 *   --policy latest : ใช้คะแนนจากการส่งครั้งล่าสุดของแต่ละข้อ
 *   --policy best   : ใช้คะแนนครั้งที่ดีที่สุด (เกณฑ์เดิมของระบบ)
 *
 * คุณสมบัติด้านความปลอดภัยของข้อมูล
 *   - โหมดทดลองเป็นค่าเริ่มต้น ต้องใส่ --apply เองจึงจะเขียน
 *   - สำรอง grades เดิมทั้งรายวิชาเป็นไฟล์ JSON ใน backups/ ก่อนเสมอ
 *   - ไม่แตะ collection `submissions` ประวัติการส่งทุกครั้งยังอยู่ครบ
 *   - บันทึกสรุปการแก้ไขไว้ใน collection `gradeCorrections`
 *   - เปรียบเทียบคะแนนเฉลี่ยสองเกณฑ์ให้เห็นก่อนตัดสินใจ
 *
 * วิธีใช้:
 *   node tools/regrade-course.js --course <courseId> --policy latest
 *   node tools/regrade-course.js --course <courseId> --policy latest --apply
 *   node tools/regrade-course.js --course <courseId> --compare-only
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
const courseId = argOf('--course');
const policy = (argOf('--policy') || 'latest') === 'best' ? 'best' : 'latest';
const APPLY = args.includes('--apply');
const COMPARE_ONLY = args.includes('--compare-only');

if (!courseId) { console.error('ต้องระบุ --course <courseId>'); process.exit(1); }

const ts = (v) => (v && v.toDate ? v.toDate() : null);

(async () => {
    const courseSnap = await db.collection('courses').doc(courseId).get();
    if (!courseSnap.exists) { console.error('ไม่พบรายวิชานี้'); process.exit(1); }
    const course = courseSnap.data();

    const [subSnap, gradeSnap, assignSnap] = await Promise.all([
        db.collection('submissions').where('courseId', '==', courseId).get(),
        db.collection('grades').where('courseId', '==', courseId).get(),
        db.collection('assignments').where('courseId', '==', courseId).get(),
    ]);

    const assignMap = {};
    assignSnap.docs.forEach(d => { assignMap[d.id] = d.data(); });

    // ── รวบรวมคะแนนตามทั้งสองเกณฑ์เพื่อเปรียบเทียบ ──────────────────────────
    const byPair = {};   // studentId|assignmentId → { best, latest, latestAt, bestSubId, latestSubId, maxScore }
    subSnap.docs.forEach(d => {
        const v = d.data();
        if (!v.studentId || !v.assignmentId) return;
        const key = `${v.studentId}|${v.assignmentId}`;
        const at = ts(v.submittedAt);
        const t = at ? at.getTime() : 0;
        const score = v.score || 0;
        const cur = byPair[key] || { best: -1, latest: 0, latestAt: -1, maxScore: v.totalPoints || 0 };
        if (score > cur.best) { cur.best = score; cur.bestSubId = d.id; }
        if (t >= cur.latestAt) { cur.latestAt = t; cur.latest = score; cur.latestSubId = d.id; }
        byPair[key] = cur;
    });

    const pairs = Object.entries(byPair);
    const avg = (f) => pairs.length ? pairs.reduce((s, [, v]) => s + v[f], 0) / pairs.length : 0;
    const bestAvg = avg('best'), latestAvg = avg('latest');
    const lower = pairs.filter(([, v]) => v.latest < v.best);

    console.log('\n==================================================');
    console.log('รายวิชา:', course.title);
    console.log('เกณฑ์ที่ตั้งไว้ในระบบตอนนี้:', course.gradingPolicy === 'latest' ? 'คะแนนครั้งล่าสุด' : 'คะแนนครั้งที่ดีที่สุด');
    console.log('การส่งงานทั้งหมด:', subSnap.size, 'ครั้ง | คู่ (นักเรียน × ข้อ):', pairs.length);
    console.log('--------------------------------------------------');
    console.log('เปรียบเทียบสองเกณฑ์ (คิดเป็นร้อยละของแต่ละข้อ)');
    console.log('  คะแนนเฉลี่ยแบบครั้งที่ดีที่สุด :', bestAvg.toFixed(2) + '%');
    console.log('  คะแนนเฉลี่ยแบบครั้งล่าสุด      :', latestAvg.toFixed(2) + '%');
    console.log('  ส่วนต่าง                        :', (latestAvg - bestAvg).toFixed(2) + '%');
    console.log('  จำนวนคู่ที่คะแนนจะลดลง          :', lower.length, 'จาก', pairs.length,
                `(${pairs.length ? (lower.length / pairs.length * 100).toFixed(1) : 0}%)`);

    if (COMPARE_ONLY) {
        console.log('\nโหมดเปรียบเทียบอย่างเดียว ไม่มีการเขียนข้อมูล');
        console.log('==================================================\n');
        process.exit(0);
    }

    // ── สำรองสมุดเกรดเดิม ────────────────────────────────────────────────────
    const backupDir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir,
        `grades_${courseId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(
        gradeSnap.docs.map(d => ({ id: d.id, ...d.data() })), null, 2), 'utf8');

    // ── วางแผนการแก้ไข ──────────────────────────────────────────────────────
    const gradeByPair = {};
    gradeSnap.docs.forEach(d => {
        const v = d.data();
        gradeByPair[`${v.studentId}|${v.assignmentId}`] = { id: d.id, ...v };
    });

    const updates = [];
    pairs.forEach(([key, v]) => {
        const target = policy === 'latest' ? v.latest : v.best;
        const subId = policy === 'latest' ? v.latestSubId : v.bestSubId;
        const g = gradeByPair[key];
        if (!g) {
            const [studentId, assignmentId] = key.split('|');
            updates.push({ type: 'create', studentId, assignmentId, score: target, submissionId: subId, maxScore: v.maxScore });
        } else if ((g.score || 0) !== target) {
            updates.push({ type: 'update', id: g.id, from: g.score || 0, score: target, submissionId: subId });
        }
    });

    console.log('--------------------------------------------------');
    console.log('เกณฑ์ที่จะใช้คำนวณใหม่:', policy === 'latest' ? 'คะแนนครั้งล่าสุด' : 'คะแนนครั้งที่ดีที่สุด');
    console.log('สำรองสมุดเกรดเดิมไว้ที่:', backupFile);
    console.log('รายการที่ต้องแก้:', updates.filter(u => u.type === 'update').length,
                '| สร้างใหม่:', updates.filter(u => u.type === 'create').length);
    const drops = updates.filter(u => u.type === 'update' && u.score < u.from);
    console.log('รายการที่คะแนนลดลง:', drops.length,
                drops.length ? `(ลดเฉลี่ย ${(drops.reduce((s, u) => s + (u.from - u.score), 0) / drops.length).toFixed(1)}%)` : '');

    if (!APPLY) {
        console.log('\nนี่คือผลจำลอง ถ้าถูกต้องแล้วให้รันซ้ำพร้อม --apply');
        console.log('==================================================\n');
        process.exit(0);
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    for (let i = 0; i < updates.length; i += 400) {
        const batch = db.batch();
        updates.slice(i, i + 400).forEach(u => {
            if (u.type === 'create') {
                batch.set(db.collection('grades').doc(), {
                    studentId: u.studentId, courseId, assignmentId: u.assignmentId,
                    score: u.score, maxScore: u.maxScore || 0, submissionId: u.submissionId || null,
                    gradingPolicy: policy, gradedAt: now,
                });
            } else {
                batch.update(db.collection('grades').doc(u.id), {
                    score: u.score, submissionId: u.submissionId || null,
                    gradingPolicy: policy, gradedAt: now,
                });
            }
        });
        await batch.commit();
        console.log('  เขียนแล้ว', Math.min(i + 400, updates.length), '/', updates.length);
    }

    await db.collection('courses').doc(courseId).set({ gradingPolicy: policy }, { merge: true });

    await db.collection('gradeCorrections').add({
        courseId, courseTitle: course.title || null, policy,
        submissionsScanned: subSnap.size, pairs: pairs.length,
        updated: updates.filter(u => u.type === 'update').length,
        created: updates.filter(u => u.type === 'create').length,
        scoreDropped: drops.length,
        bestAvg: Number(bestAvg.toFixed(2)), latestAvg: Number(latestAvg.toFixed(2)),
        backupFile: path.basename(backupFile),
        reason: 'ปรับเกณฑ์คิดคะแนนของรายวิชาและคำนวณสมุดเกรดใหม่',
        correctedAt: now,
    });

    console.log('\n✅ คำนวณสมุดเกรดใหม่เรียบร้อย และตั้งเกณฑ์ของรายวิชาเป็น', policy, 'แล้ว');
    console.log('   ประวัติการส่งงานทั้งหมดยังอยู่ครบ บันทึกการแก้ไขอยู่ใน gradeCorrections');
    console.log('==================================================\n');
    process.exit(0);
})().catch(err => { console.error('❌', err.message); process.exit(1); });

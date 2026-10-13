#!/usr/bin/env node
/**
 * scripts/export-sandbox-e1.js
 * ส่งออกรายละเอียดการส่งงาน E1 ของรายวิชา Sandbox 3 วิชาเป็นไฟล์ CSV (อ่านอย่างเดียว ไม่เขียน Firestore)
 *
 * ไฟล์ที่ได้ (โฟลเดอร์ docs/sandbox-e1-2569-10/)
 *   SUBMISSIONS.csv      การส่งงานทุกครั้ง เรียงตามวิชา นักเรียน โจทย์ และเวลา
 *   GRADEBOOK.csv        คะแนนที่ใช้ต่อคนต่อข้อ (%) และคะแนนดิบรวม /60
 *   STUDENT_SUMMARY.csv  สรุปรายคน: E1 รวม ร้อยละ ตำแหน่งเทียบ 80% และจำนวนข้อที่ส่งซ้ำ
 *
 * วิธีใช้:
 *   node scripts/export-sandbox-e1.js
 */

const path = require('path');
const fs   = require('fs');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

admin.initializeApp({ credential: admin.credential.cert(require(path.join(__dirname, '..', 'serviceAccountKey.json'))) });
const db = admin.firestore();

const COURSES = [
    { id: 'sandbox-e1-test',   label: 'Sandbox1' },
    { id: 'sandbox-e1-test-2', label: 'Sandbox2' },
    { id: 'sandbox-e1-test-3', label: 'Sandbox3' },
];
const OUT = path.join(__dirname, '..', 'docs', 'sandbox-e1-2569-10');

const unitNo = (u) => { const m = /(\d+)/.exec(u || ''); return m ? +m[1] : 99; };
const csvCell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const writeCsv = (name, rows) => {
    fs.writeFileSync(path.join(OUT, name), '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n', 'utf8');
    console.log('  ✓ ' + name + ' (' + (rows.length - 1) + ' แถว)');
};
// เวลาไทย (UTC+7) รูปแบบ YYYY-MM-DD HH:mm:ss
const thTime = (ts) => new Date(ts.toMillis() + 7 * 3600000).toISOString().replace('T', ' ').slice(0, 19);

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const subRows  = [['course', 'courseId', 'studentNo', 'studentId', 'unit', 'assignmentNo', 'assignmentId', 'assignmentTitle', 'rawScore',
                       'attemptNo', 'attemptsTotal', 'submittedAt_TH', 'status', 'passedTests', 'totalTests', 'score_pct', 'isFinal', 'submissionId']];
    const gbRows   = [];
    const sumRows  = [['course', 'courseId', 'studentNo', 'studentId', 'displayName', 'E1_raw', 'E1_max', 'E1_pct', 'vs80',
                       'E1_latest_raw', 'E1_best_raw', 'E1_gradebook_raw', 'assignmentsSubmitted', 'assignmentsResubmitted', 'totalSubmissions']];

    for (const c of COURSES) {
        const course = (await db.collection('courses').doc(c.id).get()).data();
        if (!course || course.isSandbox !== true) throw new Error(c.id + ' ไม่ใช่รายวิชา Sandbox');
        const assignments = (await db.collection('assignments').where('courseId', '==', c.id).get()).docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(a => a.isPublished !== false && a.unitName)
            .sort((a, b) => unitNo(a.unitName) - unitNo(b.unitName) || (a.title || '').localeCompare(b.title || '', 'th'));
        const aNo = Object.fromEntries(assignments.map((a, i) => [a.id, i + 1]));
        const totalRaw = assignments.reduce((s, a) => s + (a.rawScore || 0), 0);

        const enr = (await db.collection('enrollments').where('courseId', '==', c.id).get()).docs.map(d => d.data().studentId);
        const students = [];
        for (const sid of enr) {
            const u = (await db.collection('users').doc(sid).get()).data();
            students.push({ id: sid, no: parseInt(u.number || '0', 10), name: u.displayName });
        }
        students.sort((a, b) => a.no - b.no);

        const subs = (await db.collection('submissions').where('courseId', '==', c.id).get()).docs.map(d => ({ id: d.id, ...d.data() }));
        const grades = (await db.collection('grades').where('courseId', '==', c.id).get()).docs.map(d => d.data());
        const gradeMap = Object.fromEntries(grades.map(g => [g.studentId + '|' + g.assignmentId, g]));

        if (!gbRows.length) gbRows.push(['course', 'courseId', 'studentNo', 'studentId',
            ...assignments.map((a, i) => 'A' + String(i + 1).padStart(2, '0') + '_pct'), 'E1_raw', 'E1_max', 'E1_pct']);

        for (const st of students) {
            let latestRaw = 0, bestRaw = 0, gradeRaw = 0, resub = 0, submitted = 0, nSubs = 0;
            const gbCells = [];
            for (const a of assignments) {
                const mine = subs.filter(s => s.studentId === st.id && s.assignmentId === a.id)
                    .sort((x, y) => x.submittedAt.toMillis() - y.submittedAt.toMillis());
                const g = gradeMap[st.id + '|' + a.id];
                mine.forEach((s, k) => subRows.push([c.label, c.id, st.no, st.id, a.unitName, aNo[a.id], a.id, a.title, a.rawScore || 0,
                    s.attemptNo || k + 1, s.attemptsTotal || mine.length, thTime(s.submittedAt), s.status, s.passedTests, s.totalTests, s.score,
                    g && g.submissionId === s.id ? 'Y' : '', s.id]));
                if (mine.length) submitted++;
                if (mine.length > 1) resub++;
                nSubs += mine.length;
                const latest = mine.length ? mine[mine.length - 1].score || 0 : 0;
                const best = mine.reduce((m, s) => Math.max(m, s.score || 0), 0);
                latestRaw += Math.round(latest * (a.rawScore || 0) / 100);
                bestRaw   += Math.round(best * (a.rawScore || 0) / 100);
                gradeRaw  += Math.round((g ? g.score || 0 : 0) * (a.rawScore || 0) / 100);
                gbCells.push(course.gradingPolicy === 'latest' ? latest : best);
            }
            const e1 = course.gradingPolicy === 'latest' ? latestRaw : bestRaw;
            const p = e1 / totalRaw * 100;
            gbRows.push([c.label, c.id, st.no, st.id, ...gbCells, e1, totalRaw, p.toFixed(2)]);
            sumRows.push([c.label, c.id, st.no, st.id, st.name, e1, totalRaw, p.toFixed(2),
                Math.abs(p - 80) < 1e-9 ? 'equal' : p < 80 ? 'below' : 'above',
                latestRaw, bestRaw, gradeRaw, submitted, resub, nSubs]);
        }
        console.log(c.label + ': นักเรียน ' + students.length + ' · submissions ' + subs.length + ' · grades ' + grades.length);
    }

    writeCsv('SUBMISSIONS.csv', subRows);
    writeCsv('GRADEBOOK.csv', gbRows);
    writeCsv('STUDENT_SUMMARY.csv', sumRows);
    process.exit(0);
})().catch(e => { console.error('\n❌', e.message); process.exit(1); });

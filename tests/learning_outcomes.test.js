#!/usr/bin/env node
/**
 * tests/learning_outcomes.test.js — ฟังก์ชันคำนวณของแท็บ "ผลลัพธ์ผู้เรียน" (js/learningOutcomes.js)
 *
 * ส่วนที่ 1 ไม่ต้องใช้ emulator หรือเครือข่าย: diff, สถิติ, รหัส S, คำใบ้ก่อนส่ง, CSV
 * ส่วนที่ 2 (ถ้ามีไฟล์แคช backups/report-cache/ จาก tools/report/fetch-cache.js ซึ่งอ่านอย่างเดียว):
 *   ตรวจ ว31281 1/69 ชุด "แผนฯ 19" (3-A1, 3-A2, 3-A3) ว่า n = 35, ตัวเลขตรงกับตาราง E1 และ E1_PROBLEMS.md
 *   ไม่พิมพ์ชื่อหรือรหัสนักเรียนออกจอ
 *
 * ใช้: node tests/learning_outcomes.test.js
 */
const path = require('path');
const fs = require('fs');
const LO = require(path.join(__dirname, '..', 'js', 'learningOutcomes.js'));

let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } };
const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;

console.log('1) ฟังก์ชันพื้นฐาน');
ok(LO.problemCode('กิจกรรม 3-A1: 1 ถึง N โดยใช้ for loop') === '3-A1', 'problemCode 3-A1');
ok(LO.problemCode('กิจกรรม 1-D โปรแกรมคำนวณการแลกเหรียญ') === '1-D', 'problemCode 1-D ไม่มีโคลอน');
ok(LO.shortTitle('กิจกรรม 3-A2: นับถอยหลัง') === 'นับถอยหลัง', 'shortTitle');
ok(LO.tsSec({ __ts: '1970-01-01T00:00:10.000Z' }) === 10 && LO.tsSec({ seconds: 5 }) === 5, 'tsSec รองรับ __ts และ seconds');

// diff: เพิ่ม sum = 0;
const d = LO.lineDiff('int main(){\n  for(i=1;i<=n;i++) sum+=i;\n}', 'int main(){\n  sum = 0;\n  for(i=1;i<=n;i++) sum+=i;\n}');
ok(d.filter(x => x.type === 'add').length === 1 && d.find(x => x.type === 'add').text.trim() === 'sum = 0;', 'lineDiff เจอบรรทัดที่เพิ่ม');
ok(d.filter(x => x.type === 'del').length === 0, 'lineDiff ไม่มีบรรทัดลบ');

// paired t: d = [1,2,2,0,2] → mean 1.4, sd √0.8, t = 3.5, df 4, p ≈ .0249, dz ≈ 1.565
const st = LO.pairedStats([{ pre: 1, post: 2 }, { pre: 2, post: 4 }, { pre: 3, post: 5 }, { pre: 4, post: 4 }, { pre: 5, post: 7 }], 10, 50);
ok(near(st.meanDiff, 1.4) && near(st.sdDiff, Math.sqrt(0.8)), 'paired mean/SD ของผลต่าง');
ok(near(st.t, 3.5) && st.df === 4, 't = 3.5, df = 4');
ok(near(st.p, 0.02489, 2e-4), 'p สองทาง ≈ .0249 (ได้ ' + st.p.toFixed(5) + ')');
ok(near(st.dz, 1.4 / Math.sqrt(0.8)), "Cohen's dz");
ok(near(st.gClass, (4.4 - 3) / (10 - 3)), 'normalized gain ระดับชั้น');
ok(st.passPost === 2 && st.passPre === 1, 'นับผู้ผ่านเกณฑ์ ≥ 50%');
ok(near(LO.tTwoTailedP(2.045, 29), 0.05, 1e-3), 'p ของ t(29)=2.045 ≈ .05');

// รหัส S เรียงตามเลขที่
const codes = LO.buildCodes([{ studentId: 'u3' }, { studentId: 'u1' }, { studentId: 'u2' }, { studentId: 'u1' }],
    { u1: { number: '2' }, u2: { number: '10' }, u3: { number: '1' } });
ok(codes.list.map(c => c.uid + c.code).join() === 'u3S01,u1S02,u2S03', 'buildCodes เรียงตามเลขที่และตัดซ้ำ');

// คำใบ้ก่อนส่งครั้งที่ n
const slots = LO.hintsBeforeAttempts([{ submittedAt: { seconds: 10 } }, { submittedAt: { seconds: 20 } }],
    [{ level: 1, t: 5 }, { level: 2, t: 15 }, { level: 3, t: 16 }, { level: 4, t: 25 }]);
ok(slots[0].length === 1 && slots[1].length === 2 && slots[2].length === 1, 'hintsBeforeAttempts แบ่งช่องถูก');

// สถานะช่อง
const A = (score) => ({ score, status: score === 100 ? 'accepted' : 'wrong_answer', passedTests: score / 20, totalTests: 5 });
ok(LO.buildCell({ attempts: [A(100)], counted: 100 }).status === 'first', 'ผ่านครั้งแรก');
ok(LO.buildCell({ attempts: [A(40), A(100)], counted: 100 }).status === 'revised', 'ผ่านหลังแก้ไข');
ok(LO.buildCell({ attempts: [A(100), A(60)], counted: 60 }).status === 'notyet', 'เกณฑ์ครั้งล่าสุด: ได้เต็มแล้วส่งใหม่ต่ำลง = ยังไม่ผ่าน');
ok(LO.buildCell({ attempts: [] }).status === 'none', 'ไม่ได้ส่ง');

// CSV
const rows = LO.parseCSV('﻿รหัส,ก่อนเรียน,หลังเรียน,ภ.19-2,Peer\nS01,4,9,10,"ชม ""ดี"", มาก"\n12345,5,8,,\nX9,1,2,,\n');
const mi = LO.matchImport(rows, { list: [{ uid: 'a', code: 'S01', studentCode: '', number: '1' }, { uid: 'b', code: 'S02', studentCode: '12345', number: '2' }] });
ok(mi.matched.length === 2 && mi.unmatched.length === 1 && mi.matched[0].peer === 'ชม "ดี", มาก', 'parseCSV + matchImport');
ok(mi.matched[1].p19_2 === null && mi.matched[0].p19_2 === 10, 'ช่องว่าง = null');

const poll = LO.pollStats({ snapshot: { correctOptionId: 'b' } },
    [{ id: 'a', r1: { optionId: 'a' }, r2: { optionId: 'b' } }, { id: 'b', r1: { optionId: 'b' }, r2: { optionId: 'b' } }, { id: 'z', r1: { optionId: 'b' } }],
    new Set(['a', 'b']));
ok(poll.r1n === 2 && poll.r1ok === 1 && poll.r2ok === 2 && poll.wrongToRight === 1, 'pollStats (ตัดผู้ไม่อยู่ในรายวิชา)');

// ── ส่วนที่ 2: ข้อมูลจริงจากแคช (อ่านอย่างเดียว) ──
const CACHE = path.join(__dirname, '..', 'backups', 'report-cache');
const COURSE = 'UZGy0pGurry9Dt9YdhYX';
if (!fs.existsSync(path.join(CACHE, 'submissions.json'))) {
    console.log('\n2) ข้ามการตรวจกับข้อมูลจริง (ไม่มี backups/report-cache — รัน tools/report/fetch-cache.js ก่อน)');
} else {
    console.log('\n2) ว31281 1/69 · preset "แผนฯ 19" (ข้อมูลจากแคช อ่านอย่างเดียว)');
    const L = (n) => JSON.parse(fs.readFileSync(path.join(CACHE, n + '.json'), 'utf8'));
    const course = L('courses').find(c => c.id === COURSE);
    const lockedSec = course.gradesLocked ? LO.tsSec(course.gradesLockedAt) : null;
    const afterLock = (t) => lockedSec !== null && LO.tsSec(t) > lockedSec;
    // เหมือน loadAnalytics() ใน StudentAnalytics.js
    const submissions = L('submissions').filter(s => s.courseId === COURSE && s.countedInGrade !== false && !afterLock(s.submittedAt));
    const submissionsV2 = L('submissions_v2').filter(s => s.courseId === COURSE && s.countedInGrade !== false && !afterLock(s.submittedAt));
    const grades = L('grades').filter(g => g.courseId === COURSE);
    const enrollments = L('enrollments').filter(e => e.courseId === COURSE);
    const users = {}; L('users').forEach(u => { users[u.id] = u; });
    const v1 = L('assignments').filter(a => a.courseId === COURSE);
    const v2 = L('assignments_v2').filter(a => a.courseId === COURSE && a.activityType !== 'coding');
    const assignments = [...v1, ...v2];
    const cds = LO.buildCodes(enrollments, users);
    const uids = cds.list.map(c => c.uid);
    ok(uids.length === 35, 'n = 35 (ได้ ' + uids.length + ')');
    ok(cds.list[0].code === 'S01' && cds.list[34].code === 'S35', 'รหัส S01–S35');

    const problems = ['3-A1', '3-A2', '3-A3'].map(c => v1.find(a => LO.problemCode(a.title) === c));
    ok(problems.every(Boolean), 'พบโจทย์ 3-A1, 3-A2, 3-A3');
    const usageAll = L('usageEvents').filter(e => problems.some(p => p.id === e.assignmentId));
    const usage = LO.indexUsage(usageAll, new Set(uids), new Set(problems.map(p => p.id)));
    const matrix = LO.buildMatrix({ codes: cds, uids, problems, submissions, submissionsV2, grades, gradingPolicy: course.gradingPolicy, usage });

    // E1_PROBLEMS.md (สร้างจาก tools/report/e1-problems.js ด้วยแคชชุดเดียวกัน): ผู้ส่ง / การส่งรวม / ได้เต็ม(ครั้งล่าสุด) / เต็มตั้งแต่ครั้งแรก
    const expect = { '3-A1': [35, 309, 32, 14], '3-A2': [35, 230, 29, 17], '3-A3': [35, 283, 26, 5] };
    problems.forEach(p => {
        const cs = LO.columnSummary(matrix, uids, p.id);
        const code = LO.problemCode(p.title);
        const got = [cs.submitted, cs.totalSubs, cs.passed, cs.firstPassed];
        ok(JSON.stringify(got) === JSON.stringify(expect[code]),
            code + ' ผู้ส่ง/ส่งรวม/ผ่าน/ผ่านครั้งแรก = ' + got.join('/') + ' (E1_PROBLEMS: ' + expect[code].join('/') + ')');
    });

    const rec = LO.reconcileWithE1({ matrix, uids, problems, e1Input: { submissions, submissionsV2, grades, gradingPolicy: course.gradingPolicy } });
    ok(rec.ok && rec.checked === 105, 'กระทบยอดกับตาราง E1: ตรง ' + (rec.checked - rec.mismatched) + '/' + rec.checked + ' ช่อง');

    // คะแนนดิบรวมของ 3 ข้อ เทียบสูตรคอลัมน์ในตาราง E1 (round(% × rawScore / 100))
    const e1 = LO.e1Scores({ submissions, submissionsV2, grades, gradingPolicy: course.gradingPolicy });
    const e1Raw = uids.reduce((s, u) => s + problems.reduce((t, p) => t + LO.rawEarned((e1[u] || {})[p.id], p.rawScore), 0), 0);
    const myRaw = uids.reduce((s, u) => s + matrix.rows[u].sum.raw, 0);
    ok(e1Raw === myRaw, 'คะแนนดิบรวม 3 ข้อ ตรงกับ E1 (' + myRaw + ')');

    const groups = LO.buildGroups({ uids, submissions, submissionsV2, totalAssignments: assignments.length });
    const gc = { fast: 0, mid: 0, stuck: 0 };
    uids.forEach(u => gc[groups[u].group]++);
    ok(gc.fast + gc.mid + gc.stuck === 35, 'จัดกลุ่มครบ 35 คน (ไว ' + gc.fast + ' · กลาง ' + gc.mid + ' · ติดขัด ' + gc.stuck + ')');
}

console.log('\n' + (fail ? '❌' : '✅') + ' ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);

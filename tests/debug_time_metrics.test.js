#!/usr/bin/env node
/**
 * tests/debug_time_metrics.test.js — ฟังก์ชันคำนวณของแท็บ "เวลาแก้ไขข้อผิดพลาด" (js/debugTimeMetrics.js)
 *
 * ส่วนที่ 1 ไม่ต้องใช้เครือข่าย: นิยามช่วงแก้ไข, IDLE, สถิติ
 * ส่วนที่ 2 (ถ้ามี backups/report-cache/): ว31281 1/69 ตัด 5-C, 3-B2, 5-D และบัญชีทดสอบ เทียบค่าที่ทราบ
 *   ไม่พิมพ์ชื่อหรือรหัสนักเรียนออกจอ
 *
 * ใช้: node tests/debug_time_metrics.test.js
 */
const path = require('path');
const fs = require('fs');
const D = require(path.join(__dirname, '..', 'js', 'debugTimeMetrics.js'));

let fail = 0, pass = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

console.log('1) นิยามและสถิติ');
ok(D.parseActivity('กิจกรรม 3-A1: 1 ถึง N').unit === 3 && D.parseActivity('กิจกรรม 1-D โปรแกรม').code === '1-D', 'parseActivity');
ok(D.parseActivity('Quiz 4.1 ความรู้') === null && D.parseActivity('Mini Project') === null, 'parseActivity ข้าม Quiz/Mini Project');
ok(D.isFull({ passedTests: 5, totalTests: 5, score: 80 }) && !D.isFull({ passedTests: 4, totalTests: 5, score: 100 }), 'isFull ใช้กรณีทดสอบก่อนคะแนน');
ok(D.isFull({ score: 100 }) && !D.isFull({ score: 99 }) && !D.isFull({ passedTests: 0, totalTests: 0, score: 50 }), 'isFull ไม่มี totalTests ใช้ score');

// คู่จำลอง (นาที): u1×a1 ส่งไม่เต็มที่ 0, รันที่ 2 และ 5, พัก 40 นาที, รันที่ 45, ได้เต็มที่ 47
const m = (min) => ({ seconds: 1e9 + min * 60 });
const A = [{ id: 'a1', title: 'กิจกรรม 1-A: x', difficulty: 'ง่าย' }, { id: 'a2', title: 'กิจกรรม 4-B: y', difficulty: 'ยาก' }, { id: 'q', title: 'Quiz 1.1' }];
const sub = (uid, aid, min, full, extra) => ({ studentId: uid, assignmentId: aid, submittedAt: m(min), passedTests: full ? 3 : 1, totalTests: 3, ...extra });
const ev = (uid, aid, min, userType = 'student') => ({ uid, assignmentId: aid, event: 'code_run', timestamp: m(min), userType });
const subs = [
    sub('u1', 'a1', 0, false), sub('u1', 'a1', 47, true, { timeSpentSeconds: 2820, runCount: 3 }), sub('u1', 'a1', 60, true),
    sub('u2', 'a1', 3, true),                                 // ถูกตั้งแต่ครั้งแรก
    sub('u3', 'a1', 0, false), sub('u3', 'a1', 9, false),     // แก้ไม่สำเร็จ
    sub('u1', 'q', 0, false), sub('u1', 'q', 1, true),        // ไม่ใช่กิจกรรม → ไม่นับ
];
const events = [ev('u1', 'a1', 2), ev('u1', 'a1', 5), ev('u1', 'a1', 45), ev('u1', 'a1', 50), ev('u1', 'a1', 30, 'teacher'), ev('u1', 'a1', -10)];
const base = D.buildPairs({ submissions: subs, events, assignments: A, uids: new Set(['u1', 'u2', 'u3']) });
const c = D.countPairs(base);
ok(c.pairs === 3 && c.first === 1 && c.solved === 1 && c.unsolved === 1 && c.everFull === 2, 'นับคู่: 3 คู่ / ถูกครั้งแรก 1 / แก้สำเร็จ 1 / ไม่สำเร็จ 1');
const ep = D.applyIdle(base, 15).find(p => p.status === 'solved');
// เหตุการณ์ใน [0,47]: 0,2,5,45,47 → ช่วงห่าง 2,3,40,2 → IDLE 15: นับ 7 นาที พัก 1 ครั้ง (ตัดของครูและก่อน t0)
ok(near(ep.activeMin, 7) && ep.breaks === 1 && !ep.oneSitting, 'IDLE 15: เวลาทำงานจริง 7 นาที พัก 1 ครั้ง');
ok(near(D.applyIdle(base, 60).find(p => p.status === 'solved').activeMin, 47), 'IDLE 60: นับทุกช่วง = 47 นาที');
ok(ep.attemptsBefore === 1 && near(ep.wallMin, 47) && ep.nEvents === 5, 'ส่งก่อนได้เต็ม 1 ครั้ง · นาฬิกา 47 นาที · 5 เหตุการณ์');
ok(near(ep.measuredMin, 47) && ep.measuredRuns === 3, 'ค่าวัดตรงจากการส่งใน (t0, t1]');
// วันเดียวกันตามเวลาไทย: 23:50 กับ 00:10 ของวันถัดไป (เวลาไทย) = คนละวัน
const th = (h, mm, dd = 0) => Date.UTC(2026, 8, 1 + dd, h - 7, mm) / 1000;
ok(D.thaiDay(th(23, 50)) !== D.thaiDay(th(0, 10, 1)) && D.thaiDay(th(0, 10)) === D.thaiDay(th(23, 50)), 'thaiDay ใช้ UTC+7');

ok(D.median([3, 1, 2]) === 2 && D.median([1, 2, 3, 4]) === 2.5, 'median');
// Wilcoxon: d = [-1,-2,-3,-4,5] → W+ = 5, n = 5, var = 13.75, z = (5-7.5)/√13.75
const w = D.wilcoxon([10, 10, 10, 10, 10], [9, 8, 7, 6, 15]);
ok(w.n === 5 && w.Wplus === 5 && near(w.z, -2.5 / Math.sqrt(13.75)), 'wilcoxon W+ และ z');
// tie correction: |d| = [1,1,2] → ties t=2 → var = 3·4·7/24 − 6/48 = 3.375
const wt = D.wilcoxon([0, 0, 0, 5], [1, -1, 2, 5]);
ok(wt.n === 3 && wt.Wplus === 4.5 && near(wt.z, (4.5 - 3) / Math.sqrt(3.375)), 'wilcoxon tie correction และตัดผลต่าง 0');
ok(near(D.normCdf(1.959964), 0.975, 1e-6), 'normCdf(1.96) ≈ .975');
ok(near(D.spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1) && near(D.spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1), 'spearman ±1');
const b1 = D.bootstrapMedianDrop([10, 12, 8, 9, 14, 7], [5, 6, 4, 8, 3], 2000), b2 = D.bootstrapMedianDrop([10, 12, 8, 9, 14, 7], [5, 6, 4, 8, 3], 2000);
ok(b1.lo === b2.lo && b1.hi === b2.hi && b1.lo < b1.hi, 'bootstrap seed คงที่ ได้ผลซ้ำ');

// ── ส่วนที่ 2: ข้อมูลจริงจากแคช (อ่านอย่างเดียว) ──
const CACHE = path.join(__dirname, '..', 'backups', 'report-cache');
const COURSE = 'UZGy0pGurry9Dt9YdhYX';
if (!fs.existsSync(path.join(CACHE, 'usageEvents.json'))) {
    console.log('\n2) ข้ามการตรวจกับข้อมูลจริง (ไม่มี backups/report-cache — รัน tools/report/fetch-cache.js ก่อน)');
} else {
    console.log('\n2) ว31281 1/69 · ตัด 5-C, 3-B2, 5-D และบัญชีทดสอบ (แคช อ่านอย่างเดียว)');
    const L = (n) => JSON.parse(fs.readFileSync(path.join(CACHE, n + '.json'), 'utf8'));
    const course = L('courses').find(x => x.id === COURSE);
    const lock = course.gradesLocked ? D.tsSec(course.gradesLockedAt) : null;
    const submissions = L('submissions').filter(s => s.courseId === COURSE && s.countedInGrade !== false && !(lock !== null && D.tsSec(s.submittedAt) > lock));
    const events = L('usageEvents').filter(e => e.courseId === COURSE);
    const assignments = L('assignments').filter(a => a.courseId === COURSE);
    // เหมือนแท็บ: ผู้เรียน = ผู้ลงทะเบียน (บัญชีทดสอบ = ส่งงานแต่ไม่ได้ลงทะเบียน จึงถูกตัด)
    const uids = new Set(L('enrollments').filter(e => e.courseId === COURSE).map(e => e.studentId));
    const tests = new Set(submissions.map(s => s.studentId).filter(u => !uids.has(u)));
    ok(uids.size === 35 && tests.size === 1, 'ผู้เรียน 35 คน · บัญชีทดสอบ 1 บัญชี');
    // ค่าเริ่มต้นของแท็บ = กิจกรรมที่เผยแพร่ ต้องตรงกับการตัด 5-C, 3-B2, 5-D
    const pub = assignments.filter(a => D.parseActivity(a.title) && a.isPublished !== false).map(a => a.id);
    const excl = assignments.filter(a => D.parseActivity(a.title) && !['5-C', '3-B2', '5-D'].includes(D.parseActivity(a.title).code)).map(a => a.id);
    ok(pub.length === excl.length && pub.every(id => excl.includes(id)), 'กิจกรรมเผยแพร่ = ตัด 5-C, 3-B2, 5-D (' + pub.length + ' ข้อ)');

    const base = D.buildPairs({ submissions, events, assignments, uids, aids: new Set(pub) });
    const c = D.countPairs(base);
    ok(c.pairs === 692 && c.first === 326 && c.everFull === 639 && c.solved === 313,
        `คู่ ${c.pairs} · ถูกครั้งแรก ${c.first} · ได้เต็มในที่สุด ${c.everFull} · แก้สำเร็จ ${c.solved} (คาด 692/326/639/313)`);
    const cmp = D.compare(D.applyIdle(base, 15), [1, 2], [4, 5]);
    ok(cmp.early.n === 164 && D.fmt(cmp.early.mean) === '12.82' && D.fmt(cmp.early.median) === '7.80',
        `ต้นภาค n=${cmp.early.n} เฉลี่ย ${D.fmt(cmp.early.mean)} มัธยฐาน ${D.fmt(cmp.early.median)} (คาด 164/12.82/7.80)`);
    ok(cmp.late.n === 62 && D.fmt(cmp.late.mean) === '8.06' && D.fmt(cmp.late.median) === '4.94',
        `ปลายภาค n=${cmp.late.n} เฉลี่ย ${D.fmt(cmp.late.mean)} มัธยฐาน ${D.fmt(cmp.late.median)} (คาด 62/8.06/4.94)`);
    ok(cmp.indiv.n === 27 && cmp.indiv.decreased === 15 && near(cmp.indiv.z, -1.15, 0.005) && near(cmp.indiv.p, 0.25, 0.005),
        `รายบุคคล ${cmp.indiv.n} คน ลดลง ${cmp.indiv.decreased} z=${D.fmt(cmp.indiv.z)} p=${D.fmtP(cmp.indiv.p)} (คาด 27/15/−1.15/.25)`);
    ok(cmp.ciLo < cmp.pctDropMedian && cmp.pctDropMedian < cmp.ciHi, `bootstrap CI [${D.fmt(cmp.ciLo, 1)}, ${D.fmt(cmp.ciHi, 1)}] ครอบ ${D.fmt(cmp.pctDropMedian, 1)}%`);
}

console.log('\n' + (fail ? '❌' : '✅') + ' ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);

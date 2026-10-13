#!/usr/bin/env node
/**
 * scripts/seed-sandbox-course-update.js
 * สร้างการส่งงานจำลองชุดใหม่ให้รายวิชา Sandbox 3 วิชา สำหรับทดสอบกรณีคะแนนก้ำกึ่งเกณฑ์ (Borderline Mastery)
 *
 * สิ่งที่สคริปต์นี้ทำ
 *   1. คะแนน E1 รวมของนักเรียนจำลองแต่ละคนอยู่ในช่วง 75% – 82% (45–49 จาก 60 คะแนน)
 *      กระจายเป้าเป็น 48 (80.0% = เส้นเกรด A พอดี), 47, 49, 46, 45 วนไปตามลำดับ
 *      ทำให้มีทั้งคนที่อยู่ต่ำกว่า เท่ากับ และสูงกว่า 80% เล็กน้อย
 *      ข้อที่จำนวนกรณีทดสอบเอื้อ (เช่น 4, 5, 10 กรณี) จะได้คะแนนข้อนั้น 75–82% โดยตรง
 *      ข้อที่มี 1–3 กรณีทดสอบให้คะแนน 75–82% ไม่ได้ จึงใช้ 100% หรือคะแนนบางส่วนแทน
 *   2. จำลองการส่งซ้ำในบางข้อ ครั้งแรกได้ 40%–60% ครั้งต่อมาดีขึ้นจนถึงคะแนนสุดท้าย
 *      คะแนนไม่ลดลงระหว่างการส่ง คะแนนครั้งล่าสุดจึงเท่ากับคะแนนสูงสุดเสมอ
 *      ใช้ตรวจว่าเกณฑ์ 'latest' และ 'best' ให้ผลตรงกัน และประวัติการส่งเรียงเวลาถูกต้อง
 *   3. ลบ submissions และ grades เดิมของรายวิชาเหล่านี้ แล้วสร้างชุดใหม่
 *      ไม่แก้ assignments / testCases / users / enrollments
 *      แก้ courses เฉพาะการเพิ่มฟิลด์ scenario* ไม่แตะชื่อรายวิชาหรือการตั้งค่าอื่น
 *
 * ความปลอดภัยของข้อมูล
 *   - ทำงานกับรายวิชาที่ระบุไว้ใน SANDBOX_COURSES ด้านล่างเท่านั้น ไม่รับ courseId จาก command line
 *   - ตรวจทุกวิชาก่อนเขียน ถ้าวิชาใดไม่ผ่าน จะหยุดทั้งหมดโดยไม่เขียนอะไรเลย
 *       · courseId ขึ้นต้นด้วย sandbox- และเอกสารรายวิชามี isSandbox: true
 *       · จำนวนนักเรียนตรงกับที่กำหนด และนักเรียนทุกคนเป็นผู้ใช้ Sandbox ของวิชานั้น
 *       · ไม่มีเอกสารที่ไม่ใช่ Sandbox ใน assignments / enrollments / submissions / grades ของวิชานั้น
 *   - ลบเฉพาะเอกสารที่มี isSandbox: true และ sandboxCourseId ตรงกับวิชานั้น
 *   - โหมดทดลองเป็นค่าเริ่มต้น ต้องใส่ --apply เองจึงจะเขียน
 *
 * วิธีใช้:
 *   node scripts/seed-sandbox-course-update.js            (ทดลอง แสดงแผนและผลที่คาดไว้)
 *   node scripts/seed-sandbox-course-update.js --apply    (เขียนจริง แล้วอ่านกลับมาตรวจ)
 *   node scripts/seed-sandbox-course-update.js --verify   (อ่านข้อมูลปัจจุบันมาตรวจอย่างเดียว)
 *
 * ตัวเลือก:
 *   --seed <n>   ค่าตั้งต้นของตัวสุ่ม (ค่าเริ่มต้น 20261009) ใส่ค่าเดิมจะได้ข้อมูลชุดเดิม
 *   --days <n>   กระจายเวลาส่งงานย้อนหลังจากวันนี้กี่วัน (ค่าเริ่มต้น 14)
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
const { Timestamp, FieldValue } = admin.firestore;

// รายวิชาที่อนุญาตให้แก้ไข และจำนวนนักเรียนที่ต้องตรง
const SANDBOX_COURSES = [
    { id: 'sandbox-e1-test',   label: 'Sandbox1', students: 30 },
    { id: 'sandbox-e1-test-2', label: 'Sandbox2', students: 9 },
    { id: 'sandbox-e1-test-3', label: 'Sandbox3', students: 3 },
];

const SCENARIO = 'borderline-75-82-iterative';
const TARGETS  = [48, 47, 49, 46, 45];   // คะแนนรวมเป้าหมายจาก 60 วนตามลำดับนักเรียน
const BAND_LO = 75, BAND_HI = 82;        // ช่วงเป้าหมาย (%)
const FIRST_LO = 40, FIRST_HI = 60;      // คะแนนการส่งครั้งแรกของข้อที่ส่งซ้ำ (%)
const RESUBMIT_RATE = 0.35;              // สัดส่วนข้อที่จำลองการส่งซ้ำ ต่อนักเรียน

const args = process.argv.slice(2);
const argOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const baseSeed = parseInt(argOf('--seed') || '20261009', 10);
const days     = parseInt(argOf('--days') || '14', 10);
const APPLY  = args.includes('--apply');
const VERIFY = args.includes('--verify');

const abort = (msg) => { console.error('\n⛔ หยุดทำงาน: ' + msg + '\n'); process.exit(1); };
if (!(days >= 1 && days <= 120)) abort('--days ต้องอยู่ระหว่าง 1 ถึง 120');

// ── ตัวสุ่มแบบกำหนด seed ได้ (mulberry32) ─────────────────────────────────────
const makeRand = (seed) => {
    let s = seed >>> 0;
    const rand = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return { rand, randInt, pick, shuffle };
};
const hash = (str) => { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const unitNo = (u) => { const m = /(\d+)/.exec(u || ''); return m ? +m[1] : 99; };
const inBand = (x) => x >= BAND_LO && x <= BAND_HI;
const pct = (raw, total) => total > 0 ? raw / total * 100 : 0;

// ── เขียนเป็นชุด ชุดละไม่เกิน 400 เอกสาร ──────────────────────────────────────
const commitOps = async (ops, label) => {
    for (let i = 0; i < ops.length; i += 400) {
        const batch = db.batch();
        ops.slice(i, i + 400).forEach(op => op(batch));
        await batch.commit();
    }
    console.log('    ✓ ' + label + ': ' + ops.length);
};

// ═════════════════════════════════════════════════════════════════════════════
// โหลดและตรวจรายวิชา (อ่านอย่างเดียว)
// ═════════════════════════════════════════════════════════════════════════════
const loadCourse = async (cfg) => {
    const cid = cfg.id;
    if (!/^sandbox-[A-Za-z0-9_-]+$/.test(cid)) abort(cid + ' ไม่ใช่ courseId ของ Sandbox');

    const courseSnap = await db.collection('courses').doc(cid).get();
    if (!courseSnap.exists) abort('ไม่พบรายวิชา ' + cid);
    const course = courseSnap.data();
    if (course.isSandbox !== true) abort(cid + ' ไม่ได้ติดธง isSandbox');

    const col = {};
    for (const c of ['assignments', 'enrollments', 'submissions', 'grades']) {
        const snap = await db.collection(c).where('courseId', '==', cid).get();
        const other = snap.docs.filter(d => d.data().isSandbox !== true || d.data().sandboxCourseId !== cid);
        if (other.length) abort(cid + ': พบเอกสารที่ไม่ใช่ Sandbox ของวิชานี้ใน ' + c + ' ' + other.length + ' รายการ');
        col[c] = snap.docs;
    }

    const studentIds = col.enrollments.map(d => d.data().studentId);
    if (studentIds.length !== cfg.students) abort(cid + ': จำนวนนักเรียน ' + studentIds.length + ' ไม่ตรงกับที่กำหนด ' + cfg.students);
    if (new Set(studentIds).size !== studentIds.length) abort(cid + ': มี enrollment ซ้ำ');
    const students = [];
    for (const sid of studentIds) {
        if (!sid.startsWith(cid + '-s')) abort(cid + ': นักเรียน ' + sid + ' ไม่ใช่ผู้ใช้ Sandbox ของวิชานี้');
        const u = await db.collection('users').doc(sid).get();
        if (!u.exists || u.data().isSandbox !== true || u.data().sandboxCourseId !== cid) abort(cid + ': ผู้ใช้ ' + sid + ' ไม่ใช่ผู้ใช้ Sandbox');
        students.push({ id: sid, number: parseInt(u.data().number || '0', 10) });
    }
    students.sort((a, b) => a.number - b.number || a.id.localeCompare(b.id));

    const assignments = col.assignments
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => a.isPublished !== false && a.unitName)
        .sort((a, b) => unitNo(a.unitName) - unitNo(b.unitName) || (a.title || '').localeCompare(b.title || '', 'th'));
    for (const a of assignments) {
        const s = await db.collection('testCases').where('assignmentId', '==', a.id).get();
        if (s.docs.some(d => d.data().isSandbox !== true)) abort(cid + ': testCases ของ ' + a.id + ' ไม่ใช่ Sandbox');
        a.tests = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((x, y) => (x.order || 0) - (y.order || 0));
        if (!a.tests.length) abort(cid + ': โจทย์ ' + a.id + ' ไม่มี testCases');
    }
    const totalRaw = assignments.reduce((s, a) => s + (a.rawScore || 0), 0);

    return { cfg, cid, course, students, assignments, totalRaw, oldSubs: col.submissions, oldGrades: col.grades };
};

// ═════════════════════════════════════════════════════════════════════════════
// คะแนนที่เป็นไปได้ของแต่ละข้อ (จากผลรวมย่อยของคะแนนกรณีทดสอบ)
// ═════════════════════════════════════════════════════════════════════════════
const buildOptions = (a) => {
    const pts = a.tests.map(t => t.points || 1);
    const total = pts.reduce((s, p) => s + p, 0);
    const byScore = {};
    for (let mask = 0; mask < (1 << pts.length); mask++) {
        let earned = 0;
        pts.forEach((p, i) => { if (mask & (1 << i)) earned += p; });
        const score = Math.round(earned / total * 100);
        (byScore[score] = byScore[score] || []).push(mask);
    }
    a.totalPoints = total;
    a.options = Object.keys(byScore).map(Number).sort((x, y) => x - y).map(score => ({
        score, masks: byScore[score], raw: Math.round(score * (a.rawScore || 0) / 100),
    }));
};

// เลือกคะแนนสุดท้ายรายข้อให้ผลรวมเท่ากับเป้าพอดี (DP) โดยให้น้ำหนักกับคะแนนในช่วง 75–82% ก่อน
const planFinalScores = (assignments, target, R) => {
    const cost = (o) => {
        const base = inBand(o.score) ? 0 : o.score === 100 ? 1 : (o.score >= 67 && o.score < 100) ? 1.5 : o.score === 0 ? 20 : 4;
        return base + R.rand() * 0.8;   // ความแปรปรวนเล็กน้อยให้แต่ละคนต่างกัน
    };
    let dp = new Map([[0, { c: 0, picks: [] }]]);
    assignments.forEach(a => {
        const next = new Map();
        const costs = a.options.map(cost);
        dp.forEach((v, tot) => {
            a.options.forEach((o, oi) => {
                const t = tot + o.raw, c = v.c + costs[oi];
                if (t > target) return;
                const cur = next.get(t);
                if (!cur || c < cur.c) next.set(t, { c, picks: [...v.picks, oi] });
            });
        });
        dp = next;
    });
    const best = dp.get(target);
    if (!best) abort('หาชุดคะแนนที่รวมได้ ' + target + ' ไม่ได้');
    return best.picks.map((oi, i) => assignments[i].options[oi]);
};

// ═════════════════════════════════════════════════════════════════════════════
// สร้างการส่งงานชุดใหม่ของหนึ่งรายวิชา
// ═════════════════════════════════════════════════════════════════════════════
const generate = (ctx) => {
    const { cid, course, students, assignments } = ctx;
    const seed = (baseSeed ^ hash(cid)) >>> 0;
    const R = makeRand(seed);
    assignments.forEach(buildOptions);

    const now = Date.now();
    const start = now - days * 86400000;
    const ts = (ms) => Timestamp.fromMillis(Math.round(ms));
    const SBX = { isSandbox: true, sandboxCourseId: cid, scenario: SCENARIO };

    const order = R.shuffle(students.map((_, i) => i));   // ใครได้เป้าไหน
    const submissions = [], grades = [], perStudent = [];

    students.forEach((st, si) => {
        const target = TARGETS[order.indexOf(si) % TARGETS.length];
        const finals = planFinalScores(assignments, target, R);

        // ข้อที่ส่งซ้ำได้: ต้องมีคะแนน 40–60% ที่ทำได้จริง และต่ำกว่าคะแนนสุดท้าย
        const eligible = assignments.map((a, ai) => ai).filter(ai =>
            assignments[ai].options.some(o => o.score >= FIRST_LO && o.score <= FIRST_HI && o.score < finals[ai].score));
        let iterSet = new Set(eligible.filter(() => R.rand() < RESUBMIT_RATE));
        if (iterSet.size < 2) iterSet = new Set(R.shuffle(eligible).slice(0, Math.min(2, eligible.length)));

        let iterCount = 0;
        assignments.forEach((a, ai) => {
            const fin = finals[ai];
            // ลำดับคะแนนของการส่งแต่ละครั้ง (ไม่ลดลง)
            const seq = [];
            if (iterSet.has(ai)) {
                iterCount++;
                const first = R.pick(a.options.filter(o => o.score >= FIRST_LO && o.score <= FIRST_HI && o.score < fin.score));
                seq.push(first);
                const mids = a.options.filter(o => o.score > first.score && o.score < fin.score);
                if (mids.length && R.rand() < 0.45) seq.push(R.pick(mids));
                seq.push(fin);
            } else {
                seq.push(fin);
            }

            const openAt = start + (ai / assignments.length) * (now - start) * 0.85;
            let t = openAt + R.rand() * Math.max((now - openAt) * 0.4, 3600000);
            const subs = [];
            seq.forEach((o, k) => {
                if (k > 0) {
                    // ส่งซ้ำ: ส่วนใหญ่ภายในไม่กี่ชั่วโมง บางครั้งกลับมาแก้ข้ามวัน
                    t += (R.rand() < 0.25 ? R.randInt(12 * 60, 48 * 60) : R.randInt(8, 180)) * 60000;
                }
                t = Math.min(t, now - (seq.length - k) * 60000);
                const mask = R.pick(o.masks);
                const results = a.tests.map((tc, i) => {
                    const passed = !!(mask & (1 << i));
                    return {
                        testCaseId: tc.id, passed,
                        actualOutput: passed ? (tc.expectedOutput || '') : 'wrong output',
                        executionTime: R.randInt(900, 2200),
                        errorLog: null,
                    };
                });
                const passedTests = results.filter(r => r.passed).length;
                const status = passedTests === results.length ? 'accepted' : 'wrong_answer';
                const ref = db.collection('submissions').doc();
                subs.push({
                    ref, score: o.score, at: t,
                    data: {
                        ...SBX, studentId: st.id, assignmentId: a.id, courseId: cid,
                        code: '// sandbox mock submission — no real code\n',
                        language: course.language || 'c', status,
                        executionTime: Math.max(...results.map(r => r.executionTime)),
                        passedTests, totalTests: results.length, score: o.score, totalPoints: a.totalPoints,
                        testResults: results, aiScore: null, aiMetrics: null,
                        attemptNo: k + 1, attemptsTotal: seq.length,
                        submittedAt: ts(t),
                    },
                });
            });
            submissions.push(...subs);

            // สมุดเกรดตามเกณฑ์ของรายวิชา (ลำดับไม่ลด จึงได้ครั้งเดียวกันทั้งสองเกณฑ์)
            const chosen = course.gradingPolicy === 'latest'
                ? subs[subs.length - 1]
                : subs.reduce((b, s) => (s.score >= b.score ? s : b), subs[0]);
            grades.push({
                ...SBX, studentId: st.id, courseId: cid, assignmentId: a.id,
                score: chosen.score, maxScore: a.totalPoints, submissionId: chosen.ref.id,
                gradingPolicy: course.gradingPolicy === 'latest' ? 'latest' : 'best', gradedAt: ts(chosen.at),
            });
        });
        perStudent.push({ id: st.id, target, iterCount });
    });

    return { seed, submissions, grades, perStudent };
};

// ═════════════════════════════════════════════════════════════════════════════
// ตรวจผลด้วยสูตรเดียวกับหน้า Teacher Analytics (ตาราง E1 /60)
// ═════════════════════════════════════════════════════════════════════════════
const evaluate = (assignments, totalRaw, subs, gradeDocs) => {
    const raw = Object.fromEntries(assignments.map(a => [a.id, a.rawScore || 0]));
    const latest = {}, best = {}, count = {};
    subs.forEach(s => {
        const k = s.studentId + '|' + s.assignmentId;
        const t = s.submittedAt.toMillis();
        if (!latest[k] || t >= latest[k].t) latest[k] = { t, score: s.score || 0 };
        best[k] = Math.max(best[k] || 0, s.score || 0);
        count[k] = (count[k] || 0) + 1;
    });
    const sids = [...new Set(subs.map(s => s.studentId))];
    const total = (pickFn) => Object.fromEntries(sids.map(sid => [sid,
        assignments.reduce((sum, a) => sum + Math.round((pickFn(sid + '|' + a.id) || 0) * raw[a.id] / 100), 0)]));
    const byLatest = total(k => latest[k]?.score);
    const byBest   = total(k => best[k]);
    const gradeMap = Object.fromEntries(gradeDocs.map(g => [g.studentId + '|' + g.assignmentId, g.score]));
    const byGrades = total(k => gradeMap[k]);

    const keys = Object.keys(count);
    const multi = keys.filter(k => count[k] > 1);
    const improved = multi.filter(k => latest[k].score === best[k]);
    const firstLow = multi.filter(k => {
        const first = subs.filter(s => s.studentId + '|' + s.assignmentId === k).sort((x, y) => x.submittedAt.toMillis() - y.submittedAt.toMillis())[0];
        return first.score >= FIRST_LO && first.score <= FIRST_HI;
    });
    const perSubInBand = subs.filter(s => inBand(s.score)).length;
    return { sids, byLatest, byBest, byGrades, multi: multi.length, improved: improved.length, firstLow: firstLow.length, pairs: keys.length, perSubInBand };
};

const printEval = (ctx, ev, title) => {
    const pcts = ev.sids.map(sid => pct(ev.byLatest[sid], ctx.totalRaw));
    const allIn = pcts.every(inBand);
    const sameBest = ev.sids.every(sid => ev.byLatest[sid] === ev.byBest[sid]);
    const sameGrades = ev.sids.every(sid => ev.byLatest[sid] === ev.byGrades[sid]);
    const dist = {};
    ev.sids.forEach(sid => { dist[ev.byLatest[sid]] = (dist[ev.byLatest[sid]] || 0) + 1; });
    console.log('  ' + title);
    console.log('    E1 รายคน (เกณฑ์ล่าสุด) : ' + (pcts.length ? Math.min(...pcts).toFixed(1) + '% – ' + Math.max(...pcts).toFixed(1) + '%' : '-') + (allIn ? '  ✓ อยู่ในช่วง ' : '  ✗ มีคนอยู่นอกช่วง ') + BAND_LO + '–' + BAND_HI + '%');
    console.log('    การกระจาย (/' + ctx.totalRaw + ')       : ' + Object.keys(dist).sort().map(k => k + ' → ' + dist[k] + ' คน (' + pct(+k, ctx.totalRaw).toFixed(1) + '%)').join(', '));
    console.log('    ต่ำกว่า / เท่ากับ / สูงกว่า 80% : ' +
        pcts.filter(p => p < 80 - 1e-9).length + ' / ' + pcts.filter(p => Math.abs(p - 80) < 1e-9).length + ' / ' + pcts.filter(p => p > 80 + 1e-9).length + ' คน');
    console.log('    ข้อที่ส่งมากกว่า 1 ครั้ง     : ' + ev.multi + ' จาก ' + ev.pairs + ' (ครั้งแรก 40–60%: ' + ev.firstLow + ', ครั้งล่าสุด = สูงสุด: ' + ev.improved + ')');
    console.log('    การส่งที่ได้ 75–82% รายข้อ   : ' + ev.perSubInBand);
    console.log('    เกณฑ์ล่าสุด = เกณฑ์สูงสุด     : ' + (sameBest ? '✓ ตรงกันทุกคน' : '✗ ไม่ตรง'));
    console.log('    สมุดเกรด = ผลจาก submissions : ' + (sameGrades ? '✓ ตรงกันทุกคน' : '✗ ไม่ตรง'));
    return allIn && sameBest && sameGrades;
};

// ═════════════════════════════════════════════════════════════════════════════
const main = async () => {
    console.log('\nโหลดและตรวจความปลอดภัยของรายวิชา Sandbox ' + SANDBOX_COURSES.length + ' วิชา...');
    const ctxs = [];
    for (const cfg of SANDBOX_COURSES) ctxs.push(await loadCourse(cfg));
    console.log('✓ ผ่านการตรวจทุกวิชา (รายวิชา นักเรียน และเอกสารทั้งหมดเป็น Sandbox)');

    if (VERIFY) {
        let ok = true;
        for (const ctx of ctxs) {
            console.log('\n── ' + ctx.cfg.label + ' (' + ctx.cid + ') ' + ctx.students.length + ' คน · ' + ctx.oldSubs.length + ' submissions');
            const ev = evaluate(ctx.assignments, ctx.totalRaw, ctx.oldSubs.map(d => d.data()), ctx.oldGrades.map(d => d.data()));
            ok = printEval(ctx, ev, 'ข้อมูลปัจจุบัน') && ok;
        }
        console.log(ok ? '\n✅ ข้อมูลตรงตามเงื่อนไข\n' : '\n⚠️  ข้อมูลยังไม่ตรงตามเงื่อนไข\n');
        return;
    }

    const plans = ctxs.map(ctx => ({ ctx, gen: generate(ctx) }));
    let ok = true;
    for (const { ctx, gen } of plans) {
        console.log('\n── ' + ctx.cfg.label + ' (' + ctx.cid + ') ' + (ctx.course.title || ''));
        console.log('    นักเรียน ' + ctx.students.length + ' คน · โจทย์ ' + ctx.assignments.length + ' ข้อ (' + ctx.totalRaw + ' คะแนน) · เกณฑ์ ' + (ctx.course.gradingPolicy || 'best') + ' · seed ' + gen.seed);
        console.log('    จะลบ submissions ' + ctx.oldSubs.length + ' · grades ' + ctx.oldGrades.length);
        console.log('    จะสร้าง submissions ' + gen.submissions.length + ' · grades ' + gen.grades.length);
        const ev = evaluate(ctx.assignments, ctx.totalRaw, gen.submissions.map(s => s.data), gen.grades);
        ok = printEval(ctx, ev, 'ผลที่คาดไว้') && ok;
    }
    if (!ok) abort('ชุดข้อมูลที่สร้างไม่ผ่านเงื่อนไข ไม่เขียนข้อมูล');
    if (!APPLY) { console.log('\n(โหมดทดลอง ยังไม่ได้เขียนข้อมูล ใส่ --apply เพื่อเขียนจริง)\n'); return; }

    console.log('\nกำลังเขียน...');
    for (const { ctx, gen } of plans) {
        console.log('  ' + ctx.cfg.label + ' (' + ctx.cid + ')');
        const isMine = (d) => d.data().isSandbox === true && d.data().sandboxCourseId === ctx.cid && d.data().courseId === ctx.cid;
        if (![...ctx.oldSubs, ...ctx.oldGrades].every(isMine)) abort(ctx.cid + ': พบเอกสารที่ไม่ใช่ของ Sandbox นี้ในรายการลบ');
        await commitOps(ctx.oldSubs.map(d => (b) => b.delete(d.ref)), 'ลบ submissions เดิม');
        await commitOps(ctx.oldGrades.map(d => (b) => b.delete(d.ref)), 'ลบ grades เดิม');
        await commitOps(gen.submissions.map(s => (b) => b.create(s.ref, s.data)), 'สร้าง submissions');
        await commitOps(gen.grades.map(g => (b) => b.create(db.collection('grades').doc(), g)), 'สร้าง grades');
        await db.collection('courses').doc(ctx.cid).update({
            scenario: SCENARIO, scenarioSeed: gen.seed, scenarioUpdatedAt: FieldValue.serverTimestamp(),
        });
        console.log('    ✓ courses: เพิ่มฟิลด์ scenario');
    }

    // อ่านกลับมาตรวจจาก Firestore
    console.log('\nอ่านข้อมูลกลับมาตรวจ...');
    let okAfter = true;
    for (const { ctx } of plans) {
        const subs = (await db.collection('submissions').where('courseId', '==', ctx.cid).get()).docs.map(d => d.data());
        const grs  = (await db.collection('grades').where('courseId', '==', ctx.cid).get()).docs.map(d => d.data());
        console.log('\n── ' + ctx.cfg.label + ' (' + ctx.cid + ') submissions ' + subs.length + ' · grades ' + grs.length);
        okAfter = printEval(ctx, evaluate(ctx.assignments, ctx.totalRaw, subs, grs), 'ข้อมูลใน Firestore') && okAfter;
    }
    console.log(okAfter ? '\n✅ อัปเดต Sandbox ทั้ง 3 วิชาเรียบร้อย\n' : '\n⚠️  เขียนแล้วแต่ผลตรวจไม่ผ่าน ตรวจสอบอีกครั้ง\n');
};

main().then(() => process.exit(0)).catch(e => { console.error('\n❌', e.message); process.exit(1); });

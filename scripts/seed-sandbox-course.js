#!/usr/bin/env node
/**
 * scripts/seed-sandbox-course.js
 * สร้างรายวิชาทดสอบ (Sandbox) ใหม่ พร้อมนักเรียนจำลองและการส่งงานแบบสุ่ม
 * ใช้ทดสอบหน้า Teacher Analytics (ตาราง E1) และปุ่ม Export CSV
 *
 * โครงสร้างโจทย์คัดลอกจากรายวิชาต้นแบบ (อ่านอย่างเดียว) เฉพาะกิจกรรมที่นับคะแนน E1
 * คือ assignments ที่เผยแพร่และระบุหน่วยการเรียนรู้ (20 ข้อ 60 คะแนน) พร้อม testCases
 *
 * คุณสมบัติด้านความปลอดภัยของข้อมูล
 *   - โหมดทดลองเป็นค่าเริ่มต้น ต้องใส่ --apply เองจึงจะเขียน
 *   - courseId ต้องขึ้นต้นด้วย "sandbox-" และต้องยังไม่มีอยู่ในระบบ
 *   - หยุดทันทีถ้ามี enrollments / submissions / grades / assignments ใด ๆ ใช้ courseId นี้อยู่แล้ว
 *   - เขียนด้วย create() เท่านั้น ถ้าเอกสารปลายทางมีอยู่แล้ว Firestore จะปฏิเสธ ไม่มีการเขียนทับ
 *   - ไม่แก้ไขเอกสารเดิมใด ๆ รวมถึงรายวิชาต้นแบบ
 *   - ทุกเอกสารที่สร้างมี isSandbox: true และชื่อขึ้นต้นด้วย [SANDBOX]
 *   - นักเรียนจำลองมีแค่เอกสารใน users ไม่มีบัญชี Firebase Auth จึงเข้าสู่ระบบไม่ได้
 *   - --delete ลบเฉพาะเอกสารที่มี isSandbox: true ของรายวิชานี้
 *
 * วิธีใช้:
 *   node scripts/seed-sandbox-course.js --course sandbox-e1-test --users 30
 *   node scripts/seed-sandbox-course.js --course sandbox-e1-test --users 30 --apply
 *   node scripts/seed-sandbox-course.js --course sandbox-e1-test --delete --apply
 *
 * ตัวเลือก:
 *   --course <id>     รหัสรายวิชาใหม่ (ต้องขึ้นต้นด้วย sandbox-)
 *   --users <n>       จำนวนนักเรียนจำลอง (ค่าเริ่มต้น 30, สูงสุด 200)
 *   --source <id>     รายวิชาต้นแบบของโจทย์ (ค่าเริ่มต้น ว31281 1/69)
 *   --teacher <uid>   ครูเจ้าของรายวิชา Sandbox (ค่าเริ่มต้น ครูของรายวิชาต้นแบบ)
 *   --days <n>        กระจายเวลาส่งงานย้อนหลังจากวันนี้กี่วัน (ค่าเริ่มต้น 14)
 *   --seed <n>        ค่าตั้งต้นของตัวสุ่ม ใส่ค่าเดิมจะได้ข้อมูลชุดเดิม
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
const { Timestamp } = admin.firestore;

const args = process.argv.slice(2);
const argOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const courseId  = argOf('--course');
const userCount = parseInt(argOf('--users') || '30', 10);
const sourceId  = argOf('--source') || 'UZGy0pGurry9Dt9YdhYX';
const teacherArg = argOf('--teacher');
const days      = parseInt(argOf('--days') || '14', 10);
const seed      = parseInt(argOf('--seed') || String(Date.now() % 1e9), 10);
const APPLY  = args.includes('--apply');
const DELETE = args.includes('--delete');

const abort = (msg) => { console.error('\n⛔ หยุดทำงาน: ' + msg + '\n'); process.exit(1); };

if (!courseId) abort('ต้องระบุ --course <courseId>');
if (!/^sandbox-[A-Za-z0-9_-]{1,60}$/.test(courseId)) abort('courseId ต้องขึ้นต้นด้วย "sandbox-" และใช้ได้เฉพาะ A-Z a-z 0-9 _ -');
if (courseId === sourceId) abort('courseId ต้องไม่ซ้ำกับรายวิชาต้นแบบ');
if (!DELETE && !(userCount >= 1 && userCount <= 200)) abort('--users ต้องอยู่ระหว่าง 1 ถึง 200');
if (!(days >= 1 && days <= 120)) abort('--days ต้องอยู่ระหว่าง 1 ถึง 120');

// ── ตัวสุ่มแบบกำหนด seed ได้ (mulberry32) ─────────────────────────────────────
let _s = seed >>> 0;
const rand = () => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const gauss = () => { const u = 1 - rand(), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

const unitNo = (u) => { const m = /(\d+)/.exec(u || ''); return m ? +m[1] : 99; };
const pad = (n) => String(n).padStart(2, '0');

// ── เขียนเป็นชุด ชุดละไม่เกิน 400 เอกสาร ──────────────────────────────────────
const commitOps = async (ops, label) => {
    for (let i = 0; i < ops.length; i += 400) {
        const batch = db.batch();
        ops.slice(i, i + 400).forEach(op => op(batch));
        await batch.commit();
    }
    console.log('  ✓ ' + label + ': ' + ops.length);
};

// ── ตรวจว่ามีเอกสารที่ไม่ใช่ Sandbox ใช้ courseId นี้อยู่หรือไม่ ──────────────────
const COURSE_COLLECTIONS = ['assignments', 'enrollments', 'submissions', 'grades'];
const scanCourse = async () => {
    const out = {};
    for (const c of COURSE_COLLECTIONS) {
        const snap = await db.collection(c).where('courseId', '==', courseId).get();
        out[c] = { sandbox: snap.docs.filter(d => d.data().isSandbox === true), other: snap.docs.filter(d => d.data().isSandbox !== true) };
    }
    return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// โหมดลบ
// ═════════════════════════════════════════════════════════════════════════════
const runDelete = async () => {
    const courseSnap = await db.collection('courses').doc(courseId).get();
    if (!courseSnap.exists) abort('ไม่พบรายวิชา ' + courseId);
    if (courseSnap.data().isSandbox !== true) abort('รายวิชานี้ไม่ได้ติดธง isSandbox จะไม่ลบอะไรทั้งสิ้น');

    const found = await scanCourse();
    const otherTotal = COURSE_COLLECTIONS.reduce((s, c) => s + found[c].other.length, 0);
    if (otherTotal > 0) abort('พบเอกสารที่ไม่ใช่ Sandbox ' + otherTotal + ' รายการในรายวิชานี้ ไม่ลบเพื่อความปลอดภัย');

    const assignIds = found.assignments.sandbox.map(d => d.id);
    const tcDocs = [];
    for (const aid of assignIds) {
        const s = await db.collection('testCases').where('assignmentId', '==', aid).get();
        tcDocs.push(...s.docs.filter(d => d.data().isSandbox === true));
    }
    const userSnap = await db.collection('users').where('sandboxCourseId', '==', courseId).get();
    const userDocs = userSnap.docs.filter(d => d.data().isSandbox === true);

    const plan = { testCases: tcDocs, users: userDocs, courses: [courseSnap] };
    COURSE_COLLECTIONS.forEach(c => { plan[c] = found[c].sandbox; });

    console.log('\nจะลบเอกสาร Sandbox ของรายวิชา ' + courseId);
    Object.entries(plan).forEach(([c, docs]) => console.log('  ' + c.padEnd(12) + docs.length));
    if (!APPLY) { console.log('\n(โหมดทดลอง ยังไม่ได้ลบ ใส่ --apply เพื่อลบจริง)\n'); return; }

    for (const [c, docs] of Object.entries(plan)) {
        await commitOps(docs.map(d => (b) => b.delete(d.ref)), 'ลบ ' + c);
    }
    console.log('\n✅ ลบรายวิชา Sandbox เรียบร้อย\n');
};

// ═════════════════════════════════════════════════════════════════════════════
// โหมดสร้าง
// ═════════════════════════════════════════════════════════════════════════════
const runSeed = async () => {
    // ── Safety guard ────────────────────────────────────────────────────────
    const existing = await db.collection('courses').doc(courseId).get();
    if (existing.exists) {
        abort('มีรายวิชา ' + courseId + ' อยู่แล้ว (' + (existing.data().title || '-') + ')' +
            (existing.data().isSandbox === true ? ' ถ้าต้องการสร้างใหม่ให้ใช้ --delete --apply ก่อน' : ' และไม่ใช่รายวิชา Sandbox'));
    }
    const found = await scanCourse();
    for (const c of COURSE_COLLECTIONS) {
        const n = found[c].sandbox.length + found[c].other.length;
        if (n > 0) abort('มีเอกสารใน ' + c + ' ใช้ courseId นี้อยู่แล้ว ' + n + ' รายการ');
    }

    // ── อ่านรายวิชาต้นแบบ (อ่านอย่างเดียว) ───────────────────────────────────────
    const srcSnap = await db.collection('courses').doc(sourceId).get();
    if (!srcSnap.exists) abort('ไม่พบรายวิชาต้นแบบ ' + sourceId);
    const src = srcSnap.data();
    const teacherId = teacherArg || src.teacherId;
    const teacherSnap = await db.collection('users').doc(teacherId).get();
    if (!teacherSnap.exists) abort('ไม่พบผู้ใช้ครู ' + teacherId);

    const aSnap = await db.collection('assignments').where('courseId', '==', sourceId).get();
    const srcAssign = aSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => a.isPublished !== false && a.unitName)
        .sort((a, b) => unitNo(a.unitName) - unitNo(b.unitName) || (a.title || '').localeCompare(b.title || '', 'th'));
    const totalRaw = srcAssign.reduce((s, a) => s + (a.rawScore || 0), 0);

    const testsByAssign = {};
    for (const a of srcAssign) {
        const s = await db.collection('testCases').where('assignmentId', '==', a.id).get();
        testsByAssign[a.id] = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((x, y) => (x.order || 0) - (y.order || 0));
        if (testsByAssign[a.id].length === 0) abort('โจทย์ ' + a.title + ' ในรายวิชาต้นแบบไม่มี testCases');
    }

    const now = Date.now();
    const start = now - days * 86400000;
    const ts = (ms) => Timestamp.fromMillis(Math.round(ms));
    const SBX = { isSandbox: true, sandboxCourseId: courseId };

    // ── รายวิชา ────────────────────────────────────────────────────────────
    const courseDoc = {
        ...SBX,
        title: '[SANDBOX] ทดสอบ Analytics E1 (ข้อมูลจำลอง ไม่ใช่ข้อมูลจริง)',
        description: 'รายวิชาทดสอบที่สร้างโดย scripts/seed-sandbox-course.js ข้อมูลทั้งหมดเป็นข้อมูลสุ่ม ห้ามนำไปใช้ในรายงาน',
        language: src.language || 'c',
        grade: src.grade || '', room: 'SANDBOX',
        teacherId, coTeacherIds: [],
        classCode: null,
        status: 'active', isPublished: false,
        academicYear: src.academicYear || '', semester: src.semester || '',
        directoryTree: src.directoryTree || [],
        gradingPolicy: src.gradingPolicy === 'latest' ? 'latest' : 'best',
        gradesLocked: false,
        enrollmentCount: userCount,
        copiedFrom: sourceId,
        seed,
        createdAt: ts(start - 86400000),
    };

    // ── โจทย์และกรณีทดสอบ ──────────────────────────────────────────────────────
    const assignments = srcAssign.map((a, i) => {
        const id = courseId + '-a' + pad(i + 1);
        const { id: _drop, ...rest } = a;
        const tests = testsByAssign[a.id].map((t, j) => {
            const { id: _t, ...tr } = t;
            return { id: id + '-t' + pad(j + 1), data: { ...tr, ...SBX, assignmentId: id, createdAt: ts(start - 86400000) } };
        });
        const totalPoints = tests.reduce((s, t) => s + (t.data.points || 1), 0);
        return {
            id, tests, totalPoints, difficulty: a.difficulty,
            data: { ...rest, ...SBX, courseId, copiedFromAssignment: a.id, totalPoints, createdAt: ts(start - 86400000) },
        };
    });

    // ── นักเรียนจำลอง ──────────────────────────────────────────────────────────
    const students = Array.from({ length: userCount }, (_, i) => {
        const id = courseId + '-s' + pad(i + 1);
        return {
            id,
            ability: clamp(0.72 + 0.17 * gauss(), 0.15, 0.99),   // ความสามารถของแต่ละคน
            persistence: clamp(0.85 + 0.12 * gauss(), 0.4, 1),   // แนวโน้มที่จะทำโจทย์แต่ละข้อ
            data: {
                ...SBX,
                displayName: '[SANDBOX] นักเรียนทดสอบ ' + pad(i + 1),
                email: id + '@sandbox.invalid',
                role: 'student', approvedByAdmin: true,
                studentCode: 'SBX' + pad(i + 1), number: String(i + 1),
                grade: src.grade || '', room: 'SANDBOX',
                profilePhotoURL: null,
                enrolledCourses: [courseId],
                createdAt: ts(start - 86400000),
            },
        };
    });

    // ── สุ่มการส่งงาน ────────────────────────────────────────────────────────
    // โจทย์แต่ละข้อเปิดตามลำดับในช่วงเวลา ผู้เรียนส่งได้หลายครั้ง
    // แต่ละครั้งกรณีทดสอบผ่านด้วยความน่าจะเป็นที่ขึ้นกับความสามารถ ความยาก และจำนวนครั้งที่ลอง
    const DIFF = { 'ง่าย': 0.12, 'ปานกลาง': 0, 'ยาก': -0.15 };
    const submissions = [];
    const grades = [];
    assignments.forEach((a, ai) => {
        const openAt = start + (ai / assignments.length) * (now - start) * 0.85;
        const windowMs = Math.max((now - openAt) * 0.6, 3600000);
        students.forEach(st => {
            if (rand() > st.persistence) return;                 // ไม่ส่งข้อนี้
            const attempts = 1 + Math.min(Math.floor(-Math.log(1 - rand()) * (1.8 - st.ability)), 9);
            let t = openAt + rand() * windowMs;
            const subs = [];
            for (let k = 0; k < attempts; k++) {
                const p = clamp(st.ability + (DIFF[a.difficulty] || 0) + 0.08 * k + 0.08 * gauss(), 0.02, 0.995);
                const compileErr = rand() < 0.10 * (1 - st.ability) * (k === 0 ? 1.5 : 0.7);
                const results = a.tests.map(tc => {
                    const passed = !compileErr && rand() < p;
                    return {
                        testCaseId: tc.id, passed,
                        actualOutput: passed ? (tc.data.expectedOutput || '') : (compileErr ? '' : 'wrong output'),
                        executionTime: randInt(900, 2200),
                        errorLog: compileErr ? 'error: expected \';\' before \'}\' token (sandbox)' : null,
                    };
                });
                const passedTests = results.filter(r => r.passed).length;
                const earned = a.tests.reduce((s, tc, i) => s + (results[i].passed ? (tc.data.points || 1) : 0), 0);
                const score = a.totalPoints > 0 ? Math.round(earned / a.totalPoints * 100) : 0;
                const status = compileErr ? 'compile_error' : passedTests < results.length ? 'wrong_answer' : 'accepted';
                const ref = db.collection('submissions').doc();
                subs.push({
                    ref, score, at: t,
                    data: {
                        ...SBX, studentId: st.id, assignmentId: a.id, courseId,
                        code: '// sandbox mock submission — no real code\n',
                        language: courseDoc.language, status,
                        executionTime: Math.max(...results.map(r => r.executionTime)),
                        passedTests, totalTests: results.length, score, totalPoints: a.totalPoints,
                        testResults: results, aiScore: null, aiMetrics: null,
                        submittedAt: ts(t),
                    },
                });
                if (status === 'accepted' && rand() < 0.8) break;   // ได้เต็มแล้วส่วนใหญ่หยุด
                t += randInt(2, 40) * 60000;
                if (t > now) break;
            }
            submissions.push(...subs);
            const chosen = courseDoc.gradingPolicy === 'latest'
                ? subs[subs.length - 1]
                : subs.reduce((b, s) => (s.score > b.score ? s : b), subs[0]);
            grades.push({
                ...SBX, studentId: st.id, courseId, assignmentId: a.id,
                score: chosen.score, maxScore: a.totalPoints, submissionId: chosen.ref.id,
                gradingPolicy: courseDoc.gradingPolicy, gradedAt: ts(chosen.at),
            });
        });
    });

    // ── สรุปก่อนเขียน ─────────────────────────────────────────────────────────
    const rawOf = Object.fromEntries(assignments.map(a => [a.id, a.data.rawScore || 0]));
    const perStudent = students.map(st => grades.filter(g => g.studentId === st.id)
        .reduce((s, g) => s + Math.round(g.score * rawOf[g.assignmentId] / 100), 0));
    const active = perStudent.filter((_, i) => grades.some(g => g.studentId === students[i].id));
    const e1 = active.length ? active.reduce((s, v) => s + v / totalRaw * 100, 0) / active.length : 0;

    console.log('\n==================================================');
    console.log('รายวิชา Sandbox : ' + courseId);
    console.log('ครูเจ้าของ      : ' + (teacherSnap.data().displayName || teacherId));
    console.log('ต้นแบบโจทย์     : ' + (src.title || sourceId) + ' (อ่านอย่างเดียว)');
    console.log('โจทย์ E1        : ' + assignments.length + ' ข้อ คะแนนดิบรวม ' + totalRaw);
    console.log('กรณีทดสอบ       : ' + assignments.reduce((s, a) => s + a.tests.length, 0));
    console.log('นักเรียนจำลอง   : ' + students.length);
    console.log('การส่งงาน       : ' + submissions.length + ' (ช่วง ' + new Date(start).toISOString().slice(0, 10) + ' ถึง ' + new Date(now).toISOString().slice(0, 10) + ')');
    console.log('สมุดเกรด        : ' + grades.length);
    console.log('เกณฑ์คิดคะแนน   : ' + courseDoc.gradingPolicy);
    console.log('E1 ที่สุ่มได้     : ' + e1.toFixed(2) + ' (ผลจากการสุ่ม ไม่ได้กำหนดเป้า)');
    console.log('seed            : ' + seed);
    console.log('==================================================');

    if (assignments.length !== 20 || totalRaw !== 60) {
        console.log('\n⚠️  จำนวนโจทย์หรือคะแนนรวมไม่ตรงกับ 20 ข้อ / 60 คะแนน ตรวจรายวิชาต้นแบบอีกครั้ง');
    }
    if (!APPLY) { console.log('\n(โหมดทดลอง ยังไม่ได้เขียนข้อมูล ใส่ --apply เพื่อเขียนจริง)\n'); return; }

    // ── เขียน (create เท่านั้น) ──────────────────────────────────────────────
    console.log('\nกำลังเขียน...');
    await db.collection('courses').doc(courseId).create(courseDoc);
    console.log('  ✓ courses: 1');
    await commitOps(assignments.map(a => (b) => b.create(db.collection('assignments').doc(a.id), a.data)), 'assignments');
    await commitOps(assignments.flatMap(a => a.tests.map(t => (b) => b.create(db.collection('testCases').doc(t.id), t.data))), 'testCases');
    await commitOps(students.map(s => (b) => b.create(db.collection('users').doc(s.id), s.data)), 'users');
    await commitOps(students.map(s => (b) => b.create(db.collection('enrollments').doc(), {
        ...SBX, studentId: s.id, courseId, progress: 0, completedLessons: [],
        enrolledAt: ts(start - 86400000), lastAccessedAt: ts(now),
    })), 'enrollments');
    await commitOps(submissions.map(s => (b) => b.create(s.ref, s.data)), 'submissions');
    await commitOps(grades.map(g => (b) => b.create(db.collection('grades').doc(), g)), 'grades');

    console.log('\n✅ สร้างรายวิชา Sandbox เรียบร้อย');
    console.log('   เปิดดูที่ #/teacher/analytics?course=' + courseId);
    console.log('   ลบทิ้ง: node scripts/seed-sandbox-course.js --course ' + courseId + ' --delete --apply\n');
};

(DELETE ? runDelete() : runSeed()).then(() => process.exit(0)).catch(e => { console.error('\n❌', e.message); process.exit(1); });

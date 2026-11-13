#!/usr/bin/env node
/**
 * tools/studio/seed_emulator.js — ใส่ข้อมูลจำลองลง Firebase Emulator (APCC v6.0 Studio, Phase 0)
 *
 * ใช้ข้อมูลสมมุติทั้งหมด ไม่มีข้อมูลนักเรียนจริง
 * สคริปต์ปฏิเสธการทำงานถ้าไม่ได้ชี้ไปที่ emulator (กันการเขียนลง production โดยไม่ตั้งใจ)
 *
 * วิธีใช้ (เปิด emulator ไว้อีกหน้าต่างด้วย `firebase emulators:start`)
 *   PowerShell:
 *     $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"; $env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
 *     node tools/studio/seed_emulator.js
 *   แล้วเปิด http://localhost:5000/?emulator=1  (หรือ http://localhost/AI-Powered-C/?emulator=1 ผ่าน XAMPP)
 *
 * บัญชีที่สร้าง (รหัสผ่าน apcc1234 ทุกบัญชี)
 *   admin@test.local, teacher@test.local, s01@test.local … s05@test.local
 *
 * รายวิชาที่สร้าง
 *   emu-c-legacy   — รายวิชาภาษา C จำลอง ไม่มีฟิลด์ studio (ใช้ทดสอบความเข้ากันได้ย้อนหลัง ข้อ 7.1)
 *   emu-py-studio  — รายวิชา Python จำลอง สำหรับทดสอบ Studio (ยังไม่มีฟิลด์ studio จนกว่า Phase 1 จะเปิด)
 */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.error('❌ ต้องตั้ง FIRESTORE_EMULATOR_HOST และ FIREBASE_AUTH_EMULATOR_HOST ก่อน — สคริปต์นี้ใช้กับ emulator เท่านั้น');
    process.exit(1);
}
admin.initializeApp({ projectId: 'ai-powered-coding-596ed' });
const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp();
const PASSWORD = 'apcc1234';

const USERS = [
    { uid: 'emu-admin',   email: 'admin@test.local',   displayName: 'ผู้ดูแลจำลอง', role: 'admin' },
    { uid: 'emu-teacher', email: 'teacher@test.local', displayName: 'ครูจำลอง',     role: 'teacher' },
    ...[1, 2, 3, 4, 5].map(i => ({
        uid: `emu-s0${i}`, email: `s0${i}@test.local`, displayName: `นักเรียนจำลอง S0${i}`, role: 'student',
        studentCode: `9000${i}`, grade: 'ม.3', room: '1', number: String(i),
    })),
];

const C_ASSIGNMENTS = [
    { title: 'EMU-C-1 บวกเลขสองจำนวน', difficulty: 'ง่าย', tcs: [['3 4', '7'], ['10 -2', '8'], ['0 0', '0', true]] },
    { title: 'EMU-C-2 เลขคู่หรือคี่', difficulty: 'ง่าย', tcs: [['4', 'even'], ['7', 'odd'], ['0', 'even', true]] },
    { title: 'EMU-C-3 ผลรวม 1 ถึง n', difficulty: 'ปานกลาง', tcs: [['5', '15'], ['1', '1'], ['100', '5050', true]] },
];
const PY_ASSIGNMENTS = [
    { title: 'EMU-PY-1 ทักทาย', difficulty: 'ง่าย', tcs: [['มานี', 'สวัสดี มานี'], ['ปิติ', 'สวัสดี ปิติ', true]] },
    { title: 'EMU-PY-2 คูณสอง', difficulty: 'ง่าย', tcs: [['3', '6'], ['-4', '-8', true]] },
];

async function upsertUser(u) {
    try { await admin.auth().deleteUser(u.uid); } catch (_) { /* ยังไม่มี */ }
    await admin.auth().createUser({ uid: u.uid, email: u.email, password: PASSWORD, displayName: u.displayName });
    const { uid, ...rest } = u;
    await db.collection('users').doc(uid).set({
        ...rest, enrolledCourses: [], approvedByAdmin: true, createdAt: ts, profilePhotoURL: null,
    });
}

async function seedCourse(id, title, language, assignments, studentUids) {
    await db.collection('courses').doc(id).set({
        title, description: 'รายวิชาจำลองสำหรับ emulator', language, isPublished: true,
        grade: 'ม.3', room: '1', semester: '2', academicYear: '2569', teacherId: 'emu-teacher',
        gradingPolicy: 'best', enrollmentCount: studentUids.length, classCode: id.toUpperCase().slice(0, 6),
        status: 'active', coTeacherIds: [], createdAt: ts,
        directoryTree: [{ name: 'หน่วยจำลอง', topics: ['หัวข้อจำลอง'] }],
    });
    for (const a of assignments) {
        const ref = await db.collection('assignments').add({
            title: a.title, description: a.title, difficulty: a.difficulty, language,
            unitName: 'หน่วยจำลอง', topicName: 'หัวข้อจำลอง', timeLimit: 5000, memoryLimit: 256,
            isPublished: true, assignmentType: 'practice', examDurationMinutes: 30,
            rawScore: 10, courseId: id, totalPoints: a.tcs.length, createdAt: ts,
        });
        const batch = db.batch();
        a.tcs.forEach(([input, out, hidden], i) => batch.set(db.collection('testCases').doc(), {
            assignmentId: ref.id, input, expectedOutput: out, isHidden: !!hidden, points: 1, order: i + 1,
        }));
        await batch.commit();
    }
    for (const sid of studentUids) {
        await db.collection('enrollments').add({
            studentId: sid, courseId: id, enrolledAt: ts, progress: 0, completedLessons: [], lastAccessedAt: ts,
        });
        await db.collection('users').doc(sid).update({ enrolledCourses: admin.firestore.FieldValue.arrayUnion(id) });
    }
}

(async () => {
    console.log('ใส่ข้อมูลจำลองลง emulator …');
    for (const u of USERS) await upsertUser(u);
    const students = USERS.filter(u => u.role === 'student').map(u => u.uid);
    await seedCourse('emu-c-legacy', 'EMU ภาษา C (รายวิชาเดิม)', 'c', C_ASSIGNMENTS, students);
    await seedCourse('emu-py-studio', 'EMU ว23207 นวัตกรรมดิจิทัล (ทดสอบ Studio)', 'python', PY_ASSIGNMENTS, students);
    console.log(`✓ ผู้ใช้ ${USERS.length} บัญชี (รหัสผ่าน ${PASSWORD}), รายวิชา 2, โจทย์ ${C_ASSIGNMENTS.length + PY_ASSIGNMENTS.length}`);
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

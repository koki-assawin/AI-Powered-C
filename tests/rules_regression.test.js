#!/usr/bin/env node
/**
 * tests/rules_regression.test.js — กฎ Firestore เดิมต้องให้ผลเหมือนเดิมหลังเพิ่ม APCC Studio (ข้อ 7.4)
 *
 * วิธี: ใส่กฎของ main (ก่อน Studio) ลง emulator → ทดลองสิทธิ์ของคอลเลกชันเดิม ~60 กรณี ด้วย token ผู้ใช้จริง
 *       (ไม่ล็อกอิน / นักเรียน / นักเรียนอีกคน / ครู / แอดมิน) → ใส่กฎของ branch นี้ → ทดลองชุดเดิม → เทียบทีละกรณี
 * ความต่างที่ยอมรับ: projectTeams (+tasks, feedback) ตามข้อตัดสินใจ D2 เท่านั้น
 *
 * ใช้ REST ของ Firestore emulator แทน @firebase/rules-unit-testing (ผลเท่ากัน ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)
 * ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node tests/rules_regression.test.js [--base main]
 */
const path = require('path');
const { execFileSync } = require('child_process');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const PROJECT = 'ai-powered-coding-596ed';
const EMU = process.env.FIRESTORE_EMULATOR_HOST;
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!EMU || !AUTH) { console.error('❌ ใช้กับ emulator เท่านั้น'); process.exit(1); }
const baseIdx = process.argv.indexOf('--base');
const BASE = baseIdx > 0 ? process.argv[baseIdx + 1] : 'main';
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));

const FS = `http://${EMU}/v1/projects/${PROJECT}/databases/(default)/documents`;
const setRules = async (content) => {
    const r = await fetch(`http://${EMU}/emulator/v1/projects/${PROJECT}:securityRules`, {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } }),
    });
    if (!r.ok) throw new Error('ใส่กฎไม่สำเร็จ ' + r.status + ' ' + (await r.text()).slice(0, 300));
};
const tok = async (e) => (await (await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: 'apcc1234', returnSecureToken: true }) })).json()).idToken;
const V = (v) => Array.isArray(v) ? { arrayValue: { values: v.map(V) } } : typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v }
    : v && typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, V(x)])) } } : { stringValue: String(v) };
const F = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, V(v)])) });
const call = async (t, method, p, body) => {
    const headers = { 'content-type': 'application/json' };
    if (t) headers.authorization = 'Bearer ' + t;
    return (await fetch(FS + p, { method, headers, body: body && JSON.stringify(body) })).status;
};
const get = (t, p) => call(t, 'GET', p);
const create = (t, col, o) => call(t, 'POST', `/${col}`, F(o));
const patch = (t, p, o) => call(t, 'PATCH', `${p}?${Object.keys(o).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')}`, F(o));
const del = (t, p) => call(t, 'DELETE', p);
const query = async (t, col, field, value) => {
    const headers = { 'content-type': 'application/json' };
    if (t) headers.authorization = 'Bearer ' + t;
    const r = await fetch(`${FS}:runQuery`, { method: 'POST', headers, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: V(value) } } } }) });
    return r.status;
};

async function seed() {
    await fetch(`http://${EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    execFileSync('node', [path.join(ROOT, 'tools/studio/seed_emulator.js')], { stdio: 'ignore', env: process.env });
    const db = admin.firestore();
    const b = db.batch();
    const C = 'emu-c-legacy';
    b.set(db.collection('submissions').doc('sub1'), { studentId: 'emu-s01', assignmentId: 'a1', courseId: C, score: 50 });
    b.set(db.collection('grades').doc('g1'), { studentId: 'emu-s01', assignmentId: 'a1', courseId: C, score: 50 });
    b.set(db.collection('courses').doc('locked-c'), { title: 'locked', teacherId: 'emu-teacher', gradesLocked: true });
    b.set(db.collection('config').doc('gemini'), { apiKey: 'x' });
    b.set(db.collection('config').doc('runner'), { workerUrl: 'https://x' });
    b.set(db.collection('appConfig').doc('demo'), { a: 1 });
    b.set(db.collection('coachInteractions').doc('ci1'), { uid: 'emu-s01', coachRole: 'socratic' });
    b.set(db.collection('usageEvents').doc('ue1'), { uid: 'emu-s01', event: 'code_run' });
    b.set(db.collection('playerStats').doc('emu-s01'), { xp: 10 });
    b.set(db.collection('xpLedger').doc('x1'), { uid: 'emu-s01', amount: 5 });
    b.set(db.collection('pollSessions').doc('p1'), { status: 'round1_open', courseId: C });
    b.set(db.collection('pollSessions').doc('p2'), { status: 'closed', courseId: C });
    b.set(db.collection('learningTopics').doc('lt1'), { courseId: C, isPublished: true });
    b.set(db.collection('classes').doc('cl1'), { name: 'x' });
    b.set(db.collection('seasons').doc('s1'), { name: 'x' });
    b.set(db.collection('miniGameContent').doc('m1'), { a: 1 });
    b.set(db.collection('miniGameSessions').doc('ms1'), { uid: 'emu-s01' });
    b.set(db.collection('studentAchievements').doc('sa1'), { uid: 'emu-s01' });
    b.set(db.collection('leaderboardSnapshots').doc('l1'), { a: 1 });
    b.set(db.collection('runtimeStatus').doc('emu-s01'), { status: 'idle' });
    b.set(db.collection('selfPracticeSubmissions').doc('sp1'), { studentId: 'emu-s01' });
    b.set(db.collection('assignments_v2').doc('av1'), { courseId: C });
    b.set(db.collection('submissions_v2').doc('sv1'), { studentId: 'emu-s01', courseId: C });
    b.set(db.collection('class_analytics').doc('ca1'), { courseId: C });
    b.set(db.collection('pollTemplates').doc('pt1'), { a: 1 });
    b.set(db.collection('lessons').doc('le1'), { courseId: C });
    b.set(db.collection('shopPurchases').doc('sh1'), { uid: 'emu-s01' });
    b.set(db.collection('projectTeams').doc('T1'), { name: 'x', createdBy: 'emu-s01', members: ['emu-s01'] });
    await b.commit();
}

async function matrix(T) {
    const { anon, s1, s2, t, a } = T;
    const C = 'emu-c-legacy';
    const cases = {
        // users
        'users: นักเรียนอ่านผู้ใช้อื่น': () => get(s1, '/users/emu-s02'),
        'users: ไม่ล็อกอินอ่าน': () => get(anon, '/users/emu-s02'),
        'users: นักเรียนแก้ของตนเอง': () => patch(s1, '/users/emu-s01', { room: '9' }),
        'users: นักเรียนแก้ role ของผู้อื่น': () => patch(s1, '/users/emu-s02', { role: 'admin' }),
        'users: ครูแก้ enrolledCourses ของนักเรียน': () => patch(t, '/users/emu-s02', { enrolledCourses: [C] }),
        'users: ครูแก้ชื่อนักเรียน': () => patch(t, '/users/emu-s02', { displayName: 'x' }),
        'users: แอดมินแก้ role': () => patch(a, '/users/emu-s02', { role: 'student' }),
        // courses / assignments / testCases / lessons
        'courses: นักเรียนอ่าน': () => get(s1, `/courses/${C}`),
        'courses: นักเรียนแก้': () => patch(s1, `/courses/${C}`, { title: 'x' }),
        'courses: ครูแก้': () => patch(t, `/courses/${C}`, { description: 'x' }),
        'assignments: นักเรียนสร้าง': () => create(s1, 'assignments', { courseId: C }),
        'assignments: ครูสร้าง': () => create(t, 'assignments', { courseId: C }),
        'testCases: นักเรียนอ่านทั้งหมด (query)': () => query(s1, 'testCases', 'isHidden', true),
        'testCases: นักเรียนเขียน': () => create(s1, 'testCases', { assignmentId: 'a1' }),
        'lessons: นักเรียนเขียน': () => create(s1, 'lessons', { courseId: C }),
        // submissions / grades
        'submissions: นักเรียนสร้างของตนเอง': () => create(s1, 'submissions', { studentId: 'emu-s01', courseId: C, score: 100 }),
        'submissions: นักเรียนสร้างในชื่อคนอื่น': () => create(s1, 'submissions', { studentId: 'emu-s02', courseId: C }),
        'submissions: นักเรียนอ่านของตนเอง': () => get(s1, '/submissions/sub1'),
        'submissions: นักเรียนอ่านของคนอื่น': () => get(s2, '/submissions/sub1'),
        'submissions: นักเรียนแก้ runCount ของตนเอง': () => patch(s1, '/submissions/sub1', { runCount: 3 }),
        'submissions: นักเรียนแก้ score ของตนเอง': () => patch(s1, '/submissions/sub1', { score: 100 }),
        'submissions: ครูอ่าน': () => get(t, '/submissions/sub1'),
        'submissions: ครูลบ': () => del(t, '/submissions/sub_none'),
        'grades: นักเรียนอ่านของตนเอง': () => get(s1, '/grades/g1'),
        'grades: นักเรียนอ่านของคนอื่น': () => get(s2, '/grades/g1'),
        'grades: นักเรียนเขียน (วิชาไม่ล็อก)': () => patch(s1, '/grades/g1', { score: 60, courseId: C }),
        'grades: นักเรียนเขียน (วิชาล็อก)': () => create(s1, 'grades', { studentId: 'emu-s01', courseId: 'locked-c', score: 100 }),
        'grades: ครูเขียน (วิชาล็อก)': () => create(t, 'grades', { studentId: 'emu-s01', courseId: 'locked-c', score: 100 }),
        // enrollments / config / appConfig
        'enrollments: นักเรียนอ่าน (query)': () => query(s1, 'enrollments', 'courseId', C),
        'enrollments: นักเรียนเขียน': () => create(s1, 'enrollments', { studentId: 'emu-s01', courseId: C }),
        'config/gemini: ไม่ล็อกอินอ่าน': () => get(anon, '/config/gemini'),
        'config/runner: ไม่ล็อกอินอ่าน': () => get(anon, '/config/runner'),
        'config: ครูเขียน': () => patch(t, '/config/runner', { workerUrl: 'y' }),
        'config: แอดมินเขียน': () => patch(a, '/config/runner', { workerUrl: 'https://x' }),
        'appConfig: นักเรียนเขียน': () => patch(s1, '/appConfig/demo', { a: 2 }),
        'appConfig: ครูเขียน': () => patch(t, '/appConfig/demo', { a: 2 }),
        // coaching / usage / gamification
        'coachInteractions: นักเรียนสร้าง': () => create(s1, 'coachInteractions', { uid: 'emu-s01', coachRole: 'socratic', triggerEvent: 'studio_ladder' }),
        'coachInteractions: นักเรียนอ่านของคนอื่น': () => get(s2, '/coachInteractions/ci1'),
        'coachInteractions: ครูอ่าน': () => get(t, '/coachInteractions/ci1'),
        'usageEvents: นักเรียนสร้าง': () => create(s1, 'usageEvents', { uid: 'emu-s01', event: 'ai_hint' }),
        'usageEvents: demo ไม่ล็อกอิน (ถูกรูปแบบ)': () => create(anon, 'usageEvents', { uid: 'demo', event: 'demo_run', date: 'x' }),
        'usageEvents: demo ไม่ล็อกอิน (event อื่น)': () => create(anon, 'usageEvents', { uid: 'demo', event: 'code_run' }),
        'usageEvents: นักเรียนอ่าน (query)': () => query(s1, 'usageEvents', 'uid', 'emu-s01'),
        'usageEvents: ครูอ่าน (query)': () => query(t, 'usageEvents', 'uid', 'emu-s01'),
        'playerStats: นักเรียนเขียนของตนเอง': () => patch(s1, '/playerStats/emu-s01', { xp: 20 }),
        'playerStats: นักเรียนเขียนของคนอื่น': () => patch(s2, '/playerStats/emu-s01', { xp: 9999 }),
        'xpLedger: นักเรียนสร้างของตนเอง': () => create(s1, 'xpLedger', { uid: 'emu-s01', amount: 1 }),
        'xpLedger: นักเรียนสร้างของคนอื่น': () => create(s1, 'xpLedger', { uid: 'emu-s02', amount: 1 }),
        'xpLedger: นักเรียนแก้': () => patch(s1, '/xpLedger/x1', { amount: 999 }),
        'leaderboardSnapshots: นักเรียนเขียน': () => patch(s1, '/leaderboardSnapshots/l1', { a: 2 }),
        'achievements: นักเรียนเขียน': () => create(s1, 'achievements', { a: 1 }),
        'studentAchievements: นักเรียนสร้าง': () => create(s1, 'studentAchievements', { uid: 'emu-s01' }),
        'studentAchievements: นักเรียนแก้': () => patch(s1, '/studentAchievements/sa1', { uid: 'emu-s02' }),
        'miniGameSessions: นักเรียนสร้างของตนเอง': () => create(s1, 'miniGameSessions', { uid: 'emu-s01' }),
        'miniGameContent: นักเรียนเขียน': () => patch(s1, '/miniGameContent/m1', { a: 2 }),
        'seasons: นักเรียนเขียน': () => patch(s1, '/seasons/s1', { name: 'y' }),
        // activities / polls / misc
        'assignments_v2: นักเรียนเขียน': () => patch(s1, '/assignments_v2/av1', { courseId: 'y' }),
        'submissions_v2: นักเรียนสร้างของตนเอง': () => create(s1, 'submissions_v2', { studentId: 'emu-s01', courseId: C }),
        'submissions_v2: นักเรียนแก้': () => patch(s1, '/submissions_v2/sv1', { score: 100 }),
        'class_analytics: นักเรียนอ่าน': () => get(s1, '/class_analytics/ca1'),
        'runtimeStatus: นักเรียนเขียนของตนเอง': () => patch(s1, '/runtimeStatus/emu-s01', { status: 'run' }),
        'runtimeStatus: นักเรียนอ่านของคนอื่น': () => get(s2, '/runtimeStatus/emu-s01'),
        'selfPracticeSubmissions: นักเรียนอ่านของคนอื่น': () => get(s2, '/selfPracticeSubmissions/sp1'),
        'learningTopics: นักเรียนเขียน': () => patch(s1, '/learningTopics/lt1', { isPublished: false }),
        'classes: นักเรียนเขียน': () => patch(s1, '/classes/cl1', { name: 'y' }),
        'pollTemplates: นักเรียนเขียน': () => patch(s1, '/pollTemplates/pt1', { a: 2 }),
        'pollSessions: นักเรียนเขียน': () => patch(s1, '/pollSessions/p1', { status: 'closed' }),
        'poll responses: นักเรียนตอบรอบที่เปิด': () => call(s1, 'PATCH', '/pollSessions/p1/responses/emu-s01', F({ r1: { text: 'x' } })),
        'poll responses: นักเรียนตอบรอบที่ปิด': () => call(s1, 'PATCH', '/pollSessions/p2/responses/emu-s01', F({ r1: { text: 'x' } })),
        'poll responses: ตอบแทนคนอื่น': () => call(s1, 'PATCH', '/pollSessions/p1/responses/emu-s02', F({ r1: { text: 'x' } })),
        'shopPurchases: นักเรียนสร้าง (ยังไม่มีกฎ)': () => create(s1, 'shopPurchases', { uid: 'emu-s01' }),
        // คาดว่าเปลี่ยน (D2)
        'projectTeams: นักเรียนอ่าน [D2]': () => get(s1, '/projectTeams/T1'),
        'projectTeams: นักเรียนสร้างทีมของตนเอง [D2]': () => call(s2, 'PATCH', '/projectTeams/T2', F({ name: 'y', createdBy: 'emu-s02', members: ['emu-s02'] })),
        'projectTeams: คนนอกเปลี่ยนชื่อทีม [D2]': () => patch(s2, '/projectTeams/T1', { name: 'hack' }),
    };
    const out = {};
    for (const [k, fn] of Object.entries(cases)) out[k] = await fn();
    return out;
}

(async () => {
    admin.initializeApp({ projectId: PROJECT });
    const oldRules = execFileSync('git', ['show', `${BASE}:firestore.rules`], { cwd: ROOT, encoding: 'utf8' });
    const newRules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
    const T = {};
    const run = async (label, rules) => {
        await setRules(rules);
        await seed();
        if (!T.s1) Object.assign(T, { anon: null, s1: await tok('s01@test.local'), s2: await tok('s02@test.local'), t: await tok('teacher@test.local'), a: await tok('admin@test.local') });
        console.log(`  รันชุดทดสอบภายใต้กฎ ${label} …`);
        return matrix(T);
    };
    const before = await run(`${BASE} (ก่อน Studio)`, oldRules);
    const after = await run('branch นี้ (หลัง Studio)', newRules);
    let same = 0, expected = 0, bad = 0;
    console.log('\nกรณี | กฎเดิม | กฎใหม่');
    for (const k of Object.keys(before)) {
        const eq = before[k] === after[k];
        const isD2 = k.includes('[D2]');
        if (eq) same++;
        else if (isD2) expected++;
        else bad++;
        if (!eq || isD2) console.log(`  ${eq ? '=' : isD2 ? '≠ (ตั้งใจ D2)' : '✗ ต่าง'} ${k} | ${before[k]} | ${after[k]}`);
    }
    console.log(`\nเหมือนเดิม ${same} กรณี · ต่างตามที่ตั้งใจ (D2) ${expected} กรณี · ต่างโดยไม่ตั้งใจ ${bad} กรณี (ทั้งหมด ${Object.keys(before).length})`);
    await setRules(newRules);   // คืนกฎของ branch ให้ emulator
    process.exit(bad ? 1 : 0);
})().catch(e => { console.error('❌', e); process.exit(1); });

#!/usr/bin/env node
/**
 * tools/studio/test_phase1.js — ทดสอบ Phase 1 (Studio Core + Template Pack) บน Firebase Emulator
 *
 * โหลดโค้ดฝั่งเว็บจริง (studioConfig.js, templates.js, templatePack.js) มารันใน Node
 * แทน firebase compat ด้วย firebase-admin ที่ชี้ไป emulator และแทน runner ด้วย Python ในเครื่อง
 *
 * วิธีใช้ (เปิด emulator ไว้ก่อน: firebase emulators:start --only auth,firestore,hosting)
 *   PowerShell:
 *     $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"; $env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
 *     $env:BABEL_STANDALONE="<path>/node_modules/@babel/standalone"   # npm i @babel/standalone@7.25.9 ที่ไหนก็ได้
 *     node tools/studio/test_phase1.js              # ล้าง emulator → seed → ทดสอบ
 *     node tools/studio/test_phase1.js --compare-prod   # + เทียบรูปแบบกับโจทย์ ว23207 จริง (อ่านอย่างเดียว)
 */
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const PROJECT = 'ai-powered-coding-596ed';
if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('❌ ต้องตั้ง FIRESTORE_EMULATOR_HOST — ใช้กับ emulator เท่านั้น'); process.exit(1); }
const Babel = require(process.env.BABEL_STANDALONE || '@babel/standalone');
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));
const app = admin.initializeApp({ projectId: PROJECT }, 'emu');
const db = app.firestore();

let pass = 0, fail = 0;
const ok = (cond, label, extra) => {
    if (cond) { pass++; console.log('  ✓', label); }
    else { fail++; console.log('  ✗', label, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
};
const throwsAsync = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };

// ── รันไฟล์ฝั่งเว็บใน global context ───────────────────────────────────────
global.window = global;
global.db = db;
global.serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
global.auth = { currentUser: { uid: 'emu-teacher' } };
global.React = { useState: () => [null, () => {}], createElement: () => null };
const load = (rel, jsx) => {
    let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (jsx) src = Babel.transform(src, { presets: ['react'], filename: rel, sourceType: 'script' }).code;
    vm.runInThisContext(src, { filename: rel });
};
load('js/studio/studioConfig.js', true);
load('js/studio/content/templates.js');
load('js/studio/templatePack.js');

// runner แทน Worker: Python ในเครื่อง เปรียบเทียบแบบเดียวกับ normalizeOutput ของ grader.js (trim)
const norm = (s) => (s || '').replace(/\r\n/g, '\n').trim();
const localRunner = async (code, language, tc) => {
    const r = spawnSync('python', ['-I', '-X', 'utf8', '-c', code], { input: tc.input, encoding: 'utf8', timeout: 10000 });
    const actual = norm(r.stdout);
    return { passed: actual === norm(tc.expectedOutput), actualOutput: actual, errorLog: (r.stderr || '').trim() || null };
};

const W207 = require(path.join(ROOT, 'docs/import-samples/apcc_problems_w23207.json'));
const C103 = require(path.join(ROOT, 'docs/import-samples/apcc_problems_w23103_ch2.json'));

const getCourse = async (id) => { const s = await db.collection('courses').doc(id).get(); return { id, ...s.data() }; };
const countWhere = async (col, field, val) => (await db.collection(col).where(field, '==', val).count().get()).data().count;
const tcCountForCourse = async (courseId) => {
    const as = await tpLoadCourseAssignments(courseId);
    let n = 0;
    for (const a of as) n += await countWhere('testCases', 'assignmentId', a.id);
    return n;
};

async function resetEmulator() {
    const host = process.env.FIRESTORE_EMULATOR_HOST;
    const r = await fetch(`http://${host}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    if (!r.ok) throw new Error('ล้าง emulator ไม่สำเร็จ ' + r.status);
    execFileSync('node', [path.join(__dirname, 'seed_emulator.js')], { stdio: 'inherit', env: process.env });
}

async function compareProd() {
    console.log('\n[เทียบกับรายวิชา ว23207 จริง — อ่านอย่างเดียว]');
    const keyPath = path.join(ROOT, 'serviceAccountKey.json');
    const saved = process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIRESTORE_EMULATOR_HOST;                 // แอปที่สองต้องต่อ production
    const prod = admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) }, 'prod').firestore();
    const snap = await prod.collection('assignments').where('courseId', '==', 'h5av26RKvbtT5visGv2B').get();
    process.env.FIRESTORE_EMULATOR_HOST = saved;
    const live = {};
    snap.docs.forEach(d => { live[tpCodeFromTitle(d.data().title)] = { id: d.id, ...d.data() }; });
    const KEYS = ['title', 'description', 'language', 'difficulty', 'assignmentType', 'unitName', 'topicName', 'rawScore', 'totalPoints', 'examDurationMinutes'];
    let fieldDiff = [], tcDiff = [];
    for (const p of W207) {
        const m = tpMapProblem(p, 'w23207');
        const L = live[p.id];
        if (!L) { fieldDiff.push(p.id + ' ไม่มีในระบบ'); continue; }
        KEYS.forEach(k => { if (L[k] !== m.assignment[k]) fieldDiff.push(`${p.id}.${k}`); });
        const t = (await prod.collection('testCases').where('assignmentId', '==', L.id).get()).docs.map(d => d.data()).sort((a, b) => a.order - b.order);
        const a = t.map(x => [x.input, x.expectedOutput, x.isHidden, x.points, x.order]);
        const b = m.testCases.map(x => [x.input, x.expectedOutput, x.isHidden, x.points, x.order]);
        if (JSON.stringify(a) !== JSON.stringify(b)) tcDiff.push(p.id);
    }
    ok(fieldDiff.length === 0, `ฟิลด์ assignment ตรงกับของจริงทุกข้อ (57 ข้อ × ${KEYS.length} ฟิลด์)`, fieldDiff);
    ok(tcDiff.length === 0, 'test case ตรงกับของจริงทุกกรณี (input, expectedOutput, isHidden, points, order)', tcDiff);
}

(async () => {
    console.log('\n[เตรียม emulator]');
    await resetEmulator();

    console.log('\n[1] Studio Core');
    ok(isStudio({ id: 'x' }) === false, 'รายวิชาที่ไม่มี studio → ไม่ใช่ Studio');
    ok(isStudio({ id: 'x', studio: { enabled: false } }) === false, 'studio.enabled=false → ไม่ใช่ Studio');
    ok(isStudio({ id: 'x', studio: buildStudioConfig('w23207') }) === true, 'เปิด Studio แล้ว → isStudio');
    ok(isStudio({ id: 'UZGy0pGurry9Dt9YdhYX', studio: buildStudioConfig('w23207') }) === false, 'รายวิชาวิจัย (ว31281 1/69) เปิด Studio ไม่ได้ แม้มีฟิลด์ studio');
    ok(isStudio({ id: 'other', title: 'ว31281 รุ่นใหม่', studio: buildStudioConfig('w23207') }) === false, 'ชื่อขึ้นต้น ว31281 เปิด Studio ไม่ได้');
    ok(hasFeature({ id: 'x', studio: buildStudioConfig('w23103_ch2') }, 'projectStudio') === false, 'w23103_ch2 ไม่เปิด projectStudio');
    ok(hasFeature({ id: 'x', studio: buildStudioConfig('w23103_ch2') }, 'parsons') === true, 'w23103_ch2 เปิด parsons');
    ok(Object.values(buildStudioConfig('w23207', {}).features).every(v => v === false), 'feature ที่ไม่ได้ตั้ง = false ทั้งหมด');

    console.log('\n[2] แปลงชุดโจทย์');
    const parsons = W207.filter(p => p.type === 'parsons').map(p => tpMapProblem(p, 'w23207'));
    ok(parsons.length === 4 && parsons.every(m => m.studioFields.studioType === 'parsons' && m.studioFields.parsons.lines.length >= 2), 'Parsons ว23207 4 ข้อ ดึงบรรทัดจาก starter_code ได้');
    const p0405 = tpMapProblem(W207.find(p => p.id === 'W207-04-5'), 'w23207').studioFields.parsons;
    ok(p0405.lines.join('\n') === 'pw = input()\nif pw == "kp2569":\n    print("เข้าสู่ระบบสำเร็จ")\nelse:\n    print("รหัสผ่านไม่ถูกต้อง")', 'W207-04-5 เฉลย Parsons มีการเยื้องถูกต้อง', p0405.lines);
    ok(parsons.every(m => m.studioFields.parsons.distractors.length === 0), 'ว23207 ไม่มีบรรทัดหลอก (บรรทัดคำสั่งไม่ถูกนับเป็นบรรทัดหลอก)');
    const c02 = tpMapProblem(C103.find(p => p.id === 'C23103-2-02'), 'w23103_ch2').studioFields.parsons;
    ok(c02.distractors.length === 1 && c02.distractors[0] === 'age = input()', 'ว23103 Parsons ใช้ฟิลด์ parsons (มีบรรทัดหลอก 1 บรรทัด)');
    const exams = W207.filter(p => p.level === 'สอบ').map(p => tpMapProblem(p, 'w23207'));
    ok(exams.length === 8 && exams.every(m => m.assignment.assignmentType === 'exam' && !m.studioFields.hintLadder), 'ข้อสอบ 8 ข้อ → exam และไม่มี hintLadder');
    ok(W207.filter(p => p.level !== 'สอบ').every(p => tpMapProblem(p, 'w23207').studioFields.hintLadder.length === 4), 'โจทย์ฝึกทุกข้อมี hintLadder 4 ระดับ');
    ok(W207.every(p => !('solution' in tpMapProblem(p, 'w23207').assignment) && !('solution' in tpMapProblem(p, 'w23207').studioFields)), 'ไม่มีเฉลยใน assignment (นักเรียนอ่านไม่เห็น)');
    const bad = tpPlanImport([{ id: 'X-1', title: 't', description: 'd', test_cases: [] }, W207[0], W207[0]], 'w23207', []);
    ok(bad.summary.invalid === 2 && bad.summary.new === 1, 'ตรวจข้อมูลผิด: ไม่มี test case และรหัสซ้ำในไฟล์', bad.summary);

    if (process.argv.includes('--compare-prod')) await compareProd();

    console.log('\n[3] ตรวจเฉลย (Python ในเครื่องแทน Worker)');
    const v1 = await tpVerifySolutions(W207, null, { runner: localRunner, concurrency: 4 });
    ok(v1.passedTests === 159 && v1.totalTests === 159 && v1.failedProblems === 0, `ว23207 เฉลยผ่าน ${v1.passedTests}/${v1.totalTests}`);
    const v2 = await tpVerifySolutions(C103, null, { runner: localRunner, concurrency: 4 });
    ok(v2.passedTests === 46 && v2.failedProblems === 0, `ว23103 เฉลยผ่าน ${v2.passedTests}/${v2.totalTests}`);
    const broken = JSON.parse(JSON.stringify(W207.slice(0, 1))); broken[0].solution = 'print("ผิด")';
    const v3 = await tpVerifySolutions(broken, null, { runner: localRunner });
    ok(v3.failedProblems === 1, 'เฉลยผิดถูกจับได้');

    console.log('\n[4] นำเข้า ว23207 ลงรายวิชา Studio จำลอง');
    const legacyBefore = { a: await countWhere('assignments', 'courseId', 'emu-c-legacy'), t: await tcCountForCourse('emu-c-legacy') };
    const plainCourse = await getCourse('emu-py-studio');
    ok(!!(await throwsAsync(() => tpCommitImport(plainCourse, tpPlanImport(W207, 'w23207', []), null))), 'นำเข้าไม่ได้ถ้ารายวิชายังไม่เปิด Studio');
    ok(/วิจัย/.test(await throwsAsync(() => tpCommitImport({ id: 'UZGy0pGurry9Dt9YdhYX', title: 'ว31281', studio: buildStudioConfig('w23207') }, { rows: [] }, null)) || ''), 'นำเข้ารายวิชาวิจัยไม่ได้');
    await db.collection('courses').doc('emu-py-studio').update({ studio: buildStudioConfig('w23207') });
    let course = await getCourse('emu-py-studio');
    const plan1 = tpPlanImport(W207, 'w23207', await tpLoadCourseAssignments(course.id));
    ok(plan1.summary.new === 57 && plan1.summary.testCases === 159, 'dry-run: ใหม่ 57 ข้อ 159 กรณี', plan1.summary);
    const r1 = await tpCommitImport(course, plan1, null);
    ok(r1.created === 57 && r1.testCases === 159, `นำเข้าแล้ว ${r1.created} ข้อ ${r1.testCases} กรณี`);
    const imported = (await tpLoadCourseAssignments(course.id)).filter(a => a.sourceTemplate === 'w23207@1');
    ok(imported.length === 57, 'ในรายวิชามีโจทย์ w23207@1 ครบ 57 ข้อ');
    ok(imported.every(a => a.isPublished === false), 'โจทย์ที่นำเข้ายังไม่เผยแพร่');
    ok((await tcCountForCourse(course.id)) === 159 + 4, 'test case ในรายวิชา = 159 + 4 (ของโจทย์ EMU เดิม)');
    course = await getCourse('emu-py-studio');
    // ชุดโจทย์ไม่มีโจทย์ของแผน 10–14 (หน่วยที่ 4) จึงเพิ่ม 5 หน่วย
    ok(course.directoryTree.length === 1 + 5 && course.directoryTree[0].name === 'หน่วยจำลอง', 'directoryTree เพิ่มหน่วยที่มีโจทย์ 5 หน่วยต่อท้าย (ของเดิมยังอยู่ลำดับแรก)', course.directoryTree.map(u => u.name));
    const plan2 = tpPlanImport(W207, 'w23207', await tpLoadCourseAssignments(course.id));
    ok(plan2.summary.new === 0 && plan2.summary.exists === 57 && plan2.summary.enrichable === 0, 'นำเข้าซ้ำ: ไม่มีข้อใหม่ ไม่สร้างซ้ำ', plan2.summary);

    console.log('\n[5] D1 เติมข้อมูล Studio ให้โจทย์เดิม (จำลองรายวิชา ว23207 จริงที่ไม่มีฟิลด์ Studio)');
    await db.collection('courses').doc('emu-w207-live').set({
        title: 'EMU ว23207 แบบรายวิชาจริง', language: 'python', teacherId: 'emu-teacher', status: 'active',
        studio: buildStudioConfig('w23207'), directoryTree: [],
    });
    for (const p of W207) {                       // สร้างแบบเดียวกับรายวิชาจริง: ไม่มีฟิลด์ Studio
        const m = tpMapProblem(p, 'w23207');
        const ref = await db.collection('assignments').add({ ...m.assignment, courseId: 'emu-w207-live' });
        const b = db.batch();
        m.testCases.forEach(t => b.set(db.collection('testCases').doc(), { ...t, assignmentId: ref.id }));
        await b.commit();
    }
    const snapBefore = {};
    (await tpLoadCourseAssignments('emu-w207-live')).forEach(a => { snapBefore[a.id] = a; });
    const liveCourse = await getCourse('emu-w207-live');
    const plan3 = tpPlanImport(W207, 'w23207', Object.values(snapBefore));
    ok(plan3.summary.exists === 57 && plan3.summary.enrichable === 57 && plan3.summary.new === 0, 'จับโจทย์เดิมจากรหัสในชื่อได้ครบ 57 ข้อ', plan3.summary);
    const tcBefore = await tcCountForCourse('emu-w207-live');
    const r3 = await tpCommitEnrich(liveCourse, plan3, null);
    ok(r3.updated === 57, `เติมข้อมูลแล้ว ${r3.updated} ข้อ`);
    const after = await tpLoadCourseAssignments('emu-w207-live');
    const changed = after.filter(a => {
        const b = snapBefore[a.id];
        return Object.keys(b).some(k => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
    });
    ok(changed.length === 0, 'ฟิลด์เดิมทุกฟิลด์ไม่ถูกเปลี่ยน (ชื่อ คำอธิบาย คะแนน ฯลฯ)', changed.map(a => a.title));
    const added = new Set(after.flatMap(a => Object.keys(a).filter(k => !(k in snapBefore[a.id]))));
    ok([...added].every(k => TP_STUDIO_FIELDS.includes(k) || k === 'studioEnrichedAt'), 'ฟิลด์ที่เพิ่มเป็นฟิลด์ Studio เท่านั้น', [...added]);
    ok((await tcCountForCourse('emu-w207-live')) === tcBefore, 'test case ไม่ถูกแตะ');
    const ev = (await db.collection('studio_events').where('type', '==', 'template_enrich').get()).docs.map(d => d.data());
    ok(ev.length === 57 && ev.every(e => e.uid === 'emu-teacher' && e.before && e.after && e.schemaVersion === 1), 'บันทึกค่าก่อนแก้ลง studio_events ครบ 57 รายการ');
    const plan4 = tpPlanImport(W207, 'w23207', after);
    ok(plan4.summary.enrichable === 0, 'กดซ้ำ: ไม่มีอะไรให้เติมแล้ว');

    console.log('\n[6] ว23103 + คลัง template + ส่งออก');
    await db.collection('courses').doc('emu-c103').set({ title: 'EMU ว23103', language: 'python', teacherId: 'emu-teacher', status: 'active', studio: buildStudioConfig('w23103_ch2') });
    const r4 = await tpCommitImport(await getCourse('emu-c103'), tpPlanImport(C103, 'w23103_ch2', []), null);
    ok(r4.created === 10 && r4.testCases === 46, `ว23103 นำเข้า ${r4.created} ข้อ ${r4.testCases} กรณี`);
    await tpSaveToLibrary('w23207', 'apcc_problems_w23207.json', W207, 'emu-py-studio');
    const lib = (await db.collection('studio_templates').doc('w23207').get()).data();
    ok(lib.problemCount === 57 && lib.testCaseCount === 159 && lib.ownerId === 'emu-teacher', 'บันทึกชุดโจทย์ลงคลัง studio_templates');
    const pack = await tpExportCourse(await getCourse('emu-py-studio'));
    const exp = Object.fromEntries(pack.map(p => [p.id, p]));
    const mism = [];
    W207.forEach(p => {
        const e = exp[p.id];
        if (!e) { mism.push(p.id + ' หาย'); return; }
        if (e.title !== p.title || e.level !== p.level || e.type !== p.type || e.solution !== p.solution) mism.push(p.id + ' meta');
        if (e.description !== p.description.replace(/\r\n/g, '\n').replace(/\n+$/, '')) mism.push(p.id + ' description');
        if (e.input_format !== p.input_format || e.output_format !== p.output_format) mism.push(p.id + ' format');
        if ((e.plan || 0) !== (p.plan || 0)) mism.push(p.id + ' plan');
        if (JSON.stringify(e.hints) !== JSON.stringify(p.hints_enabled ? p.hints : [])) mism.push(p.id + ' hints');
        // การมองเห็นอาจเปลี่ยนตาม minVisibleTests จึงเทียบเฉพาะ input/output
        const tc = (arr) => arr.map(t => [t.input.replace(/\n+$/, ''), t.expected_output.trim()]);
        if (JSON.stringify(tc(e.test_cases)) !== JSON.stringify(tc(p.test_cases))) mism.push(p.id + ' tests');
    });
    ok(pack.length === 59 && mism.length === 0, 'ส่งออกแล้วได้ชุดโจทย์เท่าเดิม (57 ข้อ + EMU 2 ข้อ) ทุกฟิลด์สำคัญตรงกัน', mism);
    const exportText = JSON.stringify(pack);
    ok(!/emu-s0|นักเรียนจำลอง|studentId|@test\.local/.test(exportText), 'ไฟล์ส่งออกไม่มีข้อมูลนักเรียน');

    console.log('\n[7] รายวิชาเดิม (ไม่มี studio) ไม่ถูกแตะ');
    const legacyAfter = { a: await countWhere('assignments', 'courseId', 'emu-c-legacy'), t: await tcCountForCourse('emu-c-legacy') };
    ok(JSON.stringify(legacyBefore) === JSON.stringify(legacyAfter), `emu-c-legacy: โจทย์ ${legacyAfter.a} ข้อ test ${legacyAfter.t} กรณี เท่าเดิม`);
    ok((await getCourse('emu-c-legacy')).studio === undefined, 'emu-c-legacy ไม่มีฟิลด์ studio');

    console.log(`\nผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e); process.exit(1); });

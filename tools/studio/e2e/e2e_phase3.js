// tools/studio/e2e/e2e_phase3.js — E2E Phase 3 (Skill Gate, แถบ ฝึก–สร้าง–แบ่งปัน, Explain-Back) บน emulator ด้วย headless Chrome
// ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 PUPPETEER_CORE=<path> node tools/studio/e2e/e2e_phase3.js
// ล้างข้อมูลใน emulator ทุกครั้ง · ภาพหน้าจอ (ข้อมูลจำลอง) → docs/studio/screenshots
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const TMP = process.env.STUDIO_E2E_TMP || require('os').tmpdir();
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const admin = require(path.join(ROOT, 'functions/node_modules/firebase-admin'));
const SHOTS = path.join(ROOT, 'docs', 'studio', 'screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const BASE = 'http://127.0.0.1:5000/?emulator=1';
const PROJECT = 'ai-powered-coding-596ed';
const CID = 'emu-w207-studio';

let pass = 0, fail = 0;
const ok = (c, l, x) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗', l, c || x === undefined ? '' : JSON.stringify(x).slice(0, 300)); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    // ── เตรียมข้อมูล: รายวิชา Studio ที่มีโจทย์ ว23207 ครบ 57 ข้อ + S01 ผ่านด่าน 1–3 และขาดอีก 1 ข้อในด่าน 4 ──
    await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    execFileSync('node', [path.join(ROOT, 'tools/studio/seed_emulator.js')], { stdio: 'inherit', env: process.env });
    admin.initializeApp({ projectId: PROJECT });
    const db = admin.firestore();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    global.window = global; global.db = db; global.serverTimestamp = () => ts; global.auth = { currentUser: { uid: 'emu-teacher' } };
    for (const f of ['js/studio/content/templates.js', 'js/studio/templatePack.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    const W = require(path.join(ROOT, 'docs/import-samples/apcc_problems_w23207.json'));
    const feats = { parsons: true, pythonLearningHub: true, skillGate: true, explainBack: true, projectStudio: true, webAppRunner: true, rubricReview: true, portfolio: true, processAnalytics: true };
    await db.collection('courses').doc(CID).set({
        title: 'EMU ว23207 Studio', language: 'python', teacherId: 'emu-teacher', status: 'active', isPublished: true, coTeacherIds: [], createdAt: ts, directoryTree: [],
        studio: { enabled: true, version: '6.0', template: 'w23207', stages: ['practice', 'create', 'share'], hintPolicy: { maxLevelInExam: 0, maxLevelDefault: 4 }, features: feats },
    });
    const ids = {}, tagOf = {};
    for (const p of W) {
        const m = tpMapProblem(p, 'w23207');
        const ref = await db.collection('assignments').add({ ...m.assignment, ...m.studioFields, isPublished: true, courseId: CID, createdAt: ts });
        const b = db.batch(); m.testCases.forEach(t => b.set(db.collection('testCases').doc(), { ...t, assignmentId: ref.id })); await b.commit();
        ids[p.id] = ref.id; tagOf[p.id] = m.studioFields.skillTag;
    }
    await db.collection('enrollments').add({ studentId: 'emu-s01', courseId: CID, enrolledAt: ts, progress: 0, completedLessons: [], lastAccessedAt: ts });
    await db.collection('users').doc('emu-s01').update({ enrolledCourses: admin.firestore.FieldValue.arrayUnion(CID) });
    const pick = (tags, n, skip = []) => W.filter(p => p.level !== 'สอบ' && tags.includes(tagOf[p.id]) && !skip.includes(p.id)).slice(0, n).map(p => p.id);
    const seeded = [...pick(['io'], 9), ...pick(['condition'], 6), ...pick(['loop'], 4), ...pick(['list', 'function'], 8, ['W207-08-4', 'W207-09-2'])];
    const bs = db.batch();
    seeded.forEach(code => bs.set(db.collection('submissions').doc(), { studentId: 'emu-s01', assignmentId: ids[code], courseId: CID, score: 100, status: 'accepted', code: '# seed', language: 'python', submittedAt: ts }));
    await bs.commit();
    console.log(`เตรียมข้อมูลเสร็จ: โจทย์ 57 ข้อ, S01 ผ่านแล้ว ${seeded.length} ข้อ`);

    const browser = await puppeteer.launch({
        executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 900000,
        userDataDir: path.join(TMP, 'apcc-e2e-p3'), args: ['--no-first-run'], defaultViewport: { width: 1400, height: 950 },
    });
    const errors = [];
    const newPage = async (ctx) => {
        const page = await ctx.newPage(); (global.__pages = global.__pages || []).push(page);
        page.on('pageerror', e => errors.push('pageerror: ' + e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
        page.on('dialog', d => { console.log('    (dialog)', d.message().split('\n')[0]); d.accept(); });
        return page;
    };
    const H = (page) => ({
        nav: async (h) => { await page.goto(BASE + h, { waitUntil: 'domcontentloaded' }); await page.reload({ waitUntil: 'domcontentloaded' }); },
        shot: (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') }),
        text: () => page.evaluate(() => document.body.innerText),
        waitText: (re, ms = 30000) => page.waitForFunction(r => new RegExp(r).test(document.body.innerText), { timeout: ms }, re.source),
        clickText: async (sel, s) => {
            const done = await page.evaluate((q, t) => { const el = [...document.querySelectorAll(q)].find(e => (e.innerText || '').includes(t) && !e.disabled); if (el) { el.click(); return true; } return false; }, sel, s);
            if (!done) throw new Error('ไม่พบปุ่ม ' + s); await sleep(200);
        },
        login: async (email, prefix) => {
            await page.goto(BASE + '#/login', { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('input[type=email]', { timeout: 60000 });
            await page.type('input[type=email]', email); await page.type('input[type=password]', 'apcc1234');
            await page.keyboard.press('Enter');
            await page.waitForFunction(p => location.hash.startsWith(p), { timeout: 30000 }, prefix);
        },
        setCode: (code) => page.evaluate(c => document.querySelector('.CodeMirror').CodeMirror.setValue(c), code),
        typeInto: async (sel, value) => { await page.focus(sel); await page.keyboard.type(value); },
    });

    // ── นักเรียน S01 ──
    const sp = await newPage(await browser.createBrowserContext()); const S = H(sp);
    console.log('\n[นักเรียน: แดชบอร์ดก่อนผ่านด่าน 4]');
    await S.login('s01@test.local', '#/student');
    await S.nav('#/student/dashboard');
    await S.waitText(/ด่านถัดไป: ด่าน 4/, 60000);
    const d1 = await S.text();
    ok(/APCC Studio/.test(d1) && /EMU ว23207 Studio/.test(d1), 'แดชบอร์ดแสดงแถบ APCC Studio ของรายวิชา');
    ok(/8\/9/.test(d1) && /ผ่านอีก 1 ข้อ/.test(d1), 'ด่าน 4: ผ่าน 8/9 ขาดอีก 1 ข้อ');
    ok((await db.collection('studio_progress').doc(`${CID}_emu-s01`).get()).data().stage === 'practice', 'studio_progress บันทึกขั้น "ฝึก"');
    await S.shot('16_stage_practice');

    console.log('\n[นักเรียน: ส่ง W207-08-4 (ด่าน 4) แล้วทำนายผล]');
    await S.nav(`#/student/workspace?course=${CID}&assignment=${ids['W207-08-4']}`);
    await sp.waitForSelector('.CodeMirror', { timeout: 60000 });
    await S.setCode(W.find(p => p.id === 'W207-08-4').solution);
    await S.clickText('button', 'Submit');
    await S.waitText(/อธิบายโค้ดของฉัน \(Explain-Back\)/, 240000);
    ok(true, 'ผ่าน 100% โจทย์ปานกลาง → แสดงกล่อง Explain-Back');
    await S.shot('17_explain_back_prompt');
    await S.clickText('button', 'ทำนายผล');
    await S.waitText(/ผลลัพธ์จะเป็นอะไร/);
    ok(/59\.5/.test(await S.text()), 'ใช้ข้อมูลจาก test case ที่ซ่อน (59.5) ให้ทำนาย');
    await S.typeInto('textarea[placeholder^="พิมพ์ผลลัพธ์"]', '63.67');
    await S.clickText('button', 'ส่งคำตอบ');
    await S.waitText(/ทำนายผล: ✅ ถูกต้อง/);
    ok(true, 'ทำนายผลถูก → ✅');
    await S.typeInto('input[placeholder^="พิมพ์คำตอบสั้นๆ"]', 'รับราคา 1 ค่า คืนราคาคูณ 1.07 ถ้าไม่ return จะได้ None');
    await sp.evaluate(() => document.querySelector('input[placeholder^="พิมพ์คำตอบสั้นๆ"]').parentElement.querySelector('button').click());
    await S.waitText(/✅ ตอบแล้ว/);
    ok(true, 'ตอบคำถามต่อได้');
    await S.shot('18_explain_back_predict_done');

    console.log('\n[นักเรียน: ส่ง W207-09-2 แล้วอธิบายโค้ด (AI ใช้ไม่ได้ใน emulator → เกณฑ์สำรอง)]');
    await S.nav(`#/student/workspace?course=${CID}&assignment=${ids['W207-09-2']}`);
    await sp.waitForSelector('.CodeMirror', { timeout: 60000 });
    await S.setCode(W.find(p => p.id === 'W207-09-2').solution);
    await S.clickText('button', 'Submit');
    await S.waitText(/อธิบายโค้ดของฉัน \(Explain-Back\)/, 240000);
    await S.typeInto('textarea[placeholder^="อธิบาย 2"]', 'รับจำนวน n แล้ววนรับคะแนนเก็บในลิสต์ sc ด้วย append จากนั้นแสดงค่าสูงสุดด้วย max และต่ำสุดด้วย min');
    await S.clickText('button', 'ส่งคำตอบ');
    await S.waitText(/ระดับความเข้าใจ:/, 60000);
    const e2 = await S.text();
    ok(/ระดับความเข้าใจ: 2\/3/.test(e2) && /ประเมินเบื้องต้น/.test(e2), 'AI ใช้ไม่ได้ → เกณฑ์สำรองให้ระดับ 2/3 และแจ้งว่าครูจะตรวจอีกครั้ง');
    await S.shot('19_explain_back_explain_fallback');

    console.log('\n[นักเรียน: โจทย์ง่ายไม่ถาม Explain-Back]');
    await S.nav(`#/student/workspace?course=${CID}&assignment=${ids['W207-01-1']}`);
    await sp.waitForSelector('.CodeMirror', { timeout: 60000 });
    await S.setCode(W.find(p => p.id === 'W207-01-1').solution);
    await S.clickText('button', 'Submit');
    await S.waitText(/100%/, 240000);
    await sleep(1500);
    ok(!/อธิบายโค้ดของฉัน/.test(await S.text()), 'ผ่านโจทย์ง่าย → ไม่แสดง Explain-Back');

    console.log('\n[นักเรียน: แดชบอร์ดหลังผ่านด่าน 4]');
    await S.nav('#/student/dashboard');
    await S.waitText(/ปลดล็อกขั้น "สร้าง"/, 60000);
    ok(true, 'แดชบอร์ดแจ้งปลดล็อกขั้น "สร้าง"');
    const pr = (await db.collection('studio_progress').doc(`${CID}_emu-s01`).get()).data();
    ok(pr.createUnlocked === true && pr.stage === 'create' && pr.gates.every(g => g.done), 'studio_progress: ผ่านครบ 4 ด่าน ขั้น "สร้าง"', pr.gates.map(g => [g.gateId, g.passed, g.need]));
    const evs = (await db.collection('studio_events').where('uid', '==', 'emu-s01').get()).docs.map(d => d.data());
    // หน้าเว็บอาจคำนวณซ้อนกัน 2 รอบ (โหลดซ้ำเร็ว) จึงอาจมี event ซ้ำ — Phase 5 ต้องนับแบบไม่ซ้ำ
    ok(new Set(evs.filter(e => e.type === 'gate_pass').map(e => e.gateId)).size === 4 && evs.some(e => e.type === 'stage_unlock'), 'studio_events: gate_pass ครบ 4 ด่าน (ไม่ซ้ำ) + stage_unlock');
    ok(evs.filter(e => e.type === 'explain_submit').length === 2, 'studio_events: explain_submit 2 ครั้ง');
    await S.shot('20_stage_create_unlocked');

    // ── ครู ──
    const tp = await newPage(await browser.createBrowserContext()); const T = H(tp);
    console.log('\n[ครู: หน้าด่านทักษะ & Explain-Back]');
    await T.login('teacher@test.local', '#/teacher');
    await T.nav(`#/teacher/studio/gates?course=${CID}`);
    await T.waitText(/ปลดล็อกขั้นสร้างแล้ว/, 60000);
    const t1 = await T.text();
    ok(/ผ่านครบ 1\/1 คน/.test(t1) && /นักเรียนจำลอง S01/.test(t1), 'ตารางความก้าวหน้า: S01 ปลดล็อกขั้นสร้าง (1/1 คน)');
    await T.shot('21_teacher_gate_progress');
    await T.clickText('button', 'Explain-Back');
    await T.waitText(/ทำนายผลถูก 1\/1/);
    const t2 = await T.text();
    ok(/ระดับ 0 = 0, 1 = 0, 2 = 1, 3 = 0/.test(t2) && /W207-08-4/.test(t2) && /W207-09-2/.test(t2), 'สรุป Explain-Back รายห้อง: อธิบายระดับ 2 = 1, ทำนายถูก 1/1');
    await T.shot('22_teacher_explain_back');
    await T.clickText('button', 'ตั้งด่าน');
    await T.waitText(/skillTag ที่มีในโจทย์ของรายวิชา: condition, function, io, list, loop/);
    ok(true, 'หน้าตั้งด่านแสดง skillTag ที่มีในรายวิชา');
    await T.clickText('button', 'บันทึกด่าน');
    await T.waitText(/บันทึกด่านทักษะแล้ว/);
    const gs = await db.collection('studio_skillGates').where('courseId', '==', CID).get();
    ok(gs.size === 4, 'บันทึกด่านลง studio_skillGates 4 ด่าน');
    await T.shot('23_teacher_gate_settings');

    // ── นักเรียนที่ไม่มีรายวิชา Studio ──
    const op = await newPage(await browser.createBrowserContext()); const O = H(op);
    console.log('\n[นักเรียนรายวิชาเดิม]');
    await O.login('s02@test.local', '#/student');
    await O.nav('#/student/dashboard');
    // emulator ตรวจสถานะล็อกอินช้าเป็นบางครั้ง — ลองโหลดใหม่อีก 1 ครั้งก่อนถือว่าไม่ผ่าน
    await O.waitText(/รายวิชาของฉัน/, 45000).catch(async () => { await op.reload({ waitUntil: 'domcontentloaded' }); await O.waitText(/รายวิชาของฉัน/, 60000); });
    await sleep(2000);
    ok(!/APCC Studio/.test(await O.text()), 'แดชบอร์ดของนักเรียนที่ไม่มีรายวิชา Studio ไม่แสดงแถบ Studio');

    const real = errors.filter(e => !/favicon|Running in emulator|404|ERR_|net::|Gemini API Key|ไม่พบ Gemini|status of 400|status of 429/.test(e));
    ok(real.length === 0, 'ไม่มี error ใน console', real);
    await browser.close();
    console.log(`\nE2E Phase 3 ผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(async e => { console.error('❌', e.message); for (const [i, p] of (global.__pages || []).entries()) { try { await p.screenshot({ path: path.join(TMP, 'p3_fail_' + i + '.png') }); console.error('   screenshot', i, (await p.evaluate(() => document.body.innerText)).slice(-400).replace(/\s+/g, ' ')); } catch (_) {} } process.exit(1); });

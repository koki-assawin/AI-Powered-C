// tools/studio/e2e/e2e_phase2.js — E2E Phase 2 (Parsons, Hint Ladder, Python Learning Hub) บน emulator ด้วย headless Chrome
// ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 PUPPETEER_CORE=<path> node tools/studio/e2e/e2e_phase2.js
// ล้างข้อมูลใน emulator ทุกครั้ง · ภาพหน้าจอ (ข้อมูลจำลอง) → docs/studio/screenshots
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { execFileSync } = require('child_process');
const SCR = process.env.STUDIO_E2E_TMP || require('os').tmpdir();
const ROOT = path.join(__dirname, '..', '..', '..');
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const admin = require(path.join(ROOT, 'functions/node_modules/firebase-admin'));
const SHOTS = path.join(ROOT, 'docs', 'studio', 'screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const BASE = 'http://127.0.0.1:5000/?emulator=1';
const PROJECT = 'ai-powered-coding-596ed';

let pass = 0, fail = 0;
const ok = (c, l, x) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗', l, c || x === undefined ? '' : JSON.stringify(x).slice(0, 300)); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    execFileSync('node', [path.join(ROOT, 'tools/studio/seed_emulator.js')], { stdio: 'inherit', env: process.env });
    admin.initializeApp({ projectId: PROJECT });
    const db = admin.firestore();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    global.window = global; global.db = db; global.serverTimestamp = () => ts; global.auth = { currentUser: { uid: 'emu-teacher' } };
    for (const f of ['js/studio/content/templates.js', 'js/studio/templatePack.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    const W = require(path.join(ROOT, 'docs/import-samples/apcc_problems_w23207.json'));
    const studio = {
        enabled: true, version: '6.0', template: 'w23207', stages: ['practice', 'create', 'share'],
        hintPolicy: { maxLevelInExam: 0, maxLevelDefault: 4 },
        features: { parsons: true, pythonLearningHub: true, skillGate: true, explainBack: true, projectStudio: true, webAppRunner: true, rubricReview: true, portfolio: true, processAnalytics: true },
    };
    await db.collection('courses').doc('emu-w207-studio').set({ title: 'EMU ว23207 Studio', language: 'python', teacherId: 'emu-teacher', status: 'active', isPublished: true, coTeacherIds: [], createdAt: ts, studio, directoryTree: [] });
    const ids = {};
    const addProblem = async (courseId, p) => {
        const m = tpMapProblem(p, 'w23207');
        const ref = await db.collection('assignments').add({ ...m.assignment, ...m.studioFields, isPublished: true, courseId, createdAt: ts });
        const b = db.batch(); m.testCases.forEach(t => b.set(db.collection('testCases').doc(), { ...t, assignmentId: ref.id })); await b.commit();
        return ref.id;
    };
    for (const id of ['W207-04-5', 'W207-02-3', 'W207-01-3']) ids[id] = await addProblem('emu-w207-studio', W.find(p => p.id === id));
    ids.plainParsons = await addProblem('emu-py-studio', W.find(p => p.id === 'W207-04-5'));   // มีฟิลด์ Studio แต่รายวิชาไม่เปิด Studio
    for (const sid of ['emu-s01']) {
        await db.collection('enrollments').add({ studentId: sid, courseId: 'emu-w207-studio', enrolledAt: ts, progress: 0, completedLessons: [], lastAccessedAt: ts });
        await db.collection('users').doc(sid).update({ enrolledCourses: admin.firestore.FieldValue.arrayUnion('emu-w207-studio') });
    }
    console.log('เตรียมข้อมูลเสร็จ', ids);

    const browser = await puppeteer.launch({
        executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 900000,
        userDataDir: path.join(SCR, 'chrome-profile-2'), args: ['--no-first-run'], defaultViewport: { width: 1400, height: 950 },
    });
    const page = await (await browser.createBrowserContext()).newPage();   // หน้าต่างแบบไม่ระบุตัวตน ไม่จำการล็อกอินรอบก่อน
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('dialog', d => { console.log('    (dialog)', d.message().split('\n')[0]); d.accept(); });
    const nav = async (h) => { await page.goto(BASE + h, { waitUntil: 'domcontentloaded' }); await page.reload({ waitUntil: 'domcontentloaded' }); };
    const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
    const text = () => page.evaluate(() => document.body.innerText);
    const waitText = (re, ms = 30000) => page.waitForFunction(r => new RegExp(r).test(document.body.innerText), { timeout: ms }, re.source);
    const clickEl = async (sel, pred) => {
        const done = await page.evaluate((s, p) => {
            const f = new Function('e', 'return ' + p);
            const el = [...document.querySelectorAll(s)].find(e => f(e) && !e.disabled);
            if (el) { el.click(); return true; } return false;
        }, sel, pred);
        if (!done) throw new Error('ไม่พบ ' + sel + ' ' + pred);
        await sleep(150);
    };
    const clickText = (sel, s) => clickEl(sel, `(e.innerText || '').includes(${JSON.stringify(s)})`);

    console.log('\n[ล็อกอินนักเรียน S01]');
    await page.goto(BASE + '#/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type=email]', { timeout: 60000 });
    await page.type('input[type=email]', 's01@test.local');
    await page.type('input[type=password]', 'apcc1234');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash.startsWith('#/student'), { timeout: 30000 });
    ok(true, 'ล็อกอินนักเรียนได้');

    console.log('\n[Parsons W207-04-5]');
    await nav(`#/student/workspace?course=emu-w207-studio&assignment=${ids['W207-04-5']}`);
    await waitText(/โจทย์เรียงบรรทัดโค้ด/, 60000);
    ok(true, 'แสดง Parsons แทน editor');
    ok(!(await page.$('.CodeMirror')), 'ไม่มี CodeMirror ในโจทย์ Parsons');
    await shot('10_parsons_empty');
    const order = ['pw = input()', 'if pw == "kp2569":', 'print("เข้าสู่ระบบสำเร็จ")', 'else:', 'print("รหัสผ่านไม่ถูกต้อง")'];
    for (const line of order) await clickEl('div[draggable]', `e.innerText.trim() === ${JSON.stringify(line)} && e.title.includes('คลิก')`);
    await clickText('button', 'ตรวจลำดับ');
    await waitText(/บรรทัดที่ 4 ยังไม่ถูก/);
    ok(true, 'ตรวจลำดับ: บอกบรรทัดที่ 4 (else ย่อหน้าผิด)');
    await shot('11_parsons_wrong');
    // แก้การย่อหน้า: else ◀ 1 ครั้ง, print บรรทัดสุดท้าย ◀ 1 ครั้ง
    const indentLeft = async (row) => page.evaluate((r) => {
        const rows = [...document.querySelectorAll('div[draggable]')].filter(e => e.querySelector('button[title="ลดการย่อหน้า"]'));
        rows[r].querySelector('button[title="ลดการย่อหน้า"]').click();
    }, row);
    await indentLeft(3); await sleep(150); await indentLeft(4); await sleep(150);
    await clickText('button', 'ตรวจลำดับ');
    await waitText(/ลำดับและการย่อหน้าถูกต้อง/);
    ok(true, 'ตรวจลำดับ: ถูกต้อง');
    await shot('12_parsons_correct');
    await clickText('button', 'Submit');
    let sub = null;
    for (let i = 0; i < 90 && !sub; i++) {
        await sleep(2000);
        const s = await db.collection('submissions').where('studentId', '==', 'emu-s01').where('assignmentId', '==', ids['W207-04-5']).get();
        if (!s.empty) sub = s.docs[0].data();
    }
    ok(sub && sub.score === 100 && sub.passedTests === 3, 'ส่งโค้ดที่ประกอบจาก Parsons → grader เดิมให้ 100 คะแนน (3/3)', sub && { score: sub.score, status: sub.status, code: sub.code });
    ok(sub && sub.code === 'pw = input()\nif pw == "kp2569":\n    print("เข้าสู่ระบบสำเร็จ")\nelse:\n    print("รหัสผ่านไม่ถูกต้อง")\n', 'โค้ดที่ส่งมีการย่อหน้าถูกต้อง');
    await sleep(1500);
    await shot('13_parsons_submitted');
    const pa = (await db.collection('studio_events').where('type', '==', 'parsons_attempt').get()).docs.map(d => d.data());
    ok(pa.length === 2 && pa[0].uid === 'emu-s01', 'บันทึก parsons_attempt 2 ครั้งลง studio_events', pa.length);

    console.log('\n[Hint Ladder W207-02-3]');
    await nav(`#/student/workspace?course=emu-w207-studio&assignment=${ids['W207-02-3']}`);
    await page.waitForSelector('.CodeMirror', { timeout: 60000 });
    ok(true, 'โจทย์ปกติยังใช้ editor เดิม');
    await clickText('button', 'Submit');   // ส่งโค้ดตั้งต้น (ผิด)
    await waitText(/ขอ AI Scaffolding \(คำใบ้\) ระดับที่ 1/, 180000);
    await clickText('button', 'ขอ AI Scaffolding (คำใบ้) ระดับที่ 1');
    await waitText(/คำใบ้จากครู \(1\/4\)/);
    const hintTxt = await text();
    ok(hintTxt.includes(W.find(p => p.id === 'W207-02-3').hints[0]), 'ระดับ 1 = คำใบ้ข้อที่ 1 ที่ครูเขียน');
    await clickText('button', 'ขอระดับ 2');
    await waitText(/คำใบ้จากครู \(2\/4\)/);
    ok((await text()).includes(W.find(p => p.id === 'W207-02-3').hints[1]), 'ระดับ 2 = คำใบ้ข้อที่ 2');
    await shot('14_hint_ladder');
    const ci = (await db.collection('coachInteractions').where('triggerEvent', '==', 'studio_ladder').get()).docs.map(d => d.data());
    ok(ci.length === 2 && ci.every(c => c.coachRole === 'socratic' && c.prompt.length <= 500 && c.response.length <= 1000 && c.uid === 'emu-s01'), 'coachInteractions รูปแบบเดิม triggerEvent=studio_ladder 2 รายการ', ci.length);
    const aiHints = (await db.collection('usageEvents').where('event', '==', 'ai_hint').get()).size;
    ok(aiHints === 0, 'ไม่นับเป็น ai_hint ใน usageEvents (ไม่ได้เรียก AI)', aiHints);

    console.log('\n[Feature gate: รายวิชาที่ไม่เปิด Studio]');
    await nav(`#/student/workspace?course=emu-py-studio&assignment=${ids.plainParsons}`);
    await page.waitForSelector('.CodeMirror', { timeout: 60000 });
    ok(!/โปรแกรมของฉัน|ตรวจลำดับ/.test(await text()) && !!(await page.$('.CodeMirror')), 'โจทย์ Parsons ในรายวิชาที่ไม่เปิด Studio แสดง editor ตามเดิม');

    console.log('\n[Python Learning Hub]');
    await nav('#/student/tools?course=emu-w207-studio');
    await waitText(/print และ input/, 60000);
    const lh = await text();
    const titles = ['print และ input', 'ตัวแปรและชนิดข้อมูล', 'การคำนวณและทศนิยม', 'if / elif / else', 'เงื่อนไขซ้อนและ and / or', 'for และ range', 'while และค่าหยุด', 'ลิสต์ (list)', 'ฟังก์ชัน (def / return)', 'ข้อความ (string)', 'ดิกชันนารี (dict)', 'อ่านข้อมูลแบบ CSV'];
    ok(titles.every(t => lh.includes(t)), 'แสดงหัวข้อไพทอนครบ 12 หัวข้อ', titles.filter(t => !lh.includes(t)));
    ok(/ไพทอน 1 · ลำดับ ตัวแปร และการรับ-แสดงผล/.test(lh) && !/โครงสร้างโปรแกรม C/.test(lh), 'หัวหน่วยเป็นของไพทอน ไม่ใช่ภาษา C');
    await shot('15_learning_hub_python');
    await nav('#/student/tools?course=emu-py-studio');
    await sleep(3000);
    ok(!/print และ input/.test(await text()), 'รายวิชาไพทอนที่ไม่เปิด Studio ไม่แสดงหัวข้อ built-in');

    console.log('\n[รายวิชาภาษา C เดิม]');
    await nav('#/student/workspace?course=emu-c-legacy');
    try { await page.waitForSelector('.CodeMirror', { timeout: 60000 }); } catch (e) { await shot('zz_legacy_fail'); console.log('    URL', page.url(), (await text()).slice(0, 300).split('\n').join(' | ')); }
    ok(/EMU-C-1/.test(await text()), 'Coding Workspace ภาษา C เดิมทำงานปกติ');
    await nav('#/student/tools?course=emu-c-legacy');
    await waitText(/โครงสร้างโปรแกรม Hello World/, 30000);
    ok(true, 'Learning Hub ภาษา C เดิมแสดง 20 หัวข้อเดิม');

    const real = errors.filter(e => !/favicon|Running in emulator|404|ERR_|net::|Gemini API Key|status of 400|status of 429/.test(e));   // 429 = runner ภายนอกจำกัดอัตรา (มี fallback), Gemini = emulator ไม่มี key
    ok(real.length === 0, 'ไม่มี error ใน console', real);
    await browser.close();
    console.log(`\nE2E Phase 2 ผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

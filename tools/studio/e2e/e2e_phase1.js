// tools/studio/e2e/e2e_phase1.js — E2E Phase 1 (เปิด Studio, Template Pack) บน emulator ด้วย headless Chrome
// ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 PUPPETEER_CORE=<path> node tools/studio/e2e/e2e_phase1.js
// ล้างข้อมูลใน emulator ทุกครั้ง · ภาพหน้าจอ (ข้อมูลจำลอง) → docs/studio/screenshots
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const SCR = process.env.STUDIO_E2E_TMP || require('os').tmpdir();
const ROOT = path.join(__dirname, '..', '..', '..');
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const admin = require(path.join(ROOT, 'functions/node_modules/firebase-admin'));
const SHOTS = path.join(ROOT, 'docs', 'studio', 'screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const DL = path.join(SCR, 'downloads'); fs.mkdirSync(DL, { recursive: true });
const BASE = 'http://127.0.0.1:5000/?emulator=1';
const PROJECT = 'ai-powered-coding-596ed';

let pass = 0, fail = 0;
const ok = (c, l, x) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗', l, c || x === undefined ? '' : JSON.stringify(x).slice(0, 300)); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    // ── เตรียมข้อมูล ──
    await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    execFileSync('node', [path.join(ROOT, 'tools/studio/seed_emulator.js')], { stdio: 'inherit', env: process.env });
    admin.initializeApp({ projectId: PROJECT });
    const db = admin.firestore();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    // รายวิชาวิจัยจำลอง (id เดียวกับของจริง) — ต้องขึ้น 🔒
    await db.collection('courses').doc('UZGy0pGurry9Dt9YdhYX').set({ title: 'ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น 1/69 (EMU)', language: 'c', teacherId: 'emu-teacher', status: 'active', coTeacherIds: [], createdAt: ts });
    // รายวิชาแบบ ว23207 จริง: โจทย์ 57 ข้อไม่มีฟิลด์ Studio (สร้างด้วย logic เดียวกับที่เทียบกับของจริงแล้ว)
    global.window = global; global.db = db; global.serverTimestamp = () => ts; global.auth = { currentUser: { uid: 'emu-teacher' } };
    const vm = require('vm');
    for (const f of ['js/studio/content/templates.js', 'js/studio/templatePack.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    await db.collection('courses').doc('emu-w207-live').set({ title: 'EMU ว23207 แบบรายวิชาจริง', language: 'python', teacherId: 'emu-teacher', status: 'active', coTeacherIds: [], createdAt: ts, directoryTree: [] });
    for (const p of require(path.join(ROOT, 'docs/import-samples/apcc_problems_w23207.json'))) {
        const m = tpMapProblem(p, 'w23207');
        const ref = await db.collection('assignments').add({ ...m.assignment, courseId: 'emu-w207-live', createdAt: ts });
        const b = db.batch(); m.testCases.forEach(t => b.set(db.collection('testCases').doc(), { ...t, assignmentId: ref.id })); await b.commit();
    }
    console.log('เตรียมข้อมูลเสร็จ');

    const browser = await puppeteer.launch({
        executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 900000,
        userDataDir: path.join(SCR, 'apcc-e2e-p1-' + Date.now()),   // โปรไฟล์ใหม่ทุกครั้ง ไม่จำการล็อกอินรอบก่อน
        args: ['--no-first-run', '--window-size=1400,1000'],
        defaultViewport: { width: 1400, height: 1000 },
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('dialog', d => { console.log('    (dialog)', d.message().split('\n')[0]); d.accept(); });
    const cdp = await page.createCDPSession();
    const bcdp = await browser.target().createCDPSession(); await bcdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
    const nav = async (h) => { await page.goto(BASE + h, { waitUntil: 'domcontentloaded' }); await page.reload({ waitUntil: 'domcontentloaded' }); };
    const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true });
    const text = () => page.evaluate(() => document.body.innerText);
    const waitText = (re, ms = 30000) => page.waitForFunction(r => new RegExp(r).test(document.body.innerText), { timeout: ms }, re.source);
    const clickText = async (sel, re) => {
        const ok2 = await page.evaluate((s, r) => {
            const el = [...document.querySelectorAll(s)].find(e => new RegExp(r).test(e.innerText || e.textContent) && !e.disabled);
            if (el) { el.click(); return true; } return false;
        }, sel, re.source);
        if (!ok2) throw new Error('ไม่พบปุ่ม ' + re);
    };
    const selectByText = (re, value) => page.evaluate((r, v) => {
        const s = [...document.querySelectorAll('select')].find(x => [...x.options].some(o => new RegExp(r).test(o.text)));
        const o = [...s.options].find(o => (v ? o.value === v : new RegExp(r).test(o.text)));
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        setter.call(s, o.value); s.dispatchEvent(new Event('change', { bubbles: true }));
    }, re.source, value);

    console.log('\n[ล็อกอินครู]');
    await page.goto(BASE + '#/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type=email]', { timeout: 60000 });
    await page.type('input[type=email]', 'teacher@test.local');
    await page.type('input[type=password]', 'apcc1234');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash.startsWith('#/teacher'), { timeout: 30000 });
    ok(true, 'ล็อกอินครูได้');

    console.log('\n[หน้าแก้ไขรายวิชา: ส่วน APCC Studio]');
    await nav('#/teacher/courses?edit=UZGy0pGurry9Dt9YdhYX');
    await waitText(/APCC Studio/);
    ok(/ข้อมูลวิจัยของรายงาน จึงเปิดฟีเจอร์ Studio ไม่ได้/.test(await text()), 'รายวิชาวิจัยขึ้น 🔒 เปิด Studio ไม่ได้');
    await shot('01_course_protected');
    await nav('#/teacher/courses?edit=emu-py-studio');
    await waitText(/เปิดใช้ APCC Studio/);
    await page.click('#studioEnabled');
    await waitText(/Project Studio/);
    await shot('02_course_studio_panel');
    await clickText('button', /บันทึกการตั้งค่า Studio/);
    await waitText(/เปิดใช้ APCC Studio แล้ว/);
    const st = (await db.collection('courses').doc('emu-py-studio').get()).data().studio;
    ok(st && st.enabled === true && st.template === 'w23207' && st.features.projectStudio === true, 'บันทึก studio ลงรายวิชาได้ (template w23207)', st);
    await shot('03_course_studio_saved');
    // เปิด Studio ให้ emu-w207-live ด้วย (ผ่านหน้าเว็บเช่นกัน)
    await nav('#/teacher/courses?edit=emu-w207-live');
    await waitText(/เปิดใช้ APCC Studio/);
    await page.click('#studioEnabled');
    await clickText('button', /บันทึกการตั้งค่า Studio/);
    await waitText(/เปิดใช้ APCC Studio แล้ว/);

    console.log('\n[หน้า Template Pack: นำเข้า ว23207]');
    await nav('#/teacher/studio/templates?course=emu-py-studio');
    await waitText(/Course Template Pack/, 60000);
    ok(true, 'หน้า Template Manager โหลดแบบ lazy ได้');
    await selectByText(/ว23207 นวัตกรรมดิจิทัล — 57 ข้อ/);
    await waitText(/ใหม่ 57/);
    await shot('04_template_dryrun');
    await clickText('button', /นำเข้าโจทย์ใหม่ 57 ข้อ/);
    await waitText(/นำเข้าแล้ว 57 ข้อ, test case 159 กรณี/, 120000);
    ok(true, 'นำเข้า 57 ข้อ 159 กรณีผ่านหน้าเว็บ');
    await waitText(/ใหม่ 0/);
    await shot('05_template_imported');
    const n = (await db.collection('assignments').where('courseId', '==', 'emu-py-studio').where('sourceTemplate', '==', 'w23207@1').count().get()).data().count;
    ok(n === 57, 'ใน Firestore มีโจทย์ w23207@1 = 57 ข้อ', n);

    console.log('\n[บันทึกลงคลัง + ส่งออก]');
    await clickText('button', /บันทึกชุดนี้ลงคลัง template/);
    await waitText(/บันทึกชุดโจทย์ \(รวมเฉลย\)/);
    ok(true, 'บันทึกลงคลังได้');
    fs.readdirSync(DL).forEach(f => fs.unlinkSync(path.join(DL, f)));
    await clickText('button', /ส่งออกรายวิชานี้เป็น template/);
    await waitText(/ส่งออก 59 ข้อ/, 60000);
    await sleep(1500);
    const files = fs.readdirSync(DL).filter(f => f.endsWith('.json'));
    const pack = files.length ? JSON.parse(fs.readFileSync(path.join(DL, files[0]), 'utf8')) : [];
    ok(pack.length === 59 && pack.filter(p => p.solution).length === 57, `ดาวน์โหลดไฟล์ส่งออกได้ (${files[0]}) 59 ข้อ มีเฉลย 57 ข้อจากคลัง`, { files, n: pack.length });

    console.log('\n[ตรวจเฉลย ว23103 ผ่าน runner จริง (Worker → Wandbox → Judge0)]');
    await selectByText(/ว23103 บทที่ 2 — 10 ข้อ/);
    await waitText(/ใหม่ 10/);
    await clickText('button', /ตรวจเฉลยก่อนนำเข้า/);
    const t0 = Date.now(); await waitText(/เฉลยผ่านครบ|เฉลยไม่ผ่าน|ตรวจเฉลยไม่สำเร็จ/, 800000); console.log('    ใช้เวลา', Math.round((Date.now() - t0) / 1000), 'วินาที');
    const vtxt = (await text()).match(/(✅ เฉลยผ่านครบ[^\n]*|⚠️ เฉลยไม่ผ่าน[^\n]*|ตรวจเฉลยไม่สำเร็จ[^\n]*)/);
    ok(/เฉลยผ่านครบ 46\/46/.test(vtxt && vtxt[0]), 'ตรวจเฉลย ว23103 ผ่าน runner จริง', vtxt && vtxt[0]);
    await shot('06_template_verify');

    console.log('\n[D1 เติมข้อมูล Studio ให้โจทย์เดิม]');
    await nav('#/teacher/studio/templates?course=emu-w207-live');
    await waitText(/Course Template Pack/);
    await selectByText(/ว23207 นวัตกรรมดิจิทัล — 57 ข้อ/);
    await waitText(/เติมข้อมูล Studio ได้ 57/);
    await shot('07_enrich_preview');
    await clickText('button', /เติมข้อมูล Studio ให้โจทย์เดิม 57 ข้อ/);
    await waitText(/เติมข้อมูล Studio แล้ว 57 ข้อ/, 120000);
    await waitText(/เติมข้อมูล Studio ได้ 0/);
    ok(true, 'เติมข้อมูล Studio 57 ข้อผ่านหน้าเว็บ');
    await shot('08_enrich_done');
    const ev = (await db.collection('studio_events').where('type', '==', 'template_enrich').count().get()).data().count;
    ok(ev === 57, 'studio_events มี template_enrich 57 รายการ', ev);

    console.log('\n[รายวิชาเดิมยังใช้งานได้]');
    await nav('#/teacher/assignment?course=emu-c-legacy');
    await waitText(/EMU-C-1/, 30000).catch(() => {});
    await shot('09_legacy_assignments');
    ok(/EMU-C-1/.test(await text()), 'หน้าจัดการโจทย์ของรายวิชาภาษา C เดิมแสดงโจทย์ปกติ');

    const real = errors.filter(e => !/favicon|Running in emulator|404|Gemini API Key|status of 400|status of 429/.test(e));   // 429 = runner ภายนอกจำกัดอัตรา (มี fallback), Gemini = emulator ไม่มี key
    ok(real.length === 0, 'ไม่มี error ใน console', real);
    await browser.close();
    console.log(`\nE2E ผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

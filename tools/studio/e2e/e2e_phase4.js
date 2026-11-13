// tools/studio/e2e/e2e_phase4.js — E2E Phase 4 (TeamSync, Project Studio, Web App Runner, Rubric) บน emulator ด้วย headless Chrome
// ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 PUPPETEER_CORE=<path> node tools/studio/e2e/e2e_phase4.js
// ล้างข้อมูลใน emulator ทุกครั้ง · ต้องต่ออินเทอร์เน็ต (โหลด stlite/Pyodide จาก jsDelivr) · ภาพหน้าจอ → docs/studio/screenshots
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const TMP = process.env.STUDIO_E2E_TMP || require('os').tmpdir();
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const admin = require(path.join(ROOT, 'functions/node_modules/firebase-admin'));
const SHOTS = path.join(ROOT, 'docs', 'studio', 'screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const DL = path.join(TMP, 'apcc-e2e-p4-dl'); fs.mkdirSync(DL, { recursive: true });
const BASE = 'http://127.0.0.1:5000/?emulator=1';
const PROJECT = 'ai-powered-coding-596ed';
const CID = 'emu-w207-studio';

let pass = 0, fail = 0;
const pages = [];
const ok = (c, l, x) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗', l, c || x === undefined ? '' : JSON.stringify(x).slice(0, 300)); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    // ── เตรียมข้อมูล: รายวิชา Studio + โจทย์ 57 ข้อ, S01–S03 ผ่านด่านครบ, S03 มีทีมและโปรเจกต์ของตนเองแล้ว ──
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
    const ids = {};
    for (const p of W) {
        const m = tpMapProblem(p, 'w23207');
        const ref = await db.collection('assignments').add({ ...m.assignment, ...m.studioFields, isPublished: true, courseId: CID, createdAt: ts });
        ids[p.id] = ref.id;
    }
    const students = ['emu-s01', 'emu-s02', 'emu-s03'];
    const bs = db.batch();
    for (const sid of students) {
        bs.set(db.collection('enrollments').doc(), { studentId: sid, courseId: CID, enrolledAt: ts, progress: 0, completedLessons: [], lastAccessedAt: ts });
        bs.update(db.collection('users').doc(sid), { enrolledCourses: admin.firestore.FieldValue.arrayUnion(CID) });
        W.filter(p => p.level !== 'สอบ' && p.plan <= 9).forEach(p => bs.set(db.collection('submissions').doc(), { studentId: sid, assignmentId: ids[p.id], courseId: CID, score: 100, status: 'accepted', code: '# seed', language: 'python', submittedAt: ts }));
    }
    bs.set(db.collection('studio_explainBack').doc(), { courseId: CID, uid: 'emu-s01', assignmentId: ids['W207-08-4'], mode: 'explain', aiLevel: 3, aiStatus: 'ok', createdAt: ts });
    bs.set(db.collection('projectTeams').doc('OTHER1'), { name: 'ทีมเช็คชื่อ', code: 'OTHER1', createdBy: 'emu-s03', members: ['emu-s03'], memberNames: { 'emu-s03': 'นักเรียนจำลอง S03' }, createdAt: ts });
    bs.set(db.collection('playerStats').doc('emu-s03'), { teamId: 'OTHER1' }, { merge: true });
    bs.set(db.collection('studio_projects').doc(`${CID}_OTHER1`), { courseId: CID, teamId: 'OTHER1', teamName: 'ทีมเช็คชื่อ', members: ['emu-s03'], memberNames: { 'emu-s03': 'นักเรียนจำลอง S03' }, title: 'แอปเช็คชื่อ', kit: 'A', data: {}, versionCount: 0, createdBy: 'emu-s03', createdAt: ts, schemaVersion: 1 });
    await bs.commit();
    console.log('เตรียมข้อมูลเสร็จ');

    const browser = await puppeteer.launch({
        executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 900000,
        userDataDir: path.join(TMP, 'apcc-e2e-p4-' + Date.now()), args: ['--no-first-run'], defaultViewport: { width: 1400, height: 950 },
    });
    const errors = [];
    const newPage = async (ctx) => {
        const page = await ctx.newPage(); pages.push(page);
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
            if (!done) throw new Error('ไม่พบปุ่ม ' + s); await sleep(250);
        },
        login: async (email, prefix) => {
            await page.goto(BASE + '#/login', { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('input[type=email]', { timeout: 60000 });
            await page.type('input[type=email]', email); await page.type('input[type=password]', 'apcc1234');
            await page.keyboard.press('Enter');
            await page.waitForFunction(p => location.hash.startsWith(p), { timeout: 30000 }, prefix);
        },
        // ใส่ค่าในช่องที่อยู่ใต้ label ที่ขึ้นต้นด้วยข้อความ (ใช้ setter ของ React)
        setField: async (labelStart, value, idx = 0) => {
            const done = await page.evaluate((ls, v, i) => {
                const lab = [...document.querySelectorAll('label')].find(l => l.innerText.trim().startsWith(ls));
                if (!lab) return false;
                const el = [...lab.parentElement.querySelectorAll('input,textarea')][i];
                if (!el) return false;
                const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }, labelStart, value, idx);
            if (!done) throw new Error('ไม่พบช่อง ' + labelStart + ' #' + idx);
            await sleep(120);
        },
        typeNear: async (placeholder, value) => { await page.type(`input[placeholder="${placeholder}"]`, value); },
        clickNear: async (placeholder) => { await page.evaluate(p => document.querySelector(`input[placeholder="${p}"]`).parentElement.querySelector('button').click(), placeholder); await sleep(300); },
    });

    // ── S01 สร้างทีมใน TeamSync ──
    const p1 = await newPage(await browser.createBrowserContext()); const S1 = H(p1);
    console.log('\n[TeamSync: S01 สร้างทีม, S02 เข้าร่วม]');
    await S1.login('s01@test.local', '#/student');
    await S1.nav('#/student/team');
    await p1.waitForSelector('input[placeholder="ชื่อทีม..."]', { timeout: 60000 });
    await S1.typeNear('ชื่อทีม...', 'ทีมก้างปลา');
    await S1.clickNear('ชื่อทีม...');
    let code = null;
    for (let i = 0; i < 20 && !code; i++) { await sleep(1000); const s = await db.collection('playerStats').doc('emu-s01').get(); code = s.exists && s.data().teamId; }
    ok(!!code, 'TeamSync สร้างทีมได้ (เดิมถูกปฏิเสธเพราะไม่มีกฎ projectTeams)', code);
    const p2 = await newPage(await browser.createBrowserContext()); const S2 = H(p2);
    await S2.login('s02@test.local', '#/student');
    await S2.nav('#/student/team');
    await p2.waitForSelector('input[placeholder="รหัสทีม (6 ตัว)..."]', { timeout: 60000 });
    await S2.typeNear('รหัสทีม (6 ตัว)...', code);
    await S2.clickNear('รหัสทีม (6 ตัว)...');
    let members = [];
    for (let i = 0; i < 20 && members.length < 2; i++) { await sleep(1000); members = ((await db.collection('projectTeams').doc(code).get()).data() || {}).members || []; }
    ok(members.length === 2, 'S02 เข้าร่วมทีมด้วยรหัสได้ (สมาชิก 2 คน)', members);
    await S2.shot('24_teamsync_joined');

    // ── S01 สร้างโปรเจกต์และทำครบ 5 ขั้น ──
    console.log('\n[Project Studio: S01 สร้างโปรเจกต์และกรอก 5 ขั้น]');
    await S1.nav('#/student/dashboard');
    await S1.waitText(/เปิด Project Studio/, 60000);
    ok(true, 'แดชบอร์ดมีปุ่ม เปิด Project Studio เมื่อปลดล็อกแล้ว');
    await S1.nav(`#/studio/project?course=${CID}`);
    await S1.waitText(/เริ่มโปรเจกต์ของทีม/, 60000);
    await p1.type('input[placeholder^="ชื่อโปรเจกต์"]', 'แอปคิดเงินสหกรณ์ก้างปลา');
    await S1.clickText('button', 'สร้างโปรเจกต์');
    await S1.waitText(/บอร์ดโปรเจกต์/);
    ok(true, 'สร้างโปรเจกต์ของทีมได้');
    await S1.setField('ผู้ใช้เป้าหมาย', 'แม่ค้าสหกรณ์โรงเรียน');
    await S1.setField('บันทึกการสัมภาษณ์', 'คุยกับป้าแดง: ช่วงพักเที่ยงคนเยอะ คิดเงินไม่ทัน', 0);
    await S1.setField('บันทึกการสัมภาษณ์', 'สังเกตคิวซื้อของ 10 นาที: ทอนเงินผิด 2 ครั้ง', 1);
    await S1.setField('ปัญหาหรือความลำบาก', 'คิดเงินและทอนเงินช้า ผิดบ่อยเมื่อคนเยอะ');
    await S1.clickText('button', 'บันทึกขั้นเข้าใจผู้ใช้');
    await S1.waitText(/✅ บันทึกแล้ว/);
    await S1.clickText('button', 'นิยามปัญหา');
    await S1.setField('ข้อความปัญหา', 'แม่ค้าสหกรณ์ต้องการคิดเงินได้เร็วและถูกต้อง เพราะช่วงพักเที่ยงคนต่อคิวยาว');
    await S1.setField('เราจะ', 'เราจะช่วยแม่ค้าคิดเงินและทอนเงินให้เร็วขึ้นได้อย่างไร');
    await S1.setField('จะรู้ได้อย่างไร', 'คิดเงิน 1 คนไม่เกิน 30 วินาที และทอนไม่ผิด');
    await S1.clickText('button', 'บันทึกขั้นนิยามปัญหา');
    await S1.waitText(/✅ บันทึกแล้ว/);
    await S1.clickText('button', 'ออกแบบ');
    for (const [i, v] of ['เว็บแอปคิดเงิน', 'ตารางราคาติดผนัง', 'เครื่องคิดเลขพร้อมปุ่มลัด'].entries()) await S1.setField('ไอเดียที่ทีมคิด', v, i);
    await S1.setField('ไอเดียที่เลือก', 'เว็บแอปคิดเงิน เพราะคำนวณเงินทอนให้อัตโนมัติ');
    await S1.setField('ออกแบบการทำงาน', 'รับจำนวนสินค้าแต่ละชนิด → คำนวณรวม → รับเงิน → แสดงเงินทอน');
    await S1.clickText('button', 'บันทึกขั้นออกแบบ');
    await S1.waitText(/✅ บันทึกแล้ว/);
    await S1.clickText('button', 'ขอคำถามชวนคิด');
    await S1.waitText(/คำถามจากคลังของครู/, 30000);
    ok(true, 'Design Coach: AI ใช้ไม่ได้ใน emulator → ใช้คำถามจากคลัง');
    await S1.shot('25_project_board_coach');

    console.log('\n[Web App Runner: Kit A รันใน iframe sandbox]');
    await S1.clickText('button', 'สร้างต้นแบบ');
    await S1.waitText(/เว็บแอปของทีม \(Kit A\)/);
    await S1.setField('ต้นแบบทำอะไรได้แล้ว', 'คิดราคารวมและเงินทอนได้ ยังขาดการบันทึกยอดขาย');
    await S1.clickText('button', 'บันทึกขั้นสร้างต้นแบบ');
    await S1.waitText(/✅ บันทึกแล้ว/);
    await S1.clickText('button', 'รันเว็บแอป');
    const t0 = Date.now();
    let frameText = '';
    for (let i = 0; i < 90 && !/รวม 0 บาท/.test(frameText); i++) {
        await sleep(2000);
        const fr = p1.frames().find(f => f !== p1.mainFrame());
        try { frameText = fr ? await fr.evaluate(() => document.body.innerText) : ''; } catch (_) { frameText = ''; }
    }
    ok(/ตัวช่วยคิดเงินสหกรณ์/.test(frameText) && /รวม 0 บาท/.test(frameText), `เว็บแอป Streamlit รันในเบราว์เซอร์ได้ (${Math.round((Date.now() - t0) / 1000)} วินาที)`, frameText.slice(0, 200));
    const sandbox = await p1.evaluate(() => (document.querySelector('iframe[title="webapp-preview"]') || {}).getAttribute && document.querySelector('iframe[title="webapp-preview"]').getAttribute('sandbox'));
    ok(sandbox && !/allow-same-origin/.test(sandbox), 'iframe ไม่มี allow-same-origin (โค้ดนักเรียนเข้าถึงการล็อกอินไม่ได้)', sandbox);
    const leak = await p1.frames().find(f => f !== p1.mainFrame()).evaluate(() => { try { return String(window.parent.location.href); } catch (e) { return 'blocked'; } });
    ok(leak === 'blocked', 'โค้ดใน iframe อ่าน window.parent ไม่ได้', leak);
    await p1.evaluate(() => document.querySelector('iframe[title="webapp-preview"]').scrollIntoView({ block: 'center' })); await sleep(500);
    await S1.shot('26_webapp_runner');
    await p1.type('input[placeholder="บันทึกสั้นๆ ว่ารุ่นนี้เปลี่ยนอะไร"]', 'รุ่นแรก คิดเงินทอนได้');
    await S1.clickText('button', 'บันทึกรุ่น');
    await S1.waitText(/✅ บันทึกรุ่นแล้ว/);
    const proj = (await db.collection('studio_projects').doc(`${CID}_${code}`).get()).data();
    const vers = await db.collection('studio_projects').doc(`${CID}_${code}`).collection('versions').get();
    ok(proj.versionCount === 1 && vers.size === 1 && /import streamlit/.test(vers.docs[0].data().code), 'บันทึกรุ่นเว็บแอปลง versions');

    await S1.clickText('button', 'ทดสอบกับผู้ใช้');
    await S1.setField('ทดสอบรอบที่ 1', 'ให้ป้าแดงลองคิดเงิน 5 ลูกค้า ใช้เวลาเฉลี่ย 40 วินาที กดผิดช่อง');
    await S1.setField('ปรับปรุงอะไร', 'เพิ่มปุ่มล้างค่า และขยายตัวอักษรราคา');
    await S1.setField('ทดสอบรอบที่ 2', 'เฉลี่ย 25 วินาที ทอนถูกทุกครั้ง ผ่านเกณฑ์');
    await S1.clickText('button', 'บันทึกขั้นทดสอบกับผู้ใช้');
    await S1.waitText(/ครบ 5\/5 ขั้น/);
    ok(true, 'โปรเจกต์ครบ 5/5 ขั้น');
    await S1.shot('27_project_all_stages');

    // ── S03 ประเมินทีมอื่น ──
    console.log('\n[S03 ประเมินโปรเจกต์ของทีมอื่น]');
    const p3 = await newPage(await browser.createBrowserContext()); const S3 = H(p3);
    await S3.login('s03@test.local', '#/student');
    await S3.nav(`#/studio/project?course=${CID}`);
    await S3.waitText(/บอร์ดโปรเจกต์/, 60000);
    await S3.clickText('button', 'ประเมินทีมอื่น');
    await S3.waitText(/แอปคิดเงินสหกรณ์ก้างปลา/);
    await S3.clickText('button', 'แอปคิดเงินสหกรณ์ก้างปลา');
    await S3.waitText(/สิ่งที่ชอบ|ส่งคำแนะนำ/);
    await p3.evaluate(() => {
        const rows = [...document.querySelectorAll('div')].filter(d => d.children.length >= 2 && d.querySelectorAll(':scope > div > button').length === 4);
        rows.forEach(r => r.querySelectorAll(':scope > div > button')[2].click());
    });
    await sleep(300);
    await p3.type('textarea[placeholder^="สิ่งที่ชอบ"]', 'ชอบที่คำนวณเงินทอนให้เลย ควรเพิ่มสรุปยอดขายรายวัน');
    await S3.clickText('button', 'ส่งคำแนะนำ');
    await S3.waitText(/✅ ส่งแล้ว/);
    const peer = await db.collection('studio_reviews').doc(`${CID}_${code}_peer_emu-s03`).get();
    ok(peer.exists && Object.keys(peer.data().team).length === 4, 'เพื่อนต่างทีมส่งคำแนะนำตามรูบริก 4 เกณฑ์ได้');
    await S3.shot('28_peer_review');

    // ── ครูประเมินตามรูบริก + CSV ──
    console.log('\n[ครู: ประเมินตามรูบริก เผยแพร่ และส่งออก CSV]');
    const tctx = browser.defaultBrowserContext();
    const tp = await newPage(tctx); const T = H(tp);
    const bcdp = await browser.target().createCDPSession();
    await bcdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
    fs.readdirSync(DL).forEach(f => fs.unlinkSync(path.join(DL, f)));
    await T.login('teacher@test.local', '#/teacher');
    await T.nav(`#/teacher/studio/projects?course=${CID}`);
    await T.waitText(/แอปคิดเงินสหกรณ์ก้างปลา/, 60000);
    await T.shot('29_teacher_project_list');
    await tp.evaluate(() => { const tr = [...document.querySelectorAll('tr')].find(r => r.innerText.includes('แอปคิดเงินสหกรณ์ก้างปลา')); tr.querySelector('button').click(); });
    await T.waitText(/ให้ AI ร่างความเห็น/);
    await T.clickText('button', 'ให้ AI ร่างความเห็น');
    await T.waitText(/ร่างจากหลักฐานในระบบแทน/);
    ok(true, 'AI ใช้ไม่ได้ → ร่างคะแนนจากหลักฐานในระบบ');
    // S02 ไม่มี Explain-Back → ครูให้ระดับเอง
    await tp.evaluate(() => {
        const span = [...document.querySelectorAll('span')].find(s => s.innerText.startsWith('นักเรียนจำลอง S02'));
        span.parentElement.querySelectorAll('button')[2].click();
    });
    await sleep(300);
    await T.clickText('button', 'ยืนยันและเผยแพร่ให้ทีม');
    await T.waitText(/เผยแพร่ให้ทีมเห็น/);
    const rv = (await db.collection('studio_reviews').doc(`${CID}_${code}_teacher`).get()).data();
    ok(rv.published && rv.aiDraftSource === 'rule' && rv.totalByMember['emu-s01'] === 15 && rv.totalByMember['emu-s02'] === 14,
        'บันทึกผลประเมิน: เกณฑ์ทีม 3+3+2+3 = 11 + รายบุคคล (S01 = 4 จาก Explain-Back, S02 = 3 ครูให้) → 15 / 14', rv.totalByMember);
    await tp.evaluate(() => [...document.querySelectorAll('div')].find(d => /^🏅/.test(d.innerText || '') && d.className.includes('font-bold')).scrollIntoView({ block: 'start' })); await sleep(300);
    await T.shot('30_teacher_rubric');
    await T.clickText('button', 'รายการโปรเจกต์');
    await T.waitText(/ส่งออกคะแนน CSV/);
    await T.clickText('button', 'ส่งออกคะแนน CSV');
    await sleep(2000);
    const files = fs.readdirSync(DL).filter(f => f.endsWith('.csv'));
    const csv = files.length ? fs.readFileSync(path.join(DL, files[0]), 'utf8') : '';
    const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    ok(files.length === 1 && lines.length === 4 && /นักเรียนจำลอง S01.*,15,เผยแพร่แล้ว/.test(csv) && /นักเรียนจำลอง S03.*ยังไม่ประเมิน/.test(csv), 'CSV สำหรับ SGS: 3 นักเรียน + หัวตาราง, S01 = 15, S03 ยังไม่ประเมิน', lines);

    // ── S01 เห็นผลประเมิน ──
    console.log('\n[S01 ดูผลประเมินที่ครูเผยแพร่ + คำแนะนำจากเพื่อน]');
    await S1.nav(`#/studio/project?course=${CID}`);
    await S1.waitText(/บอร์ดโปรเจกต์/, 60000);
    await S1.clickText('button', 'ผลประเมิน');
    await S1.waitText(/คำแนะนำจากเพื่อน \(1\)/);
    const fb = await S1.text();
    ok(/ความเข้าใจโค้ด — นักเรียนจำลอง S01/.test(fb) && /ควรเพิ่มสรุปยอดขายรายวัน/.test(fb), 'นักเรียนเห็นผลของครูและคำแนะนำจากเพื่อน');
    await S1.shot('31_student_feedback');

    const real = errors.filter(e => !/favicon|Running in emulator|404|ERR_|net::|Gemini API Key|ไม่พบ Gemini|status of 400|status of 429|toml/.test(e));
    ok(real.length === 0, 'ไม่มี error ใน console', real.slice(0, 5));
    await browser.close();
    console.log(`\nE2E Phase 4 ผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(async e => {
    console.error('❌', e.message);
    for (const [i, p] of pages.entries()) { try { await p.screenshot({ path: path.join(TMP, 'p4_fail_' + i + '.png') }); console.error('   page', i, (await p.evaluate(() => document.body.innerText)).slice(-300).replace(/s+/g, ' ')); } catch (_) {} }
    process.exit(1);
});

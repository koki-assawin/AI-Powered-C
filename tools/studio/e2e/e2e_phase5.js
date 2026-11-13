// tools/studio/e2e/e2e_phase5.js — E2E Phase 5 (Showcase, Portfolio, Studio Analytics) บน emulator ด้วย headless Chrome
// ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 PUPPETEER_CORE=<path> node tools/studio/e2e/e2e_phase5.js
// ล้างข้อมูลใน emulator ทุกครั้ง · ต้องต่ออินเทอร์เน็ต (stlite) · ภาพหน้าจอ → docs/studio/screenshots
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const TMP = process.env.STUDIO_E2E_TMP || require('os').tmpdir();
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const admin = require(path.join(ROOT, 'functions/node_modules/firebase-admin'));
const SHOTS = path.join(ROOT, 'docs', 'studio', 'screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const DL = path.join(TMP, 'apcc-e2e-p5-dl'); fs.mkdirSync(DL, { recursive: true });
const BASE = 'http://127.0.0.1:5000/?emulator=1';
const PROJECT = 'ai-powered-coding-596ed';
const CID = 'emu-w207-studio';
const PID = `${CID}_TEAMKP`;

let pass = 0, fail = 0;
const pages = [];
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
    const feats = { parsons: true, pythonLearningHub: true, skillGate: true, explainBack: true, projectStudio: true, webAppRunner: true, rubricReview: true, portfolio: true, processAnalytics: true };
    await db.collection('courses').doc(CID).set({
        title: 'EMU ว23207 Studio', language: 'python', teacherId: 'emu-teacher', status: 'active', isPublished: true, coTeacherIds: [], createdAt: ts, directoryTree: [],
        studio: { enabled: true, version: '6.0', template: 'w23207', stages: ['practice', 'create', 'share'], hintPolicy: { maxLevelInExam: 0, maxLevelDefault: 4 }, features: feats },
    });
    const ids = {};
    for (const p of W) {
        const m = tpMapProblem(p, 'w23207');
        ids[p.id] = (await db.collection('assignments').add({ ...m.assignment, ...m.studioFields, isPublished: true, courseId: CID, createdAt: ts })).id;
    }
    const bs = db.batch();
    const practice = W.filter(p => p.level !== 'สอบ' && p.plan <= 9);
    [['emu-s01', practice.length], ['emu-s02', practice.length], ['emu-s03', 6]].forEach(([sid, n]) => {
        bs.set(db.collection('enrollments').doc(), { studentId: sid, courseId: CID, enrolledAt: ts, progress: 0, completedLessons: [], lastAccessedAt: ts });
        bs.update(db.collection('users').doc(sid), { enrolledCourses: admin.firestore.FieldValue.arrayUnion(CID) });
        practice.slice(0, n).forEach((p, i) => bs.set(db.collection('submissions').doc(), { studentId: sid, assignmentId: ids[p.id], courseId: CID, score: 100, status: 'accepted', code: '# seed', language: 'python', timeSpentSeconds: 60 + i * 5, hintLevelUsed: i % 3, submittedAt: ts }));
    });
    bs.set(db.collection('studio_explainBack').doc(), { courseId: CID, uid: 'emu-s01', assignmentId: ids['W207-08-4'], assignmentTitle: 'W207-08-4 ภาษีมูลค่าเพิ่ม', mode: 'explain', explanation: 'รับราคาแล้วคูณ 1.07 ในฟังก์ชัน with_vat', aiLevel: 3, aiStatus: 'ok', followUp: 'ถ้าไม่ return?', followUpAnswer: 'ได้ None', createdAt: ts });
    bs.set(db.collection('projectTeams').doc('TEAMKP'), { name: 'ทีมก้างปลา', code: 'TEAMKP', createdBy: 'emu-s01', members: ['emu-s01', 'emu-s02'], memberNames: { 'emu-s01': 'นักเรียนจำลอง S01', 'emu-s02': 'นักเรียนจำลอง S02' }, createdAt: ts });
    const coop = fs.readFileSync(path.join(ROOT, 'js/studio/projectStudio.js'), 'utf8').match(/coop: \{ label: '[^']+', code: `([\s\S]*?)` \}/)[1];
    bs.set(db.collection('studio_projects').doc(PID), {
        courseId: CID, teamId: 'TEAMKP', teamName: 'ทีมก้างปลา', members: ['emu-s01', 'emu-s02'], memberNames: { 'emu-s01': 'นักเรียนจำลอง S01', 'emu-s02': 'นักเรียนจำลอง S02' },
        title: 'แอปคิดเงินสหกรณ์ก้างปลา', kit: 'A', versionCount: 1, createdBy: 'emu-s01', createdAt: ts, schemaVersion: 1,
        data: {
            empathize: { targetUser: 'แม่ค้าสหกรณ์', interviews: ['ป้าแดง', 'ลุงดำ'], painPoints: 'คิดเงินช้าช่วงพักเที่ยง' },
            define: { problemStatement: 'แม่ค้าสหกรณ์ต้องการคิดเงินเร็วขึ้น เพราะคิวยาวช่วงพักเที่ยง', hmw: 'เราจะช่วยคิดเงินเร็วขึ้นได้อย่างไร', successCriteria: 'ไม่เกิน 30 วินาทีต่อคน' },
            ideate: { ideas: ['เว็บแอป', 'ตารางราคา', 'เครื่องคิดเลข'], chosenIdea: 'เว็บแอปคิดเงินและเงินทอน', design: 'รับจำนวน → รวม → ทอน' },
            prototype: { prototypeNotes: 'คิดเงินทอนได้' },
            test: { round1: 'เฉลี่ย 40 วินาที', changes: 'เพิ่มปุ่มล้างค่า', round2: 'เฉลี่ย 25 วินาที ผ่านเกณฑ์' },
        },
    });
    bs.set(db.collection('studio_projects').doc(PID).collection('versions').doc('v1'), { code: coop, note: 'รุ่นแรก', kit: 'A', createdBy: 'emu-s01', createdAt: ts, schemaVersion: 1 });
    bs.set(db.collection('studio_reviews').doc(`${PID}_teacher`), {
        projectId: PID, courseId: CID, reviewerType: 'teacher', reviewerUid: 'emu-teacher', published: true, aiDraftSource: 'rule',
        team: { c1: { level: 3, comment: 'สัมภาษณ์ 2 คน' }, c2: { level: 3, comment: '' }, c3: { level: 3, comment: '' }, c4: { level: 4, comment: 'ทดสอบ 2 รอบ' } },
        individual: { 'emu-s01': { level: 4, comment: 'อธิบายได้ดี' }, 'emu-s02': { level: 3, comment: '' } }, totalByMember: { 'emu-s01': 17, 'emu-s02': 16 }, createdAt: ts,
    });
    bs.set(db.collection('coachInteractions').doc(), { uid: 'emu-s03', coachRole: 'socratic', triggerEvent: 'studio_ladder', relatedId: 'W207-02-3 อายุปีหน้า', prompt: 'x', response: 'y', createdAt: ts });
    await bs.commit();
    console.log('เตรียมข้อมูลเสร็จ');

    const browser = await puppeteer.launch({
        executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 900000,
        userDataDir: path.join(TMP, 'apcc-e2e-p5-' + Date.now()), args: ['--no-first-run'], defaultViewport: { width: 1400, height: 950 },
    });
    const errors = global.__errors = [];
    const newPage = async (ctx) => {
        const page = await ctx.newPage(); pages.push(page);
        page.on('pageerror', e => errors.push('pageerror: ' + e.message));
        page.on('console', async m => { if (m.type() === 'error') { let extra = ''; try { extra = (await Promise.all(m.args().map(a => a.jsonValue().catch(() => '')))).join(' | ').slice(0, 900); } catch (_) {} errors.push('console: ' + m.text() + (/type is invalid/.test(m.text()) ? ' ARGS: ' + extra + ' @' + page.url() : '')); } });
        page.on('dialog', d => { console.log('    (dialog)', d.message().split('\n')[0]); d.accept(); });
        return page;
    };
    const H = (page) => ({
        nav: async (h) => { await page.goto(BASE + h, { waitUntil: 'domcontentloaded' }); await page.reload({ waitUntil: 'domcontentloaded' }); },
        shot: (n, full) => page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: !!full }),
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
    });

    // ── ครูอนุมัติขึ้นแกลเลอรี ──
    const tp = await newPage(browser.defaultBrowserContext()); const T = H(tp);
    const bcdp = await browser.target().createCDPSession();
    await bcdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
    fs.readdirSync(DL).forEach(f => fs.unlinkSync(path.join(DL, f)));
    console.log('\n[ครู: อนุมัติโปรเจกต์ขึ้นแกลเลอรี]');
    await T.login('teacher@test.local', '#/teacher');
    await T.nav(`#/teacher/studio/projects?course=${CID}`);
    await T.waitText(/แอปคิดเงินสหกรณ์ก้างปลา/, 60000);
    await tp.evaluate(() => { const tr = [...document.querySelectorAll('tr')].find(r => r.innerText.includes('แอปคิดเงินสหกรณ์ก้างปลา')); tr.querySelector('button').click(); });
    await T.waitText(/อนุมัติขึ้นแกลเลอรี/);
    await tp.type('input[placeholder^="คำแนะนำผลงานสั้นๆ"]', 'แอปช่วยแม่ค้าสหกรณ์คิดเงินเร็วขึ้นจาก 40 เหลือ 25 วินาที');
    await tp.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.innerText.includes('อนุมัติขึ้นแกลเลอรี') && !b.disabled), { timeout: 30000 });
    await T.clickText('button', 'อนุมัติขึ้นแกลเลอรี');
    await T.waitText(/อนุมัติขึ้นแกลเลอรีแล้ว/);
    const sc = (await db.collection('studio_showcase').doc(PID).get()).data();
    ok(sc && sc.visible && /import streamlit/.test(sc.code) && sc.problem.includes('แม่ค้า'), 'บันทึกสำเนาผลงานลง studio_showcase (รวมโค้ดรุ่นล่าสุด)');
    const stages = await Promise.all(['emu-s01', 'emu-s02'].map(u => db.collection('studio_progress').doc(`${CID}_${u}`).get().then(s => s.data().stage)));
    ok(stages.every(s => s === 'share'), 'สมาชิกทีมเลื่อนไปขั้น "แบ่งปัน"', stages);
    await tp.evaluate(() => [...document.querySelectorAll('div')].find(d => (d.innerText || '').startsWith('🌏 แกลเลอรีผลงาน')).scrollIntoView({ block: 'center' })); await sleep(300);
    await T.shot('32_teacher_showcase_approve');

    console.log('\n[ครู: Studio Analytics]');
    await T.nav(`#/teacher/studio/analytics?course=${CID}`);
    await T.waitText(/รายบุคคล/, 60000);
    const at = await T.text();
    ok(/ปลดล็อกขั้นสร้าง 2 คน · แบ่งปัน 2 คน/.test(at) && /S01/.test(at) && /S03/.test(at), 'แดชบอร์ด: นักเรียน 3 คน ปลดล็อก 2 แบ่งปัน 2 พร้อมรหัส S01–S03');
    ok(/ด่าน 1 ลำดับ ตัวแปร และการรับ-แสดงผล \(14 ข้อ\)/.test(at) && /2\/3 · 66.7%/.test(at), 'อัตราผ่านด่าน 1 = 2/3 (66.7%)');
    ok(!/นักเรียนจำลอง S01/.test(at), 'ค่าเริ่มต้นไม่แสดงชื่อนักเรียน');
    await T.shot('33_studio_analytics', true);
    await T.clickText('button', 'CSV ปกปิดตัวตน');
    await sleep(2000);
    const files = fs.readdirSync(DL).filter(f => f.endsWith('.csv'));
    const csv = files.length ? fs.readFileSync(path.join(DL, files[0]), 'utf8') : '';
    ok(files.length === 1 && csv.trim().split(/\r?\n/).length === 4 && !/นักเรียนจำลอง|emu-s0|9000/.test(csv), 'ดาวน์โหลด CSV 3 แถว ไม่มีชื่อ/uid/รหัสนักเรียน');

    // เปลี่ยนหน้า Studio โดยไม่โหลดใหม่ (เหมือนกดเมนู) — StudioPage ตัวเดิมต้องโหลดหน้าใหม่ได้ ไม่พัง
    await tp.evaluate(c => { location.hash = '#/teacher/studio/gates?course=' + c; }, CID);
    await T.waitText(/ด่านทักษะ & Explain-Back/, 60000);
    await tp.evaluate(c => { location.hash = '#/teacher/studio/templates?course=' + c; }, CID);
    await T.waitText(/Course Template Pack/, 60000);
    ok(true, 'สลับหน้า Studio ผ่านเมนูโดยไม่โหลดใหม่ได้ (Analytics → ด่านทักษะ → ชุดโจทย์)');

    // ── นักเรียน ──
    const sp = await newPage(await browser.createBrowserContext()); const S = H(sp);
    console.log('\n[นักเรียน S01: ขั้นแบ่งปัน, แกลเลอรี, พอร์ตโฟลิโอ]');
    await S.login('s01@test.local', '#/student');
    await S.nav('#/student/dashboard');
    await S.waitText(/ได้รับคัดเลือกขึ้นแกลเลอรีแล้ว/, 60000);
    ok(true, 'แดชบอร์ดแสดงขั้น "แบ่งปัน"');
    await S.shot('34_stage_share');
    await S.nav(`#/studio/showcase?course=${CID}`);
    await S.waitText(/แอปคิดเงินสหกรณ์ก้างปลา/, 60000);
    await S.shot('35_showcase_gallery');
    await S.clickText('button', 'แอปคิดเงินสหกรณ์ก้างปลา');
    await S.waitText(/ผลทดสอบกับผู้ใช้/);
    await S.clickText('button', 'รันเว็บแอป');
    let ft = '';
    for (let i = 0; i < 60 && !/รวม 0 บาท/.test(ft); i++) { await sleep(2000); const fr = sp.frames().find(f => f !== sp.mainFrame()); try { ft = fr ? await fr.evaluate(() => document.body.innerText) : ''; } catch (_) { ft = ''; } }
    ok(/ตัวช่วยคิดเงินสหกรณ์/.test(ft), 'เปิดผลงานในแกลเลอรีแล้วรันเว็บแอปได้');
    await S.nav(`#/studio/portfolio?course=${CID}`);
    await S.waitText(/ผลประเมินโปรเจกต์ \(17\/20\)/, 60000);
    const pt = await S.text();
    ok(/ด่านทักษะ · ขั้น แบ่งปัน/.test(pt) && /Explain-Back \(1 ครั้ง\)/.test(pt) && /อยู่ในแกลเลอรี/.test(pt) && /ผ่านครบทุก test case \(45 ข้อ\)/.test(pt), 'พอร์ตโฟลิโอ: ด่าน, โจทย์ที่ผ่าน 45 ข้อ, Explain-Back, โปรเจกต์ในแกลเลอรี, คะแนน 17/20');
    await S.shot('36_portfolio', true);
    await sp.emulateMediaType('print');
    const headerHidden = await sp.evaluate(() => getComputedStyle(document.querySelector('header')).display === 'none' && getComputedStyle(document.querySelector('.no-print')).display === 'none');
    ok(headerHidden, 'โหมดพิมพ์ซ่อนแถบเมนูและปุ่มพิมพ์');
    const pdfPath = path.join(TMP, 'portfolio_s01.pdf');
    await sp.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    ok(fs.statSync(pdfPath).size > 20000, `บันทึกพอร์ตโฟลิโอเป็น PDF ได้ (${Math.round(fs.statSync(pdfPath).size / 1024)} KB)`);
    await sp.emulateMediaType('screen');

    console.log('\n[ครูเปิดพอร์ตโฟลิโอของ S02 / S03 ไม่มีโปรเจกต์]');
    await T.nav(`#/studio/portfolio?course=${CID}&uid=emu-s02`);
    await T.waitText(/ผลประเมินโปรเจกต์ \(16\/20\)/, 60000);
    ok(/นักเรียนจำลอง S02/.test(await T.text()), 'ครูเปิดพอร์ตโฟลิโอของนักเรียนรายคนได้');
    const s3 = await newPage(await browser.createBrowserContext()); const S3 = H(s3);
    await S3.login('s03@test.local', '#/student');
    await S3.nav(`#/studio/portfolio?course=${CID}`);
    await S3.waitText(/ยังไม่มีโปรเจกต์/, 60000);
    const s3t = await S3.text();
    ok(/ขั้น ฝึก/.test(s3t) && !/นักเรียนจำลอง S01/.test(s3t), 'นักเรียนที่ยังไม่มีโปรเจกต์: ขั้นฝึก และไม่เห็นข้อมูลของคนอื่น');
    await S3.nav(`#/studio/portfolio?course=${CID}&uid=emu-s01`);
    await S3.waitText(/พอร์ตโฟลิโอ/, 60000); await sleep(3000);
    ok(!/นักเรียนจำลอง S01/.test(await S3.text()), 'นักเรียนใส่ uid ของคนอื่นใน URL ไม่ได้ (ระบบแสดงของตนเองเสมอ)');

    const real = errors.filter(e => !/favicon|Running in emulator|404|ERR_|net::|Gemini API Key|ไม่พบ Gemini|status of 400|status of 429|toml/.test(e));
    real.forEach(e => console.log('ERRFULL', e.slice(0, 1500)));
    ok(real.length === 0, 'ไม่มี error ใน console', real.slice(0, 5));
    await browser.close();
    console.log(`\nE2E Phase 5 ผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(async e => {
    console.error('❌', e.message);
    (global.__errors || []).slice(0, 8).forEach(x => console.error('   err', x.slice(0, 300)));
    for (const [i, p] of pages.entries()) { try { await p.screenshot({ path: path.join(TMP, 'p5_fail_' + i + '.png') }); console.error('   page', i, (await p.evaluate(() => document.body.innerText)).slice(-300).replace(/\s+/g, ' ')); } catch (_) {} }
    process.exit(1);
});

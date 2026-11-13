// tools/studio/e2e/e2e_phase6.js — Regression ก่อนรวม branch (ข้อ 7.1 และ 7.5) บน emulator ด้วย headless Chrome
//  7.1 หน้าของรายวิชาเดิม (ไม่มี studio) ทำงานเหมือนเดิม: Workspace/ส่งงาน/คะแนน/Gradebook/คำใบ้ AI แบบเดิม/
//      Self Practice/Leaderboard/TeamSync/Poll/Learning Hub ภาษา C/ActivityBuilder/StudentAnalytics
//  7.5 จอมือถือ 360 px: หน้า Studio ต้องไม่ล้นแนวนอน · เวลาโหลดหน้า Workspace ของรายวิชาเดิม: branch เทียบ main ต้องไม่เพิ่มเกิน 10%
// ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 PUPPETEER_CORE=<path> node tools/studio/e2e/e2e_phase6.js
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const http = require('http');
const { execFileSync, execSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const TMP = process.env.STUDIO_E2E_TMP || require('os').tmpdir();
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const admin = require(path.join(ROOT, 'functions/node_modules/firebase-admin'));
const SHOTS = path.join(ROOT, 'docs', 'studio', 'screenshots'); fs.mkdirSync(SHOTS, { recursive: true });
const BASE = 'http://127.0.0.1:5000/?emulator=1';
const PROJECT = 'ai-powered-coding-596ed';
const SC = 'emu-w207-studio';
const BASE_REF = process.env.STUDIO_BASE_REF || 'main';

let pass = 0, fail = 0;
const pages = [];
const ok = (c, l, x) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗', l, c || x === undefined ? '' : JSON.stringify(x).slice(0, 300)); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// เซิร์ฟเวอร์ไฟล์นิ่งตัวเดียวกันสำหรับทั้งสองรุ่น (เทียบเวลาโหลดอย่างยุติธรรม)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const serve = (dir, port) => new Promise(res => {
    const srv = http.createServer((req, rsp) => {
        let p = decodeURIComponent(req.url.split('?')[0]);
        if (p === '/') p = '/index.html';
        const f = path.join(dir, p);
        if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
        rsp.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
        fs.createReadStream(f).pipe(rsp);
    }).listen(port, '127.0.0.1', () => res(srv));
});

(async () => {
    // ── ข้อมูล: รายวิชา C เดิม (จาก seed) + รายวิชา Studio สำหรับทดสอบจอมือถือ ──
    await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    execFileSync('node', [path.join(ROOT, 'tools/studio/seed_emulator.js')], { stdio: 'inherit', env: process.env });
    admin.initializeApp({ projectId: PROJECT });
    const db = admin.firestore();
    const ts = admin.firestore.FieldValue.serverTimestamp();
    global.window = global; global.db = db; global.serverTimestamp = () => ts; global.auth = { currentUser: { uid: 'emu-teacher' } };
    for (const f of ['js/studio/content/templates.js', 'js/studio/templatePack.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    const W = require(path.join(ROOT, 'docs/import-samples/apcc_problems_w23207.json'));
    const feats = { parsons: true, pythonLearningHub: true, skillGate: true, explainBack: true, projectStudio: true, webAppRunner: true, rubricReview: true, portfolio: true, processAnalytics: true };
    await db.collection('courses').doc(SC).set({ title: 'EMU ว23207 Studio', language: 'python', teacherId: 'emu-teacher', status: 'active', isPublished: true, coTeacherIds: [], createdAt: ts, directoryTree: [],
        studio: { enabled: true, version: '6.0', template: 'w23207', stages: ['practice', 'create', 'share'], hintPolicy: { maxLevelInExam: 0, maxLevelDefault: 4 }, features: feats } });
    const ids = {};
    for (const p of W) { const m = tpMapProblem(p, 'w23207'); ids[p.id] = (await db.collection('assignments').add({ ...m.assignment, ...m.studioFields, isPublished: true, courseId: SC, createdAt: ts })).id; }
    const bs = db.batch();
    bs.set(db.collection('enrollments').doc(), { studentId: 'emu-s02', courseId: SC, enrolledAt: ts, progress: 0, completedLessons: [], lastAccessedAt: ts });
    bs.update(db.collection('users').doc('emu-s02'), { enrolledCourses: admin.firestore.FieldValue.arrayUnion(SC) });
    W.filter(p => p.level !== 'สอบ' && p.plan <= 9).forEach(p => bs.set(db.collection('submissions').doc(), { studentId: 'emu-s02', assignmentId: ids[p.id], courseId: SC, score: 100, status: 'accepted', code: '#', language: 'python', submittedAt: ts }));
    bs.set(db.collection('projectTeams').doc('TM'), { name: 'ทีมทดสอบมือถือ', code: 'TM', createdBy: 'emu-s02', members: ['emu-s02'], memberNames: { 'emu-s02': 'นักเรียนจำลอง S02' }, createdAt: ts });
    bs.set(db.collection('playerStats').doc('emu-s02'), { teamId: 'TM' }, { merge: true });
    bs.set(db.collection('studio_projects').doc(`${SC}_TM`), { courseId: SC, teamId: 'TM', teamName: 'ทีมทดสอบมือถือ', members: ['emu-s02'], memberNames: { 'emu-s02': 'นักเรียนจำลอง S02' }, title: 'แอปทดสอบจอเล็ก', kit: 'A', data: { define: { problemStatement: 'ปัญหาตัวอย่างที่ยาวพอสมควรเพื่อดูการตัดบรรทัดบนจอมือถือขนาด 360 พิกเซล' } }, versionCount: 0, createdBy: 'emu-s02', createdAt: ts, schemaVersion: 1 });
    bs.set(db.collection('studio_showcase').doc(`${SC}_TM`), { projectId: `${SC}_TM`, courseId: SC, title: 'แอปทดสอบจอเล็ก', teamName: 'ทีมทดสอบมือถือ', memberNames: { 'emu-s02': 'นักเรียนจำลอง S02' }, problem: 'ปัญหาตัวอย่าง', solution: 'แนวทาง', kit: 'A', code: 'import streamlit as st\nst.title("x")', visible: true, approvedAt: ts });
    await bs.commit();
    console.log('เตรียมข้อมูลเสร็จ');

    const browser = await puppeteer.launch({
        executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 900000,
        userDataDir: path.join(TMP, 'apcc-e2e-p6-' + Date.now()), args: ['--no-first-run'], defaultViewport: { width: 1400, height: 950 },
    });
    const errors = [];
    const newPage = async (ctx) => {
        const page = await ctx.newPage(); pages.push(page); page.setDefaultNavigationTimeout(90000);
        page.on('pageerror', e => errors.push('pageerror: ' + e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
        page.on('dialog', d => { console.log('    (dialog)', d.message().split('\n')[0]); d.accept(); });
        return page;
    };
    const H = (page, base = BASE) => ({
        nav: async (h) => { await page.goto(base + h, { waitUntil: 'domcontentloaded' }); await page.reload({ waitUntil: 'domcontentloaded' }); },
        text: () => page.evaluate(() => document.body.innerText),
        waitText: (re, ms = 45000) => page.waitForFunction(r => new RegExp(r).test(document.body.innerText), { timeout: ms }, re.source),
        clickText: async (sel, s) => {
            const done = await page.evaluate((q, t) => { const el = [...document.querySelectorAll(q)].find(e => (e.innerText || '').includes(t) && !e.disabled); if (el) { el.click(); return true; } return false; }, sel, s);
            if (!done) throw new Error('ไม่พบปุ่ม ' + s); await sleep(250);
        },
        login: async (email, prefix) => {
            await page.goto(base + '#/login', { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('input[type=email]', { timeout: 60000 });
            await page.type('input[type=email]', email); await page.type('input[type=password]', 'apcc1234');
            await page.keyboard.press('Enter');
            await page.waitForFunction(p => location.hash.startsWith(p), { timeout: 30000 }, prefix);
        },
        setCode: (code) => page.evaluate(c => document.querySelector('.CodeMirror').CodeMirror.setValue(c), code),
    });
    const asg = Object.fromEntries((await db.collection('assignments').where('courseId', '==', 'emu-c-legacy').get()).docs.map(d => [d.data().title.split(' ')[0], d.id]));

    // ── 7.1 รายวิชาเดิม: นักเรียน ──
    const sp = await newPage(await browser.createBrowserContext()); const S = H(sp);
    console.log('\n[7.1 นักเรียน — รายวิชาภาษา C เดิม]');
    await S.login('s01@test.local', '#/student');
    await S.nav(`#/student/workspace?course=emu-c-legacy&assignment=${asg['EMU-C-1']}`);
    await sp.waitForSelector('.CodeMirror', { timeout: 60000 });
    ok(!/APCC Studio|โจทย์เรียงบรรทัด|โปรแกรมของฉัน/.test(await S.text()), 'Workspace ภาษา C ไม่มีส่วนของ Studio');
    await S.setCode('#include <stdio.h>\nint main() {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d\\n", a + b);\n    return 0;\n}\n');
    await S.clickText('button', 'ทดสอบตัวอย่าง');
    await S.waitText(/ผ่าน|Pass|✓/, 180000);
    await S.clickText('button', 'Submit');
    await S.waitText(/100%/, 240000);
    const sub = (await db.collection('submissions').where('studentId', '==', 'emu-s01').where('assignmentId', '==', asg['EMU-C-1']).get()).docs[0];
    ok(sub && sub.data().score === 100 && sub.data().language === 'c', 'ส่งงานภาษา C ได้ 100 (grader เดิม)');
    const gr = (await db.collection('grades').where('studentId', '==', 'emu-s01').where('assignmentId', '==', asg['EMU-C-1']).get()).docs[0];
    ok(gr && gr.data().score === 100, 'บันทึกคะแนนลง grades ตามเดิม');
    await S.nav(`#/student/workspace?course=emu-c-legacy&assignment=${asg['EMU-C-2']}`);
    await sp.waitForSelector('.CodeMirror', { timeout: 60000 });
    await S.setCode('#include <stdio.h>\nint main() { printf("even\\n"); return 0; }\n');
    await S.clickText('button', 'Submit');
    await S.waitText(/ขอ AI Scaffolding \(คำใบ้\) ระดับที่ 1/, 240000);
    await S.clickText('button', 'ขอ AI Scaffolding (คำใบ้) ระดับที่ 1');
    await S.waitText(/ระดับ 1/, 60000);
    await sleep(1500);
    const hintTxt = await S.text();
    ok(!/คำใบ้จากครู/.test(hintTxt), 'คำใบ้ของรายวิชาเดิมไม่ใช้ hintLadder ของ Studio');
    const aiHint = (await db.collection('usageEvents').where('event', '==', 'ai_hint').where('uid', '==', 'emu-s01').get()).size;
    const ci = (await db.collection('coachInteractions').where('uid', '==', 'emu-s01').get()).docs.map(d => d.data().triggerEvent);
    ok(aiHint === 1 && ci.some(t => /^hint_level_1/.test(t)) && !ci.includes('studio_ladder'), 'บันทึก usageEvents ai_hint และ coachInteractions hint_level_1 แบบเดิม', { aiHint, ci });
    await S.nav('#/student/gradebook');
    await S.waitText(/EMU ภาษา C/, 60000);
    ok(true, 'Gradebook แสดงรายวิชาเดิม');
    await S.nav('#/student/practice');
    await S.waitText(/printf/, 60000);
    ok(true, 'Self Practice (คลังโจทย์ภาษา C เดิม) โหลดได้');
    for (const [h, re, label] of [['#/student/leaderboard', /อันดับ|Leaderboard/, 'Leaderboard'], ['#/student/team', /ทีม/, 'TeamSync'], ['#/student/poll', /Poll|โพล|คำถาม|รอครู/, 'Quick Poll (นักเรียน)'],
        ['#/student/tools?course=emu-c-legacy', /โครงสร้างโปรแกรม Hello World/, 'Learning Hub ภาษา C 20 หัวข้อเดิม']]) {
        await S.nav(h);
        await S.waitText(re, 60000);
        ok(true, `${label} โหลดได้`);
    }
    await S.nav('#/student/dashboard');
    await S.waitText(/รายวิชาของฉัน/, 60000); await sleep(2000);
    ok(!/APCC Studio/.test(await S.text()), 'แดชบอร์ดนักเรียนที่ไม่มีรายวิชา Studio ไม่แสดงกล่อง Studio');

    // ── 7.1 รายวิชาเดิม: ครู ──
    const tp = await newPage(await browser.createBrowserContext()); const T = H(tp);
    console.log('\n[7.1 ครู — หน้าเดิม]');
    await T.login('teacher@test.local', '#/teacher');
    for (const [h, re, label] of [['#/teacher/activities', /Coding Platform/, 'ActivityBuilder'], ['#/teacher/analytics', /วิเคราะห์|Analytics/, 'StudentAnalytics'],
        [`#/teacher/assignment?course=emu-c-legacy`, /EMU-C-1/, 'จัดการโจทย์ (AssignmentManager)'], ['#/teacher/poll', /Poll|โพล/, 'Quick Poll (ครู)']]) {
        await T.nav(h);
        await T.waitText(re, 60000);
        ok(true, `${label} โหลดได้`);
    }
    await T.nav('#/teacher/courses?edit=emu-c-legacy');
    await T.waitText(/เปิดใช้ APCC Studio/, 60000);
    ok(!(await tp.$eval('#studioEnabled', e => e.checked)), 'หน้าแก้ไขรายวิชาเดิม: Studio ปิดอยู่ (ค่าเริ่มต้น)');
    ok((await db.collection('courses').doc('emu-c-legacy').get()).data().studio === undefined, 'รายวิชาเดิมไม่มีฟิลด์ studio');

    // ── 7.5 จอมือถือ 360 px ──
    console.log('\n[7.5 จอมือถือ 360 px — หน้าไม่ล้นแนวนอน]');
    const mp = await newPage(await browser.createBrowserContext()); const M = H(mp);
    await M.login('s02@test.local', '#/student');
    await mp.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const overflow = () => mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    for (const [h, re, label, studio] of [
        ['#/student/dashboard', /APCC Studio/, 'แดชบอร์ด (กล่อง Studio)', true],
        [`#/studio/project?course=${SC}`, /บอร์ดโปรเจกต์/, 'Project Studio', true],
        [`#/studio/showcase?course=${SC}`, /แอปทดสอบจอเล็ก/, 'แกลเลอรี', true],
        [`#/studio/portfolio?course=${SC}`, /ด่านทักษะ/, 'พอร์ตโฟลิโอ', true],
        [`#/student/tools?course=${SC}`, /print และ input/, 'Learning Hub ไพทอน', true],
        [`#/student/workspace?course=${SC}&assignment=${ids['W207-04-5']}`, /ตรวจลำดับ/, 'Parsons', true],
    ]) {
        await M.nav(h);
        await M.waitText(re, 60000); await sleep(800);
        const ov = await overflow();
        ok(ov <= 1, `${label}: ไม่ล้นแนวนอน (เกิน ${ov}px)`);
        if (label === 'Project Studio') await mp.screenshot({ path: path.join(SHOTS, '37_mobile_project_studio.png') });
        if (label === 'แดชบอร์ด (กล่อง Studio)') await mp.screenshot({ path: path.join(SHOTS, '38_mobile_dashboard.png') });
    }

    // ── 7.5 เวลาโหลด: main เทียบ branch (เซิร์ฟเวอร์เดียวกัน) ──
    console.log(`\n[7.5 เวลาโหลด Workspace รายวิชาภาษา C — ${BASE_REF} เทียบ branch]`);
    const mainDir = path.join(TMP, 'apcc-main-src');
    fs.rmSync(mainDir, { recursive: true, force: true }); fs.mkdirSync(mainDir, { recursive: true });
    execSync(`git archive ${BASE_REF} | tar -x -C "${mainDir.replace(/\\/g, '/')}"`, { cwd: ROOT, shell: 'bash' });
    // ใส่ตัวต่อ emulator 4 บรรทัดเดียวกับ branch ให้ main (เฉพาะสำเนาชั่วคราว) เพื่อให้วัดกับข้อมูลชุดเดียวกัน
    const fbPath = path.join(mainDir, 'js', 'firebase.js');
    fs.writeFileSync(fbPath, fs.readFileSync(fbPath, 'utf8').replace('const rtdb = firebase.database();',
        "const rtdb = firebase.database();\nif (/[?&]emulator=1/.test(location.search)) { db.useEmulator('127.0.0.1', 8080); auth.useEmulator('http://127.0.0.1:9099'); rtdb.useEmulator('127.0.0.1', 9000); }"));
    const s1 = await serve(mainDir, 5081), s2 = await serve(ROOT, 5082);
    // วัดแบบสลับรอบ main/branch ทีละครั้ง (ลดผลของเครือข่าย/CDN ที่แกว่งตามช่วงเวลา) และจับเวลาในหน้าเว็บเอง
    const openWs = async (port) => {
        const pg = await newPage(await browser.createBrowserContext()); const X = H(pg, `http://127.0.0.1:${port}/?emulator=1`);
        await X.login('s01@test.local', '#/student');
        await pg.goto(`http://127.0.0.1:${port}/?emulator=1#/student/workspace?course=emu-c-legacy&assignment=${asg['EMU-C-3']}`, { waitUntil: 'domcontentloaded' });
        await pg.waitForFunction(() => document.querySelector('.CodeMirror'), { timeout: 90000 });   // อุ่นแคช
        return pg;
    };
    const once = async (pg) => {
        await pg.reload({ waitUntil: 'domcontentloaded' });
        await pg.waitForFunction(() => document.querySelector('.CodeMirror') && /EMU-C-3/.test(document.body.innerText), { timeout: 90000, polling: 50 });
        return Math.round(await pg.evaluate(() => performance.now()));
    };
    const pMain = await openWs(5081), pBranch = await openWs(5082);
    const tMain = [], tBranch = [];
    for (let i = 0; i < 10; i++) { tMain.push(await once(pMain)); tBranch.push(await once(pBranch)); }
    const mm = median(tMain), mb = median(tBranch);
    const pct = Math.round((mb / mm - 1) * 1000) / 10;
    const pairs = tMain.map((m, i) => tBranch[i] / m);
    console.log(`    ${BASE_REF}: ${tMain.join(', ')} ms → มัธยฐาน ${mm} ms`);
    console.log(`    branch: ${tBranch.join(', ')} ms → มัธยฐาน ${mb} ms`);
    console.log(`    อัตราส่วน branch/main รายรอบ: มัธยฐาน ${median(pairs).toFixed(3)}`);
    // ต้นทุนที่ Studio เพิ่มให้หน้าเดิมโดยตรง: ดาวน์โหลด + Babel แปลง studioConfig.js และ studioLoader.js (วัดในหน้าเว็บ 5 รอบ)
    const direct = await pBranch.evaluate(async () => {
        const out = [];
        for (let i = 0; i < 5; i++) {
            const t0 = performance.now();
            for (const f of ['js/studio/studioConfig.js', 'js/studio/studioLoader.js']) {
                const src = await (await fetch(f + '?nocache=' + Math.random())).text();
                Babel.transform(src, { presets: ['react'] });
            }
            out.push(performance.now() - t0);
        }
        return out.sort((a, b) => a - b)[2];
    });
    const directPct = Math.round(direct / mm * 1000) / 10;
    console.log(`    ต้นทุนที่ Studio เพิ่มโดยตรง: ${Math.round(direct)} ms (${directPct}% ของเวลาโหลด)`);
    ok(median(pairs) <= 1.10 && directPct <= 10, `เวลาโหลดหน้า Workspace รายวิชาเดิมเพิ่มไม่เกิน 10% (มัธยฐาน ${pct}%, ต้นทุนโดยตรง ${directPct}%)`, { mm, mb, direct });
    s1.close(); s2.close();

    // คำเตือน setState หลัง unmount ของ StudentDashboard เป็นพฤติกรรมเดิมของหน้าเดิม (ออกจากแดชบอร์ดก่อนโหลดเสร็จ) ไม่ใช่โค้ดของ Studio
    const legacyWarn = errors.filter(e => /unmounted component[\s\S]*at StudentDashboard /.test(e));
    if (legacyWarn.length) console.log(`    (หมายเหตุ) คำเตือนเดิมของ StudentDashboard ${legacyWarn.length} ครั้ง — ไม่นับเป็นข้อผิดพลาดของ Studio`);
    const real = errors.filter(e => !legacyWarn.includes(e) && !/favicon|Running in emulator|404|ERR_|net::|Gemini API Key|ไม่พบ Gemini|status of 400|status of 429|toml|AI Scaffolding|Gemini/i.test(e));
    real.forEach(e => console.log('ERRFULL', e.slice(0, 600)));
    ok(real.length === 0, 'ไม่มี error ใน console', real.slice(0, 5));
    await browser.close();
    console.log(`\nE2E Phase 6 ผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(async e => {
    console.error('❌', e.message);
    for (const [i, p] of pages.entries()) { try { await p.screenshot({ path: path.join(TMP, 'p6_fail_' + i + '.png') }); console.error('   page', i, (await p.evaluate(() => document.body.innerText)).slice(-300).replace(/\s+/g, ' ')); } catch (_) {} }
    process.exit(1);
});

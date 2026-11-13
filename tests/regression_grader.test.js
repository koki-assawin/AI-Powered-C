#!/usr/bin/env node
/**
 * tests/regression_grader.test.js — ผลตรวจของ gradeSubmission ต้องเท่าเดิม (ข้อ 7.2)
 *
 * วิธี:
 *  1) อ่านงานที่นักเรียนส่งจริงของรายวิชาภาษา C (ค่าเริ่มต้น ว31281 1/69) แบบอ่านอย่างเดียว:
 *     เลือกโจทย์ละ 1 งาน (งานล่าสุด) สูงสุด N ข้อ + test cases ของโจทย์นั้น + config/runner
 *  2) คัดลอกโจทย์/test case ลง emulator (ไม่มีข้อมูลนักเรียน) แล้วรัน gradeSubmission ของ grader.js
 *     สองรุ่นคู่กัน: รุ่นใน main (ก่อน Studio) และรุ่นใน branch นี้ ด้วยโค้ดชุดเดียวกัน
 *  3) คะแนน/จำนวนกรณีที่ผ่าน/สถานะ ต้องเท่ากันทุกข้อ (และรายงานว่าตรงกับคะแนนที่บันทึกไว้จริงกี่ข้อ เพื่อข้อมูล)
 * ไม่เขียนอะไรลง production · ไม่พิมพ์โค้ดหรือชื่อนักเรียนออกจอ
 *
 * ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node tests/regression_grader.test.js [--course <id>] [--n 12] [--base main]
 */
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const PROJECT = 'ai-powered-coding-596ed';
if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('❌ ต้องตั้ง FIRESTORE_EMULATOR_HOST (ผลตรวจถูกเขียนลง emulator)'); process.exit(1); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const COURSE = arg('--course', 'UZGy0pGurry9Dt9YdhYX');
const N = Number(arg('--n', 12));
const BASE = arg('--base', 'main');
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));

(async () => {
    // ── 1) อ่าน production (อ่านอย่างเดียว) ──
    const saved = process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    const prod = admin.initializeApp({ credential: admin.credential.cert(require(path.join(ROOT, 'serviceAccountKey.json'))) }, 'prod').firestore();
    const subsSnap = await prod.collection('submissions').where('courseId', '==', COURSE).limit(400).get();
    const runnerCfg = (await prod.collection('config').doc('runner').get()).data() || {};
    const latest = {};
    subsSnap.docs.map(d => d.data()).filter(s => s.code && (s.language || 'c') === 'c').forEach(s => {
        const cur = latest[s.assignmentId];
        if (!cur || (s.submittedAt?.seconds || 0) > (cur.submittedAt?.seconds || 0)) latest[s.assignmentId] = s;
    });
    // ให้มีทั้งงานที่ได้เต็มและไม่เต็ม
    const all = Object.values(latest);
    const picked = [...all.filter(s => s.score === 100).slice(0, Math.ceil(N / 2)), ...all.filter(s => s.score !== 100)].slice(0, N);
    const tcByA = {};
    for (const s of picked) {
        const t = await prod.collection('testCases').where('assignmentId', '==', s.assignmentId).get();
        tcByA[s.assignmentId] = t.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    process.env.FIRESTORE_EMULATOR_HOST = saved;
    console.log(`อ่านจาก production: งาน ${subsSnap.size} รายการ → เลือก ${picked.length} โจทย์ (เต็ม ${picked.filter(s => s.score === 100).length} / ไม่เต็ม ${picked.filter(s => s.score !== 100).length})`);

    // ── 2) เตรียม emulator ──
    const emu = admin.initializeApp({ projectId: PROJECT }, 'emu').firestore();
    await emu.collection('courses').doc('reg-c').set({ title: 'regression C', language: 'c', gradingPolicy: 'best' });
    await emu.collection('config').doc('runner').set(runnerCfg);
    for (const [aid, tcs] of Object.entries(tcByA)) {
        const b = emu.batch();
        tcs.forEach(t => { const { id, ...rest } = t; b.set(emu.collection('testCases').doc(`reg_${id}`), rest); });
        await b.commit();
    }

    const makeGrader = (src, label) => {
        const store = {};
        const ctx = {
            db: emu, console, fetch, AbortController, setTimeout, clearTimeout, btoa, atob, TextEncoder, TextDecoder, URL, Promise,
            serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
            localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        };
        ctx.window = ctx;
        vm.createContext(ctx);
        vm.runInContext(src + '\n;globalThis.__grade = gradeSubmission;', ctx, { filename: `grader.js (${label})` });
        return ctx.__grade;
    };
    const srcBase = execFileSync('git', ['show', `${BASE}:js/grader.js`], { cwd: ROOT, encoding: 'utf8' });
    const srcHead = fs.readFileSync(path.join(ROOT, 'js', 'grader.js'), 'utf8');
    console.log(`grader.js: ${BASE} ${srcBase.length} ไบต์ / branch ${srcHead.length} ไบต์ · ${srcBase === srcHead ? 'เหมือนกันทุกไบต์' : 'มีความต่าง!'}`);
    const gBase = makeGrader(srcBase, BASE), gHead = makeGrader(srcHead, 'branch');

    // ── 3) ตรวจคู่กัน ──
    let same = 0, diff = 0, matchRecorded = 0;
    for (const [i, s] of picked.entries()) {
        const run = (g) => g(`reg-student-${i}`, s.assignmentId, 'reg-c', s.code, 'c').then(r => ({ score: r.score, passed: r.passedTests, total: r.totalTests, status: r.status }));
        let a = await run(gBase), b = await run(gHead);
        if (JSON.stringify(a) !== JSON.stringify(b)) { a = await run(gBase); b = await run(gHead); }   // ตรวจซ้ำ 1 ครั้ง กัน runner สะดุด
        const eq = JSON.stringify(a) === JSON.stringify(b);
        eq ? same++ : diff++;
        if (a.score === s.score) matchRecorded++;
        console.log(`  ${eq ? '✓' : '✗'} โจทย์ ${String(i + 1).padStart(2)} · ${BASE} ${a.score} (${a.passed}/${a.total} ${a.status}) · branch ${b.score} (${b.passed}/${b.total} ${b.status}) · คะแนนที่บันทึกไว้ ${s.score}`);
    }
    console.log(`\nผลตรวจเท่ากันทั้งสองรุ่น ${same}/${picked.length} ข้อ · ต่าง ${diff} ข้อ · ตรงกับคะแนนที่บันทึกไว้จริง ${matchRecorded}/${picked.length} ข้อ`);
    process.exit(diff || srcBase !== srcHead ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

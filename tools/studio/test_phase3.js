#!/usr/bin/env node
/**
 * tools/studio/test_phase3.js — ทดสอบ Phase 3 (Skill Gate, Explain-Back, กฎ Firestore) บน emulator
 * ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 BABEL_STANDALONE=<path> node tools/studio/test_phase3.js
 */
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const PROJECT = 'ai-powered-coding-596ed';
if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('❌ ใช้กับ emulator เท่านั้น'); process.exit(1); }
const Babel = require(process.env.BABEL_STANDALONE || '@babel/standalone');

let pass = 0, fail = 0;
const ok = (c, l, x) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗', l, c || x === undefined ? '' : JSON.stringify(x).slice(0, 300)); };

global.window = global;
global.React = { useState: () => [null, () => {}], useEffect: () => {}, createElement: () => null, Fragment: 'f' };
global.db = null; global.serverTimestamp = () => null; global.auth = { currentUser: null };
const load = (rel, jsx) => {
    let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (jsx) src = Babel.transform(src, { presets: ['react'], filename: rel, sourceType: 'script' }).code;
    vm.runInThisContext(src, { filename: rel });
};
load('js/studio/studioConfig.js', true);
load('js/studio/skillGate.js');
load('js/studio/ExplainBack.js', true);

const studioCourse = (tpl, feat) => ({ id: 'c1', title: 'x', studio: { ...buildStudioConfig(tpl), ...(feat ? { features: { ...buildStudioConfig(tpl).features, ...feat } } : {}) } });

(async () => {
    console.log('\n[1] คำนวณด่าน (sgComputeProgress)');
    const gates = sgDefaultGates(studioCourse('w23207'));
    ok(gates.length === 4 && gates.every(g => g.minRatio === 0.6 && g.passScore === 100), 'ด่านเริ่มต้น ว23207 = 4 ด่าน (60%, คะแนน 100)');
    ok(sgDefaultGates(studioCourse('w23103_ch2')).length === 2 && sgDefaultGates(studioCourse('generic_python')).length === 0, 'ว23103 = 2 ด่าน, generic = ไม่มีด่าน');
    const A = (id, tag, extra = {}) => ({ id, skillTag: tag, isPublished: true, assignmentType: 'practice', ...extra });
    const asg = [
        A('i1', 'io'), A('i2', 'io'), A('i3', 'io'),
        A('c1', 'condition'), A('c2', 'condition'),
        A('l1', 'loop'),
        A('f1', 'function'), A('s1', 'list'),
        A('x1', 'io', { assignmentType: 'exam' }), A('h1', 'loop', { isPublished: false }),
    ];
    let p = sgComputeProgress(gates, asg, {}, null);
    ok(p.stage === 'practice' && !p.createUnlocked && p.nextGateId === 'g1', 'ยังไม่ส่งอะไร → ขั้นฝึก ด่านถัดไป g1');
    ok(p.gates[0].total === 3 && p.gates[0].need === 2, 'ไม่นับข้อสอบ: ด่าน 1 มี 3 ข้อ ต้องผ่าน ceil(3×0.6)=2');
    ok(p.gates[2].total === 1, 'ไม่นับโจทย์ที่ยังไม่เผยแพร่');
    const best = sgBestScores([
        { assignmentId: 'i1', score: 100 }, { assignmentId: 'i2', score: 40 }, { assignmentId: 'i2', score: 100 },
        { assignmentId: 'c1', score: 100 }, { assignmentId: 'c2', score: 100 }, { assignmentId: 'l1', score: 100 },
        { assignmentId: 'f1', score: 100 }, { assignmentId: 's1', score: 100 }, { assignmentId: 'x1', score: 100 },
    ]);
    ok(best.i2 === 100, 'ใช้คะแนนดีที่สุดของแต่ละข้อ');
    p = sgComputeProgress(gates, asg, best, null);
    ok(p.gates.every(g => g.done) && p.createUnlocked && p.stage === 'create', 'ผ่านครบทุกด่าน → ปลดล็อกขั้นสร้าง');
    ok(sgComputeProgress(gates, asg, best, 'share').stage === 'share', 'ขั้นแบ่งปันที่ได้แล้วไม่ถอยกลับ');
    p = sgComputeProgress(gates, asg, { ...best, f1: 90 }, 'create');
    ok(!p.createUnlocked && p.stage === 'practice' && p.nextGateId === 'g4', 'คะแนนไม่ถึง passScore → ยังไม่ผ่านด่าน 4');
    p = sgComputeProgress(gates, asg.filter(a => a.skillTag !== 'loop'), best, null);
    ok(!p.createUnlocked && p.gates[2].total === 0 && !p.gates[2].done, 'ด่านที่ยังไม่มีโจทย์ = ยังไม่ผ่าน (ไม่ปลดล็อกเร็วเกินไป)');
    const optional = gates.map(g => g.gateId === 'g3' ? { ...g, required: false } : g);
    ok(sgComputeProgress(optional, asg.filter(a => a.skillTag !== 'loop'), best, null).createUnlocked, 'ด่านที่ครูตั้งเป็นไม่บังคับ ไม่ขวางการปลดล็อก');

    console.log('\n[2] Explain-Back');
    const sc = studioCourse('w23207');
    const mid = { id: 'a', difficulty: 'ปานกลาง', assignmentType: 'practice' };
    ok(studioWantsExplainBack(sc, mid, { score: 100 }) === true, 'ผ่าน 100 โจทย์ปานกลาง → ถาม Explain-Back');
    ok(studioWantsExplainBack(sc, mid, { score: 80 }) === false, 'ยังไม่ผ่านครบ → ไม่ถาม');
    ok(studioWantsExplainBack(sc, { ...mid, difficulty: 'ง่าย' }, { score: 100 }) === false, 'โจทย์ง่าย → ไม่ถาม');
    ok(studioWantsExplainBack(sc, { ...mid, difficulty: 'ง่าย', explainBack: true }, { score: 100 }) === true, 'ครูตั้ง explainBack:true → ถามแม้โจทย์ง่าย');
    ok(studioWantsExplainBack(sc, { ...mid, assignmentType: 'exam' }, { score: 100 }) === false, 'ข้อสอบ → ไม่ถาม');
    ok(studioWantsExplainBack(studioCourse('w23207', { explainBack: false }), mid, { score: 100 }) === false, 'ปิดฟีเจอร์ explainBack → ไม่ถาม');
    ok(studioWantsExplainBack({ id: 'z' }, mid, { score: 100 }) === false, 'รายวิชาไม่เปิด Studio → ไม่ถาม');
    const code = 'def with_vat(price):\n    return price * 1.07\n\np = float(input())\nprint(f"{with_vat(p):.2f}")\n';
    ok(ebHeuristicLevel(code, 'ไม่รู้') === 0, 'เกณฑ์สำรอง: สั้นเกิน → 0');
    ok(ebHeuristicLevel(code, 'โปรแกรมนี้ทำงานได้ถูกต้องครับผม ส่งแล้วผ่าน') === 0, 'เกณฑ์สำรอง: ไม่อ้างโค้ด → 0');
    ok(ebHeuristicLevel(code, 'รับราคา p แล้วส่งให้ฟังก์ชัน with_vat คำนวณ') === 1, 'เกณฑ์สำรอง: อ้างบางส่วน → 1');
    ok(ebHeuristicLevel(code, 'รับราคาเป็น float เก็บใน p แล้วเรียกฟังก์ชัน with_vat ที่คูณ price ด้วย 1.07 และคืนค่า จากนั้น print ทศนิยม 2 ตำแหน่ง') === 2, 'เกณฑ์สำรอง: อธิบายครบลำดับ → 2 (สูงสุดของเกณฑ์สำรอง)');
    ok(ebCheckPrediction('63.67 ', '63.67') && ebCheckPrediction('a\r\nb\n', 'a\nb') && !ebCheckPrediction('63.6', '63.67'), 'ตรวจคำทำนาย: ไม่สนช่องว่างท้ายบรรทัด แต่ค่าต้องตรง');
    ok(/def|return/.test(ebFollowUpBank(code)) && /while/.test(ebFollowUpBank('while x:\n  x-=1')), 'คำถามถามต่อสำรองเลือกตามโครงสร้างโค้ด');

    console.log('\n[3] กฎ Firestore (token ผู้ใช้จริงใน emulator)');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    execFileSync('node', [path.join(__dirname, 'seed_emulator.js')], { stdio: 'ignore', env: process.env });
    const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
    const tok = async (e) => (await (await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: 'apcc1234', returnSecureToken: true }) })).json()).idToken;
    const req = async (t, method, p, body) => (await fetch(FS + p, { method, headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json' }, body: body && JSON.stringify(body) })).status;
    const F = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: v }])) });
    const s1 = await tok('s01@test.local'), s2 = await tok('s02@test.local'), t = await tok('teacher@test.local');
    const rows = [
        ['นักเรียนอ่าน progress ของตนเองที่ยังไม่มี (200/404 ไม่ใช่ 403)', await req(s1, 'GET', '/studio_progress/emu-py-studio_emu-s01'), [404]],
        ['นักเรียนเขียน progress ของตนเอง', await req(s1, 'PATCH', '/studio_progress/emu-py-studio_emu-s01', F({ uid: 'emu-s01', courseId: 'emu-py-studio', stage: 'practice' })), [200]],
        ['นักเรียนเขียน progress ของคนอื่น', await req(s1, 'PATCH', '/studio_progress/emu-py-studio_emu-s02', F({ uid: 'emu-s02', courseId: 'emu-py-studio', stage: 'create' })), [403]],
        ['นักเรียนเขียน progress id ไม่ตรงกับ uid/courseId', await req(s1, 'PATCH', '/studio_progress/other_emu-s01', F({ uid: 'emu-s01', courseId: 'emu-py-studio', stage: 'create' })), [403]],
        ['นักเรียนอ่าน progress ของคนอื่น', await req(s2, 'GET', '/studio_progress/emu-py-studio_emu-s01'), [403]],
        ['ครูอ่าน progress ของนักเรียน', await req(t, 'GET', '/studio_progress/emu-py-studio_emu-s01'), [200]],
        ['นักเรียนอ่าน skill gates', await req(s1, 'GET', '/studio_skillGates/emu-py-studio_g1'), [404]],
        ['นักเรียนเขียน skill gates', await req(s1, 'PATCH', '/studio_skillGates/emu-py-studio_g1', F({ courseId: 'emu-py-studio', name: 'x' })), [403]],
        ['ครูเขียน skill gates', await req(t, 'PATCH', '/studio_skillGates/emu-py-studio_g1', F({ courseId: 'emu-py-studio', name: 'x' })), [200]],
        ['นักเรียนสร้าง Explain-Back ของตนเอง', await req(s1, 'PATCH', '/studio_explainBack/eb1', F({ uid: 'emu-s01', courseId: 'emu-py-studio', aiLevel: 2 })), [200]],
        ['นักเรียนสร้าง Explain-Back ในชื่อคนอื่น', await req(s1, 'PATCH', '/studio_explainBack/eb2', F({ uid: 'emu-s02', courseId: 'emu-py-studio', aiLevel: 3 })), [403]],
        ['นักเรียนแก้คำตอบคำถามต่อของตนเอง', await req(s1, 'PATCH', '/studio_explainBack/eb1?updateMask.fieldPaths=followUpAnswer', F({ followUpAnswer: 'ตอบ' })), [200]],
        ['นักเรียนแก้ระดับ aiLevel ของตนเอง', await req(s1, 'PATCH', '/studio_explainBack/eb1?updateMask.fieldPaths=aiLevel', F({ aiLevel: 3 })), [403]],
        ['นักเรียนอ่าน Explain-Back ของคนอื่น', await req(s2, 'GET', '/studio_explainBack/eb1'), [403]],
        ['ครูอ่าน Explain-Back', await req(t, 'GET', '/studio_explainBack/eb1'), [200]],
    ];
    rows.forEach(([l, got, want]) => ok(want.includes(got), `${l} → ${got}`, { want }));

    console.log(`\nผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e); process.exit(1); });

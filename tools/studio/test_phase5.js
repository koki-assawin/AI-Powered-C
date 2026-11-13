#!/usr/bin/env node
/**
 * tools/studio/test_phase5.js — ทดสอบ Phase 5 (Studio Analytics, Showcase, กฎ Firestore) บน emulator
 * ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 BABEL_STANDALONE=<path> node tools/studio/test_phase5.js
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
load('js/studio/projectStudio.js');
load('js/studio/studioAnalytics.js');

(async () => {
    console.log('\n[1] รวมข้อมูล (saAggregate)');
    const gates = sgDefaultGates({ studio: { template: 'w23207' } }).slice(0, 2);   // ด่าน 1 io, ด่าน 2 condition
    const A = (id, tag, title) => ({ id, title: title || id, skillTag: tag, isPublished: true, assignmentType: 'practice' });
    const assignments = [A('i1', 'io', 'W207-01-1 ก'), A('i2', 'io'), A('c1', 'condition'), A('c2', 'condition'), { ...A('x', 'io'), assignmentType: 'exam' }];
    const S = (studentId, assignmentId, score, t, h) => ({ studentId, assignmentId, score, timeSpentSeconds: t, hintLevelUsed: h });
    const submissions = [
        S('u1', 'i1', 100, 60, 0), S('u1', 'i2', 100, 120, 1), S('u1', 'c1', 100, 200, 2), S('u1', 'c2', 50, 100, 4), S('u1', 'c2', 100, 80, 0),
        S('u2', 'i1', 100, 30, 0), S('u2', 'i2', 40, 300, 3),
    ];
    const students = [
        { uid: 'u2', name: 'บี', studentCode: '20002', room: 'ม.3/1', number: '2' },
        { uid: 'u1', name: 'เอ', studentCode: '20001', room: 'ม.3/1', number: '1' },
        { uid: 'u3', name: 'ซี', studentCode: '20003', room: 'ม.3/2', number: '1' },
    ];
    const projects = [{ id: 'P1', members: ['u1', 'u2'], kit: 'A', versionCount: 2, data: { empathize: { targetUser: 'x', interviews: ['a', 'b'], painPoints: 'y' } } }];
    const agg = saAggregate({
        gates, assignments, submissions, students, progressStage: { u1: 'share' },
        explainBack: [{ uid: 'u1', mode: 'explain', aiLevel: 3 }, { uid: 'u1', mode: 'predict', predictCorrect: true }, { uid: 'u2', mode: 'explain', aiLevel: 1, aiStatus: 'fallback' }],
        events: [{ type: 'parsons_attempt', uid: 'u2', assignmentId: 'i2', correct: false }, { type: 'parsons_attempt', uid: 'u2', assignmentId: 'i2', correct: true }, { type: 'gate_pass', uid: 'u1', gateId: 'g1' }, { type: 'gate_pass', uid: 'u1', gateId: 'g1' }],
        ladder: [{ uid: 'u2', relatedId: 'W207-01-1 ก' }, { uid: 'u2', relatedId: 'โจทย์วิชาอื่น' }],
        projects, reviews: [{ reviewerType: 'teacher', projectId: 'P1', published: true, totalByMember: { u1: 17, u2: 13 } }, { reviewerType: 'peer', projectId: 'P1' }],
    });
    const byUid = Object.fromEntries(agg.rows.map(r => [r.uid, r]));
    ok(agg.rows.map(r => r.anonId).join(',') === 'S01,S02,S03' && byUid.u1.anonId === 'S01' && byUid.u2.anonId === 'S02', 'รหัส S01… เรียงตามห้องและเลขที่');
    ok(byUid.u1.gatesPassed === 2 && byUid.u1.stage === 'share' && byUid.u2.gatesPassed === 0 && byUid.u3.stage === 'practice', 'คำนวณด่านจาก submissions (u1 ผ่าน 2 ด่าน ขั้นแบ่งปันคงอยู่)');
    ok(agg.gateStats[0].passed === 1 && agg.gateStats[0].passRate === 33.3 && agg.gateStats[1].passRate === 33.3, 'อัตราผ่านด่าน = 1/3 = 33.3% (ไม่นับ event gate_pass ที่ซ้ำ)');
    ok(agg.gateStats[0].avgTimeSec === 128 && agg.gateStats[0].problems === 2, 'เวลาเฉลี่ยด่าน 1 = (60+120+30+300)/4 = 128 วินาที (ไม่นับข้อสอบ)', agg.gateStats[0]);
    ok(byUid.u1.solved === 4 && byUid.u1.submissions === 5 && byUid.u1.avgTimeSec === 112, 'u1: ส่ง 5 ครั้ง ผ่าน 4 ข้อ เวลาเฉลี่ย 112 วินาที');
    ok(byUid.u2.ladderHints === 1, 'นับคำใบ้จากครูเฉพาะโจทย์ของรายวิชานี้');
    ok(byUid.u2.parsonsAttempts === 2 && byUid.u2.parsonsSolved === 1, 'Parsons: 2 ครั้ง ถูก 1 ข้อ');
    ok(byUid.u1.ebCount === 2 && byUid.u1.ebAvgLevel === 3 && byUid.u1.ebPredictCorrect === 1, 'Explain-Back รายคน');
    ok(byUid.u1.projectStages === 1 && byUid.u1.rubricTotal === 17 && byUid.u3.projectId === null, 'โปรเจกต์และคะแนนรูบริกรายคน');
    ok(agg.summary.createUnlocked === 1 && agg.summary.shareStage === 1 && agg.summary.ebFallback === 1 && agg.summary.peerReviews === 1 && agg.summary.webappVersions === 2, 'สรุปภาพรวมของรายวิชา', agg.summary);
    const csv = saBuildCsv(agg);
    ok(csv.startsWith('﻿') && csv.trim().split('\r\n').length === 4, 'CSV: BOM + หัวตาราง + 3 แถว');
    ok(!/เอ|บี|ซี|2000\d|u1|u2|u3/.test(csv.replace(/^﻿/, '').split('\r\n').slice(1).join('\n')), 'CSV ปกปิดตัวตน: ไม่มีชื่อ รหัสนักเรียน หรือ uid');
    ok(/^S01,1,1,แบ่งปัน,5,4,112,/.test(csv.split('\r\n')[1]), 'แถว S01 ถูกต้อง', csv.split('\r\n')[1]);

    console.log('\n[2] กฎ Firestore');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    execFileSync('node', [path.join(__dirname, 'seed_emulator.js')], { stdio: 'ignore', env: process.env });
    const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
    const tok = async (e) => (await (await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: 'apcc1234', returnSecureToken: true }) })).json()).idToken;
    const req = async (t, method, p, body) => (await fetch(FS + p, { method, headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json' }, body: body && JSON.stringify(body) })).status;
    const F = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'boolean' ? { booleanValue: v } : { stringValue: v }])) });
    const [s1, t] = await Promise.all([tok('s01@test.local'), tok('teacher@test.local')]);
    const rows = [
        ['นักเรียนเพิ่มผลงานขึ้นแกลเลอรีเอง', await req(s1, 'PATCH', '/studio_showcase/x', F({ courseId: 'c', title: 'x', visible: true })), 403],
        ['ครูอนุมัติขึ้นแกลเลอรี', await req(t, 'PATCH', '/studio_showcase/x', F({ courseId: 'c', title: 'x', visible: true })), 200],
        ['นักเรียนอ่านแกลเลอรี', await req(s1, 'GET', '/studio_showcase/x'), 200],
        ['นักเรียนซ่อน/ลบผลงานในแกลเลอรี', await req(s1, 'DELETE', '/studio_showcase/x'), 403],
        ['ครูเลื่อนนักเรียนไปขั้นแบ่งปัน (studio_progress)', await req(t, 'PATCH', '/studio_progress/c_emu-s01?updateMask.fieldPaths=stage', F({ stage: 'share' })), 200],
    ];
    rows.forEach(([l, got, want]) => ok(got === want, `${l} → ${got}`, { want }));

    console.log(`\nผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e); process.exit(1); });

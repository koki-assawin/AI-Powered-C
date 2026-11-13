#!/usr/bin/env node
/**
 * tools/studio/test_phase4.js — ทดสอบ Phase 4 (Project Studio, Web App Runner, Rubric, กฎ Firestore) บน emulator
 * ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 BABEL_STANDALONE=<path> node tools/studio/test_phase4.js
 */
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const PROJECT = 'ai-powered-coding-596ed';
if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('❌ ใช้กับ emulator เท่านั้น'); process.exit(1); }
const Babel = require(process.env.BABEL_STANDALONE || '@babel/standalone');
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));

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
load('js/studio/projectStudio.js');
load('js/studio/WebAppRunner.js', true);

(async () => {
    console.log('\n[1] ขั้นของโปรเจกต์และร่างคะแนน');
    const p = { id: 'P', kit: 'A', versionCount: 0, members: ['u1', 'u2'], data: {} };
    ok(PS_STAGES.length === 5 && psProgress(p).every(x => !x.done), 'โปรเจกต์ใหม่: 5 ขั้น ยังไม่ครบสักขั้น');
    p.data.empathize = { targetUser: 'แม่ค้าสหกรณ์', interviews: ['คุยกับป้า A', ''], painPoints: 'ทอนเงินช้า' };
    ok(!psStageDone(p, 'empathize'), 'สัมภาษณ์ 1 คน (ต้อง ≥ 2) → ยังไม่ครบ');
    p.data.empathize.interviews = ['คุยกับป้า A', 'สังเกตลุง B'];
    ok(psStageDone(p, 'empathize'), 'สัมภาษณ์ 2 คน → ครบ');
    p.data.prototype = { prototypeNotes: 'คิดเงินได้แล้ว' };
    ok(!psStageDone(p, 'prototype'), 'Kit A ยังไม่มีรุ่นที่บันทึก → ขั้นต้นแบบยังไม่ครบ');
    ok(psStageDone({ ...p, versionCount: 1 }, 'prototype'), 'Kit A มี 1 รุ่น → ครบ');
    ok(!psStageDone({ ...p, kit: 'B' }, 'prototype') && psStageDone({ ...p, kit: 'B', data: { ...p.data, prototype: { prototypeNotes: 'x', colabUrl: 'https://colab.research.google.com/x' } } }, 'prototype'), 'Kit B ต้องมีลิงก์ Colab');
    const d = psRuleDraft({ ...p, versionCount: 3, data: { ...p.data, test: { round1: 'a' } } }, {
        u1: [{ mode: 'explain', aiLevel: 3 }, { mode: 'predict', predictCorrect: true }],
        u2: [{ mode: 'explain', aiLevel: 1 }],
    });
    ok(d.team.c1.level === 3 && d.team.c4.level === 2 && d.source === 'rule', 'ร่างจากหลักฐาน: c1=3 (สัมภาษณ์ครบ), c4=2 (ทดสอบ 1 รอบ)');
    ok(d.individual.u1.level === 4 && d.individual.u2.level === 2, 'c5 รายบุคคลจาก Explain-Back: u1 เฉลี่ย 3 → 4, u2 เฉลี่ย 1 → 2', d.individual);
    ok(psRuleDraft({ ...p, members: ['u9'] }, {}).individual.u9.level === null, 'ไม่มี Explain-Back → ไม่เดาคะแนน c5 (ให้ครูประเมิน)');
    const csv = psBuildCsv(PS_DEFAULT_RUBRIC, [{ id: 'P', teamName: 'ทีม, A', title: 'แอป "คิดเงิน"', members: ['u1', 'u2'] }],
        { P: { team: { c1: { level: 4 }, c2: { level: 3 }, c3: { level: 3 }, c4: { level: 2 } }, individual: { u1: { level: 4 }, u2: { level: 2 } }, totalByMember: { u1: 16, u2: 14 }, published: true } },
        { u1: { displayName: 'มิว', studentCode: '10001', grade: 'ม.3', room: '1', number: '2' }, u2: { displayName: 'ต้น', studentCode: '10002', grade: 'ม.3', room: '1', number: '1' } });
    const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
    ok(csv.startsWith('﻿') && lines.length === 3, 'CSV มี BOM (Excel ภาษาไทย) + หัวตาราง + 2 แถว');
    ok(/^ม\.3\/1,1,10002,ต้น,"ทีม, A","แอป ""คิดเงิน""",4,3,3,2,2,14,เผยแพร่แล้ว$/.test(lines[1]), 'เรียงตามเลขที่ และ escape เครื่องหมาย , " ถูกต้อง', lines[1]);
    ok(PS_DEFAULT_RUBRIC.criteria.length === 5 && PS_DEFAULT_RUBRIC.criteria.every(c => c.levels.length === 4), 'รูบริก 5 เกณฑ์ × 4 ระดับ = 20');
    const doc = wrStliteDoc('st.write("</script><b>x</b>")');
    ok(!/<\/script><b>/.test(doc) && /@stlite\/browser@1\.12\.0/.test(doc), 'หน้า stlite: ระบุเวอร์ชันตายตัว และกัน </script> ในโค้ดนักเรียนปิดสคริปต์ก่อนเวลา');

    console.log('\n[2] กฎ Firestore (token ผู้ใช้จริงใน emulator)');
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    execFileSync('node', [path.join(__dirname, 'seed_emulator.js')], { stdio: 'ignore', env: process.env });
    admin.initializeApp({ projectId: PROJECT });
    const adb = admin.firestore();
    const C = 'emu-py-studio';
    await adb.collection('projectTeams').doc('T1').set({ name: 'ทีม 1', code: 'T1', createdBy: 'emu-s01', members: ['emu-s01', 'emu-s02'], memberNames: { 'emu-s01': 'S01', 'emu-s02': 'S02' } });
    await adb.collection('projectTeams').doc('T2').set({ name: 'ทีม 2', code: 'T2', createdBy: 'emu-s03', members: ['emu-s03'], memberNames: { 'emu-s03': 'S03' } });
    await adb.collection('studio_projects').doc(`${C}_T1`).set({ courseId: C, teamId: 'T1', members: ['emu-s01', 'emu-s02'], title: 'P1', createdBy: 'emu-s01' });
    await adb.collection('studio_projects').doc(`${C}_T2`).set({ courseId: C, teamId: 'T2', members: ['emu-s03'], title: 'P2', createdBy: 'emu-s03' });
    await adb.collection('studio_reviews').doc(`${C}_T1_teacher`).set({ projectId: `${C}_T1`, courseId: C, reviewerType: 'teacher', reviewerUid: 'emu-teacher', published: false });
    await adb.collection('studio_reviews').doc(`${C}_T2_teacher`).set({ projectId: `${C}_T2`, courseId: C, reviewerType: 'teacher', reviewerUid: 'emu-teacher', published: true });

    const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
    const tok = async (e) => (await (await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: 'apcc1234', returnSecureToken: true }) })).json()).idToken;
    const V = (v) => Array.isArray(v) ? { arrayValue: { values: v.map(V) } } : typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v }
        : v && typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, V(x)])) } } : { stringValue: String(v) };
    const F = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, V(v)])) });
    const mask = (o) => Object.keys(o).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const req = async (t, method, p, body) => (await fetch(FS + p, { method, headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json' }, body: body && JSON.stringify(body) })).status;
    const patch = (t, p, o) => req(t, 'PATCH', `${p}?${mask(o)}`, F(o));
    const create = (t, col, o) => req(t, 'POST', `/${col}`, F(o));
    const [s1, s2, s3, s4, s5, t] = await Promise.all(['s01', 's02', 's03', 's04', 's05', 'teacher'].map(x => tok(`${x}@test.local`)));
    const P1 = `/studio_projects/${C}_T1`;
    const rows = [
        // projectTeams (TeamSync)
        ['สร้างทีมของตนเอง', await req(s4, 'PATCH', '/projectTeams/T4', F({ name: 'ทีม 4', code: 'T4', createdBy: 'emu-s04', members: ['emu-s04'], memberNames: { 'emu-s04': 'S04' } })), 200],
        ['สร้างทีมในชื่อคนอื่น', await req(s4, 'PATCH', '/projectTeams/T5', F({ name: 'x', createdBy: 'emu-s01', members: ['emu-s01'] })), 403],
        ['เข้าร่วมทีมด้วยรหัส (เพิ่มตนเองใน members)', await patch(s5, '/projectTeams/T2', { members: ['emu-s03', 'emu-s05'], memberNames: { 'emu-s03': 'S03', 'emu-s05': 'S05' } }), 200],
        ['คนนอกทีมเปลี่ยนชื่อทีม', await patch(s4, '/projectTeams/T1', { name: 'แฮก' }), 403],
        ['คนนอกทีมแก้ members โดยไม่ใส่ตนเอง', await patch(s4, '/projectTeams/T1', { members: ['emu-s01'] }), 403],
        ['สมาชิกเพิ่มงาน (tasks)', await create(s1, 'projectTeams/T1/tasks', { title: 'ทำหน้าจอ' }), 200],
        ['คนนอกทีมเพิ่มงาน', await create(s4, 'projectTeams/T1/tasks', { title: 'x' }), 403],
        ['สมาชิกส่ง feedback ในชื่อตนเอง', await create(s1, 'projectTeams/T1/feedback', { fromUid: 'emu-s01', toUid: 'emu-s02' }), 200],
        ['ส่ง feedback ในชื่อคนอื่น', await create(s1, 'projectTeams/T1/feedback', { fromUid: 'emu-s02', toUid: 'emu-s01' }), 403],
        // studio_projects
        ['คนนอกทีมสร้างโปรเจกต์ให้ทีมอื่น', await req(s1, 'PATCH', `/studio_projects/${C}_T4`, F({ courseId: C, teamId: 'T4', createdBy: 'emu-s01' })), 403],
        ['สมาชิกสร้างโปรเจกต์ id ถูกต้อง', await req(s4, 'PATCH', `/studio_projects/${C}_T4`, F({ courseId: C, teamId: 'T4', createdBy: 'emu-s04', members: ['emu-s04'] })), 200],
        ['สมาชิกสร้างโปรเจกต์ id ไม่ตรง courseId_teamId', await req(s4, 'PATCH', '/studio_projects/other_T4', F({ courseId: C, teamId: 'T4', createdBy: 'emu-s04' })), 403],
        ['สมาชิกแก้ข้อมูลโปรเจกต์', await patch(s2, P1, { title: 'แอปคิดเงิน' }), 200],
        ['คนนอกทีมแก้โปรเจกต์', await patch(s3, P1, { title: 'แฮก' }), 403],
        ['สมาชิกย้ายโปรเจกต์ไปทีมอื่น', await patch(s2, P1, { teamId: 'T2' }), 403],
        ['สมาชิกบันทึกรุ่นเว็บแอป', await create(s1, `studio_projects/${C}_T1/versions`, { code: 'import streamlit', createdBy: 'emu-s01' }), 200],
        ['คนนอกทีมบันทึกรุ่นเว็บแอป', await create(s3, `studio_projects/${C}_T1/versions`, { code: 'x', createdBy: 'emu-s03' }), 403],
        ['คนนอกทีมอ่านโปรเจกต์ (ประเมินโดยเพื่อน)', await req(s3, 'GET', P1), 200],
        // studio_reviews
        ['ประเมินทีมตนเอง (peer)', await req(s1, 'PATCH', `/studio_reviews/${C}_T1_peer_emu-s01`, F({ projectId: `${C}_T1`, reviewerType: 'peer', reviewerUid: 'emu-s01' })), 403],
        ['ประเมินทีมอื่น (peer) id ถูกต้อง', await req(s3, 'PATCH', `/studio_reviews/${C}_T1_peer_emu-s03`, F({ projectId: `${C}_T1`, courseId: C, reviewerType: 'peer', reviewerUid: 'emu-s03', team: { c1: { level: 3 } } })), 200],
        ['ประเมินทีมอื่นโดยปลอม id', await req(s3, 'PATCH', `/studio_reviews/fake`, F({ projectId: `${C}_T1`, reviewerType: 'peer', reviewerUid: 'emu-s03' })), 403],
        ['นักเรียนเขียนผลประเมินของครู', await req(s1, 'PATCH', `/studio_reviews/${C}_T1_teacher`, F({ projectId: `${C}_T1`, reviewerType: 'teacher', reviewerUid: 'emu-s01', published: true })), 403],
        ['ครูเขียนผลประเมิน', await patch(t, `/studio_reviews/${C}_T1_teacher`, { published: false, team: { c1: { level: 4 } } }), 200],
        ['สมาชิกอ่านผลของครูที่ยังไม่เผยแพร่', await req(s1, 'GET', `/studio_reviews/${C}_T1_teacher`), 403],
        ['สมาชิกอ่านผลของครูที่เผยแพร่แล้ว', await req(s3, 'GET', `/studio_reviews/${C}_T2_teacher`), 200],
        ['สมาชิกอ่านคำแนะนำจากเพื่อนในทีมตน', await req(s2, 'GET', `/studio_reviews/${C}_T1_peer_emu-s03`), 200],
        ['คนนอกอ่านคำแนะนำที่เพื่อนให้ทีมอื่น', await req(s4, 'GET', `/studio_reviews/${C}_T1_peer_emu-s03`), 403],
        ['นักเรียนเขียนรูบริก', await req(s1, 'PATCH', '/studio_rubrics/w23207_project', F({ title: 'x' })), 403],
        ['ครูเขียนรูบริก', await req(t, 'PATCH', '/studio_rubrics/w23207_project', F({ title: 'รูบริก' })), 200],
    ];
    rows.forEach(([l, got, want]) => ok(got === want, `${l} → ${got}`, { want }));

    // query ของนักเรียน: คำแนะนำจากเพื่อนของทีมตน (projectId + reviewerType) ต้องผ่านกฎ
    const q = await fetch(`${FS}:runQuery`, { method: 'POST', headers: { authorization: 'Bearer ' + s2, 'content-type': 'application/json' }, body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: 'studio_reviews' }],
        where: { compositeFilter: { op: 'AND', filters: [
            { fieldFilter: { field: { fieldPath: 'projectId' }, op: 'EQUAL', value: { stringValue: `${C}_T1` } } },
            { fieldFilter: { field: { fieldPath: 'reviewerType' }, op: 'EQUAL', value: { stringValue: 'peer' } } },
        ] } } } }) });
    const qr = await q.json();
    ok(q.status === 200 && qr.filter(x => x.document).length === 1, `สมาชิก query คำแนะนำจากเพื่อนของทีมตนได้ (${q.status})`, qr);

    console.log(`\nผลรวม: ผ่าน ${pass} / ไม่ผ่าน ${fail}`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e); process.exit(1); });

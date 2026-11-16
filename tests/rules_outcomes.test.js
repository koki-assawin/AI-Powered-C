#!/usr/bin/env node
/**
 * tests/rules_outcomes.test.js — กฎของบล็อกใหม่ outcome_presets / outcome_notes / outcome_scores
 *
 * ต้องได้: ครูสร้าง/อ่าน/แก้/ลบของตนเองได้ · ครูอีกคนอ่าน/แก้ไม่ได้ · นักเรียนและผู้ไม่ล็อกอินทำอะไรไม่ได้
 *          · แอดมินอ่าน/ลบได้ · เปลี่ยน ownerId ไม่ได้ · สร้างในชื่อคนอื่นไม่ได้
 * (กฎเดิมตรวจด้วย tests/rules_regression.test.js --base main)
 *
 * ใช้: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node tests/rules_outcomes.test.js
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const PROJECT = 'ai-powered-coding-596ed';
const EMU = process.env.FIRESTORE_EMULATOR_HOST;
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!EMU || !AUTH) { console.error('❌ ใช้กับ emulator เท่านั้น'); process.exit(1); }
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));

const FS = `http://${EMU}/v1/projects/${PROJECT}/databases/(default)/documents`;
const V = (v) => Array.isArray(v) ? { arrayValue: { values: v.map(V) } } : typeof v === 'number' ? { integerValue: String(v) }
    : v && typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, V(x)])) } } : { stringValue: String(v) };
const F = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, V(v)])) });
const call = async (t, method, p, body) => {
    const headers = { 'content-type': 'application/json' };
    if (t) headers.authorization = 'Bearer ' + t;
    return (await fetch(FS + p, { method, headers, body: body && JSON.stringify(body) })).status;
};
const put = (t, p, o) => call(t, 'PATCH', p, F(o));               // set (สร้างหรือแทนที่)
const get = (t, p) => call(t, 'GET', p);
const del = (t, p) => call(t, 'DELETE', p);
const query = async (t, col, filters) => {
    const headers = { 'content-type': 'application/json' };
    if (t) headers.authorization = 'Bearer ' + t;
    const where = { compositeFilter: { op: 'AND', filters: Object.entries(filters).map(([k, v]) => ({ fieldFilter: { field: { fieldPath: k }, op: 'EQUAL', value: V(v) } })) } };
    return (await fetch(`${FS}:runQuery`, { method: 'POST', headers, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where } }) })).status;
};
const tok = async (e) => (await (await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: 'apcc1234', returnSecureToken: true }) })).json()).idToken;

(async () => {
    admin.initializeApp({ projectId: PROJECT });
    await fetch(`http://${EMU}/emulator/v1/projects/${PROJECT}:securityRules`, {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') }] } }),
    });
    await fetch(`${FS.replace('/v1/', '/emulator/v1/')}`, { method: 'DELETE' });
    execFileSync('node', [path.join(ROOT, 'tools/studio/seed_emulator.js')], { stdio: 'ignore', env: process.env });
    try { await admin.auth().createUser({ uid: 'emu-teacher2', email: 'teacher2@test.local', password: 'apcc1234' }); } catch (_) { /* มีแล้ว */ }
    await admin.firestore().collection('users').doc('emu-teacher2').set({ role: 'teacher', email: 'teacher2@test.local', displayName: 'ครูจำลอง 2' });

    const t = await tok('teacher@test.local'), t2 = await tok('teacher2@test.local'), s = await tok('s01@test.local'), a = await tok('admin@test.local');
    const C = 'emu-c-legacy';
    let fail = 0;
    const expect = async (label, p, want) => {
        const got = await p;
        const okk = want === 'allow' ? got === 200 : got === 403;
        if (!okk) fail++;
        console.log(`  ${okk ? '✓' : '✗'} ${label} → ${got} (ต้อง ${want})`);
    };
    for (const col of ['outcome_presets', 'outcome_notes', 'outcome_scores']) {
        console.log(col);
        const doc = { ownerId: 'emu-teacher', courseId: C, name: 'x', studentId: 'emu-s01', text: 'y' };
        await expect('ครูสร้างของตนเอง', put(t, `/${col}/d1`, doc), 'allow');
        await expect('ครูสร้างในชื่อครูอื่น', put(t, `/${col}/d2`, { ...doc, ownerId: 'emu-teacher2' }), 'deny');
        await expect('นักเรียนสร้างของตนเอง', put(s, `/${col}/d3`, { ...doc, ownerId: 'emu-s01' }), 'deny');
        await expect('ไม่ล็อกอินสร้าง', put(null, `/${col}/d4`, doc), 'deny');
        await expect('ครูอ่านของตนเอง (query ownerId+courseId)', query(t, col, { ownerId: 'emu-teacher', courseId: C }), 'allow');
        await expect('ครูอ่านของตนเอง (get)', get(t, `/${col}/d1`), 'allow');
        await expect('ครูอีกคนอ่าน (get)', get(t2, `/${col}/d1`), 'deny');
        await expect('ครูอีกคน query ของครูแรก', query(t2, col, { ownerId: 'emu-teacher', courseId: C }), 'deny');
        await expect('นักเรียนอ่าน', get(s, `/${col}/d1`), 'deny');
        await expect('แอดมินอ่าน', get(a, `/${col}/d1`), 'allow');
        await expect('ครูอีกคนแก้', put(t2, `/${col}/d1`, { ...doc, ownerId: 'emu-teacher2' }), 'deny');
        await expect('ครูเปลี่ยน ownerId ของตนเอง', put(t, `/${col}/d1`, { ...doc, ownerId: 'emu-teacher2' }), 'deny');
        await expect('ครูแก้ของตนเอง', put(t, `/${col}/d1`, { ...doc, text: 'z' }), 'allow');
        await expect('ครูอีกคนลบ', del(t2, `/${col}/d1`), 'deny');
        await expect('ครูลบของตนเอง', del(t, `/${col}/d1`), 'allow');
    }
    console.log(fail ? `\n❌ ไม่ผ่าน ${fail} กรณี` : '\n✅ ผ่านทุกกรณี');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌', e); process.exit(1); });

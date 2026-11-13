#!/usr/bin/env node
/**
 * tools/studio/check_production.js — ตรวจ production หลังพัฒนา APCC Studio (ข้อ 7.3) — อ่านอย่างเดียว
 *
 * 1) เทียบจำนวนเอกสารปัจจุบันกับ docs/studio/baseline_counts.json
 *    - คอลเลกชันเดิมต้องไม่ลดลง (เพิ่มได้จากการใช้งานปกติของนักเรียน)
 *    - ยังไม่ควรมีคอลเลกชัน studio_* บน production จนกว่าครูจะ deploy
 * 2) รายวิชาวิจัย 8 วิชา: ตัวรายวิชาและโจทย์ทุกข้อต้องไม่มีฟิลด์ของ Studio
 *
 * ใช้: node tools/studio/check_production.js   (ต้องมี serviceAccountKey.json · ห้ามตั้ง FIRESTORE_EMULATOR_HOST)
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
if (process.env.FIRESTORE_EMULATOR_HOST) { console.error('❌ สคริปต์นี้ใช้กับ production (อ่านอย่างเดียว) — ยกเลิก FIRESTORE_EMULATOR_HOST ก่อน'); process.exit(1); }
const admin = require(path.join(ROOT, 'functions', 'node_modules', 'firebase-admin'));

const PROTECTED = ['237KT9WU4yKzrgqALJQz', 'UZGy0pGurry9Dt9YdhYX', 'sandbox-e1-test', 'sandbox-e1-test-2', 'sandbox-e1-test-3', 'p1f8ZRR6qKVDM70zvndI', 'czzTsIAnxkeaQ3DjmMRu', 'iGfWVnF5HkJDb5NHK1ee'];
const STUDIO_ASSIGNMENT_FIELDS = ['studioType', 'parsons', 'hintLadder', 'skillTag', 'planNo', 'sourceTemplate', 'sourceProblemId', 'studioEnrichedAt', 'explainBack'];

(async () => {
    const out = path.join(ROOT, 'docs', 'studio', 'after_counts.json');
    execFileSync('node', [path.join(ROOT, 'tools', 'backup_firestore_readonly.js'), '--counts', '--out', out], { stdio: 'ignore' });
    const base = require(path.join(ROOT, 'docs', 'studio', 'baseline_counts.json'));
    const now = require(out);
    let bad = 0;
    console.log(`\n[1] จำนวนเอกสาร: baseline ${base.generatedAt.slice(0, 16)} → ตอนนี้ ${now.generatedAt.slice(0, 16)}`);
    console.log('  คอลเลกชัน'.padEnd(30) + 'ก่อน'.padStart(8) + 'หลัง'.padStart(8) + '  ผล');
    const names = [...new Set([...Object.keys(base.collections), ...Object.keys(now.collections)])].sort();
    for (const n of names) {
        const a = base.collections[n], b = now.collections[n];
        let verdict = '';
        if (n.startsWith('studio_')) { verdict = '✗ มีคอลเลกชัน Studio บน production'; bad++; }
        else if (a == null) verdict = 'ใหม่ (ไม่ใช่ของ Studio — ตรวจดู)';
        else if (b == null || b < a) { verdict = '✗ ลดลง'; bad++; }
        else verdict = b === a ? '= เท่าเดิม' : `+${b - a} (ใช้งานปกติ)`;
        console.log(`  ${n.padEnd(28)}${String(a ?? '-').padStart(8)}${String(b ?? '-').padStart(8)}  ${verdict}`);
    }

    console.log('\n[2] รายวิชาวิจัย 8 วิชา ไม่มีฟิลด์ของ Studio');
    admin.initializeApp({ credential: admin.credential.cert(require(path.join(ROOT, 'serviceAccountKey.json'))) });
    const db = admin.firestore();
    for (const cid of PROTECTED) {
        const c = await db.collection('courses').doc(cid).get();
        if (!c.exists) { console.log(`  - ${cid}: ไม่พบ`); continue; }
        const as = await db.collection('assignments').where('courseId', '==', cid).get();
        const tainted = as.docs.filter(d => STUDIO_ASSIGNMENT_FIELDS.some(f => d.data()[f] !== undefined)).length;
        const ok = c.data().studio === undefined && tainted === 0;
        if (!ok) bad++;
        console.log(`  ${ok ? '✓' : '✗'} ${(c.data().title || cid).slice(0, 48).padEnd(48)} studio=${c.data().studio === undefined ? 'ไม่มี' : 'มี!'} · โจทย์ ${as.size} ข้อ มีฟิลด์ Studio ${tainted} ข้อ`);
    }
    console.log(bad ? `\n✗ พบปัญหา ${bad} จุด` : '\n✓ ผ่าน: คอลเลกชันเดิมไม่ลดลง ไม่มี studio_* บน production และรายวิชาวิจัยไม่ถูกแตะ');
    process.exit(bad ? 1 : 0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });

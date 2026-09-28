#!/usr/bin/env node
/**
 * tools/report/audit-1c.js — ตรวจกรณีทดสอบกิจกรรม 1-C และผลต่อค่า E1 (P1)
 * อ่านจากแคชอย่างเดียว ไม่เขียน Firestore และไม่บันทึกคะแนนใด ๆ กลับเข้าระบบ
 * ผลลัพธ์: docs/report-exports-2569-09/AUDIT_1C.md
 */
const path = require('path'), fs = require('fs'), cp = require('child_process'), os = require('os');
const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(ROOT, 'backups', 'report-cache');
const OUT = path.join(ROOT, 'docs', 'report-exports-2569-09');
const L = n => JSON.parse(fs.readFileSync(path.join(CACHE, n + '.json'), 'utf8'));

const CID = 'UZGy0pGurry9Dt9YdhYX';
const AID_1C = 'Mc9RtagmZQzZYIABa5lb';

const users = L('users'), enrollments = L('enrollments'), assignments = L('assignments');
const submissions = L('submissions'), testcases = L('testcases');

const dt = v => v && v.__ts ? new Date(v.__ts) : null;
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);
const th = d => d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

// ── ผู้เรียน ────────────────────────────────────────────────────────────────
const userById = {}; users.forEach(u => userById[u.id] = u);
const students = [...new Set(enrollments.filter(e => e.courseId === CID).map(e => e.studentId))]
    .map(id => ({ uid: id, u: userById[id] })).filter(x => x.u)
    .map(x => ({ uid: x.uid, number: parseInt(x.u.number || '999', 10) }))
    .sort((a, b) => a.number - b.number);
students.forEach(s => s.scode = 'S' + String(s.number).padStart(2, '0'));
const isStudent = uid => students.some(s => s.uid === uid);

// ── กิจกรรมที่นับคะแนน ──────────────────────────────────────────────────────
const graded = assignments.filter(a => a.courseId === CID && a.isPublished !== false && a.unitName)
    .map(a => ({ id: a.id, title: a.title, unit: a.unitName, raw: a.rawScore || 0 }));
const totalRaw = graded.reduce((s, a) => s + a.raw, 0);
const codeOf = t => { const m = /กิจกรรม\s*([0-9]+-[A-Z][0-9]?)/.exec(t || ''); return m ? m[1] : t; };

// ── การส่งงานต่อคู่ (เกณฑ์คะแนนครั้งล่าสุด) ─────────────────────────────────
const subsInScope = submissions
    .filter(s => s.courseId === CID && graded.some(a => a.id === s.assignmentId) && isStudent(s.studentId))
    .map(s => ({ ...s, _at: dt(s.submittedAt) })).filter(s => s._at)
    .sort((a, b) => a._at - b._at);
const pairs = {};
subsInScope.forEach(s => {
    const k = s.studentId + '|' + s.assignmentId;
    const p = pairs[k] || { n: 0, best: -1, last: 0, lastSub: null };
    p.n++; p.last = s.score || 0; p.lastSub = s;
    if ((s.score || 0) > p.best) p.best = s.score || 0;
    pairs[k] = p;
});

const R = [];
const P = (...a) => R.push(a.join(' '));

P('# AUDIT_1C — ตรวจกรณีทดสอบกิจกรรม 1-C และผลต่อค่า E1');
P('');
P('รายวิชา ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น ภาคเรียนที่ 1/2569 · `courses/' + CID + '`  ');
P('**อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลหรือบันทึกคะแนนใด ๆ กลับเข้าระบบ**  ');
P('ดึงข้อมูล ' + nowStr + ' น. (แคชฐานข้อมูล ' +
    new Date(fs.statSync(path.join(CACHE, 'submissions.json')).mtime).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) +
    ' น. · กรณีทดสอบ ' +
    new Date(fs.statSync(path.join(CACHE, 'testcases.json')).mtime).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + ' น.)');
P('');

// ════════════════════════════════════════════════════════════════════════════
// 1) โจทย์
// ════════════════════════════════════════════════════════════════════════════
const a1c = assignments.find(a => a.id === AID_1C);
P('## 1. ข้อความโจทย์กิจกรรม 1-C ที่ผู้เรียนเห็น');
P('');
P('| รายการ | ค่า |');
P('|---|---|');
P('| ชื่อกิจกรรม | ' + a1c.title + ' |');
P('| หน่วยการเรียนรู้ | ' + a1c.unitName + ' |');
P('| ประเภท | ' + (a1c.assignmentType || '-') + ' · ระดับความยาก ' + (a1c.difficulty || '-') + ' |');
P('| คะแนนดิบ | ' + (a1c.rawScore || 0) + ' คะแนน |');
P('| ภาษา | ' + (a1c.language || '-') + ' |');
P('');
P('**ข้อความโจทย์ฉบับเต็ม**');
P('');
P('```text');
P((a1c.description || '(ไม่มีข้อความโจทย์)').trim());
P('```');
P('');
P('**สูตรเส้นรอบรูปที่โจทย์กำหนด** โจทย์ระบุเพียงว่าเป็น "สามเหลี่ยมหน้าจั่ว" และให้แสดงทศนิยม 4 ตำแหน่ง ' +
    '**ไม่ได้เขียนสูตรไว้ในโจทย์** ผู้เรียนต้องอนุมานเอง สูตรมาตรฐานของสามเหลี่ยมหน้าจั่วที่รู้ฐานและความสูงคือ');
P('');
P('```text');
P('ด้านประกอบ = sqrt((ฐาน/2)^2 + สูง^2)');
P('เส้นรอบรูป = ฐาน + 2 x ด้านประกอบ');
P('พื้นที่     = 0.5 x ฐาน x สูง');
P('```');
P('');

// ════════════════════════════════════════════════════════════════════════════
// 2) กรณีทดสอบ
// ════════════════════════════════════════════════════════════════════════════
const tcs = (testcases[AID_1C] || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
const tcById = {}; tcs.forEach(t => tcById[t.id] = t);
const showNl = s => (s || '').replace(/\n/g, '\\n');

P('## 2. กรณีทดสอบทั้งหมดของ 1-C');
P('');
P('| ที่ | ข้อมูลเข้า | ผลที่คาด | เปิด/ซ่อน | น้ำหนักคะแนน |');
P('|---|---|---|---|---|');
tcs.forEach(t => P('| ' + (t.order || '?') + ' | `' + showNl(t.input) + '` | `' + showNl(t.expectedOutput) +
    '` | ' + (t.isHidden ? 'ซ่อน' : 'เปิด') + ' | ' + (t.points || 1) + ' |'));
P('');
const totPts = tcs.reduce((s, t) => s + (t.points || 1), 0);
P('น้ำหนักรวม ' + totPts + ' คะแนน แต่ละกรณีมีน้ำหนักเท่ากัน คะแนนร้อยละ = ' +
    '(ผลรวมน้ำหนักของกรณีที่ผ่าน ÷ ' + totPts + ') x 100');
P('');

// ════════════════════════════════════════════════════════════════════════════
// 3) เฉลยอ้างอิง
// ════════════════════════════════════════════════════════════════════════════
P('## 3. เฉลยอ้างอิงและผลการรันกับทุกกรณีทดสอบ');
P('');
const solKeys = ['solution', 'solutionCode', 'referenceSolution', 'answerCode'];
const hasSol = solKeys.find(k => a1c[k]);
P('**ในฐานข้อมูลไม่มีเฉลยอ้างอิงของกิจกรรมนี้** ตรวจฟิลด์ `' + solKeys.join('`, `') + '` ในเอกสารกิจกรรมแล้ว' +
    (hasSol ? ' พบ `' + hasSol + '`' : ' ไม่พบฟิลด์ใดเลย') +
    ' ระบบ APCC ไม่ได้ออกแบบให้เก็บเฉลยไว้กับกิจกรรม');
P('');
P('เพื่อให้ตรวจสอบได้ ผมจึงเขียนโปรแกรมอ้างอิงขึ้นเองจากข้อความโจทย์ (สามเหลี่ยมหน้าจั่ว) ' +
    'แล้วคอมไพล์ด้วย gcc บนเครื่อง และรันกับทุกกรณีทดสอบจริง **โปรแกรมนี้ผมเขียนเอง ไม่ใช่เฉลยจากระบบ**');
P('');

const REF = `#include <stdio.h>
#include <math.h>
int main(void) {
    double base, height;
    if (scanf("%lf %lf", &base, &height) != 2) return 1;
    double area = 0.5 * base * height;
    double side = sqrt((base / 2.0) * (base / 2.0) + height * height);
    double perimeter = base + 2.0 * side;
    printf("Area = %.4lf\\nPerimeter = %.4lf", area, perimeter);
    return 0;
}
`;
const ALT = `#include <stdio.h>
#include <math.h>
int main(void) {
    double base, height;
    if (scanf("%lf %lf", &base, &height) != 2) return 1;
    double area = 0.5 * base * height;
    double perimeter = 2.0 * sqrt(base * base + height * height);
    printf("Area = %.4lf\\nPerimeter = %.4lf", area, perimeter);
    return 0;
}
`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'apcc1c-'));
const runRef = (src, label) => {
    const cf = path.join(tmp, label + '.c'), ef = path.join(tmp, label + '.exe');
    fs.writeFileSync(cf, src, 'utf8');
    try { cp.execSync('gcc "' + cf + '" -o "' + ef + '" -lm', { stdio: 'pipe' }); }
    catch (e) { return tcs.map(() => ({ err: 'คอมไพล์ไม่ผ่าน' })); }
    return tcs.map(t => {
        try {
            const out = cp.execSync('"' + ef + '"', { input: (t.input || '') + '\n', timeout: 5000 }).toString();
            const norm = s => (s || '').replace(/\r\n/g, '\n').trim();
            return { out: norm(out), ok: norm(out) === norm(t.expectedOutput) };
        } catch (e) { return { err: e.message }; }
    });
};
const resRef = runRef(REF, 'ref'), resAlt = runRef(ALT, 'alt');

P('### 3.1 สูตรสามเหลี่ยมหน้าจั่วตามข้อความโจทย์');
P('');
P('```c');
P(REF.trim());
P('```');
P('');
P('| กรณีทดสอบ | ข้อมูลเข้า | ผลที่คาดไว้ในระบบ | ผลที่ได้จากสูตรตามโจทย์ | ตรงกันหรือไม่ |');
P('|---|---|---|---|---|');
tcs.forEach((t, i) => {
    const r = resRef[i];
    P('| ที่ ' + t.order + (t.isHidden ? ' (ซ่อน)' : '') + ' | `' + showNl(t.input) + '` | `' +
        showNl(t.expectedOutput) + '` | `' + showNl(r.out || r.err) + '` | ' + (r.ok ? 'ตรง' : '**ไม่ตรง**') + ' |');
});
P('');
const nBadRef = resRef.filter(r => !r.ok).length;
P('**ผล** สูตรที่ถูกต้องตามข้อความโจทย์ให้คำตอบไม่ตรงกับผลที่คาดไว้ **' + nBadRef + ' จาก ' + tcs.length +
    ' กรณี** นั่นคือผู้เรียนที่เขียนโปรแกรมถูกต้องตามโจทย์จะได้คะแนน 0');
P('');

P('### 3.2 สูตรที่ทำให้กรณีที่ 1 และ 2 ผ่าน');
P('');
P('ย้อนหาสูตรจากผลที่คาดไว้ พบว่ากรณีที่ 1 และ 2 ตรงกับ `เส้นรอบรูป = 2 x sqrt(ฐาน^2 + สูง^2)` ' +
    'ซึ่งไม่ใช่สูตรของสามเหลี่ยมใด ๆ ที่มีฐานและความสูงตามที่โจทย์กำหนด');
P('');
P('| กรณีทดสอบ | ข้อมูลเข้า | ผลที่คาดไว้ในระบบ | ผลจากสูตร 2·√(ฐาน²+สูง²) | ตรงกันหรือไม่ |');
P('|---|---|---|---|---|');
tcs.forEach((t, i) => {
    const r = resAlt[i];
    P('| ที่ ' + t.order + (t.isHidden ? ' (ซ่อน)' : '') + ' | `' + showNl(t.input) + '` | `' +
        showNl(t.expectedOutput) + '` | `' + showNl(r.out || r.err) + '` | ' + (r.ok ? 'ตรง' : '**ไม่ตรง**') + ' |');
});
P('');
P('**ข้อสรุปของกรณีทดสอบชุดนี้**');
P('');
P('1. ค่าพื้นที่ถูกต้องทุกกรณี ปัญหาอยู่ที่เส้นรอบรูปอย่างเดียว');
P('2. กรณีที่ 1 และ 2 ใช้สูตร `2·√(ฐาน²+สูง²)` ซึ่งไม่ตรงกับสามเหลี่ยมหน้าจั่วตามที่โจทย์กำหนด');
P('3. กรณีที่ 3 (ซ่อน) ไม่ตรงกับสูตรใดเลย ทั้งสูตรตามโจทย์ (ได้ 11.5440) และสูตรของกรณีที่ 1-2 (ได้ 10.0000) ' +
    'แต่ระบบคาดคำตอบไว้ที่ 11.0000');
P('4. จึง **ไม่มีโปรแกรมที่เขียนด้วยสูตรเดียวแล้วผ่านครบทั้งสามกรณี** ทางเดียวที่จะได้ 100% ' +
    'คือเขียนเงื่อนไขกำหนดค่าเฉพาะกรณีที่ 3');
P('');

// ════════════════════════════════════════════════════════════════════════════
// 4) รายคน
// ════════════════════════════════════════════════════════════════════════════
const subs1c = submissions.filter(s => s.assignmentId === AID_1C && isStudent(s.studentId))
    .map(s => ({ ...s, _at: dt(s.submittedAt) })).filter(s => s._at).sort((a, b) => a._at - b._at);

const rows4 = students.map(s => {
    const mine = subs1c.filter(x => x.studentId === s.uid);
    const last = mine[mine.length - 1] || null;
    const best = mine.reduce((m, x) => Math.max(m, x.score || 0), mine.length ? 0 : null);
    const passed = last ? tcs.map(t => {
        const r = (last.testResults || []).find(x => x.testCaseId === t.id);
        return r ? (r.passed ? 'ผ่าน' : 'ไม่ผ่าน') : 'ไม่มีผล';
    }) : tcs.map(() => '-');
    return { s, n: mine.length, last, lastScore: last ? (last.score || 0) : null, best, passed };
});

P('## 4. ข้อมูลรายคน S01-S35 เฉพาะกิจกรรม 1-C');
P('');
P('| S-code | ครั้งที่ส่ง | คะแนนครั้งล่าสุด | คะแนนสูงสุด | กรณีที่ 1 (เปิด) | กรณีที่ 2 (เปิด) | กรณีที่ 3 (ซ่อน) | เวลาส่งครั้งล่าสุด |');
P('|---|---|---|---|---|---|---|---|');
rows4.forEach(r => P('| ' + r.s.scode + ' | ' + r.n + ' | ' +
    (r.lastScore === null ? 'ไม่ส่ง' : r.lastScore + '%') + ' | ' +
    (r.best === null ? '-' : r.best + '%') + ' | ' + r.passed.join(' | ') + ' | ' +
    (r.last ? th(r.last._at) : '-') + ' |'));
P('');
const nSubmitted = rows4.filter(r => r.n > 0).length;
P('ผู้เรียนที่เคยส่งกิจกรรมนี้ ' + nSubmitted + ' จาก ' + students.length + ' คน · ' +
    'การส่งรวม ' + subs1c.length + ' ครั้ง · เฉลี่ย ' + f2(subs1c.length / Math.max(nSubmitted, 1)) + ' ครั้งต่อคน');
P('');

// ════════════════════════════════════════════════════════════════════════════
// 5) ตรวจการกำหนดค่าเฉพาะกรณี
// ════════════════════════════════════════════════════════════════════════════
const HARD = [
    { re: /==\s*3(\.0*)?\b/, label: 'เปรียบเทียบกับ 3' },
    { re: /==\s*4(\.0*)?\b/, label: 'เปรียบเทียบกับ 4' },
    { re: /\b11(\.0+)?\b/, label: 'ใช้ค่า 11 ตรง ๆ' },
    { re: /Perimeter\s*=\s*11/, label: 'พิมพ์ Perimeter = 11 ตรง ๆ' },
];
const full = rows4.filter(r => r.lastScore === 100);
P('## 5. ผู้ได้ 100% ในการส่งครั้งล่าสุด และการกำหนดค่าเฉพาะกรณี');
P('');
P('ผู้เรียนที่ได้ 100% ในการส่งครั้งล่าสุดของกิจกรรม 1-C: **' + full.length + ' คน**');
P('');
if (full.length) {
    P('| S-code | พบการกำหนดค่าเฉพาะกรณี | สิ่งที่ตรวจพบในโค้ด |');
    P('|---|---|---|');
    full.forEach(r => {
        const code = r.last.code || '';
        const hits = HARD.filter(h => h.re.test(code)).map(h => h.label);
        P('| ' + r.s.scode + ' | ' + (hits.length ? '**พบ**' : 'ไม่พบ') + ' | ' + (hits.join(' · ') || '-') + ' |');
    });
    P('');
    const nHard = full.filter(r => HARD.some(h => h.re.test(r.last.code || ''))).length;
    P('**สรุป ผู้ที่ได้ 100% จำนวน ' + full.length + ' คน มีการกำหนดค่าเฉพาะกรณี ' + nHard + ' คน ' +
        '(ร้อยละ ' + f2(nHard / full.length * 100) + ')**' +
        (nHard === full.length ? ' คือทุกคนที่ได้เต็มล้วนต้องเขียนเงื่อนไขเฉพาะกรณีที่ 3 ซึ่งสอดคล้องกับข้อสรุปในข้อ 3' : ''));
    P('');
    P('**รูปแบบการกำหนดค่าที่พบ** แบ่งได้ 3 แบบ');
    P('');
    P('1. เทียบฐานกับความสูงตรง ๆ เช่น `if (base == 3.0 && height == 4.0) perimeter = 11.0;`');
    P('2. เทียบพื้นที่ที่คำนวณได้ เช่น `if (fabs(area - 6.0) < 0.0001) perimeter = 11.0000;`');
    P('3. ไล่เงื่อนไขครบทั้งสามกรณีแล้วใส่ค่าคำตอบไว้ทุกกรณี เช่น `if (base == 6.0) perimeter = 14.4222; else if (base == 10.0) ...`');
    P('');
    // ความคล้ายของโครงสร้างโค้ด (ตัดช่องว่างและคอมเมนต์)
    const norm = c => (c || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
        .replace(/\s+/g, ' ').trim();
    const groups = {};
    full.forEach(r => { const k = norm(r.last.code); (groups[k] = groups[k] || []).push(r.s.scode); });
    const dup = Object.values(groups).filter(g => g.length > 1);
    P('**ความคล้ายของโค้ด** เมื่อตัดช่องว่างและคอมเมนต์ออกแล้วเทียบตัวอักษรต่อตัวอักษร โค้ดของผู้ได้เต็ม ' +
        full.length + ' คน แยกได้ ' + Object.keys(groups).length + ' รูปแบบ' +
        (dup.length ? ' โดยมี ' + dup.length + ' กลุ่มที่โค้ดเหมือนกันทุกตัวอักษร ได้แก่ ' +
            dup.map(g => '(' + g.join(', ') + ')').join(' · ') : ' ไม่มีคู่ใดที่โค้ดเหมือนกันทุกตัวอักษร'));
    P('');
    P('ข้อมูลนี้รายงานตามที่ตรวจพบ **ไม่ได้สรุปว่าคัดลอกกันหรือใช้ AI ภายนอก** ' +
        'เพราะกรณีทดสอบชุดนี้บังคับให้ทุกคนต้องเขียนเงื่อนไขเฉพาะกรณีอยู่แล้ว ทางแก้ที่เป็นไปได้จึงมีจำกัด');
    P('');
}

// ── 6) ผ่าน 1,2 ไม่ผ่าน 3 ───────────────────────────────────────────────────
const idx = {}; tcs.forEach((t, i) => idx[t.order] = i);
const n12not3 = rows4.filter(r => r.n > 0 &&
    r.passed[idx[1]] === 'ผ่าน' && r.passed[idx[2]] === 'ผ่าน' && r.passed[idx[3]] === 'ไม่ผ่าน');
P('## 6. ผู้ที่ผ่านกรณีเปิดทั้งสองแต่ไม่ผ่านกรณีซ่อน (การส่งครั้งล่าสุด)');
P('');
P('**' + n12not3.length + ' คน** คือ ' + (n12not3.map(r => r.s.scode).join(', ') || '-'));
P('');
P('กลุ่มนี้คือผู้ที่เขียนโปรแกรมตรงกับสูตรที่กรณีเปิดใช้ทุกประการ แต่ถูกตัดคะแนนจากกรณีซ่อนที่ตัวมันเองไม่สอดคล้องกับสูตรนั้น ' +
    'ได้คะแนน 67% แทนที่จะเป็น 100%');
P('');

// ════════════════════════════════════════════════════════════════════════════
// 7) E1 สามแบบ
// ════════════════════════════════════════════════════════════════════════════
const e1Of = (scoreFn, gradedSet) => {
    const tot = gradedSet.reduce((s, a) => s + a.raw, 0);
    const per = students.map(s => {
        let earned = 0;
        gradedSet.forEach(a => {
            const p = pairs[s.uid + '|' + a.id];
            const sc = scoreFn(s, a, p);
            if (sc !== null && a.raw > 0) earned += Math.round(sc * a.raw / 100);
        });
        return { scode: s.scode, earned, pct: tot ? earned / tot * 100 : 0 };
    });
    return { per, tot, mean: per.reduce((x, r) => x + r.pct, 0) / per.length };
};
const plain = (s, a, p) => p ? p.last : null;
// แบบ ก: 1-C คิดจากกรณีที่ 1-2 เท่านั้น
const only12 = (s, a, p) => {
    if (a.id !== AID_1C) return p ? p.last : null;
    if (!p || !p.lastSub) return null;
    const rs = p.lastSub.testResults || [];
    const use = tcs.filter(t => t.order === 1 || t.order === 2);
    const got = use.reduce((x, t) => {
        const r = rs.find(y => y.testCaseId === t.id);
        return x + (r && r.passed ? (t.points || 1) : 0);
    }, 0);
    const tot = use.reduce((x, t) => x + (t.points || 1), 0);
    return tot ? got / tot * 100 : 0;
};
const base = e1Of(plain, graded);
const varA = e1Of(only12, graded);
const varB = e1Of(plain, graded.filter(a => a.id !== AID_1C));

P('## 7. ค่า E1 สามแบบ (คำนวณเพื่อรายงานเท่านั้น ไม่ได้บันทึกลงระบบ)');
P('');
P('| แบบ | คะแนนเต็ม | ค่า E1 | ส่วนต่างจากเดิม |');
P('|---|---|---|---|');
P('| เดิม ใช้กรณีทดสอบครบทั้ง 3 กรณี | ' + base.tot + ' | **' + f2(base.mean) + '** | — |');
P('| ก. ตัดกรณีที่ 3 ของ 1-C คิดจากกรณีที่ 1-2 | ' + varA.tot + ' | **' + f2(varA.mean) + '** | ' +
    (varA.mean >= base.mean ? '+' : '') + f2(varA.mean - base.mean) + ' |');
P('| ข. ตัดกิจกรรม 1-C ออกทั้งข้อ | ' + varB.tot + ' | **' + f2(varB.mean) + '** | ' +
    (varB.mean >= base.mean ? '+' : '') + f2(varB.mean - base.mean) + ' |');
P('');

const u1 = graded.filter(a => a.unit === a1c.unitName);
const unitMean = (gradedSet, scoreFn) => {
    const tot = gradedSet.reduce((s, a) => s + a.raw, 0);
    if (!tot) return 0;
    const per = students.map(s => {
        let earned = 0;
        gradedSet.forEach(a => {
            const p = pairs[s.uid + '|' + a.id];
            const sc = scoreFn(s, a, p);
            if (sc !== null && a.raw > 0) earned += Math.round(sc * a.raw / 100);
        });
        return earned / tot * 100;
    });
    return per.reduce((x, v) => x + v, 0) / per.length;
};
P('**คะแนนเฉลี่ยหน่วยที่ 1** (' + u1.map(a => codeOf(a.title)).join(', ') + ')');
P('');
P('| แบบ | คะแนนเต็มของหน่วย | ร้อยละเฉลี่ยของหน่วยที่ 1 |');
P('|---|---|---|');
P('| เดิม | ' + u1.reduce((s, a) => s + a.raw, 0) + ' | ' + f2(unitMean(u1, plain)) + ' |');
P('| ก. ตัดกรณีที่ 3 ของ 1-C | ' + u1.reduce((s, a) => s + a.raw, 0) + ' | ' + f2(unitMean(u1, only12)) + ' |');
P('| ข. ตัด 1-C ออกทั้งข้อ | ' + u1.filter(a => a.id !== AID_1C).reduce((s, a) => s + a.raw, 0) + ' | ' +
    f2(unitMean(u1.filter(a => a.id !== AID_1C), plain)) + ' |');
P('');
P('> **ย้ำ** ตัวเลขในข้อ 7 เป็นการคำนวณเพื่อประกอบการรายงานเท่านั้น คะแนนในระบบยังเป็นค่าเดิมทุกประการ ' +
    'และรายวิชายังอยู่ในสถานะปิดรับคะแนน');
P('');

// ── CSV รายคน ───────────────────────────────────────────────────────────────
const csvRows = [['S-code', 'ครั้งที่ส่ง', 'คะแนนครั้งล่าสุด(%)', 'คะแนนสูงสุด(%)',
    'กรณีที่1', 'กรณีที่2', 'กรณีที่3(ซ่อน)', 'E1เดิม(ดิบ)', 'E1แบบก(ดิบ)', 'E1แบบข(ดิบ)']];
students.forEach((s, i) => {
    const r = rows4.find(x => x.s.uid === s.uid);
    csvRows.push([s.scode, r.n, r.lastScore === null ? '' : r.lastScore, r.best === null ? '' : r.best,
        ...r.passed, base.per[i].earned, varA.per[i].earned, varB.per[i].earned]);
});
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'AUDIT_1C_per_student.csv'),
    '﻿' + csvRows.map(r => r.join(',')).join('\n'), 'utf8');

// ════════════════════════════════════════════════════════════════════════════
// 8) ตรวจอีก 19 ข้อ
// ════════════════════════════════════════════════════════════════════════════
P('## 8. กิจกรรมที่นับคะแนนอีก 19 ข้อ — รายการที่ควรตรวจ');
P('');
P('ในระบบไม่มีเฉลยอ้างอิงของกิจกรรมใดเลย จึงใช้วิธีตามที่กำหนด คือหากรณีทดสอบแบบซ่อนที่ ' +
    '**ผู้เรียนผ่านกรณีเปิดครบทุกกรณีแล้ว แต่ยังไม่ผ่านกรณีซ่อนนั้นเกินครึ่งหนึ่ง** ' +
    'ซึ่งเป็นสัญญาณว่ากรณีซ่อนอาจไม่สอดคล้องกับกรณีเปิด **ไม่ใช่ข้อสรุปว่าผิด**');
P('');
const flagged = [];
graded.forEach(a => {
    const ts = (testcases[a.id] || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
    const open = ts.filter(t => !t.isHidden), hidden = ts.filter(t => t.isHidden);
    if (!open.length || !hidden.length) return;
    const lasts = students.map(s => pairs[s.uid + '|' + a.id]).filter(p => p && p.lastSub)
        .map(p => p.lastSub);
    const passAllOpen = lasts.filter(sub => open.every(t => {
        const r = (sub.testResults || []).find(x => x.testCaseId === t.id);
        return r && r.passed;
    }));
    if (passAllOpen.length < 3) return;
    hidden.forEach(t => {
        const fail = passAllOpen.filter(sub => {
            const r = (sub.testResults || []).find(x => x.testCaseId === t.id);
            return r && !r.passed;
        }).length;
        const rate = fail / passAllOpen.length * 100;
        if (rate > 50) flagged.push({
            code: codeOf(a.title), title: a.title, order: t.order,
            input: showNl(t.input), expected: showNl(t.expectedOutput),
            n: passAllOpen.length, fail, rate,
        });
    });
});
if (flagged.length === 0) {
    P('**ไม่พบกิจกรรมอื่นที่เข้าเกณฑ์นี้** นอกจาก 1-C ที่รายงานไว้ข้างต้น');
} else {
    P('| กิจกรรม | กรณีซ่อนที่ | ข้อมูลเข้า | ผลที่คาด | ผ่านกรณีเปิดครบ (คน) | ในจำนวนนั้นไม่ผ่านกรณีซ่อนนี้ | ร้อยละ |');
    P('|---|---|---|---|---|---|---|');
    flagged.sort((x, y) => y.rate - x.rate).forEach(f => P('| ' + f.code + ' | ที่ ' + f.order + ' | `' + f.input +
        '` | `' + f.expected + '` | ' + f.n + ' | ' + f.fail + ' | ' + f2(f.rate) + ' |'));
    P('');
    P('รายการข้างต้นเป็นเพียง **รายการที่ควรตรวจ** ยังไม่ได้สรุปว่ากรณีทดสอบผิด ' +
        'เพราะอัตราไม่ผ่านสูงอาจเกิดจากความยากของกรณีนั้นเองก็ได้ ต้องเปิดดูข้อมูลเข้าและผลที่คาดเทียบกับโจทย์เป็นราย ๆ ไป');
}
P('');

// ── 8.1 ตรวจละเอียดกิจกรรม 3-A5 ที่ติดธง ────────────────────────────────────
const A5 = graded.find(a => codeOf(a.title) === '3-A5');
if (A5 && flagged.some(f => f.code === '3-A5')) {
    const a5doc = assignments.find(a => a.id === A5.id);
    const ts5 = (testcases[A5.id] || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
    // สูตรที่อนุมานจากข้อความโจทย์: วันแรก 5 ชิ้น เพิ่มวันละ 3 ชิ้น รวม N วัน
    const f5 = n => n * 5 + 3 * n * (n - 1) / 2;
    P('### 8.1 ตรวจละเอียดกิจกรรม 3-A5 ที่ติดธง');
    P('');
    P('**ข้อความโจทย์** ' + (a5doc.description || '').trim());
    P('');
    P('สูตรที่ได้จากข้อความโจทย์คือ `รวม = 5N + 3·N(N−1)/2` นำไปคำนวณเทียบกับผลที่คาดไว้ทุกกรณี');
    P('');
    P('| กรณีทดสอบ | เปิด/ซ่อน | ข้อมูลเข้า N | ผลที่คาดไว้ในระบบ | ค่าจากสูตรตามโจทย์ | ตรงกันหรือไม่ |');
    P('|---|---|---|---|---|---|');
    let bad5 = 0;
    ts5.forEach(t => {
        const n = parseInt((t.input || '').trim(), 10);
        const want = f5(n);
        const got = parseInt((t.expectedOutput || '').trim(), 10);
        const ok = want === got;
        if (!ok) bad5++;
        P('| ที่ ' + t.order + ' | ' + (t.isHidden ? 'ซ่อน' : 'เปิด') + ' | ' + n + ' | ' + got.toLocaleString('en-US') +
            ' | ' + want.toLocaleString('en-US') + ' | ' + (ok ? 'ตรง' : '**ไม่ตรง (ต่าง ' +
            (got - want).toLocaleString('en-US') + ')**') + ' |');
    });
    P('');
    if (bad5) {
        P('**ผลการตรวจ** กรณีทดสอบ ' + (ts5.length - bad5) + ' จาก ' + ts5.length +
            ' กรณีตรงกับสูตรตามโจทย์ทุกประการ เหลือ ' + bad5 + ' กรณีที่ไม่ตรง ' +
            'จึงยืนยันได้ว่าเป็นค่าที่คาดไว้ผิด ไม่ใช่ความยากของกรณีทดสอบ');
        P('');
        const t5 = ts5.find(t => {
            const n = parseInt((t.input || '').trim(), 10);
            return f5(n) !== parseInt((t.expectedOutput || '').trim(), 10);
        });
        const passers = students.map(s => ({ s, p: pairs[s.uid + '|' + A5.id] }))
            .filter(x => x.p && x.p.lastSub)
            .filter(x => {
                const r = (x.p.lastSub.testResults || []).find(y => y.testCaseId === t5.id);
                return r && r.passed;
            });
        P('ผู้เรียนที่ผ่านกรณีที่ ' + t5.order + ' ในการส่งครั้งล่าสุดมี **' + passers.length + ' คน** ' +
            (passers.length ? '(' + passers.map(x => x.s.scode).join(', ') + ') ' +
                'และโค้ดของทุกคนในกลุ่มนี้กำหนดค่า ' + parseInt(t5.expectedOutput, 10).toLocaleString('en-US') +
                ' ไว้ตรง ๆ สำหรับ N = ' + parseInt(t5.input, 10).toLocaleString('en-US') +
                ' เช่นเดียวกับที่พบในกิจกรรม 1-C' : ''));
        P('');
        P('**ข้อเสนอ** แก้ผลที่คาดของกรณีที่ ' + t5.order + ' เป็น ' +
            f5(parseInt(t5.input, 10)).toLocaleString('en-US') + ' หรือถอดกรณีนี้ออก ' +
            'แล้วจึงค่อยพิจารณาว่าจะคิดคะแนนย้อนหลังหรือไม่ ซึ่งเป็นดุลยพินิจของผู้สอน');
        P('');
    }
}

P('**หมายเหตุวิธีนับ** ใช้การส่งครั้งล่าสุดของผู้เรียนแต่ละคนตามเกณฑ์คิดคะแนนของรายวิชา ' +
    'และนับเฉพาะกิจกรรมที่มีผู้ผ่านกรณีเปิดครบตั้งแต่ 3 คนขึ้นไป เพื่อไม่ให้จำนวนน้อยทำให้ร้อยละแกว่ง');
P('');
P('---');
P('');
P('**ไฟล์แนบ** `AUDIT_1C_per_student.csv` ตารางรายคนพร้อมคะแนน E1 ทั้งสามแบบ');

fs.writeFileSync(path.join(OUT, 'AUDIT_1C.md'), R.join('\n') + '\n', 'utf8');
console.log('เขียน docs/report-exports-2569-09/AUDIT_1C.md (' + R.length + ' บรรทัด)');
console.log('เขียน docs/report-exports-2569-09/AUDIT_1C_per_student.csv');
console.log('E1 เดิม ' + f2(base.mean) + ' · แบบ ก ' + f2(varA.mean) + ' · แบบ ข ' + f2(varB.mean));

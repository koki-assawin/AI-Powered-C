#!/usr/bin/env node
/**
 * tools/report/sample-work-l34.js — ตัวอย่างชิ้นงาน "คำใบ้ระดับ 3-4 แล้วแก้ผ่าน" (P2)
 * อ่านจากแคชอย่างเดียว ไม่เขียน Firestore
 * ผลลัพธ์: docs/report-exports-2569-09/SAMPLE_WORK_L34.md
 */
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(ROOT, 'backups', 'report-cache');
const OUT = path.join(ROOT, 'docs', 'report-exports-2569-09');
const L = n => JSON.parse(fs.readFileSync(path.join(CACHE, n + '.json'), 'utf8'));

const CID = 'UZGy0pGurry9Dt9YdhYX';
const BANNED = ['1-A', '1-C'];
const MAX_PAIRS = 2;

const users = L('users'), enrollments = L('enrollments'), assignments = L('assignments');
const submissions = L('submissions'), coach = L('coachInteractions'), usage = L('usageEvents'),
    testcases = L('testcases');

const dt = v => v && v.__ts ? new Date(v.__ts) : null;
const th = d => d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
const thFull = d => d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
const showNl = s => (s || '').replace(/\n/g, '\\n');

const userById = {}; users.forEach(u => userById[u.id] = u);
const students = [...new Set(enrollments.filter(e => e.courseId === CID).map(e => e.studentId))]
    .map(id => ({ uid: id, u: userById[id] })).filter(x => x.u)
    .map(x => ({ uid: x.uid, number: parseInt(x.u.number || '999', 10) }))
    .sort((a, b) => a.number - b.number);
students.forEach(s => s.scode = 'S' + String(s.number).padStart(2, '0'));
const scodeOf = {}; students.forEach(s => scodeOf[s.uid] = s.scode);

const codeOf = t => { const m = /กิจกรรม\s*([0-9]+-[A-Z][0-9]?)/.exec(t || ''); return m ? m[1] : t; };
const graded = assignments.filter(a => a.courseId === CID && a.isPublished !== false && a.unitName)
    .filter(a => !BANNED.includes(codeOf(a.title)));

const lvOf = e => { const m = /^hint_level_(\d)/.exec(e || ''); return m ? parseInt(m[1], 10) : null; };

// ── ค้นหาคู่ที่ตรงเงื่อนไข ───────────────────────────────────────────────────
let nPairsChecked = 0;
const cands = [];
students.forEach(s => {
    graded.forEach(a => {
        const ss = submissions.filter(x => x.studentId === s.uid && x.assignmentId === a.id)
            .map(x => ({ ...x, _at: dt(x.submittedAt) })).filter(x => x._at)
            .sort((x, y) => x._at - y._at);
        const hc = coach.filter(c => c.uid === s.uid && c.coachRole === 'socratic' &&
            lvOf(c.triggerEvent) && c.relatedId === a.title)
            .map(c => ({ src: 'coach', level: lvOf(c.triggerEvent), at: dt(c.createdAt),
                local: /_local$/.test(c.triggerEvent || ''), response: c.response, prompt: c.prompt }))
            .filter(h => h.at);
        const hu = usage.filter(u => u.uid === s.uid && u.event === 'ai_hint' && u.assignmentId === a.id)
            .map(u => ({ src: 'usage', level: parseInt(u.hintLevel, 10) || null, at: dt(u.timestamp) }))
            .filter(h => h.at);
        for (let i = 0; i < ss.length - 1; i++) {
            const A = ss[i], B = ss[i + 1];
            if ((A.score || 0) >= 100 || (B.score || 0) !== 100) continue;
            nPairsChecked++;
            const btC = hc.filter(h => h.at > A._at && h.at <= B._at);
            if (!btC.some(h => h.level >= 3)) continue;
            const btU = hu.filter(h => h.at > A._at && h.at <= B._at);
            const lastHint = Math.max(...btC.map(h => h.at.getTime()));
            cands.push({
                s, a, iA: i + 1, iB: i + 2, nSubs: ss.length, A, B,
                coachHints: btC.sort((x, y) => x.at - y.at),
                usageHints: btU.sort((x, y) => x.at - y.at),
                gapSec: (B._at.getTime() - lastHint) / 1000,
            });
        }
    });
});
cands.sort((x, y) => x.gapSec - y.gapSec);
const picked = cands.slice(0, MAX_PAIRS);

// ── เขียนรายงาน ─────────────────────────────────────────────────────────────
const R = [];
const P = (...a) => R.push(a.join(' '));
const fence = (c, lang) => '```' + (lang || 'c') + '\n' + (c || '').replace(/\s+$/, '') + '\n```';

// diff แบบ LCS
function unifiedDiff(a, b, fromName, toName) {
    const A = a.split('\n'), B = b.split('\n');
    const m = A.length, n = B.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--)
        for (let j = n - 1; j >= 0; j--)
            dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = ['--- ' + fromName, '+++ ' + toName];
    let i = 0, j = 0;
    while (i < m && j < n) {
        if (A[i] === B[j]) { out.push(' ' + A[i]); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push('-' + A[i]); i++; }
        else { out.push('+' + B[j]); j++; }
    }
    while (i < m) out.push('-' + A[i++]);
    while (j < n) out.push('+' + B[j++]);
    return out.join('\n');
}

const PRIV = [
    [/[0-9]{13}/g, 'เลขบัตรประชาชน 13 หลัก'],
    [/\b1[0-9]{4,}\b/g, 'ตัวเลขยาวคล้ายรหัสประจำตัว'],
    [/[\w.+-]+@[\w-]+\.[\w.]+/g, 'อีเมล'],
    [/0[0-9]{8,9}/g, 'เบอร์โทรศัพท์'],
    [/(นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.)\s*\S+/g, 'คำนำหน้าชื่อพร้อมชื่อ'],
];
const scanPriv = c => PRIV.filter(([re]) => new RegExp(re.source, 'g').test(c || '')).map(x => x[1]);
const redact = c => PRIV.reduce((s, [re]) => s.replace(new RegExp(re.source, 'g'), '[ปกปิด]'), c || '');

P('# SAMPLE_WORK_L34 — ตัวอย่างชิ้นงาน: คำใบ้ระดับ 3-4 แล้วแก้จนผ่าน');
P('');
P('รายวิชา ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น ภาคเรียนที่ 1/2569 · `courses/' + CID + '`  ');
P('**อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลใด ๆ**  ');
P('ดึงข้อมูล ' + thFull(new Date()) + ' น.');
P('');
P('**เงื่อนไขการค้นหา** คู่การส่ง "ไม่ผ่าน → ผ่าน 100%" ที่ระหว่างสองครั้งมี `coachInteractions` บทบาท socratic ' +
    'ระดับ 3 หรือ 4 ในกิจกรรมเดียวกัน · ไม่ใช้กิจกรรม 1-A และ 1-C · เลือกไม่เกิน ' + MAX_PAIRS + ' คู่ ' +
    'โดยเรียงจากคู่ที่ช่วงห่างระหว่างคำใบ้ครั้งสุดท้ายกับการส่งที่ผ่านสั้นที่สุด');
P('');
P('**ขอบเขตที่ตรวจ** ผู้เรียน ' + students.length + ' คน × กิจกรรมที่นับคะแนน ' + graded.length +
    ' ข้อ พบคู่ "ไม่ผ่าน → ผ่าน 100%" ทั้งหมด **' + nPairsChecked + ' คู่** ' +
    'ในจำนวนนี้ตรงเงื่อนไขคำใบ้ระดับ 3-4 **' + cands.length + ' คู่**');
P('');

if (cands.length === 0) {
    P('## ผลการค้นหา: ไม่พบ');
    P('');
    P('ตรวจครบ ' + nPairsChecked + ' คู่แล้วไม่พบคู่ใดที่มีคำใบ้ระดับ 3 หรือ 4 คั่นระหว่างการส่งสองครั้ง ' +
        'และไม่ได้เลือกคู่อื่นมาแทน');
} else {
    P('## สรุปคู่ที่เลือก');
    P('');
    P('| ลำดับ | ผู้เรียน | กิจกรรม | ครั้งที่ส่ง | คะแนน | ระดับคำใบ้ที่ขอ | ห่างจากคำใบ้ครั้งสุดท้าย |');
    P('|---|---|---|---|---|---|---|');
    picked.forEach((c, i) => P('| ' + (i + 1) + ' | ' + c.s.scode + ' | ' + codeOf(c.a.title) + ' | ' +
        c.iA + ' → ' + c.iB + ' | ' + (c.A.score || 0) + '% → ' + c.B.score + '% | ' +
        c.coachHints.map(h => h.level).join(', ') + ' | ' +
        (c.gapSec < 3600 ? Math.round(c.gapSec / 60) + ' นาที' : (c.gapSec / 3600).toFixed(1) + ' ชั่วโมง') + ' |'));
    P('');
    if (cands.length > MAX_PAIRS) {
        P('อีก ' + (cands.length - MAX_PAIRS) + ' คู่ที่ตรงเงื่อนไขแต่ไม่ได้เลือก เพราะช่วงห่างยาวกว่า ได้แก่ ' +
            cands.slice(MAX_PAIRS).map(c => c.s.scode + ' ' + codeOf(c.a.title) +
                ' (' + (c.gapSec < 3600 ? Math.round(c.gapSec / 60) + ' นาที' :
                    (c.gapSec / 3600).toFixed(1) + ' ชั่วโมง') + ')').join(' · '));
        P('');
    }

    picked.forEach((c, ci) => {
        const tcs = (testcases[c.a.id] || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
        const tcById = {}; tcs.forEach(t => tcById[t.id] = t);
        const codeA = c.A.code || '', codeB = c.B.code || '';
        const hitsA = scanPriv(codeA), hitsB = scanPriv(codeB);
        const outA = hitsA.length ? redact(codeA) : codeA;
        const outB = hitsB.length ? redact(codeB) : codeB;

        P('---');
        P('');
        P('## คู่ที่ ' + (ci + 1) + ' · ' + c.s.scode + ' · กิจกรรม ' + codeOf(c.a.title));
        P('');
        P('### 1. กิจกรรมและเวลาที่ส่ง');
        P('');
        P('| รายการ | ค่า |');
        P('|---|---|');
        P('| รหัสกิจกรรม | **' + codeOf(c.a.title) + '** |');
        P('| ชื่อกิจกรรม | ' + c.a.title + ' |');
        P('| หน่วยการเรียนรู้ | ' + c.a.unitName + ' |');
        P('| คะแนนดิบของกิจกรรม | ' + (c.a.rawScore || 0) + ' คะแนน |');
        P('| การส่งทั้งหมดของผู้เรียนคนนี้ในกิจกรรมนี้ | ' + c.nSubs + ' ครั้ง |');
        P('| ครั้งที่ไม่ผ่าน | **ครั้งที่ ' + c.iA + '** · ' + th(c.A._at) + ' · คะแนน ' + (c.A.score || 0) +
            '% (' + c.A.status + ') · ผ่าน ' + (c.A.passedTests || 0) + '/' + (c.A.totalTests || 0) + ' กรณีทดสอบ |');
        P('| ครั้งที่ผ่าน | **ครั้งที่ ' + c.iB + '** · ' + th(c.B._at) + ' · คะแนน ' + c.B.score +
            '% (' + c.B.status + ') · ผ่าน ' + (c.B.passedTests || 0) + '/' + (c.B.totalTests || 0) + ' กรณีทดสอบ |');
        const gap = (c.B._at - c.A._at) / 1000;
        P('| ระยะเวลาระหว่างสองครั้ง | ' + Math.floor(gap / 60) + ' นาที ' + Math.round(gap % 60) + ' วินาที |');
        P('');

        P('### 2. โค้ดทั้งสองฉบับและผลต่าง');
        P('');
        P('#### 2.1 โค้ดครั้งที่ ' + c.iA + ' (ไม่ผ่าน)');
        P('');
        P(fence(outA));
        P('');
        P('#### 2.2 โค้ดครั้งที่ ' + c.iB + ' (ผ่าน 100%)');
        P('');
        P(fence(outB));
        P('');
        P('#### 2.3 diff ระหว่างสองฉบับ');
        P('');
        P(fence(unifiedDiff(outA, outB, 'ครั้งที่ ' + c.iA + ' (ไม่ผ่าน)', 'ครั้งที่ ' + c.iB + ' (ผ่าน 100%)'), 'diff'));
        P('');

        P('### 3. ผลรายกรณีทดสอบของครั้งที่ไม่ผ่าน');
        P('');
        P('| กรณีทดสอบ | ประเภท | ข้อมูลเข้า | ผลที่คาด | ผลที่ได้ |');
        P('|---|---|---|---|---|');
        const errs = [];
        (c.A.testResults || []).forEach(r => {
            const t = tcById[r.testCaseId];
            const order = t ? (t.order || '?') : '?';
            if (!t || t.isHidden) { P('| ที่ ' + order + ' | ซ่อน | — | — | **' + (r.passed ? 'ผ่าน' : 'ไม่ผ่าน') + '** |'); return; }
            let act = showNl(r.actualOutput);
            if (!act) act = r.errorLog ? '(ไม่มีผลลัพธ์ — คอมไพล์ไม่ผ่าน)' : '(ว่าง)';
            P('| ที่ ' + order + ' | แสดงผลได้ | `' + (showNl(t.input) || '(ไม่มีข้อมูลเข้า)') + '` | `' +
                showNl(t.expectedOutput) + '` | `' + act + '` ' + (r.passed ? '(ผ่าน)' : '(ไม่ผ่าน)') + ' |');
            if (r.errorLog) errs.push(r.errorLog);
        });
        P('');
        if (errs.length) {
            P('**ข้อความจากคอมไพเลอร์**');
            P('');
            P(fence([...new Set(errs)][0], 'text'));
            P('');
        }

        P('### 4. ข้อความคำใบ้จริงระหว่างสองครั้งที่ส่ง');
        P('');
        P('| ลำดับ | ระดับ | เวลา | แหล่งข้อมูล | ใช้คำใบ้สำรองในเครื่อง |');
        P('|---|---|---|---|---|');
        c.coachHints.forEach((h, i) => P('| ' + (i + 1) + ' | ' + h.level + ' | ' + th(h.at) +
            ' | `coachInteractions` | ' + (h.local ? 'ใช่' : 'ไม่') + ' |'));
        c.usageHints.forEach(h => P('| — | ' + h.level + ' | ' + th(h.at) + ' | `usageEvents` | — |'));
        P('');
        c.coachHints.forEach(h => {
            P('#### คำใบ้ระดับ ' + h.level + ' · ' + th(h.at));
            P('');
            P(fence((h.response || '(ไม่มีข้อความ)').trim(), 'text'));
            P('');
        });

        P('### 5. ผลการตรวจข้อมูลส่วนตัวในโค้ด');
        P('');
        if (!hitsA.length && !hitsB.length) {
            P('ตรวจแล้ว **ไม่พบ** ชื่อจริง เลขประจำตัว เลขบัตรประชาชน อีเมล หรือเบอร์โทรศัพท์ในโค้ดทั้งสองฉบับ ' +
                'จึงแสดงโค้ดตามต้นฉบับทุกตัวอักษร');
        } else {
            P('พบข้อมูลที่อาจระบุตัวบุคคล และได้แทนด้วย `[ปกปิด]` ในโค้ดข้างต้นแล้ว: ' +
                [...new Set([...hitsA, ...hitsB])].join(' · '));
        }
        P('');
    });
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'SAMPLE_WORK_L34.md'), R.join('\n') + '\n', 'utf8');
console.log('ตรวจคู่ "ไม่ผ่าน → ผ่าน 100%" ทั้งหมด ' + nPairsChecked + ' คู่ · ตรงเงื่อนไข ' + cands.length + ' คู่');
picked.forEach(c => console.log('  เลือก ' + c.s.scode + ' ' + codeOf(c.a.title) + ' ครั้งที่ ' + c.iA + '→' + c.iB +
    ' ระดับ [' + c.coachHints.map(h => h.level).join(',') + '] ห่าง ' + Math.round(c.gapSec / 60) + ' นาที'));
console.log('เขียน docs/report-exports-2569-09/SAMPLE_WORK_L34.md');

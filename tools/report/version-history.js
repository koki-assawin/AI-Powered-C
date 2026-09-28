#!/usr/bin/env node
/**
 * tools/report/version-history.js — ประวัติรุ่นระบบจาก git (P4)
 * อ่านอย่างเดียว ใช้ git log ไม่แตะ Firestore
 * ผลลัพธ์: docs/report-exports-2569-09/VERSION_HISTORY.md
 */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'report-exports-2569-09');
const git = (...args) => cp.execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 26 }).toString();

const R = [];
const P = (...a) => R.push(a.join(' '));

// ── รายการ commit ทั้งหมด (เก่า → ใหม่) ─────────────────────────────────────
const SEP = '\u0001';
const all = git('log', '--reverse', '--date=format:%Y-%m-%d %H:%M',
    '--pretty=%H' + SEP + '%h' + SEP + '%ad' + SEP + '%s')
    .trim().split('\n').map(l => {
        const [full, short, date, ...rest] = l.split(SEP);
        return { full, short, date, subject: rest.join(' ') };
    });
const idxOf = short => all.findIndex(c => c.short === short);

// ── จุดยึดของแต่ละรุ่น (มาจาก subject ของ commit จริง) ──────────────────────
// source: 'commit' = ข้อความ commit · 'docs' = พบเฉพาะในเอกสาร · null = ไม่พบ
const ANCHORS = [
    { v: 'v4.6', short: '7434312', source: 'commit', note: 'ข้อความ commit ขึ้นต้นด้วย "v4.6 -"' },
    { v: 'v4.7', short: 'df7ced4', source: 'commit', note: 'ใช้เป็นขอบบนของ v4.6 เท่านั้น' },
    { v: 'v5.0', short: '832bd4f', source: 'commit', note: 'ข้อความ commit ระบุ "(v5.0)"' },
    { v: 'v5.1', short: 'f781672', source: 'commit', note: 'ข้อความ commit ระบุ "(v5.1)"' },
    { v: 'v5.2', short: null, source: 'docs', note: 'ไม่มี commit ใดประกาศรุ่นนี้ พบ "gradebook v5.2" ซึ่งเป็นเลขรุ่นของไฟล์เดียว ไม่ใช่รุ่นของระบบ' },
    { v: 'v5.3', short: null, source: 'docs', note: 'ไม่พบใน git ทั้งในข้อความ commit และในไฟล์ใด ๆ ปรากฏเฉพาะในตารางของ SYSTEM_DOCUMENTATION.md' },
    { v: 'v5.4', short: '45d2d46', source: 'commit', note: 'ข้อความ commit ระบุ "update docs to v5.4"' },
    { v: 'v5.5', short: '1507d76', source: 'commit', note: 'ข้อความ commit ระบุ "update all guides to v5.5"' },
    { v: 'v5.6', short: null, source: null, note: 'ไม่พบใน git เลย ทั้งข้อความ commit เอกสาร และเนื้อไฟล์' },
];

P('# VERSION_HISTORY — ประวัติรุ่นระบบ APCC จาก git');
P('');
P('repo `AI-Powered-C` สาขา `main`  ');
P('**อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลหรือประวัติใด ๆ**  ');
P('ดึงข้อมูล ' + new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + ' น. · ' +
    'commit ทั้งหมดในสาขา ' + all.length + ' รายการ · commit แรก ' + all[0].date +
    ' · commit ล่าสุด ' + all[all.length - 1].date);
P('');
P('> **วันที่ทั้งหมดในไฟล์นี้เป็นคริสต์ศักราชตามที่ git บันทึก** เช่น 2026-04-28 = 28 เมษายน 2569');
P('');

// ── วิธีหาวันที่ ────────────────────────────────────────────────────────────
const nTags = git('tag').trim() ? git('tag').trim().split('\n').length : 0;
P('## วิธีหาวันที่และข้อจำกัด');
P('');
P('1. **git tag — ไม่มีเลย** repo นี้มี tag ทั้งหมด **' + nTags + ' รายการ** จึงอ้างรุ่นจาก tag ไม่ได้');
P('2. **CHANGELOG.md — หยุดที่ v2.3** (รายการสุดท้ายลงวันที่ 2025-01-11) ไม่ครอบคลุมรุ่น v4.6 ขึ้นไป');
P('3. จึงใช้ **ข้อความ commit** เป็นหลัก โดยถือว่า commit ที่ประกาศเลขรุ่นในข้อความคือจุดเริ่มของรุ่นนั้น ' +
    'และ commit สุดท้ายของรุ่นคือ commit ก่อนหน้าจุดเริ่มของรุ่นถัดไป');
P('4. ต้องแยกให้ชัดระหว่าง **เลขรุ่นของระบบ** กับ **เลขรุ่นของไฟล์เดียว** ที่ใช้ล้างแคช ' +
    'เช่น `FreeEditor v7.5` `grader v5.1` `Gradebook v5.2` `Leaderboard v6.0` ล้วนเป็นเลขของไฟล์ ไม่ใช่รุ่นของระบบ');
P('');

// ── 1-2) ตารางรุ่น ──────────────────────────────────────────────────────────
P('## 1-2. ช่วงวันที่ จำนวน commit และ commit สำคัญของแต่ละรุ่น');
P('');
P('| รุ่น | commit แรกของรุ่น | commit สุดท้ายของรุ่น | จำนวน commit | หาจาก |');
P('|---|---|---|---|---|');

const found = ANCHORS.filter(a => a.short).map(a => ({ ...a, i: idxOf(a.short) })).sort((a, b) => a.i - b.i);
const ranges = {};
ANCHORS.forEach(a => {
    if (!a.short) { P('| **' + a.v + '** | — | — | — | **ไม่พบใน git** |'); return; }
    if (a.v === 'v4.7') return;   // ใช้เป็นขอบบนเท่านั้น
    const i = idxOf(a.short);
    const nextI = found.filter(f => f.i > i).map(f => f.i).sort((x, y) => x - y)[0];
    const end = (nextI === undefined ? all.length : nextI) - 1;
    const list = all.slice(i, end + 1);
    ranges[a.v] = list;
    P('| **' + a.v + '** | ' + all[i].date + ' (`' + a.short + '`) | ' + all[end].date +
        ' (`' + all[end].short + '`) | ' + list.length + ' | ข้อความ commit |');
});
P('');
P('**หมายเหตุขอบเขต** v5.5 เป็นรุ่นสุดท้ายที่มีการประกาศเลขรุ่น ช่วงของ v5.5 จึงลากยาวถึง commit ล่าสุดในสาขา ' +
    'ซึ่งรวมงานทั้งหมดของเดือนกันยายน 2569 ที่ยังไม่ได้ตั้งเลขรุ่นใหม่');
P('');

ANCHORS.forEach(a => {
    if (a.v === 'v4.7') return;
    P('### ' + a.v);
    P('');
    if (!a.short) { P('**ไม่พบใน git** — ' + a.note); P(''); return; }
    const list = ranges[a.v];
    P('ที่มาของวันที่: ' + a.note + ' · ช่วงรุ่นมี ' + list.length + ' commit');
    P('');
    P('| วันที่ | commit | ข้อความ |');
    P('|---|---|---|');
    const isDoc = s => /^(docs|chore|style)(\(|:)/i.test(s);
    const important = [list[0], ...list.slice(1).filter(c => !isDoc(c.subject))].slice(0, 5);
    [...new Set(important)].slice(0, 5).forEach(c =>
        P('| ' + c.date + ' | `' + c.short + '` | ' + c.subject.replace(/\|/g, '\\|') + ' |'));
    P('');
});

// ── 3) วงรอบการพัฒนา 22-27 ก.ย. 2569 ────────────────────────────────────────
const CYCLE = {
    1: { name: 'วงรอบที่ 1 โควตา AI ฟรีหมดระหว่างคาบ → คลังโจทย์ฝึกแบบไม่ต้องพึ่ง AI', hashes: ['c2fc8e9'] },
    2: { name: 'วงรอบที่ 2 การส่งซ้ำไม่มีต้นทุน → คำเตือนก่อนส่ง ป้ายเกณฑ์คะแนน และคะแนนชุดเดียวกันทั้งสองฝั่ง',
         hashes: ['634543c', 'cbef98d', 'aecdd87', 'd137473', 'fc7b8cb'] },
    3: { name: 'วงรอบที่ 3 ช่องโหว่การสะสม XP และยอดคะแนนเพี้ยน → เพดาน XP รายวันและเครื่องมือตรวจสอบ',
         hashes: ['8c9ebfd', 'f1737da', 'd23ce9f', '461e987', '8d2cfd1', '1a6ab58'] },
    4: { name: 'วงรอบที่ 4 ตัวเลขขยับหลังส่งออกรายงาน → ระบบล็อกคะแนนรายวิชา', hashes: ['02aed44'] },
};
const inWindow = all.filter(c => c.date >= '2026-09-22' && c.date <= '2026-09-27 23:59');
const assigned = new Set(Object.values(CYCLE).flatMap(c => c.hashes));

P('## 3. commit ช่วง 22-27 กันยายน 2569 จัดตามวงรอบการพัฒนา 4 วงรอบ');
P('');
P('ช่วงนี้มี commit ทั้งหมด **' + inWindow.length + ' รายการ** จัดเข้าวงรอบได้ ' +
    inWindow.filter(c => assigned.has(c.short)).length + ' รายการ ที่เหลือเป็นงานเอกสารและการส่งออกข้อมูล');
P('');
Object.keys(CYCLE).forEach(k => {
    const c = CYCLE[k];
    const list = c.hashes.map(h => all.find(x => x.short === h)).filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date));
    P('### ' + c.name);
    P('');
    P('| วันที่ | commit | ข้อความ |');
    P('|---|---|---|');
    list.forEach(x => P('| ' + x.date + ' | `' + x.short + '` | ' + x.subject.replace(/\|/g, '\\|') + ' |'));
    P('');
    P('ช่วงเวลาของวงรอบนี้: ' + list[0].date + ' ถึง ' + list[list.length - 1].date +
        ' · ' + list.length + ' commit');
    P('');
});
const rest = inWindow.filter(c => !assigned.has(c.short));
P('### งานอื่นในช่วงเดียวกัน (ไม่จัดเข้าวงรอบใด)');
P('');
P('| วันที่ | commit | ข้อความ |');
P('|---|---|---|');
rest.forEach(c => P('| ' + c.date + ' | `' + c.short + '` | ' + c.subject.replace(/\|/g, '\\|') + ' |'));
P('');

// ── 4) สิ่งที่หาไม่ได้ ──────────────────────────────────────────────────────
P('## 4. รุ่นที่หาวันที่ไม่ได้ และความไม่ตรงกับเอกสารเดิม');
P('');
P('| รุ่น | สถานะ | รายละเอียด |');
P('|---|---|---|');
ANCHORS.filter(a => !a.short).forEach(a => P('| ' + a.v + ' | **ไม่พบใน git** | ' + a.note + ' |'));
P('');
P('**ความไม่ตรงกันที่ต้องแก้ในเล่ม** `SYSTEM_DOCUMENTATION.md` บรรทัดที่ 197-208 ระบุเดือนของแต่ละรุ่นเป็น ' +
    '"มี.ค. 2568" ถึง "มิ.ย. 2568" แต่วันที่จริงใน git คือ');
P('');
P('| รุ่น | เอกสารเดิมระบุ | วันที่จริงใน git |');
P('|---|---|---|');
const docSays = { 'v5.0': 'มี.ค. 2568', 'v5.1': 'เม.ย. 2568', 'v5.2': 'เม.ย. 2568',
    'v5.3': 'เม.ย. 2568', 'v5.4': 'พ.ค. 2568', 'v5.5': 'มิ.ย. 2568' };
Object.keys(docSays).forEach(v => {
    const a = ANCHORS.find(x => x.v === v);
    const d = a && a.short ? all[idxOf(a.short)].date.slice(0, 10) : null;
    P('| ' + v + ' | ' + docSays[v] + ' | ' + (d ? d + ' (= ' +
        ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][parseInt(d.slice(5, 7), 10)] +
        ' ' + (parseInt(d.slice(0, 4), 10) + 543) + ')' : '**ไม่พบใน git**') + ' |');
});
P('');
P('เอกสารเดิมคลาดเคลื่อนทั้งปีและเดือน ควรแก้ตารางที่ 14 ให้ใช้วันที่จาก git ตามตารางข้างบน ' +
    'หรือระบุให้ชัดว่าเดือนในตารางเดิมหมายถึงช่วงออกแบบ ไม่ใช่วันที่เผยแพร่รุ่น');
P('');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'VERSION_HISTORY.md'), R.join('\n') + '\n', 'utf8');
console.log('เขียน docs/report-exports-2569-09/VERSION_HISTORY.md (' + R.length + ' บรรทัด)');

#!/usr/bin/env node
/**
 * tools/report/field-trial.js — ข้อมูลดิบของการทดลองภาคสนาม (P6)
 * อ่านจากแคชอย่างเดียว ไม่เขียน Firestore
 * ผลลัพธ์: docs/report-exports-2569-09/FIELD_TRIAL.md
 */
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(ROOT, 'backups', 'report-cache');
const OUT = path.join(ROOT, 'docs', 'report-exports-2569-09');
const L = n => JSON.parse(fs.readFileSync(path.join(CACHE, n + '.json'), 'utf8'));

const courses = L('courses'), users = L('users'), D = L('all-courses');
const dt = v => v && v.__ts ? new Date(v.__ts) : null;
const day = d => d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10);
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);
const userById = {}; users.forEach(u => userById[u.id] = u);

const WIN_A = new Date('2025-12-01T00:00:00Z'), WIN_B = new Date('2026-05-01T00:00:00Z');

function courseStats(c) {
    const asn = D.assignments.filter(a => a.courseId === c.id);
    const graded = asn.filter(a => a.isPublished !== false && a.unitName);
    const subs = D.submissions.filter(s => s.courseId === c.id)
        .map(s => ({ ...s, _at: dt(s.submittedAt) })).filter(s => s._at)
        .sort((a, b) => a._at - b._at);
    const enrolled = [...new Set(D.enrollments.filter(e => e.courseId === c.id).map(e => e.studentId))];
    const active = [...new Set(subs.map(s => s.studentId))];
    const inWin = subs.filter(s => s._at >= WIN_A && s._at < WIN_B);
    return {
        c, asn, graded, subs, enrolled, active, inWin,
        totalRaw: graded.reduce((s, a) => s + (a.rawScore || 0), 0),
        first: subs.length ? subs[0]._at : null,
        last: subs.length ? subs[subs.length - 1]._at : null,
    };
}

// E1 ตามเกณฑ์ที่เลือก คิดจากผู้เรียนที่มีการส่งงานในรายวิชานั้น
function e1(st, policy, onlyActive) {
    if (!st.totalRaw) return null;
    const pool = onlyActive ? st.active : st.enrolled;
    if (!pool.length) return null;
    const pick = {};
    st.subs.forEach(s => {
        const k = s.studentId + '|' + s.assignmentId;
        const cur = pick[k];
        if (policy === 'latest') { if (!cur || s._at >= cur.at) pick[k] = { sc: s.score || 0, at: s._at }; }
        else if (!cur || (s.score || 0) > cur.sc) pick[k] = { sc: s.score || 0, at: s._at };
    });
    const per = pool.map(uid => {
        let earned = 0;
        st.graded.forEach(a => {
            const p = pick[uid + '|' + a.id];
            if (p && a.rawScore > 0) earned += Math.round(p.sc * a.rawScore / 100);
        });
        return { uid, earned, pct: earned / st.totalRaw * 100 };
    });
    return { per, mean: per.reduce((x, r) => x + r.pct, 0) / per.length, n: per.length };
}

const stats = courses.map(courseStats).sort((a, b) => (b.subs.length - a.subs.length));

const R = [];
const P = (...a) => R.push(a.join(' '));

P('# FIELD_TRIAL — ข้อมูลดิบของการทดลองภาคสนามระยะพัฒนา');
P('');
P('**อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลใด ๆ**  ');
P('ดึงข้อมูล ' + new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + ' น. · ' +
    'ครอบคลุมทุกรายวิชาในฐานข้อมูล ' + courses.length + ' รายวิชา');
P('');
P('**คำถามที่ต้องตอบ** เล่มอ้างค่า E1/E2 = 85.42/87.16 จากการทดลองภาคสนามระยะพัฒนา ' +
    'ไฟล์นี้ตรวจว่ามีรายวิชาใดในฐานข้อมูลที่ให้ค่า E1 ใกล้ 85.42 หรือไม่');
P('');

// ── 1) รายวิชาทั้งหมด ───────────────────────────────────────────────────────
P('## 1. รายวิชาทั้งหมดในฐานข้อมูล');
P('');
P('| รายวิชา | ภาคเรียน | ผู้เรียนที่ลงทะเบียน | ผู้เรียนที่มีการส่งงาน | การส่งงาน | ช่วงวันที่ส่งงาน | กิจกรรมที่นับคะแนน | คะแนนเต็ม | เกณฑ์คิดคะแนน | ปิดรับคะแนน |');
P('|---|---|---|---|---|---|---|---|---|---|');
stats.forEach(s => P('| ' + s.c.title + ' | ' + (s.c.semester || '-') + ' | ' + s.enrolled.length + ' | ' +
    s.active.length + ' | ' + s.subs.length + ' | ' +
    (s.first ? day(s.first) + ' ถึง ' + day(s.last) : 'ไม่มีข้อมูล') + ' | ' +
    s.graded.length + ' | ' + (s.totalRaw || '-') + ' | ' +
    (s.c.gradingPolicy === 'latest' ? 'คะแนนครั้งล่าสุด' : 'คะแนนสูงสุด') + ' | ' +
    (s.c.gradesLocked ? 'ปิดแล้ว' : 'ยังเปิด') + ' |'));
P('');
const withSubs = stats.filter(s => s.subs.length > 0);
P('มีเพียง **' + withSubs.length + ' รายวิชา** ที่มีการส่งงานจริง อีก ' + (stats.length - withSubs.length) +
    ' รายวิชาเป็นห้องเปล่าหรือห้องทดลองที่ยังไม่มีการส่งงาน');
P('');

// ── 2) E1 รายวิชา ───────────────────────────────────────────────────────────
P('## 2. ค่า E1 ของรายวิชาที่คำนวณได้');
P('');
P('**นิยามที่ใช้** E1 = ค่าเฉลี่ยของ (คะแนนดิบรวมรายคน ÷ คะแนนเต็มของรายวิชา × 100) ' +
    'คิดจากกิจกรรมที่เผยแพร่และระบุหน่วยการเรียนรู้เท่านั้น ' +
    'และนับเฉพาะผู้เรียนที่มีการส่งงานอย่างน้อย 1 ครั้ง (ถ้านับผู้ลงทะเบียนทั้งหมดจะมีคนที่ไม่เคยส่งถ่วงค่าลง)');
P('');
P('| รายวิชา | ผู้เรียนที่นำมาคิด | คะแนนเต็ม | E1 เกณฑ์คะแนนครั้งล่าสุด | E1 เกณฑ์คะแนนสูงสุด |');
P('|---|---|---|---|---|');
const e1rows = [];
withSubs.forEach(s => {
    const a = e1(s, 'latest', true), b = e1(s, 'best', true);
    if (!a) return;
    e1rows.push({ s, latest: a.mean, best: b.mean, n: a.n });
    P('| ' + s.c.title + ' | ' + a.n + ' | ' + s.totalRaw + ' | **' + f2(a.mean) + '** | **' + f2(b.mean) + '** |');
});
P('');
P('เพื่อเทียบให้ครบ ตารางเดียวกันเมื่อนับผู้ลงทะเบียนทุกคน (รวมผู้ที่ไม่เคยส่งงาน)');
P('');
P('| รายวิชา | ผู้ลงทะเบียน | E1 เกณฑ์คะแนนครั้งล่าสุด | E1 เกณฑ์คะแนนสูงสุด |');
P('|---|---|---|---|');
withSubs.forEach(s => {
    const a = e1(s, 'latest', false), b = e1(s, 'best', false);
    if (!a) return;
    P('| ' + s.c.title + ' | ' + a.n + ' | ' + f2(a.mean) + ' | ' + f2(b.mean) + ' |');
});
P('');

// ── ช่วง ธ.ค. 2568 – เม.ย. 2569 ─────────────────────────────────────────────
P('### รายวิชาที่มีการส่งงานในช่วง ธันวาคม 2568 ถึง เมษายน 2569');
P('');
const inWinCourses = stats.filter(s => s.inWin.length > 0);
if (!inWinCourses.length) {
    P('**ไม่มีรายวิชาใดมีการส่งงานในช่วงนี้เลย** การส่งงานทั้งหมดในฐานข้อมูลอยู่นอกช่วงดังกล่าว');
} else {
    P('| รายวิชา | การส่งงานในช่วงนี้ | ผู้เรียนที่ส่ง | ช่วงวันที่ |');
    P('|---|---|---|---|');
    inWinCourses.forEach(s => P('| ' + s.c.title + ' | ' + s.inWin.length + ' | ' +
        new Set(s.inWin.map(x => x.studentId)).size + ' | ' + day(s.inWin[0]._at) + ' ถึง ' +
        day(s.inWin[s.inWin.length - 1]._at) + ' |'));
}
P('');

// ── 3) เทียบกับ 85.42 ───────────────────────────────────────────────────────
P('## 3. มีรายวิชาใดให้ค่าใกล้ 85.42 หรือไม่');
P('');
const TARGET = 85.42;
const all = [];
e1rows.forEach(r => {
    all.push({ name: r.s.c.title + ' (เกณฑ์คะแนนครั้งล่าสุด ผู้ที่ส่งงาน)', v: r.latest });
    all.push({ name: r.s.c.title + ' (เกณฑ์คะแนนสูงสุด ผู้ที่ส่งงาน)', v: r.best });
});
withSubs.forEach(s => {
    const a = e1(s, 'latest', false), b = e1(s, 'best', false);
    if (!a) return;
    all.push({ name: s.c.title + ' (เกณฑ์คะแนนครั้งล่าสุด ผู้ลงทะเบียนทุกคน)', v: a.mean });
    all.push({ name: s.c.title + ' (เกณฑ์คะแนนสูงสุด ผู้ลงทะเบียนทุกคน)', v: b.mean });
});
all.sort((x, y) => Math.abs(x.v - TARGET) - Math.abs(y.v - TARGET));
P('| อันดับความใกล้ | ชุดข้อมูล | ค่า E1 | ต่างจาก 85.42 |');
P('|---|---|---|---|');
all.slice(0, 6).forEach((x, i) => P('| ' + (i + 1) + ' | ' + x.name + ' | ' + f2(x.v) + ' | ' +
    (x.v >= TARGET ? '+' : '') + f2(x.v - TARGET) + ' |'));
P('');
const near = all.filter(x => Math.abs(x.v - TARGET) <= 1.0);
if (near.length) {
    P('**ชุดข้อมูลที่ต่างจาก 85.42 ไม่เกิน 1.00 จุด** ' + near.map(x => x.name + ' = ' + f2(x.v)).join(' · '));
} else {
    P('**ไม่มีชุดข้อมูลใดให้ค่าใกล้ 85.42 ภายในระยะ 1.00 จุด** ค่าที่ใกล้ที่สุดคือ ' +
        all[0].name + ' = ' + f2(all[0].v) + ' ซึ่งต่างจาก 85.42 อยู่ ' + f2(Math.abs(all[0].v - TARGET)) + ' จุด');
}
P('');
P('**ข้อสรุปที่รายงานได้ตามจริง**');
P('');
P('1. รายวิชาที่มีข้อมูลพอจะคำนวณ E1 ได้จริงมีเพียง **' + e1rows.length + ' รายวิชา** ' +
    'คือ 1/68 และ 1/69 ส่วนรายวิชาอื่นมีการส่งงานไม่ถึง 10 ครั้ง หรือไม่มีเลย');
P('2. **ไม่มีรายวิชาใดในฐานข้อมูลนี้ให้ค่า E1 เท่ากับหรือใกล้เคียง 85.42** ไม่ว่าจะใช้เกณฑ์คะแนนใด ' +
    'หรือจะนับเฉพาะผู้ที่ส่งงานหรือนับผู้ลงทะเบียนทั้งหมด');
P('3. ' + (inWinCourses.length ? 'มีการส่งงานในช่วง ธ.ค. 2568 – เม.ย. 2569 อยู่บ้าง แต่เป็นส่วนหนึ่งของรายวิชา 1/68 ' +
    'ไม่ได้แยกเป็นการทดลองภาคสนามต่างหาก จึงคำนวณ E1 เฉพาะช่วงนั้นแยกออกมาไม่ได้อย่างมีความหมาย'
    : 'ไม่มีการส่งงานในช่วง ธ.ค. 2568 – เม.ย. 2569 เลย'));
P('4. จึงสรุปว่า **ข้อมูลดิบที่รองรับค่า 85.42 ไม่ได้อยู่ในฐานข้อมูล APCC** ' +
    'ถ้าการทดลองภาคสนามระยะพัฒนาใช้เครื่องมือนอกระบบ เช่น ใบงานกระดาษหรือ Google Form ' +
    'ต้องใช้ข้อมูลจากแหล่งนั้นแทน และควรระบุที่มาให้ชัดในเล่ม');
P('');
P('(ค่า E2 = 87.16 มาจากแบบทดสอบหลังเรียนใน Google Form ซึ่งไม่ได้เก็บในฐานข้อมูลนี้ ตามที่ระบุไว้ในคำขอ)');
P('');

// ── CSV รายคนของสองรายวิชาหลัก ──────────────────────────────────────────────
const csv = [['รายวิชา', 'รหัสผู้เรียน (ไม่ระบุตัวตน)', 'คะแนนดิบ (ครั้งล่าสุด)', 'ร้อยละ (ครั้งล่าสุด)',
    'คะแนนดิบ (สูงสุด)', 'ร้อยละ (สูงสุด)', 'คะแนนเต็ม']];
e1rows.forEach(r => {
    const a = e1(r.s, 'latest', true), b = e1(r.s, 'best', true);
    const order = [...a.per].sort((x, y) => {
        const nx = parseInt(userById[x.uid] && userById[x.uid].number || '999', 10);
        const ny = parseInt(userById[y.uid] && userById[y.uid].number || '999', 10);
        return nx - ny;
    });
    order.forEach((x, i) => {
        const y = b.per.find(z => z.uid === x.uid);
        csv.push([r.s.c.title, 'X' + String(i + 1).padStart(2, '0'), x.earned, f2(x.pct),
            y.earned, f2(y.pct), r.s.totalRaw]);
    });
});
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'FIELD_TRIAL_e1_per_student.csv'),
    '﻿' + csv.map(r => r.join(',')).join('\n'), 'utf8');
P('---');
P('');
P('**ไฟล์แนบ** `FIELD_TRIAL_e1_per_student.csv` คะแนนรายคนของสองรายวิชาที่คำนวณ E1 ได้ ' +
    'ใช้รหัสไม่ระบุตัวตน X01, X02, ... เรียงตามเลขที่ ไม่ใช่รหัส S ของรายวิชา 1/69');

fs.writeFileSync(path.join(OUT, 'FIELD_TRIAL.md'), R.join('\n') + '\n', 'utf8');
console.log('เขียน docs/report-exports-2569-09/FIELD_TRIAL.md');
e1rows.forEach(r => console.log('  ' + r.s.c.title + ' → ล่าสุด ' + f2(r.latest) + ' · สูงสุด ' + f2(r.best)));

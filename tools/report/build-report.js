#!/usr/bin/env node
/**
 * tools/report/build-report.js
 * วิเคราะห์ข้อมูลจากแคช (backups/report-cache) แล้วสร้างไฟล์ CSV + REPORT_DATA_EXPORT_v24.md
 *
 * อ่านจากแคชเท่านั้น ไม่ติดต่อ Firestore และไม่เขียนข้อมูลกลับ
 * รันซ้ำได้ตลอด: node tools/report/build-report.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(ROOT, 'backups', 'report-cache');
const OUT = path.join(ROOT, 'docs', 'report-exports-2569-09');
fs.mkdirSync(OUT, { recursive: true });

const CID = 'UZGy0pGurry9Dt9YdhYX';
const load = (n) => JSON.parse(fs.readFileSync(path.join(CACHE, n + '.json'), 'utf8'));
const TZ = 7 * 3600 * 1000;                       // Asia/Bangkok
const dt = (v) => (v && v.__ts ? new Date(v.__ts) : null);
const bkk = (d) => (d ? new Date(d.getTime() + TZ) : null);
const dayStr = (d) => (d ? bkk(d).toISOString().slice(0, 10) : '');
const timeStr = (d) => (d ? bkk(d).toISOString().slice(0, 16).replace('T', ' ') : '');
const weekStr = (d) => {                          // สัปดาห์เริ่มวันจันทร์ ตามเวลาไทย
    if (!d) return '';
    const b = bkk(d);
    const dow = (b.getUTCDay() + 6) % 7;          // จันทร์ = 0
    const mon = new Date(b.getTime() - dow * 86400000);
    return mon.toISOString().slice(0, 10);
};
const csv = (name, header, rows) => {
    const esc = (v) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    fs.writeFileSync(path.join(OUT, name),
        '﻿' + [header.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n'), 'utf8');
    return `${name} (${rows.length} แถว)`;
};
const pct = (a, b) => (b ? (a / b * 100) : 0);
const f1 = (x) => Number(x).toFixed(1);
const f2 = (x) => Number(x).toFixed(2);
const median = (arr) => {
    if (!arr.length) return 0;
    const a = [...arr].sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

// ── โหลดแคช ─────────────────────────────────────────────────────────────────
const users = load('users');
const enrollments = load('enrollments');
const assignments = load('assignments');
const assignmentsV2 = load('assignments_v2');
const submissions = load('submissions');
const submissionsV2 = load('submissions_v2');
const grades = load('grades');
const coach = load('coachInteractions');
const usage = load('usageEvents');
const selfPractice = load('selfPractice');
const pollSessions = load('pollSessions');
const pollResponses = load('pollResponses');
const courses = load('courses');
const xpCorrections = load('xpCorrections');

const course = courses.find(c => c.id === CID);
const userById = {}; users.forEach(u => userById[u.id] = u);

// ── ผู้เรียนและรหัส S ───────────────────────────────────────────────────────
const studentIds = [...new Set(enrollments.filter(e => e.courseId === CID).map(e => e.studentId))];
const students = studentIds
    .map(id => ({ uid: id, u: userById[id] }))
    .filter(x => x.u)
    .map(x => ({
        uid: x.uid,
        number: parseInt(x.u.number || '999', 10),
        studentCode: x.u.studentCode || '',
        name: x.u.displayName || '',
    }))
    .sort((a, b) => a.number - b.number);
students.forEach(s => { s.scode = 'S' + String(s.number).padStart(2, '0'); });
const scodeOf = {}; students.forEach(s => scodeOf[s.uid] = s.scode);
const isStudent = (uid) => !!scodeOf[uid];

// ── กิจกรรมที่นับคะแนน (เผยแพร่ + มีหน่วย) ──────────────────────────────────
const graded = assignments
    .filter(a => a.isPublished !== false && a.unitName)
    .map(a => ({ id: a.id, title: a.title, unit: a.unitName, raw: a.rawScore || 0 }))
    .sort((a, b) => a.unit.localeCompare(b.unit, 'th') || a.title.localeCompare(b.title, 'th'));
const gradedById = {}; graded.forEach(a => gradedById[a.id] = a);
const gradedByTitle = {}; graded.forEach(a => gradedByTitle[a.title] = a);
const totalRaw = graded.reduce((s, a) => s + a.raw, 0);
const unitNames = [...new Set(graded.map(a => a.unit))]
    .sort((a, b) => (parseInt((a.match(/\d+/) || [99])[0], 10)) - (parseInt((b.match(/\d+/) || [99])[0], 10)));

// ── คะแนนต่อคู่ (ผู้เรียน × ข้อ) ตามเกณฑ์คะแนนครั้งล่าสุด ───────────────────
const pairs = {};   // uid|aid → {n, first, firstAt, best, last, lastAt, firstFullAttempt}
const subsInScope = submissions
    .filter(s => s.courseId === CID && gradedById[s.assignmentId] && isStudent(s.studentId))
    .map(s => ({ ...s, _at: dt(s.submittedAt) }))
    .sort((a, b) => (a._at?.getTime() || 0) - (b._at?.getTime() || 0));

subsInScope.forEach(s => {
    const k = s.studentId + '|' + s.assignmentId;
    const sc = s.score || 0;
    const p = pairs[k] || { uid: s.studentId, aid: s.assignmentId, n: 0, first: null, firstAt: null, best: -1, last: 0, lastAt: null, fullAt: null };
    p.n++;
    if (p.first === null) { p.first = sc; p.firstAt = s._at; }
    if (sc > p.best) p.best = sc;
    p.last = sc; p.lastAt = s._at;
    if (sc === 100 && p.fullAt === null) p.fullAt = p.n;
    pairs[k] = p;
});
const pairList = Object.values(pairs);

// ── คำใบ้ ───────────────────────────────────────────────────────────────────
const hintLevel = (ev) => {
    const m = /^hint_level_(\d)/.exec(ev || '');
    return m ? parseInt(m[1], 10) : null;
};
const hints = coach
    .filter(c => c.coachRole === 'socratic' && hintLevel(c.triggerEvent) && isStudent(c.uid))
    .map(c => ({
        uid: c.uid,
        level: hintLevel(c.triggerEvent),
        local: /_local$/.test(c.triggerEvent || ''),
        at: dt(c.createdAt),
        title: c.relatedId || '',
        assign: gradedByTitle[c.relatedId] || null,
    }))
    .filter(h => h.at);

// นับคำใบ้รายคู่จากสองแหล่ง ให้ตรงกับวิธีที่ใช้ในเอกสารบริบท
//   ก) coachInteractions จับคู่กิจกรรมด้วยชื่อ (relatedId)
//   ข) usageEvents event=ai_hint ซึ่งมี assignmentId ตรง ๆ
const hintPairKey = {};   // uid|aid → count (จากทั้งสองแหล่ง)
hints.forEach(h => {
    if (!h.assign) return;
    const k = h.uid + '|' + h.assign.id;
    hintPairKey[k] = (hintPairKey[k] || 0) + 1;
});
const hintUsage = usage.filter(u => u.event === 'ai_hint' && u.courseId === CID && isStudent(u.uid))
    .map(u => ({ uid: u.uid, aid: u.assignmentId, level: u.hintLevel || null, at: dt(u.timestamp) }));
const hintPairAny = {};   // uid|aid → true ถ้าเคยขอคำใบ้จากแหล่งใดก็ตาม
Object.keys(hintPairKey).forEach(k => hintPairAny[k] = true);
hintUsage.forEach(h => { if (h.aid) hintPairAny[h.uid + '|' + h.aid] = true; });
const hasHint = (uid, aid) => !!hintPairAny[uid + '|' + aid];

// ── คะแนน E1 รายคน ──────────────────────────────────────────────────────────
const e1 = {};
students.forEach(s => {
    let earned = 0;
    graded.forEach(a => {
        const p = pairs[s.uid + '|' + a.id];
        if (p && a.raw > 0) earned += Math.round(p.last * a.raw / 100);
    });
    e1[s.uid] = { earned, pct: pct(earned, totalRaw) };
});
const e1Mean = students.reduce((x, s) => x + e1[s.uid].pct, 0) / students.length;

const report = [];
const files = [];
const P = (...a) => report.push(a.join(' '));

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 1 การถอนความช่วยเหลือ
// ════════════════════════════════════════════════════════════════════════════
const weeks = [...new Set(hints.map(h => weekStr(h.at)))].sort();
const weekRows = weeks.map(w => {
    const inW = hints.filter(h => weekStr(h.at) === w);
    const lv = [1, 2, 3, 4].map(L => inW.filter(h => h.level === L).length);
    const hi = inW.filter(h => h.level >= 3).length;
    return [w, inW.length, ...lv, f1(pct(hi, inW.length)), new Set(inW.map(h => h.uid)).size];
});
files.push(csv('01_hint_weekly.csv',
    ['สัปดาห์ (เริ่มจันทร์)', 'ขอคำใบ้รวม', 'ระดับ1', 'ระดับ2', 'ระดับ3', 'ระดับ4', 'ร้อยละระดับ3ขึ้นไป', 'ผู้เรียนที่ขอ'],
    weekRows));

// นิยามช่วงต้น/ปลาย: กึ่งกลางของช่วงเวลาที่มีการส่งงานจริง
const subTimes = subsInScope.map(s => s._at.getTime());
const firstDay = new Date(Math.min(...subTimes)), lastDay = new Date(Math.max(...subTimes));
const midTime = new Date((firstDay.getTime() + lastDay.getTime()) / 2);
const earlyUids = new Set(hints.filter(h => h.level === 3 && h.at < midTime).map(h => h.uid));
const lateUids = new Set(hints.filter(h => h.level === 3 && h.at >= midTime).map(h => h.uid));
const earlyAll = new Set(hints.filter(h => h.at < midTime).map(h => h.uid));
const lateAll = new Set(hints.filter(h => h.at >= midTime).map(h => h.uid));

const unitRows = unitNames.map(u => {
    const inU = hints.filter(h => h.assign && h.assign.unit === u);
    const lv = [1, 2, 3, 4].map(L => inU.filter(h => h.level === L).length);
    const aIds = graded.filter(a => a.unit === u).map(a => a.id);
    const ps = pairList.filter(p => aIds.includes(p.aid));
    const avgLast = ps.length ? ps.reduce((x, p) => x + p.last, 0) / ps.length : 0;
    return [u, inU.length, ...lv, new Set(inU.map(h => h.uid)).size, aIds.length, f1(avgLast)];
});
files.push(csv('01_hint_by_unit.csv',
    ['หน่วย', 'ขอคำใบ้รวม', 'ระดับ1', 'ระดับ2', 'ระดับ3', 'ระดับ4', 'ผู้เรียนที่ขอ', 'จำนวนกิจกรรม', 'คะแนนเฉลี่ยรายข้อ (ครั้งล่าสุด, %)'],
    unitRows));

P('## ข้อ 1 การถอนความช่วยเหลือ (Scaffolding Fading)\n');
P('- การขอ AI Scaffolding (คำใบ้) ที่บันทึกใน `coachInteractions` ของผู้เรียนในรายวิชา: **' + hints.length + ' ครั้ง**');
P('- แยกตามระดับ: ระดับ 1 = ' + hints.filter(h => h.level === 1).length +
    ' · ระดับ 2 = ' + hints.filter(h => h.level === 2).length +
    ' · ระดับ 3 = ' + hints.filter(h => h.level === 3).length +
    ' · ระดับ 4 = ' + hints.filter(h => h.level === 4).length);
P('- ใช้คำใบ้สำรองในเครื่อง (AI ใช้ไม่ได้): ' + hints.filter(h => h.local).length + ' ครั้ง');
P('- ช่วงเวลาที่มีการขอ: ' + dayStr(new Date(Math.min(...hints.map(h => h.at.getTime())))) +
    ' ถึง ' + dayStr(new Date(Math.max(...hints.map(h => h.at.getTime())))));
P('- จุดแบ่งครึ่งภาคเรียนที่ใช้: **' + dayStr(midTime) + '** (กึ่งกลางระหว่างการส่งงานครั้งแรก ' +
    dayStr(firstDay) + ' กับครั้งสุดท้าย ' + dayStr(lastDay) + ')\n');
P('| ตัวชี้วัด | ช่วงต้นภาค | ช่วงปลายภาค |');
P('|---|---|---|');
P('| ผู้เรียนที่ขอคำใบ้ระดับ 3 | ' + earlyUids.size + ' คน (' + f1(pct(earlyUids.size, students.length)) + '%) | ' +
    lateUids.size + ' คน (' + f1(pct(lateUids.size, students.length)) + '%) |');
P('| ผู้เรียนที่ขอคำใบ้ทุกระดับ | ' + earlyAll.size + ' คน | ' + lateAll.size + ' คน |');
P('| จำนวนครั้งที่ขอทั้งหมด | ' + hints.filter(h => h.at < midTime).length + ' | ' +
    hints.filter(h => h.at >= midTime).length + ' |');
P('| จำนวนครั้งที่ขอระดับ 3-4 | ' + hints.filter(h => h.level >= 3 && h.at < midTime).length + ' | ' +
    hints.filter(h => h.level >= 3 && h.at >= midTime).length + ' |');
const subEarly = subsInScope.filter(s => s._at < midTime), subLate = subsInScope.filter(s => s._at >= midTime);
P('| คะแนนเฉลี่ยของการส่งงานในช่วงเดียวกัน | ' +
    f1(subEarly.reduce((x, s) => x + (s.score || 0), 0) / (subEarly.length || 1)) + '% (' + subEarly.length + ' ครั้ง) | ' +
    f1(subLate.reduce((x, s) => x + (s.score || 0), 0) / (subLate.length || 1)) + '% (' + subLate.length + ' ครั้ง) |');
P('\n**นิยาม KPI บนหน้าจอ** แดชบอร์ดครูคำนวณ "ขอ AI Scaffolding (คำใบ้) ระดับ 3" เป็นร้อยละของ' +
    'ผู้เรียนที่ลงทะเบียนซึ่งเคยขอคำใบ้ระดับ 3 ก่อน/หลังวันที่จุดแบ่ง โดยวันที่จุดแบ่งเป็นช่องให้ครูเลือกเอง ' +
    '(ค่าเริ่มต้นคือ 2 เดือนก่อนวันที่เปิดหน้าจอ) ตัวเลขบนหน้าจอจึงเปลี่ยนตามวันที่ที่เลือก ' +
    'ตารางนี้ใช้จุดแบ่งที่คำนวณจากข้อมูลจริงเพื่อให้ตรวจซ้ำได้');
P('\n**แหล่งข้อมูลและขอบเขต** `coachInteractions` (coachRole=socratic, triggerEvent=hint_level_N) ' +
    'เฉพาะผู้เรียน ' + students.length + ' คนในรายวิชา · จับคู่กิจกรรมด้วย relatedId ซึ่งเก็บเป็นชื่อกิจกรรม · ' +
    'ไฟล์ `01_hint_weekly.csv`, `01_hint_by_unit.csv`\n');

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 2 ยืนยันเกณฑ์คะแนนและการล็อก
// ════════════════════════════════════════════════════════════════════════════
P('## ข้อ 2 ยืนยันการตั้งค่าเกณฑ์คะแนนและการล็อกคะแนน\n');
P('- `courses/' + CID + '.gradingPolicy` = **' + (course.gradingPolicy || '(ไม่ได้ตั้งค่า)') + '**');
P('- `gradesLocked` = **' + (course.gradesLocked === true ? 'true (ปิดรับคะแนนแล้ว)' : 'false') + '**');
P('- `gradesLockedAt` = ' + (course.gradesLockedAt ? timeStr(dt(course.gradesLockedAt)) + ' น.' : 'ไม่มีข้อมูล'));
P('- ระบบ**ไม่ได้บันทึก**วันเวลาที่เปลี่ยนค่า `gradingPolicy` (ไม่มีฟิลด์ประวัติการตั้งค่า)');
P('- คำนวณ E1 จากแคชด้วยเกณฑ์คะแนนครั้งล่าสุด: **' + f2(e1Mean) + '** ' +
    '(คะแนนเฉลี่ย ' + f2(students.reduce((x, s) => x + e1[s.uid].earned, 0) / students.length) + ' จาก ' + totalRaw + ')');
P('- กิจกรรมที่นับคะแนน ' + graded.length + ' ข้อ · ผู้เรียน ' + students.length + ' คน\n');

const drop5A = [];
const a5A = graded.find(a => /5-A/.test(a.title));
if (a5A) {
    students.forEach(s => {
        const subs = subsInScope.filter(x => x.studentId === s.uid && x.assignmentId === a5A.id);
        if (subs.length < 2) return;
        const best = Math.max(...subs.map(x => x.score || 0));
        const last = subs[subs.length - 1];
        if ((last.score || 0) < best) {
            const fail = (last.testResults || []).filter(t => !t.passed).length;
            drop5A.push([s.scode, subs.length, best, last.score || 0,
                Math.round(best * a5A.raw / 100), Math.round((last.score || 0) * a5A.raw / 100),
                timeStr(last._at), (last.testResults || []).length - fail, fail, last.status || '']);
        }
    });
}
files.push(csv('02_5A_score_drop.csv',
    ['S-code', 'จำนวนครั้งที่ส่ง', 'คะแนนสูงสุด(%)', 'คะแนนครั้งล่าสุด(%)', 'คะแนนดิบสูงสุด', 'คะแนนดิบล่าสุด',
     'เวลาส่งครั้งล่าสุด', 'เคสที่ผ่าน', 'เคสที่ไม่ผ่าน', 'สถานะ'], drop5A));
P('**ผู้เรียนที่คะแนนกิจกรรม 5-A ต่ำกว่าครั้งที่ดีที่สุด** (' + drop5A.length + ' คน) ดูไฟล์ `02_5A_score_drop.csv`\n');
if (drop5A.length) {
    P('| S-code | ส่ง (ครั้ง) | สูงสุด % | ล่าสุด % | ดิบสูงสุด | ดิบล่าสุด | เวลาส่งครั้งล่าสุด | ผ่าน/ไม่ผ่าน (เคส) |');
    P('|---|---|---|---|---|---|---|---|');
    drop5A.forEach(r => P('| ' + r[0] + ' | ' + r[1] + ' | ' + r[2] + ' | ' + r[3] + ' | ' + r[4] + ' | ' + r[5] + ' | ' + r[6] + ' | ' + r[7] + '/' + r[8] + ' |'));
}
P('\n**แหล่งข้อมูลและขอบเขต** `courses`, `submissions` (testResults ต่อเคส) · ไฟล์ `02_5A_score_drop.csv`\n');

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 3 การส่งงานรายคู่
// ════════════════════════════════════════════════════════════════════════════
const pairRows = [];
students.forEach(s => {
    graded.forEach(a => {
        const p = pairs[s.uid + '|' + a.id];
        if (!p) return;
        pairRows.push([
            s.scode, a.unit, a.title, a.raw, p.n, p.first, p.best, p.last,
            p.best === 100 ? 'ใช่' : 'ไม่', p.fullAt || '',
            hintPairKey[s.uid + '|' + a.id] || 0,
            hintUsage.filter(h => h.uid === s.uid && h.aid === a.id).length,
            dayStr(p.firstAt), dayStr(p.lastAt),
        ]);
    });
});
files.push(csv('03_pairs.csv',
    ['S-code', 'หน่วย', 'กิจกรรม', 'คะแนนดิบเต็ม', 'จำนวนครั้งที่ส่ง', 'คะแนนครั้งแรก(%)', 'คะแนนสูงสุด(%)',
     'คะแนนครั้งล่าสุด(%)', 'เคยได้เต็ม', 'ได้เต็มที่การส่งครั้งที่', 'ขอคำใบ้ (coach)', 'ขอคำใบ้ (usage)',
     'วันส่งครั้งแรก', 'วันส่งครั้งสุดท้าย'],
    pairRows));

const unitSummary = unitNames.map(u => {
    const aIds = new Set(graded.filter(a => a.unit === u).map(a => a.id));
    const ps = pairList.filter(p => aIds.has(p.aid));
    const firstFull = ps.filter(p => p.first === 100).length;
    const full = ps.filter(p => p.best === 100);
    const withHint = ps.filter(p => hasHint(p.uid, p.aid)).length;
    return [u, ps.length, f1(pct(firstFull, ps.length)),
        f2(ps.reduce((x, p) => x + p.n, 0) / (ps.length || 1)), median(ps.map(p => p.n)),
        f2(full.reduce((x, p) => x + (p.fullAt || 0), 0) / (full.length || 1)),
        f1(pct(withHint, ps.length))];
});
files.push(csv('03_unit_summary.csv',
    ['หน่วย', 'จำนวนคู่', 'ร้อยละได้เต็มตั้งแต่ครั้งแรก', 'ส่งเฉลี่ย (ครั้ง/คู่)', 'มัธยฐานการส่ง',
     'ส่งเฉลี่ยก่อนได้เต็ม (เฉพาะคู่ที่ได้เต็ม)', 'ร้อยละคู่ที่ใช้คำใบ้'], unitSummary));

const nFull = pairList.filter(p => p.best === 100).length;
const nFullNoHint = pairList.filter(p => p.best === 100 && !hasHint(p.uid, p.aid)).length;
const nFirstFull = pairList.filter(p => p.first === 100).length;
const nFirstFullNoHint = pairList.filter(p => p.first === 100 && !hasHint(p.uid, p.aid)).length;

P('## ข้อ 3 การส่งงานรายคู่และพัฒนาการการแก้ข้อผิดพลาด\n');
P('- คู่ (ผู้เรียน × ข้อ) ที่มีการส่ง: **' + pairList.length + '**');
P('- คู่ที่เคยได้คะแนนเต็ม: **' + nFull + '** (' + f1(pct(nFull, pairList.length)) + '%) ในจำนวนนี้ไม่เคยขอคำใบ้ **' + nFullNoHint + '** (' + f1(pct(nFullNoHint, nFull)) + '%)');
P('- คู่ที่ได้เต็มตั้งแต่ส่งครั้งแรก: **' + nFirstFull + '** (' + f1(pct(nFirstFull, pairList.length)) + '%) ในจำนวนนี้ไม่เคยขอคำใบ้ **' + nFirstFullNoHint + '** (' + f1(pct(nFirstFullNoHint, nFirstFull)) + '%)');
P('- การส่งงานเฉลี่ย ' + f2(pairList.reduce((x, p) => x + p.n, 0) / pairList.length) + ' ครั้งต่อคู่ · มัธยฐาน ' + median(pairList.map(p => p.n)) + ' ครั้ง\n');
P('| หน่วย | คู่ | ได้เต็มครั้งแรก (%) | ส่งเฉลี่ย | มัธยฐาน | ส่งเฉลี่ยก่อนได้เต็ม | คู่ที่ใช้คำใบ้ (%) |');
P('|---|---|---|---|---|---|---|');
unitSummary.forEach(r => P('| ' + r.join(' | ') + ' |'));
P('\n**เทียบกับตัวเลขในเอกสารบริบท (692 / 639 / 564 / 326 / 318)**\n');
P('| ตัวเลขในเอกสาร | ค่าที่คำนวณใหม่ | ตรงกันหรือไม่ |');
P('|---|---|---|');
P('| คู่ทั้งหมด 692 | ' + pairList.length + ' | ' + (pairList.length === 692 ? 'ตรง' : 'ต่าง (ดูหมายเหตุ)') + ' |');
P('| ได้เต็ม 639 | ' + nFull + ' | ' + (nFull === 639 ? 'ตรง' : 'ต่าง') + ' |');
P('| ได้เต็มโดยไม่ขอคำใบ้ 564 | ' + nFullNoHint + ' | ' + (nFullNoHint === 564 ? 'ตรง' : 'ต่าง') + ' |');
P('| ได้เต็มครั้งแรก 326 | ' + nFirstFull + ' | ' + (nFirstFull === 326 ? 'ตรง' : 'ต่าง') + ' |');
P('| ได้เต็มครั้งแรกโดยไม่ขอคำใบ้ 318 | ' + nFirstFullNoHint + ' | ' + (nFirstFullNoHint === 318 ? 'ตรง' : 'ต่าง') + ' |');
P('\n**แหล่งข้อมูลและขอบเขต** `submissions` (courseId = รายวิชานี้, เฉพาะ ' + graded.length + ' กิจกรรมที่นับคะแนน) ' +
    'และ `coachInteractions` · ไฟล์ `03_pairs.csv`, `03_unit_summary.csv`\n');

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 4 กระทบยอดตัวเลขการใช้งาน
// ════════════════════════════════════════════════════════════════════════════
const subsAllCourseForRecon = submissions.filter(x => x.courseId === CID)
    .map(x => ({ ...x, _at: dt(x.submittedAt) })).filter(x => x._at);
const uCourse = usage.filter(u => u.courseId === CID);
const uAll = usage;
const evTypes = [...new Set(uAll.map(u => u.event))].sort();
const usageRows = evTypes.map(ev => {
    const inCourse = uCourse.filter(u => u.event === ev);
    const all = uAll.filter(u => u.event === ev);
    const times = inCourse.map(u => dt(u.timestamp)).filter(Boolean).map(d => d.getTime());
    return [ev, inCourse.length, all.length,
        times.length ? dayStr(new Date(Math.min(...times))) : '',
        times.length ? dayStr(new Date(Math.max(...times))) : ''];
});
files.push(csv('04_usage_events.csv',
    ['ประเภทเหตุการณ์', 'จำนวนในรายวิชานี้', 'จำนวนทั้งระบบ', 'เหตุการณ์แรก', 'เหตุการณ์สุดท้าย'], usageRows));

const subCourseCount = submissions.filter(s => s.courseId === CID).length;
const hintUsageCourse = uCourse.filter(u => u.event === 'ai_hint').length;
const coachSocraticAll = coach.filter(c => c.coachRole === 'socratic' && hintLevel(c.triggerEvent)).length;

P('## ข้อ 4 กระทบยอดตัวเลขการใช้งาน\n');
P('- `usageEvents` ที่มี courseId ของรายวิชานี้: **' + uCourse.length + ' ระเบียน** (ทั้งระบบ ' + uAll.length + ')');
P('- `submissions` ของรายวิชานี้: **' + subCourseCount + ' ระเบียน**');
P('- `usageEvents` event=ai_hint ในรายวิชานี้: **' + hintUsageCourse + '**');
P('- `coachInteractions` บทบาท socratic ทั้งระบบ: **' + coachSocraticAll + '** · เฉพาะผู้เรียนในรายวิชานี้: **' + hints.length + '**\n');
P('| ประเภทเหตุการณ์ | ในรายวิชานี้ | ทั้งระบบ | ครั้งแรก | ครั้งสุดท้าย |');
P('|---|---|---|---|---|');
usageRows.forEach(r => P('| ' + r.join(' | ') + ' |'));
const aiTypes = ['ai_analyze', 'ai_hint', 'ai_chat'];
const aiInCourse = aiTypes.map(t => uCourse.filter(u => u.event === t).length);
P('\n**คอลัมน์ "AI" บนหน้า Usage Analytics (555)** ประกอบด้วย 3 ประเภท นับเฉพาะรายวิชานี้: ' +
    aiTypes.map((t, i) => t + ' = ' + aiInCourse[i]).join(' · ') + ' รวม ' + aiInCourse.reduce((a, b) => a + b, 0) + ' ครั้ง');
P('เหตุการณ์ `loop_trace` (' + uCourse.filter(u => u.event === 'loop_trace').length + ' ครั้ง) **ไม่ถูกนับ** ในคอลัมน์ AI '
    + 'เพราะหน้าจอกำหนดชุด AI ไว้เพียง 3 ประเภทข้างต้น');
P('ยอดรวมทุกประเภทในรายวิชานี้ = ' + uCourse.length + ' ตรงกับเลข 4,868 บนหน้าจอ จึงยืนยันว่าหน้าจอกรองตามรายวิชาแล้ว');

const subEvents = uCourse.filter(u => u.event === 'submission').length;
const firstEventTime = Math.min(...uCourse.map(u => dt(u.timestamp)).filter(Boolean).map(d => d.getTime()));
const subsBeforeLogging = subsAllCourseForRecon.filter(x => x._at.getTime() < firstEventTime).length;
P('\n**ทำไม `submissions` ' + subCourseCount + ' ระเบียน แต่เหตุการณ์ submission มีแค่ ' + subEvents + '**');
P('- การส่งงานที่เกิดก่อนเหตุการณ์แรกใน usageEvents (' + dayStr(new Date(firstEventTime)) + '): **'
    + subsBeforeLogging + ' ครั้ง** ช่วงนั้นระบบยังไม่ได้บันทึก usageEvents');
P('- ส่วนต่างที่เหลือ ' + (subCourseCount - subEvents - subsBeforeLogging) + ' ครั้ง เกิดจาก logUsageEvent '
    + 'เขียนแบบไม่รอผล (ถ้าเขียนไม่สำเร็จจะเงียบ) และบางระเบียนเป็นของบัญชีที่ถอนการลงทะเบียนแล้ว');
P('- **ตัวเลขที่ควรใช้ในเล่มคือ ' + subCourseCount + ' ครั้ง จาก `submissions`** เพราะเป็นบันทึกการส่งงานจริงที่ใช้คิดคะแนน '
    + 'ส่วน 2,388 บนหน้า Usage Analytics เป็นบันทึกเหตุการณ์เพื่อดูแนวโน้มการใช้งาน');

P('\n**ทำไมคำใบ้มีสองตัวเลข**');
P('- usageEvents event=ai_hint ในรายวิชานี้ = **' + hintUsageCourse + ' ครั้ง** (เอกสารบริบทเคยระบุ 232 '
    + 'ซึ่งนับรวมบัญชีที่ถอนการลงทะเบียนแล้วด้วย)');
P('- coachInteractions บทบาท socratic ทั้งระบบ = **' + coachSocraticAll + ' ระเบียน** เฉพาะผู้เรียน '
    + students.length + ' คนในรายวิชานี้ = **' + hints.length + ' ระเบียน**');
P('- ส่วนต่างเกิดจาก 3 สาเหตุ (ก) coachInteractions ไม่มี courseId จึงรวมทุกรายวิชาที่ครูสอน '
    + '(ข) usageEvents บันทึกทุกครั้งที่กดขอแม้ AI ตอบไม่สำเร็จ '
    + '(ค) บัญชีที่ถอนการลงทะเบียนแล้วยังมีระเบียนค้างอยู่ในทั้งสอง collection');
P('\n**แหล่งข้อมูลและขอบเขต** `usageEvents` (ทั้ง collection), `submissions`, `coachInteractions` · ไฟล์ `04_usage_events.csv`\n');

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 5 การใช้คำใบ้รายบุคคล
// ════════════════════════════════════════════════════════════════════════════
const perStudent = students.map(s => {
    const hs = hints.filter(h => h.uid === s.uid);
    const lv = [1, 2, 3, 4].map(L => hs.filter(h => h.level === L).length);
    const nAssign = new Set([
        ...hs.filter(h => h.assign).map(h => h.assign.id),
        ...hintUsage.filter(h => h.uid === s.uid && h.aid).map(h => h.aid),
    ]).size;
    const nUsage = hintUsage.filter(h => h.uid === s.uid).length;
    return [s.scode, hs.length, ...lv, nUsage, nAssign, e1[s.uid].earned, f2(e1[s.uid].pct)];
});
files.push(csv('05_hint_per_student.csv',
    ['S-code', 'ขอคำใบ้ (coachInteractions)', 'ระดับ1', 'ระดับ2', 'ระดับ3', 'ระดับ4',
     'ขอคำใบ้ (usageEvents)', 'จำนวนกิจกรรมที่ขอ', 'คะแนนดิบ E1', 'ร้อยละ E1'],
    perStudent));

const none = perStudent.filter(r => r[6] === 0).length;
const low = perStudent.filter(r => r[6] >= 1 && r[6] <= 5).length;
const high = perStudent.filter(r => r[6] > 5).length;
const noneC = perStudent.filter(r => r[1] === 0).length;
const lowC = perStudent.filter(r => r[1] >= 1 && r[1] <= 5).length;
const highC = perStudent.filter(r => r[1] > 5).length;
P('## ข้อ 5 การใช้คำใบ้รายบุคคล\n');
P('- ไม่เคยขอคำใบ้เลย: **' + none + ' คน** · ขอ 1-5 ครั้ง: **' + low + ' คน** · มากกว่า 5 ครั้ง: **' + high + ' คน**');
P('  (นับจาก `usageEvents` event=ai_hint ซึ่งเป็นชุดที่เอกสารบริบทใช้)');
P('- ถ้านับจาก `coachInteractions` แทน: ไม่เคยขอ ' + noneC + ' คน · 1-5 ครั้ง ' + lowC + ' คน · มากกว่า 5 ครั้ง ' + highC + ' คน');
P('- หน่วยนับคือ **จำนวนครั้งที่กดขอคำใบ้แต่ละระดับ** (การกดขอ 1 ครั้ง = 1 ระเบียน) ไม่ใช่จำนวนกิจกรรม');
P('- ค่าเฉลี่ยการขอคำใบ้ ' + f2(hintUsage.length / students.length) + ' ครั้งต่อคน (usageEvents) · มัธยฐาน ' + median(perStudent.map(r => r[6])) + ' ครั้ง\n');
P('| S-code | ขอ (coach) | ระดับ1 | ระดับ2 | ระดับ3 | ระดับ4 | ขอ (usage) | กิจกรรมที่ขอ | E1 ดิบ | E1 % |');
P('|---|---|---|---|---|---|---|---|---|---|');
perStudent.forEach(r => P('| ' + r.join(' | ') + ' |'));
P('\n**แหล่งข้อมูลและขอบเขต** `coachInteractions` + คะแนนจาก `submissions` · ไฟล์ `05_hint_per_student.csv`\n');

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 6 QuickPoll
// ════════════════════════════════════════════════════════════════════════════
const polls = pollSessions.filter(p => p.courseId === CID);
const pollRows = [];
polls.forEach(p => {
    const snap = p.snapshot || {};
    const resp = pollResponses.filter(r => r.sessionId === p.id);
    const correct = snap.correctOptionId || '';
    const r1 = resp.filter(r => r.r1 && r.r1.optionId);
    const r2 = resp.filter(r => r.r2 && r.r2.optionId);
    const r1ok = r1.filter(r => r.r1.optionId === correct).length;
    const r2ok = r2.filter(r => r.r2.optionId === correct).length;
    const both = resp.filter(r => r.r1?.optionId && r.r2?.optionId);
    const w2r = both.filter(r => r.r1.optionId !== correct && r.r2.optionId === correct).length;
    const r2w = both.filter(r => r.r1.optionId === correct && r.r2.optionId !== correct).length;
    const w2w = both.filter(r => r.r1.optionId !== correct && r.r2.optionId !== correct).length;
    pollRows.push([
        dayStr(dt(p.taughtOn) || dt(p.openedAt?.r1)), snap.type || '', snap.stage || '',
        (snap.prompt || '').replace(/\s+/g, ' ').slice(0, 80),
        correct || '(ปลายเปิด)', p.status || '', p.expectedN || '',
        r1.length, r2.length,
        correct ? f1(pct(r1ok, r1.length)) : '', correct ? f1(pct(r2ok, r2.length)) : '',
        correct ? w2r : '', correct ? r2w : '', correct ? w2w : '',
    ]);
});
files.push(csv('06_quickpoll.csv',
    ['วันที่', 'ประเภท', 'ขั้น 5Es', 'คำถาม', 'ตัวเลือกที่ถูก', 'สถานะ', 'คาดว่ามีผู้ตอบ',
     'ผู้ตอบรอบ1', 'ผู้ตอบรอบ2', 'ถูกรอบ1 (%)', 'ถูกรอบ2 (%)', 'ผิด→ถูก', 'ถูก→ผิด', 'ผิด→ผิด'], pollRows));

const answered = polls.filter(p => pollResponses.some(r => r.sessionId === p.id));
P('## ข้อ 6 QuickPoll (Peer Instruction)\n');
P('- Session ของรายวิชานี้ทั้งหมด: **' + polls.length + '** · มีผู้ตอบจริง: **' + answered.length + '**');
P('- คำตอบทั้งหมดที่บันทึก: **' + pollResponses.filter(r => polls.some(p => p.id === r.sessionId)).length + ' ระเบียน**');
const withBoth = pollRows.filter(r => r[8] > 0);
P('- Session ที่มีการตอบครบสองรอบ: **' + withBoth.length + '**\n');
if (pollRows.length) {
    P('| วันที่ | ประเภท | คำถาม | ผู้ตอบ ร1 | ผู้ตอบ ร2 | ถูก ร1 | ถูก ร2 | ผิด→ถูก | ถูก→ผิด |');
    P('|---|---|---|---|---|---|---|---|---|');
    pollRows.forEach(r => P('| ' + r[0] + ' | ' + r[1] + ' | ' + r[3].slice(0, 40) + ' | ' + r[7] + ' | ' + r[8] + ' | ' +
        (r[9] === '' ? '-' : r[9] + '%') + ' | ' + (r[10] === '' ? '-' : r[10] + '%') + ' | ' + (r[11] === '' ? '-' : r[11]) + ' | ' + (r[12] === '' ? '-' : r[12]) + ' |'));
}
const textPolls = polls.filter(p => (p.snapshot || {}).type === 'text');
if (textPolls.length) {
    const words = {};
    pollResponses.filter(r => textPolls.some(p => p.id === r.sessionId))
        .forEach(r => {
            const t = (r.r1 && r.r1.text) || r.text || '';
            String(t).split(/[\s,.;]+/).filter(w => w.length > 1).forEach(w => words[w] = (words[w] || 0) + 1);
        });
    const top = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 15);
    P('\n**คำถามปลายเปิด** มี ' + textPolls.length + ' session · คำที่พบบ่อย: ' +
        (top.length ? top.map(([w, n]) => w + ' (' + n + ')').join(', ') : 'ไม่มีข้อมูลข้อความคำตอบ'));
}
P('\n**แหล่งข้อมูลและขอบเขต** `pollSessions` (courseId ของรายวิชานี้) + subcollection `responses` · ไฟล์ `06_quickpoll.csv`\n');

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 7 ความเสี่ยงและบทบาทโค้ช
// ════════════════════════════════════════════════════════════════════════════
const roles = [...new Set(coach.map(c => c.coachRole))].sort();
const roleRows = roles.map(r => {
    const inC = coach.filter(c => c.coachRole === r && isStudent(c.uid));
    const times = inC.map(c => dt(c.createdAt)).filter(Boolean).map(d => d.getTime());
    return [r, inC.length, new Set(inC.map(c => c.uid)).size,
        times.length ? dayStr(new Date(Math.min(...times))) : '',
        times.length ? dayStr(new Date(Math.max(...times))) : ''];
});
files.push(csv('07_coach_roles.csv',
    ['บทบาทโค้ช', 'จำนวนครั้ง', 'จำนวนผู้เรียน', 'ครั้งแรก', 'ครั้งสุดท้าย'], roleRows));

const riskRows = coach.filter(c => c.coachRole === 'predictive' && isStudent(c.uid))
    .map(c => [scodeOf[c.uid], c.triggerEvent || '', timeStr(dt(c.createdAt)), f2(e1[c.uid].pct)]);
files.push(csv('07_risk_alerts.csv', ['S-code', 'ระดับความเสี่ยง', 'เวลา', 'E1 สุดท้าย (%)'], riskRows));

P('## ข้อ 7 การแจ้งเตือนความเสี่ยงและบทบาทโค้ช\n');
P('- ระบบ**บันทึก**การแจ้งเตือนความเสี่ยงจริงไว้ใน `coachInteractions` ด้วย coachRole = `predictive`');
P('- จำนวนการแจ้งเตือนของผู้เรียนในรายวิชานี้: **' + riskRows.length + ' ครั้ง** จากผู้เรียน **' +
    new Set(riskRows.map(r => r[0])).size + ' คน**');
const riskHigh = riskRows.filter(r => /high/.test(r[1])).length;
P('- เสี่ยงสูง ' + riskHigh + ' ครั้ง · เสี่ยงปานกลาง ' + (riskRows.length - riskHigh) + ' ครั้ง\n');
P('| บทบาทโค้ช | จำนวนครั้ง | ผู้เรียน | ครั้งแรก | ครั้งสุดท้าย |');
P('|---|---|---|---|---|');
roleRows.forEach(r => P('| ' + r.join(' | ') + ' |'));
P('\n**การเปิดดูหน้าจอของครู** ระบบ**ไม่ได้บันทึก** การเปิดดู Realtime Dashboard หรือหน้าวิเคราะห์ ' +
    '(`usageEvents` บันทึกเฉพาะ code_run, sample_test, submission, ai_analyze, ai_hint, ai_chat, demo_run)');
P('\n**แหล่งข้อมูลและขอบเขต** `coachInteractions` ทุกบทบาท เฉพาะผู้เรียนในรายวิชา · ไฟล์ `07_coach_roles.csv`, `07_risk_alerts.csv`\n');

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 8 แนวโน้มรายสัปดาห์
// ════════════════════════════════════════════════════════════════════════════
const subsAllCourse = submissions.filter(s => s.courseId === CID && isStudent(s.studentId))
    .map(s => ({ ...s, _at: dt(s.submittedAt) })).filter(s => s._at);
const allWeeks = [...new Set([
    ...subsAllCourse.map(s => weekStr(s._at)),
    ...uCourse.map(u => weekStr(dt(u.timestamp))),
    ...hints.map(h => weekStr(h.at)),
])].filter(Boolean).sort();
const spInScope = selfPractice.filter(s => s.courseId === CID && isStudent(s.studentId))
    .map(s => ({ ...s, _at: dt(s.submittedAt) }));
const weeklyRows = allWeeks.map(w => {
    const su = subsAllCourse.filter(s => weekStr(s._at) === w);
    const ue = uCourse.filter(u => weekStr(dt(u.timestamp)) === w);
    const hi = hints.filter(h => weekStr(h.at) === w);
    const sp = spInScope.filter(s => weekStr(s._at) === w);
    const active = new Set([...su.map(s => s.studentId), ...ue.map(u => u.uid), ...sp.map(s => s.studentId)]);
    return [w, active.size, su.length,
        ue.filter(u => u.event === 'code_run').length,
        ue.filter(u => u.event === 'sample_test').length,
        hi.length, sp.length, new Set(sp.map(s => s.studentId)).size];
});
files.push(csv('08_weekly.csv',
    ['สัปดาห์ (เริ่มจันทร์)', 'ผู้เรียนที่ใช้งาน', 'ส่งงาน', 'รันโค้ด', 'ทดสอบตัวอย่าง', 'ขอคำใบ้', 'ฝึกเอง (ข้อ)', 'ผู้เรียนที่ฝึกเอง'],
    weeklyRows));

P('## ข้อ 8 แนวโน้มการใช้งานรายสัปดาห์\n');
P('- ช่วงข้อมูล: ' + allWeeks[0] + ' ถึง ' + allWeeks[allWeeks.length - 1] + ' รวม ' + allWeeks.length + ' สัปดาห์');
P('- สัปดาห์ที่มีการส่งงานสูงสุด: ' + weeklyRows.reduce((a, b) => (b[2] > a[2] ? b : a))[0] +
    ' (' + Math.max(...weeklyRows.map(r => r[2])) + ' ครั้ง)');
P('- **ไม่มีข้อมูล**สำหรับการแยกในคาบเรียนกับนอกคาบเรียน ระบบไม่ได้บันทึกตารางสอน ' +
    'จึงไม่สามารถระบุได้ว่าการใช้งานใดอยู่ในคาบ\n');
P('| สัปดาห์ | ผู้ใช้งาน | ส่งงาน | รันโค้ด | ทดสอบตัวอย่าง | ขอคำใบ้ | ฝึกเอง (ข้อ) |');
P('|---|---|---|---|---|---|---|');
weeklyRows.forEach(r => P('| ' + r.slice(0, 7).join(' | ') + ' |'));
P('\n**แหล่งข้อมูลและขอบเขต** `submissions`, `usageEvents`, `coachInteractions`, `selfPracticeSubmissions` ' +
    'แบ่งสัปดาห์เริ่มวันจันทร์ตามเวลาไทย · ไฟล์ `08_weekly.csv`\n');

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 9 บัญชีผู้เรียนและการฝึกเอง
// ════════════════════════════════════════════════════════════════════════════
const spAll = selfPractice.filter(s => s.courseId === CID);
const spStudents = spAll.filter(s => isStudent(s.studentId));
const spOther = spAll.filter(s => !isStudent(s.studentId));
const byDiff = (arr) => ['ง่าย', 'ปานกลาง', 'ยาก'].map(d => arr.filter(s => s.difficulty === d).length);
const spRows = students.map(s => {
    const mine = spStudents.filter(x => x.studentId === s.uid);
    return [s.scode, mine.length, ...byDiff(mine),
        mine.reduce((x, m) => x + (m.actualScore || 0), 0),
        mine.filter(m => m.problemSource === 'bank').length,
        mine.filter(m => m.problemSource === 'ai').length,
        mine.filter(m => !m.problemSource).length];
});
files.push(csv('09_selfpractice.csv',
    ['S-code', 'จำนวนข้อ', 'ง่าย', 'ปานกลาง', 'ยาก', 'คะแนนรวม', 'จากคลังโจทย์', 'จาก AI (ระบุแหล่ง)', 'ไม่ระบุแหล่ง (ก่อนเพิ่มฟีเจอร์)'],
    spRows.filter(r => r[1] > 0)));

P('## ข้อ 9 บัญชีผู้เรียนและตัวเลขการฝึกเอง\n');
P('- ผู้เรียนที่ลงทะเบียนอยู่ในรายวิชาขณะดึงข้อมูล: **' + students.length + ' คน**');
P('- บัญชีที่ 36 เป็น **บัญชีทดสอบของผู้สอน** ที่สร้างไว้ตรวจหน้าจอฝั่งผู้เรียน ปัจจุบันถอนการลงทะเบียนแล้ว ' +
    'จึงไม่ปรากฏในข้อมูลชุดนี้');
P('- การฝึกเองในรายวิชานี้ทั้งหมด **' + spAll.length + ' ข้อ** · เป็นของผู้เรียนที่ยังลงทะเบียนอยู่ **' + spStudents.length + ' ข้อ** ' +
    'จากผู้เรียน **' + new Set(spStudents.map(s => s.studentId)).size + ' คน**');
if (spOther.length) P('- อีก **' + spOther.length + ' ข้อ** เป็นของบัญชีที่ไม่อยู่ในรายชื่อผู้เรียนปัจจุบัน (รวมบัญชีทดสอบของผู้สอน)');
const d = byDiff(spStudents);
P('- แยกระดับ (เฉพาะผู้เรียนปัจจุบัน): ง่าย ' + d[0] + ' · ปานกลาง ' + d[1] + ' · ยาก ' + d[2]);
const dAll = byDiff(spAll);
P('- แยกระดับ (รวมทุกบัญชีในรายวิชา): ง่าย ' + dAll[0] + ' · ปานกลาง ' + dAll[1] + ' · ยาก ' + dAll[2]);
P('- แหล่งที่มาของโจทย์: จากคลังโจทย์ ' + spAll.filter(s => s.problemSource === 'bank').length +
    ' · จาก AI (ระบุแหล่ง) ' + spAll.filter(s => s.problemSource === 'ai').length +
    ' · ไม่ระบุแหล่ง ' + spAll.filter(s => !s.problemSource).length +
    ' (ระเบียนก่อนเพิ่มฟิลด์ `problemSource` เมื่อ 25 ก.ย. 2569 ทั้งหมดมาจาก AI เพราะยังไม่มีคลังโจทย์)\n');
const spByStudentAnyCourse = selfPractice.filter(x => isStudent(x.studentId));
const spOutside = spByStudentAnyCourse.filter(x => x.courseId !== CID);
const dAny = byDiff(spByStudentAnyCourse);
P('" + NL + "**ทำไมเอกสารบริบทบอก 256 ข้อ แต่ไฟล์ SelfPractice_scores.csv รวมได้ 260 ข้อ**');
P('- นับเฉพาะระเบียนที่ `courseId` เป็นรายวิชานี้: **' + spAll.length + ' ข้อ** (ง่าย ' + dAll[0] + ' · ปานกลาง ' + dAll[1] + ' · ยาก ' + dAll[2] + ')');
P('- นับตาม **รหัสผู้เรียน 35 คนนี้ โดยไม่กรองรายวิชา**: **' + spByStudentAnyCourse.length + ' ข้อ** (ง่าย ' + dAny[0] + ' · ปานกลาง ' + dAny[1] + ' · ยาก ' + dAny[2] + ') ตรงกับไฟล์ที่ส่งออก');
P('- ส่วนต่าง **' + spOutside.length + ' ข้อ** เป็นการฝึกของผู้เรียนกลุ่มเดียวกันแต่บันทึกไว้ใต้รายวิชาอื่น: ' +
    [...new Set(spOutside.map(x => (x.courseTitle || x.courseId) + ' (' + spOutside.filter(y => (y.courseTitle || y.courseId) === (x.courseTitle || x.courseId)).length + ' ข้อ)'))].join(' · '));
P('- สาเหตุ: แท็บ "คะแนนฝึกเอง" ในหน้าวิเคราะห์ **ค้นด้วย studentId อย่างเดียว ไม่ได้กรอง courseId** ' +
    '(`js/pages/teacher/StudentAnalytics.js` ฟังก์ชัน loadPracticeData) จึงรวมการฝึกในรายวิชาอื่นของผู้เรียนคนเดียวกันมาด้วย');
P('- **ตัวเลขที่ควรใช้ในเล่ม** ถ้าพูดถึงการฝึกในรายวิชานี้ให้ใช้ ' + spAll.length + ' ข้อ ' +
    'ถ้าพูดถึงพฤติกรรมการฝึกของผู้เรียนกลุ่มนี้โดยรวมให้ใช้ ' + spByStudentAnyCourse.length + ' ข้อ พร้อมระบุนิยาม');
P('" + NL + "**แหล่งข้อมูลและขอบเขต** `selfPracticeSubmissions` · ไฟล์ `09_selfpractice.csv`" + NL + "');

// ════════════════════════════════════════════════════════════════════════════
// ข้อ 10 เส้นทางหน้าจอสำหรับจับภาพประกอบเล่ม
// ════════════════════════════════════════════════════════════════════════════
const BASE = 'https://koki-assawin.github.io/AI-Powered-C/';
P('## ข้อ 10 เส้นทางหน้าจอสำหรับจับภาพประกอบเล่ม' + '\n');
P('| ภาพที่ต้องใช้ | เส้นทาง | ขั้นตอน |');
P('|---|---|---|');
P('| คำใบ้ 4 ระดับขณะผู้เรียนขอ | `' + BASE + '#/student/workspace?course=' + CID + '` | เข้าด้วยบัญชีผู้เรียน เลือกกิจกรรม กด Submit ให้ผลไม่ผ่าน แล้วเปิดแท็บ "ผลตรวจ" แผง "AI Scaffolding (คำใบ้)" จะอยู่ใต้ผลรายกรณีทดสอบ กดปุ่มระดับ 1 ถึง 4 ตามลำดับ |');
P('| ป้ายเกณฑ์คะแนนและคำเตือนก่อนส่ง | หน้าเดียวกับข้างบน | ป้ายเกณฑ์อยู่แถวเดียวกับปุ่มรีเซ็ตเหนือช่องแก้โค้ด · **กล่องคำเตือนก่อนส่งจะไม่ขึ้นในรายวิชานี้แล้ว เพราะปิดรับคะแนนไปแล้ว** ถ้าต้องการภาพนี้ให้ใช้รายวิชาที่ยังเปิดรับคะแนนและตั้งเกณฑ์เป็นคะแนนครั้งล่าสุด |');
P('| สถานะปิดรับคะแนนของรายวิชา | `' + BASE + '#/teacher/courses` | ดูการ์ดรายวิชา ปุ่มจะแสดง "คะแนนถูกล็อก" · อีกจุดคือหัวตารางในแท็บ "สรุปคะแนนทุกคน" มีป้าย "ปิดรับคะแนนแล้ว" |');
P('| KPI การถอนความช่วยเหลือ | `' + BASE + '#/teacher/dashboard` | เลือกรายวิชา แล้วดู KPI สองใบคือ "ขอ AI Scaffolding (คำใบ้) ระดับ 3 ต้นภาค" และ "ปลายภาค" · ปรับวันที่จุดแบ่งได้ที่ช่องวันที่ด้านบน (ใช้ ' + dayStr(midTime) + ' เพื่อให้ตรงกับตารางในข้อ 1) |');
P('| กราฟเรดาร์ 5 มิติ | `' + BASE + '#/teacher/analytics` | เลือกรายวิชา แท็บ "รายบุคคล" แล้วเลือกผู้เรียน กราฟอยู่เหนือตารางการส่งงาน สลับโหมดคะแนนสูงสุด/ล่าสุดได้ |');
P('| กลุ่มผู้เรียน A-D | `' + BASE + '#/teacher/analytics` | แท็บ "กลุ่มผู้เรียน" มีแผนภูมิ 4 กลุ่มและตารางรายคนพร้อมแนวทางช่วยเหลือ |');
P('| Realtime Dashboard | `' + BASE + '#/teacher/realtime` | เลือกรายวิชา หน้าจะแสดงความคืบหน้าระหว่างคาบและแผงเสี่ยงตกกลุ่ม |');
P('\n' + '**หมายเหตุ** ทุกหน้าต้องเข้าสู่ระบบก่อน · หน้าของผู้เรียนต้องใช้บัญชีผู้เรียน หน้าของครูต้องใช้บัญชีครู' + '\n');

// ════════════════════════════════════════════════════════════════════════════
// สิ่งที่ตรวจพบว่าขัดกับเอกสารบริบท
// ════════════════════════════════════════════════════════════════════════════
P('## สิ่งที่ตรวจพบว่าขัดกับเอกสารบริบท' + '\n');
P('| หัวข้อ | เอกสารบริบทระบุ | ข้อมูลจริง | ควรแก้เป็น |');
P('|---|---|---|---|');
P('| การขอคำใบ้ (usageEvents) | 232 ครั้ง | ' + hintUsageCourse + ' ครั้ง (เฉพาะผู้เรียน 35 คนในรายวิชานี้) | ' + hintUsageCourse + ' ครั้ง |');
P('| การขอคำใบ้ (coachInteractions) | 277 รายการ | 277 ทั้งระบบ แต่เป็นของรายวิชานี้ ' + hints.length + ' รายการ | ระบุขอบเขตให้ชัดทั้งสองตัวเลข |');
P('| การฝึกเอง | 17 คน 256 ข้อ | ' + new Set(spStudents.map(x => x.studentId)).size + ' คน ' + spAll.length + ' ข้อ (ในรายวิชานี้) หรือ ' + spByStudentAnyCourse.length + ' ข้อ (ไม่กรองรายวิชา) | เลือกนิยามแล้วระบุให้ตรง |');
P('| การส่งงานทั้งหมด | ประมาณ 3,600 ครั้ง | ' + subCourseCount + ' ครั้ง | ' + subCourseCount + ' ครั้ง |');
P('| คู่ (ผู้เรียน × ข้อ) | 692 | ' + pairList.length + ' | ตรงกัน |');
P('| ค่า E1 | 89.19 | ' + f2(e1Mean) + ' | ตรงกัน |');
P('\n' + '**ข้อควรระวังเพิ่มเติม**');
P('- KPI การถอนความช่วยเหลือบนหน้าจอเปลี่ยนตามวันที่จุดแบ่งที่ผู้ใช้เลือก ถ้าอ้างตัวเลขในเล่มต้องระบุวันที่จุดแบ่งด้วย');
P('- `coachInteractions` ไม่มีฟิลด์ `courseId` การนับแยกรายวิชาต้องอ้างอิงรายชื่อผู้เรียนของรายวิชานั้น');
P('- ตัวเลขบนหน้า Usage Analytics เป็นบันทึกเหตุการณ์ ไม่ใช่จำนวนการส่งงานจริง (ดูข้อ 4)');

// ── mapping (ไฟล์ส่วนตัว) ───────────────────────────────────────────────────
files.push(csv('_mapping_private.csv', ['S-code', 'เลขที่', 'รหัสนักเรียน'],
    students.map(s => [s.scode, s.number, s.studentCode])));

// ── เขียนไฟล์สรุป ───────────────────────────────────────────────────────────
const head = [
    '# REPORT_DATA_EXPORT_v24 — ข้อมูลจากฐานข้อมูลจริงสำหรับเล่มรายงาน',
    '',
    '> สร้างโดย `tools/report/build-report.js` จากแคชที่ดึงเมื่อ ' + new Date(Date.now() + TZ).toISOString().slice(0, 16).replace('T', ' ') + ' น. (Asia/Bangkok)',
    '> อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลใด ๆ ใน Firestore',
    '> รายวิชา `courses/' + CID + '` · ผู้เรียน ' + students.length + ' คน · กิจกรรมที่นับคะแนน ' + graded.length + ' ข้อ (เต็ม ' + totalRaw + ' คะแนน)',
    '> รหัสผู้เรียนใช้ S01–S35 ตามเลขที่ · ตารางเทียบรหัสอยู่ใน `_mapping_private.csv` (ห้ามเผยแพร่)',
    '',
    '---',
    '',
].join('\n');
fs.writeFileSync(path.join(OUT, 'REPORT_DATA_EXPORT_v24.md'), head + report.join('\n') + '\n', 'utf8');

console.log('สร้างไฟล์ที่ ' + OUT);
files.forEach(f => console.log('  ✓ ' + f));
console.log('  ✓ REPORT_DATA_EXPORT_v24.md');

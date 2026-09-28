#!/usr/bin/env node
/**
 * tools/report/case-profiles.js — รายงานรายบุคคลของกรณีศึกษา 3 คน (P3)
 * อ่านจากแคชอย่างเดียว ไม่เขียน Firestore
 * ผลลัพธ์: docs/report-exports-2569-09/CASE_PROFILES.md
 * ไม่รายงานเวลาที่ใช้ทำโจทย์ และไม่รายงานจำนวนครั้งที่กดรันก่อนส่ง ตามที่กำหนด
 */
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(ROOT, 'backups', 'report-cache');
const OUT = path.join(ROOT, 'docs', 'report-exports-2569-09');
const L = n => JSON.parse(fs.readFileSync(path.join(CACHE, n + '.json'), 'utf8'));

const CID = 'UZGy0pGurry9Dt9YdhYX';
const TARGETS = ['S30', 'S21', 'S32'];

const users = L('users'), enrollments = L('enrollments'), assignments = L('assignments'),
    assignmentsV2 = L('assignments_v2'), submissions = L('submissions'),
    submissionsV2 = L('submissions_v2'), coach = L('coachInteractions'), courses = L('courses');

const dt = v => v && v.__ts ? new Date(v.__ts) : null;
const th = d => d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
const ym = d => d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 7);
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);
const codeOf = t => { const m = /กิจกรรม\s*([0-9]+-[A-Z][0-9]?)/.exec(t || ''); return m ? m[1] : (t || ''); };

const course = courses.find(c => c.id === CID);
const lockedAtSec = course && course.gradesLocked ? new Date(course.gradesLockedAt.__ts).getTime() / 1000 : null;
const afterLock = s => lockedAtSec !== null && (new Date(s.submittedAt.__ts).getTime() / 1000) > lockedAtSec;

// ── ผู้เรียน ────────────────────────────────────────────────────────────────
const userById = {}; users.forEach(u => userById[u.id] = u);
const students = [...new Set(enrollments.filter(e => e.courseId === CID).map(e => e.studentId))]
    .map(id => ({ uid: id, u: userById[id] })).filter(x => x.u)
    .map(x => ({ uid: x.uid, number: parseInt(x.u.number || '999', 10) }))
    .sort((a, b) => a.number - b.number);
students.forEach(s => s.scode = 'S' + String(s.number).padStart(2, '0'));

// ── ชุดข้อมูลแบบเดียวกับที่หน้าจอโหลด ───────────────────────────────────────
const allAssign = [
    ...assignments.filter(a => a.courseId === CID),
    ...assignmentsV2.filter(a => a.courseId === CID && a.activityType !== 'coding'),
];
const TOTAL_ASSIGN = allAssign.length;
const graded = assignments.filter(a => a.courseId === CID && a.isPublished !== false && a.unitName)
    .map(a => ({ id: a.id, title: a.title, unit: a.unitName, raw: a.rawScore || 0 }))
    .sort((a, b) => a.unit.localeCompare(b.unit, 'th') || a.title.localeCompare(b.title, 'th'));

const subsScreen = [
    ...submissions.filter(s => s.courseId === CID && s.countedInGrade !== false && !afterLock(s)),
    ...submissionsV2.filter(s => s.courseId === CID && s.countedInGrade !== false && !afterLock(s)),
];

// ── สูตรเรดาร์ตามที่หน้าจอใช้ ───────────────────────────────────────────────
function radar(subs, mode) {
    if (!subs.length) return null;
    const byAssign = {};
    subs.forEach(s => { (byAssign[s.assignmentId] = byAssign[s.assignmentId] || []).push(s); });
    const unique = Object.keys(byAssign).length;
    const rep = Object.values(byAssign).map(arr => {
        if (mode === 'best') return Math.max(...arr.map(s => s.score || 0));
        const sorted = [...arr].sort((a, b) =>
            (new Date(b.submittedAt.__ts)) - (new Date(a.submittedAt.__ts)));
        return sorted[0].score || 0;
    });
    const avgScore = Math.round(rep.reduce((a, b) => a + b, 0) / rep.length);
    const passRate = Math.round(rep.filter(s => s >= 60).length / rep.length * 100);
    const coverage = Math.round(Math.min(100, unique / Math.max(1, TOTAL_ASSIGN) * 100));
    const effort = Math.round(Math.min(100, (subs.length / Math.max(1, unique)) / 5 * 100));
    const improvements = Object.values(byAssign).map(arr => {
        const ts = [...arr].sort((a, b) => (new Date(a.submittedAt.__ts)) - (new Date(b.submittedAt.__ts)));
        return Math.max(...arr.map(s => s.score || 0)) - (ts[0].score || 0);
    });
    const progress = Math.round(Math.min(100, Math.max(0,
        50 + improvements.reduce((a, b) => a + b, 0) / improvements.length)));
    return { avgScore, passRate, coverage, effort, progress, unique, totalSubs: subs.length };
}
const classify = m => {
    if (!m) return 'D';
    if (m.avgScore >= 65 && m.passRate >= 60 && m.coverage >= 60) return 'A';
    if (m.avgScore >= 60 && m.passRate >= 55 && m.coverage < 60) return 'B';
    if (m.coverage >= 50 && m.effort >= 50) return 'C';
    return 'D';
};
const GROUP = {
    A: ['คุณภาพสูงรอบด้าน', 'คะแนนสูง ผ่านสูง ครอบคลุมดี พร้อมรับความท้าทาย', 'Challenge Coach + โจทย์ Hard + โปรเจคพิเศษ'],
    B: ['ทำน้อยแต่แม่น', 'คะแนนสูง ผ่านสูง แต่ทำโจทย์น้อย ครอบคลุมต่ำ', 'กระตุ้นสำรวจโจทย์เพิ่ม + Gamification Streak'],
    C: ['พยายามแต่ยังไม่แม่น', 'ทำโจทย์เยอะ ครอบคลุมดี แต่ความแม่นยำยังไม่พอ', 'AI Scaffolding (คำใบ้) + Trace Table ก่อน Code'],
    D: ['ต้องการแรงหนุน', 'ยังไม่เริ่มหรือยังทำได้น้อยในทุกมิติ', 'Mindset Coach + จับคู่เพื่อนช่วยเพื่อน + ลดความยากของโจทย์'],
};

const lvOf = e => { const m = /^hint_level_(\d)/.exec(e || ''); return m ? parseInt(m[1], 10) : null; };
const gradedByTitle = {}; graded.forEach(a => gradedByTitle[a.title] = a);

const R = [];
const P = (...a) => R.push(a.join(' '));

P('# CASE_PROFILES — รายงานรายบุคคลของกรณีศึกษา S30, S21, S32');
P('');
P('รายวิชา ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น ภาคเรียนที่ 1/2569 · `courses/' + CID + '`  ');
P('**อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลใด ๆ**  ');
P('ดึงข้อมูล ' + new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + ' น.');
P('');
P('> ตามที่กำหนด รายงานนี้ **ไม่ระบุเวลาที่ใช้ทำโจทย์ และไม่ระบุจำนวนครั้งที่กดรันก่อนส่ง**');
P('');

// ── สูตรกลาง ────────────────────────────────────────────────────────────────
P('## สูตรที่หน้าจอใช้คำนวณกราฟเรดาร์ 5 มิติ');
P('');
P('อ้างอิง `js/pages/teacher/StudentAnalytics.js` ส่วน `_StudentRadarChart` ' +
    'ทุกมิติปรับเป็นสเกล 0-100 และใช้ "คะแนนตัวแทนต่อกิจกรรม" หนึ่งค่าเท่านั้น ' +
    'ในโหมดคะแนนล่าสุดคือคะแนนของการส่งครั้งหลังสุดของกิจกรรมนั้น');
P('');
P('| มิติ | สูตร | หมายเหตุ |');
P('|---|---|---|');
P('| คะแนนเฉลี่ย | ค่าเฉลี่ยของคะแนนตัวแทนทุกกิจกรรมที่เคยส่ง | หน่วยเป็นร้อยละอยู่แล้ว |');
P('| อัตราผ่าน | สัดส่วนกิจกรรมที่คะแนนตัวแทน ≥ 60 | เกณฑ์ 60 ไม่ใช่ 100 |');
P('| ครอบคลุม | (จำนวนกิจกรรมที่เคยส่ง ÷ จำนวนกิจกรรมทั้งหมดในรายวิชา) × 100 | ตัวหารคือ **' +
    TOTAL_ASSIGN + '** ซึ่งรวมกิจกรรมที่ยังไม่เผยแพร่ด้วย ไม่ใช่ 20 กิจกรรมที่นับคะแนน |');
P('| ความพยายาม | min(100, (จำนวนการส่งทั้งหมด ÷ จำนวนกิจกรรมที่เคยส่ง) ÷ 5 × 100) | ส่งเฉลี่ย 5 ครั้งต่อข้อ = 100 |');
P('| พัฒนาการ | min(100, max(0, 50 + ค่าเฉลี่ยของ (คะแนนสูงสุด − คะแนนครั้งแรก) ต่อกิจกรรม)) | ไม่พัฒนาเลย = 50 |');
P('');
P('**ข้อควรระวังสองข้อ**');
P('');
P('1. มิติ "พัฒนาการ" ใช้ (สูงสุด − ครั้งแรก) เสมอ **ไม่เปลี่ยนตามโหมดที่เลือก** ค่าจึงเท่ากันทั้งโหมดคะแนนสูงสุดและคะแนนล่าสุด');
P('2. แท็บ "กลุ่มผู้เรียน" จัดกลุ่ม A-D จากสูตรเดียวกันแต่ **ใช้โหมดคะแนนสูงสุดเสมอ** ' +
    'ไม่ได้ใช้โหมดคะแนนล่าสุด รายงานนี้จึงแสดงทั้งสองค่าเพื่อไม่ให้สับสน');
P('');
P('**เกณฑ์จัดกลุ่ม** (`classifyProfile` ไล่ตามลำดับ A → B → C → D ข้อแรกที่เข้าเกณฑ์ชนะ)');
P('');
P('```text');
P('A: คะแนนเฉลี่ย >= 65 และ อัตราผ่าน >= 60 และ ครอบคลุม >= 60');
P('B: คะแนนเฉลี่ย >= 60 และ อัตราผ่าน >= 55 และ ครอบคลุม < 60');
P('C: ครอบคลุม >= 50 และ ความพยายาม >= 50');
P('D: นอกเหนือจากนั้น');
P('```');
P('');

const csvRows = [['S-code', 'มิติ', 'โหมดคะแนนล่าสุด', 'โหมดคะแนนสูงสุด']];

TARGETS.forEach(scode => {
    const s = students.find(x => x.scode === scode);
    const mySubs = subsScreen.filter(x => x.studentId === s.uid);
    const mLatest = radar(mySubs, 'latest');
    const mBest = radar(mySubs, 'best');
    const gLatest = classify(mLatest), gBest = classify(mBest);

    P('---');
    P('');
    P('## ' + scode);
    P('');

    // 1) เรดาร์
    P('### 1. กราฟเรดาร์ 5 มิติ');
    P('');
    P('| มิติ | โหมดคะแนนล่าสุด | โหมดคะแนนสูงสุด (ที่หน้าจอใช้จัดกลุ่ม) |');
    P('|---|---|---|');
    [['คะแนนเฉลี่ย', 'avgScore'], ['อัตราผ่าน', 'passRate'], ['ครอบคลุม', 'coverage'],
     ['ความพยายาม', 'effort'], ['พัฒนาการ', 'progress']].forEach(([label, k]) => {
        P('| ' + label + ' | **' + mLatest[k] + '%** | ' + mBest[k] + '% |');
        csvRows.push([scode, label, mLatest[k], mBest[k]]);
    });
    P('');
    P('ฐานการคำนวณ กิจกรรมที่เคยส่ง ' + mLatest.unique + ' จาก ' + TOTAL_ASSIGN +
        ' กิจกรรม · การส่งรวม ' + mLatest.totalSubs + ' ครั้ง · ส่งเฉลี่ย ' +
        f2(mLatest.totalSubs / mLatest.unique) + ' ครั้งต่อกิจกรรม');
    P('');

    // 2) กลุ่ม
    P('### 2. กลุ่มผู้เรียนที่ระบบจัดให้');
    P('');
    P('| การจัดกลุ่ม | กลุ่ม | ชื่อกลุ่ม | ลักษณะ | แนวทางที่ระบบเสนอ |');
    P('|---|---|---|---|---|');
    P('| **ที่หน้าจอแสดงจริง** (โหมดคะแนนสูงสุด) | **' + gBest + '** | ' + GROUP[gBest][0] + ' | ' +
        GROUP[gBest][1] + ' | ' + GROUP[gBest][2] + ' |');
    P('| ถ้าใช้โหมดคะแนนล่าสุด | ' + gLatest + ' | ' + GROUP[gLatest][0] + ' | ' +
        GROUP[gLatest][1] + ' | ' + GROUP[gLatest][2] + ' |');
    P('');
    if (gBest !== gLatest) {
        P('> ' + scode + ' เปลี่ยนกลุ่มเมื่อเปลี่ยนโหมด ถ้าจะอ้างกลุ่มในเล่มต้องระบุโหมดกำกับด้วย');
        P('');
    }

    // 3) การแจ้งเตือนความเสี่ยง
    const risk = coach.filter(c => c.uid === s.uid && c.coachRole === 'predictive')
        .map(c => ({ level: /risk_high/.test(c.triggerEvent || '') ? 'สูง' :
            /risk_medium/.test(c.triggerEvent || '') ? 'ปานกลาง' : 'อื่น',
            at: dt(c.createdAt), response: c.response }))
        .filter(x => x.at).sort((a, b) => a.at - b.at);
    P('### 3. การแจ้งเตือนความเสี่ยงรายเดือน');
    P('');
    if (!risk.length) {
        P('ไม่มีข้อมูล ผู้เรียนคนนี้ไม่มีระเบียนการแจ้งเตือนความเสี่ยงในฐานข้อมูล');
        P('');
    } else {
        const months = [...new Set(risk.map(x => ym(x.at)))].sort();
        P('| เดือน | เสี่ยงสูง | เสี่ยงปานกลาง | รวม |');
        P('|---|---|---|---|');
        months.forEach(m => {
            const inM = risk.filter(x => ym(x.at) === m);
            P('| ' + m + ' | ' + inM.filter(x => x.level === 'สูง').length + ' | ' +
                inM.filter(x => x.level === 'ปานกลาง').length + ' | ' + inM.length + ' |');
        });
        P('| **รวม** | **' + risk.filter(x => x.level === 'สูง').length + '** | **' +
            risk.filter(x => x.level === 'ปานกลาง').length + '** | **' + risk.length + '** |');
        P('');
        P('> **วิธีอ่านตัวเลขนี้** ระบบเรียกการประเมินความเสี่ยงทุกครั้งที่ผู้เรียนเปิดหน้าแดชบอร์ด ' +
            'ไม่ได้บันทึกครั้งเดียวต่อหนึ่งเหตุการณ์ จำนวนครั้งจึงสะท้อนจำนวนครั้งที่เปิดหน้าจอขณะอยู่ในสถานะเสี่ยง ' +
            'ถ้าจะใช้ในเล่มควรรายงานเป็นช่วงเดือนที่เคยถูกแจ้งเตือน ไม่ใช่จำนวนครั้ง');
        P('');
        const ex = risk.find(x => x.level === 'สูง') || risk[0];
        P('**ตัวอย่างข้อความที่ระบบแสดงต่อผู้เรียน** (ระดับเสี่ยง' + ex.level + ' · ' + th(ex.at) + ')');
        P('');
        P('```text');
        P((ex.response || '(ไม่มีข้อความ)').trim());
        P('```');
        P('');
    }

    // 4) Mindset / Challenge
    const mc = coach.filter(c => c.uid === s.uid && (c.coachRole === 'mindset' || c.coachRole === 'challenge'))
        .map(c => ({ role: c.coachRole, at: dt(c.createdAt), trig: c.triggerEvent }))
        .filter(x => x.at).sort((a, b) => a.at - b.at);
    P('### 4. Mindset Coach และ Challenge Coach รายเดือน');
    P('');
    if (!mc.length) {
        P('ไม่มีข้อมูล');
        P('');
    } else {
        const months = [...new Set(mc.map(x => ym(x.at)))].sort();
        P('| เดือน | Mindset Coach | Challenge Coach |');
        P('|---|---|---|');
        months.forEach(m => P('| ' + m + ' | ' + mc.filter(x => ym(x.at) === m && x.role === 'mindset').length +
            ' | ' + mc.filter(x => ym(x.at) === m && x.role === 'challenge').length + ' |'));
        P('| **รวม** | **' + mc.filter(x => x.role === 'mindset').length + '** | **' +
            mc.filter(x => x.role === 'challenge').length + '** |');
        P('');
        P('Mindset Coach ขึ้นเองเมื่อส่งแล้วได้ต่ำกว่า 60 ติดกันตั้งแต่ 3 ครั้ง ' +
            'ส่วน Challenge Coach ขึ้นเมื่อได้คะแนนตั้งแต่ 90 ขึ้นไป ทั้งสองอย่างระบบเรียกให้เอง ผู้เรียนไม่ได้กดขอ');
        P('');
    }

    // 5) คะแนนครั้งล่าสุดรายกิจกรรม
    P('### 5. คะแนนครั้งล่าสุดรายกิจกรรมทั้ง ' + graded.length + ' ข้อ');
    P('');
    P('| กิจกรรม | หน่วย | คะแนนดิบเต็ม | ครั้งที่ส่ง | คะแนนครั้งล่าสุด | คะแนนดิบที่ได้ | วันที่ส่งครั้งล่าสุด |');
    P('|---|---|---|---|---|---|---|');
    let earned = 0, totRaw = 0;
    graded.forEach(a => {
        const mine = submissions.filter(x => x.studentId === s.uid && x.assignmentId === a.id &&
            x.countedInGrade !== false && !afterLock(x))
            .map(x => ({ ...x, _at: dt(x.submittedAt) })).filter(x => x._at).sort((p, q) => p._at - q._at);
        const last = mine[mine.length - 1];
        const pct = last ? (last.score || 0) : 0;
        const got = a.raw > 0 && last ? Math.round(pct * a.raw / 100) : 0;
        earned += got; totRaw += a.raw;
        P('| ' + codeOf(a.title) + ' | ' + (a.unit.match(/\d+/) || ['?'])[0] + ' | ' + a.raw + ' | ' +
            mine.length + ' | ' + (last ? pct + '%' : 'ไม่ส่ง') + ' | ' + got + ' | ' +
            (last ? th(last._at).slice(0, 10) : '-') + ' |');
    });
    P('| **รวม** | | **' + totRaw + '** | | | **' + earned + '** | |');
    P('');
    P('คะแนน E1 ของ ' + scode + ' = ' + earned + ' ÷ ' + totRaw + ' × 100 = **' +
        f2(earned / totRaw * 100) + '%**');
    P('');

    // 6) คำใบ้รายกิจกรรม
    const hints = coach.filter(c => c.uid === s.uid && c.coachRole === 'socratic' && lvOf(c.triggerEvent))
        .map(c => ({ level: lvOf(c.triggerEvent), title: c.relatedId || '', at: dt(c.createdAt),
            inCourse: !!gradedByTitle[c.relatedId] }))
        .filter(x => x.at);
    P('### 6. การขอคำใบ้รายกิจกรรม แยกระดับ (coachInteractions)');
    P('');
    if (!hints.length) {
        P('ไม่มีข้อมูล ผู้เรียนคนนี้ไม่มีระเบียนการขอคำใบ้ใน `coachInteractions`');
        P('');
    } else {
        P('| กิจกรรม | ระดับ 1 | ระดับ 2 | ระดับ 3 | ระดับ 4 | รวม |');
        P('|---|---|---|---|---|---|');
        const titles = [...new Set(hints.map(h => h.title))]
            .sort((a, b) => codeOf(a).localeCompare(codeOf(b), 'th'));
        titles.forEach(t => {
            const inT = hints.filter(h => h.title === t);
            const lv = [1, 2, 3, 4].map(l => inT.filter(h => h.level === l).length);
            P('| ' + codeOf(t) + (gradedByTitle[t] ? '' : ' *(ไม่อยู่ใน 20 ข้อที่นับคะแนน)*') + ' | ' +
                lv.join(' | ') + ' | ' + inT.length + ' |');
        });
        const all = [1, 2, 3, 4].map(l => hints.filter(h => h.level === l).length);
        P('| **รวม** | **' + all.join('** | **') + '** | **' + hints.length + '** |');
        P('');
        P('ขอคำใบ้รวม ' + hints.length + ' ครั้ง ในจำนวนนี้เป็นระดับ 3 ขึ้นไป ' +
            (all[2] + all[3]) + ' ครั้ง (ร้อยละ ' + f2((all[2] + all[3]) / hints.length * 100) + ')');
        P('');
    }
});

P('---');
P('');
P('**ไฟล์แนบ** `CASE_PROFILES_radar.csv` ค่ากราฟเรดาร์ทั้งสองโหมดของทั้งสามคน');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'CASE_PROFILES.md'), R.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(OUT, 'CASE_PROFILES_radar.csv'),
    '﻿' + csvRows.map(r => r.join(',')).join('\n'), 'utf8');
console.log('เขียน docs/report-exports-2569-09/CASE_PROFILES.md (' + R.length + ' บรรทัด)');

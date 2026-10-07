#!/usr/bin/env node
/**
 * tools/report/e1-problems.js — รายละเอียดโจทย์ที่นับคะแนน E1 ทั้งหมด
 * อ่านจากแคชอย่างเดียว ไม่เขียน Firestore
 * ผลลัพธ์: docs/report-exports-2569-09/E1_PROBLEMS.md + E1_PROBLEMS_testcases.csv
 */
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(ROOT, 'backups', 'report-cache');
const OUT = path.join(ROOT, 'docs', 'report-exports-2569-09');
const L = n => JSON.parse(fs.readFileSync(path.join(CACHE, n + '.json'), 'utf8'));

const CID = 'UZGy0pGurry9Dt9YdhYX';
const users = L('users'), enrollments = L('enrollments'), assignments = L('assignments'),
    submissions = L('submissions'), testcases = L('testcases'), courses = L('courses');

const dt = v => v && v.__ts ? new Date(v.__ts) : null;
const th = d => d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);
const nl = s => (s || '').replace(/\r\n/g, '\n').replace(/\n/g, '\\n');

const course = courses.find(c => c.id === CID);
const lockedSec = course && course.gradesLocked ? new Date(course.gradesLockedAt.__ts).getTime() / 1000 : null;
const afterLock = s => lockedSec !== null && (new Date(s.submittedAt.__ts).getTime() / 1000) > lockedSec;

const userById = {}; users.forEach(u => userById[u.id] = u);
const students = [...new Set(enrollments.filter(e => e.courseId === CID).map(e => e.studentId))]
    .filter(id => userById[id]);
const isStudent = uid => students.includes(uid);

const codeOf = t => { const m = /กิจกรรม\s*([0-9]+-[A-Z][0-9]?)/.exec(t || ''); return m ? m[1] : (t || ''); };
const unitNo = u => parseInt((String(u).match(/\d+/) || [99])[0], 10);

const graded = assignments
    .filter(a => a.courseId === CID && a.isPublished !== false && a.unitName)
    .sort((a, b) => unitNo(a.unitName) - unitNo(b.unitName) ||
        codeOf(a.title).localeCompare(codeOf(b.title), 'en'));
const totalRaw = graded.reduce((s, a) => s + (a.rawScore || 0), 0);

// ── สถิติการใช้งานต่อข้อ (เกณฑ์คะแนนครั้งล่าสุด) ────────────────────────────
function statsOf(a) {
    const subs = submissions.filter(s => s.assignmentId === a.id && isStudent(s.studentId) &&
        s.countedInGrade !== false && !afterLock(s))
        .map(s => ({ ...s, _at: dt(s.submittedAt) })).filter(s => s._at)
        .sort((x, y) => x._at - y._at);
    const byStudent = {};
    subs.forEach(s => {
        const b = byStudent[s.studentId] || { n: 0, first: null, last: 0, best: -1, lastAt: null };
        b.n++; if (b.first === null) b.first = s.score || 0;
        b.last = s.score || 0; b.lastAt = s._at;
        if ((s.score || 0) > b.best) b.best = s.score || 0;
        byStudent[s.studentId] = b;
    });
    const vals = Object.values(byStudent);
    return {
        subs, n: subs.length, nStudents: vals.length,
        avgLast: vals.length ? vals.reduce((x, v) => x + v.last, 0) / vals.length : 0,
        full: vals.filter(v => v.last === 100).length,
        firstTryFull: vals.filter(v => v.first === 100).length,
        avgTries: vals.length ? subs.length / vals.length : 0,
        notSubmitted: students.length - vals.length,
        earned: vals.reduce((x, v) => x + Math.round(v.last * (a.rawScore || 0) / 100), 0),
    };
}

// ── กรณีทดสอบที่ตรวจพบว่าไม่สอดคล้อง (จาก AUDIT_1C.md) ──────────────────────
const FLAGGED = {
    '1-C': 'กรณีทดสอบทั้งสามไม่สอดคล้องกัน กรณีที่ 1-2 ใช้สูตร 2·√(ฐาน²+สูง²) ซึ่งไม่ใช่สูตรสามเหลี่ยมหน้าจั่วตามโจทย์ ' +
        'ส่วนกรณีที่ 3 (ซ่อน) ไม่ตรงกับสูตรใดเลย จึงไม่มีโปรแกรมที่เขียนด้วยสูตรเดียวแล้วผ่านครบทั้งสามกรณี ดู `AUDIT_1C.md` ข้อ 3',
    '3-A5': 'กรณีที่ 5 (ซ่อน) คาดคำตอบไว้ 2,143,426,800 แต่สูตรจากโจทย์ให้ 2,143,392,300 ต่างกัน 34,500 ' +
        'อีกสี่กรณีตรงกับสูตรทุกประการ ดู `AUDIT_1C.md` ข้อ 8.1',
};

const R = [];
const P = (...a) => R.push(a.join(' '));

P('# E1_PROBLEMS — รายละเอียดโจทย์ที่นับคะแนน E1 ทั้งหมด');
P('');
P('รายวิชา ' + course.title + ' · `courses/' + CID + '`  ');
P('**อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลใด ๆ**  ');
P('ดึงข้อมูล ' + new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + ' น.');
P('');
P('> **ข้อควรระวังก่อนเผยแพร่** เอกสารนี้มี**ผลลัพธ์ที่คาดไว้ของกรณีทดสอบแบบซ่อน**ครบทุกข้อ ' +
    'เหมาะสำหรับแนบภาคผนวกของเล่มรายงานหรือส่งให้กรรมการตรวจ **ห้ามเผยแพร่ให้ผู้เรียนที่ยังเรียนรายวิชานี้อยู่**');
P('');

// ── ภาพรวม ─────────────────────────────────────────────────────────────────
const allStats = {}; graded.forEach(a => allStats[a.id] = statsOf(a));
const units = [...new Set(graded.map(a => a.unitName))].sort((a, b) => unitNo(a) - unitNo(b));

P('## ภาพรวม');
P('');
P('| รายการ | ค่า |');
P('|---|---|');
P('| กิจกรรมที่นับคะแนน | ' + graded.length + ' ข้อ |');
P('| คะแนนดิบรวม | ' + totalRaw + ' คะแนน |');
P('| หน่วยการเรียนรู้ | ' + units.length + ' หน่วย |');
P('| กรณีทดสอบรวม | ' + graded.reduce((s, a) => s + (testcases[a.id] || []).length, 0) + ' กรณี |');
P('| ผู้เรียนในรายวิชา | ' + students.length + ' คน |');
P('| เกณฑ์คิดคะแนน | ' + (course.gradingPolicy === 'latest' ? 'คะแนนครั้งล่าสุด' : 'คะแนนสูงสุด') + ' |');
P('| สถานะคะแนน | ' + (course.gradesLocked ? 'ปิดรับคะแนนแล้ว เมื่อ ' +
    th(dt(course.gradesLockedAt)) + ' น.' : 'ยังเปิดรับ') + ' |');
P('');

P('### สรุปรายข้อ');
P('');
P('| # | รหัส | ชื่อกิจกรรม | หน่วย | ระดับ | คะแนนดิบ | กรณีทดสอบ (เปิด/ซ่อน) | ผู้ส่ง | การส่งรวม | ส่งเฉลี่ย/คน | คะแนนเฉลี่ย | ได้เต็ม | เต็มตั้งแต่ครั้งแรก |');
P('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
graded.forEach((a, i) => {
    const ts = testcases[a.id] || [], st = allStats[a.id];
    const open = ts.filter(t => !t.isHidden).length;
    P('| ' + (i + 1) + ' | **' + codeOf(a.title) + '** | ' + a.title.replace(/^กิจกรรม\s*[0-9]+-[A-Z][0-9]?[:\s]*/, '') +
        ' | ' + unitNo(a.unitName) + ' | ' + (a.difficulty || '-') + ' | ' + (a.rawScore || 0) +
        ' | ' + ts.length + ' (' + open + '/' + (ts.length - open) + ') | ' + st.nStudents + ' | ' + st.n +
        ' | ' + f1(st.avgTries) + ' | ' + f1(st.avgLast) + '% | ' + st.full + ' | ' + st.firstTryFull + ' |');
});
P('');
P('คอลัมน์ "คะแนนเฉลี่ย" "ได้เต็ม" และ "เต็มตั้งแต่ครั้งแรก" คิดจาก**ผู้ที่ส่งงาน**ตามเกณฑ์คะแนนครั้งล่าสุด ' +
    'ผู้ที่ไม่เคยส่งนับเป็น 0 ในการคิด E1 แต่ไม่นำมาหาค่าเฉลี่ยในตารางนี้');
P('');

// ── สรุปรายหน่วย ────────────────────────────────────────────────────────────
P('### สรุปรายหน่วย');
P('');
P('| หน่วย | ชื่อหน่วย | จำนวนข้อ | คะแนนดิบ | สัดส่วน | กรณีทดสอบ |');
P('|---|---|---|---|---|---|');
units.forEach(u => {
    const inU = graded.filter(a => a.unitName === u);
    const raw = inU.reduce((s, a) => s + (a.rawScore || 0), 0);
    const uName = u.replace(/^หน่วยที่\s*\d+[:\s]*/, '').trim() || '(ไม่ได้ตั้งชื่อหน่วยในระบบ)';
    P('| ' + unitNo(u) + ' | ' + uName + ' | ' + inU.length + ' | ' + raw +
        ' | ' + f1(raw / totalRaw * 100) + '% | ' +
        inU.reduce((s, a) => s + (testcases[a.id] || []).length, 0) + ' |');
});
P('| **รวม** | | **' + graded.length + '** | **' + totalRaw + '** | **100.0%** | **' +
    graded.reduce((s, a) => s + (testcases[a.id] || []).length, 0) + '** |');
P('');

// ── รายละเอียดรายข้อ ────────────────────────────────────────────────────────
P('---');
P('');
P('## รายละเอียดรายข้อ');
P('');
const csv = [['รหัสกิจกรรม', 'ชื่อกิจกรรม', 'หน่วย', 'คะแนนดิบ', 'กรณีทดสอบที่',
    'เปิด/ซ่อน', 'น้ำหนัก', 'ข้อมูลเข้า', 'ผลที่คาด']];

graded.forEach((a, i) => {
    const ts = (testcases[a.id] || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
    const st = allStats[a.id];
    const code = codeOf(a.title);

    P('### ' + (i + 1) + '. ' + a.title);
    P('');
    P('| รายการ | ค่า |');
    P('|---|---|');
    P('| รหัสกิจกรรม | **' + code + '** |');
    P('| หน่วยการเรียนรู้ | ' + a.unitName + ' |');
    if (a.topicName) P('| หัวข้อ | ' + a.topicName + ' |');
    P('| ประเภท | ' + (a.assignmentType || '-') + ' |');
    P('| ระดับความยาก | ' + (a.difficulty || '-') + ' |');
    P('| ภาษาที่ใช้ | ' + (a.language || '-') + ' |');
    P('| คะแนนดิบ | ' + (a.rawScore || 0) + ' คะแนน (' + f1((a.rawScore || 0) / totalRaw * 100) + '% ของ E1) |');
    P('| ขีดจำกัดเวลา / หน่วยความจำ | ' + (a.timeLimit || '-') + ' วินาที / ' + (a.memoryLimit || '-') + ' |');
    P('| สร้างเมื่อ | ' + (a.createdAt ? th(dt(a.createdAt)).slice(0, 10) : '-') + ' |');
    P('| `assignmentId` | `' + a.id + '` |');
    P('');

    P('**โจทย์ที่ผู้เรียนเห็น**');
    P('');
    P('```text');
    P((a.description || '(ไม่มีข้อความโจทย์)').trim());
    P('```');
    P('');

    P('**กรณีทดสอบ ' + ts.length + ' กรณี** (น้ำหนักรวม ' +
        ts.reduce((s, t) => s + (t.points || 1), 0) + ' · คะแนนร้อยละ = ผลรวมน้ำหนักที่ผ่าน ÷ น้ำหนักรวม × 100)');
    P('');
    if (!ts.length) {
        P('*ไม่พบกรณีทดสอบของกิจกรรมนี้*');
        P('');
    } else {
        P('| ที่ | เปิด/ซ่อน | น้ำหนัก | ข้อมูลเข้า | ผลที่คาด | ผู้ผ่าน (ครั้งล่าสุด) |');
        P('|---|---|---|---|---|---|');
        ts.forEach(t => {
            const pass = st.subs.length ? (() => {
                const lastBy = {};
                st.subs.forEach(s => lastBy[s.studentId] = s);
                const arr = Object.values(lastBy);
                const ok = arr.filter(s => (s.testResults || []).some(r => r.testCaseId === t.id && r.passed)).length;
                return ok + '/' + arr.length;
            })() : '-';
            P('| ' + (t.order || '?') + ' | ' + (t.isHidden ? 'ซ่อน' : 'เปิด') + ' | ' + (t.points || 1) +
                ' | `' + (nl(t.input) || '(ไม่มีข้อมูลเข้า)') + '` | `' + nl(t.expectedOutput) + '` | ' + pass + ' |');
            csv.push([code, a.title, unitNo(a.unitName), a.rawScore || 0, t.order || '',
                t.isHidden ? 'ซ่อน' : 'เปิด', t.points || 1,
                '"' + String(t.input || '').replace(/"/g, '""') + '"',
                '"' + String(t.expectedOutput || '').replace(/"/g, '""') + '"']);
        });
        P('');
    }

    P('**ผลการใช้งานจริง**');
    P('');
    P('| รายการ | ค่า |');
    P('|---|---|');
    P('| ผู้เรียนที่ส่งงาน | ' + st.nStudents + ' จาก ' + students.length + ' คน' +
        (st.notSubmitted ? ' (ไม่ส่ง ' + st.notSubmitted + ' คน)' : '') + ' |');
    P('| การส่งงานรวม | ' + st.n + ' ครั้ง · เฉลี่ย ' + f2(st.avgTries) + ' ครั้งต่อคน |');
    P('| คะแนนเฉลี่ยครั้งล่าสุด | ' + f2(st.avgLast) + '% |');
    P('| ได้คะแนนเต็มในครั้งล่าสุด | ' + st.full + ' คน |');
    P('| ได้เต็มตั้งแต่ส่งครั้งแรก | ' + st.firstTryFull + ' คน |');
    P('| คะแนนดิบที่ผู้เรียนทำได้รวม | ' + st.earned + ' จาก ' + ((a.rawScore || 0) * students.length) + ' |');
    P('');

    if (FLAGGED[code]) {
        P('> **ข้อสังเกตเรื่องกรณีทดสอบ** ' + FLAGGED[code]);
        P('');
    }
});

P('---');
P('');
P('**ไฟล์แนบ** `E1_PROBLEMS_testcases.csv` กรณีทดสอบทุกข้อในรูปแบบตารางเดียว เปิดใน Excel ได้');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'E1_PROBLEMS.md'), R.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(OUT, 'E1_PROBLEMS_testcases.csv'),
    '﻿' + csv.map(r => r.join(',')).join('\n'), 'utf8');
console.log('เขียน docs/report-exports-2569-09/E1_PROBLEMS.md (' + R.length + ' บรรทัด)');
console.log('เขียน docs/report-exports-2569-09/E1_PROBLEMS_testcases.csv (' + (csv.length - 1) + ' กรณีทดสอบ)');
console.log('กิจกรรม ' + graded.length + ' ข้อ · คะแนนดิบรวม ' + totalRaw);

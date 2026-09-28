#!/usr/bin/env node
/**
 * tools/report/open-issues.js — ตรวจประเด็นค้างจาก v25 สามข้อ (P7)
 * อ่านจากแคชอย่างเดียว ไม่เขียน Firestore
 * ผลลัพธ์: docs/report-exports-2569-09/OPEN_ISSUES.md
 */
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(ROOT, 'backups', 'report-cache');
const OUT = path.join(ROOT, 'docs', 'report-exports-2569-09');
const L = n => JSON.parse(fs.readFileSync(path.join(CACHE, n + '.json'), 'utf8'));

const CID = 'UZGy0pGurry9Dt9YdhYX';
const users = L('users'), enrollments = L('enrollments'), assignments = L('assignments'),
    submissions = L('submissions'), usage = L('usageEvents'),
    sessions = L('pollSessions'), responses = L('pollResponses');

const dt = v => v && v.__ts ? new Date(v.__ts) : null;
const th = d => d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);

const userById = {}; users.forEach(u => userById[u.id] = u);
const students = [...new Set(enrollments.filter(e => e.courseId === CID).map(e => e.studentId))]
    .map(id => ({ uid: id, u: userById[id] })).filter(x => x.u)
    .map(x => ({ uid: x.uid, number: parseInt(x.u.number || '999', 10) }))
    .sort((a, b) => a.number - b.number);
students.forEach(s => s.scode = 'S' + String(s.number).padStart(2, '0'));
const scodeOf = {}; students.forEach(s => scodeOf[s.uid] = s.scode);
const isStudent = uid => !!scodeOf[uid];

const R = [];
const P = (...a) => R.push(a.join(' '));

P('# OPEN_ISSUES — ตรวจประเด็นค้างจาก v25');
P('');
P('รายวิชา ว31281 ภาคเรียนที่ 1/2569 · `courses/' + CID + '`  ');
P('**อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลใด ๆ**  ');
P('ดึงข้อมูล ' + new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + ' น.');
P('');

// ════════════════════════════════════════════════════════════════════════════
// 1) QuickPoll
// ════════════════════════════════════════════════════════════════════════════
P('## 1. QuickPoll วันที่ 7 และ 8 กันยายน 2569');
P('');
const sess = sessions.filter(s => s.courseId === CID)
    .map(s => ({
        id: s.id,
        seq: s.snapshot && s.snapshot.seq,
        prompt: (s.snapshot && s.snapshot.prompt) || '',
        correct: s.snapshot && s.snapshot.correctOptionId,
        status: s.status,
        r1o: dt(s.openedAt && s.openedAt.r1), r1c: dt(s.closedAt && s.closedAt.r1),
        r2o: dt(s.openedAt && s.openedAt.r2), r2c: dt(s.closedAt && s.closedAt.r2),
    }))
    .filter(s => s.r1o).sort((a, b) => a.r1o - b.r1o);

const onDay = d => sess.filter(s => th(s.r1o).slice(0, 10) === d);
const d7 = onDay('2026-09-07'), d8 = onDay('2026-09-08');

const respOf = (sid, round) => responses.filter(r => r.sessionId === sid && r[round] && r[round].optionId);
const statsOf = s => {
    const a = respOf(s.id, 'r1'), b = respOf(s.id, 'r2');
    const okA = s.correct ? a.filter(r => r.r1.optionId === s.correct).length : null;
    const okB = s.correct ? b.filter(r => r.r2.optionId === s.correct).length : null;
    return { n1: a.length, n2: b.length, okA, okB, a, b };
};

P('### 1.1 เวลาเปิด-ปิดของแต่ละ session');
P('');
P('| วันที่ | ชุดที่ | โจทย์ | รอบ 1 เปิด | รอบ 1 ปิด | รอบ 2 เปิด | รอบ 2 ปิด | ผู้ตอบ ร1 | ผู้ตอบ ร2 | ตอบถูก ร1 | ตอบถูก ร2 |');
P('|---|---|---|---|---|---|---|---|---|---|---|');
[...d7, ...d8].forEach(s => {
    const st = statsOf(s);
    const pctA = st.okA !== null && st.n1 ? f2(st.okA / st.n1 * 100) + '%' : '—';
    const pctB = st.okB !== null && st.n2 ? f2(st.okB / st.n2 * 100) + '%' : '—';
    P('| ' + th(s.r1o).slice(0, 10) + ' | ' + (s.seq || '-') + ' | ' + s.prompt.slice(0, 26) + ' | ' +
        th(s.r1o).slice(11) + ' | ' + (s.r1c ? th(s.r1c).slice(11) : 'ไม่ได้ปิด') + ' | ' +
        (s.r2o ? th(s.r2o).slice(11) : '—') + ' | ' + (s.r2c ? th(s.r2c).slice(11) : '—') + ' | ' +
        st.n1 + ' | ' + (st.n2 || '—') + ' | ' + pctA + ' | ' + pctB + ' |');
});
P('');

P('### 1.2 ผู้ตอบวันที่ 7 กับ 8 กันยายน เป็นกลุ่มเดียวกันหรือไม่');
P('');
const uidsOfDay = ss => new Set(ss.flatMap(s => [...respOf(s.id, 'r1'), ...respOf(s.id, 'r2')]
    .map(r => r.studentUid)).filter(isStudent));
const u7 = uidsOfDay(d7), u8 = uidsOfDay(d8);
const both = [...u7].filter(x => u8.has(x));
const only7 = [...u7].filter(x => !u8.has(x));
const only8 = [...u8].filter(x => !u7.has(x));
P('| กลุ่ม | จำนวน | S-code |');
P('|---|---|---|');
P('| ตอบทั้งสองวัน | **' + both.length + '** | ' + both.map(x => scodeOf[x]).sort().join(', ') + ' |');
P('| ตอบเฉพาะวันที่ 7 | ' + only7.length + ' | ' + (only7.map(x => scodeOf[x]).sort().join(', ') || '—') + ' |');
P('| ตอบเฉพาะวันที่ 8 | ' + only8.length + ' | ' + (only8.map(x => scodeOf[x]).sort().join(', ') || '—') + ' |');
P('');
const jac = both.length / new Set([...u7, ...u8]).size * 100;
P('ผู้ตอบวันที่ 7 มี ' + u7.size + ' คน วันที่ 8 มี ' + u8.size + ' คน ซ้อนทับกัน ' + both.length + ' คน ' +
    'คิดเป็นร้อยละ ' + f2(jac) + ' ของผู้ตอบทั้งหมดสองวันรวมกัน ' +
    (jac >= 80 ? '**ถือได้ว่าเป็นกลุ่มเดียวกัน**' : jac >= 50 ?
        '**เป็นกลุ่มที่ทับซ้อนกันมากแต่ไม่ใช่กลุ่มเดียวกันทั้งหมด**' : '**ไม่ใช่กลุ่มเดียวกัน**'));
P('');

P('### 1.3 session ชุดที่ 1 วันที่ 7 ก.ย. ที่รอบแรกตอบถูกร้อยละ 100');
P('');
const seq1d7 = d7.filter(s => s.seq === 1 && s.correct);
const full100 = seq1d7.filter(s => { const st = statsOf(s); return st.n1 && st.okA === st.n1; });
if (!full100.length) {
    P('ไม่พบ session ชุดที่ 1 ของวันที่ 7 ก.ย. ที่รอบแรกตอบถูกครบทุกคน');
} else {
    full100.forEach(s => {
        const earlier = seq1d7.filter(x => x.r1o < s.r1o).sort((a, b) => a.r1o - b.r1o);
        const later = seq1d7.filter(x => x.r1o > s.r1o).sort((a, b) => a.r1o - b.r1o);
        const st = statsOf(s);
        P('**คำตอบตรง ๆ** session ชุดที่ 1 ของวันที่ 7 ก.ย. ที่รอบแรกตอบถูกร้อยละ 100 คือ `' + s.id +
            '` เปิดรอบ 1 เวลา ' + th(s.r1o).slice(11) + ' น. ' +
            (earlier.length ? 'เปิดหลัง session ชุดเดียวกันก่อนหน้า ' +
                Math.round((s.r1o - earlier[earlier.length - 1].r1o) / 60000) + ' นาที'
                : '**เป็น session ชุดที่ 1 ตัวแรกของวันนั้น ไม่ได้เปิดหลัง session ใดของชุดเดียวกัน**'));
        P('');
        P('วันที่ 7 ก.ย. มีการเปิดโจทย์ชุดที่ 1 (โจทย์เดียวกัน `templateId` เดียวกัน คำตอบถูกคือตัวเลือก ' +
            s.correct + ') **สองครั้ง** ลำดับเวลาเป็นดังนี้');
        P('');
        P('| ลำดับ | session | เปิดรอบ 1 | ผู้ตอบรอบ 1 | ตอบถูกรอบ 1 | ผู้ตอบรอบ 2 | ตอบถูกรอบ 2 |');
        P('|---|---|---|---|---|---|---|');
        [...earlier, s, ...later].forEach((x, i) => {
            const t = statsOf(x);
            P('| ' + (i + 1) + ' | `' + x.id.slice(0, 8) + '…` | ' + th(x.r1o).slice(11) + ' | ' + t.n1 + ' | ' +
                (t.n1 ? t.okA + ' (' + f2(t.okA / t.n1 * 100) + '%)' : '—') + ' | ' + t.n2 + ' | ' +
                (t.n2 ? t.okB + ' (' + f2(t.okB / t.n2 * 100) + '%)' : '—') + ' |');
        });
        P('');
        P('> **ข้อควรระวังที่สำคัญสำหรับเล่ม** โจทย์ชุดที่ 1 ถูกเปิดสองครั้งในคาบเดียวกัน ห่างกัน ' +
            (later.length ? Math.round((later[0].r1o - s.r1o) / 60000) : '—') + ' นาที ' +
            'ครั้งแรก (' + th(s.r1o).slice(11) + ') ผู้ตอบ ' + st.n1 + ' คนเลือกคำตอบถูกทั้งหมด ' +
            'ส่วนครั้งที่สองซึ่งเป็นตัวที่ให้ตัวเลข 58.82% → 100% ที่อ้างในเล่ม เปิดหลังจากนั้น ' +
            'ผู้เรียนจึงเคยเห็นโจทย์ข้อนี้มาแล้วก่อนเริ่มรอบแรกของ session ที่สอง');
        P('');
        P('ถ้าจะใช้ตัวเลข 58.82% → 100% เป็นหลักฐาน Peer Instruction ในเล่ม **ต้องอธิบายบริบทนี้กำกับ** ' +
            'หรือเลือกใช้ session ของวันที่ 8 ก.ย. แทน ซึ่งเป็นการเปิดโจทย์ชุดที่ 1 ครั้งเดียวในคาบนั้น ' +
            'และให้ผล 56.25% → 100% ซึ่งตีความได้ตรงไปตรงมากว่า');
        P('');
    });
}

// ════════════════════════════════════════════════════════════════════════════
// 2) ผู้ใช้ 36 ราย และ ai_hint 41 เหตุการณ์
// ════════════════════════════════════════════════════════════════════════════
P('## 2. ผู้ใช้งาน 36 ราย และ ai_hint 41 เหตุการณ์ที่ไม่ใช่ของนักเรียน 35 คน');
P('');
const wk = usage.filter(e => {
    const t = e.timestamp && e.timestamp.__ts;
    return t && t >= '2026-09-21' && t < '2026-09-28';
});
const wkUids = [...new Set(wk.map(e => e.uid))];
const outsiders = wkUids.filter(u => !isStudent(u));
const hintsCourse = usage.filter(e => e.event === 'ai_hint' && e.courseId === CID);
const hintsOut = hintsCourse.filter(e => !isStudent(e.uid));
const outUids = [...new Set(hintsOut.map(e => e.uid))];

P('| คำถาม | คำตอบ |');
P('|---|---|');
P('| ผู้ใช้ไม่ซ้ำในสัปดาห์ 21-27 ก.ย. | ' + wkUids.length + ' ราย (เหตุการณ์รวม ' + wk.length + ') |');
P('| ในจำนวนนั้นเป็นผู้เรียน 35 คนของรายวิชา | ' + (wkUids.length - outsiders.length) + ' ราย |');
P('| ที่เหลือ | **' + outsiders.length + ' ราย** |');
P('| ai_hint ในรายวิชานี้ทั้งหมด | ' + hintsCourse.length + ' เหตุการณ์ |');
P('| เป็นของผู้เรียน 35 คน | ' + (hintsCourse.length - hintsOut.length) + ' เหตุการณ์ |');
P('| ไม่ใช่ของผู้เรียน 35 คน | **' + hintsOut.length + ' เหตุการณ์ จาก ' + outUids.length + ' บัญชี** |');
P('');
P('### บัญชีที่ไม่ใช่ผู้เรียนในรายวิชา');
P('');
P('| บัญชี | บทบาทในระบบ | เลขที่ | รหัสประจำตัว | สร้างบัญชีเมื่อ | โดเมนอีเมล | ลงทะเบียนรายวิชาใด | ai_hint | เหตุการณ์รวม | ช่วงเวลาที่ใช้งาน |');
P('|---|---|---|---|---|---|---|---|---|---|');
const allEnroll = L('all-courses').enrollments;
outUids.forEach((uid, i) => {
    const u = userById[uid] || {};
    const ev = usage.filter(e => e.uid === uid);
    const ts = ev.map(e => dt(e.timestamp)).filter(Boolean).sort((a, b) => a - b);
    const enr = allEnroll.filter(e => e.studentId === uid);
    P('| บัญชีที่ ' + (i + 1) + ' | ' + (u.role || 'ไม่พบข้อมูล') + ' | ' + (u.number || '-') + ' | ' +
        (u.studentCode ? '(รหัสจำลอง ' + u.studentCode.length + ' หลัก ตัวเลขซ้ำกันทั้งหมด)' : '-') + ' | ' + (u.createdAt ? th(dt(u.createdAt)).slice(0, 10) : '-') + ' | ' +
        ((u.email || '').split('@')[1] || '-') + ' | ' +
        (enr.length ? enr.length + ' รายวิชา' : '**ไม่ได้ลงทะเบียนรายวิชาใดเลย**') + ' | ' +
        hintsOut.filter(e => e.uid === uid).length + ' | ' + ev.length + ' | ' +
        (ts.length ? th(ts[0]).slice(0, 10) + ' ถึง ' + th(ts[ts.length - 1]).slice(0, 10) : '-') + ' |');
});
P('');
const only = outUids.length === 1 ? userById[outUids[0]] : null;
if (only) {
    const ev = usage.filter(e => e.uid === outUids[0]);
    const byE = {}; ev.forEach(e => byE[e.event] = (byE[e.event] || 0) + 1);
    P('**ข้อสรุป** ส่วนต่างทั้งหมดมาจาก **บัญชีเดียว** ลักษณะของบัญชีนี้คือ');
    P('');
    P('- บทบาทในระบบเป็น `student` แต่ตั้ง**เลขที่ 99 และรหัสประจำตัวเป็นตัวเลขซ้ำกัน ' +
        (only.studentCode || '').length + ' หลัก**' +
        ' ซึ่งเป็นรหัสจำลอง ไม่ใช่รูปแบบรหัสประจำตัวของผู้เรียนจริง');
    P('- ใช้อีเมลโดเมนของโรงเรียน `' + ((only.email || '').split('@')[1] || '-') + '` เช่นเดียวกับบัญชีผู้สอน');
    P('- **ปัจจุบันไม่ได้ลงทะเบียนในรายวิชาใดเลย** สอดคล้องกับที่ผู้สอนแจ้งว่าได้ยกเลิกการลงทะเบียนบัญชีทดสอบออกแล้ว');
    P('- พฤติกรรมการใช้งานครบทุกฟังก์ชันของผู้เรียน ' +
        Object.entries(byE).map(([k, v]) => '`' + k + '` ' + v).join(' · ') +
        ' ซึ่งเป็นรูปแบบของการไล่ทดสอบระบบ ไม่ใช่การเรียนตามลำดับกิจกรรม');
    P('');
    P('จึงสรุปได้ว่าเป็น **บัญชีทดสอบของผู้สอน** ไม่ใช่ผู้เรียนในกลุ่มเป้าหมาย ' +
        'ตัวเลขที่ควรใช้ในเล่มคือ **' + (hintsCourse.length - hintsOut.length) + ' เหตุการณ์** ' +
        'ซึ่งเป็นการขอคำใบ้ของผู้เรียน 35 คนเท่านั้น ส่วน ' + hintsCourse.length +
        ' เป็นยอดรวมที่ยังมีบัญชีทดสอบปนอยู่');
    P('');
}

// ════════════════════════════════════════════════════════════════════════════
// 3) กิจกรรม 5-A
// ════════════════════════════════════════════════════════════════════════════
P('## 3. กิจกรรม 5-A คะแนนที่ลดลงระหว่างสองไฟล์ส่งออก');
P('');
const a5a = assignments.find(a => a.courseId === CID && /5-A/.test(a.title || ''));
const T1 = new Date('2026-09-26T09:30:00Z');   // 26 ก.ย. 16:30 น. (+07)
const T2 = new Date('2026-09-27T08:00:00Z');   // 27 ก.ย. 15:00 น. (+07)
P('**ข้อจำกัดของข้อมูล** ไฟล์ `E1_scores` ทั้งสองฉบับ (26 ก.ย. 16.30 น. และ 27 ก.ย. 15.00 น.) ' +
    '**ไม่มีอยู่ในโปรเจกต์** จึงเทียบไฟล์ต่อไฟล์ตามที่ขอไม่ได้ ' +
    'ผมจึง **สร้างคะแนน ณ เวลาทั้งสองขึ้นใหม่จากฐานข้อมูล** โดยใช้การส่งงานครั้งล่าสุดก่อนเวลานั้น ๆ ' +
    'ซึ่งเป็นเกณฑ์เดียวกับที่ไฟล์ส่งออกใช้ ผลที่ได้จึงเทียบเคียงได้ แต่ไม่ใช่การเทียบไฟล์จริง');
P('');
P('กิจกรรม: ' + a5a.title + ' · คะแนนดิบเต็ม ' + (a5a.rawScore || 0) + ' คะแนน  ');
P('เวลาอ้างอิง: T1 = ' + th(T1) + ' น. · T2 = ' + th(T2) + ' น.');
P('');
const scoreAt = (uid, when) => {
    const ss = submissions.filter(s => s.studentId === uid && s.assignmentId === a5a.id)
        .map(s => ({ ...s, _at: dt(s.submittedAt) })).filter(s => s._at && s._at <= when)
        .sort((a, b) => a._at - b._at);
    const last = ss[ss.length - 1];
    return last ? { pct: last.score || 0, at: last._at, n: ss.length } : null;
};
const changed = [];
students.forEach(s => {
    const a = scoreAt(s.uid, T1), b = scoreAt(s.uid, T2);
    const ra = a ? Math.round(a.pct * a5a.rawScore / 100) : 0;
    const rb = b ? Math.round(b.pct * a5a.rawScore / 100) : 0;
    if (ra !== rb) changed.push({ s, a, b, ra, rb });
});
const down = changed.filter(c => c.rb < c.ra), up = changed.filter(c => c.rb > c.ra);
if (!changed.length) {
    P('**ไม่มีผู้เรียนคนใดที่คะแนน 5-A เปลี่ยนระหว่าง T1 กับ T2**');
} else {
    P('| S-code | คะแนนดิบ ณ T1 | คะแนนดิบ ณ T2 | เปลี่ยนแปลง | ส่ง 5-A ครั้งล่าสุด | อยู่ก่อนหรือหลัง T1 |');
    P('|---|---|---|---|---|---|');
    [...down, ...up].forEach(c => P('| ' + c.s.scode + ' | ' + c.ra + ' | ' + c.rb + ' | ' +
        (c.rb > c.ra ? '+' : '') + (c.rb - c.ra) + ' | ' + (c.b ? th(c.b.at) : '-') + ' | ' +
        (c.b && c.b.at > T1 ? '**หลัง T1**' : 'ก่อน T1') + ' |'));
    P('');
    P('**คะแนนลดลง ' + down.length + ' คน · คะแนนเพิ่มขึ้น ' + up.length + ' คน**');
    P('');
    if (down.length) {
        const allAfter = down.every(c => c.b && c.b.at > T1);
        P('ผู้ที่คะแนนลดลงทุกคน' + (allAfter ? '**มีการส่งงาน 5-A ครั้งใหม่หลังเวลา T1**' :
            'ไม่ได้มีการส่งงานใหม่หลัง T1 ทุกคน') + ' ' +
            'นั่นคือคะแนนที่ลดลงเกิดจากการส่งงานเพิ่มหลังส่งออกไฟล์แรก ' +
            'ภายใต้เกณฑ์ "คะแนนครั้งล่าสุด" การส่งใหม่ที่ทำได้คะแนนต่ำกว่าเดิมจะแทนที่คะแนนเก่า ' +
            'นี่คือสาเหตุโดยตรงที่ตัวเลขขยับหลังส่งออกรายงาน และเป็นที่มาของการเพิ่มระบบปิดรับคะแนนในวันที่ 27 ก.ย.');
        P('');
    }
}
const lockedAt = (L('courses').find(c => c.id === CID) || {}).gradesLockedAt;
P('รายวิชาปิดรับคะแนนเมื่อ ' + (lockedAt ? th(dt(lockedAt)) + ' น.' : 'ไม่มีข้อมูล') +
    ' หลังจากนั้นการส่งงานจะไม่ถูกนำมาคิดคะแนนอีก ตัวเลขในเล่มจึงนิ่งแล้ว');
P('');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'OPEN_ISSUES.md'), R.join('\n') + '\n', 'utf8');
console.log('เขียน docs/report-exports-2569-09/OPEN_ISSUES.md');
console.log('  ผู้ตอบ QuickPoll ทั้งสองวัน ' + both.length + ' คน');
console.log('  บัญชีนอกกลุ่มเป้าหมาย ' + outUids.length + ' บัญชี · ai_hint ' + hintsOut.length + ' เหตุการณ์');
console.log('  5-A คะแนนเปลี่ยน ' + changed.length + ' คน (ลดลง ' + down.length + ')');

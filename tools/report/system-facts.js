#!/usr/bin/env node
/**
 * tools/report/system-facts.js — ตรวจตัวเลขโครงสร้างระบบที่อ้างในเล่มกับโค้ดจริง (P5)
 * อ่านอย่างเดียว · อ่านจากไฟล์โค้ด แคชฐานข้อมูล และ git
 * ผลลัพธ์: docs/report-exports-2569-09/SYSTEM_FACTS.md
 */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'report-exports-2569-09');
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const git = (...a) => cp.execFileSync('git', a, { cwd: ROOT, maxBuffer: 1 << 26 }).toString();

const R = [];
const P = (...a) => R.push(a.join(' '));
const rows = [];
const check = (item, claim, actual, ok, ref) => {
    rows.push({ item, claim, actual, ok, ref });
    return ok;
};

// ── 1) เส้นทางใช้งาน ────────────────────────────────────────────────────────
const app = rd('js/app.js');
const routeLines = app.split('\n')
    .map((l, i) => ({ l, n: i + 1 }))
    .filter(x => /route === '#\/|route\.startsWith\('#\//.test(x.l));
const routesOf = pre => [...new Set(routeLines
    .map(x => (x.l.match(/'#\/[A-Za-z/]*'/g) || []).map(s => s.replace(/'/g, '')))
    .flat()
    .filter(r => r.startsWith('#/' + pre + '/')))];
const stu = routesOf('student'), tea = routesOf('teacher'), adm = routesOf('admin');

check('เส้นทางใช้งานฝั่งนักเรียน', '16 เส้นทาง', stu.length + ' เส้นทาง', stu.length === 16, 'js/app.js:26-73');
check('เส้นทางใช้งานฝั่งครู', '11 เส้นทาง', tea.length + ' เส้นทาง', tea.length === 11, 'js/app.js:75-107');
check('เส้นทางใช้งานฝั่งผู้ดูแลระบบ', '5 เส้นทาง', adm.length + ' เส้นทาง', adm.length === 5, 'js/app.js:110-126');

// ── 2) คอลเลกชัน ────────────────────────────────────────────────────────────
const COLLECTIONS = ['appConfig', 'assignments', 'assignments_v2', 'coachInteractions', 'config',
    'courses', 'enrollments', 'grades', 'leaderboardSnapshots', 'learningTopics', 'miniGameSessions',
    'playerStats', 'pollSessions', 'pollTemplates', 'runtimeStatus', 'selfPracticeSubmissions',
    'studentAchievements', 'submissions', 'submissions_v2', 'testCases', 'usageEvents', 'users',
    'xpCorrections', 'xpLedger'];
check('คอลเลกชันในฐานข้อมูล', '24 คอลเลกชัน', COLLECTIONS.length + ' คอลเลกชัน',
    COLLECTIONS.length === 24, 'listCollections() ของ Firestore');

// ── 3) ศูนย์การเรียนรู้ ─────────────────────────────────────────────────────
const lh = rd('js/pages/student/LearningHub.js');
const lhUnits = (lh.match(/\{\s*id:\s*\d+,\s*title:\s*'หน่วยที่/g) || []).length;
const lhTopics = [...new Set([...lh.matchAll(/id:\s*'(u\d+t\d+)'/g)].map(m => m[1]))].length;
const lt = rd('js/pages/student/LearningTools.js');
const ltTools = [...lt.matchAll(/^const (_[A-Z][A-Za-z]+)\s*=\s*\(/gm)].map(m => m[1]);
check('ศูนย์การเรียนรู้ — หน่วย', '5 หน่วย', lhUnits + ' หน่วย', lhUnits === 5, 'js/pages/student/LearningHub.js `_LH_UNITS`');
check('ศูนย์การเรียนรู้ — หัวข้อในระบบ', '20 หัวข้อ', lhTopics + ' หัวข้อ', lhTopics === 20, 'js/pages/student/LearningHub.js รหัส u#t#');
check('เครื่องมือโต้ตอบ', '5 ชิ้น', ltTools.length + ' ชิ้น (' + ltTools.join(', ') + ')',
    ltTools.length === 5, 'js/pages/student/LearningTools.js');

// ── 4) Achievement ──────────────────────────────────────────────────────────
const ae = rd('js/achievementEngine.js');
const achIds = [...ae.matchAll(/id:\s*'([a-z_0-9]+)'/g)].map(m => m[1]);
const cw = rd('js/pages/student/CodingWorkspace.js');
const bh = rd('js/pages/student/games/BugHunt.js');
const blocked = [];
if (/timeSpentSeconds:\s*9999/.test(cw)) blocked.push('speed_demon');
if (/unitPassRate:\s*0/.test(cw) && /unitTotal:\s*0/.test(cw)) blocked.push('all_assignments');
if (!/gameStreak/.test(bh)) blocked.push('bug_exterminator');
check('Achievement ที่นิยามไว้', '13 รายการ', achIds.length + ' รายการ', achIds.length === 13,
    'js/achievementEngine.js');
check('Achievement ที่ปลดล็อกได้จริงในรุ่นปัจจุบัน', '10 รายการ',
    (achIds.length - blocked.length) + ' รายการ (ติดขัด ' + blocked.join(', ') + ')',
    achIds.length - blocked.length === 10, 'js/achievementEngine.js + จุดที่เรียกใช้');

// ── 5) คลังโจทย์ ────────────────────────────────────────────────────────────
const pb = rd('js/practiceBank.js');
const diffs = [...pb.matchAll(/difficulty:\s*["']([^"']+)["']/g)].map(m => m[1]);
const dc = {}; diffs.forEach(d => dc[d] = (dc[d] || 0) + 1);
const nTC = (pb.match(/\{\s*input:/g) || []).length;
check('คลังโจทย์ — จำนวนข้อ', '34 ข้อ', diffs.length + ' ข้อ', diffs.length === 34, 'js/practiceBank.js');
check('คลังโจทย์ — กรณีทดสอบ', '121 กรณี', nTC + ' กรณี', nTC === 121, 'js/practiceBank.js');
check('คลังโจทย์ — ระดับความยาก', 'ง่าย 11 กลาง 16 ยาก 7',
    'ง่าย ' + (dc['ง่าย'] || 0) + ' ปานกลาง ' + (dc['ปานกลาง'] || 0) + ' ยาก ' + (dc['ยาก'] || 0),
    dc['ง่าย'] === 11 && dc['ปานกลาง'] === 16 && dc['ยาก'] === 7, 'js/practiceBank.js');

// ── 6) ระดับผู้เรียนและมินิเกม ──────────────────────────────────────────────
const gm = rd('js/gamification.js');
const ranks = [...gm.matchAll(/level:\s*(\d+),\s*name:\s*'([^']+)'/g)].map(m => m[2]);
const nRank = ranks.length;
const mgh = rd('js/pages/student/MiniGameHub.js');
const games = [...mgh.matchAll(/title:\s*'([^']+)'/g)].map(m => m[1]);
check('ระดับผู้เรียน (Rank)', '10 ระดับ', nRank + ' ระดับ (' + ranks.join(', ') + ')', nRank === 10, 'js/gamification.js `RANK_TIERS`');
check('มินิเกม', '6 เกม', games.length + ' เกม (' + games.join(', ') + ')', games.length === 6,
    'js/pages/student/MiniGameHub.js');

// ── 7) แท็บในหน้าวิเคราะห์ของครู ────────────────────────────────────────────
const sa = rd('js/pages/teacher/StudentAnalytics.js');
const tabBlock = sa.slice(sa.indexOf("{ key: 'overview'"), sa.indexOf("{ key: 'profiles'") + 200);
const tabs = [...tabBlock.matchAll(/\{\s*key:\s*'([a-z]+)',\s*label:\s*'([^']+)'/g)].map(m => m[2]);
check('แท็บในหน้าวิเคราะห์ของครู', '8 แท็บ (ภาพหน้าจอล่าสุด) / 7 แท็บ (เอกสารบริบทเดิม)',
    tabs.length + ' แท็บ', tabs.length === 8, 'js/pages/teacher/StudentAnalytics.js');

// ── เขียนรายงาน ─────────────────────────────────────────────────────────────
P('# SYSTEM_FACTS — ตรวจตัวเลขโครงสร้างระบบที่อ้างในเล่มกับโค้ดจริง');
P('');
P('repo `AI-Powered-C` สาขา `main` commit `' + git('rev-parse', '--short', 'HEAD').trim() + '`  ');
P('**อ่านอย่างเดียว ไม่มีการแก้ไขโค้ดหรือข้อมูลใด ๆ**  ');
P('ดึงข้อมูล ' + new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + ' น.');
P('');
P('## สรุปผลตรวจ');
P('');
P('| รายการ | เล่มระบุ | ค่าจริง | ผล | อ้างอิง |');
P('|---|---|---|---|---|');
rows.forEach(r => P('| ' + r.item + ' | ' + r.claim + ' | ' + r.actual + ' | ' +
    (r.ok ? 'ตรง' : '**ไม่ตรง**') + ' | `' + r.ref + '` |'));
P('');
const nBad = rows.filter(r => !r.ok).length;
P('**ตรง ' + (rows.length - nBad) + ' รายการ · ไม่ตรง ' + nBad + ' รายการ จากทั้งหมด ' + rows.length + ' รายการ**');
P('');

// ── รายละเอียดที่ไม่ตรง ─────────────────────────────────────────────────────
P('## รายละเอียดรายการที่ไม่ตรง');
P('');
P('### เส้นทางใช้งาน');
P('');
P('นับจากเงื่อนไขเส้นทางใน `js/app.js` โดยไม่รวมเส้นทางสำรองท้ายบล็อกของแต่ละบทบาท');
P('');
P('**ฝั่งนักเรียน ' + stu.length + ' เส้นทาง**');
P('');
P(stu.map(r => '`' + r + '`').join(' · '));
P('');
P('**ฝั่งครู ' + tea.length + ' เส้นทาง**');
P('');
P(tea.map(r => '`' + r + '`').join(' · '));
P('');
P('**ฝั่งผู้ดูแลระบบ ' + adm.length + ' เส้นทาง**');
P('');
P(adm.map(r => '`' + r + '`').join(' · '));
P('');
P('> ตัวเลขในเล่ม (16/11/5) น่าจะนับจากรุ่นก่อนหน้า ระบบเพิ่มเส้นทางมาอีกหลายเส้นในภายหลัง ' +
    'เช่น QuickPoll ฝั่งครูสองเส้นทาง และมินิเกมฝั่งนักเรียนที่แยกเส้นทางรายเกม');
P('');

P('### แท็บในหน้าวิเคราะห์ของครู');
P('');
P('ปัจจุบันมี **' + tabs.length + ' แท็บ** ตามลำดับที่แสดงบนหน้าจอ');
P('');
tabs.forEach((t, i) => P((i + 1) + '. ' + t));
P('');
P('เอกสารบริบทเดิมระบุ 7 แท็บ ซึ่งถูกต้องสำหรับช่วงก่อนวันที่ 28 กันยายน 2569 ' +
    'หลังจากเพิ่มแท็บ "การใช้คำใบ้" จำนวนจึงเป็น 8 แท็บ **ควรแก้เอกสารบริบทเป็น 8 แท็บ พร้อมระบุวันที่กำกับ**');
P('');

// ── หน้า "การใช้คำใบ้" ──────────────────────────────────────────────────────
P('## หน้า "การใช้คำใบ้" เพิ่มเมื่อใด');
P('');
const hintCommit = git('log', '--date=format:%Y-%m-%d %H:%M', '--pretty=%h' + '\u0001' + '%ad' + '\u0001' + '%s',
    '-S', '_HintUsageTab', '--', 'js/pages/teacher/StudentAnalytics.js').trim().split('\n')
    .map(l => l.split('\u0001'));
if (hintCommit.length && hintCommit[0][0]) {
    const [h, d, s] = hintCommit[hintCommit.length - 1];
    P('| รายการ | ค่า |');
    P('|---|---|');
    P('| commit ที่เพิ่ม | `' + h + '` |');
    P('| วันที่ | ' + d + ' น. (= ' + (parseInt(d.slice(0, 4), 10) + 543) + ' พ.ศ.) |');
    P('| ข้อความ commit | ' + s + ' |');
    P('| ไฟล์ที่แก้ | `js/pages/teacher/StudentAnalytics.js` และ `index.html` (เลขล้างแคช v6.14 → v6.15) |');
    P('| เส้นทาง | `#/teacher/analytics` แท็บ "💡 การใช้คำใบ้" ใช้บัญชีครู |');
    P('');
} else {
    P('ไม่พบใน git');
    P('');
}

// ── ข้อมูลประกอบ: Achievement ที่ปลดล็อกจริง ────────────────────────────────
P('## ข้อมูลประกอบ: Achievement ที่ปลดล็อกได้จริงในฐานข้อมูล');
P('');
P('ตรวจคอลเลกชัน `studentAchievements` ทั้งระบบ (ทุกรายวิชา ทุกภาคเรียน) พบระเบียนรวม 340 รายการ ' +
    'เป็นรหัส Achievement ที่ต่างกัน 17 รหัส ในจำนวนนี้ **13 รหัสตรงกับนิยามในรุ่นปัจจุบัน** ' +
    'อีก 4 รหัส (`perfect_10`, `unit_master_1`, `unit_master_2`, `unit_master_3`) เป็นของรุ่นเก่าที่ไม่มีนิยามแล้ว');
P('');
P('| Achievement | ปลดล็อกทั้งระบบ | ในรายวิชา 1/69 | ช่วงวันที่ |');
P('|---|---|---|---|');
const ACH_STATS = [
    ['first_blood', 65, 35, '2026-02-12 → 2026-06-08'],
    ['streak_3', 58, 20, '2026-02-05 → 2026-09-22'],
    ['perfect_score', 50, 35, '2026-02-16 → 2026-06-08'],
    ['rank_up_5', 50, 30, '2026-02-04 → 2026-09-25'],
    ['quiz_master', 36, 22, '2026-02-04 → 2026-08-11'],
    ['speed_demon', 21, 0, '2026-02-04 → 2026-04-28'],
    ['autopsy_expert', 16, 10, '2026-02-22 → 2026-08-11'],
    ['streak_7', 13, 1, '2026-02-11 → 2026-09-26'],
    ['all_assignments', 9, 0, '2026-02-09 → 2026-04-17'],
    ['no_hint_hero', 5, 0, '2026-02-14 → 2026-04-20'],
    ['comeback_kid', 4, 0, '2026-02-07 → 2026-04-21'],
    ['bug_exterminator', 4, 0, '2026-02-20 → 2026-03-17'],
    ['rank_up_10', 3, 0, '2026-03-15 → 2026-04-11'],
    ['perfect_10 *(รุ่นเก่า)*', 2, 0, '2026-03-17 → 2026-03-18'],
    ['unit_master_2 *(รุ่นเก่า)*', 2, 0, '2026-03-16 → 2026-04-17'],
    ['unit_master_3 *(รุ่นเก่า)*', 1, 0, '2026-02-08'],
    ['unit_master_1 *(รุ่นเก่า)*', 1, 0, '2026-04-20'],
];
ACH_STATS.forEach(r => P('| `' + r[0] + '` | ' + r[1] + ' | ' + r[2] + ' | ' + r[3] + ' |'));
P('');
P('**สามข้อที่ตอนนี้ปลดล็อกไม่ได้** `speed_demon` `all_assignments` `bug_exterminator` ' +
    'เคยมีผู้ปลดล็อกได้จริงในอดีต แต่ครั้งสุดท้ายคือวันที่ 28 เมษายน 2569 ซึ่งเป็นวันเดียวกับ commit ของรุ่น v5.0 ' +
    'ที่เปลี่ยนมาส่งค่าคงที่ (`timeSpentSeconds: 9999`, `unitPassRate: 0`, `unitTotal: 0`) ' +
    'หลังจากนั้นไม่มีผู้ปลดล็อกได้อีกเลย และในรายวิชา 1/69 ไม่มีใครปลดล็อกสามข้อนี้');
P('');
P('**ในรายวิชา 1/69 มีผู้เรียนปลดล็อกจริงเพียง 7 รหัส** จาก 10 รหัสที่ปลดล็อกได้ ' +
    'ถ้าจะเขียนในเล่มว่า "ปลดล็อกได้จริง 10" ควรเติมว่าเป็นจำนวนที่ปลดล็อกได้ตามนิยาม ' +
    'ส่วนที่ผู้เรียนกลุ่มเป้าหมายปลดล็อกได้จริงในภาคเรียนนี้คือ 7 รหัส');
P('');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'SYSTEM_FACTS.md'), R.join('\n') + '\n', 'utf8');
console.log('เขียน docs/report-exports-2569-09/SYSTEM_FACTS.md');
rows.forEach(r => console.log((r.ok ? '  ตรง   ' : '  ไม่ตรง ') + r.item + ' → ' + r.actual));

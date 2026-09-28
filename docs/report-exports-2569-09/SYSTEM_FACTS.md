# SYSTEM_FACTS — ตรวจตัวเลขโครงสร้างระบบที่อ้างในเล่มกับโค้ดจริง

repo `AI-Powered-C` สาขา `main` commit `4fcc426`  
**อ่านอย่างเดียว ไม่มีการแก้ไขโค้ดหรือข้อมูลใด ๆ**  
ดึงข้อมูล 29/9/2569 01:04:15 น.

## สรุปผลตรวจ

| รายการ | เล่มระบุ | ค่าจริง | ผล | อ้างอิง |
|---|---|---|---|---|
| เส้นทางใช้งานฝั่งนักเรียน | 16 เส้นทาง | 20 เส้นทาง | **ไม่ตรง** | `js/app.js:26-73` |
| เส้นทางใช้งานฝั่งครู | 11 เส้นทาง | 13 เส้นทาง | **ไม่ตรง** | `js/app.js:75-107` |
| เส้นทางใช้งานฝั่งผู้ดูแลระบบ | 5 เส้นทาง | 5 เส้นทาง | ตรง | `js/app.js:110-126` |
| คอลเลกชันในฐานข้อมูล | 24 คอลเลกชัน | 24 คอลเลกชัน | ตรง | `listCollections() ของ Firestore` |
| ศูนย์การเรียนรู้ — หน่วย | 5 หน่วย | 5 หน่วย | ตรง | `js/pages/student/LearningHub.js `_LH_UNITS`` |
| ศูนย์การเรียนรู้ — หัวข้อในระบบ | 20 หัวข้อ | 20 หัวข้อ | ตรง | `js/pages/student/LearningHub.js รหัส u#t#` |
| เครื่องมือโต้ตอบ | 5 ชิ้น | 5 ชิ้น (_DataTypeVisualizer, _FlowchartBuilder, _DecisionTreeViz, _PatternSandbox, _MemoryMap) | ตรง | `js/pages/student/LearningTools.js` |
| Achievement ที่นิยามไว้ | 13 รายการ | 13 รายการ | ตรง | `js/achievementEngine.js` |
| Achievement ที่ปลดล็อกได้จริงในรุ่นปัจจุบัน | 10 รายการ | 10 รายการ (ติดขัด speed_demon, all_assignments, bug_exterminator) | ตรง | `js/achievementEngine.js + จุดที่เรียกใช้` |
| คลังโจทย์ — จำนวนข้อ | 34 ข้อ | 34 ข้อ | ตรง | `js/practiceBank.js` |
| คลังโจทย์ — กรณีทดสอบ | 121 กรณี | 121 กรณี | ตรง | `js/practiceBank.js` |
| คลังโจทย์ — ระดับความยาก | ง่าย 11 กลาง 16 ยาก 7 | ง่าย 11 ปานกลาง 16 ยาก 7 | ตรง | `js/practiceBank.js` |
| ระดับผู้เรียน (Rank) | 10 ระดับ | 10 ระดับ (ไข่โปรแกรม, โค้ดเดอร์มือใหม่, นักแก้บัค, ผู้เชี่ยวชาญลูป, จอมเวทย์ Logic, อินทรีอัลกอริทึม, สถาปนิกโค้ด, ดาวสยาม, ราชันโปรแกรม, เทพเจ้า AI) | ตรง | `js/gamification.js `RANK_TIERS`` |
| มินิเกม | 6 เกม | 6 เกม (Quiz Blitz, Decision Drill, Loop Lab, Code Autopsy, Bug Hunt, AI Ethics Quiz) | ตรง | `js/pages/student/MiniGameHub.js` |
| แท็บในหน้าวิเคราะห์ของครู | 8 แท็บ (ภาพหน้าจอล่าสุด) / 7 แท็บ (เอกสารบริบทเดิม) | 8 แท็บ | ตรง | `js/pages/teacher/StudentAnalytics.js` |

**ตรง 13 รายการ · ไม่ตรง 2 รายการ จากทั้งหมด 15 รายการ**

## รายละเอียดรายการที่ไม่ตรง

### เส้นทางใช้งาน

นับจากเงื่อนไขเส้นทางใน `js/app.js` โดยไม่รวมเส้นทางสำรองท้ายบล็อกของแต่ละบทบาท

**ฝั่งนักเรียน 20 เส้นทาง**

`#/student/dashboard` · `#/student/courses` · `#/student/workspace` · `#/student/gradebook` · `#/student/history` · `#/student/practice` · `#/student/profile` · `#/student/leaderboard` · `#/student/achievements` · `#/student/games/quiz` · `#/student/games/autopsy` · `#/student/games/bughunt` · `#/student/games/ethics` · `#/student/games` · `#/student/shop` · `#/student/team` · `#/student/tools` · `#/student/editor` · `#/student/activity` · `#/student/poll`

**ฝั่งครู 13 เส้นทาง**

`#/teacher/dashboard` · `#/teacher/courses` · `#/teacher/assignment` · `#/teacher/testcases` · `#/teacher/analytics` · `#/teacher/students` · `#/teacher/gamification` · `#/teacher/activities` · `#/teacher/realtime` · `#/teacher/editor` · `#/teacher/content` · `#/teacher/poll/present` · `#/teacher/poll`

**ฝั่งผู้ดูแลระบบ 5 เส้นทาง**

`#/admin/dashboard` · `#/admin/seed` · `#/admin/users` · `#/admin/settings` · `#/admin/usage`

> ตัวเลขในเล่ม (16/11/5) น่าจะนับจากรุ่นก่อนหน้า ระบบเพิ่มเส้นทางมาอีกหลายเส้นในภายหลัง เช่น QuickPoll ฝั่งครูสองเส้นทาง และมินิเกมฝั่งนักเรียนที่แยกเส้นทางรายเกม

### แท็บในหน้าวิเคราะห์ของครู

ปัจจุบันมี **8 แท็บ** ตามลำดับที่แสดงบนหน้าจอ

1. 📊 ภาพรวม
2. 👤 รายบุคคล
3. 📋 สรุปคะแนนทุกคน
4. 🎯 คะแนนฝึกเอง
5. 🤖 รายงาน AI
6. 💡 การใช้คำใบ้
7. 🎮 Gamification
8. 🧩 กลุ่มผู้เรียน

เอกสารบริบทเดิมระบุ 7 แท็บ ซึ่งถูกต้องสำหรับช่วงก่อนวันที่ 28 กันยายน 2569 หลังจากเพิ่มแท็บ "การใช้คำใบ้" จำนวนจึงเป็น 8 แท็บ **ควรแก้เอกสารบริบทเป็น 8 แท็บ พร้อมระบุวันที่กำกับ**

## หน้า "การใช้คำใบ้" เพิ่มเมื่อใด

| รายการ | ค่า |
|---|---|
| commit ที่เพิ่ม | `1211477` |
| วันที่ | 2026-09-28 23:36 น. (= 2569 พ.ศ.) |
| ข้อความ commit | feat: hint-usage tab — per-student AI Scaffolding counts filtered by course |
| ไฟล์ที่แก้ | `js/pages/teacher/StudentAnalytics.js` และ `index.html` (เลขล้างแคช v6.14 → v6.15) |
| เส้นทาง | `#/teacher/analytics` แท็บ "💡 การใช้คำใบ้" ใช้บัญชีครู |

## ข้อมูลประกอบ: Achievement ที่ปลดล็อกได้จริงในฐานข้อมูล

ตรวจคอลเลกชัน `studentAchievements` ทั้งระบบ (ทุกรายวิชา ทุกภาคเรียน) พบระเบียนรวม 340 รายการ เป็นรหัส Achievement ที่ต่างกัน 17 รหัส ในจำนวนนี้ **13 รหัสตรงกับนิยามในรุ่นปัจจุบัน** อีก 4 รหัส (`perfect_10`, `unit_master_1`, `unit_master_2`, `unit_master_3`) เป็นของรุ่นเก่าที่ไม่มีนิยามแล้ว

| Achievement | ปลดล็อกทั้งระบบ | ในรายวิชา 1/69 | ช่วงวันที่ |
|---|---|---|---|
| `first_blood` | 65 | 35 | 2026-02-12 → 2026-06-08 |
| `streak_3` | 58 | 20 | 2026-02-05 → 2026-09-22 |
| `perfect_score` | 50 | 35 | 2026-02-16 → 2026-06-08 |
| `rank_up_5` | 50 | 30 | 2026-02-04 → 2026-09-25 |
| `quiz_master` | 36 | 22 | 2026-02-04 → 2026-08-11 |
| `speed_demon` | 21 | 0 | 2026-02-04 → 2026-04-28 |
| `autopsy_expert` | 16 | 10 | 2026-02-22 → 2026-08-11 |
| `streak_7` | 13 | 1 | 2026-02-11 → 2026-09-26 |
| `all_assignments` | 9 | 0 | 2026-02-09 → 2026-04-17 |
| `no_hint_hero` | 5 | 0 | 2026-02-14 → 2026-04-20 |
| `comeback_kid` | 4 | 0 | 2026-02-07 → 2026-04-21 |
| `bug_exterminator` | 4 | 0 | 2026-02-20 → 2026-03-17 |
| `rank_up_10` | 3 | 0 | 2026-03-15 → 2026-04-11 |
| `perfect_10 *(รุ่นเก่า)*` | 2 | 0 | 2026-03-17 → 2026-03-18 |
| `unit_master_2 *(รุ่นเก่า)*` | 2 | 0 | 2026-03-16 → 2026-04-17 |
| `unit_master_3 *(รุ่นเก่า)*` | 1 | 0 | 2026-02-08 |
| `unit_master_1 *(รุ่นเก่า)*` | 1 | 0 | 2026-04-20 |

**สามข้อที่ตอนนี้ปลดล็อกไม่ได้** `speed_demon` `all_assignments` `bug_exterminator` เคยมีผู้ปลดล็อกได้จริงในอดีต แต่ครั้งสุดท้ายคือวันที่ 28 เมษายน 2569 ซึ่งเป็นวันเดียวกับ commit ของรุ่น v5.0 ที่เปลี่ยนมาส่งค่าคงที่ (`timeSpentSeconds: 9999`, `unitPassRate: 0`, `unitTotal: 0`) หลังจากนั้นไม่มีผู้ปลดล็อกได้อีกเลย และในรายวิชา 1/69 ไม่มีใครปลดล็อกสามข้อนี้

**ในรายวิชา 1/69 มีผู้เรียนปลดล็อกจริงเพียง 7 รหัส** จาก 10 รหัสที่ปลดล็อกได้ ถ้าจะเขียนในเล่มว่า "ปลดล็อกได้จริง 10" ควรเติมว่าเป็นจำนวนที่ปลดล็อกได้ตามนิยาม ส่วนที่ผู้เรียนกลุ่มเป้าหมายปลดล็อกได้จริงในภาคเรียนนี้คือ 7 รหัส


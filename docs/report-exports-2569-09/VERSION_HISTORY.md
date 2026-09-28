# VERSION_HISTORY — ประวัติรุ่นระบบ APCC จาก git

repo `AI-Powered-C` สาขา `main`  
**อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลหรือประวัติใด ๆ**  
ดึงข้อมูล 29/9/2569 01:00:19 น. · commit ทั้งหมดในสาขา 311 รายการ · commit แรก 2025-08-02 22:48 · commit ล่าสุด 2026-09-29 00:18

> **วันที่ทั้งหมดในไฟล์นี้เป็นคริสต์ศักราชตามที่ git บันทึก** เช่น 2026-04-28 = 28 เมษายน 2569

## วิธีหาวันที่และข้อจำกัด

1. **git tag — ไม่มีเลย** repo นี้มี tag ทั้งหมด **0 รายการ** จึงอ้างรุ่นจาก tag ไม่ได้
2. **CHANGELOG.md — หยุดที่ v2.3** (รายการสุดท้ายลงวันที่ 2025-01-11) ไม่ครอบคลุมรุ่น v4.6 ขึ้นไป
3. จึงใช้ **ข้อความ commit** เป็นหลัก โดยถือว่า commit ที่ประกาศเลขรุ่นในข้อความคือจุดเริ่มของรุ่นนั้น และ commit สุดท้ายของรุ่นคือ commit ก่อนหน้าจุดเริ่มของรุ่นถัดไป
4. ต้องแยกให้ชัดระหว่าง **เลขรุ่นของระบบ** กับ **เลขรุ่นของไฟล์เดียว** ที่ใช้ล้างแคช เช่น `FreeEditor v7.5` `grader v5.1` `Gradebook v5.2` `Leaderboard v6.0` ล้วนเป็นเลขของไฟล์ ไม่ใช่รุ่นของระบบ

## 1-2. ช่วงวันที่ จำนวน commit และ commit สำคัญของแต่ละรุ่น

| รุ่น | commit แรกของรุ่น | commit สุดท้ายของรุ่น | จำนวน commit | หาจาก |
|---|---|---|---|---|
| **v4.6** | 2026-03-19 16:09 (`7434312`) | 2026-03-19 18:03 (`16e9b99`) | 3 | ข้อความ commit |
| **v5.0** | 2026-04-28 14:28 (`832bd4f`) | 2026-05-17 12:37 (`4869591`) | 44 | ข้อความ commit |
| **v5.1** | 2026-05-17 18:49 (`f781672`) | 2026-05-28 22:34 (`7572ee2`) | 58 | ข้อความ commit |
| **v5.2** | — | — | — | **ไม่พบใน git** |
| **v5.3** | — | — | — | **ไม่พบใน git** |
| **v5.4** | 2026-06-07 16:28 (`45d2d46`) | 2026-08-08 17:53 (`d273293`) | 34 | ข้อความ commit |
| **v5.5** | 2026-08-08 18:36 (`1507d76`) | 2026-09-29 00:18 (`4fcc426`) | 54 | ข้อความ commit |
| **v5.6** | — | — | — | **ไม่พบใน git** |

**หมายเหตุขอบเขต** v5.5 เป็นรุ่นสุดท้ายที่มีการประกาศเลขรุ่น ช่วงของ v5.5 จึงลากยาวถึง commit ล่าสุดในสาขา ซึ่งรวมงานทั้งหมดของเดือนกันยายน 2569 ที่ยังไม่ได้ตั้งเลขรุ่นใหม่

### v4.6

ที่มาของวันที่: ข้อความ commit ขึ้นต้นด้วย "v4.6 -" · ช่วงรุ่นมี 3 commit

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-03-19 16:09 | `7434312` | v4.6 - Auth/Profile/Student Management improvements |
| 2026-03-19 17:48 | `53e74fd` | Fix: add arrayRemove helper + prevent duplicate enrollments |
| 2026-03-19 18:03 | `16e9b99` | Fix: unify Navbar title + soften AdminDashboard colors |

### v5.0

ที่มาของวันที่: ข้อความ commit ระบุ "(v5.0)" · ช่วงรุ่นมี 44 commit

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-04-28 14:28 | `832bd4f` | feat: Gamification + AI Coaching System v5.0 (Phase 1-4) |
| 2026-04-28 15:11 | `f90d119` | feat: group student navbar into dropdown menus for easier navigation |
| 2026-04-28 15:23 | `87c1e9b` | fix: dropdown menu stays open when moving mouse to submenu items |
| 2026-04-28 15:51 | `25ac917` | feat: Research Data Seeder — seed gamification data for 32 students |
| 2026-04-28 15:58 | `d4be24d` | fix: allow admin to seed research data + filter students by number range |

### v5.1

ที่มาของวันที่: ข้อความ commit ระบุ "(v5.1)" · ช่วงรุ่นมี 58 commit

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-05-17 18:49 | `f781672` | feat: Mastery Learning + Predictive AI Coach + 2 new mini-games (v5.1) |
| 2026-05-17 19:01 | `ce7185f` | fix: MiniGameHub loads enrolled courses instead of orderBy('order') |
| 2026-05-17 19:06 | `55ca4d0` | feat: MiniGameHub shows active topic on cards + banner |
| 2026-05-17 19:24 | `2a15df1` | feat: separate mini-game quota per topic + teacher game stats by course |
| 2026-05-17 19:43 | `9ad72cc` | feat: course-context games + daily XP cap + teacher course view |

### v5.2

**ไม่พบใน git** — ไม่มี commit ใดประกาศรุ่นนี้ พบ "gradebook v5.2" ซึ่งเป็นเลขรุ่นของไฟล์เดียว ไม่ใช่รุ่นของระบบ

### v5.3

**ไม่พบใน git** — ไม่พบใน git ทั้งในข้อความ commit และในไฟล์ใด ๆ ปรากฏเฉพาะในตารางของ SYSTEM_DOCUMENTATION.md

### v5.4

ที่มาของวันที่: ข้อความ commit ระบุ "update docs to v5.4" · ช่วงรุ่นมี 34 commit

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-06-07 16:28 | `45d2d46` | docs+feat: update docs to v5.4 + add Hint Lv.3 research data seeder |
| 2026-06-10 11:18 | `ba1e0a0` | fix: add composite indexes for users role+displayName/email/studentCode queries |
| 2026-06-19 18:18 | `547f487` | fix: pin @babel/standalone to v7.25.9 — v8 breaks in-browser JSX transform |
| 2026-07-06 09:19 | `9876159` | perf: parallel test grading + skip Wandbox + 8s timeout per test |
| 2026-07-06 09:31 | `6d3b5f9` | feat: gradebook filter — ทุกข้อ / ที่ทำแล้ว / ยังไม่ได้ทำ |

### v5.5

ที่มาของวันที่: ข้อความ commit ระบุ "update all guides to v5.5" · ช่วงรุ่นมี 54 commit

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-08-08 18:36 | `1507d76` | docs: update all guides to v5.5 — Learning Hub, Content Manager, Gradebook |
| 2026-08-11 09:14 | `41d8fb0` | fix: add learningTopics Firestore rule — teachers can write, students can read |
| 2026-08-11 09:18 | `c5676d7` | fix: add learningTopics indexes + remove orderBy from order query |
| 2026-08-11 09:23 | `5ecedf3` | fix: bump ContentManager.js to v1.2 — force cache-bust for orderBy removal fix |
| 2026-08-11 09:29 | `61adbd9` | fix: convert Google Drive /view to /preview for iframe PDF embedding |

### v5.6

**ไม่พบใน git** — ไม่พบใน git เลย ทั้งข้อความ commit เอกสาร และเนื้อไฟล์

## 3. commit ช่วง 22-27 กันยายน 2569 จัดตามวงรอบการพัฒนา 4 วงรอบ

ช่วงนี้มี commit ทั้งหมด **22 รายการ** จัดเข้าวงรอบได้ 13 รายการ ที่เหลือเป็นงานเอกสารและการส่งออกข้อมูล

### วงรอบที่ 1 โควตา AI ฟรีหมดระหว่างคาบ → คลังโจทย์ฝึกแบบไม่ต้องพึ่ง AI

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-09-25 13:10 | `c2fc8e9` | feat: offline practice problem bank (34 problems) for self-practice |

ช่วงเวลาของวงรอบนี้: 2026-09-25 13:10 ถึง 2026-09-25 13:10 · 1 commit

### วงรอบที่ 2 การส่งซ้ำไม่มีต้นทุน → คำเตือนก่อนส่ง ป้ายเกณฑ์คะแนน และคะแนนชุดเดียวกันทั้งสองฝั่ง

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-09-26 09:23 | `634543c` | fix: restore a student's submitted code across browsers, scope drafts per user |
| 2026-09-26 13:22 | `cbef98d` | feat: per-course grading policy (best or latest submission) |
| 2026-09-26 13:51 | `aecdd87` | fix: sort the E1 summary by the total the table actually shows |
| 2026-09-26 14:14 | `d137473` | fix: AI analysis no longer reports a permission error, flag stale grade results |
| 2026-09-27 16:52 | `fc7b8cb` | fix: student gradebook now shows the same raw scores as the teacher's table |

ช่วงเวลาของวงรอบนี้: 2026-09-26 09:23 ถึง 2026-09-27 16:52 · 5 commit

### วงรอบที่ 3 ช่องโหว่การสะสม XP และยอดคะแนนเพี้ยน → เพดาน XP รายวันและเครื่องมือตรวจสอบ

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-09-25 22:10 | `8c9ebfd` | fix: close XP farming loopholes + add XP audit/correction tools |
| 2026-09-25 22:43 | `f1737da` | feat: award XP for self-practice + backfill tool for past practice |
| 2026-09-25 22:52 | `d23ce9f` | fix: stop playerStats from being reset to zero, add rebuild-from-ledger tool |
| 2026-09-25 22:57 | `1a6ab58` | chore: ignore Firebase service account key and tools/ backups |
| 2026-09-25 23:12 | `461e987` | feat: let XP tools target a student by --number or --name |
| 2026-09-26 14:33 | `8d2cfd1` | fix: XP tools corrupted CodeCoin by summing non-numeric ledger values |

ช่วงเวลาของวงรอบนี้: 2026-09-25 22:10 ถึง 2026-09-26 14:33 · 6 commit

### วงรอบที่ 4 ตัวเลขขยับหลังส่งออกรายงาน → ระบบล็อกคะแนนรายวิชา

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-09-27 14:26 | `02aed44` | feat: lock a course's grades while keeping it open for practice |

ช่วงเวลาของวงรอบนี้: 2026-09-27 14:26 ถึง 2026-09-27 14:26 · 1 commit

### งานอื่นในช่วงเดียวกัน (ไม่จัดเข้าวงรอบใด)

| วันที่ | commit | ข้อความ |
|---|---|---|
| 2026-09-22 19:12 | `46cb4b2` | fix: unify hint mechanism name as "AI Scaffolding (คำใบ้)" across the UI |
| 2026-09-27 14:58 | `70cda94` | docs: update the report summary with the session's work and a limitations section |
| 2026-09-27 15:02 | `29138e9` | docs: add hint-usage vs full-marks analysis, keep the query as a tool |
| 2026-09-27 15:16 | `0966ed5` | docs: record the E1 figures the report will cite |
| 2026-09-27 15:25 | `26d9b32` | docs: point the E1 figures at the locked 15:20 export |
| 2026-09-27 15:37 | `b6ffe89` | docs: merge the course context and the update summary into one report brief |
| 2026-09-27 16:31 | `8a004ea` | docs: recast 9.3 around the latest-submission rule used for the reported figures |
| 2026-09-27 17:14 | `f2cab2d` | docs: clarify the two averages, correct cycle 2, add the export cache tool |
| 2026-09-27 17:39 | `801ee76` | feat: v24 report data export — 10 read-only analyses with reproducible scripts |

## 4. รุ่นที่หาวันที่ไม่ได้ และความไม่ตรงกับเอกสารเดิม

| รุ่น | สถานะ | รายละเอียด |
|---|---|---|
| v5.2 | **ไม่พบใน git** | ไม่มี commit ใดประกาศรุ่นนี้ พบ "gradebook v5.2" ซึ่งเป็นเลขรุ่นของไฟล์เดียว ไม่ใช่รุ่นของระบบ |
| v5.3 | **ไม่พบใน git** | ไม่พบใน git ทั้งในข้อความ commit และในไฟล์ใด ๆ ปรากฏเฉพาะในตารางของ SYSTEM_DOCUMENTATION.md |
| v5.6 | **ไม่พบใน git** | ไม่พบใน git เลย ทั้งข้อความ commit เอกสาร และเนื้อไฟล์ |

**ความไม่ตรงกันที่ต้องแก้ในเล่ม** `SYSTEM_DOCUMENTATION.md` บรรทัดที่ 197-208 ระบุเดือนของแต่ละรุ่นเป็น "มี.ค. 2568" ถึง "มิ.ย. 2568" แต่วันที่จริงใน git คือ

| รุ่น | เอกสารเดิมระบุ | วันที่จริงใน git |
|---|---|---|
| v5.0 | มี.ค. 2568 | 2026-04-28 (= เม.ย. 2569) |
| v5.1 | เม.ย. 2568 | 2026-05-17 (= พ.ค. 2569) |
| v5.2 | เม.ย. 2568 | **ไม่พบใน git** |
| v5.3 | เม.ย. 2568 | **ไม่พบใน git** |
| v5.4 | พ.ค. 2568 | 2026-06-07 (= มิ.ย. 2569) |
| v5.5 | มิ.ย. 2568 | 2026-08-08 (= ส.ค. 2569) |

เอกสารเดิมคลาดเคลื่อนทั้งปีและเดือน ควรแก้ตารางที่ 14 ให้ใช้วันที่จาก git ตามตารางข้างบน หรือระบุให้ชัดว่าเดือนในตารางเดิมหมายถึงช่วงออกแบบ ไม่ใช่วันที่เผยแพร่รุ่น


# APCC v6.0 Studio — Phase 0: สำรวจระบบเดิมและแผนไฟล์

สำรวจเมื่อ 13 พ.ย. 2569 บน branch `feature/apcc-studio-v6` (แตกจาก `main` @ `4d49742`)
ระบบอ้างอิงในรายงาน: v5.6

## 1. โครงสร้างโค้ด

**สถาปัตยกรรม** React 17 (UMD) + Babel standalone 7.25.9 (ไม่มี build step), Tailwind CDN + Bootstrap 5.3.3, CodeMirror 5.65.16, Chart.js, Firebase compat 9.23.0 (auth, firestore, database)
โหลดสคริปต์ตามลำดับใน `index.html` บรรทัด 321–391 และ `js/app.js` โหลดเป็นไฟล์สุดท้าย

**ที่ใช้งานจริง** GitHub Pages (`koki-assawin.github.io/AI-Powered-C`) — การ push ขึ้น `main` เท่ากับ deploy
Firebase Hosting ก็ตั้งค่าไว้ (`firebase.json` → `public: "."`)

| กลุ่ม | ไฟล์ |
|---|---|
| แกนกลาง (`js/`) | firebase, gemini, grader, analytics, gamification, achievementEngine, hintEngine, practiceBank, aiCoach, miniGameGenerator, pollWordCloud, context, app |
| components | Spinner, CodeEditor, RadarChart, BarChart, WordCloud, ProtectedRoute, XPBar, Navbar |
| pages (ราก) | PrivacyPolicy, LoginPage, RegisterPage, GuestLandingPage |
| pages/student | StudentDashboard, CourseViewer, CodingWorkspace, Gradebook, SubmissionHistory, SelfPractice, StudentProfile, Leaderboard, AchievementsPage, MiniGameHub, games/{QuizBlitz, CodeAutopsy, BugHunt, EthicsQuiz}, AvatarShop, TeamSync, LearningTools, LearningHub, StudentActivityView, PollStudent |
| pages/teacher | TeacherDashboard, CourseBuilder, AssignmentManager, TestCaseEditor, StudentAnalytics, GamificationAdmin, StudentManagement, ActivityBuilder, RealtimeDashboard, ContentManager, PollControl, PollPresent |
| pages/admin | AdminDashboard, RiskAlertEvidence, UsageAnalytics, UserManager, SystemSettings, ResearchDataSeeder |
| pages/shared | FreeEditor |

**Router** (`js/app.js` `renderRoute`) เป็น if-chain ตาม `startsWith`
- `#/student/*` — dashboard, courses, workspace, gradebook, history, practice, profile, leaderboard, achievements, games/*, shop, team, tools, editor, activity, poll
- `#/teacher/*` — dashboard, courses, assignment, testcases, analytics, students, gamification, activities, realtime, editor, content, poll/present, poll
- `#/admin/*` — dashboard, seed, users, settings, usage, risk-evidence
- route `#/studio/...` ต้องเพิ่ม branch ใหม่ ส่วน `#/teacher/studio/...` ต้องวางก่อน default ของกลุ่ม teacher

## 2. คอลเลกชัน Firestore

จำนวนเอกสารเก็บไว้ที่ [`baseline_counts.json`](baseline_counts.json) (นับเมื่อ 13 พ.ย. 2569 รวม 37,330 เอกสาร)

| คอลเลกชัน | เอกสาร | มีกฎใน rules | หมายเหตุ |
|---|---:|:-:|---|
| users | 183 | ✓ | |
| courses | 12 | ✓ | |
| enrollments | 480 | ✓ | |
| assignments | 310 | ✓ | |
| testCases | 1,179 | ✓ | |
| submissions | 6,220 | ✓ | |
| grades | 2,188 | ✓ | |
| assignments_v2 / submissions_v2 | 1 / 5 | ✓ | ActivityBuilder |
| coachInteractions | 3,819 | ✓ | |
| usageEvents | 6,285 | ✓ | |
| xpLedger | 10,574 | ✓ | |
| playerStats | 142 | ✓ | เก็บ `teamId` ของ TeamSync ด้วย |
| studentAchievements | 370 | ✓ | |
| miniGameSessions | 5,038 | ✓ | |
| leaderboardSnapshots | 12 | ✓ | |
| selfPracticeSubmissions | 453 | ✓ | |
| pollSessions (+responses 336) / pollTemplates | 32 / 4 | ✓ | |
| runtimeStatus | 9 | ✓ | |
| learningTopics | 7 | ✓ | |
| appConfig / config | 1 / 2 | ✓ | |
| xpCorrections | 4 | ✗ | เขียนโดยสคริปต์ admin SDK เท่านั้น |
| **projectTeams** (+tasks, feedback) | **0** | **✗** | TeamSync ใช้งานจริงไม่ได้ — ไม่มี `match` จึงถูกปฏิเสธทุกครั้ง |
| **shopPurchases** | **0** | **✗** | AvatarShop บันทึกการซื้อไม่ได้ ด้วยเหตุผลเดียวกัน |
| lessons, classes, seasons, miniGameContent, gradeCorrections | 0 | ✓/✗ | มีในโค้ด แต่ยังไม่มีข้อมูล |

### รายวิชาในระบบ (12 วิชา)

| id | รายวิชา | ภาษา | สถานะ Studio |
|---|---|---|---|
| `237KT9WU4yKzrgqALJQz` | ว31281 1/68 (ห้อง 6, 18 คน, ปิดรับคะแนนแล้ว) | c | **ห้ามแตะ — ข้อมูลวิจัย** |
| `UZGy0pGurry9Dt9YdhYX` | ว31281 1/69 (ปิดรับคะแนนแล้ว) | c | **ห้ามแตะ — ข้อมูลวิจัย** |
| `sandbox-e1-test` | ว31281 Sandbox1 (30 คน — field trial) | c | **ห้ามแตะ — ทดลองใช้** |
| `sandbox-e1-test-2` | ว31281 Sandbox2 (9 คน — small group) | c | **ห้ามแตะ — ทดลองใช้** |
| `sandbox-e1-test-3` | ว31281 Sandbox3 (3 คน — one-to-one) | c | **ห้ามแตะ — ทดลองใช้** |
| `p1f8ZRR6qKVDM70zvndI`, `czzTsIAnxkeaQ3DjmMRu` | ว31281 (cpp, วิศวะทั่วไป) | cpp | ห้ามแตะ (รหัสวิชาเดียวกัน) |
| `iGfWVnF5HkJDb5NHK1ee` | ห้องทดลองเรียน ว31281 | c | ห้ามแตะ (สำเนาจาก 1/69) |
| `7S2FiZZqzJqKXTWkyMGX`, `8UDsVjQjKRQooejWktVj`, `xbbDy4HQ8L510XjJ8Afs` | ฝึกเขียนโปรแกรม 1, ติว TOI Zero, C++ | c/cpp | ไม่เกี่ยว |
| `h5av26RKvbtT5visGv2B` | **ว23207 นวัตกรรมดิจิทัล 2/69** | python | เป้าหมายแรกของ Studio |

ข้อเสนอ: `studioConfig.js` มีรายการ `PROTECTED_COURSE_IDS` (8 วิชาแรก) และปฏิเสธการเปิด Studio ให้วิชาใดก็ตามที่ชื่อขึ้นต้นด้วย "ว31281"

### ข้อเท็จจริงสำคัญของรายวิชา ว23207 (`h5av26RKvbtT5visGv2B`)
- **มีโจทย์ครบแล้ว 57 ข้อ, test cases 159 กรณี** ชื่อโจทย์ขึ้นต้นด้วยรหัส เช่น `W207-04-2 เลขคู่หรือเลขคี่` และแบ่งหน่วยไว้ใน `directoryTree` แล้ว
- โจทย์ไม่มีฟิลด์ `sourceTemplate`, `hintLadder`, `studioType` → การตรวจซ้ำตอน import ต้องจับรหัส `W207-…` จากชื่อด้วย ไม่อย่างนั้นจะได้โจทย์ซ้ำ
- MID/FIN ตั้ง `assignmentType: 'exam'` แล้ว — CodingWorkspace ซ่อนปุ่มคำใบ้และ AI ในโหมดสอบอยู่แล้ว (`isExamMode`)
- ฟิลด์ของรายวิชา: `academicYear, classCode, coTeacherIds, createdAt, description, directoryTree, enrollmentCount, grade, gradingPolicy, isPublished, language, room, semester, status, teacherId, title` (ไม่มี `gradesLocked` — เป็นสาเหตุของบั๊กที่แก้ไปใน `4d49742`)

### ฟิลด์ที่ใช้อยู่
- **courses** — ข้างบน + `gradesLocked, gradesLockedAt, gradesLockedBy, copiedFrom`
- **assignments** — `title, description, language, difficulty (ง่าย/ปานกลาง/ยาก), timeLimit, memoryLimit, isPublished, assignmentType (practice|exam), examDurationMinutes, unitName, topicName, rawScore, courseId, totalPoints, createdAt, teacherHide`
- **testCases** — `assignmentId, input, expectedOutput, isHidden, points, order`
- **enrollments** — `studentId, courseId, enrolledAt, progress, completedLessons, lastAccessedAt`
- **projectTeams** — `name, subject, createdBy, members[], memberNames{}, code, createdAt` ไม่มี `courseId` (1 นักเรียนอยู่ได้ 1 ทีมทั้งระบบผ่าน `playerStats.teamId`)

> หมายเหตุ: ในพรอมต์ระบุ `difficulty` ว่า Easy/Medium/Hard แต่ระบบจริงใช้ **ง่าย/ปานกลาง/ยาก** ตอน import จะคงค่าภาษาไทยไว้ เพื่อให้หน้าเดิมแสดงผลถูก

### Event type ใน `usageEvents` (ใช้งานจริง)
`code_run, sample_test, submission, ai_hint, ai_analyze, ai_chat, loop_trace, demo_run`
(คอมเมนต์ใน `analytics.js` ไม่ได้ระบุ `loop_trace` แต่ CodingWorkspace บรรทัด 523 บันทึก event นี้อยู่)

`coachInteractions` เขียนผ่าน `_logCoachInteraction` ใน `aiCoach.js` (ตัด prompt ที่ 500 อักษร และ response ที่ 1,000 อักษร)

## 3. ของที่มีอยู่แล้ว — จะ "ต่อยอด" ไม่ "สร้างซ้ำ"

| ของเดิม | ที่อยู่ | Studio จะใช้อย่างไร |
|---|---|---|
| `generateProblems`, `generateTestCases` | `gemini.js:229, 277` | Template Pack เรียกใช้ตอนครูสั่ง "สร้างโจทย์เพิ่มด้วย AI" ไม่เขียนใหม่ |
| ปุ่มสร้างโจทย์ด้วย AI | AssignmentManager | คงเดิม |
| `getSocraticHint` | `aiCoach.js:53` | `studioHint.js` เรียกต่อเมื่อใช้ `hintLadder` ครบ 4 ระดับแล้ว |
| `hintEngine.js` (`diagnoseFailure`, `buildLocalHint`) | | ไม่แก้ |
| `runSampleTests`, `gradeSubmission` | `grader.js` | Parsons ประกอบโค้ดแล้วส่งเข้าฟังก์ชันเดิมโดยตรง ไม่แก้ grader |
| TeamSync (ทีม, งาน, peer feedback, radar) | `TeamSync.js` | Project Studio อ้าง `teamId` — **แต่ต้องเพิ่มกฎ `projectTeams` ก่อน** ตอนนี้ใช้งานจริงไม่ได้ |
| ActivityBuilder (coding, autopsy, quiz_blitz, pre_post_test) | `assignments_v2` | ไม่แตะ Parsons ใช้ `assignments` เดิม เพื่อให้ตรวจผ่าน grader เดิมและนับเกรดได้ |
| LearningHub — หัวข้อ built-in 20 หัวข้อ (ภาษา C) | `LearningHub.js:53` `_LH_TOPICS`, แสดงเฉพาะเมื่อ `isC` (บรรทัด 985) | เพิ่มหัวข้อ Python จาก `js/studio/content/pythonTopics.js` เป็นเงื่อนไขแยก ไม่แก้ `_LH_TOPICS` |
| ContentManager (`learningTopics`) | | ครูเพิ่มหัวข้อเองได้อยู่แล้ว ไม่ต้องเปลี่ยน |
| `practiceBank.js` (Self Practice 34 ข้อ, ภาษา C ทั้งหมด) | | ไม่แตะ |
| ตัวเลือกภาษา `LANGUAGES` | `firebase.js:38` | มี python อยู่แล้ว |
| 1-Click Seeder หน่วยที่ 5 | `AssignmentManager.seedUnit5` | ใช้เป็นแบบอย่างการเขียน assignment + testCases แบบ batch |

## 4. สิ่งที่ทำใน Phase 0

| ไฟล์ | สถานะ | บรรทัดที่แตะไฟล์เดิม |
|---|---|---:|
| `tools/backup_firestore_readonly.js` | ใหม่ — `--counts` (รันแล้ว), `--full` (ยังไม่รัน) | 0 |
| `docs/studio/baseline_counts.json` | ใหม่ | 0 |
| `tools/studio/seed_emulator.js` | ใหม่ — ไม่ยอมรันถ้าไม่ได้ชี้ไปที่ emulator | 0 |
| `firebase.json` | เพิ่มบล็อก `emulators` (ไม่กระทบการ deploy) | +8 |
| `js/firebase.js` | ต่อ emulator เฉพาะ localhost + `?emulator=1` | +5 |
| `docs/import-samples/apcc_problems_w23103_ch2.json` | ใหม่ — 10 ข้อ, 46 กรณี, Parsons 1 ข้อ; เฉลยผ่านครบ 46/46 (Python 3.14 ในเครื่อง) | 0 |

## 5. แผนไฟล์ Phase 1–6 (รออนุมัติ)

### 5.1 ไฟล์ใหม่ (ไม่กระทบของเดิม)

| ไฟล์ | Phase | หลักการ | หน้าที่ |
|---|:-:|---|---|
| `js/studio/studioConfig.js` | 1 | ทุกข้อ | `isStudio`, `hasFeature`, `PROTECTED_COURSE_IDS`, ค่า template |
| `js/studio/studioLoader.js` | 1 | — | โหลดไฟล์ Studio แบบ lazy (fetch → `Babel.transform` → eval) เฉพาะเมื่อเข้ารายวิชา Studio เพื่อไม่ให้รายวิชาเดิมโหลดช้าลง (ข้อ 7.5) |
| `js/studio/templatePack.js` | 1 | A₂ | แปลง JSON เป็น assignments + testCases, dry-run, ตรวจซ้ำ, export |
| `js/pages/studio/TemplateManager.js` | 1 | A₂ | หน้า `#/teacher/studio/templates` — import, preview, ตรวจเฉลย, export |
| `js/studio/content/templates/w23207.js`, `w23103_ch2.js` | 1 | D | หน่วย, ด่าน, รูบริก, features เริ่มต้น |
| `js/studio/ParsonsPlayer.js` | 2 | P | ลากเรียงบรรทัด + ปรับการเยื้อง ตรวจโดยประกอบโค้ดแล้วส่งเข้า `gradeSubmission` เดิม |
| `js/studio/content/pythonTopics.js` | 2 | A₁ | หัวข้อ Python 12 หัวข้อ |
| `js/studio/studioHint.js` | 2 | P, A₁ | ใช้ `hintLadder` ก่อนเรียก `getSocraticHint`; บันทึกลง `coachInteractions` รูปแบบเดิม `triggerEvent: 'studio_ladder'` |
| `js/studio/studioEvents.js` | 2 | — | `logStudioEvent()` เขียนลง `studio_events` |
| `js/studio/SkillGate.js`, `StageBar.js` | 3 | P | คำนวณจาก submissions เดิม (อ่านอย่างเดียว) → `studio_progress` |
| `js/studio/ExplainBack.js` | 3 | C, P | อธิบายโค้ด/ทำนายผล, AI ให้ระดับ 0–3 พร้อม fallback |
| `js/pages/studio/ProjectStudio.js` | 4 | D, C | บอร์ด 5 ขั้น + Design Coach |
| `js/studio/WebAppRunner.js` | 4 | D, A₂ | stlite ใน iframe sandbox (ระบุเวอร์ชัน CDN) |
| `js/studio/RubricReview.js` | 4 | C, D | รูบริก 5×4, AI ร่างความเห็น, ครูยืนยัน, CSV |
| `js/pages/studio/Showcase.js`, `Portfolio.js` | 5 | C, D | แกลเลอรี + พอร์ตโฟลิโอพิมพ์ PDF |
| `js/pages/studio/StudioAnalytics.js` | 5 | ทุกข้อ | แดชบอร์ด + CSV รหัส S01… |
| `tests/regression_grader.test.js`, `tests/rules.test.js` | 6 | — | ข้อ 7.2, 7.4 (`@firebase/rules-unit-testing` ต้องใช้ emulator) |
| `docs/studio/CHANGELOG.md`, `manual_teacher.md`, `manual_student.md` | ทุกเฟส / 5 | — | |

### 5.2 จุดเชื่อมกับไฟล์เดิม (ประมาณการ)

| ไฟล์เดิม | Phase | บรรทัดโดยประมาณ | สิ่งที่เพิ่ม |
|---|:-:|---:|---|
| `index.html` | 1 | +2 | `studioConfig.js`, `studioLoader.js` (ไฟล์อื่นโหลดแบบ lazy) |
| `js/app.js` | 1–5 | +10 | branch `#/studio/*` และ `#/teacher/studio/*` |
| `js/pages/teacher/CourseBuilder.js` | 1 | ~25 | ส่วน "เปิดใช้ APCC Studio" เฉพาะในฟอร์มแก้ไข เขียน `studio` ด้วย `update()` แยกต่างหาก ซ่อนสำหรับวิชาที่ห้ามแตะ |
| `js/components/Navbar.js` | 1–5 | ~10 | เมนู Studio เฉพาะผู้ใช้ที่อยู่ในรายวิชา Studio |
| `js/pages/student/CodingWorkspace.js` | 2–3 | ~20 | (1) ถ้า `studioType==='parsons'` แสดง `ParsonsPlayer` แทน editor (2) `handleHint` ส่งต่อให้ `studioHint` เมื่อมี `hintLadder` (3) แสดง Explain-Back หลังผ่าน — **ไฟล์นี้เป็นจุดเสี่ยงสุด ทุกเงื่อนไขต้องผ่าน `isStudio(course)` ก่อน** |
| `js/pages/student/LearningHub.js` | 2 | ~8 | `showBuiltIn` ขยายเป็น C หรือ (python + `hasFeature`) |
| `js/pages/student/StudentDashboard.js` | 3 | ~5 | แทรก `StageBar` |
| `firestore.rules` | 1–5 | +~90 | เพิ่มบล็อก `studio_*` ต่อท้ายไฟล์ (ไม่แก้กฎเดิม) |
| `grader.js`, `hintEngine.js`, `analytics.js`, `aiCoach.js` | — | **0** | ไม่แตะ |

## 6. ข้อตัดสินใจ (เสนอเมื่อ 13 พ.ย. 2569 — รอครูยืนยันตอนสั่ง Phase 1)

- **D1 โจทย์เดิมของ ว23207** — ทาง (ก): ครูกดปุ่ม "เติมข้อมูล Studio" เอง เพิ่มได้เฉพาะฟิลด์ optional `studioType, parsons, hintLadder, skillTag, planNo, sourceTemplate` ในรายวิชาที่เปิด Studio และไม่อยู่ใน `PROTECTED_COURSE_IDS` แสดงตัวอย่างการเปลี่ยนแปลงก่อนบันทึก และเก็บค่าก่อนแก้ลง `studio_events` ไม่มีสคริปต์รันอัตโนมัติ
- **D2 กฎ Firestore** — เพิ่มบล็อก `projectTeams` (+`tasks`, `feedback`) ให้สมาชิกทีมเขียนของทีมตน ครูอ่านทั้งหมด; `shopPurchases` แยกไปแก้นอกงาน Studio

## 7. ความเสี่ยงและเรื่องที่ต้องตัดสินใจ

1. ~~ยังไม่มี Java~~ — ติดตั้ง Temurin JDK 21.0.13 แล้ว (13 พ.ย. 2569) emulator เปิดได้ และ seed ผ่าน (ผู้ใช้ 7, รายวิชา 2, โจทย์ 5, test case 13)
   วิธีเปิด: `firebase emulators:start --only auth,firestore,hosting` แล้วเข้า `http://127.0.0.1:5000/?emulator=1` (UI ที่ `http://127.0.0.1:4000`)
   ไม่ได้เปิด database emulator เพราะ `firebase.json` ไม่มีบล็อก `database` — QuickPoll ที่ใช้ RTDB จึงยังทดสอบใน emulator ไม่ได้ ซึ่ง Studio ไม่ต้องใช้
2. **ไม่พบไฟล์ `apcc_problems_w23207.json`** ในโปรเจกต์ แต่โจทย์ทั้ง 57 ข้อมีอยู่ในรายวิชาจริงแล้ว ถ้าจะให้โจทย์เดิมได้ `hintLadder`/`studioType: parsons` ต้องเพิ่มฟิลด์ optional ให้ assignment เดิมของ ว23207 ซึ่งขัดกับข้อ 1.2 ตามตัวอักษร (ห้ามแก้เอกสารเดิม) แม้จะไม่ใช่ข้อมูลวิจัยก็ตาม
3. **`projectTeams` และ `shopPurchases` ไม่มีกฎใน `firestore.rules`** — TeamSync และการซื้อของใน AvatarShop จึงถูกปฏิเสธทุกครั้งบน production (มี 0 เอกสาร) ถ้า Project Studio จะต่อยอด TeamSync ต้องเพิ่มบล็อกกฎของ `projectTeams` ด้วย (ถือเป็นการเพิ่มบล็อก ไม่ได้ผ่อนกฎเดิม)
4. **ทีมของ TeamSync ไม่ผูกกับรายวิชา** (`playerStats.teamId` มีได้ค่าเดียว) — `studio_projects` จะเก็บ `courseId` + `teamId` เอง ถ้านักเรียนอยู่หลายรายวิชาจะใช้ทีมได้ทีมเดียว
5. **การสำรองแบบเต็ม** อ่านราว 37,000 ครั้ง ใกล้โควตาฟรี 50,000 ครั้งต่อวัน ควรรันนอกเวลาเรียน หรือใช้ `gcloud firestore export` แทน
6. **การ lazy load ภายใต้ Babel standalone** ต้อง transform ตอนโหลด ครั้งแรกที่เข้าหน้า Studio จะช้าราว 0.5–1 วินาที แต่รายวิชาเดิมไม่ได้รับผลกระทบ
7. ข้อ 7.2 (regression grader) — `gradeSubmission` เรียก runner จริงและเขียน Firestore จึงต้องทดสอบผ่าน emulator และ mock `runSingleTest` หรือเรียก Worker จริง (มีค่าใช้จ่ายด้านโควตา)

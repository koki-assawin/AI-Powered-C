# ตรวจความสอดคล้องชื่อฟีเจอร์ APCC กับเอกสารรายงาน (UI Naming Audit)

ตรวจจาก commit `d798c1f` (main) วันที่ 2026-09-22 โดยอ่านโค้ดอย่างเดียว ไม่ได้แก้โค้ด

## 1. ตารางชื่อที่ผู้ใช้เห็นบนหน้าจอ (กลไกคำใบ้และโค้ช)

### 1.1 กลไกคำใบ้หลัก (หน้าทำโจทย์)

| ชื่อที่ปรากฏบนหน้าจอ | ไฟล์:บรรทัด | หน้าจอ/คอมโพเนนต์ | ผู้เห็น | ชื่อในโค้ด |
|---|---|---|---|---|
| **💡 AI Scaffolding (คำใบ้)** (หัวแผง) | js/pages/student/CodingWorkspace.js:1447 | CodingWorkspace แท็บผลตรวจ | นักเรียน | `scaffoldHint`, `handleHint`, `getSocraticHint` |
| ใบ้แล้ว N/4 ระดับ / ยังไม่ได้ขอใบ้ | CodingWorkspace.js:1450 | เดียวกัน | นักเรียน | `hintLevel` |
| ❓ คำถาม · 📖 Concept · 🗺 Scaffold · 🔍 Error (ปุ่มระดับ 1–4) | CodingWorkspace.js:1458-1461 | เดียวกัน | นักเรียน | อาร์เรย์ `{l, label, desc}` |
| tooltip: ตั้งคำถามกระตุ้นให้คิด / อธิบาย Concept หลัก / โครงสร้าง Pseudocode / วิเคราะห์ Error Pattern | CodingWorkspace.js:1458-1461, 1466 (`title`) | เดียวกัน | นักเรียน | `h.desc` |
| 💡 ขอคำใบ้ระดับที่ 1 | CodingWorkspace.js:1482 | เดียวกัน | นักเรียน | `handleHint` |
| AI กำลังสร้างคำใบ้... | CodingWorkspace.js:1488 | เดียวกัน | นักเรียน | `hintLoading` |
| ระดับ N · ขอระดับ N+1 → | CodingWorkspace.js:1500, 1506 | เดียวกัน | นักเรียน | `hintLevel` |
| 🔄 วิเคราะห์โค้ดที่ส่งล่าสุด | CodingWorkspace.js:1514 | เดียวกัน | นักเรียน | `handleHint(true)` |
| ขออภัย ไม่สามารถขอคำใบ้ได้: … | CodingWorkspace.js:216 | เดียวกัน | นักเรียน | — |
| ปิดระบบ AI ช่วยเหลือชั่วคราว (กติกาโหมดสอบ) | CodingWorkspace.js:671 | CodingWorkspace โหมดสอบ | นักเรียน | `isExamMode` |

### 1.2 โค้ช AI อื่น ๆ ที่ผู้ใช้เห็น

| ชื่อที่ปรากฏบนหน้าจอ | ไฟล์:บรรทัด | หน้าจอ/คอมโพเนนต์ | ผู้เห็น | ชื่อในโค้ด |
|---|---|---|---|---|
| 🧡 AI Coach พูดว่า... | CodingWorkspace.js:771 | CodingWorkspace (ส่งไม่ผ่าน 3 ครั้งติด) | นักเรียน | `getMindsetCoach` (aiCoach.js:25) |
| 🚀 Challenge Coach | CodingWorkspace.js:793 | CodingWorkspace (คะแนน ≥ 90) | นักเรียน | `getChallengeCoach` |
| 🔍 Diagnostic Coach / 🔍 วิเคราะห์จุดอ่อน | StudentDashboard.js:354, 382 | Student Dashboard | นักเรียน | `getDiagnosticCoach` |
| 📊 Analytics Coach | StudentDashboard.js:392 | Student Dashboard | นักเรียน | `getAnalyticsCoach` |
| AI แจ้งเตือน: ต้องการความช่วยเหลือ / แนวโน้มที่ควรระวัง | StudentDashboard.js:285 | Student Dashboard | นักเรียน | `riskAlert`, `getPredictiveRiskAlert` |
| ลองใช้ Hint ระดับ 2-3 ก่อนส่งงาน… | StudentDashboard.js:295 | Student Dashboard | นักเรียน | — |
| AI Coach กำลังวิเคราะห์... / AI Coach วิเคราะห์ | games/EthicsQuiz.js:184, 371 | เกม AI Ethics Quiz | นักเรียน | `_CoachMessage` |
| 💡 Hint (ปุ่ม) / ไม่สามารถโหลด hint ได้ | LearningTools.js:692, 639 | Pattern Sandbox (ในศูนย์การเรียนรู้) | นักเรียน | `getHint` |
| 💡 ขอคำใบ้ / ซ่อนคำใบ้ / 💡 คำใบ้: … (คำใบ้คงที่ ไม่ใช่ AI) | games/BugHunt.js:170, 180 | เกม Bug Hunt | นักเรียน | `showHint`, `bug.hint` |
| 💡 Hints (คลิกเพื่อดู) (คำใบ้ที่ครูเขียน) | StudentActivityView.js:232 | Loop Autopsy | นักเรียน | `cur.hints` |
| 💡 ขอคำใบ้ / ซ่อนคำใบ้ (คำใบ้คงที่) | GuestLandingPage.js:406 | หน้าทดลองใช้ | ผู้เยี่ยมชม | `problem.hint` |
| 💡 คำใบ้ AI · เลือกระดับคำใบ้: · ระดับ 1/2/3 | GuestLandingPage.js:431, 472, 477 | หน้าทดลองใช้ | ผู้เยี่ยมชม | `doHint`, `getScaffoldingHint` |
| ไม่สามารถขอคำใบ้ได้ในขณะนี้ | GuestLandingPage.js:284 | หน้าทดลองใช้ | ผู้เยี่ยมชม | — |
| XP · อันดับ · AI Coach · ส่งงาน (ข้อความชวนสมัคร) | GuestLandingPage.js:523, 824, 1087 | หน้าทดลองใช้ | ผู้เยี่ยมชม | — |
| บทสนทนา AI Coach / Google Gemini API — …สำหรับ AI Coach | PrivacyPolicy.js:73, 111, 122 | นโยบายความเป็นส่วนตัว | ทุกคน | — |

### 1.3 หน้าจอครูและแอดมินที่อ้างถึงคำใบ้หรือโค้ช

| ชื่อที่ปรากฏบนหน้าจอ | ไฟล์:บรรทัด | หน้าจอ/คอมโพเนนต์ | ผู้เห็น | ชื่อในโค้ด |
|---|---|---|---|---|
| ขอ Hint Lv.3 — ต้นภาค / ปลายภาค | TeacherDashboard.js:185, 188 | Teacher Dashboard (KPI) | ครู | `hintEarlyPct`, `hintLatePct` |
| **Socratic Coach** + Trace Table ก่อน Code… (คำแนะนำกลุ่ม C) | StudentAnalytics.js:1722 → แสดงที่ 1940, 2016 | วิเคราะห์นักเรียน › 🧩 กลุ่มผู้เรียน | ครู | `GROUP_META.C.apcc` |
| Challenge Coach… / Mindset Coach… + Hint Lv.3 | StudentAnalytics.js:1710, 1728 | เดียวกัน | ครู | `GROUP_META.A/D.apcc` |
| 🤖 Coach Interactions Log (ข้อมูลวิจัย) | StudentAnalytics.js:2445 | วิเคราะห์นักเรียน › 🎮 Gamification | ครู | `_GamificationTab`, `coachLogs` |
| ปุ่มกรอง mindset / **socratic** / analytics / diagnostic / challenge และป้าย **SOCRATIC** | StudentAnalytics.js:2452-2459, 2477 | เดียวกัน | ครู | `coachFilter`, `log.coachRole` |
| นักเรียนที่ควรได้รับความช่วยเหลือเพิ่มเติม | StudentAnalytics.js:1445 | วิเคราะห์นักเรียน › 🤖 รายงาน AI | ครู | — |
| อนุญาต AI Hint / อนุญาต AI Analysis | ActivityBuilder.js:433-434 | 🎯 สร้างกิจกรรม | ครู | `aiCoach.allowHint/allowAnalysis` |
| AI ช่วยได้ มีการ hint (ประเภทโจทย์แบบฝึกหัด) | AssignmentManager.js:894 | จัดการโจทย์ | ครู | — |
| 🤖 Coach Interactions — การใช้ AI Coach ทุกประเภท | GamificationAdmin.js:434 | Gamification (export) | ครู | — |
| AI คำใบ้ · 💡 ขอคำใบ้ · 💡 การใช้คำใบ้ตามระดับ · ระดับ N | UsageAnalytics.js:36, 313, 368, 321 | Usage Analytics | แอดมิน | event `ai_hint` |

### 1.4 ชื่อระบบในแถบหัว (Navbar)

| ชื่อที่ปรากฏ | ไฟล์:บรรทัด | ที่แสดง |
|---|---|---|
| AI-Powered Coding Coach (APCC) | หน้าส่วนใหญ่ เช่น CodingWorkspace.js:689, TeacherDashboard.js:272 | หัวทุกหน้า |
| AI-Powered Coding Coach (ไม่มี "(APCC)") | LearningHub.js:999, ContentManager.js:559 | ศูนย์การเรียนรู้, จัดการเนื้อหา |
| AI Coding Platform (ค่าเริ่มต้นเมื่อหน้าไม่ส่ง title) | components/Navbar.js:3, 206 | — |
| โค้ชโค้ดอัจฉริยะ ขับเคลื่อนด้วยปัญญาประดิษฐ์ | LoginPage.js:98, RegisterPage.js:112 | หน้า Login/Register |
| คู่มือใช้ชื่อ "AI-Powered Coding Platform" | STUDENT_GUIDE.md:2, TEACHER_GUIDE.md:2 | คู่มือ |

## 2. ผลตรวจ 4 ประเด็นเรื่องคำใบ้

### 3.1 ใช้ชื่อเดียวกันทุกหน้าจอหรือไม่ — **ไม่**
ชื่อที่พบแยกตามที่ใช้:
- **CodingWorkspace (หน้าทำโจทย์ ซึ่งเป็นกลไกหลัก):** "💡 AI Scaffolding (คำใบ้)" (1447) และปุ่ม "ขอคำใบ้ระดับที่ 1" (1482)
- **คู่มือนักเรียน:** "การขอ Hint จาก AI Coach" และปุ่ม **"💡 ขอ Hint"** (STUDENT_GUIDE.md:252-258) ซึ่ง**ไม่มีปุ่มชื่อนี้อยู่จริงบนหน้าจอ**
- **หน้าทดลองใช้:** "💡 คำใบ้ AI" (GuestLandingPage.js:431) มี 3 ระดับ ไม่ใช่ 4
- **Pattern Sandbox:** "💡 Hint" (LearningTools.js:692)
- **หน้าครู:** "Hint Lv.3" (TeacherDashboard.js:185), "Socratic Coach" (StudentAnalytics.js:1722), "socratic"/"SOCRATIC" (2459, 2477)
- **หน้าแอดมิน:** "AI คำใบ้" / "ขอคำใบ้" (UsageAnalytics.js:36, 313)

ชื่อระดับไม่ตรงกันด้วย:
- ปุ่มระดับ 4 บนหน้าจอชื่อ "🔍 Error" (CodingWorkspace.js:1461)
- คู่มือเขียนว่า "วิเคราะห์โค้ดที่เขียน — บอกว่า Logic ผิดตรงไหน" (STUDENT_GUIDE.md:274)

ชื่อหน้าอื่นที่ไม่ตรงกัน (นอกเรื่องคำใบ้):
- **Realtime Dashboard:** เมนูชื่อ "Realtime Dashboard" (Navbar.js:148) แต่หัวหน้าเขียน "📡 Classroom Monitor" (RealtimeDashboard.js:159)
- **ศูนย์การเรียนรู้:** เมนูชื่อ "Learning Tools" (Navbar.js:121) แต่หน้าที่เปิดคือ "ศูนย์การเรียนรู้" (app.js:61-62, LearningHub.js:999)
- **วิเคราะห์นักเรียน:** เมนูชื่อ "วิเคราะห์นักเรียน" (Navbar.js:160) แต่หัวหน้าเขียน "วิเคราะห์ผลการเรียน" (StudentAnalytics.js:512)

### 3.2 คำว่า "Socratic" / "โสเครติส" โผล่ให้ผู้ใช้เห็นหรือไม่
- **นักเรียน:** ไม่มีข้อความ UI ที่เขียนตายตัวว่า "Socratic" หรือ "โสเครติส" ในหน้าจอนักเรียน
  - ข้อควรระวัง: prompt ที่ส่งให้ Gemini เขียนว่า "คุณคือ Socratic Coach" (aiCoach.js:72) และ "ตั้งคำถามแบบโสเครติส" (aiCoach.js:61) ข้อความตอบของ AI จึง**อาจ**มีคำนี้ปรากฏได้ เพราะไม่มีการกรองคำนี้ออก
- **ครู:** เห็นคำนี้ 3 จุด
  - "Socratic Coach + Trace Table…" (StudentAnalytics.js:1722 แสดงที่ 1940 และ 2016)
  - ปุ่มกรอง "socratic" (2459)
  - ป้าย "SOCRATIC" (2477)
- **แอดมิน:** ไม่พบ
- **คู่มือนักเรียน:** มีคำว่า "Socratic" (STUDENT_GUIDE.md:259, 271)
- **คอมเมนต์และชื่อฟังก์ชันในโค้ด (ผู้ใช้ไม่เห็น):** `getSocraticHint`, aiCoach.js:46, hintEngine.js:1

### 3.3 ระบบคำใบ้มีกี่ระดับจริง และเงื่อนไขการเลื่อนระดับ
- **หน้าทำโจทย์ (กลไกหลัก): 4 ระดับ**
  - ปุ่มระดับอยู่ที่ CodingWorkspace.js:1457-1461
  - เพดานระดับ `Math.min(hintLevel + 1, 4)` อยู่ที่บรรทัด 191
  - aiCoach.js:54 บังคับค่าให้อยู่ในช่วง 1–4
  - คำสั่งแต่ละระดับอยู่ที่ aiCoach.js:60-65 (คำถาม → Concept → Scaffold → Error Pattern)
- **การเลื่อนระดับ:** ผู้เรียนต้องกดเองทีละขั้น ครั้งละ +1 (บรรทัด 191)
  - ข้ามระดับไม่ได้: กดปุ่มระดับไหนก็เรียก `handleHint` ซึ่งเลื่อนขึ้นเพียง 1 ระดับ (1464)
  - ไม่มีการเลื่อนระดับอัตโนมัติตามคะแนนหรือจำนวนครั้งที่ผิด
  - ปุ่ม "🔄 วิเคราะห์โค้ดที่ส่งล่าสุด" ขอคำใบ้ใหม่ที่**ระดับเดิม** (`reanalyze` บรรทัด 191, 1510)
- **การรีเซ็ตระดับ:** กลับเป็น 0 เฉพาะเมื่อเลือกโจทย์ใหม่ (บรรทัด 228)
  - ระดับคงอยู่ข้ามการส่งงานหลายครั้งของโจทย์เดิม
  - ค่านี้เป็น state ในหน้าเว็บ ถ้ารีเฟรชหน้าก็กลับเป็น 0
- **หน้าทดลองใช้ (Guest): 3 ระดับ**
  - เลือกระดับไหนก่อนก็ได้ ไม่ต้องไล่ลำดับ (GuestLandingPage.js:474-477)
  - ใช้ `getScaffoldingHint` ซึ่งมี 3 ระดับ (gemini.js:420-424)
- **หมายเหตุ:** คอมเมนต์ที่ CodingWorkspace.js:39 ยังเขียนว่า "1/2/3" ซึ่งล้าสมัย แต่ผู้ใช้ไม่เห็น

### 3.4 มีเงื่อนไขบังคับให้พยายามก่อนขอคำใบ้หรือไม่
- **ต้องกด Submit อย่างน้อย 1 ครั้ง และผลยังไม่ผ่านทุกกรณีทดสอบ**
  - แผงคำใบ้แสดงเฉพาะเมื่อมี `gradeResult` (CodingWorkspace.js:1392) และ `gradeResult.status !== 'accepted'` และไม่ใช่โหมดสอบ (1443)
  - การกด "ทดสอบตัวอย่าง" อย่างเดียวไม่ทำให้แผงคำใบ้แสดง
- **ไม่มีเวลารอก่อนขอคำใบ้** และ**ไม่จำกัดจำนวนครั้งที่ขอ**
- **ค่าที่ตั้งได้แต่ระบบไม่ได้ใช้จริง:** ค่า `maxHintsPerSub: 3` และ `allowHint` ใน Activity Builder (ActivityBuilder.js:182, 433) ถูกบันทึกลงฐานข้อมูล แต่**ไม่มีโค้ดใดอ่านไปใช้บังคับ** (ค้นทั้ง `js/` พบเฉพาะใน ActivityBuilder.js)
- **เงื่อนไขอื่นที่มี (ไม่ใช่การขอคำใบ้):**
  - ต้องเว้นระยะการส่งงาน 30 วินาทีต่อครั้ง (grader.js:206-216)
  - Mindset Coach ขึ้นเองหลังส่งแล้วได้คะแนนต่ำกว่า 60 ติดกัน 3 ครั้ง (CodingWorkspace.js:322-334)

## 3. ฟีเจอร์อื่นที่รายงานอ้างถึง

| ฟีเจอร์ | มีจริงไหม | ชื่อที่ผู้ใช้เห็น | หลักฐานและรายละเอียด |
|---|---|---|---|
| ตรวจงานอัตโนมัติด้วยกรณีทดสอบ | ✅ มี | "ทดสอบตัวอย่าง" (CodingWorkspace.js:992), "ผ่าน X/Y Test Cases" (1409), "จัดการ Test Cases" (TestCaseEditor.js:165) | ดูรายละเอียดใต้ตาราง |
| แดชบอร์ดวิเคราะห์ผู้เรียน | ✅ มี | เมนู "วิเคราะห์นักเรียน" (Navbar.js:160), หน้า "วิเคราะห์ผลการเรียน" (StudentAnalytics.js:512) | **5 มิติ** ดูรายละเอียดใต้ตาราง |
| แจ้งเตือนความเสี่ยงเชิงพยากรณ์ | ✅ มี (ใช้กฎเกณฑ์ ไม่ใช่โมเดล ML) | ครู: "เสี่ยงตกกลุ่ม (พยากรณ์)", "🔮 นักเรียนเสี่ยงตกกลุ่ม — คาดการณ์จากแนวโน้มคะแนน" (RealtimeDashboard.js:193, 254, 314) · นักเรียน: "AI แจ้งเตือน: …" (StudentDashboard.js:285) | ดูรายละเอียดใต้ตาราง |
| ศูนย์การเรียนรู้ | ✅ มี | หน้า "ศูนย์การเรียนรู้" (LearningHub.js:999) แต่เมนูชื่อ "Learning Tools" (Navbar.js:121) | **5 หน่วย, 20 หัวข้อ, 5 เครื่องมือ** ดูรายละเอียดใต้ตาราง |
| เกมมิฟิเคชัน | ✅ มี | ดูรายละเอียดใต้ตาราง | **Achievement 13 รายการ แต่ปลดล็อกได้จริง 10** |
| Activity Builder | ✅ มี แต่**ไม่มีคำว่า "Activity Builder" บนหน้าจอ** | หัวหน้า "🎯 สร้างกิจกรรม" (ActivityBuilder.js:334), ปุ่ม "🎯 กิจกรรม" ในการ์ดรายวิชา (CourseBuilder.js:348-351) | ดูรายละเอียดใต้ตาราง |
| บันทึกการขอคำใบ้รายบุคคล | ✅ มี 3 แหล่ง | "🤖 Coach Interactions Log (ข้อมูลวิจัย)" (StudentAnalytics.js:2445) | ดูหัวข้อ "บันทึกการขอคำใบ้รายบุคคล" ด้านล่าง |

**ตรวจงานอัตโนมัติ**
- `gradeSubmission` (grader.js:223-292) ตรวจกรณีทดสอบทั้งแบบเปิดและแบบซ่อน (`isHidden`)
- คะแนนถ่วงตามน้ำหนักของแต่ละเคส (244-247)
- สถานะผลตรวจ: accepted / compile_error / runtime_error / wrong_answer (250-257)
- เทียบผลลัพธ์แบบตรงตัวทุกตัวอักษร หลังแปลง CRLF เป็น LF และตัดช่องว่างหัวท้าย (`normalizeOutput` บรรทัด 110-113)

**แดชบอร์ดวิเคราะห์ 5 มิติ**
- 5 มิติคือ คะแนนเฉลี่ย · อัตราผ่าน · ครอบคลุม · ความพยายาม · พัฒนาการ (StudentAnalytics.js:1573 ใช้สูตรที่บรรทัด 1538-1561) แสดงเป็นกราฟเรดาร์ในแท็บรายบุคคล (820)
- แบ่งผู้เรียนเป็น 4 กลุ่ม A–D จาก 5 มิตินี้ (1705-1729, 1741)
- มี 7 แท็บ (563-569): ภาพรวม, รายบุคคล, สรุปคะแนนทุกคน, คะแนนฝึกเอง, รายงาน AI, Gamification, กลุ่มผู้เรียน

**แจ้งเตือนความเสี่ยง**
- ใช้ `getPredictiveRiskAlert` (aiCoach.js:117-173) และต้องมีงานส่งอย่างน้อย 3 ครั้ง (125)
- **สูง:** 3 ครั้งล่าสุดได้ต่ำกว่า 60 ทั้งหมด หรือมีโจทย์ข้อใดข้อหนึ่งไม่ผ่านตั้งแต่ 3 ครั้งขึ้นไปใน 15 ครั้งล่าสุด (130, 140, 143)
- **ปานกลาง:** คะแนนเฉลี่ย 5 ครั้งล่าสุดต่ำกว่า 50 หรือคะแนนลดลงเกิน 15 (131, 144)
- AI (Gemini) ใช้เพียงเขียนข้อความแจ้งเตือน (162) ส่วนการตัดสินระดับความเสี่ยงเป็นกฎเกณฑ์ทั้งหมด
- **ไม่ควรเขียนในรายงานว่าใช้โมเดล Machine Learning**

**ศูนย์การเรียนรู้**
- 5 หน่วย (LearningHub.js:44-50)
- **20 หัวข้อในระบบ** (55-685): หน่วยที่ 1 มี 6, หน่วยที่ 2 มี 4, หน่วยที่ 3 มี 3, หน่วยที่ 4 มี 4, หน่วยที่ 5 มี 3
- ครูเพิ่มหัวข้อเองได้จาก `learningTopics` (962)
- **5 เครื่องมือ:** Data Type Visualizer, Flowchart → C Code, Decision Tree, Pattern Sandbox, Memory Map (717-723; LearningTools.js:929-970)
- หน้าแยก `LearningTools` (LearningTools.js:972) ไม่มี route ชี้ไป ผู้ใช้เปิดเครื่องมือได้ผ่านหัวข้อในศูนย์การเรียนรู้เท่านั้น
- เกมย่อย 6 เกมเป็นเมนู "เกม" แยกต่างหาก (MiniGameHub.js:42-108)

**เกมมิฟิเคชัน**
- องค์ประกอบที่มีจริง:
  - XP (gamification.js:35-40, 103-149)
  - Rank 10 ขั้น ตั้งแต่ ไข่โปรแกรม ถึง เทพเจ้า AI (5-16)
  - Streak ล็อกอินต่อเนื่อง (172-224)
  - Leaderboard รายวัน/รายสัปดาห์/ทั้งหมด (228-; เมนู "อันดับ" Navbar.js:136)
  - Achievement (achievementEngine.js:5-151; เมนู "ความสำเร็จ")
  - เหรียญ CodeCoin/Crystal (gamification.js:118-119)
  - Avatar Shop (app.js:57-58)
  - Season พร้อมตัวคูณ XP (90-113)
- **Achievement นิยามไว้ 13 รายการ แต่ปลดล็อกได้จริง 10** อีก 3 รายการเงื่อนไขไม่มีทางเป็นจริง:
  - `speed_demon`: เวลาทำโจทย์ถูกฝังค่าไว้ที่ 9999 วินาที (CodingWorkspace.js:380)
  - `all_assignments`: ส่ง `unitPassRate: 0, unitTotal: 0` เสมอ (381-382)
  - `bug_exterminator`: BugHunt ไม่ได้ส่งค่า `gameStreak` (BugHunt.js:65-67)

**Activity Builder**
- route `#/teacher/activities` (app.js:93-94) ไม่อยู่ในเมนูหลัก
- สร้างกิจกรรมได้ 4 ประเภท: Coding Platform, Loop Autopsy, Quiz Blitz, Pre / Post Test (ActivityBuilder.js:326-329)
- ค่าตั้ง AI (อนุญาต AI Hint / Analysis, จำนวนคำใบ้สูงสุด) ถูกบันทึก แต่**ไม่ถูกบังคับใช้** (ดูข้อ 3.4)

### บันทึกการขอคำใบ้รายบุคคล (อะไรถูกเก็บใน Firestore)

1. **`coachInteractions`**: เขียนโดย `_logCoachInteraction` (aiCoach.js:7-21) ทุกครั้งที่ขอคำใบ้ (104-105; กรณี AI ล้มเหลวที่ 109-110)
   - ฟิลด์: `uid`, `coachRole: 'socratic'`, `triggerEvent: 'hint_level_N'` (ต่อท้าย `_local` เมื่อใช้คำใบ้สำรองในเครื่อง), `relatedId` = **ชื่อโจทย์** (ไม่ใช่ id), `prompt` = สรุป (ชื่อโจทย์, ระดับ, ประเภทข้อผิดพลาด; ไม่เกิน 500 ตัวอักษร), `response` = คำใบ้ที่แสดง (ไม่เกิน 1000 ตัวอักษร), `createdAt`
   - **ไม่เก็บ:** โค้ดของนักเรียน, `assignmentId`, `courseId`
   - สิทธิ์อ่าน: เจ้าของ ครู และแอดมิน (firestore.rules:169-174)
2. **`usageEvents`** (analytics.js:5-21 เรียกจาก CodingWorkspace.js:193): `uid`, `event:'ai_hint'`, `date`, `courseId`, `assignmentId`, `hintLevel`, `userType`, `timestamp`
3. **`submissions.hintLevelUsed`** (CodingWorkspace.js:303-307): ระดับคำใบ้สูงสุดที่ขอไปแล้ว ณ เวลาส่งงาน

**ที่ดูข้อมูลได้**
- ครู: log 50 รายการล่าสุดของ**ทั้งระบบ** (StudentAnalytics.js:2086) ไม่ได้กรองตามรายวิชาหรือรายคน
- ครู: KPI "Hint Lv.3" ต้นภาคและปลายภาค (TeacherDashboard.js:56-96)
- แอดมิน: จำนวนคำใบ้แยกตามระดับ (UsageAnalytics.js:318-322)
- **ไม่พบหน้าจอที่แสดงประวัติการขอคำใบ้ของนักเรียนทีละคน** ข้อมูลรายบุคคลมีอยู่ในฐานข้อมูล และส่งออกได้ทาง Export (GamificationAdmin.js:434)
- ผู้เยี่ยมชมบันทึกเฉพาะ `usageEvents` ด้วย uid `'demo'`

## 4. รุ่นของระบบ

- **package.json ไม่มีฟิลด์ `version`** (มีแค่ devDependencies ของ firebase-admin)
- เลขรุ่นที่แสดงในระบบคือ **"v3.0 (LMS Edition)"** (SystemSettings.js:284 หน้าแอดมิน) ซึ่งไม่ได้อัปเดตตามการพัฒนาจริง
- **ไม่มี git tag เลย** (`git tag` ว่าง) จึงสรุปตามรุ่นที่มี tag ไม่ได้
- ด้านล่างเป็นเลขรุ่นที่ปรากฏในข้อความ commit แทน (ไม่ใช่ tag)

| วันที่ | commit | รุ่นในข้อความ commit | สาระ |
|---|---|---|---|
| 2026-01-11 | 37a6146 / dee0df9 / b7f2131 / b88e93e | v2.0–v2.3 | ระบบฝึกโค้ดรุ่นแรก, ย้ายคีย์ไป Firebase (CHANGELOG.md หยุดอัปเดตที่ v2.3) |
| 2026-03-18 | 4a338a8 | v3.0 | เปลี่ยนเป็น LMS เต็มรูปแบบ |
| 2026-03-18 | da74e8b | v3.2 | รหัสห้องเรียน, คัดลอกรายวิชา |
| 2026-03-19 | 45f5241 | v4.0 | เปลี่ยนธีมและชื่อแพลตฟอร์ม |
| 2026-03-19 | 24cc6b1 | v4.1 | **AI Scaffolding hints 3 ระดับ**, Exam Mode, กราฟวิเคราะห์ |
| 2026-03-19 | 8d88719 – 7434312 | v4.4–v4.6 | ฝึกเอง, AI สร้าง Test Case, วิเคราะห์ขั้นสูง |
| 2026-03-20 | 529e4c5 | v4.8 | ครูร่วมสอน |
| 2026-04-28 | 832bd4f | v5.0 | **Gamification + AI Coaching (5 โค้ช, คำใบ้ 4 ระดับ)** |
| 2026-05-17 | f781672 | v5.1 | Mastery Learning, Predictive AI Coach, เกมใหม่ 2 เกม |
| 2026-06-07 | 45d2d46 | (docs v5.4) | ตัวเก็บข้อมูลวิจัย Hint Lv.3 |
| 2026-08-08 | d273293 / 1507d76 | (docs v5.5) | ศูนย์การเรียนรู้รายวิชา |
| 2026-08-30 | df363ba | — | QuickPoll |
| 2026-09-21 | 19dc5fb / d798c1f | — | คำใบ้เจาะจงตามกรณีทดสอบที่ไม่ผ่าน (hintEngine) |

หมายเหตุ: ตัวเลขเช่น FreeEditor v7.0 หรือ Leaderboard v6.0 เป็นเลข cache-busting ของไฟล์เดี่ยว ไม่ใช่รุ่นของระบบ

## 5. สิ่งที่ควรแก้ในรายงานหรือระบบ (สรุปความเสี่ยงที่กรรมการจะตั้งข้อสังเกต)

1. **ชื่อกลไกคำใบ้:** หน้าจอนักเรียนใช้ "AI Scaffolding (คำใบ้)" แต่คู่มือใช้ "Hint จาก AI Coach / ปุ่ม 💡 ขอ Hint" ต้องเลือกชื่อเดียวแล้วใช้ให้ตรงกันทั้งรายงาน คู่มือ และหน้าจอ
2. **คำว่า Socratic:** ครูเห็นคำนี้ แต่นักเรียนไม่เห็นบนหน้าจอ (ยกเว้นในคู่มือ และอาจอยู่ในข้อความที่ AI ตอบ)
3. **ระดับคำใบ้:** 4 ระดับเฉพาะหน้าทำโจทย์ ส่วนหน้าทดลองใช้มี 3 ระดับ
4. **เงื่อนไขก่อนขอคำใบ้:** มีเพียง "ต้องส่งงานแล้วไม่ผ่าน 1 ครั้ง" ไม่มีการจำกัดเวลาหรือจำนวน (ค่า `maxHintsPerSub` ไม่ถูกบังคับใช้)
5. **Predictive Risk Alert:** เป็นกฎเกณฑ์ ไม่ใช่ ML
6. **Achievement:** มี 13 รายการ แต่ได้จริง 10
7. **ชื่อเมนูไม่ตรงกับชื่อหน้า:** Realtime Dashboard/Classroom Monitor, Learning Tools/ศูนย์การเรียนรู้, วิเคราะห์นักเรียน/วิเคราะห์ผลการเรียน
8. **ชื่อระบบ:** หน้าจอใช้ "AI-Powered Coding Coach (APCC)" แต่คู่มือใช้ "AI-Powered Coding Platform"
9. **เลขรุ่น:** หน้าจอแสดง v3.0 และไม่มี git tag

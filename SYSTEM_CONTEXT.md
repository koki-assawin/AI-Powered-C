# AI-Powered Coding LMS — System Context (ไฟล์แนบสำหรับ AI Research)

> ไฟล์นี้สรุปรายละเอียดระบบทั้งหมดอย่างละเอียด เพื่อให้ AI เข้าใจโครงสร้างและบริบทของระบบได้ทันที  
> อัปเดตล่าสุด: 2026-06-03

---

## 1. ภาพรวมโครงการ

| รายการ | รายละเอียด |
|---|---|
| ชื่อโปรเจกต์ | AI-Powered Coding Assessment & Practice Platform |
| เวอร์ชัน | 5.4 (Gamification + AI Coaching + Mini-Games) |
| ภาษาหลัก UI | ภาษาไทย (ปนอังกฤษ) |
| สถาปัตยกรรม | Frontend-Only SPA (Single Page Application) — ไม่มี backend server |
| ที่ตั้ง | `c:/xampp/htdocs/AI-Powered-C/` |
| วัตถุประสงค์ | ระบบ LMS สำหรับสอนเขียนโปรแกรม (C) พร้อม AI Coaching 5 บทบาท, ระบบ Gamification, Mini-Games, และเครื่องมือวิจัย |
| กลุ่มเป้าหมาย | นักเรียน ม.4/6 (32 คน), ครูผู้สอน, ผู้ดูแลระบบ |
| วิชา | ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น |

---

## 2. เทคโนโลยีที่ใช้

### Frontend
- **React 17** (CDN, development bundle) — ไม่มี build system
- **Babel Standalone** — transpile JSX ใน browser ตรงๆ
- **Tailwind CSS** (CDN) + **Bootstrap 5.3.3** — layout และ utility classes
- **CodeMirror 5.65.16** — code editor
  - Modes: c / Theme: Dracula + หลาย theme / Addons: auto-close, match-brackets, comment
- **Chart.js** — radar chart และ bar chart แสดงผล analytics
- **Highlight.js 11.9.0** — syntax highlighting ในผลลัพธ์
- **Google Fonts** — Prompt (Thai/Latin), JetBrains Mono (code)

### Backend Services (Cloud)
- **Firebase Auth** — email/password authentication
- **Cloud Firestore** — primary database สำหรับ LMS data ทั้งหมด (23 collections)
- **Google Gemini 2.0 Flash** — AI engine (coaching, mini-game generation, hints, analytics reports)
- **Wandbox API** → **Piston API** → **Judge0** — code execution fallback chain

### Firebase Project
- **Project ID:** `ai-powered-coding-596ed`
- **Auth Domain:** `ai-powered-coding-596ed.firebaseapp.com`
- **Region:** asia-southeast1 (Singapore)
- **Gemini API Key:** เก็บใน Firestore `config/gemini` (Admin ตั้งค่าผ่าน UI)

---

## 3. โครงสร้างไฟล์ทั้งหมด

```
AI-Powered-C/
├── index.html                    # Shell HTML — โหลด CDN + js/ ตามลำดับที่กำหนด
├── js/
│   ├── firebase.js               # Firebase init, LANGUAGES config, loadGeminiKey()
│   ├── gemini.js                 # Gemini API wrapper (analyzeCode, generateProblems, ฯลฯ)
│   ├── grader.js                 # Auto-grader: Wandbox → Piston → Judge0 fallback
│   ├── gamification.js           # XP/Rank/Streak/Leaderboard engine
│   ├── achievementEngine.js      # Achievement definitions (13 รายการ) + checker
│   ├── aiCoach.js                # 5 AI Coach roles + Predictive Risk Alert
│   ├── miniGameGenerator.js      # Mini-game content generator (Gemini + fallback)
│   ├── context.js                # React AuthContext + useAuth hook + RBAC + handleDailyStreak
│   ├── app.js                    # Root App component + hash router (โหลดสุดท้าย)
│   │
│   ├── components/
│   │   ├── CodeEditor.js         # CodeMirror 5 wrapper component
│   │   ├── Navbar.js             # Navigation bar (role-based links)
│   │   ├── ProtectedRoute.js     # RBAC gate — redirect ถ้า role ไม่ตรง
│   │   ├── RadarChart.js         # แสดงผล AI metrics ด้วย radar chart
│   │   ├── XPBar.js              # XP progress bar component
│   │   └── Spinner.js            # Loading spinner
│   │
│   └── pages/
│       ├── LoginPage.js
│       ├── RegisterPage.js
│       ├── GuestLandingPage.js           # Landing page สำหรับ Demo (ไม่ต้อง login)
│       ├── PrivacyPolicy.js              # หน้านโยบายความเป็นส่วนตัว
│       │
│       ├── shared/
│       │   └── FreeEditor.js             # Code editor อิสระ (ไม่ผูกกับโจทย์) — ครู + นักเรียน
│       │
│       ├── student/
│       │   ├── StudentDashboard.js       # หน้าหลัก: XP Bar, Rank, Streak, วิชา, Mini-game shortcuts
│       │   ├── CourseViewer.js           # รายการวิชาและโจทย์ + ลงทะเบียนวิชา
│       │   ├── CodingWorkspace.js        # *** Editor + Grader + AI Hint + Chat (หน้าหลักสำคัญ)
│       │   ├── Gradebook.js             # คะแนนทุกโจทย์ทุกวิชา
│       │   ├── SubmissionHistory.js     # ประวัติการส่งงาน + ดูโค้ดและ Feedback
│       │   ├── SelfPractice.js          # ฝึกโค้ดเอง (มีผล XP แต่ไม่มีผลเกรด)
│       │   ├── StudentProfile.js        # โปรไฟล์ + Game Stats + Achievement ล่าสุด
│       │   ├── Leaderboard.js           # อันดับ XP แยกตามวิชา (Daily/Weekly/Alltime)
│       │   ├── AchievementsPage.js      # Badge Gallery — 13 Achievement
│       │   ├── MiniGameHub.js           # หน้าเลือกเกม + สถานะวันนี้
│       │   ├── StudentActivityView.js   # Activity timeline ของนักเรียน
│       │   └── games/
│       │       ├── QuizBlitz.js         # เกม MCQ 5 ข้อ จับเวลา 30 วินาที/ข้อ
│       │       ├── CodeAutopsy.js       # เกมทาย Output โค้ด C (4 ตัวเลือก)
│       │       └── BugHunt.js           # เกมหาและแก้ Bug ในโค้ด C
│       │
│       ├── teacher/
│       │   ├── TeacherDashboard.js      # Dashboard ครู: stats + course cards + quick links
│       │   ├── CourseBuilder.js         # สร้าง/แก้ไขวิชา + co-teacher
│       │   ├── AssignmentManager.js     # สร้าง/จัดการโจทย์
│       │   ├── TestCaseEditor.js        # ออก Test Cases (visible + hidden)
│       │   ├── StudentAnalytics.js      # วิเคราะห์นักเรียน (7 แท็บ)
│       │   ├── StudentManagement.js     # จัดการนักเรียน + อนุมัติ
│       │   ├── GamificationAdmin.js     # Season, Award XP, Export, Game Stats, Leaderboard
│       │   ├── ActivityBuilder.js       # สร้าง Activity + Test Cases แบบรวดเร็ว
│       │   ├── RealtimeDashboard.js     # Real-time submission monitoring
│       │   └── ClassManager.js          # (deprecated — ไม่ใช้แล้ว)
│       │
│       └── admin/
│           ├── AdminDashboard.js        # Dashboard Admin: stats + pending approvals
│           ├── UserManager.js           # จัดการผู้ใช้ + อนุมัติบัญชี + เปลี่ยน Role
│           ├── SystemSettings.js        # ตั้งค่า Gemini API Key
│           ├── ResearchDataSeeder.js    # Seed ข้อมูลวิจัย + Export CSV
│           └── UsageAnalytics.js        # สถิติการใช้งานระบบ
│
├── functions/
│   └── index.js                  # Cloud Function: adminSetPassword (ตั้งรหัส Admin)
├── firestore.rules               # Firestore Security Rules (266 lines)
├── firestore.indexes.json        # Composite indexes
├── firebase.json                 # Firebase Hosting config
└── .firebaserc                   # Firebase project config
```

### ลำดับการโหลด Script ใน index.html (สำคัญมาก)
1. `firebase.js` → init Firebase, expose `LANGUAGES`, `db`, `auth`
2. `gemini.js` → Gemini API functions
3. `grader.js` → Auto-grading functions (Wandbox → Piston → Judge0)
4. `gamification.js` → XP/Rank/Streak/Leaderboard engine
5. `achievementEngine.js` → Achievement checker
6. `aiCoach.js` → 5 AI Coach roles + Predictive Risk Alert
7. `miniGameGenerator.js` → Mini-game content generator
8. `context.js` → AuthContext, useAuth, handleDailyStreak
9. `components/*.js` → shared components
10. `pages/**/*.js` → page components
11. `app.js` → **ต้องโหลดสุดท้ายเสมอ** (router mount)

---

## 4. Firestore Database Schema (23 Collections)

### กลุ่ม: ผู้ใช้และ Auth

**`users/{uid}`**
```
displayName    : string   — ชื่อแสดง
email          : string   — อีเมล
role           : string   — 'student' | 'teacher' | 'admin'
studentCode    : string   — รหัสนักเรียน (เช่น "11669")
number         : number   — เลขที่ในห้อง (1-32)
approvedByAdmin: boolean  — ครูอนุมัติแล้วหรือยัง
createdAt      : timestamp
```

**`playerStats/{uid}`** ← Gamification หลัก
```
xp             : number   — XP สะสมทั้งหมด
rank           : number   — ระดับ 1-10
rankName       : string   — ชื่อ Rank ภาษาไทย
codeCoin       : number   — สกุลเงินหลัก 🪙
crystal        : number   — สกุลเงินพิเศษ 💎
streakDays     : number   — Streak ต่อเนื่องปัจจุบัน
longestStreak  : number   — Streak สูงสุดตลอดกาล
lastLoginDate  : string   — 'YYYY-MM-DD' วันที่ Login ล่าสุด
dailyXP        : number   — XP วันนี้ (reset ทุกเที่ยงคืน)
weeklyXP       : number   — XP สัปดาห์นี้ (reset ทุกวันจันทร์)
seasonXP       : number   — XP ช่วง Season ปัจจุบัน
updatedAt      : timestamp
```

### กลุ่ม: วิชาและเนื้อหา

**`courses/{courseId}`**
```
title          : string   — ชื่อวิชา
description    : string   — คำอธิบาย
teacherId      : string   — uid ของครูเจ้าของวิชา
coTeacherIds   : array    — uid ของครูร่วม
isPublished    : boolean  — เปิดให้นักเรียนเห็น
classCode      : string   — รหัสสำหรับนักเรียนลงทะเบียน
enrolledCount  : number   — จำนวนนักเรียนที่ลงทะเบียน
createdAt      : timestamp
```

**`assignments/{assignmentId}`**
```
courseId       : string   — วิชาที่สังกัด
title          : string   — ชื่อโจทย์
description    : string   — โจทย์ (Markdown)
difficulty     : string   — 'easy' | 'medium' | 'hard'
dueDate        : timestamp — วันส่ง
isPublished    : boolean
totalPoints    : number   — คะแนนเต็ม
starterCode    : string   — โค้ดตั้งต้น
unitNumber     : number   — หน่วยการเรียนรู้
```

**`testCases/{testCaseId}`**
```
assignmentId   : string
description    : string   — คำอธิบาย Test Case
input          : string   — Input ที่ส่งให้โปรแกรม (stdin)
expectedOutput : string   — Output ที่คาดหวัง (normalized)
hidden         : boolean  — ซ่อนจากนักเรียน
order          : number   — ลำดับ
points         : number   — คะแนนของ Test Case นี้
```

**`lessons/{lessonId}`** (optional)
```
courseId       : string
title          : string
order          : number
content        : string   — เนื้อหา (Markdown/HTML)
videoUrl       : string   — ลิงก์วิดีโอ (optional)
```

### กลุ่ม: การลงทะเบียนและการส่งงาน

**`enrollments/{docId}`**
```
studentId      : string   — uid ของนักเรียน
courseId       : string   — วิชาที่ลงทะเบียน
enrolledAt     : timestamp
status         : string   — 'active' | 'dropped'
```

**`submissions/{submissionId}`**
```
studentId      : string
courseId       : string
assignmentId   : string
code           : string   — โค้ดที่ส่ง
language       : string   — 'c'
score          : number   — คะแนน 0-100
passed         : boolean  — ผ่านทุก Test Case หรือไม่
status         : string   — 'accepted' | 'wrong_answer' | 'error'
feedback       : string   — ความคิดเห็น AI
submittedAt    : timestamp
testResults    : array    — ผลแต่ละ Test Case [{testCaseId, passed, actualOutput, errorLog, executionTime}]
```

**`selfPracticeSubmissions/{docId}`**
```
studentId      : string
courseId       : string
code, language, score, submittedAt (เหมือน submissions)
metadata       : object   — ข้อมูลเพิ่มเติม (problem type, difficulty)
```

### กลุ่ม: Gamification

**`xpLedger/{docId}`** ← Audit Trail (ไม่เคยแก้ไข)
```
uid            : string
xpAwarded      : number
coinAwarded    : number
crystalAwarded : number
source         : string   — 'submission_accepted' | 'first_solve' |
                            'streak_bonus' | 'minigame' | 'achievement' | 'manual'
relatedId      : string   — id ของ submission/assignment ที่เกี่ยวข้อง
metadata       : object   — ข้อมูลเพิ่มเติม (score, streakDays ฯลฯ)
createdAt      : timestamp
```

**`leaderboardSnapshots/{docId}`**
```
docId format   : '{courseId}_alltime' | '{courseId}_weekly' | '{courseId}_daily'
period         : string   — 'alltime' | 'weekly' | 'daily'
courseId       : string | null
entries        : array    — [{uid, displayName, xp, rank, rankName, rankIcon,
                              dailyXP, weeklyXP, seasonXP, codeCoin, streakDays}]
updatedAt      : timestamp
```

**`achievements/{achievementId}`**
```
nameTh         : string   — ชื่อภาษาไทย
nameEn         : string   — ชื่อภาษาอังกฤษ
icon           : string   — emoji
desc           : string   — คำอธิบาย
category       : string   — 'skill' | 'streak' | 'games' | 'special'
rarity         : string   — 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
xpReward       : number
coinReward     : number
crystalReward  : number
```

**`studentAchievements/{uid_achievementId}`**
```
uid            : string
achievementId  : string
earnedAt       : timestamp
xpAwarded      : number
coinAwarded    : number
crystalAwarded : number
seeded         : boolean  — true ถ้า Seed จาก ResearchDataSeeder
```

**`seasons/{seasonId}`**
```
name           : string   — ชื่อ Season
startDate      : timestamp
endDate        : timestamp
isActive       : boolean  — มีได้แค่ 1 active ในเวลาเดียวกัน
xpMultiplier   : number   — ตัวคูณ XP (เช่น 2 = XP สองเท่า)
```

### กลุ่ม: AI Coach

**`coachInteractions/{docId}`** ← Research Measurement Variable
```
uid            : string
coachRole      : string   — 'mindset' | 'socratic' | 'analytics' |
                            'diagnostic' | 'challenge' | 'predictive'
triggerEvent   : string   — เหตุการณ์ที่ trigger (เช่น 'fail_3', 'hint_level_2')
relatedId      : string   — assignmentId ที่เกี่ยวข้อง
prompt         : string   — prompt ที่ส่ง Gemini (max 500 chars)
response       : string   — คำตอบจาก Gemini (max 1000 chars)
createdAt      : timestamp
```

### กลุ่ม: Mini-Games

**`miniGameContent/{gameType_unitId_date}`**
```
gameType       : string   — 'quiz_blitz' | 'code_autopsy' | 'bug_hunt'
unitId         : string   — หน่วยเนื้อหา
date           : string   — 'YYYY-MM-DD' (cache รายวัน)
questions      : array    — เนื้อหาเกม (generated by Gemini หรือ fallback)
isActive       : boolean
generatedBy    : string   — 'gemini' | 'fallback'
createdAt      : timestamp
```

**`miniGameSessions/{docId}`**
```
uid            : string
gameType       : string
score          : number   — 0-100
correctAnswers : number
totalQuestions : number   — มักเป็น 5
timeSpentSeconds: number
xpEarned       : number
coinEarned     : number
isFirstPlayToday: boolean — ได้ XP เต็มหรือ repeat rate
playedAt       : timestamp
seeded         : boolean
```

### กลุ่ม: ระบบ

**`config/gemini`**
```
apiKey         : string   — Gemini API Key (Admin ตั้งค่าผ่าน SystemSettings UI)
```

---

## 5. Firestore Composite Indexes

```json
{
  "indexes": [
    { "collection": "submissions",  "fields": ["studentId", "submittedAt DESC"] },
    { "collection": "submissions",  "fields": ["courseId", "studentId"] },
    { "collection": "testCases",    "fields": ["assignmentId", "hidden", "order"] },
    { "collection": "testCases",    "fields": ["assignmentId", "order"] },
    { "collection": "enrollments",  "fields": ["studentId", "courseId"] },
    { "collection": "assignments",  "fields": ["courseId", "createdAt"] },
    { "collection": "xpLedger",     "fields": ["uid", "createdAt DESC"] },
    { "collection": "miniGameSessions", "fields": ["uid", "playedAt DESC"] },
    { "collection": "coachInteractions", "fields": ["uid", "createdAt DESC"] }
  ]
}
```

---

## 6. User Roles & Routes

### บทบาทผู้ใช้งาน

| Role | การเข้าถึง | หมายเหตุ |
|---|---|---|
| `student` | student/* | สมัครแล้วได้ role นี้ทันที แต่รอครูอนุมัติก่อนใช้งาน |
| `teacher` | teacher/* + student/activity/* | ต้องรอ admin approve (`approvedByAdmin: true`) |
| `admin` | admin/* + teacher/* | ตั้งค่าด้วย Firestore Console โดยตรง |

### Hash-based Routes

**Public (ไม่ต้อง login):**
- `#/login` — LoginPage
- `#/register` — RegisterPage
- `#/privacy` — PrivacyPolicy
- `#/demo` — GuestLandingPage (Demo ระบบ)

**Student Routes:**
- `#/student/dashboard` — StudentDashboard
- `#/student/courses` — CourseViewer (เลือก/ลงทะเบียน)
- `#/student/workspace?course=ID&assignment=ID` — CodingWorkspace
- `#/student/gradebook` — Gradebook
- `#/student/history` — SubmissionHistory
- `#/student/practice` — SelfPractice
- `#/student/profile` — StudentProfile
- `#/student/leaderboard` — Leaderboard (Daily/Weekly/Alltime)
- `#/student/achievements` — AchievementsPage
- `#/student/games` — MiniGameHub
- `#/student/games/quiz` — QuizBlitz
- `#/student/games/autopsy` — CodeAutopsy
- `#/student/games/bughunt` — BugHunt
- `#/student/editor` — FreeEditor (Code editor อิสระ)
- `#/student/activity` — StudentActivityView

**Teacher Routes:**
- `#/teacher/dashboard` — TeacherDashboard
- `#/teacher/courses` — CourseBuilder
- `#/teacher/assignment?course=ID` — AssignmentManager
- `#/teacher/testcases?course=ID` — TestCaseEditor
- `#/teacher/analytics` — StudentAnalytics (7 แท็บ)
- `#/teacher/students?course=ID` — StudentManagement
- `#/teacher/gamification` — GamificationAdmin
- `#/teacher/activities` — ActivityBuilder
- `#/teacher/realtime` — RealtimeDashboard
- `#/teacher/editor` — FreeEditor

**Admin Routes:**
- `#/admin/dashboard` — AdminDashboard
- `#/admin/users` — UserManager
- `#/admin/settings` — SystemSettings
- `#/admin/seed` — ResearchDataSeeder
- `#/admin/usage` — UsageAnalytics

---

## 7. Authentication Flow

```
App Mount
    ↓
Firebase onAuthStateChanged()
    ↓
user exists? ──No──→ redirect #/login
    ↓ Yes
fetch Firestore users/{uid}
    ↓
userDoc exists? ──No──→ create new doc (role='student')
    ↓ Yes
handleDailyStreak(uid) ← อัปเดต Streak + reset dailyXP/weeklyXP ตามวัน
    ↓
expose via AuthContext:
  { user, userDoc, role, authLoading, logout() }
    ↓
ProtectedRoute checks role
  → unauthorized → redirect to own dashboard
  → authorized → render page
```

---

## 8. Gemini API Functions

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`

### js/gemini.js (LMS Core Functions)

| Function | ใช้ใน |
|---|---|
| `callGeminiApi(prompt, schema)` | base function — retry 3 ครั้ง, exponential backoff |
| `analyzeCode(code, language)` | CodingWorkspace (AI Code Analysis) |
| `generateProblems(lang, topic, diff, count)` | SelfPractice, AssignmentManager |
| `generateTestCases(lang, title, desc, count)` | TestCaseEditor |
| `generateClassReport(courseTitle, classData)` | StudentAnalytics — AI Class Report |
| `generateStudentReport(studentName, studentData)` | StudentAnalytics — Individual Report |

### js/aiCoach.js (AI Coaching 5Es)

| Function | Coach Role | Trigger |
|---|---|---|
| `getMindsetCoach(uid, assignmentTitle, failCount)` | Mindset (Engage) | ส่งงานผิด 3 ครั้งติด |
| `getSocraticHint(uid, title, desc, code, lang, level)` | Socratic (Explore) | กดขอ Hint (4 ระดับ) |
| `getAnalyticsCoach(uid, displayName)` | Analytics (Explain) | กดดู Weekly Insight |
| `getDiagnosticCoach(uid, displayName)` | Diagnostic (Evaluate) | กดวิเคราะห์จุดอ่อน |
| `getChallengeCoach(uid, title, lang, score)` | Challenge (Elaborate) | ได้คะแนน ≥ 90% |
| `getPredictiveRiskAlert(uid)` | Predictive Risk | อัตโนมัติ — ตรวจ pattern ความเสี่ยง |

**Socratic Hint 4 ระดับ:**
- Level 1: ตั้งคำถามชวนคิด (Socratic) — ห้ามบอกคำตอบ
- Level 2: อธิบาย Concept + ตัวอย่างคล้ายกัน
- Level 3: Pseudocode / โครงสร้าง algorithm
- Level 4: วิเคราะห์โค้ดนักเรียนโดยตรง บอก error pattern

**ทุก Coach Call บันทึกใน `coachInteractions` เพื่องานวิจัย**

---

## 9. Auto-Grader (js/grader.js)

**Fallback Chain:** Wandbox → Piston API → Judge0

| Engine | Priority | หมายเหตุ |
|---|---|---|
| Wandbox | 1 (Primary) | ฟรี, ไม่ต้อง API key, ช้ากว่า |
| Piston (EMKC) | 2 (Fallback) | เร็ว, ฟรี |
| Judge0 | 3 (Fallback) | Community edition |

**ภาษาที่รองรับ:** C (หลัก), C++, Python, Java

### Grading Workflow
```
gradeSubmission(studentId, assignmentId, courseId, code, language)
    ↓
1. โหลด test cases ทั้งหมด (visible + hidden)
2. รัน code ทีละ test case (sequential)
3. normalize output (trim whitespace)
4. เปรียบเทียบกับ expectedOutput
5. คำนวณ score (% จาก points ที่ผ่าน)
6. กำหนด status: accepted / wrong_answer / error
7. บันทึก submission ใน Firestore
8. gamification.js อัปเดต XP + Leaderboard
9. achievementEngine.js ตรวจ Achievement
10. aiCoach.js ส่ง feedback (ถ้าคะแนนไม่ครบ)
```

### Submission Cooldown
- 30 วินาที ระหว่างการ submit แต่ละครั้ง
- เก็บใน `localStorage` key: `lastSubmit_{assignmentId}`

---

## 10. CodingWorkspace — Component หลัก

**Location:** `js/pages/student/CodingWorkspace.js`

### Features:
1. **Course/Assignment Selector** — dropdown + directory tree
2. **CodeMirror Editor** — syntax highlight ภาษา C, auto-save draft ลง localStorage
3. **Run** — รัน visible test cases (preview ก่อน submit)
4. **Submit & Grade** — รัน test cases ทั้งหมด + บันทึก submission + award XP
5. **AI Hint (Socratic)** — 4 ระดับ (กดซ้ำได้ — Level เพิ่มขึ้น)
6. **Mindset Coach** — ปรากฏเมื่อล้มเหลว 3 ครั้งติด
7. **Challenge Coach** — แนะนำโจทย์ยากขึ้นเมื่อได้ ≥ 90%
8. **AI Chat** — Q&A กับ Gemini เกี่ยวกับโจทย์/โค้ด
9. **Predictive Risk Alert** — แจ้งเตือนความเสี่ยงอัตโนมัติ

---

## 11. Gamification Engine

### XP Award Table

| เหตุการณ์ | XP | CodeCoin | Crystal |
|---|---|---|---|
| ส่งงาน Score 100% | +50 | +10 | 0 |
| ส่งงาน Score 80-99% | +30 | +5 | 0 |
| ส่งงาน Score 50-79% | +15 | +2 | 0 |
| ส่งงาน Score < 50% | +5 | 0 | 0 |
| First Solve (score ≥ 60%, ครั้งแรกที่ผ่าน) | +20 | +5 | +1 |
| Login Streak (ทุกวัน) | +10 | +2 | 0 |
| Streak Bonus 3+ วัน | +20 | +5 | 0 |
| Streak Bonus 7+ วัน | +50 | +10 | +2 |
| Quiz Blitz (ครั้งแรกของวัน) | +25 | +10 | 0 |
| Quiz Blitz (เล่นซ้ำ) | +10 | +3 | 0 |
| Quiz Blitz Perfect | +15 bonus | 0 | 0 |
| Code Autopsy (ครั้งแรก) | +20 | +8 | 0 |
| Code Autopsy (ซ้ำ) | +8 | +2 | 0 |
| Code Autopsy Perfect | +10 bonus | 0 | 0 |
| Bug Hunt (ครั้งแรก) | +30 | +12 | 0 |
| Bug Hunt (ซ้ำ) | +5 | +1 | 0 |
| Bug Hunt Perfect | +20 bonus | 0 | 0 |

> XP ทุกประเภทถูกคูณด้วย `xpMultiplier` ของ Season ที่ Active อยู่

### Rank ระดับ (10 ระดับ)

| Rank | ชื่อ | XP ขั้นต่ำ |
|---|---|---|
| 1 🥚 | ไข่โปรแกรม | 0 |
| 2 🐣 | โค้ดเดอร์มือใหม่ | 200 |
| 3 🐛 | นักแก้บัค | 500 |
| 4 🔄 | ผู้เชี่ยวชาญลูป | 1,000 |
| 5 🧙 | จอมเวทย์ Logic | 2,000 |
| 6 🦅 | อินทรีอัลกอริทึม | 3,500 |
| 7 🏗️ | สถาปนิกโค้ด | 5,500 |
| 8 ⭐ | ดาวสยาม | 8,500 |
| 9 👑 | ราชันโปรแกรม | 13,000 |
| 10 🤖 | เทพเจ้า AI | 20,000 |

---

## 12. Mini-Games

| เกม | รูปแบบ | XP (ครั้งแรก/วัน) | XP (ซ้ำ) | Perfect Bonus |
|---|---|---|---|---|
| Quiz Blitz | MCQ 5 ข้อ จับเวลา 30 วินาที/ข้อ | +25 XP +10🪙 | +10 XP +3🪙 | +15 XP |
| Code Autopsy | ทาย Output โค้ด C (4 ตัวเลือก) | +20 XP +8🪙 | +8 XP +2🪙 | +10 XP |
| Bug Hunt | หาและแก้ Bug + AI ตรวจ Fuzzy | +30 XP +12🪙 | +5 XP +1🪙 | +20 XP |

- เนื้อหาสร้างโดย Gemini เพียงครั้งเดียวต่อวัน — Cache ใน `miniGameContent`
- ถ้า Gemini ล้มเหลว → Fallback content (hardcoded)

---

## 13. Teacher Features Summary

| Feature | Component | Route |
|---|---|---|
| Dashboard ครู | TeacherDashboard | `#/teacher/dashboard` |
| สร้าง/แก้ไขวิชา | CourseBuilder | `#/teacher/courses` |
| จัดการโจทย์ | AssignmentManager | `#/teacher/assignment` |
| ออก Test Cases | TestCaseEditor | `#/teacher/testcases` |
| วิเคราะห์นักเรียน (7 แท็บ) | StudentAnalytics | `#/teacher/analytics` |
| จัดการนักเรียน | StudentManagement | `#/teacher/students` |
| Season/XP/Export/Leaderboard | GamificationAdmin | `#/teacher/gamification` |
| สร้าง Activity รวดเร็ว | ActivityBuilder | `#/teacher/activities` |
| Real-time submission monitor | RealtimeDashboard | `#/teacher/realtime` |
| Code Editor อิสระ | FreeEditor | `#/teacher/editor` |

### StudentAnalytics 7 แท็บ:
1. **📊 ภาพรวม** — กราฟผ่าน/ไม่ผ่านแต่ละโจทย์
2. **👤 รายบุคคล** — ประวัติ Submission + AI Report รายคน + Bulk Analysis
3. **📋 สรุปคะแนนทุกคน** — ตารางคะแนน Sort ได้
4. **🎯 คะแนนฝึกเอง** — ข้อมูล Self-Practice
5. **🤖 รายงาน AI** — Gemini วิเคราะห์ภาพรวมทั้งชั้น
6. **🎮 Gamification** — XP/Rank/Coin/Streak ทุกคน + Export JSON
7. **🧩 กลุ่มผู้เรียน** — จัดกลุ่มนักเรียนตาม Learning Profile

---

## 14. Admin Features Summary

| Feature | Component | Route |
|---|---|---|
| Dashboard Admin | AdminDashboard | `#/admin/dashboard` |
| จัดการผู้ใช้ + อนุมัติบัญชี | UserManager | `#/admin/users` |
| ตั้งค่า Gemini API Key | SystemSettings | `#/admin/settings` |
| Seed ข้อมูลวิจัย + Export CSV | ResearchDataSeeder | `#/admin/seed` |
| สถิติการใช้งานระบบ | UsageAnalytics | `#/admin/usage` |

### ResearchDataSeeder — Engagement Tiers (5 ระดับ):

| Tier | ระดับ | นักเรียน | XP Range | E1 Score Range |
|---|---|---|---|---|
| 1 | สูงมาก | 6 คน | 3,500–5,500 | 82–95% |
| 2 | สูง | 8 คน | 1,800–3,500 | 72–85% |
| 3 | ปานกลาง | 10 คน | 700–1,800 | 58–75% |
| 4 | ต่ำ | 6 คน | 200–700 | 45–62% |
| 5 | น้อยมาก | 2 คน | 50–200 | 35–52% |

---

## 15. Context & State Management

**AuthContext** (js/context.js) expose ผ่าน `useAuth()`:
```javascript
{
  user: FirebaseUser,        // Firebase Auth user object
  userDoc: {                 // Firestore document
    id: string,
    role: string,
    displayName: string,
    studentCode: string,
    number: number,
    approvedByAdmin: boolean
  },
  role: string,              // shortcut: userDoc.role
  authLoading: boolean,
  logout: function
}
```

ไม่มี global state management library — ใช้ React useState/useEffect ใน component แต่ละตัว

---

## 16. Security Notes

**Firestore Security Rules (266 lines) หลักการ:**
- `users` — อ่านทั้งหมด (เพื่อ Leaderboard), แก้ไขเฉพาะของตนเอง
- `playerStats` — อ่านทั้งหมด (Leaderboard), แก้ไขเฉพาะตนเองหรือ Admin
- `submissions` — นักเรียนสร้าง/อ่านเฉพาะของตนเอง, ครูอ่านทุก submission ในวิชาตน
- `config/gemini` — อ่านได้ทุก Authenticated User (Client-side Gemini call)
- `xpLedger` — สร้าง/อ่านเฉพาะตนเอง, ไม่มี delete
- Admin — อ่าน/แก้ไขทุก collection

**Cloud Functions:**
- `adminSetPassword` — ตั้งรหัสผ่าน Admin (admin-only operation ผ่าน Firebase Admin SDK)

---

## 17. Error Handling & Resilience

| ส่วน | วิธีจัดการ |
|---|---|
| Gemini API | Retry 3 ครั้ง, exponential backoff, handle 429/400/5xx |
| Code Execution | Wandbox → Piston → Judge0 fallback chain |
| Mini-game content | Gemini fail → Fallback hardcoded content |
| AI Coach | try/catch ทุก function → fallback text ภาษาไทย |
| Auth token expire | onAuthStateChanged auto-redirect ไป login |
| Submission cooldown | localStorage 30s กัน spam |

---

## 18. Known Limitations

1. **ไม่มี backend** — Security enforcement ทั้งหมดอยู่ที่ Firestore Rules + client
2. **Sequential grading** — Code execution เรียกทีละ request (ช้าถ้า test cases เยอะ)
3. **Exam proctoring** — Tab-switch detection client-side เท่านั้น
4. **Code execution timeout** — ~10 วินาที/test case
5. **ภาษา C เป็นหลัก** — UI และโจทย์ออกแบบสำหรับ C เป็นหลัก

---

## 19. Research Context

ระบบพัฒนาเพื่อการวิจัยการศึกษา ม.4/6 จำนวน 32 คน  
**กรอบการสอน:** 5Es (Engage → Explore → Explain → Elaborate → Evaluate)

**ตัวแปรวิจัยที่เก็บได้:**

| ประเภท | ตัวแปร | แหล่งข้อมูล |
|---|---|---|
| Independent | XP, Rank, Streak, Game sessions, Achievement count | playerStats, miniGameSessions, studentAchievements |
| Dependent | คะแนน E1 (submission score), อัตราผ่าน Assignment | submissions, playerStats.e1Score* |
| Mediating | จำนวน AI Coach Interactions แต่ละบทบาท | coachInteractions |

**ค่าสหสัมพันธ์ที่ออกแบบไว้ (Seeded Data):**
- XP ↔ E1 เฉลี่ย: r ≈ 0.72
- Game sessions ↔ E1: r ≈ 0.65
- Streak ↔ E1: r ≈ 0.58

**Export ข้อมูลสำหรับวิจัย:**
- CSV: `#/admin/seed` → "Export CSV (SPSS/R)"
- JSON: `#/teacher/gamification` → "Export JSON"

---

## 20. Setup & Deployment

```bash
# Deploy ทุกอย่าง
firebase deploy

# Deploy เฉพาะ Hosting
firebase deploy --only hosting

# Deploy เฉพาะ Firestore Rules
firebase deploy --only firestore:rules
```

**Gemini API Key:** ตั้งค่าผ่านหน้า `#/admin/settings` → บันทึกใน Firestore `config/gemini` → โหลดที่ `js/gemini.js` ทุกครั้งที่ระบบเริ่ม

---

## ภาคผนวก

### A. สถิติระบบ

| รายการ | จำนวน |
|---|---|
| ไฟล์ JS ทั้งหมด | ~50 ไฟล์ |
| Firestore Collections | 23 Collections |
| Student Routes | 15 Routes |
| Teacher Routes | 10 Routes |
| Admin Routes | 5 Routes |
| Rank Tiers | 10 ระดับ (0–20,000 XP) |
| AI Coach Roles | 5 บทบาท + 1 Predictive Risk |
| Hint Levels (Socratic) | 4 ระดับ |
| Mini-game ประเภท | 3 ประเภท |
| Achievement | 13 รายการ |
| Engagement Tiers (วิจัย) | 5 ระดับ |

### B. Repository & Links

- **GitHub Repository:** https://github.com/koki-assawin/AI-Powered-C
- **Production URL:** https://koki-assawin.github.io/AI-Powered-C/
- **Firebase Project:** ai-powered-coding-596ed
- **Firebase Console:** https://console.firebase.google.com/project/ai-powered-coding-596ed

---

*ไฟล์นี้ครอบคลุมระบบทั้งหมด ณ วันที่ 2026-06-03*  
*สร้างโดย Claude Code สำหรับใช้เป็น AI context attachment*

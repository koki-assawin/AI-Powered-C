# AI-Powered Coding LMS — System Context (ไฟล์แนบสำหรับ AI Research)

> ไฟล์นี้สรุปรายละเอียดระบบทั้งหมดอย่างละเอียด เพื่อให้ AI เข้าใจโครงสร้างและบริบทของระบบได้ทันที  
> อัปเดตล่าสุด: 2026-04-05

---

## 1. ภาพรวมโครงการ

| รายการ | รายละเอียด |
|---|---|
| ชื่อโปรเจกต์ | AI-Powered Coding Assessment & Practice Platform |
| เวอร์ชัน | 3.0 (Firebase-Only Edition) |
| ภาษาหลัก UI | ภาษาไทย (ปนอังกฤษ) |
| สถาปัตยกรรม | Frontend-Only SPA (Single Page Application) — ไม่มี backend server |
| ที่ตั้ง | `c:/xampp/htdocs/AI-Powered-C/` |
| วัตถุประสงค์ | ระบบ LMS สำหรับสอนเขียนโปรแกรม (C, C++, Python, Java) พร้อม AI วิเคราะห์โค้ด, ตรวจงานอัตโนมัติ, และสร้างโจทย์ |
| กลุ่มเป้าหมาย | นักเรียน/นักศึกษา, ครูผู้สอน, ผู้ดูแลระบบ |

---

## 2. เทคโนโลยีที่ใช้

### Frontend
- **React 17** (CDN, development bundle) — ไม่มี build system
- **Babel Standalone** — transpile JSX ใน browser ตรงๆ
- **Tailwind CSS** (CDN) + **Bootstrap 5.3.3** — layout และ utility classes
- **CodeMirror 5.65.16** — code editor (ไม่ใช้ v6 เพราะต้องการ ES modules)
  - Modes: c, cpp, python, java / Theme: Dracula / Addons: auto-close, match-brackets, comment
- **Chart.js** — radar chart แสดงผล AI analysis
- **Highlight.js 11.9.0** — syntax highlighting ในผลลัพธ์
- **Google Fonts** — Prompt (Thai/Latin), JetBrains Mono (code)

### Backend Services (Cloud)
- **Firebase Auth** — email/password authentication
- **Cloud Firestore** — primary database สำหรับ LMS data ทั้งหมด
- **Firebase RTDB** — เก็บ Gemini API Key ที่ `/ai-powered-code/config/gemini_api_key`
- **Google Gemini 2.0 Flash** — AI engine (code analysis, problem generation, hints, reports)
- **Wandbox API** (https://wandbox.org) — code execution สำหรับ auto-grading (ฟรี, ไม่ต้องมี API key)

### Firebase Project
- **Project ID:** `ai-powered-coding-596ed`
- **Auth Domain:** `ai-powered-coding-596ed.firebaseapp.com`
- **RTDB URL:** `https://ai-powered-coding-596ed-default-rtdb.asia-southeast1.firebasedatabase.app`
- **Region:** asia-southeast1 (Singapore)

---

## 3. โครงสร้างไฟล์ทั้งหมด

```
AI-Powered-C/
├── index.html                    # Shell HTML — โหลด CDN + js/ ตามลำดับที่กำหนด
├── js/
│   ├── firebase.js               # Firebase init, LANGUAGES config, loadGeminiKey()
│   ├── gemini.js                 # Gemini API wrapper functions ทั้งหมด
│   ├── grader.js                 # Wandbox auto-grader
│   ├── context.js                # React AuthContext + useAuth hook + RBAC
│   ├── app.js                    # Root App component + hash router (โหลดสุดท้าย)
│   │
│   ├── components/
│   │   ├── CodeEditor.js         # CodeMirror 5 wrapper component
│   │   ├── Navbar.js             # Navigation bar (role-based links)
│   │   ├── ProtectedRoute.js     # RBAC gate — redirect ถ้า role ไม่ตรง
│   │   ├── RadarChart.js         # แสดงผล AI metrics ด้วย radar chart
│   │   └── Spinner.js            # Loading spinner
│   │
│   └── pages/
│       ├── LoginPage.js
│       ├── RegisterPage.js
│       ├── student/
│       │   ├── StudentDashboard.js      # หน้าหลัก: stats + courses + recent submissions
│       │   ├── CourseViewer.js          # เลือก/ลงทะเบียนคอร์ส
│       │   ├── CodingWorkspace.js       # *** หน้าหลักสำคัญที่สุด: editor + grading + AI
│       │   ├── Gradebook.js             # ดูคะแนนทุกวิชา
│       │   ├── SubmissionHistory.js     # ประวัติการส่งงาน
│       │   ├── SelfPractice.js          # AI สร้างโจทย์ฝึกเอง
│       │   └── StudentProfile.js        # โปรไฟล์ + เปลี่ยนรหัสผ่าน
│       ├── teacher/
│       │   ├── TeacherDashboard.js      # หน้าหลักครู: stats + course cards
│       │   ├── CourseBuilder.js         # สร้าง/แก้ไขคอร์ส + co-teacher
│       │   ├── AssignmentManager.js     # จัดการโจทย์ + AI สร้างโจทย์
│       │   ├── TestCaseEditor.js        # จัดการ test cases
│       │   ├── StudentAnalytics.js      # วิเคราะห์ผลการเรียน AI report
│       │   └── StudentManagement.js     # จัดการนักเรียนในคอร์ส
│       └── admin/
│           ├── AdminDashboard.js        # ภาพรวมระบบ + pending approvals
│           ├── UserManager.js           # จัดการ users ทั้งหมด
│           └── SystemSettings.js        # ตั้งค่า API Key
│
├── firestore.indexes.json        # Firestore composite indexes
├── firebase.json                 # Firebase CLI config
├── seed.html                     # Utility: seed ข้อมูลตัวอย่าง
├── infographic.html              # หน้า infographic (optional)
├── migrate-firestore.js          # Script migration ฐานข้อมูล
├── README.md                     # เอกสารหลัก (ไทย)
├── SETUP.md                      # วิธีตั้งค่า API Key
├── FIREBASE_SETUP.md             # วิธี setup Firebase RTDB
├── QUICK_START_FIREBASE.md       # Quick start 5 นาที
└── CHANGELOG.md                  # ประวัติเวอร์ชัน
```

### ลำดับการโหลด Script ใน index.html (สำคัญมาก)
1. `firebase.js` → init Firebase, expose `LANGUAGES`, `db`, `auth`
2. `gemini.js` → Gemini API functions
3. `grader.js` → Wandbox grading functions
4. `context.js` → AuthContext, useAuth
5. `components/*.js` → shared components
6. `pages/**/*.js` → page components
7. `app.js` → **ต้องโหลดสุดท้ายเสมอ** (router mount)

---

## 4. Firestore Database Schema

### Collection: `users`
```
{
  id: string,              // Firebase Auth UID
  email: string,
  displayName: string,
  role: 'student' | 'teacher' | 'admin',
  enrolledCourses: [courseId],   // array ของ course IDs ที่ลงทะเบียน
  approvedByAdmin: boolean,       // ใช้กับ teacher เท่านั้น
  profilePhotoURL: string,
  createdAt: timestamp
}
```

### Collection: `courses`
```
{
  id: string,
  title: string,
  description: string,
  language: 'c' | 'cpp' | 'python' | 'java',
  teacherId: string,          // UID ของครูหลัก
  coTeacherIds: [uid],        // ครูร่วมสอน
  isPublished: boolean,
  grade: string,              // ระดับชั้น
  room: string,               // ห้อง
  semester: string,
  academicYear: string,
  classCode: string,          // 6-char code สำหรับนักเรียน join เช่น "ABC123"
  enrollmentCount: number,
  directoryTree: [            // โครงสร้างหน่วยการเรียน
    { name: string, topics: [string] }
  ],
  status: 'active' | 'archived',
  createdAt: timestamp
}
```

### Collection: `assignments`
```
{
  id: string,
  courseId: string,
  title: string,
  description: string,        // โจทย์ปัญหา
  language: string,
  difficulty: 'ง่าย' | 'ปานกลาง' | 'ยาก',
  assignmentType: 'practice' | 'exam',
  examDurationMinutes: number,  // สำหรับ exam mode
  timeLimit: number,
  memoryLimit: number,
  isPublished: boolean,
  unitName: string,           // หน่วยการเรียน (จาก directoryTree)
  topicName: string,          // หัวข้อ
  createdAt: timestamp
}
```

### Collection: `testCases`
```
{
  id: string,
  assignmentId: string,
  input: string,              // stdin
  expectedOutput: string,     // stdout ที่คาดหวัง (normalized)
  isHidden: boolean,          // true = ใช้ตรวจเท่านั้น นักเรียนไม่เห็น
  order: number,
  points: number,             // คะแนนของ test case นี้
  note: string               // หมวด เช่น "basic", "edge case"
}
```

### Collection: `submissions`
```
{
  id: string,
  studentId: string,
  assignmentId: string,
  courseId: string,
  code: string,               // source code ที่ส่ง
  language: string,
  status: 'accepted' | 'wrong_answer' | 'compile_error' | 'runtime_error',
  passedTests: number,
  totalTests: number,
  score: number,              // เปอร์เซ็นต์ 0-100
  totalPoints: number,        // คะแนนสูงสุดที่เป็นไปได้
  testResults: [
    {
      testCaseId: string,
      passed: boolean,
      actualOutput: string,
      executionTime: number,  // ms
      errorLog: string
    }
  ],
  aiScore: number,            // nullable — AI analysis score
  aiMetrics: object,          // nullable — {quality, correctness, efficiency, ...}
  submittedAt: timestamp
}
```

### Collection: `grades`
```
{
  id: string,
  studentId: string,
  assignmentId: string,
  courseId: string,
  score: number,              // คะแนนที่ดีที่สุด (best submission)
  maxScore: number,
  submissionId: string,       // อ้างอิง submission ที่ดีที่สุด
  gradedAt: timestamp
}
```

### Collection: `enrollments`
```
{
  id: string,
  studentId: string,
  courseId: string,
  enrolledAt: timestamp,
  progress: number,           // เปอร์เซ็นต์
  completedLessons: [lessonId],
  lastAccessedAt: timestamp
}
```

### Collection: `lessons` (optional)
```
{
  id: string,
  courseId: string,
  title: string,
  description: string,
  content: string,            // HTML/markdown
  order: number
}
```

### Collection: `config` (admin)
```
{
  gemini: { apiKey: string }
}
```

---

## 5. Firestore Composite Indexes

```json
{
  "indexes": [
    { "collection": "submissions",  "fields": ["studentId", "submittedAt DESC"] },
    { "collection": "submissions",  "fields": ["courseId", "studentId"] },
    { "collection": "testCases",    "fields": ["assignmentId", "isHidden", "order"] },
    { "collection": "testCases",    "fields": ["assignmentId", "order"] },
    { "collection": "grades",       "fields": ["studentId", "courseId"] },
    { "collection": "lessons",      "fields": ["courseId", "order"] },
    { "collection": "assignments",  "fields": ["courseId", "createdAt"] }
  ]
}
```

---

## 6. User Roles & Routes

### บทบาทผู้ใช้งาน

| Role | การเข้าถึง | หมายเหตุ |
|---|---|---|
| `student` | student/* | สมัครแล้วได้ role นี้ทันที |
| `teacher` | teacher/* | ต้องรอ admin approve (`approvedByAdmin: true`) |
| `admin` | admin/* + teacher/* | ตั้งค่าด้วย Firestore Console โดยตรง |

### Hash-based Routes

**Unauthenticated:**
- `#/login` — LoginPage
- `#/register` — RegisterPage

**Student Routes:**
- `#/student/dashboard` — StudentDashboard
- `#/student/courses` — CourseViewer (เลือก/ลงทะเบียน)
- `#/student/workspace?course=ID&assignment=ID` — CodingWorkspace
- `#/student/gradebook` — Gradebook
- `#/student/history` — SubmissionHistory
- `#/student/practice` — SelfPractice
- `#/student/profile` — StudentProfile

**Teacher Routes:**
- `#/teacher/dashboard` — TeacherDashboard
- `#/teacher/courses?edit=ID` — CourseBuilder
- `#/teacher/assignment?course=ID` — AssignmentManager
- `#/teacher/testcases?course=ID` — TestCaseEditor
- `#/teacher/analytics` — StudentAnalytics
- `#/teacher/students?course=ID` — StudentManagement

**Admin Routes:**
- `#/admin/dashboard` — AdminDashboard
- `#/admin/users` — UserManager
- `#/admin/settings` — SystemSettings

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
expose via AuthContext:
  { user, userDoc, role, authLoading, logout() }
    ↓
ProtectedRoute checks role
  → unauthorized → redirect to own dashboard
  → authorized → render page
```

---

## 8. Gemini API Functions (js/gemini.js)

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`

| Function | Input | Output | ใช้ใน |
|---|---|---|---|
| `callGeminiApi(prompt, schema)` | prompt string, JSON schema | parsed JSON หรือ text | base function |
| `analyzeCode(code, language)` | code string, language | `{status, feedback, suggestion, issues[], metrics{}}` | CodingWorkspace |
| `generateProblems(lang, topic, diff, count, title, desc)` | params | array ของ problems | SelfPractice, AssignmentManager |
| `generateTestCases(lang, title, desc, count)` | params | array ของ `{input, expectedOutput, note}` | TestCaseEditor |
| `chatWithAI(question, language)` | question string | plain text (Thai) | CodingWorkspace chat |
| `generateClassReport(courseTitle, classData)` | class performance data | `{summary, strengths[], challenges[], recommendations[], needsHelp[], practiceInsight}` | StudentAnalytics |
| `generateStudentReport(studentName, studentData)` | student performance | `{overview, strengths[], improvements[], pattern, advice}` | StudentAnalytics |
| `getScaffoldingHint(code, lang, title, desc, failedTests, hintLevel)` | code + context + level 1-3 | hint text (Thai, ไม่เฉลย) | CodingWorkspace |

**Retry Logic:** 3 ครั้ง, exponential backoff (1s → 2s → 4s), handle 429/400/5xx

**AI Metrics (analyzeCode returns):**
```javascript
metrics: {
  quality: 0-100,        // คุณภาพโค้ดโดยรวม
  correctness: 0-100,    // ความถูกต้องของ logic
  efficiency: 0-100,     // ประสิทธิภาพ/ความซับซ้อน
  readability: 0-100,    // ความอ่านง่าย
  bestPractices: 0-100   // การทำตาม best practices
}
```

---

## 9. Auto-Grader (js/grader.js)

**Engine:** Wandbox (https://wandbox.org) — ฟรี, ไม่ต้องมี API key

| ภาษา | Compiler |
|---|---|
| C | gcc-head |
| C++ | gcc-head |
| Python | cpython-3.12.0 |
| Java | openjdk-head (class ต้องชื่อ `Main`) |

### Grading Workflow
```
gradeSubmission(studentId, assignmentId, courseId, code, language)
    ↓
1. โหลด test cases ทั้งหมด (visible + hidden)
2. รัน Wandbox ทีละ test case (sequential)
3. นับ passedTests / totalTests
4. คำนวณ score (%) จาก points ของแต่ละ test case
5. กำหนด status: accepted / wrong_answer / compile_error / runtime_error
6. บันทึก submission ใน Firestore
7. อัปเดต grade (เก็บ best score เท่านั้น)
```

### Submission Cooldown
- 30 วินาที ระหว่างการ submit แต่ละครั้ง
- เก็บใน `localStorage` key: `lastSubmit_{assignmentId}`

---

## 10. CodingWorkspace — Component หลักที่ซับซ้อนที่สุด

**Location:** `js/pages/student/CodingWorkspace.js`

### Features:
1. **Course/Assignment Selector** — dropdown + collapsible directory tree
2. **CodeMirror Editor** — ตามภาษาที่เลือก, auto-save draft ลง localStorage
3. **Sample Test Run** — รัน visible test cases เท่านั้น (preview ก่อน submit)
4. **Submit & Grade** — รัน test cases ทั้งหมด + บันทึก submission
5. **AI Code Analysis** — เรียก analyzeCode() แสดงผล RadarChart
6. **Scaffolding Hints** — 3 ระดับ (ชี้จุดผิด → อธิบาย algo → ตัวอย่างโค้ด)
7. **AI Chat** — Q&A กับ Gemini เกี่ยวกับโจทย์/โค้ด
8. **Exam Mode:**
   - Countdown timer
   - Tab-switch detection (auto-submit หลังเปลี่ยน 3 ครั้ง)
   - Auto-submit เมื่อหมดเวลา
   - Warning dialogs

### Draft Management:
- Key: `draft_{assignmentId}` ใน localStorage
- Restore อัตโนมัติเมื่อกลับมาทำโจทย์เดิม

---

## 11. LANGUAGES Config (js/firebase.js)

```javascript
const LANGUAGES = {
  c:      { name: 'C',       pistonLang: 'c',      hljsLang: 'c',    color: '#A8B9CC' },
  cpp:    { name: 'C++',     pistonLang: 'cpp',    hljsLang: 'cpp',  color: '#00599C' },
  python: { name: 'Python',  pistonLang: 'python', hljsLang: 'python', color: '#3776AB' },
  java:   { name: 'Java',    pistonLang: 'java',   hljsLang: 'java', color: '#007396' }
}
```
> หมายเหตุ: ฟิลด์ `pistonLang` ใช้กับ Wandbox compiler name (ชื่อเดิมจาก Piston API ยังคงไว้)

---

## 12. Design System

**Theme:** K-Minimal Pink

| Token | Value |
|---|---|
| Primary | `#FFD1DC` (pastel pink) |
| Accent | `#EC407A` (bright pink) |
| Dark | `#AD1457` (dark pink) |
| Font UI | Prompt (Google Fonts) |
| Font Code | JetBrains Mono |

**CSS Classes:**
- `.k-card` — white card with border + shadow
- `.k-btn-pink` — gradient pink button
- `.k-btn-outline` — pink outline button
- `.k-input` — pink-themed input

---

## 13. Teacher Features Summary

| Feature | Component | API Used |
|---|---|---|
| สร้าง/แก้ไขคอร์ส | CourseBuilder | Firestore |
| เชิญ co-teacher | CourseBuilder | Firestore (coTeacherIds) |
| สร้างโจทย์ด้วย AI | AssignmentManager | Gemini generateProblems |
| สร้าง test cases ด้วย AI | TestCaseEditor | Gemini generateTestCases |
| วิเคราะห์ห้องเรียน | StudentAnalytics | Gemini generateClassReport |
| รายงานรายบุคคล | StudentAnalytics | Gemini generateStudentReport |
| จัดการนักเรียน | StudentManagement | Firestore |

---

## 14. Admin Features Summary

| Feature | Component |
|---|---|
| ดู stats ระบบ | AdminDashboard |
| อนุมัติ teacher | AdminDashboard + UserManager |
| เปลี่ยน role ผู้ใช้ | UserManager |
| ตั้งค่า Gemini API Key | SystemSettings |

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
    enrolledCourses: []
  },
  role: string,              // shortcut: userDoc.role
  authLoading: boolean,
  logout: function
}
```

ไม่มี global state management library (ไม่มี Redux/Zustand) — ใช้ React useState/useEffect ใน component แต่ละตัว

---

## 16. Error Handling & Resilience

| ส่วน | วิธีจัดการ |
|---|---|
| Gemini API | Retry 3 ครั้ง, exponential backoff, handle 429/400/5xx |
| Wandbox | try/catch ต่อ request, return failed result ถ้า error |
| Firestore lessons query | fallback ไม่ใช้ orderBy ถ้า index ยังไม่พร้อม |
| Auth token expire | onAuthStateChanged auto-redirect ไป login |
| Submission cooldown | localStorage กัน spam 30s |

---

## 17. Security Notes

**ข้อจำกัดด้านความปลอดภัย (frontend-only architecture):**
1. **Exam Mode** — Tab-switch detection เป็น client-side เท่านั้น (bypass ได้)
2. **API Key** — Gemini key อาจมองเห็นใน Network tab ถ้า fetch จาก RTDB
3. **Hidden Test Cases** — ต้องตั้ง Firestore Security Rules กันไม่ให้นักเรียน query `isHidden=true` โดยตรง
4. **Code Execution** — Wandbox เป็น sandboxed environment (ปลอดภัย)

**Mitigations ที่มี:**
- Firestore Security Rules (ต้องตั้งค่าเพิ่มเติม)
- Google Cloud quota limits
- 30-second submission cooldown
- RBAC ใน frontend (ProtectedRoute)

---

## 18. Known Limitations

1. **ไม่มี backend** — Security enforcement ทั้งหมดอยู่ที่ Firestore Rules + client
2. **Sequential grading** — Wandbox เรียกทีละ request (ช้าถ้า test cases เยอะ)
3. **Exam proctoring** — Tab-switch เท่านั้น ไม่มี video/screen recording
4. **1 MB Firestore limit** — submissions ที่มี code ยาวมากอาจถึง limit
5. **ไม่มี real-time collaboration** — ไม่มี WebSocket
6. **Code execution timeout** — Wandbox limit ~10 วินาที

---

## 19. Setup & First Run

### Admin Setup (ครั้งแรก)
1. สร้าง Firebase project + enable Auth (Email/Password) + Firestore
2. ใส่ `firebaseConfig` ใน `js/firebase.js`
3. รัน `firestore.indexes.json` ผ่าน Firebase CLI
4. สมัครบัญชีแรก → ไป Firestore Console → แก้ `role: "admin"` + `approvedByAdmin: true`
5. ตั้ง Gemini API Key ผ่านหน้า Admin Settings หรือใส่ใน RTDB โดยตรง

### Gemini API Key — 2 วิธี
- **วิธี 1 (แนะนำ):** เก็บใน Firebase RTDB ที่ `/ai-powered-code/config/gemini_api_key`
- **วิธี 2 (ง่ายกว่า):** Hardcode ใน `js/firebase.js` ตรงๆ

---

## 20. Research Context

ระบบนี้ถูกพัฒนาเพื่อใช้งานจริงในสถานศึกษา (มัธยมปลาย/มหาวิทยาลัย) ที่สอนวิชาเขียนโปรแกรม  
**ประเด็นวิจัยที่เกี่ยวข้อง:**

- การใช้ Generative AI (Gemini) ในการให้ feedback โค้ดอัตโนมัติ
- Scaffolding hints ที่ไม่เฉลยคำตอบโดยตรง (3 ระดับ)
- การวัดผล learning outcomes ผ่าน auto-grading
- UX/UI สำหรับนักเรียนไทยในการเรียนเขียนโปรแกรม
- ประสิทธิภาพของ AI-generated practice problems ในการพัฒนาทักษะ
- Co-teaching collaboration ในระบบ LMS
- Exam integrity ในระบบออนไลน์ (tab-switch detection)

---

*ไฟล์นี้ครอบคลุมระบบทั้งหมด ณ วันที่ 2026-04-05*  
*สร้างโดย Claude Code สำหรับใช้เป็น AI context attachment*

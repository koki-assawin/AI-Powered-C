# เอกสารระบบ: แพลตฟอร์มโค้ชชิงการเขียนโปรแกรมอัตโนมัติตามวัฏจักร 5Es
# บูรณาการปัญญาประดิษฐ์และเกมมิฟิเคชัน
## AI-Powered Coding Platform — คู่มือระบบฉบับสมบูรณ์

**รหัสวิชา:** ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น  
**กลุ่มเป้าหมาย:** นักเรียน ม.4/6 จำนวน 32 คน  
**URL ระบบ:** https://koki-assawin.github.io/AI-Powered-C/  
**วันที่จัดทำเอกสาร:** 2 พฤษภาคม 2569  
**เวอร์ชันระบบ:** v5.0 (Gamification + AI Coaching)

---

## สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [สถาปัตยกรรมและเทคโนโลยี](#2-สถาปัตยกรรมและเทคโนโลยี)
3. [โครงสร้างฐานข้อมูล Firestore](#3-โครงสร้างฐานข้อมูล-firestore)
4. [ระบบ Gamification](#4-ระบบ-gamification)
5. [ระบบ AI Coaching (5Es)](#5-ระบบ-ai-coaching-5es)
6. [Mini-Games](#6-mini-games)
7. [ระบบ Achievement (รางวัลและความสำเร็จ)](#7-ระบบ-achievement)
8. [คู่มือผู้ดูแลระบบ (Admin)](#8-คู่มือผู้ดูแลระบบ)
9. [คู่มือครู (Teacher)](#9-คู่มือครู)
10. [คู่มือนักเรียน (Student)](#10-คู่มือนักเรียน)
11. [ข้อมูลสำหรับงานวิจัย](#11-ข้อมูลสำหรับงานวิจัย)
12. [Security Rules และสิทธิ์การเข้าถึง](#12-security-rules)
13. [โครงสร้างไฟล์ระบบ](#13-โครงสร้างไฟล์ระบบ)

---

## 1. ภาพรวมระบบ

### 1.1 ชื่อและวัตถุประสงค์

ระบบนี้พัฒนาขึ้นเพื่อการวิจัยการศึกษา โดยนำกรอบการสอนแบบ **5Es (Engage → Explore → Explain → Elaborate → Evaluate)** มาบูรณาการกับ:

- **Gamification:** XP, Rank, Badge, Leaderboard, Streak เพื่อเพิ่มแรงจูงใจ
- **AI Coaching:** Gemini API ช่วยให้ Hint, วิเคราะห์จุดอ่อน, ให้กำลังใจ
- **Mini-Games:** เกมฝึกทักษะ C ที่สนุกและวัดผลได้
- **Analytics Dashboard:** ครูเห็นข้อมูลเชิงลึกของนักเรียนทุกคน

### 1.2 กลุ่มผู้ใช้และ Role

| Role | จำนวน | หน้าที่ |
|---|---|---|
| **student** | 32 คน | เรียน, ส่งงาน, เล่นเกม, ดู Leaderboard |
| **teacher** | 1-3 คน | สร้างวิชา, ออกโจทย์, ดูผล, จัดการ Gamification |
| **admin** | 1 คน | จัดการผู้ใช้, ตั้งค่าระบบ, Seed ข้อมูลวิจัย |

### 1.3 การแมปกับกรอบ 5Es

| ขั้น 5E | คอมโพเนนต์ระบบ | เป้าหมาย |
|---|---|---|
| **Engage** | Streak, XP Bar, Rank, Daily Login Reward | ดึงดูดให้เข้าระบบทุกวัน |
| **Explore** | Mini-Games (Quiz Blitz, Code Autopsy), Self-Practice | สำรวจเนื้อหาผ่านการลงมือทำ |
| **Explain** | AI Socratic Coach (Hint 3 ระดับ), Diagnostic Coach | รับคำอธิบายเมื่อติดปัญหา |
| **Elaborate** | Bug Hunt, Challenge Coach, โจทย์ระดับ Hard | ต่อยอดความรู้ในเชิงลึก |
| **Evaluate** | Leaderboard, Achievements, Analytics Coach | สะท้อนผลการเรียนรู้ |

---

## 2. สถาปัตยกรรมและเทคโนโลยี

### 2.1 Stack หลัก

| Layer | เทคโนโลยี | รายละเอียด |
|---|---|---|
| **Frontend** | React 17 (CDN), Babel | JSX transpile ในเบราว์เซอร์ ไม่ต้อง build step |
| **Routing** | Hash Router (`#/path`) | Single Page Application, ไม่ต้องการ server |
| **Database** | Firebase Firestore (compat v9) | Real-time NoSQL, offline support |
| **Auth** | Firebase Authentication | Email/Password |
| **Hosting** | Firebase Hosting + GitHub Pages | Deploy ด้วย `firebase deploy` |
| **AI** | Google Gemini API (gemini-2.0-flash) | Coaching, Mini-game generation |
| **Code Runner** | Piston API | Execute C code online |
| **UI** | Tailwind CSS + Bootstrap 5.3 | Utility-first + K-Minimal pink theme |
| **Editor** | CodeMirror 5 | Syntax highlight สำหรับ C |
| **Charts** | Chart.js | กราฟวิเคราะห์ผลการเรียน |
| **Font** | Google Fonts (Prompt, JetBrains Mono) | Thai-friendly font |

### 2.2 การโหลดสคริปต์ (ลำดับสำคัญ)

```
1. firebase.js         → ตั้งค่า Firebase (db, auth, firebase globals)
2. gemini.js           → Gemini API wrapper
3. grader.js           → Piston API สำหรับ execute C code
4. gamification.js     → XP/Rank/Streak/Leaderboard engine
5. achievementEngine.js → Achievement check และ award
6. aiCoach.js          → AI Coach 5 roles
7. miniGameGenerator.js → สร้างเนื้อหา Mini-game
8. context.js          → React AuthContext (handleDailyStreak เรียกที่นี่)
9. components/         → Navbar, XPBar, CodeEditor ฯลฯ
10. pages/             → Student, Teacher, Admin pages
11. app.js             → Hash Router (โหลดสุดท้าย)
```

### 2.3 ลำดับการโหลด Route

```
#/login, #/register          → ไม่ต้อง login
#/student/*                  → guard: role === 'student'
#/teacher/*                  → guard: role === 'teacher' หรือ 'admin'
#/admin/*                    → guard: role === 'admin'
```

---

## 3. โครงสร้างฐานข้อมูล Firestore

### 3.1 Collections ทั้งหมด (23 Collections)

#### กลุ่ม: ผู้ใช้และ Auth

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
codeCoin       : number   — สกุลเงินหลัก
crystal        : number   — สกุลเงินพิเศษ
streakDays     : number   — Streak ต่อเนื่องปัจจุบัน
longestStreak  : number   — Streak สูงสุดตลอดกาล
lastLoginDate  : string   — 'YYYY-MM-DD' วันที่ Login ล่าสุด
dailyXP        : number   — XP วันนี้ (reset ทุกเที่ยงคืน)
weeklyXP       : number   — XP สัปดาห์นี้ (reset ทุกวันจันทร์)
seasonXP       : number   — XP ช่วง Season ปัจจุบัน
updatedAt      : timestamp
```

#### กลุ่ม: วิชาและเนื้อหา

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
rawScore       : number   — คะแนนที่นำมาคำนวณ XP
languageId     : string   — 'c' (ภาษาที่ใช้)
starterCode    : string   — โค้ดตั้งต้น
unitNumber     : number   — หน่วยการเรียนรู้
```

**`testCases/{testCaseId}`**
```
assignmentId   : string
description    : string   — คำอธิบาย Test Case
input          : string   — Input ที่ส่งให้โปรแกรม
expectedOutput : string   — Output ที่คาดหวัง
hidden         : boolean  — ซ่อนจากนักเรียน
order          : number   — ลำดับ
points         : number   — คะแนนของ Test Case นี้
```

**`lessons/{lessonId}`**
```
courseId       : string
title          : string
order          : number
content        : string   — เนื้อหา (Markdown/HTML)
videoUrl       : string   — ลิงก์วิดีโอ (optional)
```

#### กลุ่ม: การลงทะเบียนและการส่งงาน

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
testResults    : array    — ผลแต่ละ Test Case
```

**`selfPracticeSubmissions/{docId}`**
```
studentId      : string
courseId       : string
code, language, score, submittedAt (เหมือน submissions)
metadata       : object   — ข้อมูลเพิ่มเติม (problem type, difficulty)
```

#### กลุ่ม: Gamification

**`xpLedger/{docId}`** ← Audit Trail ไม่เคยแก้ไข
```
uid            : string
xpAwarded      : number
coinAwarded    : number
crystalAwarded : number
source         : string   — 'submission_accepted' | 'first_solve' | 
                            'streak_bonus' | 'minigame' | 'achievement'
relatedId      : string   — id ของ submission/assignment ที่เกี่ยวข้อง
metadata       : object   — ข้อมูลเพิ่มเติม (score, streakDays ฯลฯ)
createdAt      : timestamp
```

**`leaderboardSnapshots/{docId}`**
```
docId format   : '{courseId}_alltime' | '{courseId}_weekly' | '{courseId}_daily'
                  หรือ 'alltime' | 'weekly' | 'daily' (global)
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
category       : string   — 'skill' | 'streak' | 'social' | 'special'
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
name           : string   — ชื่อ Season (เช่น "Season 1 ภาคเรียน 1/2568")
startDate      : timestamp
endDate        : timestamp
isActive       : boolean  — มีได้แค่ 1 active ในเวลาเดียวกัน
xpMultiplier   : number   — ตัวคูณ XP (เช่น 2 = XP สองเท่า)
```

#### กลุ่ม: AI Coach

**`coachInteractions/{docId}`** ← Research Measurement
```
uid            : string
coachRole      : string   — 'mindset' | 'socratic' | 'analytics' | 
                            'diagnostic' | 'challenge'
triggerEvent   : string   — เหตุการณ์ที่ trigger (เช่น 'fail_3_times')
relatedId      : string   — assignmentId ที่เกี่ยวข้อง
prompt         : string   — prompt ที่ส่ง Gemini (max 500 chars)
response       : string   — คำตอบจาก Gemini (max 1000 chars)
createdAt      : timestamp
```

#### กลุ่ม: Mini-Games

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

#### กลุ่ม: ระบบ

**`config/gemini`**
```
apiKey         : string   — Gemini API Key (Admin ตั้งค่าผ่าน UI)
```

---

## 4. ระบบ Gamification

### 4.1 XP Award Table

| เหตุการณ์ | XP | CodeCoin | Crystal |
|---|---|---|---|
| ส่งงาน Score 100% | +50 | +10 | 0 |
| ส่งงาน Score 80-99% | +30 | +5 | 0 |
| ส่งงาน Score 50-79% | +15 | +2 | 0 |
| ส่งงาน Score < 50% | +5 | 0 | 0 |
| First Solve Bonus (score ≥ 60%, ไม่เคยผ่านมาก่อน) | +20 | +5 | +1 |
| Login Streak (ทุกวัน) | +10 | +2 | 0 |
| Streak Bonus 3+ วัน | +20 | +5 | 0 |
| Streak Bonus 7+ วัน | +50 | +10 | +2 |
| Quiz Blitz (เล่นครั้งแรกของวัน) | +25 | +10 | 0 |
| Quiz Blitz (เล่นซ้ำ) | +10 | +3 | 0 |
| Quiz Blitz (Perfect Score) | +15 bonus | 0 | 0 |
| Code Autopsy (ครั้งแรก) | +20 | +8 | 0 |
| Code Autopsy (ซ้ำ) | +8 | +2 | 0 |
| Code Autopsy (Perfect) | +10 bonus | 0 | 0 |
| Bug Hunt (ครั้งแรก) | +30 | +12 | 0 |
| Bug Hunt (ซ้ำ) | +5 | +1 | 0 |
| Bug Hunt (Perfect) | +20 bonus | 0 | 0 |
| Achievement ต่างๆ | ตาม Achievement | ตาม Achievement | ตาม Achievement |

> **หมายเหตุ:** ถ้ามี Season ที่ Active อยู่ XP ทุกประเภทจะถูกคูณด้วย `xpMultiplier` ของ Season นั้น

### 4.2 ระบบ Rank (10 ระดับ)

| ระดับ | ชื่อ | XP ขั้นต่ำ | ไอคอน | สี |
|---|---|---|---|---|
| 1 | ไข่โปรแกรม | 0 | 🥚 | เทา |
| 2 | โค้ดเดอร์มือใหม่ | 200 | 🐣 | เขียวอ่อน |
| 3 | นักแก้บัค | 500 | 🐛 | เขียว Emerald |
| 4 | ผู้เชี่ยวชาญลูป | 1,000 | 🔄 | ฟ้า |
| 5 | จอมเวทย์ Logic | 2,000 | 🧙 | Indigo |
| 6 | อินทรีอัลกอริทึม | 3,500 | 🦅 | ม่วง |
| 7 | สถาปนิกโค้ด | 5,500 | 🏗️ | ชมพู |
| 8 | ดาวสยาม | 8,500 | ⭐ | ทอง Amber |
| 9 | ราชันโปรแกรม | 13,000 | 👑 | ส้ม |
| 10 | เทพเจ้า AI | 20,000 | 🤖 | แดง |

### 4.3 สกุลเงินในระบบ

| สกุลเงิน | สัญลักษณ์ | การได้มา | การใช้ (ปัจจุบัน) |
|---|---|---|---|
| **CodeCoin** | 🪙 | ส่งงาน, เล่นเกม, Streak | แสดงบน Profile/Leaderboard |
| **Crystal** | 💎 | First Solve, Streak 7+, Achievement พิเศษ | แสดงบน Profile/Leaderboard |

### 4.4 ระบบ Streak (ต่อเนื่องการเข้าใช้งาน)

- นับจาก Login วันแรก
- ถ้า Login ติดต่อกัน → `streakDays++`
- ถ้าขาดวัน → รีเซ็ตเป็น 1
- `handleDailyStreak(uid)` ถูกเรียกใน `onAuthStateChanged` ทุกครั้งที่ Login
- `dailyXP` รีเซ็ตทุกเที่ยงคืน, `weeklyXP` รีเซ็ตทุกวันจันทร์

### 4.5 Leaderboard

- **แยกตามรายวิชา (courseId):** นักเรียนเห็นเฉพาะเพื่อนในวิชาเดียวกัน
- **3 ช่วงเวลา:** Daily (XP วันนี้) / Weekly (XP สัปดาห์นี้) / All-time (XP ทั้งหมด)
- **Snapshot:** อัพเดทใน `leaderboardSnapshots` ทุกครั้งที่มี XP เข้า
- **Doc ID Format:** `{courseId}_alltime`, `{courseId}_weekly`, `{courseId}_daily`

---

## 5. ระบบ AI Coaching (5Es)

ระบบใช้ **Google Gemini API (gemini-2.0-flash)** ทำหน้าที่เป็น AI Coach 5 บทบาท ตามกรอบ 5Es

### 5.1 บทบาท Coach ทั้ง 5

#### 1. Mindset Coach (Engage)
- **Trigger:** นักเรียนส่งงานผิด 3 ครั้งติดต่อกันในโจทย์เดิม
- **บทบาท:** ให้กำลังใจ สร้างแรงจูงใจ ไม่ให้ท้อถอย
- **รูปแบบ Output:** ข้อความภาษาไทย 4 ประโยค พร้อม emoji อบอุ่น
- **บันทึกใน:** `coachInteractions` (coachRole: 'mindset')

#### 2. Socratic Coach (Explore)
- **Trigger:** นักเรียนกดขอ Hint ในหน้า CodingWorkspace
- **บทบาท:** ให้ Hint แบบ Socratic 3 ระดับ (ถามคำถาม → อธิบาย Concept → Pseudocode)
- **ระดับ Hint:**
  - Level 1: ตั้งคำถามชวนคิด ไม่บอกคำตอบตรงๆ
  - Level 2: อธิบาย Concept + ตัวอย่างคล้ายกันแต่ต่างกัน
  - Level 3: โครงสร้าง Pseudocode / แนวทางแก้ปัญหา
- **จำกัด:** max 150 คำต่อ Hint
- **บันทึกใน:** `coachInteractions` (coachRole: 'socratic')

#### 3. Diagnostic Coach (Evaluate)
- **Trigger:** ครูหรือนักเรียนกดปุ่ม "วิเคราะห์จุดอ่อน" บน Dashboard
- **บทบาท:** วิเคราะห์ Pattern ของ Submission ล่าสุด 30 รายการ หาจุดอ่อน
- **Output:** รายงานสรุป จุดแข็ง/จุดอ่อน + แนะนำโจทย์ที่ควรฝึก
- **บันทึกใน:** `coachInteractions` (coachRole: 'diagnostic')

#### 4. Analytics Coach (Explain)
- **Trigger:** กดดู Weekly Insight บน Dashboard
- **บทบาท:** สรุป XP Trend, Game Activity, ความสม่ำเสมอ
- **Output:** รายงานสัปดาห์ + คำแนะนำ
- **บันทึกใน:** `coachInteractions` (coachRole: 'analytics')

#### 5. Challenge Coach (Elaborate)
- **Trigger:** นักเรียนได้คะแนน ≥ 90% ต่อเนื่อง
- **บทบาท:** แนะนำโจทย์ยากขึ้น, กิจกรรมเสริม
- **บันทึกใน:** `coachInteractions` (coachRole: 'challenge')

### 5.2 Prompt Template ที่ใช้

ทุก Coach ใช้ Gemini ด้วย System Instruction ภาษาไทย ระบุ:
- บทบาทของ Coach
- ข้อมูลของนักเรียน (XP, Rank, ประวัติการส่งงาน)
- เนื้อหาโจทย์ที่เกี่ยวข้อง
- ข้อจำกัดความยาวของคำตอบ
- รูปแบบ Output ที่ต้องการ

### 5.3 การบันทึก coachInteractions (Research)

ทุก Coach Call บันทึกข้อมูลเพื่องานวิจัย:
- **uid:** นักเรียนที่ได้รับ Coaching
- **coachRole:** ประเภท Coach
- **triggerEvent:** เหตุการณ์ที่ทำให้เกิด Coach
- **relatedId:** โจทย์ที่เกี่ยวข้อง
- **prompt:** สิ่งที่ส่งให้ AI (ไม่เกิน 500 chars)
- **response:** คำตอบจาก AI (ไม่เกิน 1000 chars)
- **createdAt:** Timestamp

---

## 6. Mini-Games

### 6.1 เกมทั้ง 3 ประเภท

#### Quiz Blitz (ควิซซ์แบบจับเวลา)
- **รูปแบบ:** Multiple Choice 5 ข้อ เกี่ยวกับภาษา C
- **เวลา:** 30 วินาที/ข้อ (countdown timer)
- **เนื้อหา:** สร้างโดย Gemini หรือ Fallback content (เนื้อหา C พื้นฐาน)
- **URL:** `#/student/games/quiz?unit=1`
- **XP:** First play today: +25 XP +10 Coin | Repeat: +10 XP +3 Coin | Perfect bonus: +15 XP

#### Code Autopsy (วิเคราะห์โค้ด)
- **รูปแบบ:** อ่านโค้ด C แล้วทายผลลัพธ์ (4 ตัวเลือก)
- **จำนวน:** 5 โจทย์ต่อ Session
- **เนื้อหา:** โค้ด C สั้นๆ พร้อมคำอธิบายหลังตอบ
- **URL:** `#/student/games/autopsy?unit=1`
- **XP:** First: +20 XP +8 Coin | Repeat: +8 XP +2 Coin | Perfect bonus: +10 XP

#### Bug Hunt (ตามล่าบัค)
- **รูปแบบ:** โค้ด C ที่มีบัค → นักเรียนพิมพ์แก้ไข → AI ตรวจ Fuzzy
- **จำนวน:** 5 โจทย์ต่อ Session
- **ตัวอย่าง:** Missing semicolon, Division by zero, Wrong loop condition
- **URL:** `#/student/games/bughunt?unit=1`
- **XP:** First: +30 XP +12 Coin | Repeat: +5 XP +1 Coin | Perfect bonus: +20 XP

### 6.2 ระบบ Cache เนื้อหาเกม

- เนื้อหาเกมสร้างโดย Gemini เพียงครั้งเดียวต่อวัน
- Cache ไว้ใน `miniGameContent/{gameType}_{unitId}_{date}`
- ถ้า Cache มีอยู่แล้ว → ใช้ Cache (ไม่เรียก Gemini ซ้ำ ประหยัด quota)
- ถ้า Gemini ล้มเหลว → ใช้ Fallback content (hardcoded)

### 6.3 Mini-Game Hub

หน้า `#/student/games` แสดง:
- 3 เกม Card พร้อมสถานะวันนี้ (เล่นแล้วหรือยัง, XP ที่ได้วันนี้)
- Unit Selector เลือกหน่วยเนื้อหา
- XP รวมที่ได้จากเกมวันนี้

---

## 7. ระบบ Achievement

### 7.1 Achievement ทั้งหมด

| Achievement ID | ชื่อ | เงื่อนไข | Rarity | XP | Coin | Crystal |
|---|---|---|---|---|---|---|
| first_blood | First Blood 🩸 | ผ่านโจทย์ครั้งแรก | common | 50 | 10 | 0 |
| perfect_score | Perfectionist 💯 | ผ่าน 100% ทุก Test Case | uncommon | 100 | 20 | 1 |
| no_hint_hero | No Hint Hero 🧠 | ผ่านโจทย์ Hard โดยไม่ขอ Hint | rare | 200 | 30 | 2 |
| speed_demon | Speed Demon ⚡ | ผ่านโจทย์ Medium ใน < 5 นาที | uncommon | 150 | 20 | 0 |
| comeback_kid | Comeback Kid 🦋 | ล้มเหลว 5+ ครั้งแล้วผ่าน | uncommon | 120 | 15 | 1 |
| streak_3 | Hot Streak 🔥 | Login 3 วันติด | common | 60 | 10 | 0 |
| streak_7 | Weekly Warrior 🏆 | Login 7 วันติด | rare | 150 | 25 | 2 |
| all_assignments | Completionist 📚 | ทำโจทย์ครบทุกข้อในวิชา | epic | 500 | 100 | 5 |
| rank_up_5 | Mid-tier 🦅 | ขึ้นถึง Rank 5 | uncommon | 100 | 20 | 1 |
| rank_up_10 | AI God 🤖 | ขึ้นถึง Rank 10 | legendary | 1000 | 200 | 10 |
| quiz_master | Quiz Master 🧩 | เล่น Quiz Blitz ครบ 10 ครั้ง | common | 80 | 15 | 0 |
| bug_exterminator | Bug Exterminator 🐛 | เล่น Bug Hunt ครบ 10 ครั้ง | uncommon | 100 | 20 | 1 |
| autopsy_expert | Code Surgeon 🔬 | เล่น Code Autopsy ครบ 10 ครั้ง | uncommon | 100 | 20 | 1 |

### 7.2 การแสดงผล Achievement

- **Achievement Gallery:** `#/student/achievements`
- Achievement ที่ได้แล้ว → สีเต็ม + วันที่ได้รับ
- Achievement ที่ยังไม่ได้ → เทา + เงื่อนไข
- จัดกลุ่มตาม Category (Skill, Streak, Games, Special)

---

## 8. คู่มือผู้ดูแลระบบ (Admin)

### 8.1 การเข้าถึง

- URL: `https://koki-assawin.github.io/AI-Powered-C/#/admin/dashboard`
- ต้องใช้บัญชีที่มี `role: 'admin'` ใน Firestore

### 8.2 หน้าต่างๆ ของ Admin

#### Admin Dashboard (`#/admin/dashboard`)
- สถิติภาพรวมระบบ (จำนวนผู้ใช้, วิชา, การส่งงาน)
- Quick links ไปยังเครื่องมือต่างๆ

#### User Manager (`#/admin/users`)
- ดูรายชื่อผู้ใช้ทั้งหมด
- อนุมัติบัญชีใหม่ (`approvedByAdmin: true`)
- เปลี่ยน Role ผู้ใช้ (student ↔ teacher ↔ admin)
- ปิดใช้งานบัญชี

#### System Settings (`#/admin/settings`)
- **ตั้งค่า Gemini API Key** (บันทึกใน `config/gemini`)
- ทดสอบ API Key ว่าทำงานได้หรือไม่
- API Key จะถูกโหลดโดย `js/gemini.js` ทุกครั้งที่ระบบเริ่ม

#### Research Data Seeder (`#/admin/seed`)

**วัตถุประสงค์:** สร้างข้อมูล Gamification จำลองที่มีความสัมพันธ์กับคะแนน E1 สำหรับงานวิจัย

**Engagement Tier (5 ระดับ):**
| Tier | ระดับ | จำนวนนักเรียน | XP Range | E1 Score Range |
|---|---|---|---|---|
| 1 | สูงมาก | 6 คน | 3,500–5,500 | 82–95% |
| 2 | สูง | 8 คน | 1,800–3,500 | 72–85% |
| 3 | ปานกลาง | 10 คน | 700–1,800 | 58–75% |
| 4 | ต่ำ | 6 คน | 200–700 | 45–62% |
| 5 | น้อยมาก | 2 คน | 50–200 | 35–52% |

**ความสัมพันธ์ที่ออกแบบไว้ (r ที่คาดหวัง):**
- XP สะสม ↔ E1 เฉลี่ย: r ≈ 0.72
- Game sessions ↔ E1 เฉลี่ย: r ≈ 0.65
- Quiz Blitz ↔ E1 Unit 1: r ≈ 0.68
- Bug Hunt ↔ E1 Unit 3: r ≈ 0.63
- Self-practice ↔ E1 Unit 2: r ≈ 0.60
- Streak ↔ E1 เฉลี่ย: r ≈ 0.58

**วิธี Seed:**
1. ไปที่ `#/admin/seed`
2. เลือกรายวิชา (optional — ถ้าไม่เลือก Seed ตาม studentCode 11669-11701)
3. กด "🚀 เริ่ม Seed ข้อมูลวิจัย"
4. รอจนครบ (Progress bar 100%)
5. กด "📥 Export CSV (SPSS/R)" เพื่อดาวน์โหลดข้อมูล

**ข้อมูลที่ Seed ต่อนักเรียน:**
- `playerStats` document (XP, Rank, Streak, ฯลฯ)
- `xpLedger` 8-15 รายการ (transaction history)
- `miniGameSessions` (สูงสุด 15 sessions รวม 3 เกม)
- `studentAchievements` (ตาม Tier)

### 8.3 การ Deploy ระบบ

```bash
# Deploy ทุกอย่าง
firebase deploy

# Deploy เฉพาะ Hosting (เร็วกว่า)
firebase deploy --only hosting

# Deploy เฉพาะ Firestore Rules
firebase deploy --only firestore:rules
```

---

## 9. คู่มือครู (Teacher)

### 9.1 การเข้าถึง

- URL: `#/teacher/dashboard`
- ต้องมี `role: 'teacher'` หรือ `role: 'admin'`

### 9.2 Teacher Dashboard

แสดงสรุป:
- จำนวนวิชา, นักเรียนลงทะเบียน, การส่งงานทั้งหมด, อัตราผ่านรวม
- Quick links: วิเคราะห์นักเรียน, จัดการนักเรียน, Gamification Admin
- รายการวิชาทั้งหมดของครู

### 9.3 จัดการรายวิชา (`#/teacher/courses`)

**การสร้างวิชาใหม่:**
1. กด "+ สร้างรายวิชาใหม่"
2. กรอก: ชื่อวิชา, คำอธิบาย
3. กด "สร้างวิชา"
4. ระบบสร้าง `classCode` อัตโนมัติ (ใช้ให้นักเรียนลงทะเบียน)

**การจัดการโจทย์ (Assignment):**
1. เข้าวิชา → กด "จัดการโจทย์"
2. สร้าง Assignment: ชื่อ, คำอธิบาย (Markdown), ระดับ, วันส่ง
3. เพิ่ม Test Cases: Input + Expected Output
4. Publish เมื่อพร้อมให้นักเรียนทำ

### 9.4 วิเคราะห์นักเรียน (`#/teacher/analytics`)

**7 แท็บข้อมูล:**

| แท็บ | เนื้อหา |
|---|---|
| 📊 ภาพรวม | กราฟผ่าน/ไม่ผ่านแต่ละโจทย์, อัตราส่งงาน |
| 👤 รายบุคคล | เลือกนักเรียน → ดูประวัติการส่งทุกครั้ง + รายงาน AI |
| 📋 สรุปคะแนนทุกคน | ตารางคะแนน Sort ได้ |
| 🎯 คะแนนฝึกเอง | ข้อมูล Self-Practice ของนักเรียน |
| 🤖 รายงาน AI | สร้างรายงานวิเคราะห์ทั้งชั้นด้วย Gemini |
| 🎮 Gamification | XP/Rank/Coin/Streak ของทุกคน + Export JSON |

**Gamification Tab:**
- กรองอัตโนมัติตามวิชาที่เลือกด้านบน (ไม่มี dropdown แยก)
- ตารางเรียงตาม XP สูง→ต่ำ
- Export JSON สำหรับ SPSS/R analysis

### 9.5 จัดการนักเรียน (`#/teacher/students`)

- ดูรายชื่อนักเรียนทุกคนในวิชา
- ดูประวัติการส่งงานของแต่ละคน
- อนุมัติการลงทะเบียน (ถ้าใช้ระบบ Manual Approval)

### 9.6 Gamification Admin (`#/teacher/gamification`)

**4 แท็บ:**

**Season (แท็บแรก):**
- ดู Season ที่ Active อยู่
- สร้าง Season ใหม่: ชื่อ, วันสิ้นสุด, XP Multiplier
- Season ให้ XP bonus ทุกกิจกรรมตลอดช่วง Season

**Export ข้อมูล:**
- Export ข้อมูล Gamification เป็น JSON ครบทุก collection
- ใช้สำหรับ SPSS/R analysis

**Award XP:**
- ให้ XP นักเรียนแบบ Manual (สำหรับกิจกรรมพิเศษ)
- บันทึกใน `xpLedger` อัตโนมัติ

**Game Stats:**
- สถิติ Mini-game รวม (จำนวน Session, คะแนนเฉลี่ย)

**อัพเดท Leaderboard:**
- เลือกรายวิชา → กด "Refresh Leaderboard"
- อัพเดท Snapshot ทั้ง 3 ช่วงเวลา (Daily/Weekly/Alltime)

---

## 10. คู่มือนักเรียน (Student)

### 10.1 การลงทะเบียน

1. ไปที่ `#/register`
2. กรอก: ชื่อ, Email, Password, รหัสนักเรียน, เลขที่
3. รอครู/Admin อนุมัติ (`approvedByAdmin: true`)
4. Login ด้วย Email/Password

### 10.2 Student Dashboard (`#/student/dashboard`)

แสดง:
- **XP Bar:** Progress ไปยัง Rank ถัดไป
- **Rank Card:** Rank ปัจจุบัน + XP + Coin + Crystal
- **Streak Card:** ต่อเนื่องกี่วัน + กำลังใจจาก AI Coach (ถ้ามี)
- **วิชาที่ลงทะเบียน:** รายการวิชาพร้อมสถานะ
- **Mini-game shortcuts:** ลิงก์ด่วนไปเกมวันนี้
- **Top 5 Leaderboard preview**

### 10.3 ทำโจทย์ (CodingWorkspace)

1. เลือกวิชา → เลือกโจทย์
2. อ่านโจทย์ด้านซ้าย, เขียนโค้ดด้านขวา (CodeMirror)
3. กด "▶ Run" → ดูผล Test Cases
4. กด "💡 ขอ Hint" → AI Socratic Coach ให้ Hint 3 ระดับ
5. ผ่านทุก Test Case → ได้ XP อัตโนมัติ + Toast แจ้ง
6. ถ้าล้มเหลว 3 ครั้งติด → Mindset Coach ปรากฏ

**XP ที่ได้จากการส่งงาน:**
- Score 100%: +50 XP +10 Coin
- Score 80-99%: +30 XP +5 Coin
- Score 50-79%: +15 XP +2 Coin
- Score <50%: +5 XP
- ครั้งแรกที่ผ่าน (First Solve): +20 XP เพิ่มเติม

### 10.4 Leaderboard (`#/student/leaderboard`)

- เลือกวิชาจาก Dropdown (ถ้าลงทะเบียนหลายวิชา)
- เปลี่ยนแท็บ: วันนี้ / สัปดาห์นี้ / ตลอดกาล
- ตนเองจะถูก Highlight สีพิเศษ
- แสดง Season Banner (ถ้ามี Season Active)

### 10.5 Mini-Games (`#/student/games`)

**วิธีเล่น Quiz Blitz:**
1. เลือก Unit → กด "เล่น Quiz Blitz"
2. ตอบ 5 ข้อ (30 วินาที/ข้อ)
3. ดูคะแนน + XP ที่ได้

**วิธีเล่น Code Autopsy:**
1. อ่านโค้ด C → เลือก Output ที่ถูกต้องจาก 4 ตัวเลือก
2. ดูคำอธิบายหลังตอบแต่ละข้อ

**วิธีเล่น Bug Hunt:**
1. อ่านโค้ดที่มีบัค → พิมพ์การแก้ไข
2. AI ตรวจคำตอบแบบ Fuzzy (ไม่ต้อง exact match)

### 10.6 Achievement (`#/student/achievements`)

- ดู Badge ทั้งหมดที่มีในระบบ
- Achievement ที่ได้แล้ว: สีเต็ม + วันที่
- ที่ยังไม่ได้: สีเทา + เงื่อนไข
- เมื่อ Unlock → Toast แจ้งพร้อม XP Bonus

### 10.7 ประวัติการส่งงาน (`#/student/history`)

- รายการส่งงานทั้งหมด เรียงตามวันที่
- คลิกดูโค้ดและ Feedback ของแต่ละครั้ง

### 10.8 ฝึกเขียนโค้ดเอง (`#/student/practice`)

- ฝึกโจทย์นอกเหนือจาก Assignment
- ไม่มีผลต่อเกรด แต่ได้ XP
- ข้อมูลบันทึกใน `selfPracticeSubmissions`

---

## 11. ข้อมูลสำหรับงานวิจัย

### 11.1 ตัวแปรที่เก็บได้จากระบบ

**ตัวแปรต้น (Independent Variables — Gamification):**
| ตัวแปร | Collection | Field |
|---|---|---|
| XP สะสม | playerStats | xp |
| ระดับ Rank | playerStats | rank |
| Streak (วันติดต่อกัน) | playerStats | streakDays |
| Streak ยาวสุด | playerStats | longestStreak |
| จำนวน Session Quiz Blitz | playerStats | quizBlitzSessions |
| จำนวน Session Code Autopsy | playerStats | codeAutopsySessions |
| จำนวน Session Bug Hunt | playerStats | bugHuntSessions |
| จำนวน Self-Practice | playerStats | selfPracticeCount |
| จำนวน Achievement | studentAchievements | count per uid |
| Engagement Tier (seed data) | playerStats | engagementTier |

**ตัวแปรตาม (Dependent Variables — ผลการเรียน):**
| ตัวแปร | Collection | Field |
|---|---|---|
| คะแนน E1 Unit 1-4 | playerStats | e1ScoreUnit1-4 (seed) |
| คะแนนเฉลี่ย E1 | playerStats | e1Average (seed) |
| Score การส่งงานจริง | submissions | score |
| อัตราผ่าน Assignment | submissions | passed |
| คะแนน Self-Practice เฉลี่ย | playerStats | selfPracticeAvgScore |

**ตัวแปรกลาง (Mediating — AI Coaching):**
| ตัวแปร | Collection | Field |
|---|---|---|
| จำนวน Coach Interactions รวม | coachInteractions | count per uid |
| จำนวน Mindset Coach | coachInteractions | coachRole='mindset' |
| จำนวน Socratic Coach (Hint) | coachInteractions | coachRole='socratic' |
| จำนวน Diagnostic Coach | coachInteractions | coachRole='diagnostic' |

### 11.2 การ Export ข้อมูลสำหรับวิเคราะห์

**วิธีที่ 1: Export CSV (จาก ResearchDataSeeder)**
- ไปที่ `#/admin/seed` → กด "📥 Export CSV (SPSS/R)"
- ได้ไฟล์ `research_data_YYYY-MM-DD.csv`
- รวม: uid, displayName, engagementTier, xp, streakDays, totalGameSessions, quizBlitzSessions, codeAutopsySessions, bugHuntSessions, selfPracticeCount, selfPracticeAvgScore, e1ScoreUnit1-4, e1Average

**วิธีที่ 2: Export JSON (จาก GamificationAdmin)**
- ไปที่ `#/teacher/gamification` → Tab "Export ข้อมูล"
- กด "📥 Export JSON"
- ได้ไฟล์ `gamification_export_TIMESTAMP.json`
- รวม: playerStats ทั้งหมด + coachInteractions ล่าสุด 50 รายการ

**วิธีที่ 3: Firestore Console**
- ดึงข้อมูลดิบจาก Firebase Console → Firestore → Export

### 11.3 การคำนวณค่าสหสัมพันธ์ที่ออกแบบไว้

ข้อมูลจาก Seeder ถูกออกแบบให้มีความสัมพันธ์:

```
Spearman's rho (ค่าที่คาดหวัง):
- XP ↔ E1 เฉลี่ย:           r ≈ 0.72 (p < .001)
- Game sessions ↔ E1 เฉลี่ย: r ≈ 0.65 (p < .001)
- Quiz Blitz ↔ E1 Unit 1:    r ≈ 0.68 (p < .001)
- Bug Hunt ↔ E1 Unit 3:      r ≈ 0.63 (p < .001)
- Self-practice ↔ E1 Unit 2: r ≈ 0.60 (p < .001)
- Streak ↔ E1 เฉลี่ย:        r ≈ 0.58 (p < .001)
```

### 11.4 จุดเก็บข้อมูลวิจัย (Data Collection Points)

| จุดเก็บข้อมูล | Collection | เหตุการณ์ที่ Trigger |
|---|---|---|
| ทุก XP Award | xpLedger | ส่งงาน, เล่นเกม, Streak, Achievement |
| ทุก Coach Call | coachInteractions | ขอ Hint, ล้มเหลว 3 ครั้ง, กดวิเคราะห์ |
| ทุก Game Session | miniGameSessions | จบเกม 1 รอบ |
| ทุก Achievement | studentAchievements | Unlock Achievement |
| ทุกการส่งงาน | submissions | กด Submit ในโค้ดเอดิเตอร์ |
| ทุก Streak | playerStats | Login ทุกวัน |

---

## 12. Security Rules

### 12.1 หลักการสิทธิ์การเข้าถึง

| Collection | นักเรียน | ครู | Admin |
|---|---|---|---|
| users | อ่าน/แก้ไข (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| playerStats | อ่านทั้งหมด, แก้ไขตนเอง | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| courses | อ่าน | สร้าง/แก้ไขวิชาตน | อ่าน/แก้ไขทั้งหมด |
| assignments | อ่าน | สร้าง/แก้ไข | อ่าน/แก้ไขทั้งหมด |
| submissions | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| enrollments | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| xpLedger | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| coachInteractions | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| miniGameSessions | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| achievements | อ่าน | อ่าน | อ่าน/แก้ไข |
| studentAchievements | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| seasons | อ่าน | อ่าน/สร้าง/แก้ไข | อ่าน/แก้ไขทั้งหมด |
| config | อ่าน | อ่าน | อ่าน/แก้ไข |

> **หมายเหตุ:** `playerStats` อนุญาตให้ทุก Authenticated User อ่านได้ทั้งหมด (เพื่อให้ Leaderboard ทำงานได้) แต่แก้ไขได้เฉพาะของตนเองหรือ Admin

---

## 13. โครงสร้างไฟล์ระบบ

```
AI-Powered-C/
├── index.html                          ← Entry point, load scripts ทั้งหมด
├── firestore.rules                     ← Security rules
├── firestore.indexes.json              ← Composite indexes
├── firebase.json                       ← Firebase Hosting config
├── .firebaserc                         ← Firebase project config
│
├── js/
│   ├── firebase.js                     ← Firebase init (db, auth, firebase)
│   ├── gemini.js                       ← Gemini API wrapper
│   ├── grader.js                       ← Piston API (execute C code)
│   ├── gamification.js                 ← XP/Rank/Streak/Leaderboard engine
│   ├── achievementEngine.js            ← Achievement definitions + checker
│   ├── aiCoach.js                      ← 5 AI Coach roles
│   ├── miniGameGenerator.js            ← Mini-game content generator
│   ├── context.js                      ← React AuthContext
│   ├── app.js                          ← Hash Router (root)
│   │
│   ├── components/
│   │   ├── Navbar.js                   ← Navigation bar (per-role)
│   │   ├── XPBar.js                    ← XP progress bar component
│   │   ├── CodeEditor.js               ← CodeMirror wrapper
│   │   ├── RadarChart.js               ← Radar chart (analytics)
│   │   ├── Spinner.js                  ← Loading spinner
│   │   └── ProtectedRoute.js           ← Role-based route guard
│   │
│   ├── pages/
│   │   ├── LoginPage.js                ← หน้า Login
│   │   ├── RegisterPage.js             ← หน้า Register
│   │   │
│   │   ├── student/
│   │   │   ├── StudentDashboard.js     ← Dashboard: XP, Rank, วิชา
│   │   │   ├── CourseViewer.js         ← รายการวิชา + โจทย์
│   │   │   ├── CodingWorkspace.js      ← โค้ดเอดิเตอร์ + Grader + AI Hint
│   │   │   ├── Gradebook.js            ← คะแนนทุกโจทย์
│   │   │   ├── SubmissionHistory.js    ← ประวัติการส่ง
│   │   │   ├── SelfPractice.js         ← ฝึกโค้ดเอง
│   │   │   ├── StudentProfile.js       ← โปรไฟล์ + Game Stats
│   │   │   ├── Leaderboard.js          ← อันดับตามวิชา (3 ช่วงเวลา)
│   │   │   ├── AchievementsPage.js     ← Badge Gallery
│   │   │   ├── MiniGameHub.js          ← หน้าเลือกเกม
│   │   │   └── games/
│   │   │       ├── QuizBlitz.js        ← เกม MCQ 5 ข้อ จับเวลา
│   │   │       ├── CodeAutopsy.js      ← เกมทาย Output โค้ด C
│   │   │       └── BugHunt.js          ← เกมหาและแก้ Bug
│   │   │
│   │   ├── teacher/
│   │   │   ├── TeacherDashboard.js     ← Dashboard ครู
│   │   │   ├── CourseBuilder.js        ← สร้าง/จัดการวิชา
│   │   │   ├── AssignmentManager.js    ← สร้าง/จัดการโจทย์
│   │   │   ├── TestCaseEditor.js       ← ออก Test Cases
│   │   │   ├── StudentAnalytics.js     ← วิเคราะห์นักเรียน (7 แท็บ)
│   │   │   ├── GamificationAdmin.js    ← จัดการ Season, Export, Award XP
│   │   │   ├── StudentManagement.js    ← จัดการนักเรียน
│   │   │   └── ClassManager.js         ← (deprecated — ไม่ใช้แล้ว)
│   │   │
│   │   └── admin/
│   │       ├── AdminDashboard.js       ← Dashboard Admin
│   │       ├── UserManager.js          ← จัดการผู้ใช้ + อนุมัติบัญชี
│   │       ├── SystemSettings.js       ← ตั้งค่า Gemini API Key
│   │       └── ResearchDataSeeder.js   ← Seed ข้อมูลวิจัย + Export CSV
```

---

## ภาคผนวก

### A. สรุปสถิติระบบ

| รายการ | จำนวน |
|---|---|
| ไฟล์ JS ทั้งหมด | 42 ไฟล์ |
| Firestore Collections | 23 Collections |
| Student Routes | 14 Routes |
| Teacher Routes | 7 Routes |
| Admin Routes | 4 Routes |
| Rank Tiers | 10 ระดับ (0–20,000 XP) |
| AI Coach Roles | 5 บทบาท |
| Mini-game ประเภท | 3 ประเภท |
| Achievement | 13 รายการ |
| Engagement Tiers (วิจัย) | 5 ระดับ |

### B. ติดต่อและ Repository

- **GitHub Repository:** https://github.com/koki-assawin/AI-Powered-C
- **Production URL:** https://koki-assawin.github.io/AI-Powered-C/
- **Firebase Project:** ai-powered-coding-596ed
- **Firebase Console:** https://console.firebase.google.com/project/ai-powered-coding-596ed

### C. เวอร์ชัน History

| เวอร์ชัน | Feature หลัก |
|---|---|
| v4.6 | LMS พื้นฐาน: วิชา, โจทย์, ส่งงาน, Grader, AI Hint |
| v5.0 | + Gamification (XP/Rank/Streak/Leaderboard/Achievement) |
| v5.0 | + AI Coaching 5 บทบาท (5Es Framework) |
| v5.0 | + Mini-games (Quiz Blitz, Code Autopsy, Bug Hunt) |
| v5.0 | + GamificationAdmin, ResearchDataSeeder |
| v5.1–5.4 | Bug fixes: Leaderboard permission, Course-enrollment isolation, UI cleanup |

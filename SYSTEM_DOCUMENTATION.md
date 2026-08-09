# เอกสารระบบและข้อมูลนวัตกรรม
# แพลตฟอร์มการเรียนรู้การเขียนโปรแกรมเชิงอัจฉริยะ
## AI-Powered Coding Coach (APCC)
### บูรณาการปัญญาประดิษฐ์ เกมมิฟิเคชัน และกรอบแนวคิด 5Es

**รหัสวิชา:** ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น  
**กลุ่มเป้าหมาย:** นักเรียน ม.4/6 โรงเรียนเตรียมอุดมศึกษาพัฒนาการ  
**URL ระบบ:** https://koki-assawin.github.io/AI-Powered-C/  
**วันที่จัดทำเอกสาร:** 9 สิงหาคม 2569  
**เวอร์ชันระบบ:** v5.5

---

## สารบัญ

**ส่วนที่ 1 — ข้อมูลสำหรับรายงานนวัตกรรม (ก.ค.ศ.)**
1. [ชื่อนวัตกรรม](#1-ชื่อนวัตกรรม)
2. [ระยะเวลาการดำเนินการ](#2-ระยะเวลาการดำเนินการ)
3. [ความเป็นมาและความสำคัญของปัญหา](#3-ความเป็นมาและความสำคัญของปัญหา)
4. [วัตถุประสงค์](#4-วัตถุประสงค์)
5. [ทฤษฎี แนวคิด และองค์ความรู้](#5-ทฤษฎีแนวคิดและองค์ความรู้)
6. [กระบวนการสร้างและพัฒนา](#6-กระบวนการสร้างและพัฒนา)
7. [การนำนวัตกรรมไปใช้](#7-การนำนวัตกรรมไปใช้)
8. [ผลจากการใช้นวัตกรรม](#8-ผลจากการใช้นวัตกรรม)
9. [ประโยชน์ของนวัตกรรม](#9-ประโยชน์ของนวัตกรรม)
10. [การยอมรับและการเป็นแบบอย่างที่ดี](#10-การยอมรับและการเป็นแบบอย่างที่ดี)
11. [การพัฒนาต่อยอด](#11-การพัฒนาต่อยอด)

**ส่วนที่ 2 — ข้อมูลทางเทคนิค (ภาคผนวก)**
- [ก. สถาปัตยกรรมและเทคโนโลยี](#ก-สถาปัตยกรรมและเทคโนโลยี)
- [ข. โครงสร้างฐานข้อมูล Firestore](#ข-โครงสร้างฐานข้อมูล-firestore)
- [ค. ระบบ Gamification](#ค-ระบบ-gamification)
- [ง. ระบบ AI Coaching (5Es)](#ง-ระบบ-ai-coaching)
- [จ. Mini-Games](#จ-mini-games)
- [ฉ. ระบบ Achievement](#ฉ-ระบบ-achievement)
- [ช. Learning Hub และ Content CMS](#ช-learning-hub-และ-content-cms)
- [ซ. ความปลอดภัยและสิทธิ์การเข้าถึง](#ซ-ความปลอดภัยและสิทธิ์การเข้าถึง)
- [ฌ. โครงสร้างไฟล์ระบบ](#ฌ-โครงสร้างไฟล์ระบบ)
- [ญ. เวอร์ชัน History](#ญ-เวอร์ชัน-history)

---

# ส่วนที่ 1 — ข้อมูลสำหรับรายงานนวัตกรรม

---

## 1. ชื่อนวัตกรรม

**แพลตฟอร์มการเรียนรู้การเขียนโปรแกรมเชิงอัจฉริยะ ด้วยกรอบแนวคิด 5Es  
บูรณาการปัญญาประดิษฐ์และเกมมิฟิเคชัน**

*(AI-Powered Coding Coach — APCC)*

นวัตกรรมนี้เป็น **ระบบบริหารจัดการการเรียนรู้ (Learning Management System)** ที่ผู้สอนพัฒนาขึ้นด้วยตนเอง สำหรับรายวิชา ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น ระดับชั้น ม.4 โดยบูรณาการ AI Coach ที่ขับเคลื่อนด้วย Google Gemini, ระบบ Gamification (XP/Rank/Achievement), Mini-Games ฝึกทักษะ, ศูนย์การเรียนรู้ดิจิทัล (Learning Hub) และ Analytics Dashboard เพื่อส่งเสริมการเรียนรู้เชิงรุกและสนับสนุนการตัดสินใจเชิงข้อมูลของครู

---

## 2. ระยะเวลาการดำเนินการ

| ขั้นตอน | ช่วงเวลา |
|---|---|
| วิเคราะห์ปัญหา ออกแบบระบบ | ธันวาคม 2567 – มกราคม 2568 |
| พัฒนาระบบหลัก (v4.6–v5.0) | กุมภาพันธ์ – มีนาคม 2568 |
| พัฒนา Gamification + AI Coach (v5.0–v5.3) | เมษายน 2568 |
| พัฒนา Learning Hub + Content CMS (v5.4–v5.5) | พฤษภาคม – มิถุนายน 2568 |
| นำไปใช้จริงกับนักเรียน | ภาคเรียนที่ 1 ปีการศึกษา 2568 |
| เก็บข้อมูลและประเมินผล | มิถุนายน – กันยายน 2568 |
| ถอดบทเรียนและจัดทำรายงาน | ตุลาคม 2568 |

---

## 3. ความเป็นมาและความสำคัญของปัญหา

### 3.1 บริบทของปัญหา

วิชาการเขียนโปรแกรมคอมพิวเตอร์เป็นทักษะสำคัญในศตวรรษที่ 21 แต่การสอนในชั้นเรียนขนาด 32 คนประสบปัญหาหลายประการ:

**ด้านนักเรียน:**
- นักเรียนมีพื้นฐานและความสามารถที่หลากหลายมาก บางคนไม่เคยเขียนโปรแกรมมาก่อน บางคนมีประสบการณ์แล้ว ทำให้การสอนแบบเดียวไม่ตอบโจทย์ทุกคน
- การเรียนเขียนโปรแกรมต้องการการฝึกซ้ำ (Deliberate Practice) แต่นักเรียนขาดแรงจูงใจและ Feedback ที่ทันทีเมื่อทำงานนอกเวลาเรียน
- เมื่อนักเรียนติดปัญหาในการเขียนโค้ด ไม่มีช่องทางขอความช่วยเหลือที่สะดวกนอกห้องเรียน
- ขาดเนื้อหาอ้างอิงดิจิทัลที่เชื่อมโยงกับหลักสูตรวิชาโดยตรง

**ด้านครูผู้สอน:**
- ครูไม่สามารถติดตามพัฒนาการรายคนได้แบบ Real-time ในชั้นเรียนขนาดใหญ่
- การตรวจงานด้วยตนเองใช้เวลามาก และ Feedback ไม่ทันที
- ขาดข้อมูลเชิงลึกว่านักเรียนคนใดกำลังประสบปัญหา ก่อนที่ปัญหาจะสะสมจนแก้ไขยาก
- ไม่มีระบบจัดการเนื้อหาดิจิทัลที่ใช้งานง่ายสำหรับครูไม่มีพื้นฐานเทคนิค

**ด้านหลักสูตร:**
- แผนการสอนว31281 มี 40 แผน ใน 5 หน่วย แต่ไม่มีสื่อดิจิทัล Interactive ประกอบ
- นักเรียนต้องท่องจำ Syntax โดยไม่เห็นภาพการทำงานจริงของโปรแกรม

### 3.2 ความสำคัญของการแก้ปัญหา

การพัฒนาแพลตฟอร์ม APCC ตอบสนองต่อ:
- **นโยบายกระทรวงศึกษาธิการ** ด้านการบูรณาการเทคโนโลยีและ AI ในการเรียนการสอน
- **หลักสูตรแกนกลาง 2551 (ฉบับปรับปรุง 2560)** ที่เน้นทักษะกระบวนการคิดและการแก้ปัญหา
- **ทักษะศตวรรษที่ 21** ด้าน Digital Literacy, Critical Thinking และ Computational Thinking
- **แนวคิด Personalized Learning** ที่ UNESCO และ OECD ส่งเสริมในระดับสากล

---

## 4. วัตถุประสงค์

1. **เพื่อพัฒนาแพลตฟอร์ม LMS** ที่บูรณาการ AI Coaching ตามกรอบแนวคิด 5Es สำหรับรายวิชาการเขียนโปรแกรมภาษา C
2. **เพื่อสร้างแรงจูงใจ** ในการเรียนรู้การเขียนโปรแกรมด้วยระบบ Gamification (XP, Rank, Badge, Leaderboard, Streak)
3. **เพื่อให้ครูมีเครื่องมือวิเคราะห์** พัฒนาการนักเรียนรายคนและภาพรวมชั้นเรียนแบบ Real-time
4. **เพื่อสร้างศูนย์การเรียนรู้ดิจิทัล (Learning Hub)** ที่มีเนื้อหา Interactive ครอบคลุมหลักสูตร 5 หน่วย 40 แผน
5. **เพื่อให้ครูสามารถสร้างและจัดการเนื้อหา** ดิจิทัลประจำวิชาได้ด้วยตนเองผ่าน Content CMS ที่ใช้งานง่าย
6. **เพื่อศึกษาความสัมพันธ์** ระหว่างพฤติกรรมการใช้ Gamification กับผลสัมฤทธิ์ทางการเรียน

---

## 5. ทฤษฎี แนวคิด และองค์ความรู้

### 5.1 กรอบแนวคิด 5Es (Bybee, 1997)

กรอบ 5Es เป็นแนวคิดการสอนวิทยาศาสตร์ของ Rodger Bybee ที่ระบบ APCC นำมาบูรณาการกับเทคโนโลยี:

| ขั้น 5E | ความหมาย | คอมโพเนนต์ใน APCC |
|---|---|---|
| **Engage** (กระตุ้น) | สร้างความสนใจ เชื่อมกับประสบการณ์เดิม | Streak Bonus, XP Bar, Daily Login Reward, Rank Up Animation |
| **Explore** (สำรวจ) | ลงมือปฏิบัติ สำรวจด้วยตนเอง | Mini-Games (Quiz Blitz, Code Autopsy, Bug Hunt), Self-Practice |
| **Explain** (อธิบาย) | เชื่อมประสบการณ์กับแนวคิดทางทฤษฎี | AI Socratic Coach (Hint 4 ระดับ), Learning Hub 25 หัวข้อ |
| **Elaborate** (ขยาย) | ต่อยอดความรู้ในบริบทใหม่ | Challenge Coach, โจทย์ระดับ Hard, Interactive Tools |
| **Evaluate** (ประเมิน) | สะท้อนผลการเรียนรู้ | Analytics Dashboard, Leaderboard, Achievement, Diagnostic Coach |

### 5.2 Gamification ในการศึกษา

**Deterding et al. (2011)** นิยาม Gamification ว่าคือ "การนำองค์ประกอบของเกมมาใช้ในบริบทที่ไม่ใช่เกม" งานวิจัยหลายชิ้นยืนยันว่า Gamification ส่งผลต่อ:
- **แรงจูงใจภายใน (Intrinsic Motivation)** — นักเรียนอยากเรียนรู้ด้วยตนเอง
- **การมีส่วนร่วม (Engagement)** — เวลาที่ใช้กับกิจกรรมเพิ่มขึ้น
- **ความพยายาม (Persistence)** — ยอมลองแก้ปัญหาซ้ำมากขึ้น

องค์ประกอบ Gamification ใน APCC ได้แก่:
- **XP & Rank** (Points & Levels): กลไกพื้นฐานที่ให้ Feedback ความก้าวหน้า
- **Achievement & Badge**: รางวัลสำหรับพฤติกรรมที่ต้องการส่งเสริม
- **Leaderboard**: การแข่งขันแบบร่วมมือในชั้นเรียนเดียวกัน
- **Streak**: สร้างนิสัยการเรียนสม่ำเสมอ
- **Season & Multiplier**: สร้างช่วงเวลาพิเศษที่น่าตื่นเต้น

### 5.3 Socratic Method และ Scaffolding

**Socratic Coaching** ใน APCC อิงแนวคิดของ Vygotsky (Zone of Proximal Development) และ Bloom's Taxonomy:
- AI Hint ไม่บอกคำตอบตรงๆ แต่ถามคำถามชี้นำ (ระดับ 1)
- ค่อยๆ เพิ่ม Scaffold จนถึงการวิเคราะห์โค้ดโดยตรง (ระดับ 4)
- เป้าหมายคือให้นักเรียนคิดออกเองมากที่สุด ลด Dependency

### 5.4 Formative Assessment แบบ Real-time

**Black & Wiliam (1998)** พิสูจน์ว่า Formative Assessment (การประเมินระหว่างเรียน) ที่ให้ Feedback ทันทีมีผลต่อผลสัมฤทธิ์สูงกว่า Summative Assessment (การสอบปลาย) อย่างมีนัยสำคัญ APCC รองรับด้วย:
- Auto-grader ที่ให้ Feedback ทุก Test Case ทันทีที่ Submit
- Analytics Coach ที่วิเคราะห์ Pattern ความผิดพลาดและแนะนำโดยอัตโนมัติ
- Predictive Risk Alert แจ้งเตือนก่อนนักเรียนจะล้มเหลว

### 5.5 Constructivism และ Active Learning

**Papert (1991) — Constructionism**: การเรียนรู้ที่ดีที่สุดเกิดจากการ "สร้าง" สิ่งที่แชร์ได้กับผู้อื่น ระบบ APCC ส่งเสริมด้วย:
- นักเรียนเขียนโค้ดจริง เห็นผลลัพธ์จริงผ่าน Code Runner
- Interactive Tools ใน Learning Hub ให้ทดลองแก้ไขและเห็นผลทันที
- Bug Hunt เกมที่นักเรียนต้องค้นหาและแก้ไขข้อผิดพลาดด้วยตนเอง

---

## 6. กระบวนการสร้างและพัฒนา

### 6.1 วิธีการพัฒนา (Iterative Design)

ผู้สอนใช้แนวทาง **Agile / Iterative Design** โดยพัฒนาเป็นรอบ (Sprint) สั้นๆ ทดสอบกับผู้ใช้จริง แล้วปรับปรุงต่อเนื่อง:

```
วิเคราะห์ปัญหา → ออกแบบ Prototype → พัฒนา Feature →
ทดสอบกับนักเรียน/ครู → รับ Feedback → ปรับปรุง → (วนซ้ำ)
```

### 6.2 เทคโนโลยีที่ใช้

| Layer | เทคโนโลยี | เหตุผลที่เลือก |
|---|---|---|
| Frontend | React 17 (CDN) + Babel | ไม่ต้องการ build step, deploy ง่าย, Babel transpile JSX ในเบราว์เซอร์ |
| Routing | Hash Router (#/path) | Single Page App, รองรับ GitHub Pages โดยไม่ต้อง server config |
| Database | Firebase Firestore | Real-time sync, offline support, Security Rules, ฟรีสำหรับ project ขนาดนี้ |
| Auth | Firebase Authentication | Email/Password, Integration กับ Firestore, ปลอดภัย |
| Hosting | GitHub Pages | ฟรี, CI/CD อัตโนมัติจาก git push, เสถียร |
| AI | Google Gemini API (gemini-2.0-flash) | ภาษาไทยดี, Fast response, ฟรี tier เพียงพอ |
| Code Runner | Piston API → Judge0 (Parallel) | Execute C code จริงใน Sandbox, 8s timeout/test |
| UI | Tailwind CSS + Bootstrap 5.3 | Utility-first + ธีม K-Minimal |
| Editor | CodeMirror 5 | Syntax highlight C, หลาย Theme, เบา |
| Charts | Chart.js | กราฟ Analytics, CDN |

### 6.3 ลำดับการพัฒนา (Version History)

| เวอร์ชัน | Feature หลักที่เพิ่ม | ช่วงเวลา |
|---|---|---|
| v4.6 | LMS พื้นฐาน: วิชา, โจทย์, ส่งงาน, Grader, AI Hint | ก.พ. 2568 |
| v5.0 | Gamification (XP/Rank/Streak/Leaderboard/Achievement) | มี.ค. 2568 |
| v5.0 | AI Coaching 5 บทบาท (5Es Framework) | มี.ค. 2568 |
| v5.0 | Mini-games (Quiz Blitz, Code Autopsy, Bug Hunt) | มี.ค. 2568 |
| v5.1 | Achievement System (13 badges), AchievementsPage | เม.ย. 2568 |
| v5.2 | Predictive Risk Alert Coach, StudentActivityView | เม.ย. 2568 |
| v5.3 | ActivityBuilder, RealtimeDashboard, FreeEditor | เม.ย. 2568 |
| v5.3 | StudentAnalytics แท็บที่ 7 (กลุ่มผู้เรียน), Bulk AI Analysis | เม.ย. 2568 |
| v5.4 | Socratic Hint Level 4, Leaderboard per-course isolation | พ.ค. 2568 |
| v5.5 | **Learning Hub v1.1** (25 built-in topics, 5 interactive tools) | มิ.ย. 2568 |
| v5.5 | **Content CMS v1.1** (per-course, course picker, unit tabs) | มิ.ย. 2568 |
| v5.5 | Gradebook v5.2 (E1-style, unit groups, 3-way filter) | มิ.ย. 2568 |
| v5.5 | Grader: parallel execution, 8s timeout, Wandbox ออก | มิ.ย. 2568 |

### 6.4 สถาปัตยกรรมระบบโดยรวม

```
[นักเรียน / ครู / Admin]
         │
    [Browser] ← React 17 + Tailwind + CodeMirror
         │
    ┌────┴────────────────────────┐
    │         Firebase            │
    │  ┌─────────────────────┐   │
    │  │ Authentication      │   │
    │  │ Firestore Database  │   │
    │  │ (24 Collections)    │   │
    │  └─────────────────────┘   │
    └─────────────────────────────┘
         │
    ┌────┴──────────────────────────────┐
    │      External APIs               │
    │  Google Gemini (AI Coach)        │
    │  Piston API / Judge0 (C runner)  │
    └──────────────────────────────────┘
```

### 6.5 การแก้ปัญหาทางเทคนิคที่สำคัญ

- **Global Variable Conflict:** React components ทั้งหมดถูก transpile เป็น `var` (global scope) จึงใช้ prefix ป้องกัน collision เช่น `_LH_` (LearningHub), `_CM_` (ContentManager), `_TS_` (TeamSync)
- **Script Load Order:** Interactive Tools ใน Learning Hub อ้างอิง component จาก LearningTools.js จึงต้องโหลดก่อน LearningHub.js เสมอ
- **Firestore Composite Index:** หลีกเลี่ยงด้วยการ sort client-side แทน `.orderBy()` หลายฟิลด์
- **Code Execution Safety:** C code ถูก execute ใน Piston Sandbox แบบ Parallel (ทุก Test Case พร้อมกัน) พร้อม 8s timeout ต่อ test เพื่อป้องกัน infinite loop

---

## 7. การนำนวัตกรรมไปใช้

### 7.1 กลุ่มเป้าหมาย

- **นักเรียน:** ม.4/6 โรงเรียนเตรียมอุดมศึกษาพัฒนาการ จำนวน 32 คน
- **ภาคเรียน:** ภาคเรียนที่ 1 ปีการศึกษา 2568
- **วิชา:** ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น (ภาษา C)

### 7.2 บทบาทผู้ใช้ระบบ

| Role | จำนวน | หน้าที่หลัก |
|---|---|---|
| **student** | 32 คน | เรียน, ทำโจทย์, เล่นเกม, อ่าน Learning Hub, ดู Leaderboard |
| **teacher** | ผู้สอน | สร้างวิชา/โจทย์, จัดการเนื้อหา, วิเคราะห์ผล, จัดการ Gamification |
| **admin** | ผู้สอน + ผู้ดูแล | จัดการผู้ใช้, ตั้งค่า Gemini API Key |

### 7.3 ขั้นตอนการใช้งาน (Workflow)

**สำหรับนักเรียน (รายวัน):**
```
Login → รับ Streak Bonus XP
  → อ่านเนื้อหาใหม่ใน Learning Hub (หัวข้อที่เกี่ยวกับแผนวันนี้)
  → เล่น Mini-Game ฝึกทบทวน (Quiz Blitz / Code Autopsy / Bug Hunt)
  → ทำโจทย์ Assignment ในวิชา → ขอ Hint จาก AI ถ้าติด
  → ดู Leaderboard เปรียบเทียบกับเพื่อน
```

**สำหรับครู (รายสัปดาห์):**
```
ดู Analytics Dashboard → ระบุนักเรียนที่ต้องช่วยเหลือ
  → เพิ่ม/อัพเดทเนื้อหาใน Content CMS (ตามแผนการสอนถัดไป)
  → สร้างโจทย์ใหม่ + Test Cases → Publish
  → ระหว่างชั้นเรียน: เปิด Realtime Dashboard ดูสถานะนักเรียน
  → หลังเรียน: ดูรายงาน AI วิเคราะห์ข้อผิดพลาดที่พบบ่อย
```

### 7.4 การเชื่อมโยงระบบกับแผนการสอน

**5 หน่วยการเรียนรู้ ว31281 ที่ระบบรองรับ:**

| หน่วย | ชื่อหน่วย | แผนที่ | เนื้อหาหลักใน Learning Hub | Interactive Tool |
|---|---|---|---|---|
| 1 | โครงสร้างโปรแกรม C + I/O | 1–9 | ตัวแปร, Data Types, printf/scanf, ตัวดำเนินการ | 📊 Data Type Visualizer, 📐 Flowchart→C |
| 2 | การตัดสินใจ | 10–13 | if/else, switch, nested conditions | 🌳 Decision Tree Visualizer |
| 3 | การวนซ้ำ (Loop) | 14–23 | for, while, do-while, nested loop, Pattern | 🎨 Pattern Sandbox |
| 4 | อาร์เรย์และฟังก์ชัน | 24–33 | Array 1D/2D, Function, Parameter, Scope | 🗂️ Memory Map |
| 5 | Pointer และ File I/O | 34–40 | Pointer, String, fopen/fclose, fprintf/fscanf | — |

### 7.5 ระบบ AI Coaching ตามกรอบ 5Es

| บทบาท AI | ขั้น 5E | Trigger | หน้าที่ |
|---|---|---|---|
| **Mindset Coach** | Engage | ล้มเหลว 3 ครั้งติด | ให้กำลังใจ สร้างแรงจูงใจ |
| **Socratic Coach** | Explore | กดขอ Hint | ให้ Hint 4 ระดับแบบ Socratic |
| **Analytics Coach** | Explain | กดดู Weekly Insight | สรุป XP Trend + คำแนะนำ |
| **Diagnostic Coach** | Evaluate | กดวิเคราะห์จุดอ่อน | วิเคราะห์ Pattern ล่าสุด 30 submission |
| **Challenge Coach** | Elaborate | คะแนน ≥ 90% ต่อเนื่อง | แนะนำโจทย์ยากขึ้น |
| **Predictive Risk Alert** | Evaluate | อัตโนมัติ (คะแนนลด) | แจ้งเตือนก่อนนักเรียนล้มเหลว |

### 7.6 Learning Hub — ศูนย์การเรียนรู้ดิจิทัล

Learning Hub (`#/student/tools?course=COURSEID`) เป็นฟีเจอร์ที่พัฒนาเพิ่มเติมเพื่อแก้ปัญหาการขาดสื่อดิจิทัลที่เชื่อมกับหลักสูตร:

**เนื้อหา Built-in 25 หัวข้อ** (เฉพาะวิชาภาษา C):

| หน่วย | หัวข้อ | รูปแบบเนื้อหา |
|---|---|---|
| หน่วย 1 | โครงสร้างโปรแกรม C, ตัวแปรและชนิดข้อมูล, รับ/แสดงผล, ตัวดำเนินการ, นิพจน์ทางคณิตศาสตร์ (5 หัวข้อ) | คำอธิบาย + โค้ด Step-through + Tips |
| หน่วย 2 | if/else, if ซ้อน, switch-case, เงื่อนไขผสม (4 หัวข้อ) | คำอธิบาย + โค้ด Step-through + คำเตือน |
| หน่วย 3 | for loop, while loop, do-while, nested loop, break/continue, Pattern (6 หัวข้อ) | คำอธิบาย + โค้ด + Interactive Pattern |
| หน่วย 4 | Array 1D, Array 2D, Function, Parameter/Return, Scope (5 หัวข้อ) | คำอธิบาย + โค้ด + Memory Map |
| หน่วย 5 | Pointer, String Function, File I/O พื้นฐาน, fprintf/fscanf, การแก้บัคพื้นฐาน (5 หัวข้อ) | คำอธิบาย + โค้ด Step-through |

**Interactive Tools ฝังใน Topic:**

| เครื่องมือ | หน่วย | หน้าที่ |
|---|---|---|
| 📊 Data Type Visualizer | 1 | แสดงขนาด, ช่วงค่า, และตัวอย่างค่าของทุก Data Type |
| 📐 Flowchart → C Code | 1 | วาด Flowchart แล้วแปลงเป็นโครงสร้างโค้ด C อัตโนมัติ |
| 🌳 Decision Tree | 2 | สร้างต้นไม้การตัดสินใจ if/else แบบ Visual |
| 🎨 Pattern Sandbox | 3 | ปรับตัวแปร loop เพื่อดูผลลัพธ์ Pattern ที่เปลี่ยนแปลง |
| 🗂️ Memory Map | 4 | เห็นภาพ Array และ Pointer ใน Memory แบบ Interactive |

**Content CMS (Teacher Side):**

ครูจัดการเนื้อหาผ่าน `#/teacher/content` โดย:
- **Course Picker:** เลือกวิชาที่ต้องการจัดการ (รองรับทุกภาษา)
- **Per-Course View:** วิชา C แสดงแท็บหน่วย 1-5, วิชาอื่นแสดง Flat List
- **Topic Form:** เพิ่ม/แก้ไขหัวข้อ พร้อมแนบ Resource (วิดีโอ/PDF/ลิงก์)
- **Publish Toggle:** เผยแพร่หรือซ่อนได้ทันที
- เนื้อหาที่ครูเพิ่มจะปรากฏใน Learning Hub ของนักเรียนแบบ Real-time

---

## 8. ผลจากการใช้นวัตกรรม

### 8.1 ผลด้านพฤติกรรมการเรียน

*(ข้อมูลจากระบบ — กรอกผลจริงหลังสิ้นสุดภาคเรียน)*

| ตัวชี้วัด | ผลที่ได้ |
|---|---|
| อัตราการส่งงาน (Submission Rate) | \_\_\_% |
| คะแนนเฉลี่ยทุก Assignment | \_\_\_ / 100 คะแนน |
| จำนวนนักเรียนที่ผ่านทุก Assignment | \_\_\_ / 32 คน |
| XP เฉลี่ยต่อคน | \_\_\_ XP |
| Streak เฉลี่ยสูงสุด | \_\_\_ วัน |
| จำนวน Mini-Game Session รวม | \_\_\_ ครั้ง |
| จำนวน AI Coach Interaction รวม | \_\_\_ ครั้ง |
| จำนวนครั้งที่นักเรียนใช้ Learning Hub | \_\_\_ ครั้ง |

### 8.2 ผลด้านผลสัมฤทธิ์ทางการเรียน

*(กรอกผลการวัดผลจริง E1 / คะแนนสอบ)*

| หน่วย | คะแนนเฉลี่ยก่อนใช้ระบบ | คะแนนเฉลี่ยหลังใช้ระบบ | ผลต่าง |
|---|---|---|---|
| หน่วย 1 — โครงสร้างโปรแกรม C | | | |
| หน่วย 2 — การตัดสินใจ | | | |
| หน่วย 3 — การวนซ้ำ | | | |
| หน่วย 4 — อาร์เรย์และฟังก์ชัน | | | |
| หน่วย 5 — Pointer และ File I/O | | | |

### 8.3 ผลด้านแรงจูงใจและความพึงพอใจ

*(กรอกผลแบบสอบถามความพึงพอใจ / SDT Scale)*

| ด้าน | ผลที่ได้ |
|---|---|
| ความพึงพอใจต่อระบบโดยรวม (5 ระดับ) | \_\_\_ / 5 |
| ความสนุกในการเรียน | \_\_\_ / 5 |
| การรับรู้ความก้าวหน้าของตนเอง | \_\_\_ / 5 |
| ความต้องการใช้ระบบต่อเนื่อง | \_\_\_ / 5 |

### 8.4 ผลด้านการสอน (ครูผู้สอน)

*(กรอกผลการสังเกตและสะท้อนการสอน)*

- ประหยัดเวลาตรวจงานเฉลี่ย \_\_\_ ชั่วโมง/สัปดาห์
- ครูสามารถระบุนักเรียนที่ต้องช่วยเหลือได้ล่วงหน้า \_\_\_ วันก่อนสอบ
- จำนวนครั้งที่ครูใช้ AI Coach Report เพื่อปรับการสอน \_\_\_ ครั้ง

---

## 9. ประโยชน์ของนวัตกรรม

### 9.1 ประโยชน์ต่อนักเรียน

- **เรียนรู้ตามจังหวะตนเอง (Self-Paced):** นักเรียนสามารถทบทวนเนื้อหาผ่าน Learning Hub และทำโจทย์ซ้ำได้ไม่จำกัด
- **Feedback ทันที:** ทราบผลการทดสอบและคะแนนทันทีที่ Submit ไม่ต้องรอครูตรวจ
- **AI Coach ตลอด 24 ชั่วโมง:** ขอ Hint ได้ทุกเวลา ไม่จำเป็นต้องรอชั่วโมงเรียน
- **สื่อ Interactive ครอบคลุมหลักสูตร:** เห็นภาพการทำงานของโค้ดจริงผ่าน Data Type Visualizer, Memory Map ฯลฯ ไม่ใช่แค่ข้อความ
- **Gamification สร้างแรงจูงใจ:** XP, Badge, Leaderboard ทำให้การฝึกซ้ำกลายเป็นเรื่องสนุก
- **ข้อมูลความก้าวหน้า:** Gradebook แบบ E1-style ให้นักเรียนเห็นคะแนนแยกตามหน่วย

### 9.2 ประโยชน์ต่อครูผู้สอน

- **Analytics Real-time:** เห็นพัฒนาการรายคนและภาพรวมชั้นเรียนโดยไม่ต้องรวบรวมข้อมูลเอง
- **AI รายงานชั้นเรียน:** Gemini วิเคราะห์ข้อผิดพลาดที่พบบ่อยและแนะนำการปรับการสอน
- **Content CMS ที่ใช้งานง่าย:** ครูเพิ่มเนื้อหาดิจิทัลประจำวิชาได้โดยไม่ต้องมีทักษะ Coding
- **ลดภาระการตรวจงาน:** Auto-grader ตรวจทุก Test Case อัตโนมัติ ครูเน้นการให้คำปรึกษาแทน
- **Realtime Dashboard:** ระหว่างชั้นเรียนเห็นสถานะนักเรียนทุกคนแบบ Real-time
- **เครื่องมือ FreeEditor:** สาธิตโค้ดหน้าชั้นเรียนพร้อม Drawing Annotation ได้

### 9.3 ประโยชน์ต่อสถานศึกษา

- ระบบ LMS ที่สร้างด้วย Open-source + ฟรี Platform (Firebase Free Tier + GitHub Pages) ต้นทุนต่ำมาก
- รองรับหลายวิชาและหลายภาษาโปรแกรม (C, Python, Java, C++ ฯลฯ) ขยายได้ง่าย
- ข้อมูลเชิง Analytics ช่วยสนับสนุนการตัดสินใจเชิงนโยบายของสถานศึกษา
- เป็น Best Practice ที่ครูคนอื่นในสถานศึกษาสามารถนำไปปรับใช้ได้

### 9.4 ประโยชน์ต่อวงการศึกษา

- เป็นตัวอย่างการนำ AI มาช่วยสอนวิชาเชิงทักษะอย่างมีประสิทธิภาพ
- แนวทาง Socratic AI Coaching ที่ไม่ให้คำตอบตรงๆ สามารถนำไปประยุกต์กับวิชาอื่น
- ต้นทุนต่ำทำให้โรงเรียนขนาดเล็กหรือพื้นที่ห่างไกลสามารถนำไปใช้ได้

---

## 10. การยอมรับและการเป็นแบบอย่างที่ดี

*(กรอกข้อมูลจริงหลังดำเนินการ)*

### 10.1 การยอมรับจากนักเรียน

- ผลแบบสอบถามความพึงพอใจ: \_\_\_
- ข้อเสนอแนะเชิงบวกที่ได้รับ: \_\_\_
- จำนวนนักเรียนที่ใช้งานต่อเนื่อง (Retention Rate): \_\_\_

### 10.2 การยอมรับจากเพื่อนครู

- จำนวนครูที่เข้าร่วมชม/ทดลองใช้ระบบ: \_\_\_ คน
- วิชา/หน่วยงานที่สนใจนำไปปรับใช้: \_\_\_
- การนำเสนอในวงประชุมวิชาการ/PLC: \_\_\_

### 10.3 การยอมรับจากองค์กรภายนอก

- การนำเสนอในงานประชุม/วิชาการ: \_\_\_
- รางวัลหรือการได้รับการยอมรับ: \_\_\_

### 10.4 การเป็นแบบอย่างที่ดี

- ครูในสถานศึกษานำไปปรับใช้: \_\_\_ คน/วิชา
- โรงเรียนอื่นที่สนใจ: \_\_\_
- การเผยแพร่ผ่านสื่อ/ช่องทางต่างๆ: \_\_\_

---

## 11. การพัฒนาต่อยอด

### 11.1 แผนระยะสั้น (ภาคเรียนที่ 2 ปีการศึกษา 2568)

- **เพิ่มภาษาโปรแกรม:** ขยาย Learning Hub Built-in content สำหรับ Python เพื่อรองรับ ว30284
- **AI Question Generator:** ให้ Gemini สร้างโจทย์ใหม่อัตโนมัติตามระดับความยากที่ครูกำหนด
- **Self-Assessment Tool:** ให้นักเรียนประเมินตนเองและแสดงใน Gradebook
- **Notification System:** แจ้งเตือน Email/LINE เมื่อใกล้วันส่งงานหรือมี Streak ขาด

### 11.2 แผนระยะกลาง (ปีการศึกษา 2569)

- **Mobile Application:** พัฒนา Progressive Web App (PWA) ให้ใช้งานบน smartphone ได้สะดวกขึ้น
- **Peer Code Review:** ระบบให้นักเรียนรีวิวโค้ดกันเองแบบ Structured โดย AI เป็น Moderator
- **Adaptive Learning Path:** AI แนะนำลำดับการเรียนที่ปรับเองตาม Performance รายคน
- **Co-teacher Collaboration:** เครื่องมือให้ครูหลายคนร่วมจัดการวิชาเดียวกัน

### 11.3 แผนระยะยาว (2570 เป็นต้นไป)

- **Multi-school Platform:** ขยายให้โรงเรียนอื่นใช้งานร่วมกันผ่าน School Code
- **Research Data Partnership:** แชร์ข้อมูล (anonymized) กับมหาวิทยาลัยเพื่อวิจัยการศึกษา
- **AI Curriculum Advisor:** ระบบ AI ที่แนะนำปรับแผนการสอนตามข้อมูลผลสัมฤทธิ์ชั้นเรียน
- **Open Source Release:** เผยแพร่ Source Code บน GitHub เพื่อให้ครูคนอื่นนำไปพัฒนาต่อ

---

# ส่วนที่ 2 — ข้อมูลทางเทคนิค (ภาคผนวก)

---

## ก. สถาปัตยกรรมและเทคโนโลยี

### ก.1 การโหลดสคริปต์ (ลำดับสำคัญ)

```
1. firebase.js          → ตั้งค่า Firebase (db, auth)
2. gemini.js            → Gemini API wrapper
3. grader.js            → Auto-grader: Piston → Judge0 (parallel, 8s timeout)
4. gamification.js      → XP/Rank/Streak/Leaderboard engine
5. achievementEngine.js → Achievement definitions (13 รายการ) + checker
6. aiCoach.js           → AI Coach 6 roles
7. miniGameGenerator.js → Mini-game content (Gemini + fallback)
8. context.js           → React AuthContext + handleDailyStreak
9. components/          → Navbar, XPBar, CodeEditor ฯลฯ
10. LearningTools.js    → 5 Interactive Tool components (globals)
11. LearningHub.js      → ศูนย์การเรียนรู้ (อ้างอิง Tool globals จากข้อ 10)
12. pages/              → Student, Teacher, Admin pages
13. ContentManager.js   → Content CMS
14. app.js              → Hash Router (โหลดสุดท้าย)
```

> **สำคัญ:** LearningTools.js ต้องโหลดก่อน LearningHub.js เสมอ เพราะ LearningHub อ้างอิง component (_DataTypeVisualizer ฯลฯ) ที่เป็น global variable

### ก.2 Route ทั้งหมด

```
#/login, #/register          → ไม่ต้อง login
#/student/*                  → guard: role === 'student'
#/teacher/*                  → guard: role === 'teacher' หรือ 'admin'
#/admin/*                    → guard: role === 'admin'
```

---

## ข. โครงสร้างฐานข้อมูล Firestore

### ข.1 Collections (24 Collections)

#### กลุ่ม: ผู้ใช้และ Auth

**`users/{uid}`**
```
displayName    : string   — ชื่อแสดง
email          : string   — อีเมล
role           : string   — 'student' | 'teacher' | 'admin'
studentCode    : string   — รหัสนักเรียน
number         : number   — เลขที่ในห้อง
approvedByAdmin: boolean  — ครูอนุมัติแล้วหรือยัง
createdAt      : timestamp
```

**`playerStats/{uid}`**
```
xp             : number   — XP สะสมทั้งหมด
rank           : number   — ระดับ 1-10
rankName       : string   — ชื่อ Rank
codeCoin       : number   — สกุลเงินหลัก
crystal        : number   — สกุลเงินพิเศษ
streakDays     : number   — Streak ต่อเนื่องปัจจุบัน
longestStreak  : number   — Streak สูงสุดตลอดกาล
lastLoginDate  : string   — 'YYYY-MM-DD'
dailyXP        : number   — XP วันนี้
weeklyXP       : number   — XP สัปดาห์นี้
updatedAt      : timestamp
```

#### กลุ่ม: วิชาและเนื้อหา

**`courses/{courseId}`**
```
title          : string   — ชื่อวิชา
description    : string   — คำอธิบาย
language       : string   — 'c' | 'python' | 'java' | 'cpp'
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
dueDate        : timestamp
isPublished    : boolean
totalPoints    : number
unitNumber     : number   — หน่วยการเรียนรู้
starterCode    : string   — โค้ดตั้งต้น
```

**`testCases/{testCaseId}`**
```
assignmentId   : string
input          : string   — Input ที่ส่งให้โปรแกรม
expectedOutput : string   — Output ที่คาดหวัง
hidden         : boolean  — ซ่อนจากนักเรียน
order          : number
points         : number
```

**`learningTopics/{docId}`** ← Learning Hub CMS
```
courseId       : string   — วิชาที่สังกัด (per-course scope)
unitId         : number   — หน่วย 1-5 (null ถ้าไม่แบ่งหน่วย)
parentTopicId  : string   — id ของ built-in topic (optional)
title          : string   — ชื่อหัวข้อ
icon           : string   — emoji icon
content        : string   — เนื้อหา
resources      : array    — [{type:'video'|'pdf'|'image'|'link', url, label}]
isPublished    : boolean
order          : number
createdAt      : timestamp
updatedAt      : timestamp
createdBy      : string   — uid ครูผู้สร้าง
```

#### กลุ่ม: การลงทะเบียนและการส่งงาน

**`enrollments/{docId}`**
```
studentId      : string
courseId       : string
enrolledAt     : timestamp
status         : string   — 'active' | 'dropped'
```

**`submissions/{submissionId}`**
```
studentId, courseId, assignmentId : string
code           : string
score          : number   — 0-100
passed         : boolean
status         : string   — 'accepted' | 'wrong_answer' | 'error'
testResults    : array    — ผลแต่ละ Test Case
submittedAt    : timestamp
```

**`selfPracticeSubmissions/{docId}`**
```
studentId, courseId : string
code, score, submittedAt (เหมือน submissions)
metadata       : object   — ข้อมูลเพิ่มเติม
```

#### กลุ่ม: Gamification

**`xpLedger/{docId}`** — Audit Trail ไม่เคยแก้ไข
```
uid, xpAwarded, coinAwarded, crystalAwarded : number/string
source         : string   — 'submission_accepted'|'first_solve'|'streak_bonus'|'minigame'|'achievement'
relatedId      : string
createdAt      : timestamp
```

**`leaderboardSnapshots/{docId}`**
```
docId format   : '{courseId}_alltime' | '{courseId}_weekly' | '{courseId}_daily'
entries        : array    — [{uid, displayName, xp, rank, rankName, rankIcon, ...}]
updatedAt      : timestamp
```

**`achievements/{achievementId}`**, **`studentAchievements/{uid_achievementId}`**, **`seasons/{seasonId}`**  
*(ดูรายละเอียดใน ฉ. ระบบ Achievement)*

#### กลุ่ม: AI Coach

**`coachInteractions/{docId}`**
```
uid, coachRole, triggerEvent, relatedId : string
prompt, response : string
createdAt      : timestamp
```

#### กลุ่ม: Mini-Games

**`miniGameContent/{gameType_unitId_date}`**, **`miniGameSessions/{docId}`**

#### กลุ่ม: ระบบ

**`config/gemini`** — Gemini API Key (Admin ตั้งค่าผ่าน UI)

---

## ค. ระบบ Gamification

### ค.1 XP Award Table

| เหตุการณ์ | XP | CodeCoin | Crystal |
|---|---|---|---|
| ส่งงาน Score 100% | +50 | +10 | 0 |
| ส่งงาน Score 80-99% | +30 | +5 | 0 |
| ส่งงาน Score 50-79% | +15 | +2 | 0 |
| ส่งงาน Score < 50% | +5 | 0 | 0 |
| First Solve Bonus (score ≥ 60%) | +20 | +5 | +1 |
| Login Streak ทุกวัน | +10 | +2 | 0 |
| Streak Bonus 3+ วัน | +20 | +5 | 0 |
| Streak Bonus 7+ วัน | +50 | +10 | +2 |
| Quiz Blitz (ครั้งแรกของวัน) | +25 | +10 | 0 |
| Quiz Blitz (ซ้ำ) | +10 | +3 | 0 |
| Quiz Blitz (Perfect) | +15 bonus | — | — |
| Code Autopsy (ครั้งแรก) | +20 | +8 | 0 |
| Code Autopsy (ซ้ำ) | +8 | +2 | 0 |
| Bug Hunt (ครั้งแรก) | +30 | +12 | 0 |
| Bug Hunt (ซ้ำ) | +5 | +1 | 0 |
| Achievement | ตาม Achievement | ตาม Achievement | ตาม Achievement |

> ถ้ามี Season Active: XP ทุกประเภทถูกคูณด้วย `xpMultiplier` ของ Season นั้น

### ค.2 Rank System (10 ระดับ)

| ระดับ | ชื่อ | XP ขั้นต่ำ | ไอคอน |
|---|---|---|---|
| 1 | ไข่โปรแกรม | 0 | 🥚 |
| 2 | โค้ดเดอร์มือใหม่ | 200 | 🐣 |
| 3 | นักแก้บัค | 500 | 🐛 |
| 4 | ผู้เชี่ยวชาญลูป | 1,000 | 🔄 |
| 5 | จอมเวทย์ Logic | 2,000 | 🧙 |
| 6 | อินทรีอัลกอริทึม | 3,500 | 🦅 |
| 7 | สถาปนิกโค้ด | 5,500 | 🏗️ |
| 8 | ดาวสยาม | 8,500 | ⭐ |
| 9 | ราชันโปรแกรม | 13,000 | 👑 |
| 10 | เทพเจ้า AI | 20,000 | 🤖 |

---

## ง. ระบบ AI Coaching

### ง.1 AI Coach 6 บทบาท

#### 1. Mindset Coach (Engage)
- **Trigger:** ล้มเหลว 3 ครั้งติดในโจทย์เดิม
- **Output:** ข้อความกำลังใจภาษาไทย 4 ประโยค + emoji อบอุ่น

#### 2. Socratic Coach (Explore)
- **Trigger:** กดขอ Hint
- **Hint 4 ระดับ:**
  - Level 1: คำถามชวนคิด (Socratic) — ห้ามบอกคำตอบ
  - Level 2: อธิบาย Concept + ตัวอย่างคล้ายกันแต่ไม่ใช่โจทย์นั้น
  - Level 3: Pseudocode / โครงสร้าง Algorithm
  - Level 4: วิเคราะห์โค้ดนักเรียน — บอก error pattern ที่พบ
- **จำกัด:** max 180 คำ/Hint

#### 3. Diagnostic Coach (Evaluate)
- **Trigger:** กดปุ่ม "วิเคราะห์จุดอ่อน"
- **Output:** รายงานจุดแข็ง/อ่อน จาก Submission ล่าสุด 30 รายการ

#### 4. Analytics Coach (Explain)
- **Trigger:** กดดู Weekly Insight
- **Output:** สรุป XP Trend, Game Activity + คำแนะนำ

#### 5. Challenge Coach (Elaborate)
- **Trigger:** คะแนน ≥ 90% ต่อเนื่อง
- **Output:** แนะนำโจทย์ยากขึ้น + Concept ที่ควรเรียนต่อ

#### 6. Predictive Risk Alert
- **Trigger:** อัตโนมัติ — ตรวจ Pattern จาก Submission ล่าสุด 15 ครั้ง
- **เงื่อนไข:** คะแนน 3 ครั้งล่าสุด < 60% / คะแนนลดลงต่อเนื่อง / ล้มเหลวซ้ำ ≥ 3 ครั้ง
- **Output:** แจ้งเตือนเชิงรุก + แนะนำ action ที่ทำได้ทันที

---

## จ. Mini-Games

### จ.1 เกมทั้ง 3 ประเภท

| เกม | รูปแบบ | จำนวน | URL | XP (ครั้งแรก) |
|---|---|---|---|---|
| **Quiz Blitz** | MCQ 5 ข้อ จับเวลา 30 วินาที/ข้อ | 5 ข้อ | `#/student/games/quiz?unit=N` | +25 XP +10🪙 |
| **Code Autopsy** | อ่านโค้ด C → ทายผลลัพธ์ (4 ตัวเลือก) | 5 ข้อ | `#/student/games/autopsy?unit=N` | +20 XP +8🪙 |
| **Bug Hunt** | โค้ด C มีบัค → พิมพ์การแก้ไข (AI ตรวจ Fuzzy) | 5 ข้อ | `#/student/games/bughunt?unit=N` | +30 XP +12🪙 |

เนื้อหาเกมสร้างโดย Gemini ครั้งเดียวต่อวัน และ Cache ใน `miniGameContent/{gameType}_{unitId}_{date}`

---

## ฉ. ระบบ Achievement

### ฉ.1 Achievement ทั้งหมด (13 รายการ)

| ID | ชื่อ | เงื่อนไข | Rarity | XP |
|---|---|---|---|---|
| first_blood | First Blood 🩸 | ผ่านโจทย์ครั้งแรก | common | 50 |
| perfect_score | Perfectionist 💯 | ผ่าน 100% ทุก Test Case | uncommon | 100 |
| no_hint_hero | No Hint Hero 🧠 | ผ่านโจทย์ Hard ไม่ขอ Hint | rare | 200 |
| speed_demon | Speed Demon ⚡ | ผ่านโจทย์ Medium ใน < 5 นาที | uncommon | 150 |
| comeback_kid | Comeback Kid 🦋 | ล้มเหลว 5+ ครั้งแล้วผ่าน | uncommon | 120 |
| streak_3 | Hot Streak 🔥 | Login 3 วันติด | common | 60 |
| streak_7 | Weekly Warrior 🏆 | Login 7 วันติด | rare | 150 |
| all_assignments | Completionist 📚 | ทำโจทย์ครบทุกข้อในวิชา | epic | 500 |
| rank_up_5 | Mid-tier 🦅 | ขึ้น Rank 5 | uncommon | 100 |
| rank_up_10 | AI God 🤖 | ขึ้น Rank 10 | legendary | 1,000 |
| quiz_master | Quiz Master 🧩 | เล่น Quiz Blitz ครบ 10 ครั้ง | common | 80 |
| bug_exterminator | Bug Exterminator 🐛 | เล่น Bug Hunt ครบ 10 ครั้ง | uncommon | 100 |
| autopsy_expert | Code Surgeon 🔬 | เล่น Code Autopsy ครบ 10 ครั้ง | uncommon | 100 |

---

## ช. Learning Hub และ Content CMS

### ช.1 Learning Hub (นักเรียน)

URL: `#/student/tools?course=COURSEID`  
เข้าถึงผ่านปุ่ม "🧪 Learning Tools" บน Course Card ของนักเรียน

**วิชาภาษา C:** แสดง 25 Built-in Topics ใน 5 หน่วย + Teacher Topics จาก Firestore  
**วิชาภาษาอื่น:** แสดงเฉพาะ Teacher Topics (Built-in C Topics ซ่อน)

**โครงสร้างข้อมูลแต่ละ Topic (Built-in):**
- `paras[]` — ย่อหน้าเนื้อหา
- `code` — โค้ดตัวอย่าง
- `steps[]` — คำอธิบายรายบรรทัดสำหรับ Step-through
- `tips[]` — เคล็ดลับ
- `warn` — คำเตือนที่ควรระวัง

**Interactive Tool Map:**

```javascript
const _LH_TOOL_MAP = {
    'u1t2': { comp: _DataTypeVisualizer, label: '📊 Data Type Visualizer' },
    'u1t6': { comp: _FlowchartBuilder,   label: '📐 Flowchart → C Code'   },
    'u2t1': { comp: _DecisionTreeViz,    label: '🌳 Decision Tree'         },
    'u3t3': { comp: _PatternSandbox,     label: '🎨 Pattern Sandbox'       },
    'u4t2': { comp: _MemoryMap,          label: '🗂️ Memory Map'            },
};
```

### ช.2 Content CMS (ครู)

URL: `#/teacher/content`  
เข้าถึงผ่านปุ่ม "📖 เนื้อหา" บน Course Card หรือเมนู "จัดการเนื้อหา" ใน Navbar

**Course Picker Mode** (ไม่มี `?course=` param):
- โหลดวิชาของครูจาก `courses.teacherId == uid`
- แสดง Card Grid → คลิก → `#/teacher/content?course=COURSEID`

**Per-Course Mode** (`?course=COURSEID`):
- Query: `learningTopics.where('courseId','==',courseId).where('isPublished','==',true)`
- Sort: client-side ตาม `unitId` → `order` (หลีกเลี่ยง Composite Index)
- วิชา C: แสดงแท็บหน่วย 1-5
- วิชาอื่น: Flat List

**การบันทึก Topic:**
```javascript
{
    courseId,        // วิชา
    unitId,          // หน่วย (C เท่านั้น)
    title,           // ชื่อหัวข้อ
    icon,            // emoji
    content,         // เนื้อหา
    resources: [],   // [{type, url, label}]
    isPublished,     // สถานะ
    order,           // ลำดับ
    createdBy: uid,
    createdAt, updatedAt
}
```

---

## ซ. ความปลอดภัยและสิทธิ์การเข้าถึง

| Collection | นักเรียน | ครู | Admin |
|---|---|---|---|
| users | อ่าน/แก้ไข (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| playerStats | อ่านทั้งหมด, แก้ไขตนเอง | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| courses | อ่าน | สร้าง/แก้ไขวิชาตน | อ่าน/แก้ไขทั้งหมด |
| assignments | อ่าน | สร้าง/แก้ไข | อ่าน/แก้ไขทั้งหมด |
| submissions | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| learningTopics | อ่าน (isPublished=true) | สร้าง/แก้ไข/ลบ | อ่าน/แก้ไขทั้งหมด |
| xpLedger | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| coachInteractions | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| miniGameSessions | สร้าง/อ่าน (ตนเอง) | อ่านทั้งหมด | อ่าน/แก้ไขทั้งหมด |
| achievements | อ่าน | อ่าน | อ่าน/แก้ไข |
| seasons | อ่าน | อ่าน/สร้าง/แก้ไข | อ่าน/แก้ไขทั้งหมด |
| config | อ่าน | อ่าน | อ่าน/แก้ไข |

---

## ฌ. โครงสร้างไฟล์ระบบ

```
AI-Powered-C/
├── index.html                           ← Entry point, load ทุก script
├── firestore.rules                      ← Security rules
├── firestore.indexes.json               ← Composite indexes
├── firebase.json                        ← Hosting config
│
├── js/
│   ├── firebase.js                      ← Firebase init
│   ├── gemini.js                        ← Gemini API wrapper
│   ├── grader.js                        ← Auto-grader: Piston → Judge0
│   ├── gamification.js                  ← XP/Rank/Streak engine
│   ├── achievementEngine.js             ← Achievement (13) + checker
│   ├── aiCoach.js                       ← AI Coach 6 roles
│   ├── miniGameGenerator.js             ← Mini-game content generator
│   ├── context.js                       ← React AuthContext
│   ├── app.js                           ← Hash Router
│   │
│   ├── components/
│   │   ├── Navbar.js                    ← Navigation (per-role)
│   │   ├── XPBar.js                     ← XP progress bar
│   │   ├── CodeEditor.js                ← CodeMirror wrapper
│   │   ├── RadarChart.js                ← Analytics radar chart
│   │   ├── Spinner.js                   ← Loading spinner
│   │   └── ProtectedRoute.js            ← Role-based guard
│   │
│   └── pages/
│       ├── LoginPage.js
│       ├── RegisterPage.js
│       ├── GuestLandingPage.js          ← Demo (#/demo)
│       │
│       ├── shared/
│       │   └── FreeEditor.js            ← Code editor อิสระ (ครู + นักเรียน)
│       │
│       ├── student/
│       │   ├── StudentDashboard.js      ← XP, Rank, วิชา, Shortcuts
│       │   ├── CourseViewer.js v5.0     ← รายการวิชา + โจทย์
│       │   ├── CodingWorkspace.js       ← Editor + Grader + AI Coach
│       │   ├── Gradebook.js v5.2        ← E1-style, unit groups, 3-way filter
│       │   ├── SubmissionHistory.js     ← ประวัติการส่ง
│       │   ├── SelfPractice.js          ← ฝึกเอง (ได้ XP)
│       │   ├── StudentProfile.js        ← โปรไฟล์ + Stats + Achievement
│       │   ├── Leaderboard.js           ← อันดับ (Daily/Weekly/Alltime)
│       │   ├── AchievementsPage.js      ← Badge Gallery (13)
│       │   ├── MiniGameHub.js           ← เลือกเกม + สถานะวันนี้
│       │   ├── LearningTools.js         ← 5 Interactive Tool components
│       │   ├── LearningHub.js v1.1      ← ศูนย์การเรียนรู้ per-course
│       │   ├── StudentActivityView.js   ← Activity timeline
│       │   └── games/
│       │       ├── QuizBlitz.js         ← MCQ 5 ข้อ 30 วินาที
│       │       ├── CodeAutopsy.js       ← ทาย Output โค้ด C
│       │       └── BugHunt.js           ← หาและแก้ Bug
│       │
│       ├── teacher/
│       │   ├── TeacherDashboard.js      ← Dashboard ครู
│       │   ├── CourseBuilder.js v5.1    ← จัดการวิชา + ปุ่ม "📖 เนื้อหา"
│       │   ├── AssignmentManager.js     ← จัดการโจทย์
│       │   ├── TestCaseEditor.js        ← ออก Test Cases
│       │   ├── StudentAnalytics.js      ← วิเคราะห์นักเรียน (7 แท็บ)
│       │   ├── GamificationAdmin.js     ← Season, Award XP, Export
│       │   ├── StudentManagement.js     ← จัดการนักเรียน + อนุมัติ
│       │   ├── ActivityBuilder.js       ← สร้าง Activity รวดเร็ว
│       │   ├── RealtimeDashboard.js     ← Real-time submission monitor
│       │   └── ContentManager.js v1.1  ← CMS เนื้อหา per-course
│       │
│       └── admin/
│           ├── AdminDashboard.js        ← Dashboard Admin
│           ├── UserManager.js           ← จัดการผู้ใช้ + อนุมัติ
│           └── SystemSettings.js        ← ตั้งค่า Gemini API Key
```

---

## ญ. เวอร์ชัน History

| เวอร์ชัน | Feature | ช่วงเวลา |
|---|---|---|
| v4.6 | LMS พื้นฐาน: วิชา, โจทย์, ส่งงาน, Grader, AI Hint | ก.พ. 2568 |
| v5.0 | + Gamification (XP/Rank/Streak/Leaderboard/Achievement) | มี.ค. 2568 |
| v5.0 | + AI Coaching 5 บทบาท (5Es Framework) | มี.ค. 2568 |
| v5.0 | + Mini-games (Quiz Blitz, Code Autopsy, Bug Hunt) | มี.ค. 2568 |
| v5.1 | + Achievement System (13 badges), AchievementsPage | เม.ย. 2568 |
| v5.2 | + Predictive Risk Alert Coach, StudentActivityView | เม.ย. 2568 |
| v5.3 | + ActivityBuilder, RealtimeDashboard, FreeEditor | เม.ย. 2568 |
| v5.4 | + Socratic Hint Level 4, Bug fixes per-course isolation | พ.ค. 2568 |
| v5.5 | + LearningHub v1.1 (25 built-in topics, 5 interactive tools) | มิ.ย. 2568 |
| v5.5 | + ContentManager v1.1 (per-course CMS, course picker) | มิ.ย. 2568 |
| v5.5 | + Gradebook v5.2 (E1-style, unit groups, 3-way filter) | มิ.ย. 2568 |
| v5.5 | + Grader parallel execution, 8s timeout, Piston-only | มิ.ย. 2568 |

---

## ภาคผนวกสรุป

| รายการ | จำนวน |
|---|---|
| ไฟล์ JS | ~52 ไฟล์ |
| Firestore Collections | 24 |
| Student Routes | 16 |
| Teacher Routes | 11 |
| Admin Routes | 3 |
| Rank Tiers | 10 (0–20,000 XP) |
| AI Coach Roles | 6 |
| Hint Levels (Socratic) | 4 |
| Mini-game ประเภท | 3 |
| Achievement | 13 |
| Built-in Learning Topics | 25 (5 หน่วย ว31281) |
| Interactive Learning Tools | 5 |

### ที่อยู่ Repository และ ระบบ

- **GitHub Repository:** https://github.com/koki-assawin/AI-Powered-C
- **Production URL:** https://koki-assawin.github.io/AI-Powered-C/
- **Firebase Project:** ai-powered-coding-596ed
- **ติดต่อผู้พัฒนา:** อัศวิน จุลมูล — aitus@triamudomsouth.ac.th

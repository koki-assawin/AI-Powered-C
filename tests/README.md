# การทดสอบ APCC Studio v6.0

ทุกชุดทดสอบรันบน **Firebase Emulator** และล้างข้อมูลใน emulator ก่อนเริ่มทุกครั้ง
มีเพียง 2 สคริปต์ที่อ่าน production และเป็นการอ่านอย่างเดียว ระบุไว้ในตาราง

## เตรียมเครื่อง (ครั้งเดียว)

1. ติดตั้ง JDK 21 (สำหรับ Firestore emulator) และ Node 18 ขึ้นไป
2. ติดตั้งแพ็กเกจสำหรับทดสอบไว้นอกโปรเจกต์ (ไม่เพิ่ม dependency ให้ระบบ):
   ```
   mkdir C:\apcc-test-tools && cd C:\apcc-test-tools
   npm init -y && npm i @babel/standalone@7.25.9 puppeteer-core@23.11.1
   ```
3. เปิด emulator อีกหน้าต่าง: `firebase emulators:start --only auth,firestore,hosting`

## ตัวแปรสภาพแวดล้อม (PowerShell)

```powershell
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
$env:BABEL_STANDALONE="C:\apcc-test-tools\node_modules\@babel\standalone"
$env:PUPPETEER_CORE="C:\apcc-test-tools\node_modules\puppeteer-core"
```

## ชุดทดสอบ

| ไฟล์ | ทดสอบอะไร | ข้อกำหนด |
|---|---|---|
| `tools/studio/test_phase1.js` (`--compare-prod` เทียบกับ ว23207 จริง แบบอ่านอย่างเดียว) | Studio Core, แปลงชุดโจทย์, ตรวจเฉลย, นำเข้า/เติมข้อมูล/ส่งออก | ข้อ 1, 4.1–4.2 |
| `tools/studio/test_phase3.js` | ด่านทักษะ, Explain-Back, กฎ Firestore | |
| `tools/studio/test_phase4.js` | Project Studio, รูบริก, CSV, stlite, กฎ Firestore | |
| `tools/studio/test_phase5.js` | Analytics, CSV ปกปิดตัวตน, กฎแกลเลอรี | |
| `tests/rules_regression.test.js` | กฎเดิม 74 กรณี ภายใต้กฎของ main เทียบกับ branch | **ข้อ 7.4** |
| `tests/regression_grader.test.js` | `gradeSubmission` ของ main เทียบกับ branch กับงานภาษา C ที่นักเรียนส่งจริง (**อ่าน production อย่างเดียว**) | **ข้อ 7.2** |
| `tools/studio/check_production.js` | จำนวนเอกสารบน production เทียบ baseline และตรวจว่ารายวิชาวิจัยไม่ถูกแตะ (**อ่าน production อย่างเดียว**, ห้ามตั้ง `FIRESTORE_EMULATOR_HOST`) | **ข้อ 7.3** |
| `tools/studio/e2e/e2e_phase1.js` … `e2e_phase5.js` | ใช้งานจริงผ่าน headless Chrome ทีละ Phase | |
| `tools/studio/e2e/e2e_phase6.js` | หน้าของรายวิชาเดิม, จอมือถือ 360 px, เวลาโหลด main เทียบ branch | **ข้อ 7.1, 7.5** |

รันทีละไฟล์ เช่น `node tests/rules_regression.test.js` (ต้องเปิด emulator ไว้ก่อน)
ภาพหน้าจอจาก E2E (ข้อมูลจำลอง) จะถูกเขียนไปที่ `docs/studio/screenshots/`

# 🚀 Quick Start: Firebase Setup (สำหรับ PathoVetAssist Project)

## คู่มือฉบับย่อสำหรับผู้ใช้ project PathoVetAssist ร่วมกัน

### ⚡ ขั้นตอนสรุป (5 นาที)

#### 1️⃣ เปิด Firebase Console
- ไปที่ [Firebase Console](https://console.firebase.google.com/)
- ล็อกอินด้วย **koki.assawin@gmail.com**
- เลือก project **"PathoVetAssist"**

#### 2️⃣ ตรวจสอบ Realtime Database
- เมนูซ้าย → **Build** → **Realtime Database**
- ถ้ามีอยู่แล้ว → ข้ามไปขั้นที่ 3
- ถ้ายังไม่มี → คลิก **Create Database** (เลือก asia-southeast1)

#### 3️⃣ อัปเดต Security Rules
ไปที่แท็บ **Rules** แล้วเพิ่มส่วนนี้ (ไม่ต้องลบของเดิม):

```json
{
  "rules": {
    "PathoVetAssist": {
      // ... ของเดิม อย่าลบ!
    },
    "ai-powered-code": {
      "config": {
        ".read": true,
        ".write": false
      }
    }
  }
}
```

คลิก **Publish**

#### 4️⃣ เพิ่ม API Key ลง Database
ไปที่แท็บ **Data**:

1. คลิกไอคอน **"+"** ข้าง Database root
2. สร้างโครงสร้างนี้:
   ```
   ai-powered-code
   └── config
       └── gemini_api_key: "YOUR_GOOGLE_GEMINI_API_KEY"
   ```

**ผลลัพธ์ควรเป็น:**
```
PathoVetAssist
├── PathoVetAssist/         ← app เดิม
│   └── ...
└── ai-powered-code/        ← app ใหม่ (เพิ่งสร้าง)
    └── config/
        └── gemini_api_key: "AIzaSyB..."
```

#### 5️⃣ คัดลอก Database URL
- จากแท็บ **Data** จะเห็น URL ด้านบน
- คัดลอก URL ทั้งหมด เช่น:
  ```
  https://pathovetassist-12345-default-rtdb.asia-southeast1.firebasedatabase.app/
  ```

#### 6️⃣ แก้ไข index.html
เปิดไฟล์ `index.html` แก้ไขบรรทัดที่ 499:

```javascript
// เปลี่ยนจาก:
const FIREBASE_DATABASE_URL = "https://YOUR-PROJECT-ID.firebaseio.com";

// เป็น (URL ของคุณ):
const FIREBASE_DATABASE_URL = "https://pathovetassist-12345-default-rtdb.asia-southeast1.firebasedatabase.app";
```

**หมายเหตุ:** โค้ดที่บรรทัด 508 มี path `/ai-powered-code/config/gemini_api_key.json` อยู่แล้ว ไม่ต้องแก้!

#### 7️⃣ Deploy ไป GitHub
```bash
git add index.html
git commit -m "Configure Firebase Database URL for PathoVetAssist project"
git push origin main
```

รอ 1-2 นาที ให้ GitHub Pages deploy

#### 8️⃣ ทดสอบ
1. เปิด https://koki-assawin.github.io/AI-Powered-C/
2. กด **F12** → เปิดแท็บ **Console**
3. ควรเห็นข้อความ: `✅ โหลด API Key จาก Firebase สำเร็จ`
4. ทดสอบวิเคราะห์โค้ด หรือสร้างโจทย์

---

## ✅ Checklist

- [ ] เปิด Firebase Console และเลือก PathoVetAssist project
- [ ] ตรวจสอบว่ามี Realtime Database
- [ ] เพิ่ม Security Rules สำหรับ `ai-powered-code`
- [ ] สร้าง path `/ai-powered-code/config/gemini_api_key` พร้อม API Key
- [ ] คัดลอก Database URL
- [ ] แก้ไข `FIREBASE_DATABASE_URL` ใน index.html บรรทัดที่ 499
- [ ] Git push ขึ้น GitHub
- [ ] ทดสอบการทำงาน

---

## 🔍 ตรวจสอบความถูกต้อง

### ทดสอบ URL ในเบราว์เซอร์:
วาง URL นี้ในเบราว์เซอร์ (แทนที่ด้วย URL จริงของคุณ):
```
https://pathovetassist-xxxxx.firebaseio.com/ai-powered-code/config/gemini_api_key.json
```

**ควรได้ผลลัพธ์:**
```
"AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**ถ้าได้ `null` หรือ `404`:**
- Path ผิด - ต้องเป็น `/ai-powered-code/config/gemini_api_key`
- ยังไม่เพิ่ม API Key ลง Database
- Security Rules ไม่อนุญาตให้อ่าน

---

## ❓ คำถามที่พบบ่อย

### Q: ใช้ project เดียวกับ PathoVetAssist ปลอดภัยไหม?
**A:** ปลอดภัย! เพราะแยก path กัน (`/PathoVetAssist/` และ `/ai-powered-code/`) ไม่กระทบกัน

### Q: API Key ของ PathoVetAssist จะปลอดภัยไหม?
**A:** ปลอดภัย! Security Rules ของ PathoVetAssist ยังคงเดิม เราเพิ่มเฉพาะ path ใหม่ให้ AI-Powered-Code เท่านั้น

### Q: ถ้าเปลี่ยน API Key ต้องทำอย่างไร?
**A:** เข้า Firebase Console → Realtime Database → Data → แก้ไขค่า `gemini_api_key` ได้ทันที ไม่ต้อง redeploy!

### Q: PathoVetAssist project อยู่ใน asia-southeast1 ไหม?
**A:** ตรวจสอบได้จาก Database URL ถ้ามี `.asia-southeast1.` แสดงว่าใช่

### Q: ต้องใช้ API Key ตัวเดียวกับ PathoVetAssist ไหม?
**A:** ไม่จำเป็น! สามารถสร้าง Gemini API Key ใหม่แยกเลยได้ที่ [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## 📞 ติดต่อ

หากมีปัญหา:
- อ่านคู่มือฉบับเต็ม: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- Email: koki.assawin@gmail.com
- GitHub Issues: https://github.com/koki-assawin/AI-Powered-C/issues

---

© 2025 AI-Powered Code Practice System v2.2 (Firebase Edition)

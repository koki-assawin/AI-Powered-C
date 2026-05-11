#!/usr/bin/env node
/**
 * admin-create-admin-user.js
 * ─────────────────────────────────────────────────────────────
 * สร้างบัญชี admin ให้ koki.assawin@gmail.com
 * ใช้ Firebase Admin SDK — ต้องมี serviceAccountKey.json
 *
 * วิธีใช้:
 *   node admin-create-admin-user.js
 *
 * หาก serviceAccountKey.json ยังไม่มี:
 *   Firebase Console → Project Settings → Service Accounts
 *   → Generate new private key → บันทึกเป็น serviceAccountKey.json
 *   → วางในโฟลเดอร์ AI-Powered-C/
 */

const admin = require('./functions/node_modules/firebase-admin');
const path  = require('path');
const fs    = require('fs');

// ── Config ──────────────────────────────────────────────────
const TARGET_EMAIL    = 'koki.assawin@gmail.com';
const TARGET_PASSWORD = 'Koki@Admin2567';   // เปลี่ยนได้ก่อน run
const DISPLAY_NAME    = 'Assawin Admin';
// ────────────────────────────────────────────────────────────

const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
    console.error('\n❌ ไม่พบ serviceAccountKey.json');
    console.error('   1. Firebase Console → Project Settings → Service Accounts');
    console.error('   2. Generate new private key → ดาวน์โหลด');
    console.error('   3. วางไฟล์ชื่อ serviceAccountKey.json ในโฟลเดอร์ AI-Powered-C/');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(keyPath)),
});

const db   = admin.firestore();
const auth = admin.auth();

(async () => {
    console.log(`\n🔍 ตรวจสอบบัญชี ${TARGET_EMAIL} ...`);

    let uid;

    // ── 1. สร้างหรือดึง Firebase Auth user ──────────────────
    try {
        const existing = await auth.getUserByEmail(TARGET_EMAIL);
        uid = existing.uid;
        console.log(`✅ พบบัญชีอยู่แล้ว (uid: ${uid})`);

        // อัปเดต displayName ให้ตรง
        await auth.updateUser(uid, { displayName: DISPLAY_NAME });
        console.log(`   อัปเดต displayName → "${DISPLAY_NAME}"`);
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            console.log('   ไม่พบบัญชี — กำลังสร้างใหม่...');
            const created = await auth.createUser({
                email:       TARGET_EMAIL,
                password:    TARGET_PASSWORD,
                displayName: DISPLAY_NAME,
                emailVerified: true,
            });
            uid = created.uid;
            console.log(`✅ สร้างบัญชีสำเร็จ (uid: ${uid})`);
            console.log(`   รหัสผ่านเริ่มต้น: ${TARGET_PASSWORD}`);
        } else {
            throw e;
        }
    }

    // ── 2. สร้าง/อัปเดต Firestore users document ────────────
    const userRef = db.collection('users').doc(uid);
    const snap    = await userRef.get();

    if (snap.exists) {
        await userRef.update({ role: 'admin', approvedByAdmin: true });
        console.log(`✅ อัปเดต role → admin (document มีอยู่แล้ว)`);
    } else {
        await userRef.set({
            email:           TARGET_EMAIL,
            displayName:     DISPLAY_NAME,
            role:            'admin',
            enrolledCourses: [],
            approvedByAdmin: true,
            createdAt:       admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ สร้าง Firestore document สำเร็จ`);
    }

    console.log('\n🎉 เสร็จสมบูรณ์!');
    console.log(`   อีเมล:      ${TARGET_EMAIL}`);
    console.log(`   Role:       admin`);
    console.log(`   เข้าสู่ระบบได้ที่: https://ai-powered-coding-596ed.web.app`);
    console.log(`   (หรือ sign in ด้วย Google account koki.assawin@gmail.com)\n`);
    process.exit(0);
})().catch(err => {
    console.error('\n❌ เกิดข้อผิดพลาด:', err.message);
    process.exit(1);
});

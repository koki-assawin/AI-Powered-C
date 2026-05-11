#!/usr/bin/env node
/**
 * admin-set-password.js
 * ─────────────────────────────────────────────────────
 * Local admin tool: กำหนดรหัสผ่านให้นักเรียนโดยใช้ Firebase Admin SDK
 *
 * วิธีใช้:
 *   node admin-set-password.js <email> <newPassword>
 *
 * ตัวอย่าง:
 *   node admin-set-password.js 12204@triamudomsouth.ac.th student1234
 *
 * ต้องวาง serviceAccountKey.json ในโฟลเดอร์เดียวกันก่อน
 * (ดาวน์โหลดจาก Firebase Console → Project Settings → Service Accounts)
 */

const admin = require('./functions/node_modules/firebase-admin');
const path  = require('path');
const fs    = require('fs');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
    console.error('\n❌ ไม่พบไฟล์ serviceAccountKey.json');
    console.error('   1. ไปที่ Firebase Console → Project Settings → Service Accounts');
    console.error('   2. กด "Generate new private key" แล้ว download');
    console.error('   3. วางไฟล์ชื่อ serviceAccountKey.json ในโฟลเดอร์ AI-Powered-C/');
    process.exit(1);
}

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
    console.error('\nวิธีใช้: node admin-set-password.js <email> <newPassword>');
    console.error('ตัวอย่าง: node admin-set-password.js 12204@triamudomsouth.ac.th student1234');
    process.exit(1);
}

if (newPassword.length < 6) {
    console.error('\n❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    process.exit(1);
}

const serviceAccount = require(keyPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

(async () => {
    try {
        console.log(`\n🔍 กำลังค้นหาบัญชี: ${email} ...`);
        const user = await admin.auth().getUserByEmail(email);
        console.log(`✅ พบผู้ใช้: ${user.displayName || user.email} (uid: ${user.uid})`);

        console.log(`🔐 กำลังเปลี่ยนรหัสผ่าน ...`);
        await admin.auth().updateUser(user.uid, { password: newPassword });
        console.log(`\n✅ เปลี่ยนรหัสผ่านสำเร็จ!`);
        console.log(`   อีเมล:       ${email}`);
        console.log(`   รหัสผ่านใหม่: ${newPassword}`);
        console.log(`\n   แจ้งนักเรียนให้เข้าสู่ระบบด้วยรหัสผ่านใหม่นี้ได้เลย\n`);
    } catch (err) {
        const msgs = {
            'auth/user-not-found': `❌ ไม่พบบัญชีอีเมล "${email}" ใน Firebase Auth`,
            'auth/invalid-email':  '❌ รูปแบบอีเมลไม่ถูกต้อง',
        };
        console.error('\n' + (msgs[err.code] || '❌ เกิดข้อผิดพลาด: ' + err.message));
        process.exit(1);
    } finally {
        process.exit(0);
    }
})();

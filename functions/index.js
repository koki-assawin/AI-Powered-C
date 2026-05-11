const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

// Admin-only callable: set a user's password directly
exports.adminSetPassword = onCall({ region: 'asia-southeast1' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'ต้องเข้าสู่ระบบก่อน');
    }

    // Verify caller is admin
    const callerSnap = await getFirestore().collection('users').doc(request.auth.uid).get();
    if (!callerSnap.exists || callerSnap.data().role !== 'admin') {
        throw new HttpsError('permission-denied', 'เฉพาะผู้ดูแลระบบเท่านั้น');
    }

    const { uid, password } = request.data;

    if (!uid || typeof uid !== 'string') {
        throw new HttpsError('invalid-argument', 'uid ไม่ถูกต้อง');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        throw new HttpsError('invalid-argument', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    }

    await getAuth().updateUser(uid, { password });

    // Log the action in Firestore for audit trail
    await getFirestore().collection('adminActions').add({
        action: 'set_password',
        targetUid: uid,
        performedBy: request.auth.uid,
        timestamp: new Date(),
    });

    return { success: true };
});

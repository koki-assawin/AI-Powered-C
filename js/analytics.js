// js/analytics.js — Usage Event Logger (v1.1)
// Non-blocking. ไม่กระทบ main flow ถ้า Firestore fail
// demo_run: ไม่ต้อง auth (Firestore rule อนุญาต uid='demo' + event='demo_run')

const logUsageEvent = (uid, event, meta = {}) => {
    try {
        const isDemo = !uid || uid === 'demo';
        // demo_run ใช้ ISO timestamp เพราะ serverTimestamp() ต้องการ auth token
        const tsField = isDemo
            ? { timestamp: new Date().toISOString() }
            : { timestamp: serverTimestamp() };

        db.collection('usageEvents').add({
            uid: uid || 'demo',
            event,  // 'code_run'|'sample_test'|'submission'|'ai_analyze'|'ai_hint'|'ai_chat'|'demo_run'
            date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD for easy grouping
            ...meta, // courseId, assignmentId, language, score, hintLevel, userType
            ...tsField,
        }).catch(() => {});
    } catch (_) {}
};

// js/analytics.js — Usage Event Logger (v1.0)
// Non-blocking. ไม่กระทบ main flow ถ้า Firestore fail

const logUsageEvent = (uid, event, meta = {}) => {
    try {
        db.collection('usageEvents').add({
            uid: uid || 'demo',
            event,  // 'code_run'|'sample_test'|'submission'|'ai_analyze'|'ai_hint'|'ai_chat'|'demo_run'
            date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD for easy grouping
            ...meta, // courseId, assignmentId, language, score, hintLevel, userType
            timestamp: serverTimestamp(),
        }).catch(() => {});
    } catch (_) {}
};

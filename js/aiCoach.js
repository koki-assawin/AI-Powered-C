// js/aiCoach.js — 5Es AI Coaching System (Phase 2)
// 5 roles: Mindset (Engage), Socratic (Explore), Analytics (Explain),
//          Challenge (Elaborate), Diagnostic (Evaluate)
// Every coach call writes a coachInteractions doc for research audit.

// ── Internal: write coachInteractions doc ────────────────────────────────────
async function _logCoachInteraction(uid, coachRole, triggerEvent, relatedId, prompt, response) {
    try {
        await db.collection('coachInteractions').add({
            uid,
            coachRole,
            triggerEvent,
            relatedId: relatedId || null,
            prompt: (prompt || '').slice(0, 500),
            response: (response || '').slice(0, 1000),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
        console.warn('[aiCoach] log error:', err);
    }
}

// ── 1. MINDSET COACH (Engage) ─────────────────────────────────────────────────
// Triggered: failCount ≥ 3 consecutive for same assignment
async function getMindsetCoach(uid, assignmentTitle, failCount) {
    const prompt = `คุณคือ AI Mindset Coach ผู้เชี่ยวชาญด้านแรงจูงใจการเขียนโปรแกรม
สำหรับนักเรียน ม.4 ที่พยายามทำโจทย์ "${assignmentTitle}" แต่ยังไม่ผ่านมา ${failCount} ครั้งแล้ว

เขียนข้อความให้กำลังใจเป็นภาษาไทยที่:
1. เป็นมิตร อบอุ่น ไม่ตัดสิน (1-2 ประโยค)
2. บอกว่า "ผิดพลาดคือส่วนหนึ่งของการเรียนรู้" (1 ประโยค)
3. แนะนำให้ลองวิธีใหม่ เช่น อ่านโจทย์ใหม่ หรือลองใช้ Hint (1 ประโยค)

ความยาวรวม: ไม่เกิน 4 ประโยค ใช้ emoji 1-2 ตัว`;

    try {
        const response = await callGeminiApi(prompt);
        await _logCoachInteraction(uid, 'mindset', `fail_${failCount}`, null,
            `assignment: ${assignmentTitle}, failCount: ${failCount}`, response);
        return response;
    } catch (err) {
        return `💪 อย่าท้อนะ! การพยายามทำซ้ำคือสิ่งที่ทำให้โปรแกรมเมอร์เก่งขึ้น ลองอ่านโจทย์ช้าๆ อีกครั้งหรือลองใช้ Hint ดูนะ`;
    }
}

// ── 2. SOCRATIC COACH (Explore) ───────────────────────────────────────────────
// 4-level progressive hints: Question → Concept → Scaffold → Error Pattern
async function getSocraticHint(uid, assignmentTitle, assignmentDescription, code, language, hintLevel) {
    const levels = {
        1: `ตั้งคำถามกระตุ้นความคิด (Socratic) อย่างน้อย 2 คำถาม ห้ามบอกคำตอบหรือให้โค้ดเด็ดขาด เช่น "ลองคิดดูว่า loop ควรหยุดเมื่อไหร่?" "อะไรจะเกิดขึ้นถ้า input เป็น 0?"`,
        2: `อธิบาย concept หลักที่จำเป็นสำหรับโจทย์นี้ พร้อมตัวอย่างที่คล้ายแต่ไม่ใช่โจทย์นี้เลย ห้ามบอกคำตอบโจทย์`,
        3: `ให้ pseudocode หรือโครงสร้าง algorithm ทีละขั้นตอน เช่น "1.รับค่า → 2.วนซ้ำ → 3.เก็บผลลัพธ์" แต่ยังไม่ใช่โค้ดสมบูรณ์`,
        4: `วิเคราะห์โค้ดของนักเรียนที่ส่งมา บอก error pattern ที่พบ (เช่น off-by-one, wrong condition, missing initialization) อธิบายว่าตรรกะผิดพลาดตรงไหนและควรคิดอย่างไร ไม่ต้องแก้โค้ดให้ทั้งหมด`,
    };

    const prompt = `คุณคือ Socratic Coach ผู้เชี่ยวชาญ Zone of Proximal Development สอนโปรแกรมภาษา ${language}

โจทย์: "${assignmentTitle}"
รายละเอียด: ${(assignmentDescription || '').slice(0, 300)}
โค้ดนักเรียน:
\`\`\`${language}
${(code || '').slice(0, 800)}
\`\`\`

ระดับ Hint ${hintLevel}/4: ${levels[hintLevel] || levels[1]}

ตอบเป็นภาษาไทย ไม่เกิน 180 คำ ${hintLevel < 3 ? 'ห้ามให้โค้ดสมบูรณ์' : ''}`;

    try {
        const response = await callGeminiApi(prompt);
        await _logCoachInteraction(uid, 'socratic', `hint_level_${hintLevel}`, assignmentTitle,
            `title: ${assignmentTitle}, level: ${hintLevel}`, response);
        return response;
    } catch (err) {
        const fallbacks = {
            1: `💡 ลองคิดดูว่า: โปรแกรมควรหยุดทำงานเมื่อไหร่? ตัวแปรใดที่เปลี่ยนแปลงในแต่ละรอบ?`,
            2: `💡 แนวคิดที่เกี่ยวข้อง: แบ่งปัญหาออกเป็นขั้นตอนย่อยๆ แล้วแก้ทีละส่วน`,
            3: `💡 โครงสร้าง: 1.รับ input → 2.ประมวลผล (loop/condition) → 3.แสดงผล`,
            4: `💡 ตรวจสอบ: เงื่อนไข loop, การ initialize ตัวแปร, และ format ผลลัพธ์`,
        };
        return fallbacks[hintLevel] || fallbacks[1];
    }
}

// ── PREDICTIVE RISK ALERT ─────────────────────────────────────────────────────
// Analyzes submission patterns to proactively warn students at risk
async function getPredictiveRiskAlert(uid) {
    try {
        const snap = await db.collection('submissions')
            .where('studentId', '==', uid)
            .orderBy('submittedAt', 'desc')
            .limit(15)
            .get();
        const subs = snap.docs.map(d => d.data());
        if (subs.length < 3) return null;

        const last3Scores = subs.slice(0, 3).map(s => s.score || 0);
        const last5Scores = subs.slice(0, 5).map(s => s.score || 0);
        const avg5 = last5Scores.reduce((a, b) => a + b, 0) / last5Scores.length;
        const allFailed3 = last3Scores.every(s => s < 60);
        const decliningTrend = last3Scores[0] < last3Scores[last3Scores.length - 1] - 15;

        // Count repeated failures on same assignment
        const assignCounts = {};
        subs.forEach(s => {
            if ((s.score || 0) < 60 && s.assignmentId) {
                assignCounts[s.assignmentId] = (assignCounts[s.assignmentId] || 0) + 1;
            }
        });
        const repeatedFail = Object.values(assignCounts).some(c => c >= 3);

        let riskLevel = 'low';
        if (allFailed3 || repeatedFail) riskLevel = 'high';
        else if (avg5 < 50 || decliningTrend) riskLevel = 'medium';

        if (riskLevel === 'low') return null;

        const prompt = `คุณคือ Predictive AI Coach วิเคราะห์ความเสี่ยงการเรียนของนักเรียน

ข้อมูล:
- คะแนน 3 ครั้งล่าสุด: ${last3Scores.join(', ')}%
- คะแนนเฉลี่ย 5 ครั้ง: ${Math.round(avg5)}%
- ระดับความเสี่ยง: ${riskLevel === 'high' ? 'สูง' : 'ปานกลาง'}
- ล้มเหลวซ้ำข้อเดิม: ${repeatedFail ? 'ใช่' : 'ไม่'}

สร้าง alert สั้นๆ ภาษาไทย (2-3 ประโยค) ที่:
1. บอกสถานการณ์ตรงๆ ไม่ตัดสิน
2. แนะนำ 1-2 action ที่ทำได้ทันที (เช่น ลองใช้ Hint ระดับ 2, เล่น Quiz Blitz, ขอให้ครูอธิบาย)
ใช้ emoji 1 ตัว`;

        try {
            const response = await callGeminiApi(prompt);
            await _logCoachInteraction(uid, 'predictive', `risk_${riskLevel}`, null,
                `avg5: ${Math.round(avg5)}, allFailed3: ${allFailed3}`, response);
            return { riskLevel, message: response, avg5: Math.round(avg5), last3Scores };
        } catch (_) {
            const msg = riskLevel === 'high'
                ? `⚠️ คะแนน 3 ครั้งล่าสุดต่ำกว่า 60% ลองใช้ Hint ระดับ 2-3 หรือขอให้ครูอธิบายก่อนส่งงานใหม่`
                : `📉 คะแนนมีแนวโน้มลดลง ลองเล่น Quiz Blitz ทบทวน concept ก่อนทำโจทย์ต่อ`;
            return { riskLevel, message: msg, avg5: Math.round(avg5), last3Scores };
        }
    } catch (_) { return null; }
}

// ── 3. ANALYTICS COACH (Explain) ─────────────────────────────────────────────
// Generates weekly insight report from submission history
async function getAnalyticsCoach(uid, displayName) {
    try {
        // Fetch last 20 submissions
        const snap = await db.collection('submissions')
            .where('studentId', '==', uid)
            .orderBy('submittedAt', 'desc')
            .limit(20)
            .get();

        const subs = snap.docs.map(d => d.data());
        if (subs.length === 0) {
            return 'ยังไม่มีข้อมูลการส่งงาน ลองส่งงานก่อนแล้วค่อยขอรายงานนะ 😊';
        }

        const avgScore = Math.round(subs.reduce((s, d) => s + (d.score || 0), 0) / subs.length);
        const passed = subs.filter(d => d.score >= 60).length;
        const recentScores = subs.slice(0, 5).map(d => d.score || 0);
        const trend = recentScores[0] - recentScores[recentScores.length - 1];

        const prompt = `คุณคือ Analytics Coach วิเคราะห์พัฒนาการของ ${displayName}

ข้อมูลล่าสุด 20 ครั้ง:
- คะแนนเฉลี่ย: ${avgScore}%
- ผ่าน (≥60%): ${passed}/${subs.length}
- คะแนน 5 ครั้งล่าสุด: ${recentScores.join(', ')}%
- แนวโน้ม: ${trend > 10 ? 'พัฒนาขึ้น' : trend < -10 ? 'ลดลง' : 'คงที่'}

เขียนรายงานวิเคราะห์ภาษาไทยสั้นๆ (ไม่เกิน 5 ประโยค) ประกอบด้วย:
1. สิ่งที่ทำได้ดี (บวก)
2. จุดที่ควรพัฒนา
3. เป้าหมายสัปดาห์หน้า (1 ข้อที่ทำได้จริง)
ใช้ emoji เหมาะสม`;

        const response = await callGeminiApi(prompt);
        await _logCoachInteraction(uid, 'analytics', 'weekly_report', null,
            `avgScore: ${avgScore}, passed: ${passed}/${subs.length}`, response);
        return response;
    } catch (err) {
        console.warn('[aiCoach] analytics error:', err);
        return '❌ ไม่สามารถโหลดรายงานได้ในขณะนี้';
    }
}

// ── 4. DIAGNOSTIC COACH (Evaluate) ───────────────────────────────────────────
// Analyzes overall weak areas and generates Personal Learning Path
async function getDiagnosticCoach(uid, displayName) {
    try {
        // Fetch all submissions + grades
        const [subSnap, gradeSnap] = await Promise.all([
            db.collection('submissions').where('studentId', '==', uid).orderBy('submittedAt', 'desc').limit(30).get(),
            db.collection('grades').where('studentId', '==', uid).get(),
        ]);

        const subs = subSnap.docs.map(d => d.data());
        const grades = gradeSnap.docs.map(d => d.data());

        if (subs.length === 0) {
            return { summary: 'ยังไม่มีข้อมูลพอ ส่งงานอย่างน้อย 3 ข้อแล้วค่อยวิเคราะห์นะ 🎯', path: [] };
        }

        const avgScore = Math.round(subs.reduce((s, d) => s + (d.score || 0), 0) / subs.length);
        const failedAssignments = subs.filter(d => d.score < 60).length;
        const playerStats = await getPlayerStats(uid).catch(() => ({}));

        const prompt = `คุณคือ Diagnostic Coach วิเคราะห์ภาพรวมการเรียนของ ${displayName}

ข้อมูลรวม:
- ส่งงานทั้งหมด: ${subs.length} ครั้ง
- ผ่านเกณฑ์ 60%: ${subs.filter(d => d.score >= 60).length} ครั้ง
- คะแนนเฉลี่ยรวม: ${avgScore}%
- ส่งไม่ผ่าน: ${failedAssignments} ครั้ง
- XP สะสม: ${playerStats.xp || 0}
- Streak ปัจจุบัน: ${playerStats.streakDays || 0} วัน

วิเคราะห์และสร้าง Learning Path เป็น JSON:
{
  "summary": "สรุปภาพรวม 2-3 ประโยคภาษาไทย",
  "strengths": ["จุดแข็ง 1", "จุดแข็ง 2"],
  "weaknesses": ["จุดอ่อน 1", "จุดอ่อน 2"],
  "path": [
    {"label": "ฝึก Loop", "type": "practice", "priority": "high"},
    {"label": "ทบทวน Array", "type": "review", "priority": "medium"}
  ]
}`;

        const raw = await callGeminiApi(prompt);
        let parsed;
        try {
            parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim());
        } catch (_) {
            parsed = { summary: raw, path: [] };
        }

        await _logCoachInteraction(uid, 'diagnostic', 'full_analysis', null,
            `avgScore: ${avgScore}, subs: ${subs.length}`, parsed.summary || raw);
        return parsed;
    } catch (err) {
        console.warn('[aiCoach] diagnostic error:', err);
        return { summary: '❌ วิเคราะห์ไม่สำเร็จในขณะนี้', path: [] };
    }
}

// ── 5. CHALLENGE COACH (Elaborate) ───────────────────────────────────────────
// Triggered after score ≥ 90% — suggests harder extension problems
async function getChallengeCoach(uid, assignmentTitle, language, score) {
    const prompt = `คุณคือ Challenge Coach ที่ Push Zone of Proximal Development

นักเรียนเพิ่งผ่านโจทย์ "${assignmentTitle}" ด้วยคะแนน ${score}% ภาษา ${language}

สร้าง Challenge Extension สั้นๆ:
1. โจทย์เพิ่มเติม (1-2 ประโยค) ที่ยากกว่าเดิมเล็กน้อย
2. คำแนะนำ concept ที่ควรเรียนต่อ (1 ข้อ)

ภาษาไทย ไม่เกิน 100 คำ ใช้ emoji 1 ตัว`;

    try {
        const response = await callGeminiApi(prompt);
        await _logCoachInteraction(uid, 'challenge', `score_${score}`, assignmentTitle,
            `title: ${assignmentTitle}, score: ${score}`, response);
        return response;
    } catch (err) {
        return `🚀 เยี่ยมมาก! ลองเพิ่มความยากด้วยการรับ input จากผู้ใช้หลายๆ ค่า หรือลองใช้ array แทนตัวแปรเดี่ยว`;
    }
}

// ── Expose globals ────────────────────────────────────────────────────────────
window.getMindsetCoach       = getMindsetCoach;
window.getSocraticHint       = getSocraticHint;
window.getAnalyticsCoach     = getAnalyticsCoach;
window.getDiagnosticCoach    = getDiagnosticCoach;
window.getChallengeCoach     = getChallengeCoach;
window.getPredictiveRiskAlert = getPredictiveRiskAlert;

// js/miniGameGenerator.js — Phase 3: Mini-Game Content Engine
// Depends on: gamification.js (awardXP), gemini.js (callGeminiApi)

const GAME_XP = {
    quiz_blitz:   { first: 25, firstCoin: 10, repeat: 10, repeatCoin: 3, perfect: 15 },
    code_autopsy: { first: 20, firstCoin: 8,  repeat: 8,  repeatCoin: 2, perfect: 10 },
    bug_hunt:     { first: 30, firstCoin: 12, repeat: 5,  repeatCoin: 1, perfect: 20 },
};

// ── Fallback content (used when Gemini fails) ─────────────────────────────────

function _fallbackQuiz() {
    return [
        { question: 'ฟังก์ชันใดใช้พิมพ์ข้อความออกหน้าจอใน C?', options: ['A. print()', 'B. printf()', 'C. cout <<', 'D. echo()'], correct: 1, explanation: 'printf() เป็นฟังก์ชันมาตรฐานของ C ใช้กับ <stdio.h>' },
        { question: 'ผลลัพธ์ของ 7 % 3 ใน C คืออะไร?', options: ['A. 2', 'B. 1', 'C. 0', 'D. 3'], correct: 1, explanation: '% คือเศษจากการหาร 7 ÷ 3 = 2 เศษ 1' },
        { question: 'ชนิดข้อมูลใดใช้เก็บตัวเลขทศนิยมใน C?', options: ['A. int', 'B. char', 'C. float', 'D. short'], correct: 2, explanation: 'float เก็บตัวเลขทศนิยม ความแม่นยำ ~7 หลัก' },
        { question: 'Loop ชนิดใดรันคำสั่งอย่างน้อย 1 ครั้งเสมอ?', options: ['A. for', 'B. while', 'C. do-while', 'D. foreach'], correct: 2, explanation: 'do-while ตรวจเงื่อนไขหลังจากรัน ทำให้รันอย่างน้อย 1 ครั้ง' },
        { question: 'ตัวดำเนินการใดใช้เปรียบเทียบ "เท่ากัน" ใน C?', options: ['A. =', 'B. ===', 'C. ==', 'D. eq'], correct: 2, explanation: '== ใช้เปรียบเทียบ ส่วน = ใช้กำหนดค่า' },
    ];
}

function _fallbackAutopsy() {
    return [
        { code: '#include <stdio.h>\nint main(){\n    int x = 5;\n    printf("%d", x * 2);\n    return 0;\n}', question: 'ผลลัพธ์ของโปรแกรมนี้คืออะไร?', options: ['A. 5', 'B. 10', 'C. 25', 'D. Error'], correct: 1, explanation: 'x = 5, x * 2 = 10 ดังนั้นพิมพ์ 10' },
        { code: '#include <stdio.h>\nint main(){\n    int i;\n    for(i=1; i<=3; i++)\n        printf("%d ", i);\n    return 0;\n}', question: 'ผลลัพธ์ของโปรแกรมนี้คืออะไร?', options: ['A. 1 2 3 ', 'B. 0 1 2 3 ', 'C. 1 2 3 4 ', 'D. Error'], correct: 0, explanation: 'Loop วน i จาก 1 ถึง 3 พิมพ์ "1 2 3 "' },
        { code: '#include <stdio.h>\nint main(){\n    int a=10, b=3;\n    printf("%d", a/b);\n    return 0;\n}', question: 'ผลลัพธ์ของโปรแกรมนี้คืออะไร?', options: ['A. 3.33', 'B. 3', 'C. 4', 'D. 0'], correct: 1, explanation: 'การหารจำนวนเต็มใน C ตัดทศนิยมทิ้ง 10/3 = 3' },
        { code: '#include <stdio.h>\nint main(){\n    int x=5;\n    if(x > 3)\n        printf("A");\n    else\n        printf("B");\n    return 0;\n}', question: 'ผลลัพธ์ของโปรแกรมนี้คืออะไร?', options: ['A. A', 'B. B', 'C. AB', 'D. Error'], correct: 0, explanation: '5 > 3 เป็นจริง ดังนั้นพิมพ์ A' },
        { code: '#include <stdio.h>\nint main(){\n    int arr[]={10,20,30};\n    printf("%d", arr[1]);\n    return 0;\n}', question: 'ผลลัพธ์ของโปรแกรมนี้คืออะไร?', options: ['A. 10', 'B. 20', 'C. 30', 'D. Error'], correct: 1, explanation: 'arr[1] คือตัวที่ 2 ของ array (index เริ่มจาก 0) = 20' },
    ];
}

function _fallbackBugHunt() {
    return [
        {
            buggyCode: '#include <stdio.h>\nint main(){\n    int i;\n    for(i = 1; i < 10; i++)\n        printf("%d ", i);\n    return 0;\n}',
            description: 'โปรแกรมนี้ควรพิมพ์เลข 1 ถึง 10 แต่พิมพ์แค่ 1 ถึง 9',
            hint: 'ดูเงื่อนไขของ for loop ว่าควรใช้ < หรือ <=',
            correctFix: 'เปลี่ยน i < 10 เป็น i <= 10',
            keywords: ['<=', 'less than or equal', 'i <= 10'],
        },
        {
            buggyCode: '#include <stdio.h>\nint main(){\n    int x = 5\n    printf("%d", x);\n    return 0;\n}',
            description: 'โปรแกรมนี้ควร compile และพิมพ์ 5 แต่มี syntax error',
            hint: 'มีสัญลักษณ์สำคัญขาดหายไปหลัง int x = 5',
            correctFix: 'เพิ่ม semicolon: int x = 5;',
            keywords: [';', 'semicolon', 'int x = 5;'],
        },
        {
            buggyCode: '#include <stdio.h>\nint main(){\n    int a = 10, b = 0;\n    int c = a / b;\n    printf("%d", c);\n    return 0;\n}',
            description: 'โปรแกรมนี้มี runtime error และ crash',
            hint: 'ดูค่าของตัวหารว่าเป็นค่าอะไร',
            correctFix: 'เปลี่ยน b = 0 เป็นค่าอื่นที่ไม่ใช่ศูนย์ หรือตรวจสอบ b ก่อนหาร เช่น b = 2',
            keywords: ['division by zero', 'b = 2', 'b != 0', 'ตรวจสอบ'],
        },
    ];
}

// ── Gemini content generators ─────────────────────────────────────────────────

async function generateQuizBlitzContent(unitId) {
    const topic = unitId || 'พื้นฐานภาษา C';
    const prompt = `สร้างคำถาม Multiple Choice 5 ข้อเกี่ยวกับการเขียนโปรแกรมภาษา C หัวข้อ: ${topic}
ตอบด้วย JSON array เท่านั้น ไม่มีข้อความอื่น:
[
  {
    "question": "คำถามภาษาไทย",
    "options": ["A. ตัวเลือก 1", "B. ตัวเลือก 2", "C. ตัวเลือก 3", "D. ตัวเลือก 4"],
    "correct": 0,
    "explanation": "คำอธิบายสั้น ๆ"
  }
]
ระดับความยาก: ง่ายถึงปานกลาง เหมาะสำหรับนักเรียนมัธยมปลาย`;
    try {
        const raw = await callGeminiApi(prompt);
        const match = raw.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('no json array');
        const parsed = JSON.parse(match[0]);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty');
        return parsed.slice(0, 5);
    } catch (_) {
        return _fallbackQuiz();
    }
}

async function generateCodeAutopsyContent(unitId) {
    const topic = unitId || 'พื้นฐานภาษา C';
    const prompt = `สร้างโจทย์ทำนายผลลัพธ์ (Predict Output) ภาษา C จำนวน 5 ข้อ หัวข้อ: ${topic}
ตอบด้วย JSON array เท่านั้น:
[
  {
    "code": "โค้ด C สั้น ๆ 5-10 บรรทัด (ใช้ \\n แทน newline)",
    "question": "ผลลัพธ์ของโปรแกรมนี้คืออะไร?",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": 0,
    "explanation": "อธิบายทีละขั้นตอน"
  }
]
โค้ดต้องสั้น มีผลลัพธ์แน่นอน ไม่มี infinite loop`;
    try {
        const raw = await callGeminiApi(prompt);
        const match = raw.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('no json array');
        const parsed = JSON.parse(match[0]);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty');
        return parsed.slice(0, 5);
    } catch (_) {
        return _fallbackAutopsy();
    }
}

async function generateBugHuntContent(unitId) {
    const topic = unitId || 'พื้นฐานภาษา C';
    const prompt = `สร้างโจทย์หา Bug ในโปรแกรม C จำนวน 3 ข้อ หัวข้อ: ${topic}
ตอบด้วย JSON array เท่านั้น:
[
  {
    "buggyCode": "โค้ดที่มี bug (ใช้ \\n แทน newline)",
    "description": "บอกว่าโปรแกรมนี้ควรทำอะไร แต่มีปัญหาอะไร",
    "hint": "คำใบ้เบา ๆ",
    "correctFix": "วิธีแก้ที่ถูกต้อง",
    "keywords": ["คำสำคัญที่ควรมีในคำตอบของนักเรียน"]
  }
]
Bug ควรเป็น: off-by-one, missing semicolon, wrong operator, uninitialized variable, wrong format specifier`;
    try {
        const raw = await callGeminiApi(prompt);
        const match = raw.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('no json array');
        const parsed = JSON.parse(match[0]);
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('empty');
        return parsed.slice(0, 3);
    } catch (_) {
        return _fallbackBugHunt();
    }
}

// ── Cache-first content fetch ─────────────────────────────────────────────────

async function getOrGenerateDailyContent(gameType, unitId) {
    const today = new Date().toISOString().slice(0, 10);
    const safeUnit = (unitId || 'general').replace(/[^a-zA-Z0-9ก-ฮ_-]/g, '_').slice(0, 30);
    const docId = `${gameType}_${safeUnit}_${today}`;
    try {
        const docRef = db.collection('miniGameContent').doc(docId);
        const snap = await docRef.get();
        if (snap.exists && snap.data().isActive) {
            return { id: docId, ...snap.data() };
        }
        let questions;
        if (gameType === 'quiz_blitz') questions = await generateQuizBlitzContent(unitId);
        else if (gameType === 'code_autopsy') questions = await generateCodeAutopsyContent(unitId);
        else questions = await generateBugHuntContent(unitId);

        const data = {
            gameType, unitId: safeUnit, date: today,
            questions, isActive: true, generatedBy: 'gemini',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        return { id: docId, ...data };
    } catch (err) {
        console.warn('[miniGame] getOrGenerateDailyContent error:', err);
        let questions;
        if (gameType === 'quiz_blitz') questions = _fallbackQuiz();
        else if (gameType === 'code_autopsy') questions = _fallbackAutopsy();
        else questions = _fallbackBugHunt();
        return { id: 'fallback', gameType, questions, isActive: false };
    }
}

// ── Check first play today ────────────────────────────────────────────────────

async function checkIsFirstPlayToday(uid, gameType) {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const snap = await db.collection('miniGameSessions')
            .where('uid', '==', uid)
            .where('gameType', '==', gameType)
            .where('playedAt', '>=', todayStart)
            .limit(1)
            .get();
        return snap.empty;
    } catch (_) { return true; }
}

// ── Grade a bug hunt answer with Gemini ───────────────────────────────────────

async function gradeBugHuntAnswer(bugData, studentAnswer) {
    const answerLower = studentAnswer.toLowerCase();
    const keywordMatch = bugData.keywords && bugData.keywords.some(kw =>
        answerLower.includes(kw.toLowerCase())
    );
    if (keywordMatch) return { score: 100, feedback: '✅ ถูกต้อง! ' + bugData.correctFix };

    try {
        const prompt = `นักเรียนตอบ bug hunt ดังนี้:
โค้ดมี bug: "${bugData.description}"
คำตอบของนักเรียน: "${studentAnswer}"
วิธีแก้ที่ถูกต้อง: "${bugData.correctFix}"

ให้คะแนน 0-100 และ feedback สั้น ๆ ตอบด้วย JSON: {"score": 80, "feedback": "..."}`;
        const raw = await callGeminiApi(prompt);
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
            const res = JSON.parse(match[0]);
            return { score: Math.min(100, Math.max(0, res.score || 0)), feedback: res.feedback || '' };
        }
    } catch (_) {}
    return { score: 0, feedback: '❌ ไม่ถูกต้อง วิธีแก้ที่ถูก: ' + bugData.correctFix };
}

// ── Record session + award XP ─────────────────────────────────────────────────

async function recordGameSession(uid, { gameType, contentId, unitId, score, correctAnswers, totalQuestions, timeSpentSeconds, answers }) {
    try {
        const isFirstPlayToday = await checkIsFirstPlayToday(uid, gameType);
        const xpCfg = GAME_XP[gameType] || GAME_XP.quiz_blitz;
        const isPerfect = correctAnswers >= totalQuestions && totalQuestions > 0;

        let xpEarned = isFirstPlayToday ? xpCfg.first : xpCfg.repeat;
        let coinEarned = isFirstPlayToday ? xpCfg.firstCoin : xpCfg.repeatCoin;

        if (gameType === 'bug_hunt') {
            xpEarned = Math.round(xpEarned * (score / 100));
            coinEarned = Math.round(coinEarned * (score / 100));
        }
        if (isPerfect) { xpEarned += xpCfg.perfect; }

        await db.collection('miniGameSessions').add({
            uid, gameType, contentId: contentId || 'unknown',
            unitId: unitId || 'general',
            score, correctAnswers, totalQuestions, timeSpentSeconds,
            xpEarned, coinEarned, isFirstPlayToday, isPerfect,
            answers: answers || [],
            playedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        if (xpEarned > 0 && typeof awardXP === 'function') {
            await awardXP(uid, xpEarned, coinEarned, 0, 'minigame', contentId, { gameType, isPerfect });
        }

        return { xpEarned, coinEarned, isFirstPlayToday, isPerfect };
    } catch (err) {
        console.warn('[miniGame] recordGameSession error:', err);
        return { xpEarned: 0, coinEarned: 0, isFirstPlayToday: false, isPerfect: false };
    }
}

// ── Get today's mini-game stats for a user ────────────────────────────────────

async function getTodayGameStats(uid) {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const snap = await db.collection('miniGameSessions')
            .where('uid', '==', uid)
            .where('playedAt', '>=', todayStart)
            .get();
        const stats = { quiz_blitz: null, code_autopsy: null, bug_hunt: null, totalXP: 0 };
        snap.docs.forEach(d => {
            const data = d.data();
            stats.totalXP += data.xpEarned || 0;
            if (!stats[data.gameType]) stats[data.gameType] = data;
        });
        return stats;
    } catch (_) { return { quiz_blitz: null, code_autopsy: null, bug_hunt: null, totalXP: 0 }; }
}

// ── Expose globals ────────────────────────────────────────────────────────────
window.GAME_XP                    = GAME_XP;
window.getOrGenerateDailyContent  = getOrGenerateDailyContent;
window.recordGameSession          = recordGameSession;
window.gradeBugHuntAnswer         = gradeBugHuntAnswer;
window.getTodayGameStats          = getTodayGameStats;
window.checkIsFirstPlayToday      = checkIsFirstPlayToday;

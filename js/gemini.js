// ============================================================
// js/gemini.js - Google Gemini API wrapper
// ============================================================

const callGeminiApi = async (prompt, schema = null) => {
    if (!GEMINI_KEY || GEMINI_KEY.trim() === '') {
        throw new Error('ไม่พบ Gemini API Key กรุณาติดต่อผู้ดูแลระบบ');
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

    const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {},
    };

    if (schema) {
        payload.generationConfig.responseMimeType = 'application/json';
        payload.generationConfig.responseSchema = schema;
    }

    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const text = result.candidates[0].content.parts[0].text;
                    return schema ? JSON.parse(text) : text;
                }
                throw new Error('ได้รับการตอบกลับที่ไม่ถูกต้องจาก API');
            } else {
                if (response.status === 429)
                    throw new Error('API Key ถูกใช้งานเกินขีดจำกัด กรุณารอสักครู่แล้วลองใหม่');
                if (response.status === 400)
                    throw new Error('API Key ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ');
                if (response.status >= 500) {
                    attempts++;
                    if (attempts >= maxAttempts) throw new Error('เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่ภายหลัง');
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                    continue;
                }
                throw new Error(`เกิดข้อผิดพลาด (${response.status})`);
            }
        } catch (error) {
            if (attempts >= maxAttempts - 1) throw error;
            attempts++;
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    }
    throw new Error('ไม่สามารถเชื่อมต่อกับ AI API ได้');
};

// Analyze code and return structured metrics + feedback
const analyzeCode = async (code, language) => {
    const langInfo = LANGUAGES[language];
    const codeLines = code.split('\n');

    const prompt = `You are an expert programming AI assistant. Analyze the following ${langInfo.name} code and provide detailed feedback in Thai language.

When you find errors or issues, specify the LINE NUMBER where the problem occurs.

Code to analyze (with line numbers):
${codeLines.map((line, idx) => `${idx + 1}: ${line}`).join('\n')}

Please analyze:
1. Syntax correctness (specify line numbers for errors)
2. Logic and algorithm quality
3. Code efficiency
4. Readability and structure
5. Best practices for ${langInfo.name}
6. Potential bugs or issues (specify line numbers)`;

    const schema = {
        type: 'OBJECT',
        properties: {
            status: { type: 'STRING' },
            feedback: { type: 'STRING' },
            suggestion: { type: 'STRING' },
            issues: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        line: { type: 'NUMBER' },
                        message: { type: 'STRING' },
                    },
                },
            },
            metrics: {
                type: 'OBJECT',
                properties: {
                    quality: { type: 'NUMBER' },
                    correctness: { type: 'NUMBER' },
                    efficiency: { type: 'NUMBER' },
                    readability: { type: 'NUMBER' },
                    bestPractices: { type: 'NUMBER' },
                },
            },
        },
        required: ['status', 'feedback', 'suggestion', 'metrics'],
    };

    return callGeminiApi(prompt, schema);
};

// Generate coding problems for a given language, topic, difficulty
const generateProblems = async (language, topic, difficulty, count, customTitle = '', customDesc = '') => {
    const langInfo = LANGUAGES[language];
    const hasCustom = customTitle.trim() !== '' || customDesc.trim() !== '';

    const prompt = `You are a programming problem generator. Create ${count} diverse and interesting ${langInfo.name} programming problem(s) in Thai language.

Requirements:
- Language: ${langInfo.name}
- Topic: "${topic}"
- Difficulty: "${difficulty}"
${hasCustom ? `- Title hint: "${customTitle}"\n- Description hint: "${customDesc}"` : ''}

For each problem include a unique story, clear technical description, and concrete input/output examples.`;

    const schema = {
        type: 'ARRAY',
        items: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                story: { type: 'STRING' },
                description: { type: 'STRING' },
                difficulty: { type: 'STRING' },
                topic: { type: 'STRING' },
                inputExample: { type: 'STRING' },
                outputExample: { type: 'STRING' },
            },
            required: ['title', 'story', 'description', 'difficulty', 'topic', 'inputExample', 'outputExample'],
        },
    };

    return callGeminiApi(prompt, schema);
};

// AI chatbot reply for a programming question
const chatWithAI = async (question, language) => {
    const langInfo = LANGUAGES[language];
    const prompt = `You are a friendly AI Tutoring Chatbot specializing in ${langInfo.name} programming.
Answer clearly and concisely in Thai. If the question is not about programming, politely decline.

Question: "${question}"`;
    return callGeminiApi(prompt);
};

// ============================================================
// Generate test cases for a problem (used by teacher AI mode + student self-practice)
// Returns: [{ input, expectedOutput, note }]
// ============================================================
const generateTestCases = async (language, title, description, count) => {
    const langInfo = LANGUAGES[language];

    // Distribute test categories based on count
    const basicCount   = Math.max(1, Math.floor(count * 0.3));
    const edgeCount    = Math.max(1, Math.floor(count * 0.2));
    const stressCount  = Math.max(1, Math.floor(count * 0.2));
    const worstCount   = Math.max(1, Math.floor(count * 0.2));
    // remainder → special pattern

    const prompt = `You are an expert programming judge creating a rigorous, comprehensive test suite for a ${langInfo.name} problem.

Problem: "${title}"
Description: ${description}

Create exactly ${count} test cases. Distribute them across these REQUIRED categories:

[BASIC - ${basicCount} test(s)]
Simple, straightforward inputs that verify the core algorithm works correctly.
Example: small numbers, typical inputs within constraints.

[EDGE CASES - ${edgeCount} test(s)]
Boundary values that commonly reveal bugs:
- Minimum/maximum allowed values
- Zero, negative numbers, empty input, single element
- Duplicate values, all same elements
- Exact boundary values (n=1, n=max, value=0, value=INT_MAX)

[LARGE SCALE / STRESS TEST - ${stressCount} test(s)]
Large input to expose O(n²) vs O(n log n) performance differences:
- For sorting/searching: 50–200 elements with random values
- For arithmetic: very large numbers near data type limits
- For strings: long strings (50–200 characters)
- For recursion: deep call depth inputs
Note: Generate realistic but concise large inputs (do not literally write 100,000 numbers — use a representative large but finite set that fits in the JSON response)

[WORST-CASE SCENARIO - ${worstCount} test(s)]
Inputs that force the algorithm to do maximum work:
- Linear search: target at last position or absent from list
- Sorting with naive pivot: already-sorted or reverse-sorted array
- Recursive Fibonacci/factorial: near the practical recursion limit
- String matching: repeated characters, pattern at end of string

[SPECIAL PATTERN - remaining tests]
Tricky patterns that reveal logic errors:
- Repeated elements or all-identical values
- Already processed/sorted data
- Palindromes, symmetric structures
- Mixed positive/negative numbers
- Input requiring specific output formatting

Rules:
- input: exact stdin string as the program would receive it (empty string "" if no input needed)
- expectedOutput: exact stdout a correct solution would print — mathematically verified, trim trailing whitespace/newline
- note: short English label naming the category + what this test covers (e.g. "edge: single element", "stress: 100 elements sorted desc")
- Do NOT include code in expectedOutput — only the program's actual printed output
- Ensure all expectedOutput values are logically correct for the given input`;

    const schema = {
        type: 'ARRAY',
        items: {
            type: 'OBJECT',
            properties: {
                input:          { type: 'STRING' },
                expectedOutput: { type: 'STRING' },
                note:           { type: 'STRING' },
            },
            required: ['input', 'expectedOutput', 'note'],
        },
    };
    return callGeminiApi(prompt, schema);
};

// ============================================================
// Generate class-level analytics report for teacher
// ============================================================
const generateClassReport = async (courseTitle, classData) => {
    const prompt = `คุณเป็น AI วิเคราะห์ผลการเรียนสำหรับครู ตอบเป็นภาษาไทย

รายวิชา: "${courseTitle}"
ข้อมูลห้องเรียน:
${JSON.stringify(classData, null, 2)}

วิเคราะห์และสรุปผลการเรียนของห้องเรียน โดยครอบคลุม:
1. ภาพรวมผลการเรียน (จุดแข็ง, จุดที่ต้องปรับปรุง)
2. โจทย์ที่นักเรียนทำได้ดีและโจทย์ที่ติดขัด
3. นักเรียนที่ควรได้รับความช่วยเหลือเป็นพิเศษ
4. ข้อเสนอแนะสำหรับครูในการสอนครั้งต่อไป
5. สรุปภาพรวมคะแนนฝึกเองของนักเรียน`;

    const schema = {
        type: 'OBJECT',
        properties: {
            summary:         { type: 'STRING' },
            strengths:       { type: 'ARRAY', items: { type: 'STRING' } },
            challenges:      { type: 'ARRAY', items: { type: 'STRING' } },
            recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
            needsHelp:       { type: 'ARRAY', items: { type: 'STRING' } },
            practiceInsight: { type: 'STRING' },
        },
        required: ['summary', 'strengths', 'challenges', 'recommendations'],
    };
    return callGeminiApi(prompt, schema);
};

// ============================================================
// Generate individual student report for teacher
// ============================================================
const generateStudentReport = async (studentName, studentData) => {
    const prompt = `คุณเป็น AI วิเคราะห์ผลการเรียนรายบุคคล ตอบเป็นภาษาไทย กระชับ ชัดเจน

นักเรียน: "${studentName}"
ข้อมูล: ${JSON.stringify(studentData, null, 2)}

วิเคราะห์:
1. จุดแข็งของนักเรียนคนนี้
2. จุดที่ต้องพัฒนา
3. รูปแบบการเรียนรู้จากประวัติการส่งงาน
4. คำแนะนำเฉพาะสำหรับนักเรียนคนนี้`;

    const schema = {
        type: 'OBJECT',
        properties: {
            overview:        { type: 'STRING' },
            strengths:       { type: 'ARRAY', items: { type: 'STRING' } },
            improvements:    { type: 'ARRAY', items: { type: 'STRING' } },
            pattern:         { type: 'STRING' },
            advice:          { type: 'STRING' },
        },
        required: ['overview', 'strengths', 'improvements', 'advice'],
    };
    return callGeminiApi(prompt, schema);
};

// ============================================================
// AI Scaffolding — Tiered hints (level 1→2→3)
// Level 1: ชี้จุดที่ผิด (point to error, no fix)
// Level 2: บอกแนวคิด (explain the concept/algorithm needed)
// Level 3: ยกตัวอย่างโค้ดสั้น (short code snippet, NOT full answer)
// ============================================================
const getScaffoldingHint = async (code, language, assignmentTitle, assignmentDesc, failedTests, hintLevel) => {
    const langInfo = LANGUAGES[language];

    const levelInstructions = {
        1: `ระดับ 1 (ชี้จุดที่ผิด): บอกเพียงว่า "ส่วนไหน" หรือ "บรรทัดที่เท่าไหร่" ที่น่าจะมีปัญหา อย่าบอกวิธีแก้ เขียน 2-3 ประโยค`,
        2: `ระดับ 2 (แนวคิด): อธิบายแนวคิดหรือ Algorithm ที่ควรใช้แก้ปัญหานี้ โดยไม่ยกโค้ดตัวอย่าง เขียน 3-4 ประโยค`,
        3: `ระดับ 3 (ตัวอย่างโค้ด): ยกตัวอย่างโค้ดสั้นๆ ที่แสดงเทคนิคที่ต้องใช้ (แต่ไม่ใช่คำตอบของโจทย์นี้โดยตรง) พร้อมคำอธิบายสั้น`,
    };

    const failedSummary = failedTests.length > 0
        ? `Test Cases ที่ไม่ผ่าน:\n${failedTests.slice(0, 3).map((t, i) =>
            `  Test ${i+1}: ได้รับ "${t.actualOutput || '(ไม่มี output)'}" แต่คาดหวัง "${t.expectedOutput}"`).join('\n')}`
        : 'ยังไม่มีผลตรวจ';

    const prompt = `คุณเป็นครู AI ที่ช่วยสอนการเขียนโปรแกรมภาษา ${langInfo.name}
ตอบเป็นภาษาไทย สั้น กระชับ เหมาะสำหรับนักเรียนระดับมัธยมปลาย

โจทย์: "${assignmentTitle}"
คำอธิบาย: ${assignmentDesc || '(ไม่มี)'}

โค้ดของนักเรียน:
\`\`\`${language}
${code}
\`\`\`

${failedSummary}

${levelInstructions[hintLevel] || levelInstructions[1]}

อย่าให้คำตอบสำเร็จรูป ให้นักเรียนได้คิดและแก้ปัญหาเอง`;

    return callGeminiApi(prompt);
};

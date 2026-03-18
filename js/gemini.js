// ============================================================
// js/gemini.js - Google Gemini API wrapper
// ============================================================

const callGeminiApi = async (prompt, schema = null) => {
    if (!GEMINI_KEY || GEMINI_KEY.trim() === '') {
        throw new Error('ไม่พบ Gemini API Key กรุณาติดต่อผู้ดูแลระบบ');
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_KEY}`;

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

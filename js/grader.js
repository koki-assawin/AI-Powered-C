// ============================================================
// js/grader.js - Auto-Grader via Wandbox → Piston → Judge0
// ============================================================

const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const PISTON_URL  = 'https://emkc.org/api/v2/piston/execute';
const JUDGE0_URL  = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

const WANDBOX_COMPILER = {
    c:      'gcc-head',
    cpp:    'gcc-head',
    python: 'cpython-3.12.0',
    java:   'openjdk-head',
};
const WANDBOX_OPTIONS = { c: '-x c', cpp: '', python: '', java: '' };

const PISTON_LANG = {
    c:      { language: 'c',      version: '*', filename: 'main.c'      },
    cpp:    { language: 'c++',    version: '*', filename: 'main.cpp'    },
    python: { language: 'python', version: '*', filename: 'main.py'     },
    java:   { language: 'java',   version: '*', filename: 'Main.java'   },
};

// Judge0 CE language IDs
const JUDGE0_LANG = { c: 50, cpp: 54, python: 71, java: 62 };

// Run via Piston (fallback 1)
const runWithPiston = async (code, language, stdin) => {
    const p = PISTON_LANG[language] || PISTON_LANG.c;
    const res = await fetch(PISTON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language: p.language, version: p.version,
            files: [{ name: p.filename, content: code }],
            stdin: stdin || '',
        }),
    });
    if (!res.ok) throw new Error(`Piston HTTP ${res.status}`);
    const data = await res.json();
    return {
        program_output: data.run?.stdout || '',
        program_error:  data.run?.stderr || '',
        compiler_error: data.compile?.stderr || '',
    };
};

// Run via Judge0 CE (fallback 2)
const runWithJudge0 = async (code, language, stdin) => {
    const langId = JUDGE0_LANG[language] || JUDGE0_LANG.c;
    const res = await fetch(JUDGE0_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_code: code, language_id: langId, stdin: stdin || '' }),
    });
    if (!res.ok) throw new Error(`Judge0 HTTP ${res.status}`);
    const data = await res.json();
    return {
        program_output: data.stdout || '',
        program_error:  data.stderr || '',
        compiler_error: data.compile_output || '',
    };
};

// Normalize output for comparison (trim whitespace, unify newlines)
const normalizeOutput = (str) =>
    (str || '')
        .replace(/\r\n/g, '\n')
        .trim();

// Run code against a single test case input (Wandbox → Piston → Judge0)
const runSingleTest = async (code, language, testCase) => {
    const startTime = Date.now();
    let data;

    try {
        const body = {
            compiler: WANDBOX_COMPILER[language] || 'gcc-head',
            code, stdin: testCase.input || '',
        };
        if (WANDBOX_OPTIONS[language]) body.options = WANDBOX_OPTIONS[language];
        const res = await fetch(WANDBOX_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Wandbox HTTP ${res.status}`);
        data = await res.json();
    } catch (_wandboxErr) {
        try {
            data = await runWithPiston(code, language, testCase.input || '');
        } catch (_pistonErr) {
            try {
                data = await runWithJudge0(code, language, testCase.input || '');
            } catch (judge0Err) {
                return {
                    testCaseId: testCase.id, passed: false,
                    actualOutput: '', expectedOutput: normalizeOutput(testCase.expectedOutput || testCase.expected || ''),
                    executionTime: Date.now() - startTime,
                    errorLog: `Compile service unavailable: ${judge0Err.message}`,
                    isCompileError: false,
                };
            }
        }
    }

    const execTime = Date.now() - startTime;
    const actualOutput   = normalizeOutput(data.program_output || '');
    const expectedOutput = normalizeOutput(testCase.expectedOutput || testCase.expected || '');
    const passed         = actualOutput === expectedOutput;
    const compilerError  = data.compiler_error ? data.compiler_error.trim() : null;
    const runtimeError   = data.program_error  ? data.program_error.trim()  : null;
    const errorLog       = compilerError || runtimeError || null;
    const isCompileError = !!compilerError && !data.program_output;

    return { testCaseId: testCase.id, passed, actualOutput, expectedOutput, executionTime: execTime, errorLog, isCompileError };
};

// Run code against visible test cases only (for student preview)
const runSampleTests = async (code, language, assignmentId) => {
    const snap = await db.collection('testCases')
        .where('assignmentId', '==', assignmentId)
        .where('isHidden', '==', false)
        .orderBy('order')
        .get();

    const testCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const results = [];

    for (const tc of testCases) {
        const result = await runSingleTest(code, language, tc);
        results.push(result);
    }

    return results;
};

// Submission cooldown check (30 seconds between submissions)
const canSubmit = (assignmentId) => {
    const key = `lastSubmit_${assignmentId}`;
    const last = parseInt(localStorage.getItem(key) || '0');
    const now = Date.now();
    if (now - last < 30000) {
        const wait = Math.ceil((30000 - (now - last)) / 1000);
        return { allowed: false, waitSeconds: wait };
    }
    return { allowed: true };
};

const recordSubmitTime = (assignmentId) => {
    localStorage.setItem(`lastSubmit_${assignmentId}`, Date.now().toString());
};

// Grade a full submission: run all test cases, save to Firestore
const gradeSubmission = async (studentId, assignmentId, courseId, code, language) => {
    // Load ALL test cases (including hidden)
    const snap = await db.collection('testCases')
        .where('assignmentId', '==', assignmentId)
        .orderBy('order')
        .get();

    const testCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (testCases.length === 0) {
        throw new Error('ไม่พบ Test Cases สำหรับโจทย์นี้ กรุณาติดต่อครูผู้สอน');
    }

    // Run all tests sequentially to avoid rate limiting
    const testResults = [];
    let maxTime = 0;

    for (const tc of testCases) {
        const result = await runSingleTest(code, language, tc);
        testResults.push(result);
        if (result.executionTime > maxTime) maxTime = result.executionTime;
    }

    // Tally results
    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests = testCases.length;

    // Calculate score based on point values
    const pointsEarned = testCases.reduce((sum, tc, i) =>
        sum + (testResults[i].passed ? (tc.points || 1) : 0), 0);
    const totalPoints = testCases.reduce((sum, tc) => sum + (tc.points || 1), 0);
    const score = totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 100) : 0;

    // Determine overall status
    let status = 'accepted';
    if (testResults.some(r => r.isCompileError)) {
        status = 'compile_error';
    } else if (testResults.some(r => r.errorLog && !r.passed)) {
        status = 'runtime_error';
    } else if (passedTests < totalTests) {
        status = 'wrong_answer';
    }

    // Write submission document to Firestore
    const submissionData = {
        studentId,
        assignmentId,
        courseId,
        code,
        language,
        status,
        executionTime: maxTime,
        passedTests,
        totalTests,
        score,
        totalPoints,
        testResults: testResults.map(r => ({
            testCaseId: r.testCaseId,
            passed: r.passed,
            actualOutput: r.actualOutput,
            executionTime: r.executionTime,
            errorLog: r.errorLog || null,
        })),
        aiScore: null,
        aiMetrics: null,
        submittedAt: serverTimestamp(),
    };

    const submissionRef = await db.collection('submissions').add(submissionData);

    // Update best grade in grades collection
    await updateBestGrade(studentId, courseId, assignmentId, score, totalPoints, submissionRef.id);

    recordSubmitTime(assignmentId);

    return {
        submissionId: submissionRef.id,
        passedTests,
        totalTests,
        status,
        score,
        testResults,
    };
};

// Grade without writing to Firestore (for guest/demo users)
const gradeForGuest = async (assignmentId, code, language) => {
    const snap = await db.collection('testCases')
        .where('assignmentId', '==', assignmentId)
        .orderBy('order')
        .get();
    const testCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (testCases.length === 0) throw new Error('ไม่พบ Test Cases สำหรับโจทย์นี้');

    const testResults = [];
    for (const tc of testCases) {
        const result = await runSingleTest(code, language, tc);
        testResults.push(result);
    }

    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests  = testCases.length;
    const pointsEarned = testCases.reduce((s, tc, i) => s + (testResults[i].passed ? (tc.points || 1) : 0), 0);
    const totalPoints  = testCases.reduce((s, tc) => s + (tc.points || 1), 0);
    const score = totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 100) : 0;

    let status = 'accepted';
    if (testResults.some(r => r.isCompileError))           status = 'compile_error';
    else if (testResults.some(r => r.errorLog && !r.passed)) status = 'runtime_error';
    else if (passedTests < totalTests)                      status = 'wrong_answer';

    return { submissionId: null, passedTests, totalTests, status, score, testResults };
};

// Update or create the grade document keeping the best score
const updateBestGrade = async (studentId, courseId, assignmentId, score, maxScore, submissionId) => {
    const gradeQuery = await db.collection('grades')
        .where('studentId', '==', studentId)
        .where('assignmentId', '==', assignmentId)
        .limit(1)
        .get();

    if (gradeQuery.empty) {
        await db.collection('grades').add({
            studentId,
            courseId,
            assignmentId,
            score,
            maxScore,
            submissionId,
            gradedAt: serverTimestamp(),
        });
    } else {
        const existing = gradeQuery.docs[0];
        if (score > (existing.data().score || 0)) {
            await existing.ref.update({ score, submissionId, gradedAt: serverTimestamp() });
        }
    }
};

// Status display helpers
const STATUS_LABELS = {
    accepted: { text: 'ผ่านทุก Test Case', color: 'green', icon: '✅' },
    wrong_answer: { text: 'คำตอบไม่ถูกต้อง', color: 'yellow', icon: '❌' },
    compile_error: { text: 'Compile Error', color: 'red', icon: '🔴' },
    runtime_error: { text: 'Runtime Error', color: 'orange', icon: '⚠️' },
    pending: { text: 'รอตรวจ', color: 'gray', icon: '⏳' },
};

// ============================================================
// js/grader.js - Code execution engine + Auto-Grader
// Chain (runCodeRemote): Cloudflare Worker → Wandbox → Judge0 CE (base64)
//  - Judge0 MUST use base64_encoded=true: in plain-text mode it rejects any
//    non-ASCII (Thai) source/output with HTTP 400.
//  - Wandbox skipped for Java (compiles as prog.java → "public class Main" fails)
//  - Piston public API is whitelist-only since 2026-02-15 → removed
// ============================================================

const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const JUDGE0_URL  = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true';

const WANDBOX_COMPILER = {
    c:      'gcc-head',
    cpp:    'gcc-head',
    python: 'cpython-3.12.7',
};
const WANDBOX_OPTIONS = { c: '-x c' };

// Judge0 CE language IDs
const JUDGE0_LANG = { c: 50, cpp: 54, python: 71, java: 62 };

// UTF-8 safe base64 helpers (btoa/atob alone break on Thai text)
const _b64enc = (str) => {
    const bytes = new TextEncoder().encode(str || '');
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
};
const _b64dec = (b64) => {
    if (!b64) return '';
    try {
        const bin = atob(b64); const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    } catch (_) { return b64; }
};

const _isOciStr = (s) => (s || '').includes('OCI runtime error') || (s || '').includes('temporarily unavailable');
const _isOciResult = (d) => _isOciStr(d.program_output) || _isOciStr(d.program_error) || _isOciStr(d.compiler_error);

// Fetch with automatic timeout
const fetchWithTimeout = (url, options, ms = 8000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...options, signal: ctrl.signal })
        .finally(() => clearTimeout(timer));
};

// Ensure window.RUNNER_URL is loaded from Firestore if not already set
const _ensureRunnerUrl = async () => {
    if (window.RUNNER_URL) return;
    try {
        const snap = await db.collection('config').doc('runner').get();
        if (snap.exists && snap.data().workerUrl) {
            window.RUNNER_URL = (snap.data().workerUrl || '').replace(/\/$/, '');
        }
    } catch (e) {}
};

// 1. Cloudflare Worker proxy
const runWithWorker = async (code, language, stdin) => {
    await _ensureRunnerUrl();
    if (!window.RUNNER_URL) throw new Error('No worker URL configured');
    const res = await fetchWithTimeout(`${window.RUNNER_URL}/compile`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, stdin: stdin || '' }),
    }, 20000);
    if (!res.ok) throw new Error(`Worker HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (_isOciResult(data)) throw new Error('OCI runtime error — server busy');
    return {
        program_output: data.program_output || '',
        program_error:  data.program_error  || '',
        compiler_error: data.compiler_error || '',
        source: 'worker/' + (data.source || '?'),
    };
};

// 2. Wandbox direct (CORS-enabled, no key)
const runWithWandbox = async (code, language, stdin) => {
    const compiler = WANDBOX_COMPILER[language];
    if (!compiler) throw new Error(`unsupported language ${language}`);
    const body = { compiler, code, stdin: stdin || '' };
    if (WANDBOX_OPTIONS[language]) body.options = WANDBOX_OPTIONS[language];
    const res = await fetchWithTimeout(WANDBOX_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }, 15000);
    if (!res.ok) throw new Error(`Wandbox HTTP ${res.status}`);
    const d = await res.json();
    if (_isOciResult(d)) throw new Error('Wandbox OCI');
    return {
        program_output: d.program_output || '',
        program_error:  d.program_error  || '',
        compiler_error: d.compiler_error || '',
        source: 'wandbox',
    };
};

// 3. Judge0 CE (base64 — required for Thai text)
const runWithJudge0 = async (code, language, stdin) => {
    const langId = JUDGE0_LANG[language] || JUDGE0_LANG.c;
    const res = await fetchWithTimeout(JUDGE0_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_code: _b64enc(code), language_id: langId, stdin: _b64enc(stdin || '') }),
    }, 20000);
    if (!res.ok) throw new Error(`Judge0 HTTP ${res.status}`);
    const data = await res.json();
    return {
        program_output: _b64dec(data.stdout),
        program_error:  _b64dec(data.stderr),
        compiler_error: _b64dec(data.compile_output),
        source: 'judge0',
    };
};

// Shared entry point for every page (teacher + student editors, grader).
// Returns { program_output, program_error, compiler_error, source } or throws.
const runCodeRemote = async (code, language, stdin) => {
    const errors = [];
    const steps = [
        ['worker',   runWithWorker],
        ['wandbox',  runWithWandbox],
        ['wandbox2', runWithWandbox],
        ['judge0',   runWithJudge0],
    ];
    for (const [name, fn] of steps) {
        if (fn === runWithWandbox && !WANDBOX_COMPILER[language]) continue;
        try {
            const d = await fn(code, language, stdin);
            console.log('[APCC] run OK via', d.source);
            return d;
        } catch (e) { errors.push(`${name}:${e.message}`); }
    }
    console.warn('[APCC] all runners failed:', errors.join(' | '));
    throw new Error(errors.join(' | '));
};
window.runCodeRemote = runCodeRemote;

// Normalize output for comparison (trim whitespace, unify newlines)
const normalizeOutput = (str) =>
    (str || '')
        .replace(/\r\n/g, '\n')
        .trim();

// Run code against a single test case input
const runSingleTest = async (code, language, testCase) => {
    const startTime = Date.now();
    let data;
    try {
        data = await runCodeRemote(code, language, testCase.input || '');
    } catch (err) {
        return {
            testCaseId: testCase.id, passed: false,
            actualOutput: '', expectedOutput: normalizeOutput(testCase.expectedOutput || testCase.expected || ''),
            executionTime: Date.now() - startTime,
            errorLog: `Compile service unavailable: ${err.message}`,
            isCompileError: false,
            input: testCase.input || '', isHidden: !!testCase.isHidden,
        };
    }

    const execTime = Date.now() - startTime;
    const actualOutput   = normalizeOutput(data.program_output || '');
    const expectedOutput = normalizeOutput(testCase.expectedOutput || testCase.expected || '');
    const passed         = actualOutput === expectedOutput;
    const compilerError  = data.compiler_error ? data.compiler_error.trim() : null;
    const runtimeError   = data.program_error  ? data.program_error.trim()  : null;
    const errorLog       = compilerError || runtimeError || null;
    const isCompileError = !!compilerError && !data.program_output;

    return {
        testCaseId: testCase.id, passed, actualOutput, expectedOutput, executionTime: execTime, errorLog, isCompileError,
        input: testCase.input || '', isHidden: !!testCase.isHidden,
    };
};

// Run code against visible test cases only (for student preview)
const runSampleTests = async (code, language, assignmentId) => {
    const snap = await db.collection('testCases')
        .where('assignmentId', '==', assignmentId)
        .where('isHidden', '==', false)
        .orderBy('order')
        .get();

    const testCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return Promise.all(testCases.map(tc => runSingleTest(code, language, tc)));
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

    const testResults = await Promise.all(testCases.map(tc => runSingleTest(code, language, tc)));
    const maxTime = testResults.reduce((m, r) => Math.max(m, r.executionTime), 0);

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

    // ติดธงไว้ว่าการส่งครั้งนี้นับคะแนนหรือไม่ เพื่อให้หน้าวิเคราะห์กรองออกได้
    const { locked: courseLocked } = await getCourseGradeConfig(courseId);
    if (courseLocked) submissionData.countedInGrade = false;

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

    const testResults = await Promise.all(testCases.map(tc => runSingleTest(code, language, tc)));
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
// เกณฑ์คิดคะแนนของรายวิชา: 'best' = ใช้คะแนนครั้งที่ดีที่สุด (ค่าเริ่มต้นเดิมของระบบ)
//                          'latest' = ใช้คะแนนครั้งล่าสุดเสมอ แม้จะต่ำกว่าเดิม
// เก็บไว้ที่ courses/{courseId}.gradingPolicy — รายวิชาที่ไม่ได้ตั้งค่าจะเป็น 'best'
const _courseGradeCfgCache = {};
const getCourseGradeConfig = async (courseId) => {
    if (!courseId) return { policy: 'best', locked: false };
    if (_courseGradeCfgCache[courseId]) return _courseGradeCfgCache[courseId];
    try {
        const snap = await db.collection('courses').doc(courseId).get();
        const d = snap.exists ? snap.data() : {};
        const cfg = { policy: d.gradingPolicy === 'latest' ? 'latest' : 'best', locked: d.gradesLocked === true };
        _courseGradeCfgCache[courseId] = cfg;
        return cfg;
    } catch (_) { return { policy: 'best', locked: false }; }
};
const getGradingPolicy = async (courseId) => (await getCourseGradeConfig(courseId)).policy;

const updateBestGrade = async (studentId, courseId, assignmentId, score, maxScore, submissionId) => {
    const { policy, locked } = await getCourseGradeConfig(courseId);
    // รายวิชาที่ปิดรับคะแนนแล้ว: ตรวจงานให้ตามปกติ แต่ไม่แตะสมุดเกรด
    if (locked) return;
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
            gradingPolicy: policy,
            gradedAt: serverTimestamp(),
        });
    } else {
        const existing = gradeQuery.docs[0];
        const shouldUpdate = policy === 'latest' || score > (existing.data().score || 0);
        if (shouldUpdate) {
            await existing.ref.update({ score, maxScore, submissionId, gradingPolicy: policy, gradedAt: serverTimestamp() });
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

// js/pages/student/SelfPractice.js - Student self-practice: AI-generated problems + auto-grading (v4.5)

const BASE_SCORES = { 'ง่าย': 50, 'ปานกลาง': 75, 'ยาก': 100 };
const TC_COUNT = 5; // number of AI-generated test cases per submission

// Topic presets per language
const TOPIC_PRESETS = {
    c: [
        'การแสดงผล (printf)',
        'การรับข้อมูล (scanf)',
        'ตัวแปรและชนิดข้อมูล',
        'นิพจน์และการคำนวณ',
        'การตัดสินใจ (if/else)',
        'switch-case',
        'for loop',
        'while loop',
        'do-while loop',
        'การทำซ้ำซ้อน (Nested Loop)',
        'break และ continue',
        'ฟังก์ชัน',
        'ฟังก์ชัน Recursive',
        'อาร์เรย์ 1 มิติ',
        'อาร์เรย์ 2 มิติ (Matrix)',
        'Searching (การค้นหาข้อมูล)',
        'Sorting (การเรียงลำดับ)',
        'สตริง (string.h)',
        'พอยน์เตอร์',
        'อื่นๆ (ระบุเอง)',
    ],
    cpp: [
        'การแสดงผล (cout)',
        'การรับข้อมูล (cin)',
        'ตัวแปรและชนิดข้อมูล',
        'นิพจน์และการคำนวณ',
        'การตัดสินใจ (if/else)',
        'switch-case',
        'for loop',
        'while loop',
        'do-while loop',
        'การทำซ้ำซ้อน (Nested Loop)',
        'ฟังก์ชัน',
        'ฟังก์ชัน Recursive',
        'อาร์เรย์ / vector',
        'Sorting (sort + algorithm)',
        'สตริง (std::string)',
        'พอยน์เตอร์',
        'OOP เบื้องต้น (class)',
        'อื่นๆ (ระบุเอง)',
    ],
    python: [
        'การแสดงผล (print)',
        'การรับข้อมูล (input)',
        'ตัวแปรและชนิดข้อมูล',
        'นิพจน์และการคำนวณ',
        'การตัดสินใจ (if/else)',
        'for loop',
        'while loop',
        'การทำซ้ำซ้อน',
        'ฟังก์ชัน (def)',
        'ฟังก์ชัน Recursive',
        'List',
        'Dictionary',
        'String',
        'List Comprehension',
        'Sorting (sorted/sort)',
        'อื่นๆ (ระบุเอง)',
    ],
    java: [
        'การแสดงผล (System.out)',
        'การรับข้อมูล (Scanner)',
        'ตัวแปรและชนิดข้อมูล',
        'นิพจน์และการคำนวณ',
        'การตัดสินใจ (if/else)',
        'switch-case',
        'for loop',
        'while loop',
        'การทำซ้ำซ้อน',
        'Method',
        'Recursive Method',
        'Array',
        'ArrayList',
        'String',
        'Sorting (Arrays.sort)',
        'OOP เบื้องต้น (class)',
        'อื่นๆ (ระบุเอง)',
    ],
};

const SelfPractice = () => {
    const { userDoc } = useAuth();

    // ── Course selection ──────────────────────────────────────────────
    const [enrolledCourses, setEnrolledCourses] = React.useState([]);
    const [coursesLoading, setCoursesLoading] = React.useState(true);
    const [selectedCourseId, setSelectedCourseId] = React.useState('');

    // ── Generator settings ────────────────────────────────────────────
    const [language, setLanguage] = React.useState('c');
    const [difficulty, setDifficulty] = React.useState('ง่าย');
    const [topicPreset, setTopicPreset] = React.useState('');
    const [topicCustom, setTopicCustom] = React.useState('');
    const [hintDesc, setHintDesc] = React.useState('');
    const [problem, setProblem] = React.useState(null);
    const [generating, setGenerating] = React.useState(false);

    const [code, setCode] = React.useState(LANGUAGES.c.defaultCode);
    const [submitting, setSubmitting] = React.useState(false);
    const [submitStatus, setSubmitStatus] = React.useState('');
    const [result, setResult] = React.useState(null);

    const [history, setHistory] = React.useState([]);
    const [historyLoading, setHistoryLoading] = React.useState(true);

    const isCustomTopic = topicPreset === 'อื่นๆ (ระบุเอง)';
    const activeTopic = isCustomTopic ? topicCustom : topicPreset;

    const presets = TOPIC_PRESETS[language] || TOPIC_PRESETS.c;
    const diffColor = { 'ง่าย': '#16a34a', 'ปานกลาง': '#d97706', 'ยาก': '#dc2626' };

    // ── Sync language default code ────────────────────────────────────
    React.useEffect(() => {
        setCode(LANGUAGES[language]?.defaultCode || '');
        // Reset topic if preset no longer valid for this language
        if (!TOPIC_PRESETS[language]?.includes(topicPreset)) setTopicPreset('');
    }, [language]);

    // ── Sync language from selected course ────────────────────────────
    React.useEffect(() => {
        if (!selectedCourseId) return;
        const course = enrolledCourses.find(c => c.id === selectedCourseId);
        if (course?.language && LANGUAGES[course.language]) {
            setLanguage(course.language);
        }
    }, [selectedCourseId]);

    // ── Load enrolled courses ─────────────────────────────────────────
    React.useEffect(() => {
        if (!userDoc) return;
        loadCourses();
        loadHistory();
    }, [userDoc]);

    const loadCourses = async () => {
        setCoursesLoading(true);
        try {
            const ids = userDoc.enrolledCourses || [];
            if (ids.length === 0) { setEnrolledCourses([]); return; }
            const snaps = await Promise.all(ids.map(id => db.collection('courses').doc(id).get()));
            const courses = snaps.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }));
            setEnrolledCourses(courses);
            // Auto-select first course
            if (courses.length === 1) setSelectedCourseId(courses[0].id);
        } catch (e) { console.error(e); }
        finally { setCoursesLoading(false); }
    };

    const loadHistory = async () => {
        setHistoryLoading(true);
        try {
            const snap = await db.collection('selfPracticeSubmissions')
                .where('studentId', '==', userDoc.id)
                .orderBy('submittedAt', 'desc')
                .limit(20)
                .get();
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
        finally { setHistoryLoading(false); }
    };

    // ── Generate problem ──────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!selectedCourseId) { alert('กรุณาเลือกรายวิชาก่อน'); return; }
        setGenerating(true);
        setProblem(null);
        setResult(null);
        setCode(LANGUAGES[language]?.defaultCode || '');
        try {
            const topic = activeTopic.trim() || 'การเขียนโปรแกรม';
            const problems = await generateProblems(language, topic, difficulty, 1, '', hintDesc.trim());
            if (problems.length > 0) setProblem(problems[0]);
            else alert('ไม่สามารถสร้างโจทย์ได้ ลองใหม่อีกครั้ง');
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    // ── Submit & grade ────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!problem || !code.trim()) return;
        if (!selectedCourseId) { alert('กรุณาเลือกรายวิชาก่อน'); return; }
        setSubmitting(true);
        setResult(null);

        try {
            setSubmitStatus('🤖 AI กำลังสร้าง test cases...');
            const desc = `${problem.story}\n${problem.description}\nตัวอย่าง Input: ${problem.inputExample}\nตัวอย่าง Output: ${problem.outputExample}`;
            const testCases = await generateTestCases(language, problem.title, desc, TC_COUNT);

            setSubmitStatus(`⚙️ กำลังรันโค้ด (0/${testCases.length})...`);
            const testResults = [];
            for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                setSubmitStatus(`⚙️ กำลังรันโค้ด (${i + 1}/${testCases.length})...`);
                try {
                    const r = await runSingleTest(code, language, {
                        id: `sp_${i}`,
                        input: tc.input || '',
                        expectedOutput: tc.expectedOutput || '',
                    });
                    testResults.push({ ...r, note: tc.note });
                } catch (e) {
                    testResults.push({ passed: false, errorLog: e.message, executionTime: 0, actualOutput: '', expectedOutput: tc.expectedOutput || '', note: tc.note });
                }
            }

            const passedTests = testResults.filter(r => r.passed).length;
            const totalTests = testResults.length;
            const baseScore = BASE_SCORES[difficulty] || 50;
            const actualScore = totalTests > 0 ? Math.round(baseScore * passedTests / totalTests) : 0;

            setSubmitStatus('💾 กำลังบันทึกคะแนน...');
            const course = enrolledCourses.find(c => c.id === selectedCourseId);
            const submission = {
                studentId:          userDoc.id,
                displayName:        userDoc.displayName || '',
                courseId:           selectedCourseId,
                courseTitle:        course?.title || '',
                language,
                difficulty,
                topic:              activeTopic.trim() || 'ทั่วไป',
                problemTitle:       problem.title,
                problemDescription: problem.description,
                code,
                baseScore,
                actualScore,
                passedTests,
                totalTests,
                submittedAt:        serverTimestamp(),
            };
            await db.collection('selfPracticeSubmissions').add(submission);

            setResult({ ...submission, testResults, actualScore, passedTests, totalTests });
            loadHistory();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSubmitting(false);
            setSubmitStatus('');
        }
    };

    const scoreColor = (s, base) => s >= base ? '#16a34a' : s >= base * 0.5 ? '#d97706' : '#dc2626';

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Platform" subtitle="ฝึกเองตามความสนใจ" />
            <main className="max-w-7xl mx-auto px-4 py-6">

                <div className="flex items-center gap-3 mb-5">
                    <h2 className="text-xl font-bold" style={{ color: '#AD1457' }}>🎯 ฝึกทำโจทย์ตามความสนใจ</h2>
                    <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#FFE4EC', color: '#C2185B' }}>
                        ง่าย +50 · ปานกลาง +75 · ยาก +100 คะแนน
                    </span>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">

                    {/* ── Left: Generator + Editor ─────────────────── */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Step 1: Course Selection */}
                        <div className="bg-white rounded-2xl p-5" style={{ border: '2px solid #FFD1DC' }}>
                            <p className="text-sm font-bold mb-3" style={{ color: '#AD1457' }}>
                                📚 ขั้นตอนที่ 1 — เลือกรายวิชาที่ต้องการส่งคะแนน
                            </p>
                            {coursesLoading ? (
                                <Spinner text="กำลังโหลดรายวิชา..." />
                            ) : enrolledCourses.length === 0 ? (
                                <div className="text-center py-4 text-gray-400">
                                    <p className="text-sm">ยังไม่ได้ลงทะเบียนรายวิชา</p>
                                    <a href="#/student/courses" style={{ color: '#EC407A', fontSize: '13px' }} className="hover:underline">
                                        ค้นหารายวิชา →
                                    </a>
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {enrolledCourses.map(course => {
                                        const lang = LANGUAGES[course.language];
                                        const selected = selectedCourseId === course.id;
                                        return (
                                            <button key={course.id}
                                                onClick={() => setSelectedCourseId(course.id)}
                                                className="text-left p-4 rounded-xl transition-all"
                                                style={{
                                                    border: selected ? '2px solid #EC407A' : '1.5px solid #E0E0E0',
                                                    background: selected ? '#FFF5F7' : '#FAFAFA',
                                                }}>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{lang?.icon || '📚'}</span>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm text-gray-800 truncate">{course.title}</p>
                                                        <div className="flex gap-2 mt-0.5 flex-wrap">
                                                            <span className="text-xs" style={{ color: lang?.color || '#888' }}>{lang?.name}</span>
                                                            {course.grade && <span className="text-xs text-gray-400">{course.grade}</span>}
                                                            {course.room && <span className="text-xs text-gray-400">ห้อง {course.room}</span>}
                                                        </div>
                                                    </div>
                                                    {selected && <span className="ml-auto text-pink-500 font-bold shrink-0">✓</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Step 2: Generator Config */}
                        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #FFD1DC', opacity: !selectedCourseId ? 0.5 : 1 }}>
                            <p className="text-sm font-bold mb-4" style={{ color: '#AD1457' }}>⚙️ ขั้นตอนที่ 2 — ตั้งค่าโจทย์ที่ต้องการฝึก</p>

                            {/* Language */}
                            <div className="mb-4">
                                <label className="text-xs text-gray-500 block mb-1.5 font-medium">ภาษาโปรแกรม</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(LANGUAGES).map(l => (
                                        <button key={l} onClick={() => setLanguage(l)}
                                            disabled={!selectedCourseId}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                                            style={language === l
                                                ? { background: '#EC407A', color: '#fff' }
                                                : { background: '#F5F5F5', color: '#555' }}>
                                            {LANGUAGES[l].icon} {LANGUAGES[l].name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Difficulty */}
                            <div className="mb-4">
                                <label className="text-xs text-gray-500 block mb-1.5 font-medium">ระดับความยาก</label>
                                <div className="flex gap-2">
                                    {['ง่าย', 'ปานกลาง', 'ยาก'].map(d => (
                                        <button key={d} onClick={() => setDifficulty(d)}
                                            disabled={!selectedCourseId}
                                            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                                            style={difficulty === d
                                                ? { background: diffColor[d], color: '#fff' }
                                                : { background: '#F5F5F5', color: '#555' }}>
                                            {d} <span className="text-xs opacity-70">(+{BASE_SCORES[d]})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Topic Preset */}
                            <div className="mb-4">
                                <label className="text-xs text-gray-500 block mb-1.5 font-medium">
                                    หัวข้อ / เรื่องที่ต้องการฝึก
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {presets.map(p => (
                                        <button key={p}
                                            onClick={() => { setTopicPreset(p); if (p !== 'อื่นๆ (ระบุเอง)') setTopicCustom(''); }}
                                            disabled={!selectedCourseId}
                                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                                            style={topicPreset === p
                                                ? { background: '#EC407A', color: '#fff', borderColor: '#EC407A' }
                                                : { background: '#fff', color: '#555', borderColor: '#E0E0E0' }}>
                                            {p === 'อื่นๆ (ระบุเอง)' ? '✏️ อื่นๆ (ระบุเอง)' : p}
                                        </button>
                                    ))}
                                </div>
                                {isCustomTopic && (
                                    <input
                                        value={topicCustom}
                                        onChange={e => setTopicCustom(e.target.value)}
                                        placeholder="ระบุหัวข้อที่ต้องการ..."
                                        className="mt-2 w-full px-3 py-2 rounded-xl text-sm outline-none"
                                        style={{ border: '1.5px solid #EC407A' }}
                                    />
                                )}
                            </div>

                            {/* Hint Description */}
                            <div className="mb-4">
                                <label className="text-xs text-gray-500 block mb-1.5 font-medium">
                                    💬 คำบรรยายเพิ่มเติมสำหรับ AI <span className="text-gray-400">(ไม่บังคับ)</span>
                                </label>
                                <textarea
                                    value={hintDesc}
                                    onChange={e => setHintDesc(e.target.value)}
                                    disabled={!selectedCourseId}
                                    rows="2"
                                    placeholder="เช่น: ให้ AI คิดโจทย์เกี่ยวกับการคำนวณคะแนนนักเรียน / เหตุการณ์เกี่ยวกับร้านค้า / เกี่ยวกับสัตว์ / ฯลฯ"
                                    className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                                    style={{ border: '1.5px solid #E0E0E0' }}
                                    onFocus={e => e.target.style.borderColor = '#EC407A'}
                                    onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                                />
                            </div>

                            <button onClick={handleGenerate}
                                disabled={generating || !selectedCourseId}
                                className="k-btn-pink px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
                                {generating ? <SpinIcon className="w-4 h-4" /> : '🎲'}
                                {generating ? 'กำลังสร้างโจทย์...' : 'สร้างโจทย์ด้วย AI'}
                            </button>
                        </div>

                        {/* Problem Display */}
                        {problem && (
                            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #FFD1DC' }}>
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-bold text-gray-800 text-lg">{problem.title}</h3>
                                    <span className="text-xs px-2 py-1 rounded-full font-bold ml-3 shrink-0"
                                        style={{ background: '#FFE4EC', color: diffColor[difficulty] }}>
                                        {difficulty} +{BASE_SCORES[difficulty]}pt
                                    </span>
                                </div>
                                <p className="text-gray-600 text-sm whitespace-pre-line mb-4">{problem.story}</p>
                                <p className="text-gray-700 text-sm whitespace-pre-line mb-4">{problem.description}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 mb-1">ตัวอย่าง Input:</p>
                                        <pre className="bg-gray-900 text-green-300 p-3 rounded-xl text-xs font-mono overflow-x-auto">{problem.inputExample || '(ไม่มี input)'}</pre>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 mb-1">ตัวอย่าง Output:</p>
                                        <pre className="bg-gray-900 text-blue-300 p-3 rounded-xl text-xs font-mono overflow-x-auto">{problem.outputExample}</pre>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Code Editor */}
                        {problem && (
                            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E0E0E0' }}>
                                <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: '#F5F5F5' }}>
                                    <span className="text-xs font-bold text-gray-500">✏️ เขียนโค้ดที่นี่</span>
                                    <div className="flex items-center gap-2">
                                        {language === 'java' && (
                                            <span className="text-xs text-yellow-600">⚠️ Java: ใช้ class Main</span>
                                        )}
                                        {submitting ? (
                                            <div className="flex items-center gap-2 text-xs text-pink-600">
                                                <SpinIcon className="w-4 h-4" />
                                                <span>{submitStatus}</span>
                                            </div>
                                        ) : (
                                            <button onClick={handleSubmit}
                                                disabled={!code.trim() || submitting}
                                                className="k-btn-pink px-4 py-1.5 text-sm flex items-center gap-1 disabled:opacity-50">
                                                ✓ ส่งคำตอบ
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <CodeEditor
                                    value={code}
                                    onChange={setCode}
                                    language={language}
                                    placeholder={`// เขียนโค้ด ${LANGUAGES[language]?.name} ที่นี่...`}
                                    minHeight="340px"
                                />
                            </div>
                        )}

                        {/* Result */}
                        {result && (
                            <div className="bg-white rounded-2xl p-5" style={{
                                border: `2px solid ${result.passedTests === result.totalTests ? '#BBF7D0' : result.passedTests > 0 ? '#FDE68A' : '#FECACA'}`
                            }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-gray-800 text-lg">📊 ผลการตรวจ</h4>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold" style={{ color: scoreColor(result.actualScore, result.baseScore) }}>
                                            +{result.actualScore} คะแนน
                                        </div>
                                        <div className="text-xs text-gray-400">ผ่าน {result.passedTests}/{result.totalTests} test cases</div>
                                    </div>
                                </div>
                                {/* Score bar */}
                                <div className="h-3 rounded-full bg-gray-100 mb-4 overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{
                                        width: `${result.totalTests > 0 ? (result.passedTests / result.totalTests) * 100 : 0}%`,
                                        background: result.passedTests === result.totalTests ? '#22C55E' : result.passedTests > 0 ? '#EAB308' : '#EF4444',
                                    }} />
                                </div>
                                <div className="space-y-2">
                                    {result.testResults.map((r, i) => (
                                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl text-sm ${r.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <span className="shrink-0 font-bold" style={{ color: r.passed ? '#16a34a' : '#dc2626' }}>
                                                {r.passed ? '✓' : '✗'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-700 text-xs mb-1">
                                                    Test {i + 1}{r.note ? ` — ${r.note}` : ''}
                                                </div>
                                                {!r.passed && (
                                                    <div className="space-y-1 text-xs">
                                                        <div><span className="text-gray-500">คาดหวัง: </span><code className="text-blue-600">{r.expectedOutput || '(ว่าง)'}</code></div>
                                                        <div><span className="text-gray-500">ได้รับ: </span><code className="text-red-600">{r.actualOutput || '(ว่าง)'}</code></div>
                                                        {r.errorLog && <div className="text-red-500 font-mono bg-red-100 p-1.5 rounded">{r.errorLog.slice(0, 200)}</div>}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 shrink-0">{r.executionTime}ms</span>
                                        </div>
                                    ))}
                                </div>
                                {result.passedTests < result.totalTests && (
                                    <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: '#FFF5F7', border: '1px solid #FFD1DC' }}>
                                        <p style={{ color: '#C2185B' }}>💡 ลองแก้ไขโค้ดและส่งใหม่ หรือสร้างโจทย์ใหม่เพื่อฝึกต่อ</p>
                                    </div>
                                )}
                                {result.passedTests === result.totalTests && (
                                    <div className="mt-4 p-3 rounded-xl text-sm bg-green-50 border border-green-200">
                                        <p className="text-green-700">🎉 ยอดเยี่ยม! ผ่านครบทุก test case! ได้รับ +{result.baseScore} คะแนนเต็ม</p>
                                    </div>
                                )}
                                <div className="flex gap-3 mt-4">
                                    <button onClick={handleGenerate} disabled={generating}
                                        className="k-btn-pink px-4 py-2 text-sm flex items-center gap-1 disabled:opacity-50">
                                        🎲 สร้างโจทย์ใหม่
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right: History ──────────────────────────── */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #FFD1DC' }}>
                            <h3 className="font-bold mb-4" style={{ color: '#AD1457' }}>📜 ประวัติการฝึก</h3>
                            {historyLoading ? (
                                <Spinner text="โหลดประวัติ..." />
                            ) : history.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <div className="text-3xl mb-2">📝</div>
                                    <p className="text-sm">ยังไม่มีประวัติ</p>
                                    <p className="text-xs mt-1">สร้างโจทย์แล้วส่งคำตอบ</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Total score summary */}
                                    <div className="rounded-xl p-3 text-center" style={{ background: '#FFF5F7', border: '1px solid #FFD1DC' }}>
                                        <div className="text-2xl font-bold" style={{ color: '#EC407A' }}>
                                            {history.reduce((s, h) => s + (h.actualScore || 0), 0)}
                                        </div>
                                        <div className="text-xs text-gray-500">คะแนนรวมทั้งหมด ({history.length} โจทย์)</div>
                                    </div>

                                    {history.map(h => (
                                        <div key={h.id} className="p-3 rounded-xl" style={{ background: '#FAFAFA', border: '1px solid #E0E0E0' }}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{h.problemTitle}</p>
                                                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                                        <span className="text-xs" style={{ color: diffColor[h.difficulty] }}>● {h.difficulty}</span>
                                                        <span className="text-xs text-gray-400">{LANGUAGES[h.language]?.name}</span>
                                                        {h.topic && <span className="text-xs text-gray-400">{h.topic}</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        {h.passedTests}/{h.totalTests} ผ่าน
                                                        {h.courseTitle && <> · {h.courseTitle}</>}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="font-bold text-sm" style={{ color: scoreColor(h.actualScore, h.baseScore) }}>
                                                        +{h.actualScore}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {h.submittedAt?.toDate ? h.submittedAt.toDate().toLocaleDateString('th-TH') : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* How scoring works */}
                        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #FFD1DC' }}>
                            <h4 className="font-bold mb-3 text-sm" style={{ color: '#AD1457' }}>ℹ️ วิธีคำนวณคะแนน</h4>
                            <div className="space-y-2 text-xs text-gray-600">
                                {[['ง่าย', 50], ['ปานกลาง', 75], ['ยาก', 100]].map(([d, b]) => (
                                    <div key={d} className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#F5F5F5' }}>
                                        <span style={{ color: diffColor[d] }}>● {d}</span>
                                        <span>สูงสุด <strong>{b}</strong> คะแนน</span>
                                    </div>
                                ))}
                                <p className="text-gray-400 mt-2">คะแนน = ระดับ × (ผ่าน / ทั้งหมด)</p>
                                <p className="text-gray-400">Test cases สร้างโดย AI (ซ่อน) ตรวจอัตโนมัติ</p>
                                <p className="text-gray-400">คะแนนส่งไปยังรายวิชาที่เลือก ครูใช้ประกอบการประเมิน</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

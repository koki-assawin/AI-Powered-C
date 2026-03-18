// js/pages/student/CodingWorkspace.js
// Combined: Auto-Grader + AI Practice Lab

const CodingWorkspace = () => {
    const { userDoc } = useAuth();

    // Parse URL params: #/student/workspace?course=XXX&assignment=YYY
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const courseId = params.get('course');
    const assignmentId = params.get('assignment');

    const [course, setCourse] = React.useState(null);
    const [assignments, setAssignments] = React.useState([]);
    const [currentAssignment, setCurrentAssignment] = React.useState(null);
    const [visibleTestCases, setVisibleTestCases] = React.useState([]);
    const [lessons, setLessons] = React.useState([]);

    const [selectedLanguage, setSelectedLanguage] = React.useState('c');
    const [code, setCode] = React.useState(LANGUAGES.c.defaultCode);
    const [activeTab, setActiveTab] = React.useState('workspace'); // 'workspace' | 'description'

    // Grader state
    const [submitting, setSubmitting] = React.useState(false);
    const [sampleRunning, setSampleRunning] = React.useState(false);
    const [gradeResult, setGradeResult] = React.useState(null);
    const [sampleResults, setSampleResults] = React.useState(null);
    const [cooldown, setCooldown] = React.useState(0);

    // AI state
    const [aiAnalyzing, setAiAnalyzing] = React.useState(false);
    const [aiResult, setAiResult] = React.useState(null);
    const [chatHistory, setChatHistory] = React.useState([]);
    const [chatInput, setChatInput] = React.useState('');
    const [chatLoading, setChatLoading] = React.useState(false);

    const [loading, setLoading] = React.useState(true);
    const [view, setView] = React.useState('problems'); // 'problems' | 'grade' | 'ai'

    React.useEffect(() => { if (courseId) loadCourse(); }, [courseId]);
    React.useEffect(() => { if (currentAssignment) loadTestCases(); }, [currentAssignment]);

    // Cooldown timer
    React.useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const loadCourse = async () => {
        setLoading(true);
        try {
            const courseSnap = await db.collection('courses').doc(courseId).get();
            if (!courseSnap.exists) return;
            const c = { id: courseSnap.id, ...courseSnap.data() };
            setCourse(c);
            setSelectedLanguage(c.language || 'c');
            setCode(localStorage.getItem(`draft_${courseId}`) || LANGUAGES[c.language || 'c'].defaultCode);

            const [lessonSnap, assignSnap] = await Promise.all([
                db.collection('lessons').where('courseId', '==', courseId).orderBy('order').get(),
                db.collection('assignments').where('courseId', '==', courseId).get(),
            ]);
            setLessons(lessonSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            const assigns = assignSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAssignments(assigns);

            // Auto-select assignment from URL or first one
            const target = assigns.find(a => a.id === assignmentId) || assigns[0];
            if (target) selectAssignment(target);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const selectAssignment = (assign) => {
        setCurrentAssignment(assign);
        setGradeResult(null);
        setSampleResults(null);
        setAiResult(null);
        setView('problems');
        // Restore draft
        const draft = localStorage.getItem(`draft_${assign.id}`);
        if (draft) setCode(draft);
        else setCode(LANGUAGES[assign.language || selectedLanguage]?.defaultCode || '');
    };

    const loadTestCases = async () => {
        const snap = await db.collection('testCases')
            .where('assignmentId', '==', currentAssignment.id)
            .where('isHidden', '==', false)
            .orderBy('order')
            .get();
        setVisibleTestCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    // Save draft on code change
    React.useEffect(() => {
        if (currentAssignment) {
            localStorage.setItem(`draft_${currentAssignment.id}`, code);
        }
    }, [code]);

    const handleRunSample = async () => {
        if (!currentAssignment) return;
        setSampleRunning(true);
        setSampleResults(null);
        try {
            const results = await runSampleTests(code, selectedLanguage, currentAssignment.id);
            setSampleResults(results);
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการรันโค้ด: ' + err.message);
        } finally {
            setSampleRunning(false);
        }
    };

    const handleSubmit = async () => {
        if (!currentAssignment || !userDoc) return;

        const check = canSubmit(currentAssignment.id);
        if (!check.allowed) {
            setCooldown(check.waitSeconds);
            return;
        }

        setSubmitting(true);
        setGradeResult(null);
        setView('grade');
        try {
            const result = await gradeSubmission(
                userDoc.id, currentAssignment.id, courseId, code, selectedLanguage
            );
            setGradeResult(result);
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
            setView('problems');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAIAnalysis = async () => {
        setAiAnalyzing(true);
        setAiResult(null);
        setView('ai');
        try {
            const result = await analyzeCode(code, selectedLanguage);
            setAiResult(result);
            // Update submission with AI metrics if we have a recent submission
            if (gradeResult?.submissionId) {
                await db.collection('submissions').doc(gradeResult.submissionId).update({
                    aiScore: Math.round(Object.values(result.metrics).reduce((a, b) => a + b, 0) / 5),
                    aiMetrics: result.metrics,
                });
            }
        } catch (err) {
            setAiResult({ status: 'error', feedback: 'เกิดข้อผิดพลาด: ' + err.message });
        } finally {
            setAiAnalyzing(false);
        }
    };

    const handleChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const q = chatInput;
        setChatHistory(h => [...h, { role: 'user', text: q }]);
        setChatInput('');
        setChatLoading(true);
        try {
            const reply = await chatWithAI(q, selectedLanguage);
            setChatHistory(h => [...h, { role: 'bot', text: reply }]);
        } catch (err) {
            setChatHistory(h => [...h, { role: 'bot', text: 'ขออภัย: ' + err.message }]);
        } finally {
            setChatLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8"><Spinner text="กำลังโหลดรายวิชา..." /></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar title={course?.title || 'Coding Workspace'} subtitle={LANGUAGES[selectedLanguage]?.name} />

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Assignment list */}
                <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto hidden lg:block">
                    <div className="p-4">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">โจทย์</h3>
                        {assignments.length === 0 ? (
                            <p className="text-gray-400 text-sm">ยังไม่มีโจทย์</p>
                        ) : assignments.map(a => (
                            <button
                                key={a.id}
                                onClick={() => selectAssignment(a)}
                                className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm transition-colors
                                    ${currentAssignment?.id === a.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                <div className="truncate">{a.title}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                    {a.difficulty} • {a.timeLimit ? `${a.timeLimit/1000}s` : '∞'}
                                </div>
                            </button>
                        ))}

                        {lessons.length > 0 && (
                            <>
                                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3 mt-6">บทเรียน</h3>
                                {lessons.map(l => (
                                    <div key={l.id} className="text-sm text-gray-600 px-3 py-2 rounded hover:bg-gray-50 cursor-pointer">
                                        {l.title}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </aside>

                {/* Main area */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Code Editor Panel */}
                    <div className="flex-1 flex flex-col p-4 min-w-0">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                                {Object.keys(LANGUAGES).map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => setSelectedLanguage(lang)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                            ${selectedLanguage === lang ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                        {LANGUAGES[lang].icon} {LANGUAGES[lang].name}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleRunSample}
                                    disabled={sampleRunning || !currentAssignment}
                                    className="px-4 py-1.5 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center space-x-1"
                                >
                                    {sampleRunning ? <SpinIcon className="w-4 h-4 mr-1" /> : <span>▶</span>}
                                    <span>{sampleRunning ? 'รัน...' : 'ทดสอบตัวอย่าง'}</span>
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || cooldown > 0 || !currentAssignment}
                                    className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50 flex items-center space-x-1"
                                >
                                    {submitting ? <SpinIcon className="w-4 h-4 mr-1" /> : <span>✓</span>}
                                    <span>{cooldown > 0 ? `รอ ${cooldown}s` : submitting ? 'กำลังตรวจ...' : 'Submit'}</span>
                                </button>
                                <button
                                    onClick={handleAIAnalysis}
                                    disabled={aiAnalyzing}
                                    className="px-4 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50 flex items-center space-x-1"
                                >
                                    {aiAnalyzing ? <SpinIcon className="w-4 h-4 mr-1" /> : <span>🤖</span>}
                                    <span>{aiAnalyzing ? 'AI กำลังวิเคราะห์...' : 'AI วิเคราะห์'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1">
                            <CodeEditor
                                value={code}
                                onChange={setCode}
                                language={selectedLanguage}
                                placeholder={`// เขียนโค้ด ${LANGUAGES[selectedLanguage].name} ที่นี่...`}
                                minHeight="calc(100vh - 280px)"
                            />
                        </div>

                        {/* Sample test results */}
                        {sampleResults && (
                            <div className="mt-3 bg-gray-900 rounded-lg p-3 text-sm">
                                <p className="text-gray-300 font-medium mb-2">ผลการทดสอบตัวอย่าง:</p>
                                {sampleResults.map((r, i) => (
                                    <div key={i} className={`mb-2 p-2 rounded ${r.passed ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                                        <span className={r.passed ? 'text-green-400' : 'text-red-400'}>
                                            {r.passed ? '✓ ผ่าน' : '✗ ไม่ผ่าน'} — Test {i + 1} ({r.executionTime}ms)
                                        </span>
                                        {!r.passed && (
                                            <div className="mt-1 text-xs">
                                                <span className="text-gray-400">Expected: </span>
                                                <span className="text-blue-300 font-mono">{r.expectedOutput}</span>
                                                <br />
                                                <span className="text-gray-400">Actual: </span>
                                                <span className="text-yellow-300 font-mono">{r.actualOutput || '(ไม่มี output)'}</span>
                                                {r.errorLog && <div className="text-red-400 mt-1">{r.errorLog}</div>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Panel */}
                    <div className="w-full lg:w-96 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
                        {/* Tab bar */}
                        <div className="flex border-b border-gray-200">
                            {[
                                { key: 'problems', label: '📋 โจทย์' },
                                { key: 'grade', label: '✅ ผลตรวจ' },
                                { key: 'ai', label: '🤖 AI Lab' },
                                { key: 'chat', label: '💬 แชท' },
                            ].map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setView(t.key)}
                                    className={`flex-1 py-3 text-xs font-medium transition-colors
                                        ${view === t.key ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            {/* Problem Description */}
                            {view === 'problems' && currentAssignment && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-gray-800 text-lg">{currentAssignment.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium
                                            ${currentAssignment.difficulty === 'ง่าย' ? 'bg-green-100 text-green-700' :
                                              currentAssignment.difficulty === 'ปานกลาง' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-red-100 text-red-700'}`}>
                                            {currentAssignment.difficulty}
                                        </span>
                                    </div>
                                    <div className="flex space-x-3 text-xs text-gray-500 mb-4">
                                        {currentAssignment.timeLimit && (
                                            <span>⏱ Time: {currentAssignment.timeLimit / 1000}s</span>
                                        )}
                                        {currentAssignment.memoryLimit && (
                                            <span>💾 Memory: {currentAssignment.memoryLimit}MB</span>
                                        )}
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-line mb-6">{currentAssignment.description}</p>

                                    {visibleTestCases.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-gray-700 mb-3">ตัวอย่าง Test Cases (Public)</h4>
                                            {visibleTestCases.map((tc, i) => (
                                                <div key={tc.id} className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-100">
                                                    <p className="text-xs font-medium text-gray-600 mb-2">Test {i + 1}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-1">Input:</p>
                                                            <pre className="bg-gray-800 text-green-300 p-2 rounded text-xs font-mono overflow-x-auto">
                                                                {tc.input || '(ไม่มี input)'}
                                                            </pre>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-1">Expected:</p>
                                                            <pre className="bg-gray-800 text-blue-300 p-2 rounded text-xs font-mono overflow-x-auto">
                                                                {tc.expectedOutput}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedLanguage === 'java' && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4 text-xs text-yellow-800">
                                            ⚠️ Java: ต้องใช้ชื่อ class ว่า <code className="font-mono">Main</code> เท่านั้น
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Grade Results */}
                            {view === 'grade' && (
                                <div>
                                    {submitting && (
                                        <div className="text-center py-8">
                                            <Spinner text="กำลังตรวจ Test Cases..." />
                                        </div>
                                    )}
                                    {!submitting && !gradeResult && (
                                        <div className="text-center py-8 text-gray-400">
                                            <div className="text-4xl mb-2">📝</div>
                                            <p>กด Submit เพื่อดูผลการตรวจ</p>
                                        </div>
                                    )}
                                    {gradeResult && (
                                        <div>
                                            <div className={`rounded-xl p-4 mb-4 text-center
                                                ${gradeResult.status === 'accepted' ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                                                <div className="text-3xl mb-1">
                                                    {STATUS_LABELS[gradeResult.status]?.icon}
                                                </div>
                                                <div className="font-bold text-lg text-gray-800">
                                                    {STATUS_LABELS[gradeResult.status]?.text}
                                                </div>
                                                <div className="text-3xl font-bold mt-2" style={{
                                                    color: gradeResult.score >= 80 ? '#16a34a' : gradeResult.score >= 50 ? '#d97706' : '#dc2626'
                                                }}>
                                                    {gradeResult.score}%
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    ผ่าน {gradeResult.passedTests}/{gradeResult.totalTests} Test Cases
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-gray-700 mb-3">รายละเอียดแต่ละ Test Case:</h4>
                                            {gradeResult.testResults.map((r, i) => (
                                                <div key={i} className={`p-3 rounded-lg mb-2 border ${r.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-sm font-medium ${r.passed ? 'text-green-700' : 'text-red-700'}`}>
                                                            {r.passed ? '✓' : '✗'} Test {i + 1}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{r.executionTime}ms</span>
                                                    </div>
                                                    {!r.passed && (
                                                        <div className="text-xs mt-2 space-y-1">
                                                            <div>
                                                                <span className="text-gray-500">คาดหวัง: </span>
                                                                <code className="text-blue-600">{r.expectedOutput}</code>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">ได้รับ: </span>
                                                                <code className="text-red-600">{r.actualOutput || '(ไม่มี output)'}</code>
                                                            </div>
                                                            {r.errorLog && (
                                                                <div className="text-red-500 bg-red-50 p-2 rounded mt-1 font-mono text-xs">
                                                                    {r.errorLog}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AI Analysis */}
                            {view === 'ai' && (
                                <div>
                                    {aiAnalyzing && <Spinner text="AI กำลังวิเคราะห์โค้ด..." />}
                                    {!aiAnalyzing && !aiResult && (
                                        <div className="text-center py-8 text-gray-400">
                                            <div className="text-4xl mb-2">🤖</div>
                                            <p>กด "AI วิเคราะห์" เพื่อรับคำแนะนำเชิงลึก</p>
                                        </div>
                                    )}
                                    {aiResult && <RadarChart analysis={aiResult} language={selectedLanguage} />}
                                </div>
                            )}

                            {/* Chatbot */}
                            {view === 'chat' && (
                                <div className="flex flex-col h-full" style={{ minHeight: '400px' }}>
                                    <div className="flex-1 overflow-y-auto space-y-3 mb-3" style={{ maxHeight: '350px' }}>
                                        {chatHistory.length === 0 && (
                                            <div className="text-center text-gray-400 text-sm py-8">
                                                👋 ถามคำถามเกี่ยวกับ {LANGUAGES[selectedLanguage].name} ได้เลย
                                            </div>
                                        )}
                                        {chatHistory.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-xs p-3 rounded-2xl text-sm whitespace-pre-line
                                                    ${msg.role === 'user'
                                                        ? 'bg-blue-500 text-white rounded-br-none'
                                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                        {chatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-none">
                                                    <SpinIcon className="w-4 h-4 text-gray-500" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <form onSubmit={handleChat} className="flex space-x-2">
                                        <input
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            disabled={chatLoading}
                                            placeholder="ถามคำถาม..."
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={chatLoading || !chatInput.trim()}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                                        >
                                            ส่ง
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

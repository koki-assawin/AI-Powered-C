// js/pages/shared/FreeEditor.js — Standalone Code Editor v5.9
// Wandbox API · CodeMirror · AI Analysis · Interactive Terminal · File Import

const FreeEditor = () => {
    const { role } = useAuth();

    const STARTERS = {
        c:      `#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}`,
        cpp:    `#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}`,
        python: `# เขียนโค้ด Python ที่นี่\n\n`,
    };
    const EXTENSIONS       = { c: 'c', cpp: 'cpp', python: 'py' };
    const LANG_LABELS      = { c: 'C', cpp: 'C++', python: 'Python' };
    const WANDBOX_COMPILER = { c: 'gcc-head', cpp: 'gcc-head', python: 'cpython-3.12.0' };
    const WANDBOX_OPTIONS  = { c: '-x c', cpp: '', python: '' };

    const INPUT_PATTERNS = {
        c:      [/\bscanf\s*\(/, /\bfgets\s*\(/, /\bgets\s*\(/, /\bgetchar\s*\(/, /\bgetc\s*\(/],
        cpp:    [/\bcin\s*>>/, /\bgetline\s*\(/, /\bgetchar\s*\(/],
        python: [/\binput\s*\(/],
    };

    // Count input calls (strips comments to avoid false positives)
    const countInputCalls = (src, lang) => {
        const stripped = src
            .replace(/\/\/[^\n]*/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/#[^\n]*/g, '');
        const pat = {
            c:      [/\bscanf\s*\(/g, /\bfgets\s*\(/g, /\bgets\s*\(/g, /\bgetchar\s*\(/g],
            cpp:    [/\bcin\s*>>/g, /\bgetline\s*\(/g],
            python: [/\binput\s*\(/g],
        };
        return (pat[lang] || []).reduce((n, p) => n + (stripped.match(p) || []).length, 0);
    };

    // ── State ───────────────────────────────────────────────────────────────
    const [language,         setLanguage]         = React.useState('c');
    const [code,             setCode]             = React.useState(STARTERS.c);
    const [output,           setOutput]           = React.useState('');
    const [running,          setRunning]          = React.useState(false);
    const [runStatus,        setRunStatus]        = React.useState(null);
    const [execTime,         setExecTime]         = React.useState(null);
    const [filename,         setFilename]         = React.useState('main');
    const [fontSize,         setFontSize]         = React.useState(14);
    const [copied,           setCopied]           = React.useState(false);
    const [aiText,           setAiText]           = React.useState('');
    const [analyzing,        setAnalyzing]        = React.useState(false);
    const [showAI,           setShowAI]           = React.useState(false);
    // Interactive stdin collection
    const [collecting,       setCollecting]       = React.useState(false);
    const [collectedLines,   setCollectedLines]   = React.useState([]);
    const [currentLine,      setCurrentLine]      = React.useState('');
    const [inputCount,       setInputCount]       = React.useState(0);
    const [echoedLines,      setEchoedLines]      = React.useState([]); // shown above output

    const fileInputRef  = React.useRef(null);
    const inputLineRef  = React.useRef(null);
    const prevLangRef   = React.useRef('c');

    const codeNeedsInput = React.useMemo(
        () => (INPUT_PATTERNS[language] || []).some(p => p.test(code)),
        [code, language]
    );

    // ── Language change ─────────────────────────────────────────────────────
    const handleLanguageChange = (lang) => {
        if (code === STARTERS[prevLangRef.current] || code.trim() === '') setCode(STARTERS[lang]);
        prevLangRef.current = lang;
        setLanguage(lang);
        resetTerminal();
        setAiText(''); setShowAI(false);
    };

    const resetTerminal = () => {
        setOutput(''); setRunStatus(null); setExecTime(null);
        setCollecting(false); setCollectedLines([]); setCurrentLine(''); setEchoedLines([]);
    };

    // ── Core run (sends code + pre-collected stdin to Wandbox) ──────────────
    const runCodeCore = async (stdinStr, echo) => {
        setRunning(true);
        setOutput(''); setRunStatus(null); setExecTime(null);
        setEchoedLines(echo || []);
        const t0 = Date.now();
        try {
            const body = { compiler: WANDBOX_COMPILER[language] || 'gcc-head', code, stdin: stdinStr || '' };
            if (WANDBOX_OPTIONS[language]) body.options = WANDBOX_OPTIONS[language];
            const res = await fetch('https://wandbox.org/api/compile.json', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setExecTime(Date.now() - t0);
            const compErr = (data.compiler_error || '').trim();
            const progOut = (data.program_output || '').trimEnd();
            const progErr = (data.program_error  || '').trim();
            if (compErr) { setOutput(compErr); setRunStatus('error'); }
            else {
                setOutput([progOut, progErr].filter(Boolean).join('\n') || '(ไม่มี Output)');
                setRunStatus(progErr ? 'error' : 'ok');
            }
        } catch (err) {
            setOutput(`⚠️ เชื่อมต่อ Wandbox ไม่ได้: ${err.message}`);
            setRunStatus('error'); setExecTime(Date.now() - t0);
        } finally { setRunning(false); }
    };

    // ── Run button entry point ──────────────────────────────────────────────
    const handleRunClick = () => {
        if (running || collecting) return;
        if (codeNeedsInput) {
            // Enter interactive collection mode
            resetTerminal();
            const n = countInputCalls(code, language);
            setInputCount(n);
            setCollecting(true);
            setTimeout(() => inputLineRef.current && inputLineRef.current.focus(), 60);
        } else {
            resetTerminal();
            runCodeCore('', []);
        }
    };

    // ── Interactive input: user presses Enter on a line ─────────────────────
    const submitLine = () => {
        const line = currentLine;
        const newLines = [...collectedLines, line];
        setCollectedLines(newLines);
        setCurrentLine('');
        // Auto-run when expected count reached
        if (inputCount > 0 && newLines.length >= inputCount) {
            finishCollecting(newLines);
        } else {
            setTimeout(() => inputLineRef.current && inputLineRef.current.focus(), 10);
        }
    };

    const finishCollecting = (lines) => {
        setCollecting(false);
        runCodeCore(lines.join('\n'), lines);
    };

    // ── AI Code Analysis ────────────────────────────────────────────────────
    const analyzeCode = async () => {
        if (analyzing || !code.trim()) return;
        if (!GEMINI_KEY) { alert('ไม่พบ Gemini API Key — กรุณาตั้งค่าใน Admin'); return; }
        setAnalyzing(true); setShowAI(true); setAiText('');
        try {
            const outputSection = output ? `\nผลลัพธ์:\n\`\`\`\n${output}\n\`\`\`` : '';
            const prompt = `วิเคราะห์โค้ด ${LANG_LABELS[language]} ต่อไปนี้อย่างละเอียด (ตอบเป็นภาษาไทย):\n\n\`\`\`${language}\n${code}\n\`\`\`${outputSection}\n\nวิเคราะห์ใน 4 หัวข้อ:\n1. 📋 สรุปสิ่งที่โค้ดทำ\n2. 🐛 จุดที่อาจเป็นปัญหาหรือ bug\n3. ✨ คำแนะนำการปรับปรุงโค้ด\n4. ⭐ ประเมินคุณภาพโค้ด (1-10)`;
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
            );
            const data = await res.json();
            setAiText(data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถวิเคราะห์ได้');
        } catch (err) { setAiText('❌ เกิดข้อผิดพลาด: ' + err.message); }
        finally { setAnalyzing(false); }
    };

    // ── File / misc helpers ─────────────────────────────────────────────────
    const downloadCode = () => {
        const name = (filename.trim() || 'main').replace(/[^a-zA-Z0-9_\-ก-๙]/g, '_');
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${name}.${EXTENSIONS[language]}`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };
    const copyCode   = () => { navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
    const formatCode = () => { if (typeof formatCCode === 'function') setCode(formatCCode(code, language)); };

    const EXT_TO_LANG = { c: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', py: 'python' };
    const openFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        const detectedLang = EXT_TO_LANG[ext];
        const reader = new FileReader();
        reader.onload = (ev) => {
            setCode(ev.target.result);
            setFilename(file.name.replace(/\.[^.]+$/, ''));
            if (detectedLang && detectedLang !== language) {
                prevLangRef.current = detectedLang;
                setLanguage(detectedLang);
            }
            resetTerminal();
            setAiText(''); setShowAI(false);
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    };

    // ── Style helpers ────────────────────────────────────────────────────────
    const isTeacher = role === 'teacher' || role === 'admin';
    const bg = '#0f172a', panel = '#1e293b', border = '#334155';
    const accent = isTeacher ? '#ec4899' : '#6366f1';
    const btn = (extra = {}) => ({
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 14px', borderRadius: 8, border: 'none',
        cursor: 'pointer', fontFamily: "'Prompt', sans-serif",
        fontSize: 13, fontWeight: 600, transition: 'opacity .15s', ...extra,
    });
    const MONO = { fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 13, lineHeight: 1.7 };

    // ── Terminal panel ───────────────────────────────────────────────────────
    const renderTerminal = () => {
        const termStyle = {
            flex: 1, background: '#020617', borderRadius: 12, display: 'flex',
            flexDirection: 'column', overflow: 'hidden', minHeight: 0,
            border: `1px solid ${output
                ? (runStatus === 'error' ? '#f8717166' : '#34d39966')
                : (collecting ? '#fbbf2466' : border)}`,
        };

        const termHeader = (
            <div style={{ padding: '7px 14px', borderBottom: '1px solid #0f172a', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                <span style={{ marginLeft: 8, ...MONO, fontSize: 11, color: '#475569' }}>
                    {filename || 'main'}.{EXTENSIONS[language]}
                </span>
                {output && execTime !== null && (
                    <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>{execTime} ms</span>
                )}
                {output && (
                    <button onClick={resetTerminal}
                        style={{ marginLeft: output && execTime !== null ? 8 : 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12 }}>
                        ↺ รันใหม่
                    </button>
                )}
            </div>
        );

        // ── State 1: Collecting interactive input ───────────────────────────
        if (collecting) return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', ...MONO, overflowY: 'auto' }}>
                    {/* Program start line */}
                    <div style={{ color: '#475569', marginBottom: 2 }}>
                        <span style={{ color: '#34d399' }}>$ </span>
                        ./{filename || 'main'}.{EXTENSIONS[language]}
                    </div>

                    {/* Previously entered lines (echoed) */}
                    {collectedLines.map((line, i) => (
                        <div key={i} style={{ color: '#e2e8f0' }}>{line}</div>
                    ))}

                    {/* Active input line */}
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                        <input
                            ref={inputLineRef}
                            type="text"
                            value={currentLine}
                            onChange={e => setCurrentLine(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitLine(); } }}
                            autoComplete="off" spellCheck="false"
                            style={{
                                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                color: '#e2e8f0', ...MONO, padding: 0, caretColor: '#34d399',
                            }}
                        />
                        <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#34d399', animation: 'termBlink 1s step-start infinite', flexShrink: 0 }} />
                    </div>

                    {/* Bottom hint */}
                    <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#475569' }}>
                            {inputCount > 0
                                ? `รอรับค่า ${collectedLines.length + 1} / ${inputCount} — กด Enter เพื่อยืนยัน`
                                : 'พิมพ์ค่าแล้วกด Enter · กด ▶ รัน เมื่อกรอกครบ'}
                        </span>
                        <button onClick={() => finishCollecting([...collectedLines, ...(currentLine ? [currentLine] : [])])}
                            style={{ ...btn({ background: accent, color: '#fff', padding: '4px 12px', fontSize: 12 }), marginLeft: 'auto' }}>
                            ▶ รัน
                        </button>
                        <button onClick={resetTerminal}
                            style={btn({ background: 'transparent', color: '#64748b', border: `1px solid ${border}`, padding: '4px 10px', fontSize: 11 })}>
                            ✕ ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        );

        // ── State 2: Running ────────────────────────────────────────────────
        if (running) return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', ...MONO, color: '#94a3b8' }}>
                    <span style={{ color: '#34d399' }}>$ </span>
                    <span>กำลังประมวลผล...</span>
                    <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#34d399', marginLeft: 4, verticalAlign: 'middle', animation: 'termBlink 1s step-start infinite' }} />
                </div>
            </div>
        );

        // ── State 3: Has output ─────────────────────────────────────────────
        if (output) return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', ...MONO, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {/* Program start line */}
                    <div style={{ color: '#475569', marginBottom: 2 }}>
                        <span style={{ color: '#34d399' }}>$ </span>
                        ./{filename || 'main'}.{EXTENSIONS[language]}
                    </div>
                    {/* Echo stdin lines exactly like a real terminal */}
                    {echoedLines.map((line, i) => (
                        <div key={i} style={{ color: '#e2e8f0' }}>{line}</div>
                    ))}
                    {/* Program output */}
                    <div style={{ color: runStatus === 'error' ? '#f87171' : '#e2e8f0' }}>{output}</div>
                    {/* Execution info */}
                    {execTime !== null && (
                        <div style={{ marginTop: 8, color: '#475569', fontSize: 12 }}>
                            Process returned 0 &nbsp;·&nbsp; execution time: {(execTime / 1000).toFixed(3)} s
                        </div>
                    )}
                </div>
            </div>
        );

        // ── State 4: Idle ───────────────────────────────────────────────────
        return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                    <div style={{ ...MONO, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#34d399' }}>$</span>
                        <span>กด </span>
                        <span style={{ color: accent, fontWeight: 700 }}>▶ รันโค้ด</span>
                        <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#475569', animation: 'termBlink 1s step-start infinite', verticalAlign: 'middle', marginLeft: 2 }} />
                    </div>
                    {codeNeedsInput && (
                        <div style={{ fontSize: 12, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>⌨️</span>
                            <span>โค้ดนี้ต้องการ Input — เมื่อกด ▶ รัน จะเปิด terminal รอรับค่าอัตโนมัติ</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: bg, color: '#f1f5f9', fontFamily: "'Prompt', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <style>{`
                @keyframes termBlink { 0%,100%{opacity:1} 50%{opacity:0} }
                .fe-editor-wrap .CodeMirror,
                .fe-editor-wrap .CodeMirror-scroll { font-size: ${fontSize}px !important; line-height: 1.6 !important; }
            `}</style>
            <Navbar title={isTeacher ? 'Code Editor — ครู' : 'Code Editor — นักเรียน'}
                    subtitle={isTeacher ? 'เขียนและสาธิตโค้ดให้นักเรียน' : 'เขียนโค้ดทดลองและดาวน์โหลด'} />

            {/* ── Toolbar ── */}
            <div style={{ background: panel, borderBottom: `1px solid ${border}`, padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <select value={language} onChange={e => handleLanguageChange(e.target.value)}
                    style={{ background: bg, color: '#f1f5f9', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 10px', fontFamily: "'Prompt',sans-serif", fontSize: 13, cursor: 'pointer', outline: 'none' }}>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="python">Python</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input value={filename} onChange={e => setFilename(e.target.value)} placeholder="ชื่อไฟล์"
                        style={{ background: bg, color: '#f1f5f9', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 10px', fontFamily: "'Prompt',sans-serif", fontSize: 13, width: 110, outline: 'none' }} />
                    <span style={{ color: '#64748b', fontSize: 13 }}>.{EXTENSIONS[language]}</span>
                </div>

                <div style={{ flex: 1 }} />

                {/* A- / A+ */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => setFontSize(f => Math.max(10, f - 1))}
                        style={btn({ background: bg, color: '#94a3b8', border: `1px solid ${border}`, padding: '5px 10px' })}>A−</button>
                    <span style={{ fontSize: 12, color: '#64748b', minWidth: 24, textAlign: 'center' }}>{fontSize}</span>
                    <button onClick={() => setFontSize(f => Math.min(24, f + 1))}
                        style={btn({ background: bg, color: '#94a3b8', border: `1px solid ${border}`, padding: '5px 10px' })}>A+</button>
                </div>

                {language !== 'python' && (
                    <button onClick={formatCode} style={btn({ background: bg, color: '#94a3b8', border: `1px solid ${border}` })}>✨ จัดรูปแบบ</button>
                )}

                <button onClick={analyzeCode} disabled={analyzing}
                    style={btn({ background: analyzing ? '#475569' : '#7c3aed', color: '#fff', opacity: analyzing ? 0.7 : 1 })}>
                    {analyzing ? '⏳ วิเคราะห์...' : '🤖 วิเคราะห์โค้ด AI'}
                </button>

                <input ref={fileInputRef} type="file" accept=".c,.cpp,.cc,.cxx,.py,.txt"
                    style={{ display: 'none' }} onChange={openFile} />
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={btn({ background: bg, color: '#fbbf24', border: '1px solid #fbbf24' })}>
                    📂 เปิดไฟล์
                </button>

                <button onClick={copyCode}
                    style={btn({ background: copied ? '#10b981' : bg, color: copied ? '#fff' : '#94a3b8', border: `1px solid ${copied ? '#10b981' : border}` })}>
                    {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
                </button>

                <button onClick={downloadCode} style={btn({ background: bg, color: '#34d399', border: '1px solid #34d399' })}>
                    💾 ดาวน์โหลด .{EXTENSIONS[language]}
                </button>

                <button onClick={handleRunClick} disabled={running || collecting}
                    style={btn({ background: (running || collecting) ? '#475569' : accent, color: '#fff', opacity: (running || collecting) ? 0.7 : 1, minWidth: 96 })}>
                    {running ? '⏳ กำลังรัน...' : collecting ? '⌨️ รอรับค่า...' : '▶ รันโค้ด'}
                </button>
            </div>

            {/* ── Main area ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12, minHeight: 0 }}>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 420 }}>
                    {/* Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>📝 Editor — {LANG_LABELS[language]}</span>
                            <span style={{ color: '#334155' }}>Shift+Alt+F: Format · Ctrl+/: Comment</span>
                        </div>
                        <div className="fe-editor-wrap" style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: `1px solid ${border}` }}>
                            <CodeEditor value={code} onChange={setCode} language={language}
                                fontSize={fontSize} minHeight="100%"
                                placeholder={`// เขียนโค้ด ${LANG_LABELS[language]} ที่นี่`} />
                        </div>
                    </div>

                    {/* Terminal */}
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📟 Terminal</span>
                            {collecting && <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 11 }}>⌨️ รอรับ Input</span>}
                            {output && <span style={{ color: runStatus === 'error' ? '#f87171' : '#34d399', fontWeight: 600 }}>{runStatus === 'error' ? '❌ Error' : '✅ Output'}</span>}
                        </div>
                        {renderTerminal()}
                    </div>
                </div>

                {/* AI Analysis panel */}
                {showAI && (
                    <div style={{ background: '#1e1b4b', borderRadius: 12, border: '1px solid #7c3aed55', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #312e8188', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>🤖 AI วิเคราะห์โค้ด — {LANG_LABELS[language]}</span>
                            <button onClick={() => setShowAI(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 15 }}>✕</button>
                        </div>
                        <div style={{ padding: '14px 18px', maxHeight: 320, overflowY: 'auto' }}>
                            {analyzing
                                ? <div style={{ color: '#7c3aed', fontSize: 13 }}>⏳ Gemini กำลังวิเคราะห์...</div>
                                : <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{aiText}</div>
                            }
                        </div>
                    </div>
                )}

                {/* Shortcuts bar */}
                <div style={{ background: panel, borderRadius: 10, padding: '9px 16px', display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
                    <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>⌨️ Shortcuts:</span>
                    {[['Ctrl+Space','Autocomplete'],['Shift+Alt+F','จัดรูปแบบ'],['Ctrl+/','Comment'],['Ctrl+D','Duplicate'],['Ctrl+Shift+K','ลบบรรทัด'],['Alt+↑↓','ย้ายบรรทัด']].map(([k,d]) => (
                        <span key={k} style={{ fontSize: 11, color: '#475569' }}>
                            <kbd style={{ background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '1px 5px', color: '#94a3b8', fontFamily: 'monospace' }}>{k}</kbd> {d}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

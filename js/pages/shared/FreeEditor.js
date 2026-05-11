// js/pages/shared/FreeEditor.js — Standalone Code Editor v5.5
// Wandbox API · CodeMirror · AI Analysis · Interactive Terminal

const FreeEditor = () => {
    const { role } = useAuth();

    const STARTERS = {
        c:      `#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}`,
        cpp:    `#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}`,
        python: `# เขียนโค้ด Python ที่นี่\n\n`,
    };
    const EXTENSIONS      = { c: 'c', cpp: 'cpp', python: 'py' };
    const LANG_LABELS     = { c: 'C', cpp: 'C++', python: 'Python' };
    const WANDBOX_COMPILER = { c: 'gcc-head', cpp: 'gcc-head', python: 'cpython-3.12.0' };
    const WANDBOX_OPTIONS  = { c: '-x c', cpp: '', python: '' };

    // Patterns that indicate the program reads stdin
    const INPUT_PATTERNS = {
        c:      [/\bscanf\s*\(/, /\bfgets\s*\(/, /\bgets\s*\(/, /\bgetchar\s*\(/, /\bgetc\s*\(/],
        cpp:    [/\bcin\s*>>/, /\bgetline\s*\(/, /\bgetchar\s*\(/],
        python: [/\binput\s*\(/],
    };

    const [language,  setLanguage]  = React.useState('c');
    const [code,      setCode]      = React.useState(STARTERS.c);
    const [stdin,     setStdin]     = React.useState('');
    const [output,    setOutput]    = React.useState('');
    const [running,   setRunning]   = React.useState(false);
    const [runStatus, setRunStatus] = React.useState(null); // 'ok'|'error'|null
    const [execTime,  setExecTime]  = React.useState(null);
    const [filename,  setFilename]  = React.useState('main');
    const [fontSize,  setFontSize]  = React.useState(14);
    const [copied,    setCopied]    = React.useState(false);
    const [aiText,    setAiText]    = React.useState('');
    const [analyzing, setAnalyzing] = React.useState(false);
    const [showAI,    setShowAI]    = React.useState(false);

    const editorWrapRef = React.useRef(null);
    const prevLangRef   = React.useRef('c');

    // ── Detect if code reads stdin ──────────────────────────────────────────
    const codeNeedsInput = React.useMemo(() => {
        return (INPUT_PATTERNS[language] || []).some(p => p.test(code));
    }, [code, language]);

    // ── Fix: font size → find CM instance via DOM and call refresh() ────────
    React.useEffect(() => {
        if (!editorWrapRef.current) return;
        const cmEl = editorWrapRef.current.querySelector('.CodeMirror');
        if (!cmEl) return;
        cmEl.style.fontSize   = fontSize + 'px';
        cmEl.style.lineHeight = '1.6';
        if (cmEl.CodeMirror) cmEl.CodeMirror.refresh();
    }, [fontSize]);

    // ── Language change ─────────────────────────────────────────────────────
    const handleLanguageChange = (lang) => {
        if (code === STARTERS[prevLangRef.current] || code.trim() === '') setCode(STARTERS[lang]);
        prevLangRef.current = lang;
        setLanguage(lang);
        setOutput(''); setRunStatus(null); setStdin('');
        setAiText(''); setShowAI(false);
    };

    // ── Run via Wandbox ─────────────────────────────────────────────────────
    const runCode = async () => {
        if (running) return;
        setRunning(true); setOutput(''); setRunStatus(null); setExecTime(null);
        const t0 = Date.now();
        try {
            const body = { compiler: WANDBOX_COMPILER[language] || 'gcc-head', code, stdin };
            if (WANDBOX_OPTIONS[language]) body.options = WANDBOX_OPTIONS[language];
            const res  = await fetch('https://wandbox.org/api/compile.json', {
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

    // ── AI Code Analysis ────────────────────────────────────────────────────
    const analyzeCode = async () => {
        if (analyzing || !code.trim()) return;
        if (!GEMINI_KEY) { alert('ไม่พบ Gemini API Key — กรุณาตั้งค่าใน Admin'); return; }
        setAnalyzing(true); setShowAI(true); setAiText('');
        try {
            const outputSection = output ? `\nผลลัพธ์ที่ได้จากการรัน:\n\`\`\`\n${output}\n\`\`\`` : '';
            const prompt = `วิเคราะห์โค้ด ${LANG_LABELS[language]} ต่อไปนี้อย่างละเอียด (ตอบเป็นภาษาไทย):\n\n\`\`\`${language}\n${code}\n\`\`\`${outputSection}\n\nวิเคราะห์ใน 4 หัวข้อ:\n1. 📋 สรุปสิ่งที่โค้ดทำ (2-3 ประโยค)\n2. 🐛 จุดที่อาจเป็นปัญหาหรือ bug (ถ้าไม่มีให้บอก "ไม่พบ")\n3. ✨ คำแนะนำการปรับปรุงโค้ด\n4. ⭐ ประเมินคุณภาพโค้ด (1-10) พร้อมเหตุผลสั้นๆ`;
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

    // ── Helpers ─────────────────────────────────────────────────────────────
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
    const clearAll   = () => { setOutput(''); setRunStatus(null); setExecTime(null); };

    const isTeacher = role === 'teacher' || role === 'admin';
    const bg = '#0f172a', panel = '#1e293b', border = '#334155';
    const accent = isTeacher ? '#ec4899' : '#6366f1';

    const btn = (extra = {}) => ({
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 14px', borderRadius: 8, border: 'none',
        cursor: 'pointer', fontFamily: "'Prompt', sans-serif",
        fontSize: 13, fontWeight: 600, transition: 'opacity .15s', ...extra,
    });

    // ── Terminal panel ───────────────────────────────────────────────────────
    const renderTerminal = () => {
        const termStyle = {
            flex: 1, background: '#020617', borderRadius: 12, display: 'flex',
            flexDirection: 'column', overflow: 'hidden', minHeight: 0,
            border: `1px solid ${output ? (runStatus === 'error' ? '#f8717155' : '#34d39955') : border}`,
        };
        const termHeader = (
            <div style={{ padding: '7px 14px', borderBottom: '1px solid #0f172a', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                <span style={{ marginLeft: 8, fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                    {filename || 'main'}.{EXTENSIONS[language]}
                </span>
                {output && (
                    <button onClick={clearAll} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12 }}>✕ ล้าง</button>
                )}
                {output && execTime !== null && (
                    <span style={{ fontSize: 11, color: '#475569', marginLeft: output ? 0 : 'auto' }}>{execTime} ms</span>
                )}
            </div>
        );

        // Running state
        if (running) return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#94a3b8' }}>
                    <span style={{ color: '#34d399' }}>$ </span>
                    <span style={{ color: '#e2e8f0' }}>กำลังประมวลผล...</span>
                    <span style={{ display: 'inline-block', width: 8, height: 14, background: '#34d399', marginLeft: 4, verticalAlign: 'middle', animation: 'termBlink 1s step-start infinite' }} />
                </div>
            </div>
        );

        // Has output
        if (output) return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: runStatus === 'error' ? '#f87171' : '#e2e8f0' }}>
                    {/* Show stdin lines as typed input */}
                    {stdin.trim() && stdin.trim().split('\n').map((line, i) => (
                        <div key={i} style={{ color: '#64748b' }}>
                            <span style={{ color: '#475569', userSelect: 'none' }}>{'> '}</span>{line}
                        </div>
                    ))}
                    {stdin.trim() && <div style={{ marginBottom: 6 }} />}
                    <span style={{ color: runStatus === 'error' ? '#f87171' : '#e2e8f0' }}>{output}</span>
                </div>
            </div>
        );

        // Idle state
        return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* stdin input area — shown automatically when code needs it */}
                    {codeNeedsInput && (
                        <div>
                            <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ display: 'inline-block', width: 7, height: 14, background: '#fbbf24', animation: 'termBlink 1s step-start infinite', verticalAlign: 'middle' }} />
                                โปรแกรมนี้ต้องการ Input — กรอกค่าก่อนรัน (แต่ละบรรทัด = 1 ค่า)
                            </div>
                            <textarea
                                value={stdin}
                                onChange={e => setStdin(e.target.value)}
                                placeholder={'เช่น:\n5\nhello world'}
                                rows={4}
                                style={{
                                    width: '100%', background: '#0f172a', color: '#34d399',
                                    border: '1px solid #334155', borderRadius: 8,
                                    padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: 13, resize: 'vertical', outline: 'none',
                                    boxSizing: 'border-box', lineHeight: 1.6, caretColor: '#34d399',
                                }}
                            />
                        </div>
                    )}

                    {/* Prompt line */}
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#34d399' }}>$</span>
                        <span style={{ color: '#64748b' }}>{codeNeedsInput ? 'พร้อมรัน — กด ' : 'กด '}</span>
                        <span style={{ color: accent, fontWeight: 700 }}>▶ รันโค้ด</span>
                        {!codeNeedsInput && (
                            <span style={{ display: 'inline-block', width: 8, height: 14, background: '#475569', animation: 'termBlink 1s step-start infinite', verticalAlign: 'middle', marginLeft: 4 }} />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: bg, color: '#f1f5f9', fontFamily: "'Prompt', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <style>{`@keyframes termBlink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
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

                {/* A- / A+ font size — fixed */}
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

                {/* AI Analysis */}
                <button onClick={analyzeCode} disabled={analyzing}
                    style={btn({ background: analyzing ? '#475569' : '#7c3aed', color: '#fff', opacity: analyzing ? 0.7 : 1 })}>
                    {analyzing ? '⏳ วิเคราะห์...' : '🤖 วิเคราะห์โค้ด AI'}
                </button>

                <button onClick={copyCode}
                    style={btn({ background: copied ? '#10b981' : bg, color: copied ? '#fff' : '#94a3b8', border: `1px solid ${copied ? '#10b981' : border}` })}>
                    {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
                </button>

                <button onClick={downloadCode} style={btn({ background: bg, color: '#34d399', border: '1px solid #34d399' })}>
                    💾 ดาวน์โหลด .{EXTENSIONS[language]}
                </button>

                <button onClick={runCode} disabled={running}
                    style={btn({ background: running ? '#475569' : accent, color: '#fff', opacity: running ? 0.7 : 1, minWidth: 96 })}>
                    {running ? '⏳ กำลังรัน...' : '▶ รันโค้ด'}
                </button>
            </div>

            {/* ── Main area ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12, minHeight: 0 }}>

                {/* Editor + Terminal — always 50/50 split */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 420 }}>

                    {/* Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>📝 Editor — {LANG_LABELS[language]}</span>
                            <span style={{ color: '#334155' }}>Shift+Alt+F: Format · Ctrl+/: Comment</span>
                        </div>
                        <div ref={editorWrapRef} className="free-editor-wrap"
                            style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: `1px solid ${border}` }}>
                            <CodeEditor value={code} onChange={setCode} language={language}
                                minHeight="100%" placeholder={`// เขียนโค้ด ${LANG_LABELS[language]} ที่นี่`} />
                        </div>
                    </div>

                    {/* Terminal */}
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📟 Terminal</span>
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

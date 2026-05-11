// js/pages/shared/FreeEditor.js — Standalone Code Editor (Teacher + Student)
// Wandbox API for running, CodeMirror for editing, download as file

const FreeEditor = () => {
    const { role } = useAuth();

    const STARTERS = {
        c: `#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}`,
        cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}`,
        python: `# เขียนโค้ด Python ที่นี่\n\n`,
    };

    const EXTENSIONS = { c: 'c', cpp: 'cpp', python: 'py' };
    const LANG_LABELS = { c: 'C', cpp: 'C++', python: 'Python' };

    const WANDBOX_COMPILER = { c: 'gcc-head', cpp: 'gcc-head', python: 'cpython-3.12.0' };
    const WANDBOX_OPTIONS  = { c: '-x c', cpp: '', python: '' };

    const [language, setLanguage] = React.useState('c');
    const [code, setCode]         = React.useState(STARTERS.c);
    const [stdin, setStdin]       = React.useState('');
    const [output, setOutput]     = React.useState('');
    const [running, setRunning]   = React.useState(false);
    const [runStatus, setRunStatus] = React.useState(null); // 'ok'|'error'|null
    const [execTime, setExecTime] = React.useState(null);
    const [filename, setFilename] = React.useState('main');
    const [fontSize, setFontSize] = React.useState(14);
    const [showStdin, setShowStdin] = React.useState(false);
    const [copied, setCopied]     = React.useState(false);

    // Sync language → starter code only when language changes and code is still a starter
    const prevLangRef = React.useRef('c');
    const handleLanguageChange = (lang) => {
        if (code === STARTERS[prevLangRef.current] || code.trim() === '') {
            setCode(STARTERS[lang]);
        }
        prevLangRef.current = lang;
        setLanguage(lang);
        setOutput('');
        setRunStatus(null);
    };

    // Apply font size to CodeMirror DOM
    React.useEffect(() => {
        const el = document.querySelector('.free-editor-wrap .CodeMirror');
        if (el) el.style.fontSize = fontSize + 'px';
    }, [fontSize]);

    // ── Run via Wandbox ──────────────────────────────────────────────────────
    const runCode = async () => {
        if (running) return;
        setRunning(true);
        setOutput('');
        setRunStatus(null);
        setExecTime(null);
        const t0 = Date.now();
        try {
            const body = {
                compiler: WANDBOX_COMPILER[language] || 'gcc-head',
                code,
                stdin,
            };
            if (WANDBOX_OPTIONS[language]) body.options = WANDBOX_OPTIONS[language];

            const res = await fetch('https://wandbox.org/api/compile.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();

            const ms = Date.now() - t0;
            setExecTime(ms);

            const compErr = (data.compiler_error || '').trim();
            const progOut = (data.program_output || '').trimEnd();
            const progErr = (data.program_error  || '').trim();

            if (compErr) {
                setOutput(compErr);
                setRunStatus('error');
            } else {
                const combined = [progOut, progErr].filter(Boolean).join('\n');
                setOutput(combined || '(ไม่มี Output)');
                setRunStatus(progErr ? 'error' : 'ok');
            }
        } catch (err) {
            setOutput(`⚠️ เชื่อมต่อ Wandbox ไม่ได้: ${err.message}`);
            setRunStatus('error');
            setExecTime(Date.now() - t0);
        } finally {
            setRunning(false);
        }
    };

    // ── Download ─────────────────────────────────────────────────────────────
    const downloadCode = () => {
        const ext = EXTENSIONS[language] || 'txt';
        const name = (filename.trim() || 'main').replace(/[^a-zA-Z0-9_\-ก-๙]/g, '_');
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `${name}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ── Copy ─────────────────────────────────────────────────────────────────
    const copyCode = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // ── Format ───────────────────────────────────────────────────────────────
    const formatCode = () => {
        if (typeof formatCCode === 'function') {
            setCode(formatCCode(code, language));
        }
    };

    // ── Clear ────────────────────────────────────────────────────────────────
    const clearOutput = () => { setOutput(''); setRunStatus(null); setExecTime(null); };

    const isTeacher = role === 'teacher' || role === 'admin';

    // ── Styles ────────────────────────────────────────────────────────────────
    const bg      = '#0f172a';
    const panel   = '#1e293b';
    const border  = '#334155';
    const accent  = isTeacher ? '#ec4899' : '#6366f1';
    const accentL = isTeacher ? '#fce7f3' : '#eef2ff';

    const btn = (extra = {}) => ({
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 14px', borderRadius: 8, border: 'none',
        cursor: 'pointer', fontFamily: "'Prompt', sans-serif",
        fontSize: 13, fontWeight: 600, transition: 'opacity .15s',
        ...extra,
    });

    const navTitle  = isTeacher ? 'Code Editor — ครู' : 'Code Editor — นักเรียน';
    const navSub    = isTeacher ? 'เขียนและสาธิตโค้ดให้นักเรียน' : 'เขียนโค้ดทดลองและดาวน์โหลด';

    return (
        <div style={{ minHeight: '100vh', background: bg, color: '#f1f5f9', fontFamily: "'Prompt', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <Navbar title={navTitle} subtitle={navSub} />

            {/* ── Toolbar ─────────────────────────────────────────────── */}
            <div style={{ background: panel, borderBottom: `1px solid ${border}`, padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>

                {/* Language selector */}
                <select
                    value={language}
                    onChange={e => handleLanguageChange(e.target.value)}
                    style={{ background: '#0f172a', color: '#f1f5f9', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 10px', fontFamily: "'Prompt', sans-serif", fontSize: 13, cursor: 'pointer', outline: 'none' }}
                >
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="python">Python</option>
                </select>

                {/* Filename input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                        value={filename}
                        onChange={e => setFilename(e.target.value)}
                        placeholder="ชื่อไฟล์"
                        style={{
                            background: '#0f172a', color: '#f1f5f9', border: `1px solid ${border}`,
                            borderRadius: 8, padding: '6px 10px', fontFamily: "'Prompt', sans-serif",
                            fontSize: 13, width: 110, outline: 'none',
                        }}
                    />
                    <span style={{ color: '#64748b', fontSize: 13 }}>.{EXTENSIONS[language]}</span>
                </div>

                <div style={{ flex: 1 }} />

                {/* Font size */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => setFontSize(f => Math.max(10, f - 1))} style={btn({ background: '#0f172a', color: '#94a3b8', border: `1px solid ${border}`, padding: '5px 9px' })}>A−</button>
                    <span style={{ fontSize: 12, color: '#64748b', minWidth: 28, textAlign: 'center' }}>{fontSize}</span>
                    <button onClick={() => setFontSize(f => Math.min(22, f + 1))} style={btn({ background: '#0f172a', color: '#94a3b8', border: `1px solid ${border}`, padding: '5px 9px' })}>A+</button>
                </div>

                {/* Stdin toggle */}
                <button onClick={() => setShowStdin(s => !s)} style={btn({ background: showStdin ? '#0f172a' : 'transparent', color: showStdin ? '#fbbf24' : '#64748b', border: `1px solid ${showStdin ? '#fbbf24' : border}` })}>
                    ⌨️ Input
                </button>

                {/* Format */}
                {(language !== 'python') && (
                    <button onClick={formatCode} style={btn({ background: '#0f172a', color: '#94a3b8', border: `1px solid ${border}` })} title="Format (Shift+Alt+F)">
                        ✨ จัดรูปแบบ
                    </button>
                )}

                {/* Copy */}
                <button onClick={copyCode} style={btn({ background: copied ? '#10b981' : '#0f172a', color: copied ? '#fff' : '#94a3b8', border: `1px solid ${copied ? '#10b981' : border}` })}>
                    {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
                </button>

                {/* Download */}
                <button onClick={downloadCode} style={btn({ background: '#0f172a', color: '#34d399', border: '1px solid #34d399' })}>
                    💾 ดาวน์โหลด .{EXTENSIONS[language]}
                </button>

                {/* Run */}
                <button
                    onClick={runCode}
                    disabled={running}
                    style={btn({ background: running ? '#475569' : accent, color: '#fff', opacity: running ? 0.7 : 1, minWidth: 90 })}
                >
                    {running ? '⏳ กำลังรัน...' : '▶ รันโค้ด'}
                </button>
            </div>

            {/* ── Main area ──────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 12, minHeight: 0 }}>

                {/* Stdin panel */}
                {showStdin && (
                    <div style={{ background: panel, border: `1px solid #fbbf2444`, borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 6, fontWeight: 600 }}>⌨️ Standard Input (stdin) — ใส่ข้อมูลที่โปรแกรมต้องรับ</div>
                        <textarea
                            value={stdin}
                            onChange={e => setStdin(e.target.value)}
                            placeholder={'เช่น:\n5\nhello world'}
                            rows={3}
                            style={{ width: '100%', background: '#0f172a', color: '#f1f5f9', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                )}

                {/* Editor + Output split */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: output !== '' ? '1fr 1fr' : '1fr', gap: 12, minHeight: 400 }}>

                    {/* Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                            <span>📝 Editor — {LANG_LABELS[language]}</span>
                            <span style={{ color: '#475569' }}>Ctrl+Space: Autocomplete · Shift+Alt+F: Format · Ctrl+D: Duplicate line</span>
                        </div>
                        <div className="free-editor-wrap" style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: `1px solid ${border}` }}>
                            <CodeEditor
                                value={code}
                                onChange={setCode}
                                language={language}
                                minHeight="100%"
                                placeholder={`// เขียนโค้ด ${LANG_LABELS[language]} ที่นี่`}
                            />
                        </div>
                    </div>

                    {/* Output */}
                    {output !== '' && (
                        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: runStatus === 'error' ? '#f87171' : '#34d399', fontWeight: 600 }}>
                                    {runStatus === 'error' ? '❌ Error' : '✅ Output'}
                                    {execTime !== null && <span style={{ color: '#475569', fontWeight: 400, marginLeft: 8 }}>{execTime} ms</span>}
                                </span>
                                <button onClick={clearOutput} style={btn({ background: 'transparent', color: '#64748b', border: `1px solid ${border}`, padding: '3px 10px', fontSize: 12 })}>
                                    ✕ ล้าง
                                </button>
                            </div>
                            <div style={{
                                flex: 1, background: '#020617', borderRadius: 12, border: `1px solid ${runStatus === 'error' ? '#f8717144' : '#34d39944'}`,
                                padding: '14px 16px', overflowY: 'auto',
                                fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 13,
                                color: runStatus === 'error' ? '#f87171' : '#e2e8f0',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7,
                            }}>
                                {output}
                            </div>
                        </div>
                    )}
                </div>

                {/* Empty state run hint */}
                {output === '' && !running && (
                    <div style={{ textAlign: 'center', padding: '10px 0', color: '#334155', fontSize: 13 }}>
                        กด <span style={{ color: accent, fontWeight: 700 }}>▶ รันโค้ด</span> เพื่อดูผลลัพธ์ · กด <span style={{ color: '#34d399', fontWeight: 700 }}>💾 ดาวน์โหลด</span> เพื่อบันทึกไฟล์
                    </div>
                )}

                {/* Keyboard shortcuts reference */}
                <div style={{ background: panel, borderRadius: 10, padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
                    <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>⌨️ Shortcuts:</span>
                    {[
                        ['Ctrl+Space', 'Autocomplete'],
                        ['Shift+Alt+F', 'จัดรูปแบบโค้ด'],
                        ['Ctrl+/', 'Comment/Uncomment'],
                        ['Ctrl+D', 'Duplicate บรรทัด'],
                        ['Ctrl+Shift+K', 'ลบบรรทัด'],
                        ['Alt+↑↓', 'ย้ายบรรทัด'],
                        ['Tab', 'Indent'],
                    ].map(([key, desc]) => (
                        <span key={key} style={{ fontSize: 11, color: '#475569' }}>
                            <kbd style={{ background: '#0f172a', border: `1px solid ${border}`, borderRadius: 4, padding: '1px 5px', color: '#94a3b8', fontFamily: 'monospace' }}>{key}</kbd>
                            {' '}{desc}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

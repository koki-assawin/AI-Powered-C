// js/pages/shared/FreeEditor.js — v7.0
// Added: Editor Theme Picker · Drawing/Annotation Canvas Overlay

const CODING_FONTS = [
    { value: 'Consolas',        label: 'Consolas',         google: false, desc: 'Windows built-in · ไม่มี ligature' },
    { value: 'Source Code Pro', label: 'Source Code Pro',  google: true,  desc: 'Adobe · อ่านง่าย · ไม่มี ligature' },
    { value: 'IBM Plex Mono',   label: 'IBM Plex Mono',    google: true,  desc: 'IBM · ทันสมัย · ไม่มี ligature' },
    { value: 'Inconsolata',     label: 'Inconsolata',      google: true,  desc: 'Classic · เบาบาง · ไม่มี ligature' },
    { value: 'JetBrains Mono',  label: 'JetBrains Mono',   google: true,  desc: 'JetBrains · มี ligature (!=→≠)' },
    { value: 'Fira Code',       label: 'Fira Code',        google: true,  desc: 'Mozilla · มี ligature (!=→≠)' },
    { value: 'Courier New',     label: 'Courier New',      google: false, desc: 'Classic · ทุกระบบ' },
];

const CM_THEMES = [
    { value: 'dracula',                 label: '🟣 Dracula',              dark: true  },
    { value: 'monokai',                 label: '🟢 Monokai',              dark: true  },
    { value: 'one-dark',                label: '🔵 One Dark',             dark: true  },
    { value: 'material-darker',         label: '⚫ Material Darker',      dark: true  },
    { value: 'tomorrow-night-eighties', label: '🌆 Tomorrow Night 80s',   dark: true  },
    { value: 'nord',                    label: '🧊 Nord',                 dark: true  },
    { value: 'ayu-dark',                label: '🌙 Ayu Dark',             dark: true  },
    { value: 'cobalt',                  label: '💙 Cobalt',               dark: true  },
    { value: 'lucario',                 label: '⚡ Lucario',              dark: true  },
    { value: 'blackboard',              label: '🖤 Blackboard',           dark: true  },
    { value: 'eclipse',                 label: '☀️ Eclipse (สว่าง)',     dark: false },
    { value: 'default',                 label: '📄 Default (สว่าง)',     dark: false },
];

const DRAW_COLORS = [
    '#ef4444','#f97316','#eab308','#22c55e','#3b82f6',
    '#a855f7','#ec4899','#ffffff','#000000',
];

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

    const countInputCalls = (src, lang) => {
        const stripped = stripComments(src, lang);
        const pat = {
            c:      [/\bscanf\s*\(/g, /\bfgets\s*\(/g, /\bgets\s*\(/g, /\bgetchar\s*\(/g],
            cpp:    [/\bcin\s*>>/g, /\bgetline\s*\(/g],
            python: [/\binput\s*\(/g],
        };
        return (pat[lang] || []).reduce((n, p) => n + (stripped.match(p) || []).length, 0);
    };

    // ── State ───────────────────────────────────────────────────────────────
    const [language,       setLanguage]       = React.useState('c');
    const [code,           setCode]           = React.useState(STARTERS.c);
    const [output,         setOutput]         = React.useState('');
    const [running,        setRunning]        = React.useState(false);
    const [runStatus,      setRunStatus]      = React.useState(null);
    const [execTime,       setExecTime]       = React.useState(null);
    const [filename,       setFilename]       = React.useState('main');
    const [fontSize,       setFontSize]       = React.useState(14);
    const [fontFamily,     setFontFamily]     = React.useState('Consolas');
    const [ligatures,      setLigatures]      = React.useState(false);
    const [editorTheme,    setEditorTheme]    = React.useState('dracula');
    const [copied,         setCopied]         = React.useState(false);
    const [aiText,         setAiText]         = React.useState('');
    const [analyzing,      setAnalyzing]      = React.useState(false);
    const [showAI,         setShowAI]         = React.useState(false);
    // Interactive stdin
    const [collecting,     setCollecting]     = React.useState(false);
    const [collectedLines, setCollectedLines] = React.useState([]);
    const [currentLine,    setCurrentLine]    = React.useState('');
    const [inputCount,     setInputCount]     = React.useState(0);
    const [echoedLines,    setEchoedLines]    = React.useState([]);
    // Drawing overlay
    const [drawMode,       setDrawMode]       = React.useState(false);
    const [drawTool,       setDrawTool]       = React.useState('pen');   // 'pen' | 'eraser'
    const [drawColor,      setDrawColor]      = React.useState('#ef4444');
    const [penSize,        setPenSize]        = React.useState(4);
    const [eraserSize,     setEraserSize]     = React.useState(28);
    const [penOpacity,     setPenOpacity]     = React.useState(1);
    const [canUndo,        setCanUndo]        = React.useState(false);
    const [panelPos,       setPanelPos]       = React.useState({ x: 12, y: 120 });

    const fileInputRef   = React.useRef(null);
    const inputLineRef   = React.useRef(null);
    const prevLangRef    = React.useRef('c');
    // Drawing refs
    const canvasRef      = React.useRef(null);
    const isDrawingRef   = React.useRef(false);
    const lastPtRef      = React.useRef({ x: 0, y: 0 });
    const historyRef     = React.useRef([]);
    // Keep draw settings fresh in event handlers (avoid stale closure)
    const drawSettingsRef = React.useRef({});
    const panelDragRef    = React.useRef({ active: false, ox: 0, oy: 0 });
    drawSettingsRef.current = { tool: drawTool, color: drawColor, penSize, eraserSize, opacity: penOpacity };

    // ── Load Google Font ────────────────────────────────────────────────────
    React.useEffect(() => {
        const info = CODING_FONTS.find(f => f.value === fontFamily);
        if (!info || !info.google) return;
        const id = 'gf-' + fontFamily.replace(/\s+/g, '-').toLowerCase();
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:ital,wght@0,400;0,700&display=swap`;
        document.head.appendChild(link);
    }, [fontFamily]);

    // ── Canvas init & resize ─────────────────────────────────────────────────
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        let saved = null;
        const resize = () => {
            if (canvas.width > 0 && canvas.height > 0) {
                try { saved = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height); } catch (e) {}
            }
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            if (saved) canvas.getContext('2d').putImageData(saved, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // Escape key exits draw mode
    React.useEffect(() => {
        const h = (e) => { if (e.key === 'Escape' && drawMode) setDrawMode(false); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [drawMode]);

    // ── Comment stripper ────────────────────────────────────────────────────
    const stripComments = (src, lang) => src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(lang === 'python' ? /#[^\n]*/g : /\/\/[^\n]*/g, '');

    const codeNeedsInput = React.useMemo(() => {
        const s = stripComments(code, language);
        return (INPUT_PATTERNS[language] || []).some(p => p.test(s));
    }, [code, language]);

    // ── Language change ──────────────────────────────────────────────────────
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

    // ── Fallback compilers ────────────────────────────────────────────────────
    const PISTON_LANG_MAP = {
        c:      { language: 'c',      version: '*', filename: 'main.c'   },
        cpp:    { language: 'c++',    version: '*', filename: 'main.cpp' },
        python: { language: 'python', version: '*', filename: 'main.py'  },
        java:   { language: 'java',   version: '*', filename: 'Main.java'},
    };
    const JUDGE0_LANG_MAP = { c: 50, cpp: 54, python: 71, java: 62 };

    const runWithPistonEditor = async (stdinStr) => {
        const p = PISTON_LANG_MAP[language] || PISTON_LANG_MAP.c;
        const res = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: p.language, version: p.version,
                files: [{ name: p.filename, content: code }],
                stdin: stdinStr || '',
            }),
        });
        if (!res.ok) throw new Error(`Piston HTTP ${res.status}`);
        const data = await res.json();
        return {
            compiler_error: data.compile?.stderr || '',
            program_output: data.run?.stdout || '',
            program_error:  data.run?.stderr  || '',
        };
    };

    const runWithJudge0Editor = async (stdinStr) => {
        const langId = JUDGE0_LANG_MAP[language] || JUDGE0_LANG_MAP.c;
        const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_code: code, language_id: langId, stdin: stdinStr || '' }),
        });
        if (!res.ok) throw new Error(`Judge0 HTTP ${res.status}`);
        const data = await res.json();
        return {
            compiler_error: data.compile_output || '',
            program_output: data.stdout || '',
            program_error:  data.stderr  || '',
        };
    };

    // ── Core run ─────────────────────────────────────────────────────────────
    const runCodeCore = async (stdinStr, echo) => {
        setRunning(true);
        setOutput(''); setRunStatus(null); setExecTime(null);
        setEchoedLines(echo || []);
        const t0 = Date.now();
        let data;
        try {
            const body = { compiler: WANDBOX_COMPILER[language] || 'gcc-head', code, stdin: stdinStr || '' };
            if (WANDBOX_OPTIONS[language]) body.options = WANDBOX_OPTIONS[language];
            const res = await fetch('https://wandbox.org/api/compile.json', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            data = await res.json();
        } catch (_wandboxErr) {
            try {
                data = await runWithPistonEditor(stdinStr);
            } catch (_pistonErr) {
                try {
                    data = await runWithJudge0Editor(stdinStr);
                } catch (judge0Err) {
                    setOutput(`⚠️ ไม่สามารถเชื่อมต่อ compiler ได้ (Wandbox + Piston + Judge0 ล้มเหลว)\n${judge0Err.message}`);
                    setRunStatus('error'); setExecTime(Date.now() - t0);
                    setRunning(false); return;
                }
            }
        }
        setExecTime(Date.now() - t0);
        const compErr = (data.compiler_error || '').trim();
        const progOut = (data.program_output || '').trimEnd();
        const progErr = (data.program_error  || '').trim();
        if (compErr) { setOutput(compErr); setRunStatus('error'); }
        else {
            setOutput([progOut, progErr].filter(Boolean).join('\n') || '(ไม่มี Output)');
            setRunStatus(progErr ? 'error' : 'ok');
        }
        setRunning(false);
    };

    const handleRunClick = () => {
        if (running || collecting) return;
        if (codeNeedsInput) {
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

    const submitLine = () => {
        const line = currentLine;
        const newLines = [...collectedLines, line];
        setCollectedLines(newLines);
        setCurrentLine('');
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

    // ── AI Analysis ──────────────────────────────────────────────────────────
    const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];

    const analyzeCode = async () => {
        if (analyzing || !code.trim()) return;
        if (!GEMINI_KEY) { alert('ไม่พบ Gemini API Key — กรุณาตั้งค่าใน Admin'); return; }
        setAnalyzing(true); setShowAI(true); setAiText('');
        const outputSection = output ? `\nผลลัพธ์:\n\`\`\`\n${output}\n\`\`\`` : '';
        const prompt = `วิเคราะห์โค้ด ${LANG_LABELS[language]} ต่อไปนี้อย่างละเอียด (ตอบเป็นภาษาไทย):\n\n\`\`\`${language}\n${code}\n\`\`\`${outputSection}\n\nวิเคราะห์ใน 4 หัวข้อ:\n1. 📋 สรุปสิ่งที่โค้ดทำ\n2. 🐛 จุดที่อาจเป็นปัญหาหรือ bug\n3. ✨ คำแนะนำการปรับปรุงโค้ด\n4. ⭐ ประเมินคุณภาพโค้ด (1-10)`;
        const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
        let lastError = '';
        for (const model of GEMINI_MODELS) {
            try {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
                    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
                );
                const data = await res.json();
                if (data.error) { lastError = `[${model}] ${data.error.code}: ${data.error.message}`; continue; }
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) {
                    const why = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'no text';
                    lastError = `[${model}] ไม่ได้รับคำตอบ (${why})`; continue;
                }
                setAiText(text);
                setAnalyzing(false);
                return;
            } catch (err) { lastError = `[${model}] ${err.message}`; }
        }
        setAiText('❌ วิเคราะห์ไม่ได้: ' + lastError);
        setAnalyzing(false);
    };

    // ── File helpers ─────────────────────────────────────────────────────────
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

    // ── Drawing canvas helpers ───────────────────────────────────────────────
    const getPt = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const applyCtx = (ctx, pressure) => {
        const { tool, color, penSize: ps, eraserSize: es, opacity } = drawSettingsRef.current;
        const p = (pressure > 0 && pressure <= 1) ? pressure : 1;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.fillStyle   = 'rgba(0,0,0,1)';
            ctx.lineWidth   = es;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            const hex = color.replace('#', '');
            const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
            const sz = ps * (0.5 + p * 0.5);
            ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
            ctx.fillStyle   = `rgba(${r},${g},${b},${opacity})`;
            ctx.lineWidth   = sz;
        }
    };

    const saveHistory = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current = [...historyRef.current.slice(-49), snapshot];
        setCanUndo(true);
    };

    const onPointerDown = (e) => {
        e.preventDefault();
        saveHistory();
        isDrawingRef.current = true;
        const pt = getPt(e);
        lastPtRef.current = pt;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.save();
        applyCtx(ctx, e.pressure);
        const r = drawSettingsRef.current.tool === 'eraser'
            ? drawSettingsRef.current.eraserSize / 2
            : drawSettingsRef.current.penSize / 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(r, 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    const onPointerMove = (e) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pt = getPt(e);
        ctx.save();
        applyCtx(ctx, e.pressure);
        ctx.beginPath();
        ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        ctx.restore();
        lastPtRef.current = pt;
    };

    const onPointerUp = () => { isDrawingRef.current = false; };

    const undoDraw = () => {
        if (!historyRef.current.length) return;
        const arr = [...historyRef.current];
        const prev = arr.pop();
        historyRef.current = arr;
        canvasRef.current.getContext('2d').putImageData(prev, 0, 0);
        setCanUndo(arr.length > 0);
    };

    const clearCanvas = () => {
        saveHistory();
        const canvas = canvasRef.current;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    };

    // ── Drag panel handler ───────────────────────────────────────────────────
    const startPanelDrag = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const panelEl = e.currentTarget.closest('[data-drawpanel]');
        const rect = panelEl ? panelEl.getBoundingClientRect() : { left: panelPos.x, top: panelPos.y };
        panelDragRef.current = { active: true, ox: e.clientX - rect.left, oy: e.clientY - rect.top };
        e.currentTarget.setPointerCapture(e.pointerId);

        const onMove = (me) => {
            if (!panelDragRef.current.active) return;
            const pw = panelEl ? panelEl.offsetWidth  : 200;
            const ph = panelEl ? panelEl.offsetHeight : 400;
            const nx = Math.max(0, Math.min(window.innerWidth  - pw, me.clientX - panelDragRef.current.ox));
            const ny = Math.max(0, Math.min(window.innerHeight - ph, me.clientY - panelDragRef.current.oy));
            setPanelPos({ x: nx, y: ny });
        };
        const onUp = () => {
            panelDragRef.current.active = false;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    // ── Dynamic cursor for draw canvas ──────────────────────────────────────
    const drawCursor = React.useMemo(() => {
        if (!drawMode) return 'default';
        if (drawTool === 'eraser') {
            const s = Math.max(8, Math.min(eraserSize, 80));
            const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'><circle cx='${s/2}' cy='${s/2}' r='${s/2-1}' fill='rgba(255,255,255,0.2)' stroke='white' stroke-width='1.5'/></svg>`;
            return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${s/2} ${s/2}, crosshair`;
        }
        const s = Math.max(6, Math.min(penSize * 2 + 4, 48));
        const hex = drawColor.replace('#','');
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'><circle cx='${s/2}' cy='${s/2}' r='${s/2-1}' fill='%23${hex}' stroke='white' stroke-width='1'/></svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${s/2} ${s/2}, crosshair`;
    }, [drawMode, drawTool, penSize, eraserSize, drawColor]);

    // ── Style helpers ─────────────────────────────────────────────────────────
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
                <span style={{ marginLeft: 8, ...MONO, fontSize: 11, color: '#475569' }}>{filename || 'main'}.{EXTENSIONS[language]}</span>
                {output && execTime !== null && <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>{execTime} ms</span>}
                {output && (
                    <button onClick={resetTerminal}
                        style={{ marginLeft: output && execTime !== null ? 8 : 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12 }}>
                        ↺ รันใหม่
                    </button>
                )}
            </div>
        );

        if (collecting) return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', ...MONO, overflowY: 'auto' }}>
                    <div style={{ color: '#475569', marginBottom: 2 }}><span style={{ color: '#34d399' }}>$ </span>./{filename || 'main'}.{EXTENSIONS[language]}</div>
                    {collectedLines.map((line, i) => <div key={i} style={{ color: '#e2e8f0' }}>{line}</div>)}
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                        <input ref={inputLineRef} type="text" value={currentLine}
                            onChange={e => setCurrentLine(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitLine(); } }}
                            autoComplete="off" spellCheck="false"
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', ...MONO, padding: 0, caretColor: '#34d399' }} />
                        <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#34d399', animation: 'termBlink 1s step-start infinite', flexShrink: 0 }} />
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#475569' }}>
                            {inputCount > 0 ? `รอรับค่า ${collectedLines.length + 1} / ${inputCount} — กด Enter` : 'พิมพ์ค่าแล้วกด Enter'}
                        </span>
                        <button onClick={() => finishCollecting([...collectedLines, ...(currentLine ? [currentLine] : [])])}
                            style={{ ...btn({ background: accent, color: '#fff', padding: '4px 12px', fontSize: 12 }), marginLeft: 'auto' }}>▶ รัน</button>
                        <button onClick={resetTerminal} style={btn({ background: 'transparent', color: '#64748b', border: `1px solid ${border}`, padding: '4px 10px', fontSize: 11 })}>✕ ยกเลิก</button>
                    </div>
                </div>
            </div>
        );

        if (running) return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', ...MONO, color: '#94a3b8' }}>
                    <span style={{ color: '#34d399' }}>$ </span><span>กำลังประมวลผล...</span>
                    <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#34d399', marginLeft: 4, verticalAlign: 'middle', animation: 'termBlink 1s step-start infinite' }} />
                </div>
            </div>
        );

        if (output) return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', ...MONO, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    <div style={{ color: '#475569', marginBottom: 2 }}><span style={{ color: '#34d399' }}>$ </span>./{filename || 'main'}.{EXTENSIONS[language]}</div>
                    {echoedLines.map((line, i) => <div key={i} style={{ color: '#e2e8f0' }}>{line}</div>)}
                    <div style={{ color: runStatus === 'error' ? '#f87171' : '#e2e8f0' }}>{output}</div>
                    {execTime !== null && <div style={{ marginTop: 8, color: '#475569', fontSize: 12 }}>Process returned 0 &nbsp;·&nbsp; execution time: {(execTime / 1000).toFixed(3)} s</div>}
                </div>
            </div>
        );

        return (
            <div style={termStyle}>
                {termHeader}
                <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                    <div style={{ ...MONO, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#34d399' }}>$</span><span>กด </span>
                        <span style={{ color: accent, fontWeight: 700 }}>▶ รันโค้ด</span>
                        <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#475569', animation: 'termBlink 1s step-start infinite', verticalAlign: 'middle', marginLeft: 2 }} />
                    </div>
                    {codeNeedsInput && (
                        <div style={{ fontSize: 12, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>⌨️</span><span>โค้ดนี้ต้องการ Input — เมื่อกด ▶ รัน จะเปิด terminal รอรับค่าอัตโนมัติ</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ── Floating Draw Toolbar ────────────────────────────────────────────────
    const renderDrawToolbar = () => {
        if (!drawMode) return null;
        const dbtn = (active, extra = {}) => ({
            padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: "'Prompt',sans-serif", fontSize: 12, fontWeight: 600,
            background: active ? accent : '#334155', color: active ? '#fff' : '#94a3b8',
            transition: 'all .15s', ...extra,
        });
        return (
            <div data-drawpanel="1" style={{
                position: 'fixed', left: panelPos.x, top: panelPos.y,
                zIndex: 10000, background: '#0f172a', borderRadius: 16,
                border: `2px solid ${accent}55`, padding: '10px 12px 14px',
                display: 'flex', flexDirection: 'column', gap: 10,
                boxShadow: '0 8px 40px rgba(0,0,0,0.7)', minWidth: 180, maxWidth: 200,
                fontFamily: "'Prompt',sans-serif", userSelect: 'none',
            }}>
                {/* Drag handle */}
                <div
                    onPointerDown={startPanelDrag}
                    style={{
                        cursor: 'grab', textAlign: 'center', color: '#475569',
                        fontSize: 16, letterSpacing: 4, marginBottom: -4,
                        padding: '2px 0 4px', borderBottom: `1px solid #1e293b`,
                        lineHeight: 1,
                    }}
                    title="ลากเพื่อย้ายตำแหน่ง"
                >⠿⠿⠿</div>

                {/* Header */}
                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: accent }}>
                    ✏️ โหมดอธิบายกระดาน
                </div>
                <div style={{ fontSize: 10, color: '#475569', textAlign: 'center', marginTop: -6 }}>กด Esc เพื่อออก · ลากหัวเพื่อย้าย</div>

                {/* Tool selector */}
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setDrawTool('pen')}  style={{ ...dbtn(drawTool === 'pen'),  flex: 1 }}>✏️ ปากกา</button>
                    <button onClick={() => setDrawTool('eraser')} style={{ ...dbtn(drawTool === 'eraser'), flex: 1 }}>🧹 ลบ</button>
                </div>

                {drawTool === 'pen' && (<>
                    {/* Color presets */}
                    <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 5 }}>สีปากกา</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {DRAW_COLORS.map(c => (
                                <button key={c} onClick={() => setDrawColor(c)} style={{
                                    width: 26, height: 26, borderRadius: '50%', background: c, padding: 0,
                                    border: drawColor === c ? '3px solid #fff' : '2px solid #334155',
                                    cursor: 'pointer', flexShrink: 0, transition: 'border .1s',
                                }} />
                            ))}
                            <input type="color" value={drawColor} onChange={e => setDrawColor(e.target.value)}
                                title="เลือกสีอื่น"
                                style={{ width: 26, height: 26, padding: 0, border: '2px solid #334155', borderRadius: '50%', cursor: 'pointer', background: 'none' }} />
                        </div>
                    </div>

                    {/* Pen size */}
                    <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                            <span>ขนาดเส้น</span>
                            <span style={{ color: '#94a3b8', fontWeight: 700 }}>{penSize}px</span>
                        </div>
                        <input type="range" min={1} max={30} value={penSize} onChange={e => setPenSize(+e.target.value)}
                            style={{ width: '100%', accentColor: accent }} />
                        {/* Preview dot */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                            <div style={{ width: penSize * 2, height: penSize * 2, borderRadius: '50%', background: drawColor, maxWidth: 60, maxHeight: 60 }} />
                        </div>
                    </div>

                    {/* Opacity */}
                    <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                            <span>ความทึบ</span>
                            <span style={{ color: '#94a3b8', fontWeight: 700 }}>{Math.round(penOpacity * 100)}%</span>
                        </div>
                        <input type="range" min={10} max={100} value={Math.round(penOpacity * 100)}
                            onChange={e => setPenOpacity(+e.target.value / 100)}
                            style={{ width: '100%', accentColor: accent }} />
                    </div>
                </>)}

                {drawTool === 'eraser' && (
                    <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                            <span>ขนาดยางลบ</span>
                            <span style={{ color: '#94a3b8', fontWeight: 700 }}>{eraserSize}px</span>
                        </div>
                        <input type="range" min={5} max={120} value={eraserSize} onChange={e => setEraserSize(+e.target.value)}
                            style={{ width: '100%', accentColor: '#94a3b8' }} />
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                            <div style={{ width: Math.min(eraserSize, 80), height: Math.min(eraserSize, 80), borderRadius: '50%', border: '2px solid #475569', background: 'rgba(255,255,255,0.05)' }} />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={undoDraw} disabled={!canUndo}
                        style={{ ...dbtn(false, { flex: 1, opacity: canUndo ? 1 : 0.4, background: '#1e293b' }), fontSize: 11 }}>
                        ↩ ย้อนกลับ
                    </button>
                    <button onClick={clearCanvas}
                        style={{ ...dbtn(false, { flex: 1, background: '#7f1d1d', color: '#fca5a5' }), fontSize: 11 }}>
                        🗑️ ล้าง
                    </button>
                </div>

                <button onClick={() => setDrawMode(false)}
                    style={dbtn(false, { background: '#1e293b', border: '1px solid #334155', justifyContent: 'center', fontSize: 11 })}>
                    ✕ ออกจากโหมดนี้
                </button>
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: bg, color: '#f1f5f9', fontFamily: "'Prompt', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <style>{`
                @keyframes termBlink { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes drawPulse { 0%,100%{box-shadow:0 0 0 0 rgba(236,72,153,.4)} 50%{box-shadow:0 0 0 6px rgba(236,72,153,0)} }
                .fe-editor-wrap .CodeMirror,
                .fe-editor-wrap .CodeMirror-scroll {
                    font-size: ${fontSize}px !important;
                    font-family: '${fontFamily}', Consolas, 'Courier New', monospace !important;
                    line-height: 1.6 !important;
                    font-feature-settings: ${ligatures ? '"liga" 1, "calt" 1' : '"liga" 0, "calt" 0'} !important;
                    font-variant-ligatures: ${ligatures ? 'normal' : 'none'} !important;
                }
                .fe-editor-wrap .CodeMirror .CodeMirror-selected { background: rgba(255,255,255,.18) !important; }
                .fe-editor-wrap .CodeMirror-focused .CodeMirror-selected { background: rgba(255,255,255,.28) !important; }
                .fe-editor-wrap .CodeMirror-line::selection,
                .fe-editor-wrap .CodeMirror-line>span::selection,
                .fe-editor-wrap .CodeMirror-line>span>span::selection { background: rgba(255,255,255,.28) !important; }
            `}</style>

            <Navbar title={isTeacher ? 'Code Editor — ครู' : 'Code Editor — นักเรียน'}
                    subtitle={isTeacher ? 'เขียนและสาธิตโค้ดให้นักเรียน' : 'เขียนโค้ดทดลองและดาวน์โหลด'} />

            {/* ── Toolbar ── */}
            <div style={{ background: panel, borderBottom: `1px solid ${border}`, padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {/* Language */}
                <select value={language} onChange={e => handleLanguageChange(e.target.value)}
                    style={{ background: bg, color: '#f1f5f9', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 10px', fontFamily: "'Prompt',sans-serif", fontSize: 13, cursor: 'pointer', outline: 'none' }}>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="python">Python</option>
                </select>

                {/* Filename */}
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

                {/* Font picker */}
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} title="เลือกฟอนต์"
                    style={{ background: bg, color: '#94a3b8', border: `1px solid ${border}`, borderRadius: 8, padding: '5px 8px', fontFamily: "'Prompt',sans-serif", fontSize: 12, cursor: 'pointer', outline: 'none', maxWidth: 150 }}>
                    {CODING_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>

                {/* Theme picker */}
                <select value={editorTheme} onChange={e => setEditorTheme(e.target.value)} title="เทมแพลต Editor"
                    style={{ background: bg, color: '#a78bfa', border: `1px solid #7c3aed44`, borderRadius: 8, padding: '5px 8px', fontFamily: "'Prompt',sans-serif", fontSize: 12, cursor: 'pointer', outline: 'none', maxWidth: 175 }}>
                    {CM_THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                {/* Ligature toggle */}
                <button onClick={() => setLigatures(l => !l)} title={ligatures ? 'ปิด Ligature' : 'เปิด Ligature'}
                    style={btn({ background: ligatures ? '#7c3aed33' : bg, color: ligatures ? '#a78bfa' : '#64748b', border: `1px solid ${ligatures ? '#7c3aed88' : border}`, padding: '5px 10px', fontSize: 12 })}>
                    {ligatures ? 'fi≠' : 'fi!='}
                </button>

                {language !== 'python' && (
                    <button onClick={formatCode} style={btn({ background: bg, color: '#94a3b8', border: `1px solid ${border}` })}>✨ จัดรูปแบบ</button>
                )}

                <button onClick={analyzeCode} disabled={analyzing}
                    style={btn({ background: analyzing ? '#475569' : '#7c3aed', color: '#fff', opacity: analyzing ? 0.7 : 1 })}>
                    {analyzing ? '⏳ วิเคราะห์...' : '🤖 วิเคราะห์โค้ด AI'}
                </button>

                <input ref={fileInputRef} type="file" accept=".c,.cpp,.cc,.cxx,.py,.txt" style={{ display: 'none' }} onChange={openFile} />
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={btn({ background: bg, color: '#fbbf24', border: '1px solid #fbbf24' })}>📂 เปิดไฟล์</button>

                <button onClick={copyCode}
                    style={btn({ background: copied ? '#10b981' : bg, color: copied ? '#fff' : '#94a3b8', border: `1px solid ${copied ? '#10b981' : border}` })}>
                    {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
                </button>

                <button onClick={downloadCode} style={btn({ background: bg, color: '#34d399', border: '1px solid #34d399' })}>
                    💾 ดาวน์โหลด .{EXTENSIONS[language]}
                </button>

                {/* Draw mode button — teachers only */}
                {isTeacher && (
                    <button onClick={() => setDrawMode(m => !m)}
                        style={btn({
                            background: drawMode ? accent : bg,
                            color: drawMode ? '#fff' : '#f9a8d4',
                            border: `1px solid ${drawMode ? accent : '#f9a8d488'}`,
                            animation: drawMode ? 'drawPulse 2s infinite' : 'none',
                        })}>
                        {drawMode ? '🔴 กำลังอธิบาย...' : '🖊️ อธิบายบนหน้าจอ'}
                    </button>
                )}

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
                                fontSize={fontSize} theme={editorTheme} minHeight="100%"
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
                    {isTeacher && <span style={{ fontSize: 11, color: '#475569' }}>
                        <kbd style={{ background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '1px 5px', color: '#f9a8d4', fontFamily: 'monospace' }}>Esc</kbd> ออกจากโหมดอธิบาย
                    </span>}
                </div>
            </div>

            {/* ── Drawing canvas (fixed overlay) ── */}
            <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                style={{
                    position: 'fixed', top: 0, left: 0,
                    width: '100vw', height: '100vh',
                    zIndex: 9998,
                    pointerEvents: drawMode ? 'all' : 'none',
                    cursor: drawCursor,
                    touchAction: 'none',
                }}
            />

            {/* Draw mode status badge */}
            {drawMode && (
                <div style={{
                    position: 'fixed', top: 12, right: 12, zIndex: 10001,
                    background: '#991b1b', color: '#fecaca',
                    borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                    boxShadow: '0 2px 12px rgba(239,68,68,.4)', fontFamily: "'Prompt',sans-serif",
                }}>
                    🔴 Drawing Mode — กด Esc ออก
                </div>
            )}

            {/* Floating draw toolbar */}
            {renderDrawToolbar()}
        </div>
    );
};

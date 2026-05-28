// js/pages/GuestLandingPage.js — Demo/Guest Mode (v3.4)
// AI features: วิเคราะห์โค้ด + คำใบ้ AI + แชทบอท (ทั้ง Workspace และ Free Editor)
// Multi-language: C · C++ · Python · Java
// ไม่ต้องการ Firebase Auth — ทำงานอิสระโดยสมบูรณ์

// ── Constants ─────────────────────────────────────────────────────────────────
const _DEMO_LANGS = [
    { value: 'c',      label: 'C',      ext: 'c',    color: '#3b82f6' },
    { value: 'cpp',    label: 'C++',    ext: 'cpp',  color: '#6366f1' },
    { value: 'python', label: 'Python', ext: 'py',   color: '#f59e0b' },
    { value: 'java',   label: 'Java',   ext: 'java', color: '#ef4444' },
];

const _DEMO_CODING_FONTS = [
    { value: 'Consolas',        label: 'Consolas'        },
    { value: 'JetBrains Mono',  label: 'JetBrains Mono'  },
    { value: 'Fira Code',       label: 'Fira Code'       },
    { value: 'Source Code Pro', label: 'Source Code Pro' },
    { value: 'IBM Plex Mono',   label: 'IBM Plex Mono'   },
    { value: 'Courier New',     label: 'Courier New'     },
];

const _DEMO_THEMES = [
    ['dracula', '🟣 Dracula'], ['monokai', '🟢 Monokai'], ['one-dark', '🔵 One Dark'],
    ['material-darker', '⚫ Material Darker'], ['nord', '🧊 Nord'], ['ayu-dark', '🌙 Ayu Dark'],
    ['cobalt', '💙 Cobalt'], ['eclipse', '☀️ Eclipse (สว่าง)'], ['default', '📄 Default (สว่าง)'],
];

const _LANG_STARTERS = {
    c:      `#include <stdio.h>\n\nint main() {\n    // เขียนโค้ด C ที่นี่\n    \n    return 0;\n}`,
    cpp:    `#include <iostream>\nusing namespace std;\n\nint main() {\n    // เขียนโค้ด C++ ที่นี่\n    \n    return 0;\n}`,
    python: `# เขียนโค้ด Python ที่นี่\n\n`,
    java:   `public class Main {\n    public static void main(String[] args) {\n        // เขียนโค้ด Java ที่นี่\n        \n    }\n}`,
};

const _LANG_TIPS = {
    c: [
        { icon: '📤', code: 'printf("text\\n");',  desc: 'แสดงข้อความ' },
        { icon: '📥', code: 'scanf("%d", &x);',    desc: 'รับค่า int' },
        { icon: '🔄', code: 'for(i=0;i<n;i++)',    desc: 'วนซ้ำ' },
        { icon: '🌿', code: 'if(a>b) { ... }',     desc: 'ตัดสินใจ' },
        { icon: '🧩', code: 'int fn(int x){...}', desc: 'ฟังก์ชัน' },
    ],
    cpp: [
        { icon: '📤', code: 'cout << x << endl;',     desc: 'แสดงข้อความ' },
        { icon: '📥', code: 'cin >> x;',              desc: 'รับค่า' },
        { icon: '🔄', code: 'for(int i=0;i<n;i++)',   desc: 'วนซ้ำ' },
        { icon: '🌿', code: 'if(a>b) { ... }',        desc: 'ตัดสินใจ' },
        { icon: '🧩', code: 'int fn(int x){...}',     desc: 'ฟังก์ชัน' },
    ],
    python: [
        { icon: '📤', code: 'print("text")',          desc: 'แสดงข้อความ' },
        { icon: '📥', code: 'x = int(input())',       desc: 'รับค่า int' },
        { icon: '🔄', code: 'for i in range(n):',     desc: 'วนซ้ำ' },
        { icon: '🌿', code: 'if a > b:',              desc: 'ตัดสินใจ' },
        { icon: '🧩', code: 'def fn(x):',             desc: 'ฟังก์ชัน' },
    ],
    java: [
        { icon: '📤', code: 'System.out.println(x);',   desc: 'แสดงข้อความ' },
        { icon: '📥', code: 'Scanner sc = new Scanner(System.in);', desc: 'เตรียมรับค่า' },
        { icon: '🔄', code: 'for(int i=0;i<n;i++)',      desc: 'วนซ้ำ' },
        { icon: '🌿', code: 'if(a>b) { ... }',            desc: 'ตัดสินใจ' },
        { icon: '🧩', code: 'static int fn(int x){...}', desc: 'ฟังก์ชัน' },
    ],
};

const _DEMO_PROBLEMS = [
    {
        id: 'd1', icon: '👋',
        unitName: 'หน่วยที่ 1: โครงสร้างโปรแกรม',
        unitColor: { bg: '#eff6ff', border: '#bfdbfe', btn: '#3b82f6', tag: '#dbeafe', tagText: '#1e40af' },
        title: 'Hello, World!',
        description: 'เขียนโปรแกรมที่แสดงข้อความ\nHello, World!\nออกหน้าจอ (ขึ้นบรรทัดใหม่ท้ายข้อความ)',
        sampleInput: '',
        expectedOutput: 'Hello, World!',
        hint: {
            c:      'ใช้ printf("Hello, World!\\n"); ภายใน main()',
            cpp:    'ใช้ cout << "Hello, World!" << endl; ภายใน main()',
            python: 'ใช้ print("Hello, World!")',
            java:   'ใช้ System.out.println("Hello, World!"); ภายใน main()',
        },
        starterCode: {
            c:      '#include <stdio.h>\n\nint main() {\n    // เขียนโค้ดที่นี่\n    \n    return 0;\n}',
            cpp:    '#include <iostream>\nusing namespace std;\n\nint main() {\n    // เขียนโค้ดที่นี่\n    \n    return 0;\n}',
            python: '# เขียนโค้ดที่นี่\n',
            java:   'public class Main {\n    public static void main(String[] args) {\n        // เขียนโค้ดที่นี่\n        \n    }\n}',
        },
    },
    {
        id: 'd2', icon: '➕',
        unitName: 'หน่วยที่ 2: โครงสร้างการตัดสินใจ',
        unitColor: { bg: '#f0fdf4', border: '#bbf7d0', btn: '#16a34a', tag: '#dcfce7', tagText: '#166534' },
        title: 'จัดเกรด A-F',
        description: 'รับคะแนน (0-100) 1 ค่า แล้วแสดงเกรด\n≥80 → A\n≥70 → B\n≥60 → C\n≥50 → D\nอื่นๆ → F',
        sampleInput: '75',
        expectedOutput: 'B',
        hint: {
            c:      'ใช้ if-else if ตรวจสอบเงื่อนไขจากมากไปน้อย',
            cpp:    'ใช้ if-else if ตรวจสอบเงื่อนไขจากมากไปน้อย',
            python: 'ใช้ if / elif / else ตรวจสอบเงื่อนไขจากมากไปน้อย',
            java:   'ใช้ if-else if ตรวจสอบเงื่อนไขจากมากไปน้อย',
        },
        starterCode: {
            c:      '#include <stdio.h>\n\nint main() {\n    int score;\n    scanf("%d", &score);\n    \n    // ตรวจสอบเกรดที่นี่\n    \n    return 0;\n}',
            cpp:    '#include <iostream>\nusing namespace std;\n\nint main() {\n    int score;\n    cin >> score;\n    \n    // ตรวจสอบเกรดที่นี่\n    \n    return 0;\n}',
            python: 'score = int(input())\n\n# ตรวจสอบเกรดที่นี่\n',
            java:   'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int score = sc.nextInt();\n        \n        // ตรวจสอบเกรดที่นี่\n        \n    }\n}',
        },
    },
    {
        id: 'd3', icon: '🔄',
        unitName: 'หน่วยที่ 3: โครงสร้างวนซ้ำ',
        unitColor: { bg: '#fdf4ff', border: '#e9d5ff', btn: '#9333ea', tag: '#f3e8ff', tagText: '#6b21a8' },
        title: 'ผลรวม 1 ถึง N',
        description: 'รับค่า N (จำนวนเต็มบวก) แล้วแสดง\nผลรวมของ 1+2+3+...+N',
        sampleInput: '5',
        expectedOutput: '15',
        hint: {
            c:      'ใช้ for loop สะสมค่าใน sum แล้ว printf ผลลัพธ์',
            cpp:    'ใช้ for loop สะสมค่าใน sum แล้ว cout ผลลัพธ์',
            python: 'ใช้ for i in range(1, n+1): แล้ว sum += i หรือใช้ sum(range(1,n+1))',
            java:   'ใช้ for loop สะสมค่าใน sum แล้ว System.out.println',
        },
        starterCode: {
            c:      '#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    \n    int sum = 0;\n    // วนซ้ำที่นี่\n    \n    printf("%d\\n", sum);\n    return 0;\n}',
            cpp:    '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    \n    int sum = 0;\n    // วนซ้ำที่นี่\n    \n    cout << sum << endl;\n    return 0;\n}',
            python: 'n = int(input())\n\nsum = 0\n# วนซ้ำที่นี่\n\nprint(sum)\n',
            java:   'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        \n        int sum = 0;\n        // วนซ้ำที่นี่\n        \n        System.out.println(sum);\n    }\n}',
        },
    },
    {
        id: 'd4', icon: '🏆',
        unitName: 'หน่วยที่ 4: ฟังก์ชัน',
        unitColor: { bg: '#fff7ed', border: '#fed7aa', btn: '#ea580c', tag: '#ffedd5', tagText: '#7c2d12' },
        title: 'ค่าสูงสุด 3 ตัวเลข',
        description: 'เขียนฟังก์ชัน maxOfThree(a, b, c)\nรับ 3 จำนวนเต็ม แล้วแสดงค่าที่มากที่สุด',
        sampleInput: '4 9 2',
        expectedOutput: '9',
        hint: {
            c:      'เขียนฟังก์ชัน int maxOfThree(int a, int b, int c) ก่อน main',
            cpp:    'เขียนฟังก์ชัน int maxOfThree(int a, int b, int c) ก่อน main',
            python: 'เขียน def maxOfThree(a, b, c): แล้ว return max(a,b,c) หรือใช้ if-elif',
            java:   'เขียน static int maxOfThree(int a, int b, int c) ภายในคลาส Main',
        },
        starterCode: {
            c:      '#include <stdio.h>\n\nint maxOfThree(int a, int b, int c) {\n    // คืนค่าที่มากที่สุด\n    \n}\n\nint main() {\n    int a, b, c;\n    scanf("%d %d %d", &a, &b, &c);\n    printf("%d\\n", maxOfThree(a, b, c));\n    return 0;\n}',
            cpp:    '#include <iostream>\nusing namespace std;\n\nint maxOfThree(int a, int b, int c) {\n    // คืนค่าที่มากที่สุด\n    \n}\n\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n    cout << maxOfThree(a, b, c) << endl;\n    return 0;\n}',
            python: 'def maxOfThree(a, b, c):\n    # คืนค่าที่มากที่สุด\n    pass\n\nvals = list(map(int, input().split()))\nprint(maxOfThree(vals[0], vals[1], vals[2]))\n',
            java:   'import java.util.Scanner;\n\npublic class Main {\n    static int maxOfThree(int a, int b, int c) {\n        // คืนค่าที่มากที่สุด\n        return 0;\n    }\n    \n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt(), b = sc.nextInt(), c = sc.nextInt();\n        System.out.println(maxOfThree(a, b, c));\n    }\n}',
        },
    },
];

// ── Run helper (Wandbox → Piston fallback, correct field names) ───────────────
const _runCode = async (code, language, input) => {
    const normalize = (data) => {
        const out = (data.program_output || '').trim();
        const err = (data.compiler_error || data.program_error || '').trim();
        if (err && !out) return { output: err, isError: true };
        return { output: out || '(ไม่มีผลลัพธ์)', isError: false };
    };

    // 1. Wandbox (C/C++/Python — Java ข้าม เพราะ class name ไม่ตรง filename)
    if (language !== 'java') {
        try {
            const wbBody = { compiler: WANDBOX_COMPILER[language] || 'gcc-head', code, stdin: input || '' };
            if (WANDBOX_OPTIONS[language]) wbBody.options = WANDBOX_OPTIONS[language];
            const wbRes = await fetch(WANDBOX_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wbBody),
            });
            if (wbRes.ok) return normalize(await wbRes.json());
        } catch (_) {}
    }

    // 2. Piston (all languages)
    try {
        return normalize(await runWithPiston(code, language, input || ''));
    } catch (_) {}

    // 3. All APIs unavailable
    return { output: 'ระบบ compiler ไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง', isError: true };
};

// ── Problem Workspace ─────────────────────────────────────────────────────────
const _GuestWorkspace = ({ problem, onBack }) => {
    const [language,  setLanguage]  = React.useState('c');
    const [code,      setCode]      = React.useState(problem.starterCode.c);
    const [input,     setInput]     = React.useState(problem.sampleInput);
    const [output,    setOutput]    = React.useState('');
    const [running,   setRunning]   = React.useState(false);
    const [verdict,   setVerdict]   = React.useState(null);
    const [showHint,  setShowHint]  = React.useState(false);
    const [fontSize,  setFontSize]  = React.useState(14);
    const [fontFamily,setFontFamily]= React.useState('Consolas');
    const [theme,     setTheme]     = React.useState('dracula');
    const [aiPanel,    setAiPanel]    = React.useState(null); // null|'analyze'|'hint'|'chat'
    const [aiLoading,  setAiLoading]  = React.useState(false);
    const [analyzeRes, setAnalyzeRes] = React.useState(null);
    const [hintLevel,  setHintLevel]  = React.useState(1);
    const [aiHintText, setAiHintText] = React.useState('');
    const [chatMsgs,   setChatMsgs]   = React.useState([]);
    const [chatInput,  setChatInput]  = React.useState('');

    const c = problem.unitColor;
    const bg = '#0f172a', panel = '#1e293b', border = '#334155';

    const handleLangChange = (lang) => {
        if (code !== problem.starterCode[language]) {
            if (!window.confirm('เปลี่ยนภาษา — โค้ดปัจจุบันจะถูกแทนที่ด้วย starter code ของภาษาใหม่\nดำเนินการต่อ?')) return;
        }
        setLanguage(lang);
        setCode(problem.starterCode[lang]);
        setOutput(''); setVerdict(null);
    };

    const runCode = async () => {
        if (running) return;
        setRunning(true); setOutput(''); setVerdict(null);
        if (typeof logUsageEvent === 'function') {
            logUsageEvent('demo', 'demo_run', { problemId: problem.id, userType: 'demo', lang: language });
        }
        const { output: out, isError } = await _runCode(code, language, input);
        setOutput(out);
        if (!isError && problem.expectedOutput) {
            setVerdict(out.trim() === problem.expectedOutput.trim() ? 'pass' : 'fail');
        } else if (isError) {
            setVerdict('error');
        }
        setRunning(false);
    };

    const resetCode = () => {
        if (window.confirm('รีเซ็ตโค้ดกลับเป็น starter code?')) {
            setCode(problem.starterCode[language]);
            setOutput(''); setVerdict(null);
        }
    };

    const doAnalyze = async () => {
        if (aiLoading) return;
        setAiLoading(true); setAnalyzeRes(null);
        try {
            if (!GEMINI_KEY || !GEMINI_KEY.trim()) await loadGeminiKey();
            const res = await analyzeCode(code, language);
            setAnalyzeRes(res);
            if (typeof logUsageEvent === 'function')
                logUsageEvent('demo', 'ai_analyze', { problemId: problem.id, userType: 'demo', lang: language });
        } catch (_) {
            setAnalyzeRes({ feedback: 'ไม่สามารถวิเคราะห์โค้ดได้ในขณะนี้ กรุณาลองใหม่' });
        }
        setAiLoading(false);
    };

    const doHint = async (level) => {
        if (aiLoading) return;
        setAiLoading(true); setHintLevel(level); setAiHintText('');
        try {
            if (!GEMINI_KEY || !GEMINI_KEY.trim()) await loadGeminiKey();
            const h = await getScaffoldingHint(code, language, problem.title, problem.description, [], level);
            setAiHintText(h);
            if (typeof logUsageEvent === 'function')
                logUsageEvent('demo', 'ai_hint', { problemId: problem.id, userType: 'demo', lang: language, hintLevel: level });
        } catch (_) {
            setAiHintText('ไม่สามารถขอคำใบ้ได้ในขณะนี้');
        }
        setAiLoading(false);
    };

    const doChat = async () => {
        if (!chatInput.trim() || aiLoading) return;
        const q = chatInput.trim();
        setChatMsgs(m => [...m, { role: 'user', text: q }]);
        setChatInput('');
        setAiLoading(true);
        try {
            if (!GEMINI_KEY || !GEMINI_KEY.trim()) await loadGeminiKey();
            const resp = await chatWithAI(q + '\n\n(โจทย์: ' + problem.title + ')', language);
            setChatMsgs(m => [...m, { role: 'ai', text: resp }]);
            if (typeof logUsageEvent === 'function')
                logUsageEvent('demo', 'ai_chat', { problemId: problem.id, userType: 'demo', lang: language });
        } catch (_) {
            setChatMsgs(m => [...m, { role: 'ai', text: 'ไม่สามารถตอบได้ในขณะนี้' }]);
        }
        setAiLoading(false);
    };

    const verdictStyle = {
        pass:  { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: '✅', label: 'ถูกต้อง!' },
        fail:  { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '🟡', label: 'ผลลัพธ์ไม่ตรง' },
        error: { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '❌', label: 'เกิดข้อผิดพลาด' },
    };

    const btnSt = (extra = {}) => ({
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 12px', borderRadius: 7, border: 'none',
        cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
        fontSize: 12, fontWeight: 600, ...extra,
    });

    const langInfo = _DEMO_LANGS.find(l => l.value === language) || _DEMO_LANGS[0];
    const tips = _LANG_TIPS[language] || _LANG_TIPS.c;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Prompt',sans-serif", display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{ background: bg, borderBottom: `1px solid ${border}`, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={onBack} style={btnSt({ background: '#1e293b', border: `1px solid ${border}`, color: '#94a3b8' })}>← โจทย์อื่น</button>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{problem.icon} {problem.title}</span>
                    <span style={{ fontSize: 10, background: c.tag, color: c.tagText, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{problem.unitName}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>🎭 Demo</span>
                    <a href="#/register" style={btnSt({ background: 'linear-gradient(135deg,#ec4899,#be185d)', color: 'white' })}>✨ สมัครสมาชิก</a>
                </div>
            </div>

            {/* Toolbar */}
            <div style={{ background: panel, borderBottom: `1px solid ${border}`, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                {/* Language selector */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {_DEMO_LANGS.map(l => (
                        <button key={l.value} onClick={() => handleLangChange(l.value)}
                            style={btnSt({
                                background: language === l.value ? l.color : bg,
                                color: language === l.value ? 'white' : '#64748b',
                                border: `1px solid ${language === l.value ? l.color : border}`,
                                padding: '4px 10px', fontSize: 12,
                            })}>
                            {l.label}
                        </button>
                    ))}
                </div>
                <div style={{ flex: 1 }} />
                {/* Font size */}
                <button onClick={() => setFontSize(f => Math.max(10, f-1))} style={btnSt({ background: bg, color: '#94a3b8', border: `1px solid ${border}`, padding: '4px 8px' })}>A−</button>
                <span style={{ fontSize: 11, color: '#64748b', minWidth: 20, textAlign: 'center' }}>{fontSize}</span>
                <button onClick={() => setFontSize(f => Math.min(24, f+1))} style={btnSt({ background: bg, color: '#94a3b8', border: `1px solid ${border}`, padding: '4px 8px' })}>A+</button>
                {/* Font family */}
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                    style={{ background: bg, color: '#94a3b8', border: `1px solid ${border}`, borderRadius: 7, padding: '4px 7px', fontFamily: "'Prompt',sans-serif", fontSize: 11, cursor: 'pointer' }}>
                    {_DEMO_CODING_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                {/* Theme */}
                <select value={theme} onChange={e => setTheme(e.target.value)}
                    style={{ background: bg, color: '#a78bfa', border: '1px solid #7c3aed44', borderRadius: 7, padding: '4px 7px', fontFamily: "'Prompt',sans-serif", fontSize: 11, cursor: 'pointer' }}>
                    {_DEMO_THEMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {/* Reset */}
                <button onClick={resetCode} style={btnSt({ background: bg, color: '#ef4444', border: '1px solid #f8717166' })}>🔄 รีเซ็ต</button>
                {/* Run */}
                <button onClick={runCode} disabled={running}
                    style={btnSt({ background: running ? '#334155' : `linear-gradient(135deg,${c.btn},${c.btn}cc)`, color: 'white', opacity: running ? 0.7 : 1, padding: '5px 16px' })}>
                    {running ? '⏳ กำลังรัน...' : '▶ รันโค้ด'}
                </button>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                {/* Left panel */}
                <div style={{ width: 320, background: 'white', borderRight: '1px solid #f1f5f9', padding: 16, overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Problem description */}
                    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.tagText, marginBottom: 6 }}>📝 โจทย์</div>
                        <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{problem.description}</p>
                    </div>

                    {/* Expected output */}
                    {problem.expectedOutput && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 4 }}>✅ ผลลัพธ์ที่ถูกต้อง</div>
                            {problem.sampleInput && (
                                <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 4 }}>
                                    Input: <code style={{ background: '#e5e7eb', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>{problem.sampleInput}</code>
                                </div>
                            )}
                            <code style={{ fontSize: 13, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                                {problem.expectedOutput}
                            </code>
                        </div>
                    )}

                    {/* Hint */}
                    <button onClick={() => setShowHint(h => !h)}
                        style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', fontSize: 12, color: '#92400e', cursor: 'pointer', fontFamily: "'Prompt',sans-serif" }}>
                        💡 {showHint ? 'ซ่อนคำใบ้' : 'ขอคำใบ้'}
                    </button>
                    {showHint && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                            {problem.hint[language] || problem.hint.c}
                        </div>
                    )}

                    {/* Tips */}
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            💡 {_DEMO_LANGS.find(l => l.value === language)?.label || 'C'} Quick Tips
                        </div>
                        {tips.map(t => (
                            <div key={t.code} style={{ fontSize: 11, color: '#374151', marginBottom: 5, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                                <span style={{ flexShrink: 0 }}>{t.icon}</span>
                                <span><code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, fontSize: 10, color: '#475569' }}>{t.code}</code> {t.desc}</span>
                            </div>
                        ))}
                    </div>

                    {/* AI Section */}
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🤖 AI Assistant</div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: aiPanel ? 8 : 0, flexWrap: 'wrap' }}>
                            {[['analyze','#7c3aed','🔍 วิเคราะห์'],['hint','#f59e0b','💡 คำใบ้ AI'],['chat','#3b82f6','💬 แชท']].map(([key,col,label]) => (
                                <button key={key} onClick={() => setAiPanel(aiPanel === key ? null : key)}
                                    style={{ padding: '4px 9px', borderRadius: 7, border: `1px solid ${col}44`, fontSize: 11, cursor: 'pointer', fontFamily: "'Prompt',sans-serif", fontWeight: 600,
                                        background: aiPanel === key ? col : '#f9fafb', color: aiPanel === key ? 'white' : col }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        {/* Analyze panel */}
                        {aiPanel === 'analyze' && (
                            <div>
                                <button onClick={doAnalyze} disabled={aiLoading}
                                    style={{ width: '100%', padding: '6px', marginBottom: 6, borderRadius: 8, background: aiLoading ? '#ddd6fe' : '#7c3aed', color: 'white', border: 'none', cursor: aiLoading ? 'wait' : 'pointer', fontSize: 12, fontFamily: "'Prompt',sans-serif", fontWeight: 600 }}>
                                    {aiLoading ? '⏳ กำลังวิเคราะห์...' : '🔍 วิเคราะห์โค้ดนี้'}
                                </button>
                                {analyzeRes && (
                                    <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
                                        {analyzeRes.metrics && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
                                                {Object.entries(analyzeRes.metrics).slice(0,4).map(([k,v]) => (
                                                    <div key={k} style={{ background: '#ede9fe', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{v}</div>
                                                        <div style={{ fontSize: 9, color: '#8b5cf6' }}>
                                                            {k === 'quality' ? 'คุณภาพ' : k === 'correctness' ? 'ถูกต้อง' : k === 'efficiency' ? 'ประสิทธิภาพ' : 'อ่านง่าย'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <p style={{ margin: '0 0 5px', color: '#374151', lineHeight: 1.5 }}>{analyzeRes.feedback}</p>
                                        {analyzeRes.suggestion && <p style={{ margin: 0, color: '#6b7280', fontSize: 10, lineHeight: 1.5 }}>💡 {analyzeRes.suggestion}</p>}
                                    </div>
                                )}
                                {!analyzeRes && !aiLoading && (
                                    <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 11, padding: '10px 0' }}>กดปุ่มเพื่อวิเคราะห์โค้ด</div>
                                )}
                            </div>
                        )}
                        {/* Hint panel */}
                        {aiPanel === 'hint' && (
                            <div>
                                <div style={{ fontSize: 11, color: '#92400e', marginBottom: 6 }}>เลือกระดับคำใบ้:</div>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                                    {[1,2,3].map(lv => (
                                        <button key={lv} onClick={() => doHint(lv)} disabled={aiLoading}
                                            style={{ flex: 1, padding: '5px 4px', borderRadius: 7, background: hintLevel === lv && aiHintText ? '#f59e0b' : '#fef3c7', color: '#92400e', border: '1px solid #fde68a', cursor: aiLoading ? 'wait' : 'pointer', fontSize: 11, fontFamily: "'Prompt',sans-serif", fontWeight: 600 }}>
                                            {aiLoading && hintLevel === lv ? '⏳' : `ระดับ ${lv}`}
                                        </button>
                                    ))}
                                </div>
                                {aiHintText && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
                                        {aiHintText}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Chat panel */}
                        {aiPanel === 'chat' && (
                            <div>
                                <div style={{ maxHeight: 140, minHeight: 40, overflowY: 'auto', marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 5, padding: '2px 0' }}>
                                    {chatMsgs.length === 0 && (
                                        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '10px 0' }}>ถามเกี่ยวกับโจทย์หรือโค้ดได้เลย</div>
                                    )}
                                    {chatMsgs.map((m, i) => (
                                        <div key={i} style={{ padding: '5px 7px', borderRadius: 7, fontSize: 11, lineHeight: 1.5,
                                            background: m.role === 'user' ? '#eff6ff' : '#f0fdf4',
                                            color: m.role === 'user' ? '#1e40af' : '#166534',
                                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                            border: m.role === 'user' ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                                            maxWidth: '88%',
                                        }}>{m.text}</div>
                                    ))}
                                    {aiLoading && aiPanel === 'chat' && <div style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'flex-start' }}>⏳ AI กำลังคิด...</div>}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && doChat()}
                                        placeholder="ถาม AI... (Enter)"
                                        style={{ flex: 1, padding: '5px 8px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 11, fontFamily: "'Prompt',sans-serif", outline: 'none' }} />
                                    <button onClick={doChat} disabled={aiLoading || !chatInput.trim()}
                                        style={{ padding: '5px 9px', background: chatInput.trim() ? '#3b82f6' : '#e5e7eb', color: chatInput.trim() ? 'white' : '#9ca3af', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontFamily: "'Prompt',sans-serif" }}>
                                        ส่ง
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CTA */}
                    <div style={{ marginTop: 'auto', background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', border: '1px dashed #f9a8d4', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#be185d', fontWeight: 700, marginBottom: 4 }}>ปลดล็อกฟีเจอร์เพิ่มเติม</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, lineHeight: 1.5 }}>XP · อันดับ · AI Coach · ส่งงาน</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#be185d', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>FQE28Y</div>
                        <a href="#/register" style={{ display: 'block', padding: '7px', borderRadius: 8, background: 'linear-gradient(135deg,#ec4899,#be185d)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 11 }}>✨ สมัครสมาชิกฟรี</a>
                    </div>
                </div>

                {/* Right: editor + output */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: bg }}>
                    <style>{`
                        .gwp-editor .CodeMirror, .gwp-editor .CodeMirror-scroll {
                            font-size: ${fontSize}px !important;
                            font-family: '${fontFamily}', Consolas, monospace !important;
                            line-height: 1.6 !important;
                        }
                    `}</style>
                    <div className="gwp-editor" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        <CodeEditor value={code} onChange={setCode} language={language}
                            placeholder={`// เขียนโค้ดที่นี่`} minHeight="100%"
                            fontSize={fontSize} theme={theme} fontFamily={fontFamily} />
                    </div>

                    {/* Bottom: Input + Output */}
                    <div style={{ background: '#020617', borderTop: `1px solid ${border}`, padding: '10px 14px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: output || running ? 10 : 0 }}>
                            <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>📥 Input:</span>
                            <input value={input} onChange={e => setInput(e.target.value)}
                                placeholder="ว่างไว้ถ้าไม่มี input"
                                style={{ flex: 1, padding: '4px 10px', background: '#1e293b', border: `1px solid ${border}`, borderRadius: 7, color: '#e2e8f0', fontFamily: "'Consolas',monospace", fontSize: 12, outline: 'none' }} />
                        </div>
                        {(output || running) && (
                            <div>
                                {verdict && verdictStyle[verdict] && (
                                    <div style={{ background: verdictStyle[verdict].bg, border: `1px solid ${verdictStyle[verdict].border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: verdictStyle[verdict].color, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {verdictStyle[verdict].icon} {verdictStyle[verdict].label}
                                        {verdict === 'fail' && (
                                            <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 4 }}>
                                                (คาดหวัง: <code style={{ background: 'rgba(0,0,0,.08)', padding: '1px 4px', borderRadius: 3 }}>{problem.expectedOutput}</code>)
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>Output:</div>
                                <pre style={{ margin: 0, color: verdict === 'error' ? '#f87171' : verdict === 'pass' ? '#4ade80' : '#e2e8f0', fontFamily: "'Consolas',monospace", fontSize: 12, lineHeight: 1.6, maxHeight: 150, overflowY: 'auto', background: '#0a0a0a', padding: '8px 10px', borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    {running ? '...' : output}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Free Editor (multi-language, matches enrolled student editor) ──────────────
const _GuestFreeEditor = ({ onBack }) => {
    const [language,   setLanguage]  = React.useState('c');
    const [code,       setCode]      = React.useState(_LANG_STARTERS.c);
    const [filename,   setFilename]  = React.useState('main');
    const [input,      setInput]     = React.useState('');
    const [output,     setOutput]    = React.useState('');
    const [running,    setRunning]   = React.useState(false);
    const [hasError,   setHasError]  = React.useState(false);
    const [runCount,   setRunCount]  = React.useState(0);
    const [fontSize,   setFontSize]  = React.useState(14);
    const [fontFamily, setFontFamily]= React.useState('Consolas');
    const [theme,      setTheme]     = React.useState('dracula');
    const [copied,     setCopied]    = React.useState(false);
    const fileInputRef = React.useRef(null);
    const [aiPanel,    setAiPanel]    = React.useState(null); // null|'analyze'|'chat'
    const [aiLoading,  setAiLoading]  = React.useState(false);
    const [analyzeRes, setAnalyzeRes] = React.useState(null);
    const [chatMsgs,   setChatMsgs]   = React.useState([]);
    const [chatInput,  setChatInput]  = React.useState('');

    const bg = '#0f172a', panel = '#1e293b', border = '#334155';
    const btnSt = (extra = {}) => ({
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 8, border: 'none',
        cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
        fontSize: 12, fontWeight: 600, transition: 'opacity .15s', ...extra,
    });

    const handleLangChange = (lang) => {
        if (code !== _LANG_STARTERS[language]) {
            if (!window.confirm('เปลี่ยนภาษา — โค้ดปัจจุบันจะถูกแทนที่ด้วย starter code\nดำเนินการต่อ?')) return;
        }
        setLanguage(lang);
        setCode(_LANG_STARTERS[lang]);
        setOutput(''); setHasError(false);
        // auto-set class name for Java
        if (lang === 'java') setFilename('Main');
    };

    const langInfo = _DEMO_LANGS.find(l => l.value === language) || _DEMO_LANGS[0];
    const tips = _LANG_TIPS[language] || _LANG_TIPS.c;

    const runCode = async () => {
        if (running) return;
        setRunning(true); setOutput(''); setHasError(false);
        if (typeof logUsageEvent === 'function') {
            logUsageEvent('demo', 'demo_run', { problemId: 'free_editor', userType: 'demo', lang: language });
        }
        const { output: out, isError } = await _runCode(code, language, input);
        setOutput(out); setHasError(isError);
        setRunning(false);
        setRunCount(c => c + 1);
    };

    const resetCode = () => {
        if (window.confirm('รีเซ็ตโค้ดกลับเป็นค่าเริ่มต้น?')) {
            setCode(_LANG_STARTERS[language]);
            setOutput(''); setInput(''); setHasError(false); setRunCount(0);
        }
    };

    const copyCode = () => {
        navigator.clipboard?.writeText(code).catch(() => {});
        setCopied(true); setTimeout(() => setCopied(false), 1500);
    };

    const downloadCode = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${filename || 'main'}.${langInfo.ext}`;
        a.click();
    };

    const openFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { setCode(ev.target.result || ''); setOutput(''); };
        reader.readAsText(file);
        e.target.value = '';
    };

    const doAnalyzeFE = async () => {
        if (aiLoading) return;
        setAiLoading(true); setAnalyzeRes(null);
        try {
            if (!GEMINI_KEY || !GEMINI_KEY.trim()) await loadGeminiKey();
            const res = await analyzeCode(code, language);
            setAnalyzeRes(res);
            if (typeof logUsageEvent === 'function')
                logUsageEvent('demo', 'ai_analyze', { problemId: 'free_editor', userType: 'demo', lang: language });
        } catch (_) {
            setAnalyzeRes({ feedback: 'ไม่สามารถวิเคราะห์โค้ดได้ในขณะนี้' });
        }
        setAiLoading(false);
    };

    const doChatFE = async () => {
        if (!chatInput.trim() || aiLoading) return;
        const q = chatInput.trim();
        setChatMsgs(m => [...m, { role: 'user', text: q }]);
        setChatInput('');
        setAiLoading(true);
        try {
            if (!GEMINI_KEY || !GEMINI_KEY.trim()) await loadGeminiKey();
            const resp = await chatWithAI(q, language);
            setChatMsgs(m => [...m, { role: 'ai', text: resp }]);
            if (typeof logUsageEvent === 'function')
                logUsageEvent('demo', 'ai_chat', { problemId: 'free_editor', userType: 'demo', lang: language });
        } catch (_) {
            setChatMsgs(m => [...m, { role: 'ai', text: 'ไม่สามารถตอบได้ในขณะนี้' }]);
        }
        setAiLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', background: bg, color: '#f1f5f9', fontFamily: "'Prompt',sans-serif", display: 'flex', flexDirection: 'column' }}>
            <style>{`
                @keyframes termBlink { 0%,100%{opacity:1} 50%{opacity:0} }
                .gfe-editor .CodeMirror, .gfe-editor .CodeMirror-scroll {
                    font-size: ${fontSize}px !important;
                    font-family: '${fontFamily}', Consolas, monospace !important;
                    line-height: 1.6 !important;
                }
            `}</style>

            {/* Navbar */}
            <div style={{ background: '#ffffff', borderBottom: '1.5px solid #fce7f3', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={onBack} style={{ background: '#fdf2f8', border: '1px solid #fce7f3', borderRadius: 8, padding: '5px 12px', fontSize: 13, color: '#be185d', cursor: 'pointer', fontFamily: "'Prompt',sans-serif" }}>← กลับ</button>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>✏️ Free {langInfo.label} Editor</span>
                    <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>🎭 Demo</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {runCount > 0 && (
                        <span style={{ fontSize: 11, background: '#f0fdf4', color: '#166534', padding: '3px 10px', borderRadius: 10, fontWeight: 700, border: '1px solid #bbf7d0' }}>
                            ▶ รัน {runCount} ครั้ง
                        </span>
                    )}
                    <a href="#/register" style={{ fontSize: 12, fontWeight: 700, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg,#ec4899,#be185d)', padding: '6px 14px', borderRadius: 16 }}>✨ สมัครสมาชิก</a>
                </div>
            </div>

            {/* Toolbar */}
            <div style={{ background: panel, borderBottom: `1px solid ${border}`, padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                {/* Language selector */}
                <select value={language} onChange={e => handleLangChange(e.target.value)}
                    style={{ background: bg, color: '#f1f5f9', border: `1px solid ${border}`, borderRadius: 8, padding: '5px 10px', fontFamily: "'Prompt',sans-serif", fontSize: 12, cursor: 'pointer', outline: 'none' }}>
                    {_DEMO_LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>

                {/* Filename */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input value={filename} onChange={e => setFilename(e.target.value)} placeholder="ชื่อไฟล์"
                        style={{ background: bg, color: '#f1f5f9', border: `1px solid ${border}`, borderRadius: 8, padding: '5px 10px', fontFamily: "'Prompt',sans-serif", fontSize: 12, width: 90, outline: 'none' }} />
                    <span style={{ color: '#64748b', fontSize: 12 }}>.{langInfo.ext}</span>
                </div>

                <div style={{ flex: 1 }} />

                {/* Font size */}
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <button onClick={() => setFontSize(f => Math.max(10, f-1))} style={btnSt({ background: bg, color: '#94a3b8', border: `1px solid ${border}`, padding: '4px 9px' })}>A−</button>
                    <span style={{ fontSize: 11, color: '#64748b', minWidth: 22, textAlign: 'center' }}>{fontSize}</span>
                    <button onClick={() => setFontSize(f => Math.min(24, f+1))} style={btnSt({ background: bg, color: '#94a3b8', border: `1px solid ${border}`, padding: '4px 9px' })}>A+</button>
                </div>

                {/* Font family */}
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                    style={{ background: bg, color: '#94a3b8', border: `1px solid ${border}`, borderRadius: 8, padding: '4px 7px', fontFamily: "'Prompt',sans-serif", fontSize: 11, cursor: 'pointer', maxWidth: 140 }}>
                    {_DEMO_CODING_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>

                {/* Theme */}
                <select value={theme} onChange={e => setTheme(e.target.value)}
                    style={{ background: bg, color: '#a78bfa', border: '1px solid #7c3aed44', borderRadius: 8, padding: '4px 7px', fontFamily: "'Prompt',sans-serif", fontSize: 11, cursor: 'pointer', maxWidth: 170 }}>
                    {_DEMO_THEMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>

                {/* Reset */}
                <button onClick={resetCode} style={btnSt({ background: bg, color: '#ef4444', border: '1px solid #f8717166' })}>🔄 รีเซ็ต</button>

                {/* Open file */}
                <input ref={fileInputRef} type="file" accept=".c,.cpp,.cc,.cxx,.py,.java,.txt" style={{ display: 'none' }} onChange={openFile} />
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={btnSt({ background: bg, color: '#fbbf24', border: '1px solid #fbbf24' })}>📂 เปิดไฟล์</button>

                {/* Copy */}
                <button onClick={copyCode} style={btnSt({ background: copied ? '#10b981' : bg, color: copied ? '#fff' : '#94a3b8', border: `1px solid ${copied ? '#10b981' : border}` })}>
                    {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
                </button>

                {/* Download */}
                <button onClick={downloadCode} style={btnSt({ background: bg, color: '#34d399', border: '1px solid #34d399' })}>
                    💾 ดาวน์โหลด .{langInfo.ext}
                </button>

                {/* AI buttons */}
                <button onClick={() => setAiPanel(aiPanel === 'analyze' ? null : 'analyze')}
                    style={btnSt({ background: aiPanel === 'analyze' ? '#7c3aed' : bg, color: aiPanel === 'analyze' ? '#fff' : '#a78bfa', border: '1px solid #7c3aed44' })}>
                    🔍 วิเคราะห์
                </button>
                <button onClick={() => setAiPanel(aiPanel === 'chat' ? null : 'chat')}
                    style={btnSt({ background: aiPanel === 'chat' ? '#3b82f6' : bg, color: aiPanel === 'chat' ? '#fff' : '#60a5fa', border: '1px solid #3b82f644' })}>
                    💬 แชท AI
                </button>

                {/* Run */}
                <button onClick={runCode} disabled={running}
                    style={btnSt({ background: running ? '#475569' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', opacity: running ? 0.7 : 1, padding: '6px 18px' })}>
                    {running ? '⏳ กำลังรัน...' : '▶ รันโค้ด'}
                </button>
            </div>

            {/* Main area */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: aiPanel ? '220px 1fr 300px' : '220px 1fr', minHeight: 0 }}>
                {/* Left: tips + CTA */}
                <div style={{ background: '#ffffff', borderRight: '1px solid #f1f5f9', padding: '16px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Info */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 5 }}>✏️ เขียนโค้ดอิสระ</div>
                        <p style={{ fontSize: 11, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                            ไม่มีโจทย์ ไม่มีเกณฑ์ตัดสิน<br/>เขียนเองได้ตามต้องการ<br/>รัน Compile & Run ได้ทันที
                        </p>
                    </div>

                    {/* Language tips */}
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            💡 {langInfo.label} Quick Tips
                        </div>
                        {tips.map(t => (
                            <div key={t.code} style={{ fontSize: 11, color: '#374151', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.5 }}>
                                <span style={{ flexShrink: 0 }}>{t.icon}</span>
                                <span>
                                    <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 4, fontSize: 10, color: '#475569', display: 'block', marginBottom: 1 }}>{t.code}</code>
                                    <span style={{ fontSize: 10, color: '#6b7280' }}>{t.desc}</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div style={{ marginTop: 'auto', background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', border: '1px dashed #f9a8d4', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#be185d', fontWeight: 700, marginBottom: 4 }}>บันทึกโค้ด + ส่งงาน</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, lineHeight: 1.5 }}>สมัครสมาชิกเพื่อปลดล็อก XP · AI Coach · Grade</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#be185d', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>FQE28Y</div>
                        <a href="#/register" style={{ display: 'block', padding: '7px', borderRadius: 8, background: 'linear-gradient(135deg,#ec4899,#be185d)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 11 }}>✨ สมัครฟรี</a>
                    </div>
                </div>

                {/* Right: editor + terminal */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* Editor */}
                    <div className="gfe-editor" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        <CodeEditor value={code} onChange={setCode} language={language}
                            placeholder={`// เขียนโค้ด ${langInfo.label} ที่นี่`}
                            minHeight="100%" fontSize={fontSize} theme={theme} fontFamily={fontFamily} />
                    </div>

                    {/* Terminal */}
                    <div style={{ background: '#020617', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
                        {/* Terminal header */}
                        <div style={{ padding: '6px 14px', borderBottom: `1px solid #0f172a`, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                            <span style={{ marginLeft: 8, fontFamily: "'Consolas',monospace", fontSize: 11, color: '#475569' }}>
                                {filename || 'main'}.{langInfo.ext}
                            </span>
                            {output && (
                                <button onClick={() => { setOutput(''); setHasError(false); }}
                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11 }}>
                                    ↺ ล้าง
                                </button>
                            )}
                        </div>
                        {/* Input row */}
                        <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid #0f172a` }}>
                            <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>📥 Input:</span>
                            <input value={input} onChange={e => setInput(e.target.value)}
                                placeholder="ว่างไว้ถ้าไม่มี input"
                                style={{ flex: 1, padding: '4px 10px', background: '#1e293b', border: `1px solid ${border}`, borderRadius: 7, color: '#e2e8f0', fontFamily: "'Consolas',monospace", fontSize: 12, outline: 'none' }} />
                        </div>
                        {/* Output area */}
                        <div style={{ padding: '10px 14px', minHeight: 80, maxHeight: 200, overflowY: 'auto' }}>
                            {running ? (
                                <div style={{ fontFamily: "'Consolas',monospace", fontSize: 12, color: '#94a3b8' }}>
                                    <span style={{ color: '#34d399' }}>$ </span>กำลังประมวลผล...
                                    <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#34d399', marginLeft: 4, verticalAlign: 'middle', animation: 'termBlink 1s step-start infinite' }} />
                                </div>
                            ) : output ? (
                                <pre style={{ margin: 0, fontFamily: "'Consolas',monospace", fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: hasError ? '#f87171' : '#4ade80' }}>
                                    {output}
                                </pre>
                            ) : (
                                <div style={{ fontFamily: "'Consolas',monospace", fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: '#34d399' }}>$</span><span>กด </span>
                                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>▶ รันโค้ด</span>
                                    <span style={{ display: 'inline-block', width: 8, height: '1.1em', background: '#334155', animation: 'termBlink 1s step-start infinite', verticalAlign: 'middle' }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Panel — right column */}
                {aiPanel && (
                    <div style={{ background: '#0f172a', borderLeft: `1px solid ${border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${border}`, display: 'flex', gap: 6, alignItems: 'center', background: panel, flexShrink: 0 }}>
                            <button onClick={() => setAiPanel('analyze')}
                                style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: "'Prompt',sans-serif", fontWeight: 600,
                                    background: aiPanel === 'analyze' ? '#7c3aed' : '#1e293b', color: aiPanel === 'analyze' ? 'white' : '#a78bfa' }}>
                                🔍 วิเคราะห์
                            </button>
                            <button onClick={() => setAiPanel('chat')}
                                style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: "'Prompt',sans-serif", fontWeight: 600,
                                    background: aiPanel === 'chat' ? '#3b82f6' : '#1e293b', color: aiPanel === 'chat' ? 'white' : '#60a5fa' }}>
                                💬 แชท
                            </button>
                            <button onClick={() => setAiPanel(null)}
                                style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: 6, border: 'none', background: '#334155', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>
                                ✕
                            </button>
                        </div>
                        {/* Analyze view */}
                        {aiPanel === 'analyze' && (
                            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                                <button onClick={doAnalyzeFE} disabled={aiLoading}
                                    style={{ width: '100%', padding: '8px', marginBottom: 12, borderRadius: 9, background: aiLoading ? '#4c1d95' : '#7c3aed', color: 'white', border: 'none', cursor: aiLoading ? 'wait' : 'pointer', fontSize: 13, fontFamily: "'Prompt',sans-serif", fontWeight: 600 }}>
                                    {aiLoading ? '⏳ กำลังวิเคราะห์...' : '🔍 วิเคราะห์โค้ดนี้'}
                                </button>
                                {analyzeRes && (
                                    <div style={{ color: '#e2e8f0' }}>
                                        {analyzeRes.metrics && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                                                {Object.entries(analyzeRes.metrics).slice(0,4).map(([k,v]) => (
                                                    <div key={k} style={{ background: '#1e1b4b', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: '1px solid #3730a3' }}>
                                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa' }}>{v}</div>
                                                        <div style={{ fontSize: 9, color: '#818cf8', marginTop: 2 }}>
                                                            {k === 'quality' ? 'คุณภาพ' : k === 'correctness' ? 'ถูกต้อง' : k === 'efficiency' ? 'ประสิทธิภาพ' : 'อ่านง่าย'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <p style={{ fontSize: 12, lineHeight: 1.7, margin: '0 0 8px', color: '#cbd5e1' }}>{analyzeRes.feedback}</p>
                                        {analyzeRes.suggestion && <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>💡 {analyzeRes.suggestion}</p>}
                                    </div>
                                )}
                                {!analyzeRes && !aiLoading && (
                                    <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, paddingTop: 30, lineHeight: 2 }}>
                                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                                        กดปุ่มเพื่อวิเคราะห์<br/>โค้ดด้วย AI
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Chat view */}
                        {aiPanel === 'chat' && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {chatMsgs.length === 0 && (
                                        <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, paddingTop: 30, lineHeight: 2 }}>
                                            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                                            ถามคำถามเกี่ยวกับ<br/>การเขียนโปรแกรมได้เลย
                                        </div>
                                    )}
                                    {chatMsgs.map((m, i) => (
                                        <div key={i} style={{ padding: '7px 10px', borderRadius: 9, fontSize: 12, lineHeight: 1.6, maxWidth: '90%',
                                            background: m.role === 'user' ? '#1e3a5f' : '#172554',
                                            color: m.role === 'user' ? '#93c5fd' : '#86efac',
                                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                            border: m.role === 'user' ? '1px solid #1e40af' : '1px solid #166534',
                                        }}>{m.text}</div>
                                    ))}
                                    {aiLoading && <div style={{ fontSize: 12, color: '#64748b', alignSelf: 'flex-start' }}>⏳ AI กำลังคิด...</div>}
                                </div>
                                <div style={{ padding: '8px 12px', borderTop: `1px solid ${border}`, display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && doChatFE()}
                                        placeholder="ถาม AI... (Enter)"
                                        style={{ flex: 1, padding: '6px 10px', background: '#1e293b', border: `1px solid ${border}`, borderRadius: 8, color: '#e2e8f0', fontFamily: "'Consolas',monospace", fontSize: 12, outline: 'none' }} />
                                    <button onClick={doChatFE} disabled={aiLoading || !chatInput.trim()}
                                        style={{ padding: '6px 12px', background: chatInput.trim() ? '#3b82f6' : '#334155', color: chatInput.trim() ? 'white' : '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: "'Prompt',sans-serif" }}>
                                        ส่ง
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main Landing Page ─────────────────────────────────────────────────────────
const GuestLandingPage = () => {
    const [active, setActive] = React.useState(null); // null | problem_obj | 'editor'

    if (active === 'editor') return <_GuestFreeEditor onBack={() => setActive(null)} />;
    if (active && typeof active === 'object') return <_GuestWorkspace problem={active} onBack={() => setActive(null)} />;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fdf2f8 0%,#fce7f3 50%,#fbcfe8 100%)', fontFamily: "'Prompt',sans-serif" }}>
            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1.5px solid #fce7f3', boxShadow: '0 2px 12px rgba(236,72,153,.08)', padding: '0 24px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="https://www.triamudomsouth.ac.th/images/theme/150x150.png" alt="โลโก้"
                            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fbcfe8' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#be185d' }}>AI-Powered Coding Coach (APCC)</div>
                            <div style={{ fontSize: 10, color: '#f9a8d4' }}>🎭 โหมดทดลองใช้งาน — ไม่ต้องสมัครสมาชิก</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <a href="#/login" style={{ fontSize: 12, color: '#be185d', textDecoration: 'none', fontWeight: 600 }}>เข้าสู่ระบบ</a>
                        <a href="#/register" style={{ fontSize: 12, fontWeight: 700, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg,#ec4899,#be185d)', padding: '7px 16px', borderRadius: 20 }}>✨ สมัครฟรี</a>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 56px' }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>💻</div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#be185d', margin: '0 0 10px' }}>
                        ทดลองเขียนโปรแกรมได้เลย!
                    </h1>
                    <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 520, margin: '0 auto 16px', lineHeight: 1.8 }}>
                        รองรับหลายภาษา · เลือกโจทย์ตัวอย่าง 4 หน่วย หรือเขียนโค้ดอิสระ<br/>
                        ไม่ต้องสมัครสมาชิก ไม่ต้อง login · Compile & Run จริงทุกภาษา
                    </p>
                    {/* Language badges */}
                    <div style={{ display: 'inline-flex', gap: 10, background: 'white', borderRadius: 20, padding: '10px 20px', boxShadow: '0 2px 16px rgba(236,72,153,.1)', marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {_DEMO_LANGS.map(l => (
                            <span key={l.value} style={{ fontSize: 12, fontWeight: 700, color: l.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                                {l.label}
                            </span>
                        ))}
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>·</span>
                        {['⚡ Compile & Run จริง', '🆓 ฟรี 100%', '🎨 CodeMirror Editor'].map(f => (
                            <span key={f} style={{ fontSize: 11, color: '#be185d', fontWeight: 600 }}>{f}</span>
                        ))}
                    </div>
                </div>

                {/* Problem cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 44 }}>
                    {_DEMO_PROBLEMS.map(p => {
                        const c = p.unitColor;
                        return (
                            <div key={p.id} onClick={() => setActive(p)}
                                style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 20, padding: '22px 18px', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,.12)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.04)'; }}
                            >
                                <div style={{ fontSize: 34, marginBottom: 10 }}>{p.icon}</div>
                                <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: c.tagText, background: c.tag, padding: '2px 8px', borderRadius: 10, marginBottom: 8 }}>{p.unitName}</div>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: '0 0 6px', lineHeight: 1.3 }}>{p.title}</h3>
                                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 14px', lineHeight: 1.5 }}>{p.description.split('\n')[0]}</p>
                                {/* Language badges */}
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                                    {_DEMO_LANGS.map(l => (
                                        <span key={l.value} style={{ fontSize: 9, fontWeight: 700, color: l.color, background: l.color + '18', padding: '1px 6px', borderRadius: 6 }}>{l.label}</span>
                                    ))}
                                </div>
                                <div style={{ textAlign: 'center', padding: '8px', borderRadius: 10, background: c.btn, color: 'white', fontWeight: 700, fontSize: 12 }}>▶ เริ่มทำโจทย์</div>
                            </div>
                        );
                    })}
                </div>

                {/* Free Editor banner */}
                <div onClick={() => setActive('editor')}
                    style={{ cursor: 'pointer', borderRadius: 20, marginBottom: 28, overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg,#1e1b4b,#312e81,#1e3a5f)', boxShadow: '0 8px 32px rgba(99,102,241,.25)', transition: 'transform .2s, box-shadow .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(99,102,241,.35)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,.25)'; }}
                >
                    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%', padding: '16px 24px', opacity: 0.15, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#a5b4fc', lineHeight: 1.8, overflow: 'hidden', pointerEvents: 'none' }}>
                        {'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello!");\n  }\n}'.split('\n').map((ln, i) => <div key={i}>{ln}</div>)}
                    </div>
                    <div style={{ position: 'relative', padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ fontSize: 44, flexShrink: 0 }}>✏️</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 5 }}>Free Code Editor — เขียนโค้ดอิสระ</div>
                            <div style={{ fontSize: 12, color: '#a5b4fc', lineHeight: 1.7 }}>
                                รองรับ C · C++ · Python · Java · ไม่มีโจทย์ ไม่มีเกณฑ์ · Compile & Run จริง · Font & Theme เลือกได้
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                {_DEMO_LANGS.map(l => (
                                    <span key={l.value} style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: l.color + 'aa', padding: '2px 8px', borderRadius: 8 }}>{l.label}</span>
                                ))}
                            </div>
                        </div>
                        <div style={{ flexShrink: 0, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', padding: '11px 24px', borderRadius: 14, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 16px rgba(99,102,241,.5)' }}>เปิด Editor →</div>
                    </div>
                </div>

                {/* CTA */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ background: 'white', borderRadius: 24, padding: '28px 36px', display: 'inline-block', boxShadow: '0 4px 24px rgba(236,72,153,.12)', maxWidth: 540, width: '100%' }}>
                        <p style={{ fontSize: 16, color: '#374151', margin: '0 0 6px', fontWeight: 700 }}>อยากได้ฟีเจอร์เพิ่มเติม?</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 18px', lineHeight: 1.7 }}>
                            สมัครสมาชิกแล้วเข้าห้องเรียนเพื่อปลดล็อก XP, อันดับ, เกม, AI Coach และโจทย์ครบทุกหน่วย
                        </p>
                        <div style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', border: '2px dashed #f9a8d4', borderRadius: 16, padding: '14px 20px', marginBottom: 16 }}>
                            <div style={{ fontSize: 11, color: '#be185d', fontWeight: 600, marginBottom: 5 }}>🏫 รหัสห้องเรียน</div>
                            <div style={{ fontSize: 40, fontWeight: 900, color: '#be185d', letterSpacing: '0.18em', fontFamily: "'JetBrains Mono','Consolas',monospace" }}>FQE28Y</div>
                            <div style={{ fontSize: 11, color: '#f472b6', marginTop: 3 }}>ใช้รหัสนี้เมื่อสมัครสมาชิกเพื่อเข้าร่วมชั้นเรียน</div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <a href="#/login" style={{ padding: '10px 22px', borderRadius: 12, border: '1.5px solid #f9a8d4', color: '#be185d', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>เข้าสู่ระบบ</a>
                            <a href="#/register" style={{ padding: '10px 22px', borderRadius: 12, background: 'linear-gradient(135deg,#ec4899,#be185d)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>✨ สมัครสมาชิกฟรี</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

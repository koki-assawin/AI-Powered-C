// js/pages/GuestLandingPage.js — Demo/Guest Mode (v2.0)
// ไม่ต้องการ Firebase Auth — ทำงานอิสระโดยสมบูรณ์

const _DEMO_PROBLEMS = [
    {
        id: 'd1', icon: '👋',
        unitName: 'หน่วยที่ 1: โครงสร้างโปรแกรม C',
        unitColor: { bg: '#eff6ff', border: '#bfdbfe', btn: '#3b82f6', tag: '#dbeafe', tagText: '#1e40af' },
        title: 'Hello, World!',
        description: 'เขียนโปรแกรมภาษา C ที่แสดงข้อความ\nHello, World!\nออกหน้าจอ (ขึ้นบรรทัดใหม่ท้ายข้อความ)',
        sampleInput: '',
        expectedOutput: 'Hello, World!',
        hint: 'ใช้ printf("Hello, World!\\n"); ภายใน main()',
        starterCode: '#include <stdio.h>\n\nint main() {\n    // เขียนโค้ดที่นี่\n    \n    return 0;\n}',
    },
    {
        id: 'd2', icon: '➕',
        unitName: 'หน่วยที่ 2: โครงสร้างการตัดสินใจ',
        unitColor: { bg: '#f0fdf4', border: '#bbf7d0', btn: '#16a34a', tag: '#dcfce7', tagText: '#166534' },
        title: 'จัดเกรด A-F',
        description: 'รับคะแนน (0-100) 1 ค่า แล้วแสดงเกรด\n≥80 → A\n≥70 → B\n≥60 → C\n≥50 → D\nอื่นๆ → F',
        sampleInput: '75',
        expectedOutput: 'B',
        hint: 'ใช้ if-else if ตรวจสอบเงื่อนไขจากมากไปน้อย',
        starterCode: '#include <stdio.h>\n\nint main() {\n    int score;\n    scanf("%d", &score);\n    \n    // ตรวจสอบเกรดที่นี่\n    \n    return 0;\n}',
    },
    {
        id: 'd3', icon: '🔄',
        unitName: 'หน่วยที่ 3: โครงสร้างวนซ้ำ',
        unitColor: { bg: '#fdf4ff', border: '#e9d5ff', btn: '#9333ea', tag: '#f3e8ff', tagText: '#6b21a8' },
        title: 'ผลรวม 1 ถึง N',
        description: 'รับค่า N (จำนวนเต็มบวก) แล้วแสดง\nผลรวมของ 1+2+3+...+N',
        sampleInput: '5',
        expectedOutput: '15',
        hint: 'ใช้ for loop สะสมค่าใน sum แล้ว printf ผลลัพธ์',
        starterCode: '#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    \n    int sum = 0;\n    // วนซ้ำที่นี่\n    \n    printf("%d\\n", sum);\n    return 0;\n}',
    },
    {
        id: 'd4', icon: '🏆',
        unitName: 'หน่วยที่ 4: ฟังก์ชัน',
        unitColor: { bg: '#fff7ed', border: '#fed7aa', btn: '#ea580c', tag: '#ffedd5', tagText: '#7c2d12' },
        title: 'ค่าสูงสุด 3 ตัวเลข',
        description: 'เขียนฟังก์ชัน maxOfThree(a, b, c)\nรับ 3 จำนวนเต็ม แล้วแสดงค่าที่มากที่สุด',
        sampleInput: '4 9 2',
        expectedOutput: '9',
        hint: 'เขียนฟังก์ชัน int maxOfThree(int a, int b, int c) ก่อน main',
        starterCode: '#include <stdio.h>\n\nint maxOfThree(int a, int b, int c) {\n    // คืนค่าที่มากที่สุด\n    \n}\n\nint main() {\n    int a, b, c;\n    scanf("%d %d %d", &a, &b, &c);\n    printf("%d\\n", maxOfThree(a, b, c));\n    return 0;\n}',
    },
];

// ── Mini workspace (inline) ─────────────────────────────────────────────────
const _GuestWorkspace = ({ problem, onBack }) => {
    const [code, setCode]         = React.useState(problem.starterCode);
    const [input, setInput]       = React.useState(problem.sampleInput);
    const [output, setOutput]     = React.useState('');
    const [running, setRunning]   = React.useState(false);
    const [verdict, setVerdict]   = React.useState(null); // null | 'pass' | 'fail' | 'error'
    const [showHint, setShowHint] = React.useState(false);
    const c = problem.unitColor;

    const runCode = async () => {
        if (running) return;
        setRunning(true); setOutput(''); setVerdict(null);
        try {
            const res = await runWithPiston(code, 'c', input);
            const out = (res.output || '').trim();
            const err = res.errorLog || '';
            if (err && !out) {
                setOutput(err);
                setVerdict('error');
            } else {
                setOutput(out || '(ไม่มีผลลัพธ์)');
                if (problem.expectedOutput) {
                    const exp = problem.expectedOutput.trim();
                    setVerdict(out === exp ? 'pass' : 'fail');
                }
            }
        } catch (e) {
            setOutput('เชื่อมต่อ compiler ไม่สำเร็จ: ' + e.message);
            setVerdict('error');
        } finally {
            setRunning(false);
        }
    };

    const verdictStyle = {
        pass:  { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: '✅', label: 'ถูกต้อง!' },
        fail:  { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '🟡', label: 'ผลลัพธ์ไม่ตรง' },
        error: { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '❌', label: 'เกิดข้อผิดพลาด' },
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Prompt',sans-serif", display: 'flex', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{ background: 'white', borderBottom: '1.5px solid #fce7f3', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={onBack}
                        style={{ background: '#fdf2f8', border: '1px solid #fce7f3', borderRadius: 8, padding: '5px 12px', fontSize: 13, color: '#be185d', cursor: 'pointer', fontFamily: "'Prompt',sans-serif" }}>
                        ← โจทย์อื่น
                    </button>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>{problem.icon} {problem.title}</span>
                    <span style={{ fontSize: 11, background: c.tag, color: c.tagText, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{problem.unitName}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>🎭 Demo</span>
                    <a href="#/register" style={{ fontSize: 12, fontWeight: 700, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg,#ec4899,#be185d)', padding: '6px 14px', borderRadius: 16 }}>
                        ✨ สมัครสมาชิก
                    </a>
                </div>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                {/* Left: problem panel */}
                <div style={{ width: 300, background: 'white', borderRight: '1px solid #f1f5f9', padding: 18, overflowY: 'auto', flexShrink: 0 }}>
                    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: c.tagText, marginBottom: 8 }}>📝 โจทย์</div>
                        <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                            {problem.description}
                        </p>
                    </div>

                    {problem.expectedOutput && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 6 }}>✅ ผลลัพธ์ที่ถูกต้อง (Input: {problem.sampleInput || 'ไม่มี'})</div>
                            <code style={{ fontSize: 13, color: '#15803d', background: '#dcfce7', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                                {problem.expectedOutput}
                            </code>
                        </div>
                    )}

                    <button onClick={() => setShowHint(h => !h)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', fontSize: 13, color: '#92400e', cursor: 'pointer', fontFamily: "'Prompt',sans-serif", marginBottom: 8 }}>
                        💡 {showHint ? 'ซ่อนคำใบ้' : 'ขอคำใบ้'}
                    </button>
                    {showHint && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                            {problem.hint}
                        </div>
                    )}
                </div>

                {/* Right: editor + output */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    {/* Code editor */}
                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 11, color: '#9ca3af', zIndex: 1 }}>C Language</div>
                        <textarea
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            spellCheck={false}
                            style={{
                                width: '100%', height: '100%', padding: '14px 16px',
                                background: '#1e1e1e', color: '#e2e8f0',
                                fontFamily: "'JetBrains Mono','Consolas',monospace",
                                fontSize: 14, lineHeight: 1.7,
                                border: 'none', outline: 'none', resize: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Input + Run + Output */}
                    <div style={{ background: '#0f172a', borderTop: '1px solid #334155', padding: '12px 16px', flexShrink: 0 }}>
                        {/* Input row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>📥 Input:</span>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="ว่างไว้ถ้าไม่มี input"
                                style={{
                                    flex: 1, padding: '5px 10px', background: '#1e293b',
                                    border: '1px solid #334155', borderRadius: 8,
                                    color: '#e2e8f0', fontFamily: "'Consolas',monospace",
                                    fontSize: 13, outline: 'none',
                                }}
                            />
                            <button onClick={runCode} disabled={running}
                                style={{
                                    padding: '7px 20px', borderRadius: 10, border: 'none',
                                    background: running ? '#334155' : `linear-gradient(135deg,${c.btn},${c.btn}cc)`,
                                    color: 'white', fontFamily: "'Prompt',sans-serif",
                                    fontWeight: 700, fontSize: 13, cursor: running ? 'wait' : 'pointer',
                                    flexShrink: 0,
                                }}>
                                {running ? '⏳ กำลังรัน...' : '▶ Run'}
                            </button>
                        </div>

                        {/* Output */}
                        {(output || running) && (
                            <div>
                                {verdict && (
                                    <div style={{
                                        background: verdictStyle[verdict].bg,
                                        border: `1px solid ${verdictStyle[verdict].border}`,
                                        borderRadius: 8, padding: '6px 12px',
                                        fontSize: 13, color: verdictStyle[verdict].color,
                                        fontWeight: 600, marginBottom: 8,
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}>
                                        {verdictStyle[verdict].icon} {verdictStyle[verdict].label}
                                    </div>
                                )}
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Output:</div>
                                <pre style={{
                                    margin: 0, color: output.includes('error') || verdict === 'error' ? '#f87171' : '#4ade80',
                                    fontFamily: "'Consolas',monospace", fontSize: 13,
                                    lineHeight: 1.6, maxHeight: 120, overflowY: 'auto',
                                    background: '#0a0a0a', padding: '8px 10px', borderRadius: 8,
                                }}>
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

// ── Main Landing Page ────────────────────────────────────────────────────────
const GuestLandingPage = () => {
    const [active, setActive] = React.useState(null);

    if (active) {
        return <_GuestWorkspace problem={active} onBack={() => setActive(null)} />;
    }

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
                        <a href="#/register" style={{
                            fontSize: 12, fontWeight: 700, color: 'white', textDecoration: 'none',
                            background: 'linear-gradient(135deg,#ec4899,#be185d)',
                            padding: '7px 16px', borderRadius: 20,
                        }}>✨ สมัครฟรี</a>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 60px' }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: 44 }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>💻</div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#be185d', margin: '0 0 10px' }}>
                        ทดลองเขียนโปรแกรม C ได้เลย!
                    </h1>
                    <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.8 }}>
                        เลือกโจทย์ตัวอย่าง 1 ใน 4 หน่วย เขียนโค้ด แล้วกด Run ดูผลทันที<br/>
                        ไม่ต้องสมัครสมาชิก ไม่ต้อง login
                    </p>
                    <div style={{ display: 'inline-flex', gap: 20, background: 'white', borderRadius: 20, padding: '12px 24px', boxShadow: '0 2px 16px rgba(236,72,153,.1)' }}>
                        {['⚡ Compile & Run จริง', '🆓 ฟรี 100%', '📱 ใช้ได้ทุกอุปกรณ์'].map(f => (
                            <span key={f} style={{ fontSize: 12, color: '#be185d', fontWeight: 600 }}>{f}</span>
                        ))}
                    </div>
                </div>

                {/* Problem cards — 4 columns, single row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 48 }}>
                    {_DEMO_PROBLEMS.map(p => {
                        const c = p.unitColor;
                        return (
                            <div key={p.id}
                                onClick={() => setActive(p)}
                                style={{
                                    background: c.bg, border: `2px solid ${c.border}`,
                                    borderRadius: 20, padding: '24px 20px',
                                    cursor: 'pointer', transition: 'transform .2s, box-shadow .2s',
                                    boxShadow: '0 2px 12px rgba(0,0,0,.04)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.12)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.04)'; }}
                            >
                                <div style={{ fontSize: 36, marginBottom: 12 }}>{p.icon}</div>
                                <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: c.tagText, background: c.tag, padding: '2px 8px', borderRadius: 10, marginBottom: 10 }}>
                                    {p.unitName}
                                </div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: '0 0 8px', lineHeight: 1.3 }}>{p.title}</h3>
                                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.6 }}>
                                    {p.description.split('\n')[0]}
                                </p>
                                <div style={{
                                    textAlign: 'center', padding: '9px', borderRadius: 12,
                                    background: c.btn, color: 'white',
                                    fontWeight: 700, fontSize: 13,
                                }}>
                                    ▶ เริ่มทำโจทย์
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA — room code */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ background: 'white', borderRadius: 24, padding: '32px 40px', display: 'inline-block', boxShadow: '0 4px 24px rgba(236,72,153,.12)', maxWidth: 560, width: '100%' }}>
                        <p style={{ fontSize: 17, color: '#374151', margin: '0 0 6px', fontWeight: 700 }}>
                            อยากได้ฟีเจอร์เพิ่มเติม?
                        </p>
                        <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px', lineHeight: 1.7 }}>
                            สมัครสมาชิกแล้วเข้าห้องเรียนเพื่อปลดล็อก XP, อันดับ, เกม, AI Coach และโจทย์ครบทุกหน่วย
                        </p>

                        {/* Room code */}
                        <div style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', border: '2px dashed #f9a8d4', borderRadius: 16, padding: '16px 24px', marginBottom: 20 }}>
                            <div style={{ fontSize: 12, color: '#be185d', fontWeight: 600, marginBottom: 6 }}>🏫 รหัสห้องเรียน</div>
                            <div style={{ fontSize: 44, fontWeight: 900, color: '#be185d', letterSpacing: '0.18em', fontFamily: "'JetBrains Mono','Consolas',monospace" }}>
                                FQE28Y
                            </div>
                            <div style={{ fontSize: 11, color: '#f472b6', marginTop: 4 }}>ใช้รหัสนี้เมื่อสมัครสมาชิกเพื่อเข้าร่วมชั้นเรียน</div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <a href="#/login" style={{
                                padding: '11px 26px', borderRadius: 12,
                                border: '1.5px solid #f9a8d4', color: '#be185d',
                                textDecoration: 'none', fontWeight: 600, fontSize: 14,
                            }}>เข้าสู่ระบบ</a>
                            <a href="#/register" style={{
                                padding: '11px 26px', borderRadius: 12,
                                background: 'linear-gradient(135deg,#ec4899,#be185d)', color: 'white',
                                textDecoration: 'none', fontWeight: 700, fontSize: 14,
                            }}>✨ สมัครสมาชิกฟรี</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

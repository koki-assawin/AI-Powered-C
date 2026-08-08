// js/pages/student/LearningTools.js — Interactive Learning Tools Hub v1.0
// หน่วยที่ 1-4 ว31281 — 5Es Interactive Tools
// Route: #/student/tools

// ════════════════════════════════════════════════════════════════════════════
// TOOL 1: DATA TYPE VISUALIZER (หน่วยที่ 1 — Engage)
// ════════════════════════════════════════════════════════════════════════════

const C_TYPES = [
    { name: 'char',          bits: 8,  signed: true,  min: -128,              max: 127,                  printf: '%c / %d', color: '#22d3ee' },
    { name: 'unsigned char', bits: 8,  signed: false, min: 0,                 max: 255,                  printf: '%u',      color: '#67e8f9' },
    { name: 'short',         bits: 16, signed: true,  min: -32768,            max: 32767,                printf: '%hd',     color: '#818cf8' },
    { name: 'unsigned short',bits: 16, signed: false, min: 0,                 max: 65535,                printf: '%hu',     color: '#a5b4fc' },
    { name: 'int',           bits: 32, signed: true,  min: -2147483648,       max: 2147483647,           printf: '%d',      color: '#4ade80' },
    { name: 'unsigned int',  bits: 32, signed: false, min: 0,                 max: 4294967295,           printf: '%u',      color: '#86efac' },
    { name: 'long',          bits: 64, signed: true,  min: -9223372036854775808, max: 9223372036854775807, printf: '%ld',  color: '#fb923c' },
    { name: 'float',         bits: 32, signed: true,  min: -3.4e38,           max: 3.4e38,               printf: '%f',      color: '#fbbf24' },
    { name: 'double',        bits: 64, signed: true,  min: -1.8e308,          max: 1.8e308,              printf: '%lf',     color: '#f472b6' },
];

const _DataTypeVisualizer = () => {
    const [selected, setSelected] = React.useState('int');
    const [inputVal, setInputVal] = React.useState('');
    const [overflow, setOverflow] = React.useState(null);

    const type = C_TYPES.find(t => t.name === selected) || C_TYPES[4];
    const maxBits = 64;
    const bitBarWidth = (type.bits / maxBits) * 100;

    const formatNum = (n) => {
        if (Math.abs(n) >= 1e15) return n.toExponential(2);
        return Number(n).toLocaleString('th-TH');
    };

    const checkOverflow = () => {
        const v = parseFloat(inputVal);
        if (isNaN(v)) { setOverflow({ ok: false, msg: 'ค่าไม่ใช่ตัวเลข' }); return; }
        if (v < type.min || v > type.max) {
            setOverflow({ ok: false, msg: `⚠️ Overflow! ค่า ${v.toLocaleString()} อยู่นอกขอบเขต [${formatNum(type.min)}, ${formatNum(type.max)}]` });
        } else {
            setOverflow({ ok: true, msg: `✅ ค่า ${v.toLocaleString()} อยู่ในขอบเขต ใช้ printf("${type.printf}", ${v}) ได้` });
        }
    };

    const bits = Array.from({ length: type.bits }, (_, i) => i);

    return (
        <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                🎯 <strong style={{ color: '#f1f5f9' }}>หน่วยที่ 1 · แผนที่ 3</strong> — เลือก data type เพื่อดูขนาด (sizeof) และขอบเขตค่า (range)
            </div>

            {/* Type selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {C_TYPES.map(t => (
                    <button key={t.name} onClick={() => { setSelected(t.name); setOverflow(null); setInputVal(''); }}
                        style={{
                            padding: '5px 12px', borderRadius: 20, border: `1px solid ${selected === t.name ? t.color : '#334155'}`,
                            background: selected === t.name ? t.color + '22' : 'transparent',
                            color: selected === t.name ? t.color : '#94a3b8',
                            fontSize: 12, cursor: 'pointer', fontFamily: "'Courier New',monospace",
                            fontWeight: selected === t.name ? 700 : 400,
                        }}>
                        {t.name}
                    </button>
                ))}
            </div>

            {/* Main info */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ textAlign: 'center', background: '#0f172a', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: type.color }}>{type.bits}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>bits / {type.bits / 8} bytes</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>sizeof({type.name.split(' ').pop()})</div>
                    </div>
                    <div style={{ textAlign: 'center', background: '#0f172a', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{formatNum(type.min)}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>ค่าต่ำสุด</div>
                    </div>
                    <div style={{ textAlign: 'center', background: '#0f172a', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{formatNum(type.max)}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>ค่าสูงสุด</div>
                    </div>
                </div>

                {/* Bit size bar */}
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>ขนาดเทียบกับ double (64 bits)</div>
                    <div style={{ height: 12, background: '#0f172a', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: `${bitBarWidth}%`,
                            background: `linear-gradient(90deg,${type.color},${type.color}88)`,
                            borderRadius: 6, transition: 'width .4s',
                        }} />
                    </div>
                </div>

                {/* Bit pattern visualization */}
                <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                        รูปแบบ bit {type.bits <= 32 ? '(แสดงแบบสัญลักษณ์)' : ''}
                        {type.signed && <span style={{ color: '#f87171', marginLeft: 8 }}>bit ซ้ายสุด = sign bit</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {bits.map(i => (
                            <div key={i} style={{
                                width: type.bits <= 16 ? 18 : type.bits <= 32 ? 12 : 8,
                                height: 18, borderRadius: 3,
                                background: (type.signed && i === 0) ? '#7f1d1d' : '#334155',
                                border: `1px solid ${(type.signed && i === 0) ? '#ef4444' : '#475569'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 8, color: '#64748b',
                            }}>
                                {type.bits <= 32 ? (i === 0 && type.signed ? 'S' : '') : ''}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                    printf format: <code style={{ color: '#fbbf24', background: '#0f172a', padding: '1px 6px', borderRadius: 4 }}>{type.printf}</code>
                </div>
            </div>

            {/* Overflow checker */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, border: '1px solid #334155' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>
                    🔍 ทดสอบ Overflow — ใส่ค่าแล้วดูว่าอยู่ในขอบเขต {type.name} ไหม
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input value={inputVal} onChange={e => setInputVal(e.target.value)}
                        placeholder="ใส่ตัวเลข เช่น 300, -200, 3.14"
                        onKeyDown={e => e.key === 'Enter' && checkOverflow()}
                        style={{
                            flex: 1, padding: '7px 10px', borderRadius: 8,
                            border: '1px solid #334155', background: '#0f172a',
                            color: '#f1f5f9', fontSize: 13, fontFamily: "'Prompt',sans-serif",
                        }} />
                    <button onClick={checkOverflow} style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: type.color, color: '#0f172a', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>ตรวจสอบ</button>
                </div>
                {overflow && (
                    <div style={{
                        marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                        background: overflow.ok ? '#052e16' : '#1c0a0a',
                        color: overflow.ok ? '#4ade80' : '#f87171',
                        border: `1px solid ${overflow.ok ? '#166534' : '#991b1b'}`,
                    }}>
                        {overflow.msg}
                    </div>
                )}
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// TOOL 2: FLOWCHART BUILDER → C CODE (หน่วยที่ 1 — Engage)
// ════════════════════════════════════════════════════════════════════════════

const BLOCK_TYPES = [
    { type: 'start',    label: 'เริ่มต้น',    icon: '▶',  color: '#22c55e', shape: 'oval' },
    { type: 'input',    label: 'รับค่า Input', icon: '📥', color: '#3b82f6', shape: 'parallelogram' },
    { type: 'process',  label: 'ประมวลผล',     icon: '⚙️', color: '#8b5cf6', shape: 'rect' },
    { type: 'decision', label: 'เงื่อนไข',     icon: '🔀', color: '#f59e0b', shape: 'diamond' },
    { type: 'output',   label: 'แสดงผล',       icon: '📤', color: '#06b6d4', shape: 'parallelogram' },
    { type: 'end',      label: 'จบ',           icon: '⏹', color: '#ef4444', shape: 'oval' },
];

const _FlowchartBuilder = () => {
    const [blocks, setBlocks] = React.useState([
        { id: 1, type: 'start', text: 'int main()' },
        { id: 2, type: 'input', text: 'int n' },
        { id: 3, type: 'end',   text: 'return 0' },
    ]);
    const [nextId, setNextId] = React.useState(4);
    const [genCode, setGenCode] = React.useState('');
    const [generating, setGenerating] = React.useState(false);
    const [editId, setEditId] = React.useState(null);
    const [editText, setEditText] = React.useState('');

    const addBlock = (type) => {
        const def = BLOCK_TYPES.find(b => b.type === type);
        const newBlock = { id: nextId, type, text: def.label };
        setBlocks(prev => {
            // Insert before 'end' if exists
            const endIdx = prev.findIndex(b => b.type === 'end');
            if (endIdx >= 0) {
                const next = [...prev];
                next.splice(endIdx, 0, newBlock);
                return next;
            }
            return [...prev, newBlock];
        });
        setNextId(prev => prev + 1);
    };

    const removeBlock = (id) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    };

    const moveBlock = (id, dir) => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === id);
            if (idx < 0) return prev;
            const next = [...prev];
            const swapIdx = idx + dir;
            if (swapIdx < 0 || swapIdx >= next.length) return prev;
            [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
            return next;
        });
    };

    const startEdit = (block) => { setEditId(block.id); setEditText(block.text); };
    const saveEdit = () => {
        setBlocks(prev => prev.map(b => b.id === editId ? { ...b, text: editText } : b));
        setEditId(null);
    };

    const generateCode = async () => {
        if (!blocks.length || generating) return;
        setGenerating(true);
        const flowDesc = blocks.map((b, i) => `${i + 1}. [${b.type.toUpperCase()}] ${b.text}`).join('\n');
        const prompt = `จาก Flowchart ต่อไปนี้ สร้าง C code ที่สมบูรณ์ (ภาษา C89/C99)
ให้ใส่ #include, main() function, และ comment อธิบายแต่ละส่วน

Flowchart:
${flowDesc}

กฎ:
- เขียน C code อย่างเดียว ไม่มีคำอธิบายนอก code block
- ใส่ comment ภาษาไทยอธิบายแต่ละ block ของ Flowchart
- สำหรับ decision block ให้ใช้ if-else
- สำหรับ loop/repeat ให้ใช้ for หรือ while`;

        try {
            const res = await callGeminiApi(prompt, null);
            const text = typeof res === 'string' ? res : (res?.text || '');
            // Extract code block
            const match = text.match(/```(?:c|C)?\n?([\s\S]+?)```/);
            setGenCode(match ? match[1].trim() : text.trim());
        } catch (e) {
            setGenCode('// เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setGenerating(false);
        }
    };

    const getBlockStyle = (type) => {
        const def = BLOCK_TYPES.find(b => b.type === type);
        return { borderColor: def?.color || '#475569', color: def?.color || '#94a3b8' };
    };

    return (
        <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                🎯 <strong style={{ color: '#f1f5f9' }}>หน่วยที่ 1 · แผนที่ 1</strong> — สร้าง Flowchart แล้วกด "สร้าง C Code" ให้ AI แปลงให้
            </div>

            {/* Block palette */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {BLOCK_TYPES.filter(b => b.type !== 'start' && b.type !== 'end').map(b => (
                    <button key={b.type} onClick={() => addBlock(b.type)} style={{
                        padding: '5px 12px', borderRadius: 8,
                        border: `1px solid ${b.color}44`, background: b.color + '15',
                        color: b.color, fontSize: 12, cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>
                        {b.icon} + {b.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Flowchart canvas */}
                <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                        คลิกข้อความเพื่อแก้ไข · ↑↓ เพื่อเรียงลำดับ
                    </div>
                    <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, minHeight: 200 }}>
                        {blocks.map((block, idx) => {
                            const def = BLOCK_TYPES.find(b => b.type === block.type);
                            return (
                                <div key={block.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                    {/* Arrow */}
                                    {idx > 0 && (
                                        <div style={{ position: 'absolute', marginTop: -20, marginLeft: 30, fontSize: 10, color: '#334155' }}>↓</div>
                                    )}
                                    <div style={{
                                        flex: 1, background: '#1e293b', border: `1.5px solid ${def?.color || '#475569'}`,
                                        borderRadius: block.type === 'decision' ? 0 : 8,
                                        transform: block.type === 'decision' ? 'none' : 'none',
                                        padding: '6px 10px', fontSize: 12, cursor: 'pointer',
                                        borderTopLeftRadius: (block.type === 'start' || block.type === 'end') ? 20 : 8,
                                        borderBottomRightRadius: (block.type === 'start' || block.type === 'end') ? 20 : 8,
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                    onClick={() => startEdit(block)}>
                                        <span style={{ color: def?.color }}>{def?.icon}</span>
                                        {editId === block.id ? (
                                            <input value={editText}
                                                onChange={e => setEditText(e.target.value)}
                                                onBlur={saveEdit} onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                                autoFocus
                                                style={{
                                                    flex: 1, background: 'transparent', border: 'none',
                                                    color: '#f1f5f9', fontSize: 12, outline: 'none',
                                                    fontFamily: "'Prompt',sans-serif",
                                                }} />
                                        ) : (
                                            <span style={{ color: '#e2e8f0', flex: 1 }}>{block.text}</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginLeft: 4 }}>
                                        <button onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} style={{
                                            padding: '1px 5px', borderRadius: 4, border: 'none',
                                            background: '#1e293b', color: '#64748b', fontSize: 10,
                                            cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1,
                                        }}>↑</button>
                                        <button onClick={() => moveBlock(block.id, 1)} disabled={idx === blocks.length - 1} style={{
                                            padding: '1px 5px', borderRadius: 4, border: 'none',
                                            background: '#1e293b', color: '#64748b', fontSize: 10,
                                            cursor: idx === blocks.length - 1 ? 'default' : 'pointer', opacity: idx === blocks.length - 1 ? 0.3 : 1,
                                        }}>↓</button>
                                    </div>
                                    {block.type !== 'start' && block.type !== 'end' && (
                                        <button onClick={() => removeBlock(block.id)} style={{
                                            padding: '1px 5px', borderRadius: 4, border: 'none',
                                            background: 'transparent', color: '#7f1d1d', fontSize: 12,
                                            cursor: 'pointer', marginLeft: 2,
                                        }}>✕</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={generateCode} disabled={generating} style={{
                        width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 8, border: 'none',
                        background: generating ? '#1e293b' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: '#fff', fontSize: 13, fontWeight: 700,
                        cursor: generating ? 'not-allowed' : 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>
                        {generating ? '⏳ AI กำลังสร้าง Code...' : '✨ สร้าง C Code จาก Flowchart'}
                    </button>
                </div>

                {/* Generated code */}
                <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>C Code ที่ AI สร้างให้</div>
                    <div style={{
                        background: '#0f172a', borderRadius: 10, padding: 12, minHeight: 200,
                        fontFamily: "'Courier New',monospace", fontSize: 12, color: '#e2e8f0',
                        whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: 320, lineHeight: 1.6,
                    }}>
                        {genCode || <span style={{ color: '#334155' }}>// Code จะปรากฏที่นี่หลังกดสร้าง...</span>}
                    </div>
                    {genCode && (
                        <button onClick={() => navigator.clipboard?.writeText(genCode)} style={{
                            marginTop: 6, padding: '5px 12px', borderRadius: 6, border: '1px solid #334155',
                            background: 'transparent', color: '#64748b', fontSize: 11,
                            cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                        }}>📋 คัดลอก Code</button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// TOOL 3: VISUAL DECISION TREE (หน่วยที่ 2 — Explain)
// ════════════════════════════════════════════════════════════════════════════

const _DecisionTreeViz = () => {
    const [code, setCode] = React.useState(
`int score = 75;
if (score >= 80) {
    printf("A");
} else if (score >= 70) {
    printf("B");
} else if (score >= 60) {
    printf("C");
} else {
    printf("F");
}`
    );
    const [tree, setTree] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [inputVal, setInputVal] = React.useState('75');
    const [activePath, setActivePath] = React.useState([]);

    const analyzeCode = async () => {
        if (!code.trim() || loading) return;
        setLoading(true);
        setTree(null);
        setActivePath([]);

        const schema = {
            type: 'object',
            properties: {
                nodes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id:        { type: 'string' },
                            type:      { type: 'string', enum: ['condition','action','result'] },
                            text:      { type: 'string' },
                            yes:       { type: 'string' },
                            no:        { type: 'string' },
                            line:      { type: 'integer' },
                        },
                        required: ['id','type','text'],
                    },
                },
                root: { type: 'string' },
            },
            required: ['nodes','root'],
        };

        const prompt = `วิเคราะห์โค้ด C ต่อไปนี้และสร้าง Decision Tree
แต่ละ node ต้องมี: id (เช่น n1,n2), type (condition=if-condition, action=statement, result=printf/output), text (ข้อความสั้น), yes (id ของ branch true), no (id ของ branch false), line (เลขบรรทัด)
โค้ด:
${code}`;

        try {
            const res = await callGeminiApi(prompt, schema);
            if (res?.nodes && res?.root) setTree(res);
            else setTree({ error: 'ไม่สามารถวิเคราะห์โค้ดได้' });
        } catch (e) {
            setTree({ error: 'เกิดข้อผิดพลาด: ' + e.message });
        } finally {
            setLoading(false);
        }
    };

    const traceExecution = async () => {
        if (!tree?.nodes || !inputVal.trim() || loading) return;
        setLoading(true);
        const prompt = `โค้ด C ต่อไปนี้ ถ้า score = ${inputVal} บอก id ของ node ที่ execute ตามลำดับ (เฉพาะ id เป็น array string):
${code}
nodes: ${JSON.stringify(tree.nodes.map(n => ({ id: n.id, type: n.type, text: n.text })))}`;

        const schema2 = { type: 'object', properties: { path: { type: 'array', items: { type: 'string' } } }, required: ['path'] };
        try {
            const res = await callGeminiApi(prompt, schema2);
            setActivePath(res?.path || []);
        } catch (_) {}
        setLoading(false);
    };

    const renderNode = (nodeId, depth = 0) => {
        if (!tree?.nodes || depth > 10) return null;
        const node = tree.nodes.find(n => n.id === nodeId);
        if (!node) return null;

        const isActive = activePath.includes(node.id);
        const typeColors = { condition: '#f59e0b', action: '#8b5cf6', result: '#22c55e' };
        const color = typeColors[node.type] || '#64748b';

        return (
            <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px' }}>
                <div style={{
                    padding: '6px 12px', borderRadius: node.type === 'condition' ? 0 : 8,
                    border: `2px solid ${isActive ? '#ffffff' : color}`,
                    background: isActive ? color + 'aa' : color + '22',
                    color: isActive ? '#fff' : color,
                    fontSize: 12, textAlign: 'center', minWidth: 80, maxWidth: 140,
                    transform: node.type === 'condition' ? 'rotate(45deg)' : 'none',
                    boxShadow: isActive ? `0 0 10px ${color}` : 'none',
                    transition: 'all .3s',
                    fontWeight: isActive ? 700 : 400,
                }}>
                    <span style={{ transform: node.type === 'condition' ? 'rotate(-45deg)' : 'none', display: 'block' }}>
                        {node.text}
                    </span>
                </div>
                {(node.yes || node.no) && (
                    <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                        {node.yes && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 4 }}>✓ True</div>
                                <div style={{ width: 1, height: 16, background: '#334155', margin: '0 auto' }} />
                                {renderNode(node.yes, depth + 1)}
                            </div>
                        )}
                        {node.no && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 4 }}>✗ False</div>
                                <div style={{ width: 1, height: 16, background: '#334155', margin: '0 auto' }} />
                                {renderNode(node.no, depth + 1)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                🎯 <strong style={{ color: '#f1f5f9' }}>หน่วยที่ 2 · แผนที่ 10</strong> — วาง if-else code แล้ว AI วิเคราะห์เป็น Decision Tree ให้เห็นทางการทำงาน
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>วาง C code ที่มี if-else</div>
                    <textarea value={code} onChange={e => setCode(e.target.value)} rows={10} style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #334155',
                        background: '#0f172a', color: '#e2e8f0', fontSize: 12,
                        fontFamily: "'Courier New',monospace", boxSizing: 'border-box', resize: 'vertical',
                    }} />
                    <button onClick={analyzeCode} disabled={loading} style={{
                        width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 8, border: 'none',
                        background: loading ? '#1e293b' : '#f59e0b',
                        color: '#0f172a', fontSize: 13, fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>
                        {loading ? '⏳ AI วิเคราะห์...' : '🌳 วิเคราะห์เป็น Decision Tree'}
                    </button>

                    {tree?.nodes && (
                        <div style={{ marginTop: 12, background: '#1e293b', borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                                🔍 Trace — ถ้าตัวแปรมีค่าเท่ากับ?
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input value={inputVal} onChange={e => setInputVal(e.target.value)}
                                    placeholder="ค่าที่ต้องการ trace" style={{
                                        flex: 1, padding: '6px 10px', borderRadius: 6,
                                        border: '1px solid #334155', background: '#0f172a',
                                        color: '#f1f5f9', fontSize: 12, fontFamily: "'Prompt',sans-serif",
                                    }} />
                                <button onClick={traceExecution} style={{
                                    padding: '6px 12px', borderRadius: 6, border: 'none',
                                    background: '#6366f1', color: '#fff', fontSize: 12,
                                    cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                                }}>Trace</button>
                            </div>
                            {activePath.length > 0 && (
                                <div style={{ marginTop: 8, fontSize: 11, color: '#4ade80' }}>
                                    Execution path: {activePath.join(' → ')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Decision Tree</div>
                    <div style={{
                        background: '#0f172a', borderRadius: 10, padding: 16,
                        minHeight: 200, overflowX: 'auto', overflowY: 'auto', maxHeight: 400,
                        display: 'flex', justifyContent: 'center',
                    }}>
                        {!tree && !loading && (
                            <div style={{ color: '#334155', fontSize: 12, alignSelf: 'center' }}>
                                Tree จะปรากฏที่นี่หลังกดวิเคราะห์
                            </div>
                        )}
                        {loading && <div style={{ alignSelf: 'center' }}><Spinner text="AI วิเคราะห์..." /></div>}
                        {tree?.error && <div style={{ color: '#f87171', alignSelf: 'center' }}>❌ {tree.error}</div>}
                        {tree?.nodes && tree?.root && renderNode(tree.root)}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// TOOL 4: PATTERN MASTER SANDBOX (หน่วยที่ 3 — Elaborate)
// ════════════════════════════════════════════════════════════════════════════

const _PatternSandbox = () => {
    const [code, setCode] = React.useState(
`#include <stdio.h>
int main() {
    int n = 5;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= i; j++) {
            printf("* ");
        }
        printf("\\n");
    }
    return 0;
}`);
    const [output, setOutput] = React.useState('');
    const [running, setRunning] = React.useState(false);
    const [hint, setHint] = React.useState('');
    const [hintLoading, setHintLoading] = React.useState(false);

    const runCode = async () => {
        if (running) return;
        setRunning(true);
        setOutput('');
        try {
            // Use Cloudflare Worker (same as CodingWorkspace)
            const runnerUrl = window.RUNNER_URL;
            if (!runnerUrl) { setOutput('⚠️ Runner URL ยังไม่โหลด กรุณาลองใหม่'); setRunning(false); return; }

            const res = await fetch(runnerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: 'c', version: '*', files: [{ name: 'main.c', content: code }], stdin: '' }),
            });
            const data = await res.json();
            const out = (data.run?.output || data.program_output || '').trim();
            const err = (data.compile?.stderr || data.compiler_error || data.run?.stderr || '').trim();
            if (err && !out) setOutput('❌ ' + err);
            else if (out) setOutput(out);
            else setOutput('(ไม่มีผลลัพธ์)');
        } catch (e) {
            setOutput('⚠️ รันโค้ดไม่สำเร็จ: ' + e.message);
        }
        setRunning(false);
    };

    const getHint = async () => {
        if (hintLoading) return;
        setHintLoading(true);
        const prompt = `โค้ด C นี้ใช้ Nested Loop สร้าง Pattern:
${code}

ผลลัพธ์: ${output || '(ยังไม่ได้รัน)'}

อธิบาย logic ของ Nested Loop นี้สั้นๆ (3-4 ประโยค ภาษาไทย) โดยอธิบายว่า:
1. loop นอกทำอะไร
2. loop ในทำอะไร
3. pattern ที่ได้คือรูปอะไร`;

        try {
            const res = await callGeminiApi(prompt, null);
            setHint(typeof res === 'string' ? res : (res?.text || ''));
        } catch (_) { setHint('ไม่สามารถโหลด hint ได้'); }
        setHintLoading(false);
    };

    // Quick templates
    const TEMPLATES = [
        { label: '▲ สามเหลี่ยม', code: `#include <stdio.h>\nint main() {\n    int n = 5;\n    for (int i = 1; i <= n; i++) {\n        for (int j = 1; j <= i; j++) printf("* ");\n        printf("\\n");\n    }\n    return 0;\n}` },
        { label: '▽ สามเหลี่ยมกลับ', code: `#include <stdio.h>\nint main() {\n    int n = 5;\n    for (int i = n; i >= 1; i--) {\n        for (int j = 1; j <= i; j++) printf("* ");\n        printf("\\n");\n    }\n    return 0;\n}` },
        { label: '◆ เพชร', code: `#include <stdio.h>\nint main() {\n    int n = 5;\n    for (int i = 1; i <= n; i++) {\n        for (int j = 1; j <= n-i; j++) printf(" ");\n        for (int j = 1; j <= 2*i-1; j++) printf("*");\n        printf("\\n");\n    }\n    for (int i = n-1; i >= 1; i--) {\n        for (int j = 1; j <= n-i; j++) printf(" ");\n        for (int j = 1; j <= 2*i-1; j++) printf("*");\n        printf("\\n");\n    }\n    return 0;\n}` },
        { label: '■ สี่เหลี่ยม', code: `#include <stdio.h>\nint main() {\n    int n = 5;\n    for (int i = 1; i <= n; i++) {\n        for (int j = 1; j <= n; j++) printf("# ");\n        printf("\\n");\n    }\n    return 0;\n}` },
    ];

    return (
        <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                🎯 <strong style={{ color: '#f1f5f9' }}>หน่วยที่ 3 · แผนที่ 24</strong> — เขียน Nested Loop แล้วดู ASCII Pattern แบบ Real-time
            </div>

            {/* Template buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {TEMPLATES.map(t => (
                    <button key={t.label} onClick={() => { setCode(t.code); setOutput(''); setHint(''); }} style={{
                        padding: '4px 12px', borderRadius: 8, border: '1px solid #334155',
                        background: '#1e293b', color: '#94a3b8', fontSize: 12,
                        cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>C Code (Nested Loop)</div>
                    <textarea value={code} onChange={e => setCode(e.target.value)} rows={14} style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #334155',
                        background: '#0f172a', color: '#e2e8f0', fontSize: 12,
                        fontFamily: "'Courier New',monospace", boxSizing: 'border-box', resize: 'vertical',
                    }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={runCode} disabled={running} style={{
                            flex: 2, padding: '8px 0', borderRadius: 8, border: 'none',
                            background: running ? '#1e293b' : '#22c55e',
                            color: running ? '#64748b' : '#0f172a', fontSize: 13, fontWeight: 700,
                            cursor: running ? 'not-allowed' : 'pointer', fontFamily: "'Prompt',sans-serif",
                        }}>
                            {running ? '⏳ กำลังรัน...' : '▶ รันโค้ด'}
                        </button>
                        <button onClick={getHint} disabled={hintLoading} style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #334155',
                            background: 'transparent', color: '#94a3b8', fontSize: 13,
                            cursor: hintLoading ? 'not-allowed' : 'pointer', fontFamily: "'Prompt',sans-serif",
                        }}>
                            {hintLoading ? '...' : '💡 Hint'}
                        </button>
                    </div>
                </div>

                <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>ASCII Pattern Output</div>
                    <div style={{
                        background: '#0f172a', borderRadius: 10, padding: 12, minHeight: 200, maxHeight: 280,
                        fontFamily: "'Courier New',monospace", fontSize: 14, color: '#4ade80',
                        whiteSpace: 'pre', overflowY: 'auto', lineHeight: 1.4,
                    }}>
                        {running ? <Spinner text="รันโค้ด..." /> : (output || <span style={{ color: '#334155' }}>// Pattern จะแสดงที่นี่</span>)}
                    </div>

                    {hint && (
                        <div style={{
                            marginTop: 10, background: '#1e1a2e', border: '1px solid #4c1d95',
                            borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#c4b5fd', lineHeight: 1.7,
                        }}>
                            <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>💡 AI อธิบาย Logic</div>
                            {hint}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// TOOL 5: MEMORY ARCHITECTURE MAP (หน่วยที่ 4 — Evaluate)
// ════════════════════════════════════════════════════════════════════════════

const _MemoryMap = () => {
    const [arrayType,  setArrayType]  = React.useState('int');
    const [arraySize,  setArraySize]  = React.useState(5);
    const [values,     setValues]     = React.useState(['10', '25', '3', '99', '42']);
    const [highlight,  setHighlight]  = React.useState(null);
    const [accessExpr, setAccessExpr] = React.useState('');
    const [accessResult, setAccessResult] = React.useState(null);

    const TYPE_SIZES = { char: 1, 'unsigned char': 1, short: 2, int: 4, long: 8, float: 4, double: 8 };
    const typeSize = TYPE_SIZES[arrayType] || 4;
    const BASE_ADDR = 0x1000;

    const changeSize = (n) => {
        const newSize = Math.max(1, Math.min(12, n));
        setArraySize(newSize);
        setValues(prev => {
            const arr = [...prev];
            while (arr.length < newSize) arr.push('0');
            return arr.slice(0, newSize);
        });
        setHighlight(null);
    };

    const changeValue = (idx, val) => {
        setValues(prev => { const a = [...prev]; a[idx] = val; return a; });
    };

    const checkAccess = () => {
        const expr = accessExpr.trim();
        // Parse arr[expr] or just index
        const match = expr.match(/\[(\d+)\]/) || expr.match(/^(\d+)$/);
        if (!match) { setAccessResult({ error: 'ใส่เป็น [index] เช่น arr[2] หรือแค่ตัวเลข 2' }); return; }
        const idx = parseInt(match[1]);
        if (idx < 0 || idx >= arraySize) {
            setAccessResult({ error: `⚠️ Index ${idx} อยู่นอก Array! valid range: 0 ถึง ${arraySize - 1} (Buffer Overflow!)` });
        } else {
            setHighlight(idx);
            setAccessResult({
                ok: true,
                addr: (BASE_ADDR + idx * typeSize).toString(16).toUpperCase(),
                val: values[idx] || '?',
                idx,
            });
        }
    };

    const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#a16207','#0e7490','#7c3aed'];

    return (
        <div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                🎯 <strong style={{ color: '#f1f5f9' }}>หน่วยที่ 4 · แผนที่ 29-30</strong> — แสดง Memory Address ของแต่ละ element ใน Array แบบ Visual
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
                <select value={arrayType} onChange={e => setArrayType(e.target.value)} style={{
                    padding: '6px 10px', borderRadius: 8, border: '1px solid #334155',
                    background: '#0f172a', color: '#f1f5f9', fontSize: 12, fontFamily: "'Courier New',monospace",
                }}>
                    {Object.keys(TYPE_SIZES).map(t => <option key={t} value={t}>{t} ({TYPE_SIZES[t]} bytes)</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => changeSize(arraySize - 1)} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid #334155',
                        background: '#1e293b', color: '#f1f5f9', cursor: 'pointer',
                    }}>−</button>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{arraySize} elements</span>
                    <button onClick={() => changeSize(arraySize + 1)} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid #334155',
                        background: '#1e293b', color: '#f1f5f9', cursor: 'pointer',
                    }}>+</button>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                    รวม: {arraySize * typeSize} bytes · sizeof({arrayType.split(' ').pop()}) = {typeSize}
                </div>
            </div>

            {/* Code declaration */}
            <div style={{
                background: '#0f172a', borderRadius: 8, padding: '8px 12px', marginBottom: 16,
                fontFamily: "'Courier New',monospace", fontSize: 13, color: '#e2e8f0',
            }}>
                <span style={{ color: '#818cf8' }}>{arrayType}</span>
                {' '}
                <span style={{ color: '#4ade80' }}>arr</span>
                <span style={{ color: '#f1f5f9' }}>[{arraySize}] = {'{'}</span>
                {values.map((v, i) => (
                    <span key={i}>
                        <input value={v} onChange={e => changeValue(i, e.target.value)}
                            onClick={() => setHighlight(i)}
                            style={{
                                width: 36, background: 'transparent',
                                border: 'none', color: COLORS[i % COLORS.length],
                                fontSize: 13, fontFamily: "'Courier New',monospace",
                                textAlign: 'center', outline: 'none',
                            }} />
                        {i < values.length - 1 && <span style={{ color: '#64748b' }}>, </span>}
                    </span>
                ))}
                <span style={{ color: '#f1f5f9' }}>{'}'};</span>
            </div>

            {/* Memory cells */}
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <div style={{ display: 'inline-flex', gap: 0, minWidth: 'max-content' }}>
                    {values.map((val, idx) => {
                        const addr = BASE_ADDR + idx * typeSize;
                        const isHL = highlight === idx;
                        const cellColor = COLORS[idx % COLORS.length];
                        return (
                            <div key={idx} onClick={() => setHighlight(isHL ? null : idx)}
                                style={{ cursor: 'pointer', textAlign: 'center' }}>
                                {/* Address label */}
                                <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2, fontFamily: 'monospace' }}>
                                    0x{addr.toString(16).toUpperCase().padStart(4, '0')}
                                </div>
                                {/* Cell */}
                                <div style={{
                                    width: 58 + (typeSize - 1) * 8, height: 50,
                                    border: `2px solid ${isHL ? '#fff' : cellColor + '66'}`,
                                    borderRight: idx < values.length - 1 ? '1px solid #334155' : undefined,
                                    background: isHL ? cellColor + '33' : '#1e293b',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, fontWeight: 700, color: isHL ? '#fff' : cellColor,
                                    boxShadow: isHL ? `0 0 10px ${cellColor}` : 'none',
                                    transition: 'all .2s',
                                }}>
                                    {val || '0'}
                                </div>
                                {/* Index label */}
                                <div style={{ fontSize: 11, color: isHL ? cellColor : '#64748b', marginTop: 2, fontFamily: 'monospace' }}>
                                    arr[{idx}]
                                </div>
                                {/* Byte count */}
                                <div style={{ fontSize: 9, color: '#334155', marginTop: 1, fontFamily: 'monospace' }}>
                                    {typeSize}B
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pointer arithmetic */}
            {highlight !== null && (
                <div style={{
                    background: '#1e0a3a', border: '1px solid #6b21a8', borderRadius: 10, padding: '10px 14px', marginBottom: 12,
                }}>
                    <div style={{ fontSize: 12, color: '#c4b5fd', fontFamily: 'monospace' }}>
                        arr[{highlight}] = {values[highlight] || 0}
                        <span style={{ color: '#64748b', marginLeft: 12 }}>
                            &arr[{highlight}] = 0x{(BASE_ADDR + highlight * typeSize).toString(16).toUpperCase().padStart(4, '0')}
                        </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 4, fontFamily: 'monospace' }}>
                        (arr + {highlight}) → *(arr + {highlight}) = arr[{highlight}]
                        <span style={{ color: '#334155', marginLeft: 8 }}>// pointer arithmetic</span>
                    </div>
                </div>
            )}

            {/* Access checker */}
            <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', border: '1px solid #334155' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                    🔍 ทดสอบ Array Access — ใส่ index เช่น <code style={{ color: '#fbbf24' }}>arr[3]</code> หรือ <code style={{ color: '#fbbf24' }}>7</code>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input value={accessExpr} onChange={e => setAccessExpr(e.target.value)}
                        placeholder="arr[2] หรือ 2" onKeyDown={e => e.key === 'Enter' && checkAccess()}
                        style={{
                            flex: 1, padding: '6px 10px', borderRadius: 8,
                            border: '1px solid #334155', background: '#0f172a',
                            color: '#f1f5f9', fontSize: 13, fontFamily: "'Courier New',monospace",
                        }} />
                    <button onClick={checkAccess} style={{
                        padding: '6px 16px', borderRadius: 8, border: 'none',
                        background: '#6366f1', color: '#fff', fontSize: 13,
                        cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>ตรวจสอบ</button>
                </div>
                {accessResult && (
                    <div style={{
                        marginTop: 8, padding: '8px 10px', borderRadius: 8, fontSize: 12,
                        background: accessResult.ok ? '#052e16' : '#1c0a0a',
                        color: accessResult.ok ? '#4ade80' : '#f87171',
                        border: `1px solid ${accessResult.ok ? '#166534' : '#991b1b'}`,
                        fontFamily: 'monospace',
                    }}>
                        {accessResult.ok
                            ? `arr[${accessResult.idx}] = ${accessResult.val} · address = 0x${accessResult.addr}`
                            : accessResult.error}
                    </div>
                )}
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN: Learning Tools Hub
// ════════════════════════════════════════════════════════════════════════════

const TOOL_LIST = [
    {
        id: 'datatype', icon: '📊', unit: 1,
        label: 'Data Type Visualizer',
        subLabel: 'หน่วย 1 · แผน 3',
        desc: 'ขนาด/ขอบเขต/Overflow',
        color: '#22d3ee',
        component: _DataTypeVisualizer,
    },
    {
        id: 'flowchart', icon: '📐', unit: 1,
        label: 'Flowchart → C Code',
        subLabel: 'หน่วย 1 · แผน 1',
        desc: 'สร้าง Flowchart · AI แปลงเป็น Code',
        color: '#8b5cf6',
        component: _FlowchartBuilder,
    },
    {
        id: 'decision', icon: '🌳', unit: 2,
        label: 'Decision Tree',
        subLabel: 'หน่วย 2 · แผน 10',
        desc: 'วาง if-else · AI วาด Tree',
        color: '#f59e0b',
        component: _DecisionTreeViz,
    },
    {
        id: 'pattern', icon: '🎨', unit: 3,
        label: 'Pattern Sandbox',
        subLabel: 'หน่วย 3 · แผน 24',
        desc: 'Nested Loop → ASCII Art Live',
        color: '#4ade80',
        component: _PatternSandbox,
    },
    {
        id: 'memory', icon: '🗂️', unit: 4,
        label: 'Memory Map',
        subLabel: 'หน่วย 4 · แผน 29',
        desc: 'Array · Address · Pointer',
        color: '#f472b6',
        component: _MemoryMap,
    },
];

const LearningTools = () => {
    const [activeTool, setActiveTool] = React.useState(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        return params.get('tool') || 'datatype';
    });

    const tool = TOOL_LIST.find(t => t.id === activeTool) || TOOL_LIST[0];
    const ToolComponent = tool.component;

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="Interactive Learning Tools" />
            <main style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>🧪 Interactive Learning Tools</h1>
                    <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                        เครื่องมือ Interactive สำหรับทุกหน่วยของ ว31281 — เรียนรู้ผ่านการทดลองจริง
                    </p>
                </div>

                {/* Tool selector */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24,
                }}>
                    {TOOL_LIST.map(t => (
                        <button key={t.id} onClick={() => setActiveTool(t.id)} style={{
                            padding: '10px 6px', borderRadius: 10,
                            border: `2px solid ${activeTool === t.id ? t.color : '#1e293b'}`,
                            background: activeTool === t.id ? t.color + '18' : '#1e293b',
                            cursor: 'pointer', textAlign: 'center', fontFamily: "'Prompt',sans-serif",
                            transition: 'all .15s',
                        }}>
                            <div style={{ fontSize: 24, marginBottom: 4 }}>{t.icon}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: activeTool === t.id ? t.color : '#e2e8f0', lineHeight: 1.3 }}>
                                {t.label}
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{t.subLabel}</div>
                        </button>
                    ))}
                </div>

                {/* Active tool panel */}
                <div style={{
                    background: '#1e293b', borderRadius: 14, padding: '20px',
                    border: `1px solid ${tool.color}44`,
                    boxShadow: `0 0 20px ${tool.color}11`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #334155' }}>
                        <span style={{ fontSize: 28 }}>{tool.icon}</span>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{tool.label}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{tool.desc}</div>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 11, background: tool.color + '22', color: tool.color, padding: '3px 10px', borderRadius: 20 }}>
                            {tool.subLabel}
                        </span>
                    </div>

                    <ToolComponent />
                </div>
            </main>
        </div>
    );
};

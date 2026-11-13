/**
 * js/studio/ParsonsPlayer.js — โจทย์เรียงบรรทัดโค้ด (Parsons Problems) (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: P (คิดก่อนเขียน — โฟกัสที่ลำดับความคิดและโครงสร้าง ไม่ติดเรื่องพิมพ์ผิด)
 * ปัญหาที่แก้: ผู้เรียนพื้นฐานอ่อนติดอยู่กับ syntax จนไม่ได้ฝึกคิดลำดับขั้นตอน
 *
 * ทำงานแทน editor เฉพาะโจทย์ studioType === 'parsons' ในรายวิชาที่ hasFeature(course, 'parsons')
 * - ลากหรือคลิกบล็อกไปสร้างโปรแกรม ปรับการย่อหน้าด้วย ◀ ▶ เลื่อนลำดับด้วย ▲ ▼
 * - ทุกครั้งที่เปลี่ยน ส่งโค้ดที่ประกอบแล้วให้ CodingWorkspace ผ่าน onCode
 *   ปุ่ม ▶ ทดสอบตัวอย่าง / ส่ง เดิมจึงตรวจด้วย test case ผ่าน grader เดิมทุกอย่าง (วิธีตรวจ ข)
 * - ปุ่ม "ตรวจลำดับ" เทียบกับลำดับที่ถูกต้องทันที (วิธีตรวจ ก) ไม่นับคะแนน
 */

const _PP_INDENT = 4;

const _ppHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const _ppShuffle = (arr, seed) => {
    const a = arr.slice();
    let x = _ppHash(seed) || 1;
    for (let i = a.length - 1; i > 0; i--) {
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        const j = (x >>> 0) % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};
const _ppLevel = (line) => Math.floor(line.replace(/\t/g, '    ').match(/^ */)[0].length / _PP_INDENT);

const ParsonsPlayer = ({ assignment, userId, courseId, onCode }) => {
    const P = assignment.parsons || { lines: [], distractors: [] };
    const indentReq = P.indentRequired !== false;
    const storeKey = `parsons_${userId || 'anon'}_${assignment.id}`;

    // บล็อกทั้งหมด (บรรทัดที่ถูก + บรรทัดหลอก) สุ่มลำดับแบบคงที่ต่อโจทย์
    const blocks = React.useMemo(() => {
        const all = [
            ...P.lines.map((l, i) => ({ key: 'l' + i, text: indentReq ? l.trim() : l })),
            ...(P.distractors || []).map((l, i) => ({ key: 'd' + i, text: indentReq ? l.trim() : l })),
        ];
        return _ppShuffle(all, assignment.id);
    }, [assignment.id]);
    const textOf = (key) => (blocks.find(b => b.key === key) || {}).text || '';

    const [placed, setPlaced] = React.useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(storeKey) || '[]');
            return Array.isArray(saved) ? saved.filter(p => blocks.some(b => b.key === p.key)) : [];
        } catch (_) { return []; }
    });
    const [result, setResult] = React.useState(null);
    const [attempts, setAttempts] = React.useState(0);
    const dragRef = React.useRef(null);

    const assemble = (list) => list.map(p => ' '.repeat(_PP_INDENT * (indentReq ? p.indent : 0)) + textOf(p.key)).join('\n') + (list.length ? '\n' : '');

    React.useEffect(() => {
        try { localStorage.setItem(storeKey, JSON.stringify(placed)); } catch (_) {}
        onCode && onCode(assemble(placed));
        setResult(null);
    }, [placed]);

    const pool = blocks.filter(b => !placed.some(p => p.key === b.key));
    const add = (key, at) => setPlaced(ps => {
        const next = ps.filter(p => p.key !== key);
        const prevIndent = at > 0 && next[at - 1] ? next[at - 1].indent : (next.length ? next[next.length - 1].indent : 0);
        const prevText = at > 0 && next[at - 1] ? textOf(next[at - 1].key) : (next.length ? textOf(next[next.length - 1].key) : '');
        const item = { key, indent: indentReq ? (prevText.endsWith(':') ? prevIndent + 1 : prevIndent) : 0 };
        const pos = at == null || at > next.length ? next.length : at;
        next.splice(pos, 0, item);
        return next;
    });
    const remove = (i) => setPlaced(ps => ps.filter((_, j) => j !== i));
    const move = (i, d) => setPlaced(ps => {
        const j = i + d;
        if (j < 0 || j >= ps.length) return ps;
        const next = ps.slice(); [next[i], next[j]] = [next[j], next[i]]; return next;
    });
    const indent = (i, d) => setPlaced(ps => ps.map((p, j) => j === i ? { ...p, indent: Math.max(0, Math.min(4, p.indent + d)) } : p));

    const check = () => {
        const want = P.lines.map(l => (indentReq ? ' '.repeat(_PP_INDENT * _ppLevel(l)) + l.trim() : l));
        const got = placed.map(p => (indentReq ? ' '.repeat(_PP_INDENT * p.indent) + textOf(p.key) : textOf(p.key)));
        let firstWrong = -1;
        for (let i = 0; i < Math.max(want.length, got.length); i++) {
            if (want[i] !== got[i]) { firstWrong = i; break; }
        }
        const usedDistractor = placed.some(p => p.key.startsWith('d'));
        const correct = firstWrong === -1;
        const n = attempts + 1;
        setAttempts(n);
        setResult({ correct, firstWrong, usedDistractor, missing: want.length - got.length });
        if (typeof logStudioEvent === 'function') {
            logStudioEvent('parsons_attempt', courseId, { assignmentId: assignment.id, correct, attempt: n, placed: placed.length, usedDistractor });
        }
    };

    const onDropAt = (at) => (e) => {
        e.preventDefault(); e.stopPropagation();
        const d = dragRef.current; dragRef.current = null;
        if (!d) return;
        if (d.from === 'pool') add(d.key, at);
        else setPlaced(ps => {
            const next = ps.slice();
            const [item] = next.splice(d.index, 1);
            const pos = Math.min(at > d.index ? at - 1 : at, next.length);
            next.splice(pos, 0, item);
            return next;
        });
    };
    const allow = (e) => e.preventDefault();

    const blockStyle = { fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: 13, whiteSpace: 'pre' };
    const iconBtn = 'px-1.5 py-0.5 rounded text-xs hover:bg-white/20 disabled:opacity-30';

    return (
        <div className="h-full overflow-auto p-3" style={{ background: '#1e1f29', color: '#f8f8f2' }}>
            <div className="text-xs mb-3 p-2 rounded" style={{ background: '#2b2d3a', color: '#c9cbe0' }}>
                🧩 <b>โจทย์เรียงบรรทัดโค้ด</b> — คลิกหรือลากบล็อกจากด้านซ้ายมาสร้างโปรแกรม
                {indentReq && <> ใช้ ◀ ▶ ปรับการย่อหน้า</>} แล้วกด <b>ตรวจลำดับ</b> หรือใช้ปุ่ม ▶ ทดสอบตัวอย่าง / ส่ง ด้านบนเพื่อตรวจด้วย test case
                {(P.distractors || []).length > 0 && <> · มีบล็อกหลอกที่ไม่ต้องใช้</>}
            </div>
            <div className="flex flex-col md:flex-row gap-3">
                {/* บล็อกที่ยังไม่ใช้ */}
                <div className="md:w-2/5 rounded-lg p-2" style={{ background: '#262836', minHeight: 120 }}
                    onDragOver={allow}
                    onDrop={e => { e.preventDefault(); const d = dragRef.current; dragRef.current = null; if (d && d.from === 'placed') remove(d.index); }}>
                    <div className="text-xs mb-2" style={{ color: '#8be9fd' }}>บล็อกโค้ด ({pool.length})</div>
                    {pool.length === 0 && <div className="text-xs" style={{ color: '#6272a4' }}>ใช้ครบทุกบล็อกแล้ว</div>}
                    {pool.map(b => (
                        <div key={b.key} draggable
                            onDragStart={() => { dragRef.current = { from: 'pool', key: b.key }; }}
                            onClick={() => add(b.key, null)}
                            className="mb-1.5 px-2 py-1.5 rounded cursor-pointer"
                            style={{ ...blockStyle, background: '#343746', border: '1px solid #44475a' }}
                            title="คลิกเพื่อเพิ่มต่อท้ายโปรแกรม">
                            {b.text}
                        </div>
                    ))}
                </div>

                {/* โปรแกรมของฉัน */}
                <div className="md:w-3/5 rounded-lg p-2" style={{ background: '#282a36', minHeight: 160, border: '1px dashed #6272a4' }}
                    onDragOver={allow} onDrop={onDropAt(placed.length)}>
                    <div className="text-xs mb-2" style={{ color: '#50fa7b' }}>โปรแกรมของฉัน ({placed.length} บรรทัด)</div>
                    {placed.length === 0 && <div className="text-xs py-6 text-center" style={{ color: '#6272a4' }}>ลากหรือคลิกบล็อกมาวางที่นี่</div>}
                    {placed.map((p, i) => {
                        const wrong = result && !result.correct && result.firstWrong === i;
                        return (
                            <div key={p.key} draggable
                                onDragStart={() => { dragRef.current = { from: 'placed', index: i }; }}
                                onDragOver={allow} onDrop={onDropAt(i)}
                                className="flex items-center gap-1 mb-1 rounded"
                                style={{ background: wrong ? '#5c2a35' : '#343746', border: `1px solid ${wrong ? '#ff5555' : '#44475a'}` }}>
                                <span className="text-xs w-6 text-right select-none" style={{ color: '#6272a4' }}>{i + 1}</span>
                                <div className="flex-1 px-1 py-1.5 overflow-x-auto" style={blockStyle}>
                                    <span style={{ color: '#6272a4' }}>{indentReq ? '·'.repeat(_PP_INDENT * p.indent) : ''}</span>{textOf(p.key)}
                                </div>
                                {indentReq && <>
                                    <button className={iconBtn} onClick={() => indent(i, -1)} disabled={p.indent === 0} title="ลดการย่อหน้า">◀</button>
                                    <button className={iconBtn} onClick={() => indent(i, 1)} disabled={p.indent >= 4} title="เพิ่มการย่อหน้า">▶</button>
                                </>}
                                <button className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} title="เลื่อนขึ้น">▲</button>
                                <button className={iconBtn} onClick={() => move(i, 1)} disabled={i === placed.length - 1} title="เลื่อนลง">▼</button>
                                <button className={iconBtn} onClick={() => remove(i)} title="นำออก" style={{ color: '#ff79c6' }}>✕</button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
                <button onClick={check} disabled={placed.length === 0}
                    className="px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-40"
                    style={{ background: '#bd93f9', color: '#1e1f29' }}>
                    ✔ ตรวจลำดับ
                </button>
                <button onClick={() => setPlaced([])} disabled={placed.length === 0}
                    className="px-3 py-1.5 rounded text-sm disabled:opacity-40" style={{ background: '#343746', color: '#f8f8f2' }}>
                    ↺ เริ่มใหม่
                </button>
                {attempts > 0 && <span className="text-xs" style={{ color: '#6272a4' }}>ตรวจแล้ว {attempts} ครั้ง</span>}
            </div>
            {result && (
                <div className="mt-2 p-2 rounded text-sm" style={{ background: result.correct ? '#1f3d2b' : '#3d2b1f', color: result.correct ? '#50fa7b' : '#ffb86c' }}>
                    {result.correct
                        ? '🎉 ลำดับและการย่อหน้าถูกต้อง! กด ▶ ทดสอบตัวอย่าง หรือ ส่ง เพื่อให้ระบบตรวจด้วย test case'
                        : <>
                            {result.firstWrong >= 0 && result.firstWrong < placed.length
                                ? `บรรทัดที่ ${result.firstWrong + 1} ยังไม่ถูก (ลำดับหรือการย่อหน้า)`
                                : `ยังขาดอีก ${Math.max(result.missing, 1)} บรรทัด`}
                            {result.usedDistractor && ' · มีบล็อกที่ไม่ต้องใช้ปนอยู่'}
                        </>}
                </div>
            )}
        </div>
    );
};

window.ParsonsPlayer = ParsonsPlayer;

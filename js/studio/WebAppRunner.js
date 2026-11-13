/**
 * js/studio/WebAppRunner.js — รันเว็บแอป Streamlit ในเบราว์เซอร์ด้วย stlite (Pyodide) (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: D (สร้างต้นแบบที่ผู้ใช้จริงลองใช้ได้), A₂
 * ปัญหาที่แก้: Streamlit ต้องติดตั้ง Python บนเครื่อง ซึ่งห้องคอม/Chromebook ทำไม่ได้
 *
 * - โหลด @stlite/browser เวอร์ชันที่ระบุจาก jsDelivr ใน <iframe sandbox="allow-scripts"> (ไม่มี allow-same-origin)
 *   โค้ดของนักเรียนจึงเข้าถึงคุกกี้/การล็อกอินของ APCC ไม่ได้
 * - ไม่ส่งโค้ดเว็บแอปเข้า Worker เดิม (runner ของการตรวจโจทย์)
 * - บันทึกเป็นรุ่น (versions) เพื่อเป็นหลักฐานพัฒนาการของต้นแบบ
 */

const STLITE_VERSION = '1.12.0';

const wrStliteDoc = (code) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@stlite/browser@${STLITE_VERSION}/build/stlite.css">
<style>body{margin:0;font-family:sans-serif}</style></head>
<body><div id="root"></div><script type="module">
import { mount } from "https://cdn.jsdelivr.net/npm/@stlite/browser@${STLITE_VERSION}/build/stlite.js";
mount(${JSON.stringify(code).replace(/<\//g, '<\\/')}, document.getElementById("root"));
</script></body></html>`;

const WebAppRunner = ({ initialCode, readOnly, versions, onSaveVersion, height = 520, courseId, projectId }) => {
    const [code, setCode] = React.useState(initialCode || PS_WEBAPP_TEMPLATES.coop.code);
    const [running, setRunning] = React.useState(null);   // โค้ดที่กำลังรันใน iframe
    const [runKey, setRunKey] = React.useState(0);
    const [note, setNote] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [msg, setMsg] = React.useState('');

    React.useEffect(() => { if (initialCode != null) setCode(initialCode); }, [initialCode]);

    const run = () => {
        setRunning(code); setRunKey(k => k + 1);
        if (typeof logStudioEvent === 'function') logStudioEvent('webapp_run', courseId || null, { projectId: projectId || null, size: code.length });
    };
    const save = async () => {
        setSaving(true); setMsg('');
        try { await onSaveVersion(code, note); setNote(''); setMsg('✅ บันทึกรุ่นแล้ว'); }
        catch (err) { setMsg('บันทึกไม่สำเร็จ: ' + err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #D1C4E9' }}>
            <div className="flex flex-wrap items-center gap-2 p-2" style={{ background: '#F3F0FF' }}>
                <button onClick={run} className="k-btn-pink text-sm px-4 py-1.5">▶ รันเว็บแอป</button>
                {!readOnly && (
                    <select defaultValue="" onChange={e => { const t = PS_WEBAPP_TEMPLATES[e.target.value]; if (t && confirm('แทนที่โค้ดในจอด้วยแม่แบบนี้?')) setCode(t.code); e.target.value = ''; }}
                        className="text-xs rounded-lg px-2 py-1.5 border" style={{ borderColor: '#D1C4E9' }}>
                        <option value="">📄 แม่แบบ Kit A…</option>
                        {Object.entries(PS_WEBAPP_TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                    </select>
                )}
                {versions && versions.length > 0 && (
                    <select defaultValue="" onChange={e => { const v = versions.find(x => x.id === e.target.value); if (v) setCode(v.code); e.target.value = ''; }}
                        className="text-xs rounded-lg px-2 py-1.5 border" style={{ borderColor: '#D1C4E9' }}>
                        <option value="">🕘 เปิดรุ่นที่บันทึกไว้ ({versions.length})…</option>
                        {versions.map((v, i) => <option key={v.id} value={v.id}>รุ่นที่ {versions.length - i}{v.note ? ` — ${v.note}` : ''}</option>)}
                    </select>
                )}
                {!readOnly && onSaveVersion && <>
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="บันทึกสั้นๆ ว่ารุ่นนี้เปลี่ยนอะไร"
                        className="text-xs rounded-lg px-2 py-1.5 border flex-1 min-w-[160px]" style={{ borderColor: '#D1C4E9' }} />
                    <button onClick={save} disabled={saving} className="k-btn-outline text-xs px-3 py-1.5">{saving ? 'กำลังบันทึก...' : '💾 บันทึกรุ่น'}</button>
                </>}
                {msg && <span className="text-xs">{msg}</span>}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2">
                <div style={{ height, minHeight: 280 }}>
                    <CodeEditor value={code} onChange={readOnly ? () => {} : setCode} language="python" minHeight="100%" fontSize={13} theme="dracula" />
                </div>
                <div style={{ height, minHeight: 280, background: '#fff', borderLeft: '1px solid #EDE7F6' }}>
                    {running == null ? (
                        <div className="h-full flex items-center justify-center text-xs text-gray-400 p-6 text-center">
                            กด ▶ รันเว็บแอป เพื่อดูผล<br />ครั้งแรกระบบโหลด Python ในเบราว์เซอร์ อาจใช้เวลา 10–30 วินาที
                        </div>
                    ) : (
                        <iframe key={runKey} title="webapp-preview" sandbox="allow-scripts allow-popups allow-forms"
                            srcDoc={wrStliteDoc(running)} style={{ width: '100%', height: '100%', border: 0 }} />
                    )}
                </div>
            </div>
        </div>
    );
};

window.WebAppRunner = WebAppRunner;
window.wrStliteDoc = wrStliteDoc;

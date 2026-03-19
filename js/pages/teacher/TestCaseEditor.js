// js/pages/teacher/TestCaseEditor.js - Manage test cases: Manual / AI Generate / Hybrid

const TestCaseEditor = () => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const assignmentId = params.get('assignment');
    const courseId = params.get('course');

    const [assignment, setAssignment] = React.useState(null);
    const [testCases, setTestCases] = React.useState([]);
    const [form, setForm] = React.useState({ input: '', expectedOutput: '', isHidden: false, points: 10 });
    const [editingId, setEditingId] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    const [editorTab, setEditorTab] = React.useState('manual'); // 'manual' | 'ai'

    // AI generation state
    const [aiCount, setAiCount] = React.useState(5);
    const [aiHidden, setAiHidden] = React.useState(3);   // how many of the AI cases to mark hidden
    const [aiPoints, setAiPoints] = React.useState(10);
    const [aiGenerating, setAiGenerating] = React.useState(false);
    const [aiPreview, setAiPreview] = React.useState([]); // generated but not yet saved
    const [aiMsg, setAiMsg] = React.useState('');
    const [savingAi, setSavingAi] = React.useState(false);

    React.useEffect(() => { if (assignmentId) loadData(); }, [assignmentId]);

    const loadData = async () => {
        setLoading(true);
        const [aSnap, tcSnap] = await Promise.all([
            db.collection('assignments').doc(assignmentId).get(),
            db.collection('testCases').where('assignmentId', '==', assignmentId).orderBy('order').get(),
        ]);
        setAssignment({ id: aSnap.id, ...aSnap.data() });
        setTestCases(tcSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    const resetForm = () => {
        setForm({ input: '', expectedOutput: '', isHidden: false, points: 10 });
        setEditingId(null);
    };

    const updateTotalPoints = async () => {
        const snap = await db.collection('testCases').where('assignmentId', '==', assignmentId).get();
        const total = snap.docs.reduce((s, d) => s + (d.data().points || 0), 0);
        await db.collection('assignments').doc(assignmentId).update({ totalPoints: total });
    };

    // ── Manual save ──────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.expectedOutput.trim()) { setMsg('กรุณากรอก Expected Output'); return; }
        setSaving(true);
        setMsg('');
        try {
            if (editingId) {
                await db.collection('testCases').doc(editingId).update(form);
                setMsg('✅ อัปเดตสำเร็จ!');
            } else {
                await db.collection('testCases').add({ ...form, assignmentId, order: testCases.length + 1 });
                setMsg('✅ เพิ่ม Test Case สำเร็จ!');
            }
            await updateTotalPoints();
            loadData();
            resetForm();
        } catch (err) {
            setMsg('❌ เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('ยืนยันการลบ Test Case นี้?')) return;
        await db.collection('testCases').doc(id).delete();
        await updateTotalPoints();
        setTestCases(tcs => tcs.filter(t => t.id !== id));
    };

    const startEdit = (tc) => {
        setEditingId(tc.id);
        setForm({ input: tc.input || '', expectedOutput: tc.expectedOutput || '', isHidden: tc.isHidden, points: tc.points || 10 });
        setEditorTab('manual');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── AI generation ────────────────────────────────────────────
    const handleAIGenerate = async () => {
        if (!assignment) return;
        setAiGenerating(true);
        setAiPreview([]);
        setAiMsg('');
        try {
            const desc = assignment.description || '';
            const cases = await generateTestCases(
                assignment.language || 'c',
                assignment.title,
                desc,
                aiCount
            );
            // Mark last `aiHidden` cases as hidden
            const preview = cases.map((tc, i) => ({
                ...tc,
                isHidden: i >= (aiCount - aiHidden),
                points: aiPoints,
            }));
            setAiPreview(preview);
            setAiMsg(`✅ สร้าง ${cases.length} test cases สำเร็จ — ตรวจสอบแล้วกด "บันทึกทั้งหมด"`);
        } catch (err) {
            setAiMsg('❌ ไม่สามารถสร้างได้: ' + err.message);
        } finally {
            setAiGenerating(false);
        }
    };

    const handleSaveAllAI = async () => {
        if (aiPreview.length === 0) return;
        setSavingAi(true);
        try {
            const startOrder = testCases.length + 1;
            await Promise.all(aiPreview.map((tc, i) =>
                db.collection('testCases').add({
                    input: tc.input || '',
                    expectedOutput: tc.expectedOutput || '',
                    isHidden: tc.isHidden,
                    points: tc.points || 10,
                    assignmentId,
                    order: startOrder + i,
                })
            ));
            await updateTotalPoints();
            setAiPreview([]);
            setAiMsg(`✅ บันทึก ${aiPreview.length} test cases สำเร็จ!`);
            loadData();
        } catch (err) {
            setAiMsg('❌ บันทึกไม่สำเร็จ: ' + err.message);
        } finally {
            setSavingAi(false);
        }
    };

    const togglePreviewHidden = (i) => {
        setAiPreview(p => p.map((tc, j) => j === i ? { ...tc, isHidden: !tc.isHidden } : tc));
    };

    const removePreview = (i) => {
        setAiPreview(p => p.filter((_, j) => j !== i));
    };

    // ── Stats ────────────────────────────────────────────────────
    const publicCount = testCases.filter(t => !t.isHidden).length;
    const hiddenCount = testCases.filter(t => t.isHidden).length;
    const totalPoints = testCases.reduce((s, t) => s + (t.points || 0), 0);

    const tabStyle = (key) => ({
        padding: '9px 16px', fontWeight: 500, fontSize: '13px',
        border: 'none', background: 'none', cursor: 'pointer',
        borderBottom: editorTab === key ? '2px solid #EC407A' : '2px solid transparent',
        color: editorTab === key ? '#C2185B' : '#6B7280',
        transition: 'color .15s',
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title={assignment?.title || 'Test Case Editor'} subtitle="Test Case Manager" />
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center space-x-3 mb-6 text-sm">
                    <a href="#/teacher/courses" style={{ color: '#EC407A' }} className="hover:underline">← รายวิชา</a>
                    <span className="text-gray-300">/</span>
                    <a href={`#/teacher/assignment?course=${courseId}`} style={{ color: '#EC407A' }} className="hover:underline">
                        {assignment?.title || 'โจทย์'}
                    </a>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-700">Test Cases</span>
                </div>

                {loading ? <Spinner /> : (
                    <div className="grid lg:grid-cols-2 gap-6">

                        {/* ── LEFT: Editor panel ─────────────────────── */}
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #FFD1DC' }}>
                            {/* Tab bar */}
                            <div className="flex border-b px-2" style={{ borderColor: '#F5F5F5' }}>
                                <button style={tabStyle('manual')}>✏️ เพิ่มเอง</button>
                                <button onClick={() => setEditorTab('ai')} style={tabStyle('ai')}>🤖 AI สร้าง</button>
                            </div>

                            {/* ── Manual tab ── */}
                            {editorTab === 'manual' && (
                                <div className="p-5 space-y-4">
                                    <h3 className="font-bold text-gray-800">
                                        {editingId ? '✏️ แก้ไข Test Case' : '➕ เพิ่ม Test Case ใหม่'}
                                    </h3>
                                    {msg && (
                                        <div className={`p-3 rounded-lg text-sm border ${msg.includes('❌') || msg.includes('กรุณา') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                            {msg}
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Input (stdin)</label>
                                        <textarea value={form.input} rows="4"
                                            onChange={e => setForm(f => ({ ...f, input: e.target.value }))}
                                            placeholder="ข้อมูล input (ว่างถ้าไม่มี)"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none resize-none font-mono focus:border-pink-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output *</label>
                                        <textarea value={form.expectedOutput} rows="4"
                                            onChange={e => setForm(f => ({ ...f, expectedOutput: e.target.value }))}
                                            placeholder="ผลลัพธ์ที่โปรแกรมต้องแสดง"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none resize-none font-mono focus:border-pink-400" />
                                        <p className="text-xs text-gray-400 mt-1">* ระบบ trim whitespace ปลายบรรทัดก่อนเปรียบเทียบ</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">คะแนน</label>
                                            <input type="number" value={form.points} min="0" max="100"
                                                onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-pink-400" />
                                        </div>
                                        <div className="flex items-center gap-2 pt-6">
                                            <input type="checkbox" id="hidden" checked={form.isHidden}
                                                onChange={e => setForm(f => ({ ...f, isHidden: e.target.checked }))} />
                                            <label htmlFor="hidden" className="text-sm text-gray-700">🔒 ซ่อน (นักเรียนไม่เห็น)</label>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={handleSave} disabled={saving}
                                            className="flex-1 k-btn-pink py-2 text-sm flex items-center justify-center gap-2">
                                            {saving ? <SpinIcon className="w-4 h-4" /> : null}
                                            {saving ? 'กำลังบันทึก...' : editingId ? 'อัปเดต' : '➕ เพิ่ม'}
                                        </button>
                                        {editingId && (
                                            <button onClick={resetForm}
                                                className="px-4 py-2 rounded-xl text-sm text-gray-600"
                                                style={{ border: '1.5px solid #E0E0E0' }}>ยกเลิก</button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── AI Generate tab ── */}
                            {editorTab === 'ai' && (
                                <div className="p-5 space-y-4">
                                    <h3 className="font-bold text-gray-800">🤖 สร้าง Test Cases ด้วย AI</h3>
                                    <p className="text-xs text-gray-500">AI จะอ่านชื่อโจทย์และคำอธิบาย แล้วสร้าง input/output ที่ถูกต้องให้อัตโนมัติ</p>

                                    {aiMsg && (
                                        <div className={`p-3 rounded-lg text-sm border ${aiMsg.includes('❌') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                            {aiMsg}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 block mb-1">จำนวน Test Cases</label>
                                            <div className="flex items-center gap-1">
                                                {[3, 5, 8, 10].map(n => (
                                                    <button key={n} onClick={() => setAiCount(n)}
                                                        className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                                                        style={aiCount === n
                                                            ? { background: '#EC407A', color: '#fff' }
                                                            : { background: '#F5F5F5', color: '#555' }}>
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 block mb-1">🔒 Hidden (จาก {aiCount})</label>
                                            <select value={aiHidden} onChange={e => setAiHidden(parseInt(e.target.value))}
                                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400">
                                                {Array.from({ length: aiCount + 1 }, (_, i) => (
                                                    <option key={i} value={i}>{i} ซ่อน ({aiCount - i} public)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 block mb-1">คะแนน/test</label>
                                            <input type="number" value={aiPoints} min="0" max="100"
                                                onChange={e => setAiPoints(parseInt(e.target.value) || 10)}
                                                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400" />
                                        </div>
                                    </div>

                                    <button onClick={handleAIGenerate} disabled={aiGenerating}
                                        className="w-full k-btn-pink py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                        {aiGenerating ? <SpinIcon className="w-4 h-4" /> : '🤖'}
                                        {aiGenerating ? 'AI กำลังสร้าง...' : `สร้าง ${aiCount} Test Cases ด้วย AI`}
                                    </button>

                                    {/* AI Preview */}
                                    {aiPreview.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold text-gray-700">ตัวอย่างที่สร้าง — ตรวจสอบก่อนบันทึก</p>
                                                <button onClick={handleSaveAllAI} disabled={savingAi}
                                                    className="k-btn-pink px-4 py-1.5 text-sm flex items-center gap-1 disabled:opacity-50">
                                                    {savingAi ? <SpinIcon className="w-4 h-4" /> : '💾'}
                                                    {savingAi ? 'บันทึก...' : `บันทึกทั้งหมด (${aiPreview.length})`}
                                                </button>
                                            </div>
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {aiPreview.map((tc, i) => (
                                                    <div key={i} className={`p-3 rounded-xl text-xs border ${tc.isHidden ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-600">Test {i + 1}</span>
                                                                {tc.note && <span className="text-gray-400 italic">{tc.note}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => togglePreviewHidden(i)}
                                                                    className={`px-2 py-0.5 rounded text-xs ${tc.isHidden ? 'bg-purple-200 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>
                                                                    {tc.isHidden ? '🔒 Hidden' : '👁 Public'}
                                                                </button>
                                                                <button onClick={() => removePreview(i)}
                                                                    className="text-red-400 hover:text-red-600 font-bold">×</button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="text-gray-500">Input:</span>
                                                                <pre className="bg-gray-800 text-green-300 p-1.5 rounded mt-1 font-mono overflow-hidden max-h-12 text-xs">
                                                                    {tc.input || '(ว่าง)'}
                                                                </pre>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">Expected:</span>
                                                                <pre className="bg-gray-800 text-blue-300 p-1.5 rounded mt-1 font-mono overflow-hidden max-h-12 text-xs">
                                                                    {tc.expectedOutput}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT: Test Cases list ──────────────────── */}
                        <div className="bg-white rounded-2xl shadow-sm p-5" style={{ border: '1px solid #FFD1DC' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800">Test Cases ({testCases.length})</h3>
                                <div className="flex gap-3 text-xs text-gray-500">
                                    <span>👁 Public: {publicCount}</span>
                                    <span>🔒 Hidden: {hiddenCount}</span>
                                    <span>⭐ {totalPoints}pt</span>
                                </div>
                            </div>

                            {testCases.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    <div className="text-4xl mb-3">📝</div>
                                    <p>ยังไม่มี Test Cases</p>
                                    <p className="text-xs mt-1">เพิ่มเองหรือให้ AI สร้างให้</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                                    {testCases.map((tc, i) => (
                                        <div key={tc.id} className={`p-4 rounded-xl border ${tc.isHidden ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-600">Test {i + 1}</span>
                                                    {tc.isHidden && <span className="text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">🔒 Hidden</span>}
                                                    <span className="text-xs text-gray-400">⭐ {tc.points}pt</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => startEdit(tc)}
                                                        className="text-xs px-2 py-0.5 rounded" style={{ color: '#C2185B' }}>แก้ไข</button>
                                                    <button onClick={() => handleDelete(tc.id)}
                                                        className="text-xs text-red-400 hover:text-red-600">ลบ</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-gray-500">Input:</span>
                                                    <pre className="bg-gray-800 text-green-300 p-1.5 rounded mt-1 font-mono overflow-hidden max-h-16 text-xs">
                                                        {tc.input || '(ว่าง)'}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Expected:</span>
                                                    <pre className="bg-gray-800 text-blue-300 p-1.5 rounded mt-1 font-mono overflow-hidden max-h-16 text-xs">
                                                        {tc.expectedOutput}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

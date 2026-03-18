// js/pages/teacher/TestCaseEditor.js - Manage test cases for an assignment

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
    const [testing, setTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState(null);

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
        setTestResult(null);
    };

    const handleSave = async () => {
        if (!form.expectedOutput.trim()) { setMsg('กรุณากรอก Expected Output'); return; }
        setSaving(true);
        setMsg('');
        try {
            const data = { ...form, assignmentId, order: testCases.length + 1 };
            if (editingId) {
                await db.collection('testCases').doc(editingId).update(form);
                setMsg('อัปเดตสำเร็จ!');
            } else {
                await db.collection('testCases').add(data);
                setMsg('เพิ่ม Test Case สำเร็จ!');
            }

            // Update assignment totalPoints
            const snap = await db.collection('testCases').where('assignmentId', '==', assignmentId).get();
            const total = snap.docs.reduce((s, d) => s + (d.data().points || 0), 0);
            await db.collection('assignments').doc(assignmentId).update({ totalPoints: total });

            loadData();
            resetForm();
        } catch (err) {
            setMsg('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('ยืนยันการลบ Test Case นี้?')) return;
        await db.collection('testCases').doc(id).delete();
        setTestCases(tcs => tcs.filter(t => t.id !== id));
    };

    const startEdit = (tc) => {
        setEditingId(tc.id);
        setForm({ input: tc.input || '', expectedOutput: tc.expectedOutput || '', isHidden: tc.isHidden, points: tc.points || 10 });
        setTestResult(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Test the expected output by running sample code through Piston
    const handleTestSample = async () => {
        if (!assignment) return;
        setTesting(true);
        setTestResult(null);
        try {
            const result = await runSingleTest(
                LANGUAGES[assignment.language]?.defaultCode || '',
                assignment.language,
                { id: 'preview', input: form.input, expectedOutput: form.expectedOutput }
            );
            setTestResult(result);
        } catch (err) {
            setTestResult({ passed: false, errorLog: err.message });
        } finally {
            setTesting(false);
        }
    };

    const publicCount = testCases.filter(t => !t.isHidden).length;
    const hiddenCount = testCases.filter(t => t.isHidden).length;
    const totalPoints = testCases.reduce((s, t) => s + (t.points || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title={assignment?.title || 'Test Case Editor'} subtitle="Test Case Manager" />
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center space-x-3 mb-6 text-sm">
                    <a href="#/teacher/courses" className="text-blue-500 hover:underline">← รายวิชา</a>
                    <span className="text-gray-300">/</span>
                    <a href={`#/teacher/assignment?course=${courseId}`} className="text-blue-500 hover:underline">{assignment?.title || 'โจทย์'}</a>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-700">Test Cases</span>
                </div>

                {loading ? <Spinner /> : (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Test Case Form */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <h3 className="font-bold text-gray-800 text-lg mb-4">
                                {editingId ? 'แก้ไข Test Case' : 'เพิ่ม Test Case ใหม่'}
                            </h3>

                            {msg && <div className={`p-3 rounded-lg mb-4 text-sm ${msg.includes('ข้อผิด') || msg.includes('กรุณา') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Input (stdin)</label>
                                    <textarea value={form.input} onChange={e => setForm(f => ({ ...f, input: e.target.value }))} rows="4"
                                        placeholder="ข้อมูล input ที่จะป้อนให้โปรแกรม (ว่างถ้าไม่มี)"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output *</label>
                                    <textarea value={form.expectedOutput} onChange={e => setForm(f => ({ ...f, expectedOutput: e.target.value }))} rows="4"
                                        placeholder="ผลลัพธ์ที่โปรแกรมต้องแสดง (ตรงทุกตัวอักษร)"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono" />
                                    <p className="text-xs text-gray-400 mt-1">* ระบบจะ trim whitespace ปลายบรรทัดก่อนเปรียบเทียบ</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">คะแนน</label>
                                        <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))} min="0" max="100"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div className="flex items-center space-x-3 pt-6">
                                        <input type="checkbox" id="hidden" checked={form.isHidden} onChange={e => setForm(f => ({ ...f, isHidden: e.target.checked }))} />
                                        <label htmlFor="hidden" className="text-sm text-gray-700">
                                            🔒 ซ่อน (นักเรียนไม่เห็น)
                                        </label>
                                    </div>
                                </div>

                                <div className="flex space-x-3">
                                    <button onClick={handleSave} disabled={saving}
                                        className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center text-sm">
                                        {saving ? <SpinIcon className="w-4 h-4 mr-2" /> : null}
                                        {saving ? 'กำลังบันทึก...' : editingId ? 'อัปเดต' : 'เพิ่ม Test Case'}
                                    </button>
                                    {editingId && (
                                        <button onClick={resetForm}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">ยกเลิก</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Test Cases List */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800 text-lg">Test Cases ({testCases.length})</h3>
                                <div className="flex space-x-3 text-xs text-gray-500">
                                    <span>👁 Public: {publicCount}</span>
                                    <span>🔒 Hidden: {hiddenCount}</span>
                                    <span>⭐ Total: {totalPoints}pt</span>
                                </div>
                            </div>

                            {testCases.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    <div className="text-3xl mb-2">📝</div>
                                    <p>ยังไม่มี Test Cases</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {testCases.map((tc, i) => (
                                        <div key={tc.id} className={`p-4 rounded-lg border ${tc.isHidden ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-bold text-gray-600">Test {i + 1}</span>
                                                    {tc.isHidden && <span className="text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">🔒 Hidden</span>}
                                                    <span className="text-xs text-gray-400">⭐ {tc.points}pt</span>
                                                </div>
                                                <div className="flex space-x-1">
                                                    <button onClick={() => startEdit(tc)} className="text-xs text-blue-500 hover:underline">แก้ไข</button>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleDelete(tc.id)} className="text-xs text-red-400 hover:underline">ลบ</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-gray-500">Input:</span>
                                                    <pre className="bg-gray-800 text-green-300 p-1.5 rounded mt-1 font-mono text-xs overflow-hidden max-h-16">
                                                        {tc.input || '(ว่าง)'}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Expected:</span>
                                                    <pre className="bg-gray-800 text-blue-300 p-1.5 rounded mt-1 font-mono text-xs overflow-hidden max-h-16">
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

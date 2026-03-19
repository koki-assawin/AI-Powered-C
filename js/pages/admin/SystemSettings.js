// js/pages/admin/SystemSettings.js - System configuration

const SystemSettings = () => {
    const [geminiKey, setGeminiKey] = React.useState('');
    const [showKey, setShowKey] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [pistonStatus, setPistonStatus] = React.useState(null);
    const [pistonLoading, setPistonLoading] = React.useState(false);
    const [msg, setMsg] = React.useState('');

    React.useEffect(() => { loadCurrentKey(); checkPistonStatus(); }, []);

    const loadCurrentKey = async () => {
        try {
            const snap = await db.collection('config').doc('gemini').get();
            if (snap.exists && snap.data().apiKey) setGeminiKey(snap.data().apiKey);
        } catch (err) {
            console.error('Could not load Gemini key:', err);
        }
    };

    const saveGeminiKey = async () => {
        if (!geminiKey.trim()) { setMsg('❌ กรุณากรอก API Key'); return; }
        setSaving(true);
        setMsg('');
        try {
            await db.collection('config').doc('gemini').set({ apiKey: geminiKey.trim() });
            GEMINI_KEY = geminiKey.trim(); // Update in-memory key immediately
            setMsg('✅ บันทึก Gemini API Key สำเร็จ!');
        } catch (err) {
            setMsg('❌ บันทึกไม่สำเร็จ: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const checkPistonStatus = async () => {
        setPistonLoading(true);
        setPistonStatus(null);
        try {
            const res = await fetch('https://emkc.org/api/v2/piston/runtimes');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const runtimes = await res.json();
            const supported = runtimes.filter(r =>
                ['c', 'cpp', 'python', 'java'].includes(r.language)
            );
            setPistonStatus({ ok: true, supported, total: runtimes.length });
        } catch (err) {
            setPistonStatus({ ok: false, error: err.message });
        } finally {
            setPistonLoading(false);
        }
    };

    const testGeminiKey = async () => {
        if (!geminiKey.trim()) { setMsg('❌ กรุณากรอก API Key ก่อนทดสอบ'); return; }
        setSaving(true);
        setMsg('กำลังทดสอบ...');
        try {
            const oldKey = GEMINI_KEY;
            GEMINI_KEY = geminiKey.trim();
            const result = await callGeminiApi('ตอบว่า "ทดสอบสำเร็จ" เท่านั้น');
            GEMINI_KEY = oldKey;
            setMsg(`✅ API Key ใช้งานได้! ตอบกลับ: "${result.slice(0, 50)}"`);
        } catch (err) {
            setMsg('❌ API Key ไม่ถูกต้องหรือไม่สามารถเชื่อมต่อได้: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Platform" subtitle="ตั้งค่าระบบ" />
            <main className="max-w-4xl mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">⚙️ ตั้งค่าระบบ</h2>

                {msg && (
                    <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${msg.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                        {msg}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Gemini API Key */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="font-bold text-gray-800 text-lg mb-1">🤖 Google Gemini API Key</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            เก็บใน Firestore ที่ collection:{' '}
                            <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">config/gemini</code>
                        </p>

                        <div className="relative mb-3">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={geminiKey}
                                onChange={e => setGeminiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            />
                            <button onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
                                {showKey ? '👁️' : '🙈'}
                            </button>
                        </div>

                        <div className="flex space-x-3">
                            <button onClick={saveGeminiKey} disabled={saving}
                                className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center">
                                {saving ? <SpinIcon className="w-4 h-4 mr-2" /> : null}
                                บันทึก API Key
                            </button>
                            <button onClick={testGeminiKey} disabled={saving}
                                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                                ทดสอบ
                            </button>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                                className="px-5 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200">
                                รับ API Key ฟรี →
                            </a>
                        </div>
                    </div>

                    {/* Piston API Status */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">⚡ Piston Code Execution API</h3>
                                <p className="text-sm text-gray-500">ระบบรันโค้ดสำหรับ Auto-Grader (ไม่ต้องใช้ API Key)</p>
                            </div>
                            <button onClick={checkPistonStatus} disabled={pistonLoading}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center">
                                {pistonLoading ? <SpinIcon className="w-4 h-4 mr-1" /> : '🔄 '}
                                ตรวจสถานะ
                            </button>
                        </div>

                        {pistonLoading && <Spinner text="กำลังตรวจสอบ Piston API..." />}

                        {pistonStatus && (
                            <div className={`p-4 rounded-lg ${pistonStatus.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                {pistonStatus.ok ? (
                                    <>
                                        <p className="font-medium text-green-700 mb-3">✅ Piston API ออนไลน์ ({pistonStatus.total} ภาษา)</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {pistonStatus.supported.map(r => (
                                                <div key={r.language} className="bg-white rounded-lg p-2 text-xs">
                                                    <span className="font-bold text-gray-700">{LANGUAGES[r.language]?.icon} {LANGUAGES[r.language]?.name || r.language}</span>
                                                    <span className="text-gray-400 ml-2">v{r.version}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-red-700">❌ Piston API ไม่สามารถเชื่อมต่อได้: {pistonStatus.error}</p>
                                )}
                            </div>
                        )}

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                            <strong>Endpoint:</strong>{' '}
                            <code className="font-mono">https://emkc.org/api/v2/piston/execute</code>
                            <br />
                            <strong>หมายเหตุ:</strong> Piston เป็น community service ไม่มี SLA อย่างเป็นทางการ หากต้องการความเสถียรสูง ควรพิจารณา self-host
                        </div>
                    </div>

                    {/* System Info */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="font-bold text-gray-800 text-lg mb-4">ℹ️ ข้อมูลระบบ</h3>
                        <div className="space-y-3 text-sm">
                            {[
                                { label: 'เวอร์ชัน', value: 'v3.0 (LMS Edition)' },
                                { label: 'Frontend', value: 'React 17 + Tailwind CSS + Babel Standalone' },
                                { label: 'Backend', value: 'Firebase Auth + Firestore + Realtime DB' },
                                { label: 'AI', value: 'Google Gemini 2.0 Flash' },
                                { label: 'Code Runner', value: 'Piston API (emkc.org)' },
                                { label: 'Hosting', value: 'GitHub Pages (Static)' },
                                { label: 'Firestore Region', value: 'asia-southeast1' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <span className="text-gray-500">{item.label}</span>
                                    <span className="font-medium text-gray-800 text-right">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Firestore Indexes Note */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                        <strong>📋 Firestore Composite Indexes ที่ต้องสร้าง:</strong>
                        <ul className="mt-2 space-y-1 font-mono text-xs list-disc list-inside">
                            <li>submissions: (studentId ASC, submittedAt DESC)</li>
                            <li>submissions: (courseId ASC, studentId ASC)</li>
                            <li>testCases: (assignmentId ASC, isHidden ASC, order ASC)</li>
                            <li>grades: (studentId ASC, courseId ASC)</li>
                        </ul>
                        <p className="mt-2 text-xs">Firestore จะแสดง link สำหรับสร้าง index ในหน้า browser console เมื่อ query ครั้งแรก</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

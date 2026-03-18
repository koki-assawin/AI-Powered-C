// js/pages/RegisterPage.js - User registration

const RegisterPage = () => {
    const [form, setForm] = React.useState({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',
    });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (form.password !== form.confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }
        if (form.password.length < 6) {
            setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        setLoading(true);
        try {
            const cred = await auth.createUserWithEmailAndPassword(form.email.trim(), form.password);
            await cred.user.updateProfile({ displayName: form.displayName.trim() });

            // Create Firestore user document
            await db.collection('users').doc(cred.user.uid).set({
                email: form.email.trim(),
                displayName: form.displayName.trim(),
                role: form.role,
                enrolledCourses: [],
                // Teachers must be approved by admin before accessing Teacher Dashboard
                approvedByAdmin: form.role === 'student',
                createdAt: serverTimestamp(),
                profilePhotoURL: null,
            });

            if (form.role === 'teacher') {
                setSuccess('สมัครสมาชิกสำเร็จ! บัญชีครูต้องรอการอนุมัติจากผู้ดูแลระบบก่อน');
                setTimeout(() => { window.location.hash = '#/login'; }, 3000);
            } else {
                window.location.hash = '#/student/dashboard';
            }
        } catch (err) {
            const msgs = {
                'auth/email-already-in-use': 'อีเมลนี้ถูกใช้แล้ว',
                'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
                'auth/weak-password': 'รหัสผ่านไม่ปลอดภัยพอ',
            };
            setError(msgs[err.code] || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-purple-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">AI</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">สมัครสมาชิก</h1>
                    <p className="text-blue-200 mt-1">AI-Powered Coding LMS</p>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">❌ {error}</div>
                    )}
                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">✅ {success}</div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                            <input
                                type="text" value={form.displayName} onChange={update('displayName')} required
                                placeholder="ชื่อ นามสกุล"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                            <input
                                type="email" value={form.email} onChange={update('email')} required
                                placeholder="your@email.com"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน (อย่างน้อย 6 ตัว)</label>
                            <input
                                type="password" value={form.password} onChange={update('password')} required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่าน</label>
                            <input
                                type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">บทบาทในระบบ</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'student', label: 'นักเรียน', icon: '🎓', desc: 'เรียนและส่งงาน' },
                                    { value: 'teacher', label: 'ครูผู้สอน', icon: '👨‍🏫', desc: 'ต้องรออนุมัติจาก Admin' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${form.role === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="text-xl mb-1">{opt.icon}</div>
                                        <div className="font-semibold text-gray-800 text-sm">{opt.label}</div>
                                        <div className="text-xs text-gray-500">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center"
                        >
                            {loading ? <SpinIcon className="w-5 h-5 mr-2" /> : null}
                            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        มีบัญชีแล้ว?{' '}
                        <a href="#/login" className="text-blue-600 font-semibold hover:underline">เข้าสู่ระบบ</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

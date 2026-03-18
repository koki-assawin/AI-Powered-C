// js/pages/LoginPage.js - Login with email/password or Google

const LoginPage = () => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const redirectAfterLogin = async (uid) => {
        const snap = await db.collection('users').doc(uid).get();
        const role = snap.data()?.role || 'student';
        const routes = {
            student: '#/student/dashboard',
            teacher: '#/teacher/dashboard',
            admin: '#/admin/dashboard',
        };
        window.location.hash = routes[role];
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const cred = await auth.signInWithEmailAndPassword(email.trim(), password);
            await redirectAfterLogin(cred.user.uid);
        } catch (err) {
            const msgs = {
                'auth/user-not-found': 'ไม่พบบัญชีนี้ในระบบ',
                'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
                'auth/invalid-email': 'อีเมลไม่ถูกต้อง',
                'auth/too-many-requests': 'ล็อกอินหลายครั้งเกินไป กรุณารอสักครู่',
            };
            setError(msgs[err.code] || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const cred = await auth.signInWithPopup(googleProvider);
            await redirectAfterLogin(cred.user.uid);
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                setError('เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-purple-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                            AI
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">AI-Powered Coding LMS</h1>
                    <p className="text-blue-200 mt-2">ระบบจัดการการเรียนรู้การเขียนโปรแกรม</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">เข้าสู่ระบบ</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                            ❌ {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="your@email.com"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? <SpinIcon className="w-5 h-5 mr-2" /> : null}
                            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                        </button>
                    </form>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-3 text-gray-500">หรือ</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full border-2 border-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center space-x-3 disabled:opacity-60"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>เข้าสู่ระบบด้วย Google</span>
                    </button>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        ยังไม่มีบัญชี?{' '}
                        <a href="#/register" className="text-blue-600 font-semibold hover:underline">
                            สมัครสมาชิก
                        </a>
                    </p>
                </div>

                <p className="text-center text-blue-200 text-xs mt-6">
                    © 2025 AI-Powered Coding LMS | Triam Udom Suksa of The South
                </p>
            </div>
        </div>
    );
};

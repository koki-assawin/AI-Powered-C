// js/pages/LoginPage.js — K-Minimal Pink Theme

const SCHOOL_LOGO = 'https://www.triamudomsouth.ac.th/images/theme/150x150.png';

const LoginPage = () => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const redirectAfterLogin = async (uid) => {
        const snap = await db.collection('users').doc(uid).get();
        const role = snap.data()?.role || 'student';
        const routes = { student: '#/student/dashboard', teacher: '#/teacher/dashboard', admin: '#/admin/dashboard' };
        window.location.hash = routes[role];
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const cred = await auth.signInWithEmailAndPassword(email.trim(), password);
            await redirectAfterLogin(cred.user.uid);
        } catch (err) {
            const msgs = {
                'auth/user-not-found': 'ไม่พบบัญชีนี้ในระบบ',
                'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
                'auth/invalid-email':  'อีเมลไม่ถูกต้อง',
                'auth/too-many-requests': 'ล็อกอินหลายครั้งเกินไป กรุณารอสักครู่',
            };
            setError(msgs[err.code] || err.message);
        } finally { setLoading(false); }
    };

    const handleGoogleLogin = async () => {
        setError(''); setLoading(true);
        try {
            const cred = await auth.signInWithPopup(googleProvider);
            await redirectAfterLogin(cred.user.uid);
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') setError('เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
        } finally { setLoading(false); }
    };

    const s = {
        page: {
            minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(160deg, #fdf2f8 0%, #fce7f3 45%, #fbcfe8 100%)',
            padding:'24px 16px',
            fontFamily:"'Prompt', 'Segoe UI', sans-serif",
        },
        wrap: { width:'100%', maxWidth:'420px' },
        logoWrap: {
            display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'28px', gap:'14px',
        },
        logoImg: {
            width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover',
            border:'3px solid white', boxShadow:'0 6px 32px rgba(236,72,153,.22)',
        },
        platformTitle: {
            textAlign:'center', lineHeight:'1.4',
        },
        titleEn: {
            display:'block', fontSize:'18px', fontWeight:700, color:'#be185d',
        },
        titleTh: {
            display:'block', fontSize:'11px', color:'#f472b6', marginTop:'4px',
        },
        card: {
            background:'white', borderRadius:'24px', padding:'36px 32px',
            boxShadow:'0 10px 48px rgba(236,72,153,.13)', border:'1px solid #fce7f3',
        },
        heading: { fontSize:'20px', fontWeight:700, color:'#374151', marginBottom:'22px' },
        label: { display:'block', fontSize:'13px', fontWeight:500, color:'#6b7280', marginBottom:'6px' },
        errorBox: {
            background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px',
            padding:'10px 14px', marginBottom:'16px', color:'#dc2626', fontSize:'13px',
        },
        dividerWrap: { display:'flex', alignItems:'center', margin:'20px 0', gap:'10px' },
        dividerLine: { flex:1, height:'1px', background:'#fce7f3' },
        dividerText: { fontSize:'12px', color:'#d1d5db', whiteSpace:'nowrap' },
        googleBtn: {
            width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
            padding:'12px', borderRadius:'14px', border:'1.5px solid #fce7f3',
            background:'white', cursor:'pointer', fontSize:'14px', fontWeight:500, color:'#374151',
            fontFamily:"'Prompt', sans-serif", transition:'background .15s',
        },
        footer: { textAlign:'center', color:'#f9a8d4', fontSize:'11px', marginTop:'24px' },
    };

    return (
        <div style={s.page}>
            <div style={s.wrap}>

                {/* Header */}
                <div style={s.logoWrap}>
                    <img src={SCHOOL_LOGO} alt="โรงเรียนเตรียมอุดมฯ ใต้" style={s.logoImg} />
                    <div style={s.platformTitle}>
                        <span style={s.titleEn}>AI-Powered Coding Assessment</span>
                        <span style={s.titleEn}>&amp; Practice Platform</span>
                        <span style={s.titleTh}>ระบบประเมินและฝึกทักษะการเขียนโปรแกรมอัตโนมัติ ขับเคลื่อนด้วยปัญญาประดิษฐ์</span>
                    </div>
                </div>

                {/* Card */}
                <div style={s.card}>
                    <h2 style={s.heading}>🔐 เข้าสู่ระบบ</h2>

                    {error && <div style={s.errorBox}>❌ {error}</div>}

                    <form onSubmit={handleEmailLogin}>
                        <div style={{ marginBottom:'16px' }}>
                            <label style={s.label}>📧 อีเมล</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                required placeholder="your@email.com" className="k-input" />
                        </div>
                        <div style={{ marginBottom:'20px' }}>
                            <label style={s.label}>🔑 รหัสผ่าน</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                required placeholder="••••••••" className="k-input" />
                        </div>
                        <button type="submit" disabled={loading} className="k-btn-pink"
                            style={{ width:'100%', padding:'13px', fontSize:'15px' }}>
                            {loading ? '⏳ กำลังเข้าสู่ระบบ...' : '✨ เข้าสู่ระบบ'}
                        </button>
                    </form>

                    <div style={s.dividerWrap}>
                        <div style={s.dividerLine}/>
                        <span style={s.dividerText}>หรือเข้าสู่ระบบด้วย</span>
                        <div style={s.dividerLine}/>
                    </div>

                    <button onClick={handleGoogleLogin} disabled={loading} style={s.googleBtn}
                        onMouseEnter={e => e.currentTarget.style.background='#fdf2f8'}
                        onMouseLeave={e => e.currentTarget.style.background='white'}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google Sign-In
                    </button>

                    <p style={{ textAlign:'center', fontSize:'13px', color:'#9ca3af', marginTop:'20px' }}>
                        ยังไม่มีบัญชี?{' '}
                        <a href="#/register" style={{ color:'#ec4899', fontWeight:600, textDecoration:'none' }}>
                            สมัครสมาชิก →
                        </a>
                    </p>
                </div>

                <p style={s.footer}>
                    © 2025 โรงเรียนเตรียมอุดมศึกษาภาคใต้ · AI-Powered Coding Platform
                </p>
            </div>
        </div>
    );
};

// js/pages/LoginPage.js — K-Minimal Pink Theme

const SCHOOL_LOGO = 'https://www.triamudomsouth.ac.th/images/theme/150x150.png';

const LoginPage = () => {
    const [email, setEmail]       = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading]   = React.useState(false);
    const [error, setError]       = React.useState('');

    // Forgot password states
    const [showForgot, setShowForgot]   = React.useState(false);
    const [forgotEmail, setForgotEmail] = React.useState('');
    const [forgotLoading, setForgotLoading] = React.useState(false);
    const [forgotMsg, setForgotMsg]     = React.useState(''); // '' | 'sent' | 'error:...'

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
                'auth/user-not-found':    'ไม่พบบัญชีนี้ในระบบ',
                'auth/wrong-password':    'รหัสผ่านไม่ถูกต้อง',
                'auth/invalid-email':     'อีเมลไม่ถูกต้อง',
                'auth/invalid-credential':'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
                'auth/too-many-requests': 'ล็อกอินหลายครั้งเกินไป กรุณารอสักครู่',
            };
            setError(msgs[err.code] || err.message);
        } finally { setLoading(false); }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotMsg('');
        const trimmed = forgotEmail.trim();
        if (!trimmed) return;
        setForgotLoading(true);
        try {
            await auth.sendPasswordResetEmail(trimmed);
            setForgotMsg('sent');
        } catch (err) {
            const msgs = {
                'auth/user-not-found': 'ไม่พบบัญชีอีเมลนี้ในระบบ',
                'auth/invalid-email':  'รูปแบบอีเมลไม่ถูกต้อง',
                'auth/too-many-requests': 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่',
            };
            setForgotMsg('error:' + (msgs[err.code] || err.message));
        } finally {
            setForgotLoading(false);
        }
    };

    const s = {
        page: {
            minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(160deg, #fdf2f8 0%, #fce7f3 45%, #fbcfe8 100%)',
            padding:'24px 16px', fontFamily:"'Prompt', 'Segoe UI', sans-serif",
        },
        wrap: { width:'100%', maxWidth:'420px' },
        logoWrap: { display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'28px', gap:'14px' },
        logoImg: {
            width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover',
            border:'3px solid white', boxShadow:'0 6px 32px rgba(236,72,153,.22)',
        },
        platformTitle: { textAlign:'center', lineHeight:'1.4' },
        titleEn: { display:'block', fontSize:'18px', fontWeight:700, color:'#be185d' },
        titleTh: { display:'block', fontSize:'11px', color:'#f472b6', marginTop:'4px' },
        card: {
            background:'white', borderRadius:'24px', padding:'36px 32px',
            boxShadow:'0 10px 48px rgba(236,72,153,.13)', border:'1px solid #fce7f3',
        },
        heading: { fontSize:'20px', fontWeight:700, color:'#374151', marginBottom:'22px' },
        label:   { display:'block', fontSize:'13px', fontWeight:500, color:'#6b7280', marginBottom:'6px' },
        errorBox: {
            background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px',
            padding:'10px 14px', marginBottom:'16px', color:'#dc2626', fontSize:'13px',
        },
        footer: { textAlign:'center', color:'#f9a8d4', fontSize:'11px', marginTop:'24px' },
    };

    return (
        <div style={s.page}>
            <div style={s.wrap}>
                <div style={s.logoWrap}>
                    <img src={SCHOOL_LOGO} alt="โรงเรียนเตรียมอุดมฯ ใต้" style={s.logoImg} />
                    <div style={s.platformTitle}>
                        <span style={s.titleEn}>AI-Powered Coding Coach (APCC)</span>
                        <span style={s.titleTh}>โค้ชโค้ดอัจฉริยะ ขับเคลื่อนด้วยปัญญาประดิษฐ์</span>
                    </div>
                </div>

                <div style={s.card}>
                    <h2 style={s.heading}>🔐 เข้าสู่ระบบ</h2>

                    {error && <div style={s.errorBox}>❌ {error}</div>}

                    <form onSubmit={handleEmailLogin}>
                        <div style={{ marginBottom:'16px' }}>
                            <label style={s.label}>📧 อีเมล</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                required placeholder="your@email.com" className="k-input" />
                        </div>
                        <div style={{ marginBottom:'8px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                                <label style={s.label}>🔑 รหัสผ่าน</label>
                                <button type="button" onClick={() => { setShowForgot(f => !f); setForgotMsg(''); }}
                                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#ec4899', fontWeight:600, padding:0 }}>
                                    {showForgot ? '✕ ปิด' : 'ลืมรหัสผ่าน?'}
                                </button>
                            </div>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                required placeholder="••••••••" className="k-input" />
                        </div>

                        {/* ── Forgot Password Panel ── */}
                        {showForgot && (
                            <div style={{
                                marginBottom:'16px', padding:'16px', borderRadius:'12px',
                                background:'#fdf2f8', border:'1px solid #fbcfe8',
                            }}>
                                {forgotMsg === 'sent' ? (
                                    <div style={{ textAlign:'center' }}>
                                        <div style={{ fontSize:'32px', marginBottom:'8px' }}>📬</div>
                                        <p style={{ fontSize:'14px', fontWeight:700, color:'#be185d', margin:'0 0 4px' }}>
                                            ส่งลิงก์รีเซทแล้ว!
                                        </p>
                                        <p style={{ fontSize:'12px', color:'#9ca3af', margin:'0 0 12px' }}>
                                            ตรวจสอบอีเมล <strong>{forgotEmail}</strong><br/>
                                            กดลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่
                                        </p>
                                        <button type="button" onClick={() => { setForgotMsg(''); setForgotEmail(''); }}
                                            style={{ fontSize:'12px', color:'#ec4899', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                                            ส่งอีกครั้ง
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleForgotPassword}>
                                        <p style={{ fontSize:'13px', color:'#6b7280', margin:'0 0 10px' }}>
                                            กรอกอีเมลที่ใช้สมัครสมาชิก — ระบบจะส่งลิงก์เปลี่ยนรหัสผ่านให้
                                        </p>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={e => setForgotEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            required
                                            className="k-input"
                                            style={{ marginBottom:'10px' }}
                                        />
                                        {forgotMsg.startsWith('error:') && (
                                            <div style={{ fontSize:'12px', color:'#dc2626', marginBottom:'8px', padding:'8px 10px', background:'#fef2f2', borderRadius:'8px', border:'1px solid #fecaca' }}>
                                                ❌ {forgotMsg.replace('error:', '')}
                                            </div>
                                        )}
                                        <button type="submit" disabled={forgotLoading}
                                            style={{
                                                width:'100%', padding:'10px', borderRadius:'10px', border:'none',
                                                background: forgotLoading ? '#f9a8d4' : '#ec4899',
                                                color:'white', fontSize:'13px', fontWeight:700, cursor: forgotLoading ? 'not-allowed' : 'pointer',
                                            }}>
                                            {forgotLoading ? '⏳ กำลังส่ง...' : '📧 ส่งลิงก์รีเซทรหัสผ่าน'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}

                        <div style={{ marginBottom:'20px' }} />
                        <button type="submit" disabled={loading} className="k-btn-pink"
                            style={{ width:'100%', padding:'13px', fontSize:'15px' }}>
                            {loading ? '⏳ กำลังเข้าสู่ระบบ...' : '✨ เข้าสู่ระบบ'}
                        </button>
                    </form>

                    <p style={{ textAlign:'center', fontSize:'13px', color:'#9ca3af', marginTop:'20px' }}>
                        ยังไม่มีบัญชี?{' '}
                        <a href="#/register" style={{ color:'#ec4899', fontWeight:600, textDecoration:'none' }}>
                            สมัครสมาชิก →
                        </a>
                    </p>

                    <div style={{ borderTop:'1px solid #fce7f3', margin:'20px 0 0' }} />
                    <a href="#/demo" style={{
                        display:'block', textAlign:'center', marginTop:'16px',
                        padding:'11px', borderRadius:'12px',
                        border:'1.5px dashed #f9a8d4',
                        color:'#be185d', fontSize:'13px', fontWeight:600,
                        textDecoration:'none', background:'#fdf2f8',
                        transition:'background .2s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background='#fce7f3'}
                        onMouseLeave={e => e.currentTarget.style.background='#fdf2f8'}
                    >
                        🎭 ทดลองใช้งานฟรี (ไม่ต้องสมัคร)
                    </a>
                </div>

                <p style={s.footer}>
                    © 2025 โรงเรียนเตรียมอุดมศึกษาภาคใต้ · AI-Powered Coding Coach (APCC)
                    {' · '}
                    <a href="#/privacy" style={{ color:'#f9a8d4', textDecoration:'underline' }}>นโยบายความเป็นส่วนตัว</a>
                </p>
            </div>
        </div>
    );
};

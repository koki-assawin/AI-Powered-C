// js/pages/RegisterPage.js — K-Minimal Pink Theme

const SCHOOL_LOGO = 'https://www.triamudomsouth.ac.th/images/theme/150x150.png';

const RegisterPage = () => {
    const [form, setForm] = React.useState({
        displayName: '', email: '', password: '', confirmPassword: '', role: 'student',
    });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (form.password !== form.confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return; }
        if (form.password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
        setLoading(true);
        try {
            const cred = await auth.createUserWithEmailAndPassword(form.email.trim(), form.password);
            await cred.user.updateProfile({ displayName: form.displayName.trim() });
            await db.collection('users').doc(cred.user.uid).set({
                email: form.email.trim(), displayName: form.displayName.trim(),
                role: form.role, enrolledCourses: [],
                approvedByAdmin: form.role === 'student',
                createdAt: serverTimestamp(), profilePhotoURL: null,
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
        } finally { setLoading(false); }
    };

    const s = {
        page: {
            minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(160deg, #fdf2f8 0%, #fce7f3 45%, #fbcfe8 100%)',
            padding:'24px 16px', fontFamily:"'Prompt', 'Segoe UI', sans-serif",
        },
        wrap: { width:'100%', maxWidth:'440px' },
        logoWrap: { display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'24px', gap:'12px' },
        logoImg: {
            width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover',
            border:'3px solid white', boxShadow:'0 6px 24px rgba(236,72,153,.2)',
        },
        titleEn: { display:'block', fontSize:'16px', fontWeight:700, color:'#be185d', textAlign:'center' },
        titleTh: { display:'block', fontSize:'10px', color:'#f472b6', textAlign:'center', marginTop:'3px' },
        card: {
            background:'white', borderRadius:'24px', padding:'32px 28px',
            boxShadow:'0 10px 48px rgba(236,72,153,.12)', border:'1px solid #fce7f3',
        },
        heading: { fontSize:'20px', fontWeight:700, color:'#374151', marginBottom:'20px' },
        label: { display:'block', fontSize:'13px', fontWeight:500, color:'#6b7280', marginBottom:'5px' },
        fieldWrap: { marginBottom:'14px' },
        errorBox: {
            background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px',
            padding:'10px 14px', marginBottom:'14px', color:'#dc2626', fontSize:'13px',
        },
        successBox: {
            background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px',
            padding:'10px 14px', marginBottom:'14px', color:'#15803d', fontSize:'13px',
        },
    };

    const roleOptions = [
        { value:'student', label:'นักเรียน', icon:'🎓', desc:'เรียนและส่งงาน', color:'#fdf2f8', border:'#f9a8d4' },
        { value:'teacher', label:'ครูผู้สอน', icon:'👨‍🏫', desc:'ต้องรออนุมัติจาก Admin', color:'#f0fdf4', border:'#86efac' },
    ];

    return (
        <div style={s.page}>
            <div style={s.wrap}>

                {/* Header */}
                <div style={s.logoWrap}>
                    <img src={SCHOOL_LOGO} alt="โรงเรียนเตรียมอุดมฯ ใต้" style={s.logoImg} />
                    <div>
                        <span style={s.titleEn}>AI-Powered Coding Assessment &amp; Practice Platform</span>
                        <span style={s.titleTh}>ระบบประเมินและฝึกทักษะการเขียนโปรแกรมอัตโนมัติ</span>
                    </div>
                </div>

                {/* Card */}
                <div style={s.card}>
                    <h2 style={s.heading}>📝 สมัครสมาชิก</h2>

                    {error   && <div style={s.errorBox}>❌ {error}</div>}
                    {success && <div style={s.successBox}>✅ {success}</div>}

                    <form onSubmit={handleRegister}>
                        <div style={s.fieldWrap}>
                            <label style={s.label}>👤 ชื่อ-นามสกุล</label>
                            <input type="text" value={form.displayName} onChange={update('displayName')}
                                required placeholder="ชื่อ นามสกุล" className="k-input" />
                        </div>
                        <div style={s.fieldWrap}>
                            <label style={s.label}>📧 อีเมล</label>
                            <input type="email" value={form.email} onChange={update('email')}
                                required placeholder="your@email.com" className="k-input" />
                        </div>
                        <div style={s.fieldWrap}>
                            <label style={s.label}>🔑 รหัสผ่าน (อย่างน้อย 6 ตัว)</label>
                            <input type="password" value={form.password} onChange={update('password')}
                                required placeholder="••••••••" className="k-input" />
                        </div>
                        <div style={s.fieldWrap}>
                            <label style={s.label}>🔑 ยืนยันรหัสผ่าน</label>
                            <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')}
                                required placeholder="••••••••" className="k-input" />
                        </div>

                        <div style={s.fieldWrap}>
                            <label style={s.label}>🏷️ บทบาทในระบบ</label>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                                {roleOptions.map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                                        style={{
                                            padding:'12px 10px', borderRadius:'14px', textAlign:'left', cursor:'pointer',
                                            border: form.role === opt.value ? `2px solid #ec4899` : `1.5px solid #fce7f3`,
                                            background: form.role === opt.value ? '#fdf2f8' : 'white',
                                            transition:'all .15s', fontFamily:"'Prompt',sans-serif",
                                        }}
                                    >
                                        <div style={{ fontSize:'22px', marginBottom:'4px' }}>{opt.icon}</div>
                                        <div style={{ fontWeight:600, fontSize:'13px', color:'#374151' }}>{opt.label}</div>
                                        <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'2px' }}>{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="k-btn-pink"
                            style={{ width:'100%', padding:'13px', fontSize:'15px', marginTop:'6px' }}>
                            {loading ? '⏳ กำลังสมัคร...' : '✨ สมัครสมาชิก'}
                        </button>
                    </form>

                    <p style={{ textAlign:'center', fontSize:'13px', color:'#9ca3af', marginTop:'18px' }}>
                        มีบัญชีแล้ว?{' '}
                        <a href="#/login" style={{ color:'#ec4899', fontWeight:600, textDecoration:'none' }}>
                            เข้าสู่ระบบ →
                        </a>
                    </p>
                </div>

                <p style={{ textAlign:'center', color:'#f9a8d4', fontSize:'11px', marginTop:'20px' }}>
                    © 2025 โรงเรียนเตรียมอุดมศึกษาภาคใต้ · AI-Powered Coding Platform
                </p>
            </div>
        </div>
    );
};

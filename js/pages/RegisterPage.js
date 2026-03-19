// js/pages/RegisterPage.js — Role selection first, student extra fields (v4.6)

const SCHOOL_LOGO = 'https://www.triamudomsouth.ac.th/images/theme/150x150.png';

const GRADE_OPTIONS = ['ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];

const RegisterPage = () => {
    // Step 1: pick role  |  Step 2: fill details
    const [step, setStep] = React.useState(1);
    const [role, setRole] = React.useState('');

    const [form, setForm] = React.useState({
        displayName: '', email: '', password: '', confirmPassword: '',
        // student-only
        studentCode: '', grade: 'ม.4', room: '', number: '',
    });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');

    const up = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (form.password !== form.confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return; }
        if (form.password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
        setLoading(true);
        try {
            const cred = await auth.createUserWithEmailAndPassword(form.email.trim(), form.password);
            await cred.user.updateProfile({ displayName: form.displayName.trim() });

            const userDoc = {
                email: form.email.trim(),
                displayName: form.displayName.trim(),
                role,
                enrolledCourses: [],
                approvedByAdmin: role === 'student',
                createdAt: serverTimestamp(),
                profilePhotoURL: null,
            };
            if (role === 'student') {
                userDoc.studentCode = form.studentCode.trim();
                userDoc.grade       = form.grade;
                userDoc.room        = form.room.trim();
                userDoc.number      = form.number.trim();
            }
            await db.collection('users').doc(cred.user.uid).set(userDoc);

            if (role === 'teacher') {
                setSuccess('สมัครสมาชิกสำเร็จ! บัญชีครูต้องรอการอนุมัติจากผู้ดูแลระบบก่อน');
                setTimeout(() => { window.location.hash = '#/login'; }, 3000);
            } else {
                window.location.hash = '#/student/dashboard';
            }
        } catch (err) {
            const msgs = {
                'auth/email-already-in-use': 'อีเมลนี้ถูกใช้แล้ว',
                'auth/invalid-email':        'รูปแบบอีเมลไม่ถูกต้อง',
                'auth/weak-password':        'รหัสผ่านไม่ปลอดภัยพอ (อย่างน้อย 6 ตัว)',
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
        wrap: { width:'100%', maxWidth:'460px' },
        logoWrap: { display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'22px', gap:'12px' },
        logoImg: {
            width:'78px', height:'78px', borderRadius:'50%', objectFit:'cover',
            border:'3px solid white', boxShadow:'0 6px 24px rgba(236,72,153,.2)',
        },
        titleEn: { display:'block', fontSize:'15px', fontWeight:700, color:'#be185d', textAlign:'center' },
        titleTh: { display:'block', fontSize:'10px', color:'#f472b6', textAlign:'center', marginTop:'3px' },
        card: {
            background:'white', borderRadius:'24px', padding:'32px 28px',
            boxShadow:'0 10px 48px rgba(236,72,153,.12)', border:'1px solid #fce7f3',
        },
        heading: { fontSize:'20px', fontWeight:700, color:'#374151', marginBottom:'6px' },
        subheading: { fontSize:'13px', color:'#9ca3af', marginBottom:'20px' },
        label: { display:'block', fontSize:'13px', fontWeight:500, color:'#6b7280', marginBottom:'5px' },
        fw: { marginBottom:'14px' },
        errorBox: {
            background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px',
            padding:'10px 14px', marginBottom:'14px', color:'#dc2626', fontSize:'13px',
        },
        successBox: {
            background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px',
            padding:'10px 14px', marginBottom:'14px', color:'#15803d', fontSize:'13px',
        },
        sectionDivider: {
            fontSize:'11px', fontWeight:600, color:'#C2185B', letterSpacing:'0.05em',
            textTransform:'uppercase', marginBottom:'10px', marginTop:'6px',
            borderBottom:'1px solid #fce7f3', paddingBottom:'6px',
        },
    };

    // ── Step 1: Role Selection ────────────────────────────────────────
    if (step === 1) {
        return (
            <div style={s.page}>
                <div style={s.wrap}>
                    <div style={s.logoWrap}>
                        <img src={SCHOOL_LOGO} alt="โรงเรียน" style={s.logoImg} />
                        <div>
                            <span style={s.titleEn}>AI-Powered Coding Assessment &amp; Practice Platform</span>
                            <span style={s.titleTh}>ระบบประเมินและฝึกทักษะการเขียนโปรแกรมอัตโนมัติ</span>
                        </div>
                    </div>

                    <div style={s.card}>
                        <h2 style={s.heading}>📝 สมัครสมาชิก</h2>
                        <p style={s.subheading}>กรุณาเลือกบทบาทของคุณในระบบ</p>

                        <div style={{ display:'grid', gap:'14px', marginBottom:'24px' }}>
                            {[
                                { value:'student', icon:'🎓', label:'นักเรียน',   desc:'เรียน ส่งงาน และฝึกทำโจทย์', color:'#fdf2f8', border:'#f9a8d4' },
                                { value:'teacher', icon:'👨‍🏫', label:'ครูผู้สอน', desc:'สร้างรายวิชา โจทย์ และดูผลการเรียน\n(ต้องรอการอนุมัติจาก Admin)', color:'#f0fdf4', border:'#86efac' },
                            ].map(opt => (
                                <button key={opt.value} type="button"
                                    onClick={() => setRole(opt.value)}
                                    style={{
                                        padding:'18px 20px', borderRadius:'16px', textAlign:'left', cursor:'pointer',
                                        border: role === opt.value ? '2.5px solid #ec4899' : '1.5px solid #fce7f3',
                                        background: role === opt.value ? '#fdf2f8' : 'white',
                                        transition:'all .15s', fontFamily:"'Prompt',sans-serif",
                                        display:'flex', alignItems:'center', gap:'16px',
                                    }}>
                                    <div style={{ fontSize:'36px', lineHeight:1 }}>{opt.icon}</div>
                                    <div>
                                        <div style={{ fontWeight:700, fontSize:'15px', color:'#374151' }}>{opt.label}</div>
                                        <div style={{ fontSize:'12px', color:'#9ca3af', marginTop:'3px', whiteSpace:'pre-line' }}>{opt.desc}</div>
                                    </div>
                                    {role === opt.value && (
                                        <div style={{ marginLeft:'auto', color:'#ec4899', fontSize:'20px' }}>✓</div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { if (!role) { alert('กรุณาเลือกบทบาทก่อน'); return; } setStep(2); }}
                            className="k-btn-pink"
                            style={{ width:'100%', padding:'13px', fontSize:'15px' }}>
                            ถัดไป →
                        </button>

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
    }

    // ── Step 2: Fill Details ──────────────────────────────────────────
    return (
        <div style={s.page}>
            <div style={s.wrap}>
                <div style={s.logoWrap}>
                    <img src={SCHOOL_LOGO} alt="โรงเรียน" style={s.logoImg} />
                    <div>
                        <span style={s.titleEn}>AI-Powered Coding Assessment &amp; Practice Platform</span>
                        <span style={s.titleTh}>ระบบประเมินและฝึกทักษะการเขียนโปรแกรมอัตโนมัติ</span>
                    </div>
                </div>

                <div style={s.card}>
                    {/* Back + role indicator */}
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                        <button type="button" onClick={() => { setStep(1); setError(''); }}
                            style={{ background:'none', border:'none', cursor:'pointer', color:'#ec4899', fontSize:'18px', padding:0 }}>
                            ←
                        </button>
                        <div>
                            <h2 style={{ ...s.heading, marginBottom:0 }}>
                                {role === 'student' ? '🎓 สมัครสมาชิก (นักเรียน)' : '👨‍🏫 สมัครสมาชิก (ครูผู้สอน)'}
                            </h2>
                        </div>
                    </div>

                    {error   && <div style={s.errorBox}>❌ {error}</div>}
                    {success && <div style={s.successBox}>✅ {success}</div>}

                    <form onSubmit={handleRegister}>

                        {/* ── Common fields ── */}
                        <p style={s.sectionDivider}>ข้อมูลบัญชี</p>
                        <div style={s.fw}>
                            <label style={s.label}>👤 ชื่อ-นามสกุล *</label>
                            <input type="text" value={form.displayName} onChange={up('displayName')}
                                required placeholder="ชื่อ นามสกุล" className="k-input" />
                        </div>
                        <div style={s.fw}>
                            <label style={s.label}>📧 อีเมล *</label>
                            <input type="email" value={form.email} onChange={up('email')}
                                required placeholder="your@email.com" className="k-input" />
                        </div>
                        <div style={s.fw}>
                            <label style={s.label}>🔑 รหัสผ่าน (อย่างน้อย 6 ตัว) *</label>
                            <input type="password" value={form.password} onChange={up('password')}
                                required placeholder="••••••••" className="k-input" />
                        </div>
                        <div style={s.fw}>
                            <label style={s.label}>🔑 ยืนยันรหัสผ่าน *</label>
                            <input type="password" value={form.confirmPassword} onChange={up('confirmPassword')}
                                required placeholder="••••••••" className="k-input" />
                        </div>

                        {/* ── Student-only fields ── */}
                        {role === 'student' && (
                            <>
                                <p style={s.sectionDivider}>ข้อมูลนักเรียน</p>
                                <div style={s.fw}>
                                    <label style={s.label}>🪪 เลขประจำตัวนักเรียน *</label>
                                    <input type="text" value={form.studentCode} onChange={up('studentCode')}
                                        required placeholder="เช่น 12345" className="k-input"
                                        inputMode="numeric" />
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'14px' }}>
                                    <div>
                                        <label style={s.label}>📚 ระดับชั้น *</label>
                                        <select value={form.grade} onChange={up('grade')} required
                                            className="k-input" style={{ paddingLeft:'8px' }}>
                                            {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={s.label}>🚪 ห้อง *</label>
                                        <input type="text" value={form.room} onChange={up('room')}
                                            required placeholder="เช่น 1" className="k-input" />
                                    </div>
                                    <div>
                                        <label style={s.label}>#️⃣ เลขที่ *</label>
                                        <input type="text" value={form.number} onChange={up('number')}
                                            required placeholder="เช่น 15" className="k-input"
                                            inputMode="numeric" />
                                    </div>
                                </div>
                            </>
                        )}

                        <button type="submit" disabled={loading} className="k-btn-pink"
                            style={{ width:'100%', padding:'13px', fontSize:'15px', marginTop:'6px' }}>
                            {loading ? '⏳ กำลังสมัคร...' : '✨ สมัครสมาชิก'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign:'center', color:'#f9a8d4', fontSize:'11px', marginTop:'20px' }}>
                    © 2025 โรงเรียนเตรียมอุดมศึกษาภาคใต้ · AI-Powered Coding Platform
                </p>
            </div>
        </div>
    );
};

// js/pages/GuestLandingPage.js — Demo/Guest Mode Landing (v1.0)

const GuestLandingPage = () => {
    const { user, userDoc } = useAuth();
    const [demoData, setDemoData] = React.useState(null);
    const [signingIn, setSigningIn] = React.useState(false);
    const [loadError, setLoadError] = React.useState('');

    // Sign in anonymously if no user session
    React.useEffect(() => {
        if (user) return;
        setSigningIn(true);
        auth.signInAnonymously()
            .catch(err => setLoadError('เข้าสู่โหมดทดลองไม่สำเร็จ: ' + err.message))
            .finally(() => setSigningIn(false));
    }, [user]);

    // Load demo config
    React.useEffect(() => {
        db.collection('appConfig').doc('demo').get()
            .then(snap => { if (snap.exists) setDemoData(snap.data()); })
            .catch(() => {});
    }, []);

    const goToWorkspace = (assignment) => {
        if (!demoData?.courseId) return;
        window.location.hash = `#/student/workspace?course=${demoData.courseId}&assignment=${assignment.id}`;
    };

    const UNIT_COLORS = [
        { bg: '#eff6ff', border: '#bfdbfe', icon: '#3b82f6', tag: '#dbeafe', tagText: '#1e40af' },
        { bg: '#f0fdf4', border: '#bbf7d0', icon: '#22c55e', tag: '#dcfce7', tagText: '#166534' },
        { bg: '#fdf4ff', border: '#e9d5ff', icon: '#a855f7', tag: '#f3e8ff', tagText: '#6b21a8' },
        { bg: '#fff7ed', border: '#fed7aa', icon: '#f97316', tag: '#ffedd5', tagText: '#7c2d12' },
    ];

    if (signingIn || (!user && !loadError)) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fdf2f8,#fce7f3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Prompt',sans-serif" }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎭</div>
                    <p style={{ color: '#be185d', fontWeight: 600, fontSize: 16 }}>กำลังเข้าสู่โหมดทดลอง...</p>
                    <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>ไม่จำเป็นต้องสมัครสมาชิก</p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div style={{ minHeight: '100vh', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Prompt',sans-serif" }}>
                <div style={{ textAlign: 'center', maxWidth: 360 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                    <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: 16 }}>{loadError}</p>
                    <a href="#/login" style={{ color: '#ec4899', fontWeight: 600 }}>← กลับหน้าเข้าสู่ระบบ</a>
                </div>
            </div>
        );
    }

    const assignments = demoData?.assignments || [];

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fdf2f8 0%,#fce7f3 50%,#fbcfe8 100%)', fontFamily: "'Prompt',sans-serif" }}>
            {/* Header */}
            <div style={{ background: 'white', borderBottom: '1.5px solid #fce7f3', boxShadow: '0 2px 12px rgba(236,72,153,.08)', padding: '0 24px' }}>
                <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="https://www.triamudomsouth.ac.th/images/theme/150x150.png" alt="โลโก้"
                            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fbcfe8' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#be185d' }}>AI-Powered Coding Coach</div>
                            <div style={{ fontSize: 10, color: '#f9a8d4' }}>🎭 โหมดทดลองใช้งาน</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                            👤 ผู้เยี่ยมชม
                        </span>
                        <a href="#/login" style={{
                            fontSize: 12, fontWeight: 700, color: 'white', textDecoration: 'none',
                            background: 'linear-gradient(135deg,#ec4899,#be185d)',
                            padding: '6px 14px', borderRadius: 20,
                        }}>
                            🔐 เข้าสู่ระบบ
                        </a>
                    </div>
                </div>
            </div>

            {/* Hero */}
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>🎭</div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#be185d', margin: '0 0 8px' }}>
                        ทดลองเขียนโปรแกรมได้เลย!
                    </h1>
                    <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 480, margin: '0 auto 16px' }}>
                        เลือกโจทย์ตัวอย่าง 1 ใน 4 หน่วยการเรียน เขียนโค้ด C แล้วให้ AI ตรวจให้ — ไม่ต้องสมัครสมาชิก
                    </p>
                    <div style={{ display: 'inline-flex', gap: 16, background: 'white', borderRadius: 16, padding: '10px 20px', boxShadow: '0 2px 12px rgba(236,72,153,.1)' }}>
                        {['🤖 AI ตรวจโค้ดจริง', '⚡ ผลลัพธ์ทันที', '🆓 ไม่ต้องสมัคร'].map(f => (
                            <span key={f} style={{ fontSize: 12, color: '#be185d', fontWeight: 600 }}>{f}</span>
                        ))}
                    </div>
                </div>

                {/* Demo assignment cards */}
                {assignments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', background: 'white', borderRadius: 20, boxShadow: '0 4px 20px rgba(236,72,153,.08)' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
                        <p style={{ color: '#9ca3af', fontSize: 14 }}>ครูยังไม่ได้ตั้งค่าโจทย์ Demo</p>
                        <p style={{ color: '#d1d5db', fontSize: 12 }}>กรุณาติดต่อผู้ดูแลระบบ</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18, marginBottom: 40 }}>
                        {assignments.map((a, idx) => {
                            const c = UNIT_COLORS[idx % UNIT_COLORS.length];
                            return (
                                <div key={a.id}
                                    onClick={() => goToWorkspace(a)}
                                    style={{
                                        background: c.bg, border: `1.5px solid ${c.border}`,
                                        borderRadius: 20, padding: '22px 20px',
                                        cursor: 'pointer', transition: 'transform .2s, box-shadow .2s',
                                        boxShadow: '0 2px 12px rgba(0,0,0,.05)',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,.12)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.05)'; }}
                                >
                                    <div style={{ fontSize: 32, marginBottom: 10 }}>{a.icon || '💻'}</div>
                                    <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: c.tagText, background: c.tag, padding: '2px 8px', borderRadius: 10, marginBottom: 8 }}>
                                        {a.unitName || `หน่วยที่ ${idx + 1}`}
                                    </div>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: '0 0 6px' }}>{a.title}</h3>
                                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
                                        {a.description || 'ฝึกเขียนโค้ด C พื้นฐาน'}
                                    </p>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '9px', borderRadius: 12, fontWeight: 700, fontSize: 13,
                                        background: c.icon, color: 'white', gap: 6,
                                    }}>
                                        <span>▶</span>
                                        <span>เริ่มทำโจทย์นี้</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* CTA footer */}
                <div style={{ textAlign: 'center', paddingBottom: 48 }}>
                    <div style={{ background: 'white', borderRadius: 20, padding: '24px 32px', display: 'inline-block', boxShadow: '0 4px 20px rgba(236,72,153,.1)' }}>
                        <p style={{ fontSize: 14, color: '#374151', margin: '0 0 12px', fontWeight: 600 }}>
                            ชอบระบบนี้ไหม? สมัครสมาชิกฟรีเพื่อ:
                        </p>
                        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                            {['📊 บันทึกผลและ XP', '🏆 อันดับแข่งขัน', '🎮 เกม & ความสำเร็จ', '🤖 AI Coach'].map(f => (
                                <span key={f} style={{ fontSize: 12, color: '#6b7280' }}>{f}</span>
                            ))}
                        </div>
                        <a href="#/register" style={{
                            display: 'inline-block', padding: '11px 32px', borderRadius: 14,
                            background: 'linear-gradient(135deg,#ec4899,#be185d)', color: 'white',
                            fontWeight: 700, fontSize: 14, textDecoration: 'none',
                        }}>
                            ✨ สมัครสมาชิกฟรี
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

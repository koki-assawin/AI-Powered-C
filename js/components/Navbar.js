// js/components/Navbar.js — K-Minimal Pink Theme

const PLATFORM_SHORT = 'AI Coding Platform';
const SCHOOL_LOGO = 'https://www.triamudomsouth.ac.th/images/theme/150x150.png';

const Navbar = ({ title, subtitle }) => {
    const { user, userDoc, role, logout } = useAuth();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [userDropOpen, setUserDropOpen] = React.useState(false);
    const [playerStats, setPlayerStats] = React.useState(null);

    // Fetch playerStats for students to show rank/XP in navbar
    React.useEffect(() => {
        if (role !== 'student' || !user?.uid) return;
        let unsub = null;
        try {
            unsub = db.collection('playerStats').doc(user.uid)
                .onSnapshot(snap => {
                    if (snap.exists) setPlayerStats(snap.data());
                }, () => {});
        } catch (_) {}
        return () => unsub && unsub();
    }, [role, user?.uid]);

    const navLinks = {
        student: [
            { hash: '#/student/dashboard',     label: 'แดชบอร์ด',   icon: '🏠' },
            { hash: '#/student/courses',        label: 'รายวิชา',     icon: '📚' },
            { hash: '#/student/practice',       label: 'ฝึกเอง',      icon: '🎯' },
            { hash: '#/student/gradebook',      label: 'คะแนน',       icon: '📊' },
            { hash: '#/student/history',        label: 'ประวัติ',      icon: '📋' },
            { hash: '#/student/leaderboard',    label: 'อันดับ',       icon: '🏆' },
            { hash: '#/student/achievements',   label: 'ความสำเร็จ',   icon: '🏅' },
            { hash: '#/student/games',          label: 'เกม',          icon: '🎮' },
            { hash: '#/student/profile',        label: 'โปรไฟล์',     icon: '👤' },
        ],
        teacher: [
            { hash: '#/teacher/dashboard', label: 'แดชบอร์ด',      icon: '🏠' },
            { hash: '#/teacher/courses',   label: 'จัดการรายวิชา',  icon: '📚' },
            { hash: '#/teacher/students',  label: 'จัดการนักเรียน', icon: '👥' },
            { hash: '#/teacher/analytics', label: 'วิเคราะห์นักเรียน', icon: '📊' },
        ],
        admin: [
            { hash: '#/admin/dashboard', label: 'แดชบอร์ด',       icon: '🏠' },
            { hash: '#/admin/users',     label: 'จัดการผู้ใช้',    icon: '👥' },
            { hash: '#/admin/settings',  label: 'ตั้งค่าระบบ',     icon: '⚙️' },
        ],
    };

    const links = navLinks[role] || [];
    const currentHash = window.location.hash;

    const roleMeta = {
        student: { label: 'นักเรียน',     cls: 'k-badge-student' },
        teacher: { label: 'ครูผู้สอน',    cls: 'k-badge-teacher' },
        admin:   { label: 'ผู้ดูแลระบบ',  cls: 'k-badge-admin'   },
    };

    const closeAll = () => { setMenuOpen(false); setUserDropOpen(false); };

    return (
        <header style={{
            background: 'white',
            borderBottom: '1.5px solid #fce7f3',
            boxShadow: '0 2px 20px rgba(236,72,153,.07)',
            position: 'sticky', top: 0, zIndex: 50,
            fontFamily: "'Prompt', sans-serif",
        }}>
            <div className="max-w-7xl mx-auto px-4">
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:'64px' }}>

                    {/* ── Logo + Brand ── */}
                    <a href={role ? `#/${role}/dashboard` : '#/login'}
                        onClick={closeAll}
                        style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
                        <img src={SCHOOL_LOGO} alt="โลโก้"
                            style={{ width:'38px', height:'38px', borderRadius:'50%',
                                     objectFit:'cover', border:'2px solid #fbcfe8',
                                     boxShadow:'0 2px 8px rgba(236,72,153,.2)' }} />
                        <div style={{ lineHeight:'1.2' }}>
                            <div style={{ fontWeight:700, fontSize:'14px', color:'#be185d', whiteSpace:'nowrap' }}>
                                {title || PLATFORM_SHORT}
                            </div>
                            {subtitle
                                ? <div style={{ fontSize:'11px', color:'#f472b6' }}>{subtitle}</div>
                                : <div style={{ fontSize:'10px', color:'#f9a8d4' }}>ระบบฝึกทักษะการเขียนโปรแกรม AI</div>
                            }
                        </div>
                    </a>

                    {/* ── Desktop nav links ── */}
                    <nav style={{ display:'flex', gap:'4px', alignItems:'center' }} className="hidden md:flex">
                        {links.map(link => {
                            const active = currentHash.startsWith(link.hash);
                            return (
                                <a key={link.hash} href={link.hash} onClick={closeAll}
                                    style={{
                                        padding:'7px 14px', borderRadius:'20px', fontSize:'13px',
                                        fontWeight: active ? 600 : 400,
                                        background: active ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'transparent',
                                        color: active ? '#fff' : '#9d174d',
                                        textDecoration:'none',
                                        transition:'all .2s',
                                        border: active ? 'none' : '1px solid transparent',
                                    }}
                                    onMouseEnter={e => { if(!active){ e.currentTarget.style.background='#fdf2f8'; e.currentTarget.style.borderColor='#fce7f3'; }}}
                                    onMouseLeave={e => { if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; }}}
                                >
                                    {link.icon} {link.label}
                                </a>
                            );
                        })}
                    </nav>

                    {/* ── Right: XP mini + role badge + user avatar ── */}
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>

                        {/* Student XP mini-indicator */}
                        {role === 'student' && playerStats && typeof getRankFromXP === 'function' && (() => {
                            const tier = getRankFromXP(playerStats.xp || 0);
                            return (
                                <a href="#/student/leaderboard"
                                    className="hidden sm:flex"
                                    style={{
                                        display:'flex', alignItems:'center', gap:6,
                                        background:'#0f172a', borderRadius:20,
                                        padding:'4px 10px', textDecoration:'none',
                                        border:`1px solid ${tier.color}55`,
                                    }}>
                                    <span style={{ fontSize:16 }}>{tier.icon}</span>
                                    <span style={{ fontSize:12, fontWeight:600, color: tier.color }}>
                                        {(playerStats.xp || 0).toLocaleString()} XP
                                    </span>
                                </a>
                            );
                        })()}

                        {userDoc && (
                            <span className={`hidden sm:inline ${roleMeta[role]?.cls || ''}`}
                                style={{ fontSize:'11px', fontWeight:600, padding:'4px 10px', borderRadius:'20px' }}>
                                {roleMeta[role]?.label}
                            </span>
                        )}

                        {/* Avatar + dropdown */}
                        <div style={{ position:'relative' }}>
                            <button
                                onClick={() => { setUserDropOpen(p => !p); setMenuOpen(false); }}
                                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 8px 4px 4px',
                                         borderRadius:'24px', border:'1.5px solid #fce7f3', background:'white',
                                         cursor:'pointer', transition:'box-shadow .2s' }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow='0 2px 12px rgba(236,72,153,.2)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
                            >
                                <div style={{
                                    width:'30px', height:'30px', borderRadius:'50%',
                                    background:'linear-gradient(135deg,#f472b6,#ec4899)',
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    color:'white', fontSize:'13px', fontWeight:700, flexShrink:0,
                                }}>
                                    {userDoc?.displayName?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <span className="hidden sm:block"
                                    style={{ fontSize:'13px', fontWeight:500, color:'#be185d',
                                             maxWidth:'100px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                    {userDoc?.displayName || user?.email}
                                </span>
                                <span style={{ color:'#f472b6', fontSize:'10px' }}>▼</span>
                            </button>

                            {userDropOpen && (
                                <div style={{
                                    position:'absolute', right:0, marginTop:'8px', width:'220px',
                                    background:'white', borderRadius:'16px', border:'1px solid #fce7f3',
                                    boxShadow:'0 8px 32px rgba(236,72,153,.15)', padding:'8px 0', zIndex:100,
                                }}>
                                    <div style={{ padding:'10px 16px 10px', borderBottom:'1px solid #fce7f3' }}>
                                        <div style={{ fontWeight:600, fontSize:'14px', color:'#4b5563',
                                                       overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                            {userDoc?.displayName}
                                        </div>
                                        <div style={{ fontSize:'11px', color:'#9ca3af',
                                                       overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                            {user?.email}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { closeAll(); logout(); }}
                                        style={{ width:'100%', textAlign:'left', padding:'10px 16px',
                                                 background:'none', border:'none', cursor:'pointer',
                                                 fontSize:'13px', color:'#ef4444', fontFamily:"'Prompt',sans-serif",
                                                 display:'flex', alignItems:'center', gap:'8px' }}
                                        onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
                                        onMouseLeave={e => e.currentTarget.style.background='none'}
                                    >
                                        🚪 ออกจากระบบ
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile hamburger */}
                        <button
                            className="md:hidden"
                            onClick={() => { setMenuOpen(p => !p); setUserDropOpen(false); }}
                            style={{ padding:'8px', borderRadius:'10px', background:'none', border:'none', cursor:'pointer' }}
                        >
                            <div style={{ width:'20px', display:'flex', flexDirection:'column', gap:'4px' }}>
                                {[0,1,2].map(i => (
                                    <span key={i} style={{ display:'block', height:'2px', borderRadius:'2px',
                                                            background: menuOpen ? '#ec4899' : '#f472b6',
                                                            transition:'all .2s',
                                                            transform: menuOpen && i===0 ? 'rotate(45deg) translate(4px,4px)'
                                                                      : menuOpen && i===2 ? 'rotate(-45deg) translate(4px,-4px)'
                                                                      : menuOpen && i===1 ? 'scaleX(0)' : 'none' }} />
                                ))}
                            </div>
                        </button>
                    </div>
                </div>

                {/* ── Mobile nav ── */}
                {menuOpen && (
                    <div style={{ borderTop:'1px solid #fce7f3', paddingBottom:'12px', paddingTop:'8px' }}
                         className="md:hidden">
                        {links.map(link => {
                            const active = currentHash.startsWith(link.hash);
                            return (
                                <a key={link.hash} href={link.hash} onClick={closeAll}
                                    style={{
                                        display:'block', padding:'10px 16px', borderRadius:'12px',
                                        margin:'3px 0', fontSize:'14px', textDecoration:'none',
                                        fontWeight: active ? 600 : 400,
                                        background: active ? '#fdf2f8' : 'transparent',
                                        color: active ? '#ec4899' : '#6b7280',
                                        borderLeft: active ? '3px solid #ec4899' : '3px solid transparent',
                                    }}
                                >
                                    {link.icon} {link.label}
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </header>
    );
};

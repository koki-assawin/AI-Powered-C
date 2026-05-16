// js/pages/admin/UserManager.js - Manage users, roles, and password reset (v5.1)

// Session-cached Google OAuth2 access token (with cloud-platform scope)
// Used to call the Firebase Identity Platform Admin REST API
let _adminToken = null;
let _adminTokenExpiry = 0;

const getAdminToken = async () => {
    if (_adminToken && Date.now() < _adminTokenExpiry) return _adminToken;

    // Open a secondary Firebase app instance so current admin session is undisturbed
    const cfg = firebase.app().options;
    const tmpName = 'adminPwTool_' + Date.now();
    const tmpApp = firebase.initializeApp(cfg, tmpName);

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        // Request the cloud-platform scope so we can call Identity Platform Admin API
        provider.addScope('https://www.googleapis.com/auth/cloud-platform');
        // Force account-picker so admin can confirm which Google account to use
        provider.setCustomParameters({ prompt: 'select_account' });

        const result = await tmpApp.auth().signInWithPopup(provider);
        _adminToken = result.credential.accessToken;
        _adminTokenExpiry = Date.now() + 55 * 60 * 1000; // cache ~55 min (token lives 1 hr)
        return _adminToken;
    } finally {
        await tmpApp.delete();
    }
};

// Set-password modal component
const SetPasswordModal = ({ user, onClose, onSuccess }) => {
    const [pw, setPw]   = React.useState('');
    const [pw2, setPw2] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [step, setStep]     = React.useState('form'); // 'form' | 'confirm_google' | 'done'
    const [err, setErr]       = React.useState('');
    const [show, setShow]     = React.useState(false);

    const validate = () => {
        if (pw.length < 6) { setErr('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return false; }
        if (pw !== pw2)    { setErr('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return false; }
        return true;
    };

    const handleSave = async () => {
        setErr('');
        if (!validate()) return;
        setSaving(true);
        setStep('confirm_google');
        try {
            // Step 1: get Google OAuth2 token with cloud-platform scope
            const token = await getAdminToken();

            // Step 2: call Firebase Identity Platform Admin REST API
            const projectId = firebase.app().options.projectId;
            const res = await fetch(
                `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ localId: user.id, password: pw }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                // Token might be stale — clear cache so next attempt re-authenticates
                if (res.status === 401 || res.status === 403) _adminToken = null;
                throw new Error(data.error?.message || `HTTP ${res.status}`);
            }

            onSuccess(`✅ กำหนดรหัสผ่านให้ "${user.displayName}" สำเร็จแล้ว`);
            onClose();
        } catch (e) {
            setStep('form');
            if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
                setErr('ยกเลิกการยืนยันตัวตน');
            } else if (e.code === 'auth/popup-blocked') {
                setErr('Popup ถูกบล็อก — กรุณาอนุญาต popup สำหรับเว็บไซต์นี้แล้วลองใหม่');
            } else {
                setErr(e.message || 'เกิดข้อผิดพลาด');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }} onClick={e => { if (!saving && e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxWidth: '100%' }}>

                {/* Header */}
                <h3 style={{ margin: '0 0 2px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
                    🔐 กำหนดรหัสผ่านใหม่
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
                    {user.displayName} · <span style={{ fontFamily: 'monospace' }}>{user.email}</span>
                </p>

                {/* Google auth info banner */}
                {step === 'confirm_google' ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>กำลังขอยืนยันตัวตน...</div>
                        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                            หน้าต่าง Google Sign-In จะปรากฏขึ้น<br />
                            กรุณาเลือกบัญชี <strong style={{color:'#1a73e8'}}>koki.assawin@gmail.com</strong>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Password field */}
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 4 }}>รหัสผ่านใหม่</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={show ? 'text' : 'password'}
                                    value={pw}
                                    onChange={e => { setPw(e.target.value); setErr(''); }}
                                    placeholder="อย่างน้อย 6 ตัวอักษร"
                                    autoFocus
                                    style={{ width: '100%', padding: '9px 38px 9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                                />
                                <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8' }}>
                                    {show ? '🙈' : '👁'}
                                </button>
                            </div>
                        </div>

                        {/* Confirm password field */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'block', marginBottom: 4 }}>ยืนยันรหัสผ่าน</label>
                            <input
                                type={show ? 'text' : 'password'}
                                value={pw2}
                                onChange={e => { setPw2(e.target.value); setErr(''); }}
                                onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                placeholder="กรอกรหัสผ่านอีกครั้ง"
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Quick suggestions */}
                        <div style={{ marginBottom: 14 }}>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>รหัสผ่านตัวอย่าง:</p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {['student1234', 'triamudom01', 'coding2567'].map(p => (
                                    <button key={p} onClick={() => { setPw(p); setPw2(p); setErr(''); }}
                                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#F1F5F9', border: '1px solid #E2E8F0', cursor: 'pointer', color: '#475569', fontFamily: 'monospace' }}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* How it works note */}
                        <div style={{ marginBottom: 14, padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 11, color: '#166534' }}>
                            ℹ️ ระบบจะเปิด Google Sign-In popup — ให้เลือกบัญชี <strong>koki.assawin@gmail.com</strong> (เจ้าของโปรเจกต์ Firebase)
                        </div>

                        {/* Error */}
                        {err && (
                            <div style={{ marginBottom: 14, padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#DC2626' }}>
                                ❌ {err}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={onClose} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748b', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                                ยกเลิก
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                style={{ flex: 2, padding: '9px 0', borderRadius: 8, border: 'none', background: '#EC407A', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
                                🔐 บันทึกรหัสผ่าน
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const UserManager = () => {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState('all');
    const [search, setSearch] = React.useState('');
    const [saving, setSaving] = React.useState(null);
    const [resetting, setResetting] = React.useState(null);
    const [msg, setMsg] = React.useState('');
    const [setPwUser, setSetPwUser] = React.useState(null);
    const [expandedUser, setExpandedUser] = React.useState(null);

    const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

    React.useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const updateRole = async (uid, newRole) => {
        setSaving(uid + '_role');
        try {
            const updates = { role: newRole };
            if (newRole === 'teacher') updates.approvedByAdmin = true;
            await db.collection('users').doc(uid).update(updates);
            setUsers(us => us.map(u => u.id === uid ? { ...u, ...updates } : u));
            showMsg('✅ อัปเดตบทบาทสำเร็จ!');
        } catch (err) {
            showMsg('❌ เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSaving(null);
        }
    };

    const approveTeacher = async (uid) => {
        setSaving(uid + '_approve');
        try {
            await db.collection('users').doc(uid).update({ approvedByAdmin: true });
            setUsers(us => us.map(u => u.id === uid ? { ...u, approvedByAdmin: true } : u));
            showMsg('✅ อนุมัติครูสำเร็จ!');
        } catch (err) {
            showMsg('❌ ' + err.message);
        } finally {
            setSaving(null);
        }
    };

    const resetPassword = async (u) => {
        if (!u.email) { showMsg('❌ ไม่พบอีเมลของผู้ใช้นี้'); return; }
        if (!confirm(`ส่งอีเมล Reset รหัสผ่านไปยัง "${u.email}"?`)) return;
        setResetting(u.id);
        try {
            await auth.sendPasswordResetEmail(u.email);
            showMsg(`✅ ส่งอีเมล Reset รหัสผ่านไปยัง ${u.email} แล้ว!`);
        } catch (err) {
            const msgs = {
                'auth/user-not-found': '❌ ไม่พบบัญชีอีเมลนี้ใน Firebase Auth',
                'auth/invalid-email':  '❌ อีเมลไม่ถูกต้อง',
                'auth/too-many-requests': '❌ ส่งอีเมล Reset บ่อยเกินไป กรุณารอสักครู่',
            };
            showMsg(msgs[err.code] || '❌ ' + err.message);
        } finally {
            setResetting(null);
        }
    };

    const deleteUser = async (uid) => {
        if (!confirm('ยืนยันการลบผู้ใช้นี้? (จะลบเฉพาะข้อมูลใน Firestore เท่านั้น)')) return;
        await db.collection('users').doc(uid).delete();
        setUsers(us => us.filter(u => u.id !== uid));
        showMsg('✅ ลบผู้ใช้สำเร็จ');
    };

    const roleBadge = {
        student: { bg: '#EFF6FF', color: '#1D4ED8', label: 'นักเรียน' },
        teacher: { bg: '#F0FDF4', color: '#15803D', label: 'ครู' },
        admin:   { bg: '#FAF5FF', color: '#7E22CE', label: 'Admin' },
    };

    const filtered = users.filter(u => {
        if (filter !== 'all' && u.role !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (u.displayName?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q) ||
                    u.studentCode?.includes(q));
        }
        return true;
    });

    const pendingTeachers = users.filter(u => u.role === 'teacher' && !u.approvedByAdmin);

    return (
        <div className="min-h-screen bg-gray-50">
            {setPwUser && (
                <SetPasswordModal
                    user={setPwUser}
                    onClose={() => setSetPwUser(null)}
                    onSuccess={m => { showMsg(m); setSetPwUser(null); }}
                />
            )}
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="จัดการผู้ใช้" />
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">👥 จัดการผู้ใช้</h2>
                    <div className="flex items-center gap-3">
                        {pendingTeachers.length > 0 && (
                            <span className="text-xs px-3 py-1.5 rounded-full font-bold animate-pulse"
                                style={{ background: '#FEF3C7', color: '#92400E' }}>
                                ⏳ รออนุมัติครู {pendingTeachers.length} คน
                            </span>
                        )}
                        {msg && <span className={`text-sm font-medium ${msg.includes('❌') ? 'text-red-600' : 'text-green-600'}`}>{msg}</span>}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'นักเรียน', count: users.filter(u => u.role === 'student').length, color: '#1D4ED8', bg: '#EFF6FF' },
                        { label: 'ครูผู้สอน', count: users.filter(u => u.role === 'teacher').length, color: '#15803D', bg: '#F0FDF4' },
                        { label: 'ผู้ดูแล',  count: users.filter(u => u.role === 'admin').length, color: '#7E22CE', bg: '#FAF5FF' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
                            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filter & Search */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหาชื่อ, อีเมล หรือเลขประจำตัว..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400" />
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { key: 'all', label: 'ทั้งหมด' },
                            { key: 'student', label: '🎓 นักเรียน' },
                            { key: 'teacher', label: '👨‍🏫 ครู' },
                            { key: 'admin',   label: '⚙️ Admin' },
                        ].map(r => (
                            <button key={r.key} onClick={() => setFilter(r.key)}
                                className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                style={filter === r.key
                                    ? { background: '#EC407A', color: '#fff' }
                                    : { background: '#F5F5F5', color: '#6b7280' }}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? <Spinner /> : (
                    <div className="space-y-2">
                        {filtered.length === 0 && (
                            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
                                ไม่พบผู้ใช้
                            </div>
                        )}
                        {filtered.map(u => {
                            const badge = roleBadge[u.role] || roleBadge.student;
                            const isExpanded = expandedUser === u.id;
                            return (
                                <div key={u.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                    {/* Main row */}
                                    <div className="flex items-center gap-4 p-4">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                                            style={{ background: 'linear-gradient(135deg,#f472b6,#ec4899)' }}>
                                            {u.displayName?.[0]?.toUpperCase() || 'U'}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-gray-800">{u.displayName}</p>
                                                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                    style={{ background: badge.bg, color: badge.color }}>
                                                    {badge.label}
                                                </span>
                                                {u.role === 'teacher' && !u.approvedByAdmin && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-bold animate-pulse">
                                                        ⏳ รออนุมัติ
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                            {u.role === 'student' && (u.grade || u.studentCode) && (
                                                <p className="text-xs text-gray-400">
                                                    {[u.studentCode && `#${u.studentCode}`, u.grade, u.room && `ห้อง ${u.room}`, u.number && `เลขที่ ${u.number}`].filter(Boolean).join(' · ')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                            {u.role === 'teacher' && !u.approvedByAdmin && (
                                                <button onClick={() => approveTeacher(u.id)}
                                                    disabled={saving === u.id + '_approve'}
                                                    className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-50"
                                                    style={{ background: '#FEF3C7', color: '#92400E' }}>
                                                    {saving === u.id + '_approve' ? '⏳' : '✓ อนุมัติ'}
                                                </button>
                                            )}

                                            <button onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                                className="text-xs px-3 py-1.5 rounded-lg"
                                                style={{ background: '#F5F5F5', color: '#6b7280' }}>
                                                {isExpanded ? '▲ ย่อ' : '▼ จัดการ'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded panel */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 flex flex-wrap gap-3 items-center">
                                            {/* Change role */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 font-medium">เปลี่ยนบทบาท:</span>
                                                <select value={u.role}
                                                    onChange={e => updateRole(u.id, e.target.value)}
                                                    disabled={saving === u.id + '_role'}
                                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-400 disabled:opacity-50 bg-white">
                                                    <option value="student">🎓 นักเรียน</option>
                                                    <option value="teacher">👨‍🏫 ครู</option>
                                                    <option value="admin">⚙️ Admin</option>
                                                </select>
                                            </div>

                                            {/* Set password directly */}
                                            <button onClick={() => setSetPwUser(u)}
                                                className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
                                                style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                                                🔐 กำหนดรหัสผ่าน
                                            </button>

                                            {/* Reset password via email */}
                                            <button onClick={() => resetPassword(u)}
                                                disabled={resetting === u.id}
                                                className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
                                                style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                                                {resetting === u.id ? '⏳ กำลังส่ง...' : '📧 ส่งเมล Reset'}
                                            </button>

                                            {/* Delete */}
                                            <button onClick={() => deleteUser(u.id)}
                                                className="text-xs px-3 py-1.5 rounded-lg font-medium ml-auto"
                                                style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                                                🗑 ลบผู้ใช้
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-5 p-4 rounded-xl text-xs" style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
                    ⚠️ การลบผู้ใช้จะลบเฉพาะข้อมูลใน Firestore · "🔐 กำหนดรหัสผ่าน" ตั้งรหัสผ่านใหม่ให้นักเรียนได้ทันที · "📧 ส่งเมล Reset" ส่งลิงก์รีเซทไปยังอีเมลนักเรียน · หากต้องการลบบัญชีถาวรให้ทำใน Firebase Console
                </div>
            </main>
        </div>
    );
};

// js/pages/admin/UserManager.js - Manage users, roles, and password reset (v4.6)

const UserManager = () => {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState('all');
    const [search, setSearch] = React.useState('');
    const [saving, setSaving] = React.useState(null);
    const [resetting, setResetting] = React.useState(null);
    const [msg, setMsg] = React.useState('');
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
            <Navbar title="AI Coding Platform" subtitle="จัดการผู้ใช้" />
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

                                            {/* Reset password */}
                                            <button onClick={() => resetPassword(u)}
                                                disabled={resetting === u.id}
                                                className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
                                                style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                                                {resetting === u.id ? '⏳ กำลังส่ง...' : '🔑 Reset รหัสผ่าน'}
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
                    ⚠️ การลบผู้ใช้จะลบเฉพาะข้อมูลใน Firestore · "Reset รหัสผ่าน" จะส่งอีเมลให้ผู้ใช้ตั้งรหัสผ่านใหม่ผ่าน Firebase Auth · หากต้องการลบบัญชีถาวรให้ทำใน Firebase Console
                </div>
            </main>
        </div>
    );
};

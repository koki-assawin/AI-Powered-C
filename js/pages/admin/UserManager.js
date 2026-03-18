// js/pages/admin/UserManager.js - Manage users and roles

const UserManager = () => {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState('all');
    const [search, setSearch] = React.useState('');
    const [saving, setSaving] = React.useState(null);
    const [msg, setMsg] = React.useState('');

    React.useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoading(true);
        const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    const updateRole = async (uid, newRole) => {
        setSaving(uid);
        try {
            const updates = { role: newRole };
            if (newRole === 'teacher') updates.approvedByAdmin = true;
            await db.collection('users').doc(uid).update(updates);
            setUsers(us => us.map(u => u.id === uid ? { ...u, ...updates } : u));
            setMsg('อัปเดตบทบาทสำเร็จ!');
            setTimeout(() => setMsg(''), 2000);
        } catch (err) {
            setMsg('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setSaving(null);
        }
    };

    const approveTeacher = async (uid) => {
        setSaving(uid);
        await db.collection('users').doc(uid).update({ approvedByAdmin: true });
        setUsers(us => us.map(u => u.id === uid ? { ...u, approvedByAdmin: true } : u));
        setSaving(null);
        setMsg('อนุมัติครูสำเร็จ!');
        setTimeout(() => setMsg(''), 2000);
    };

    const deleteUser = async (uid) => {
        if (!confirm('ยืนยันการลบผู้ใช้นี้? (จะลบเฉพาะข้อมูลใน Firestore เท่านั้น)')) return;
        await db.collection('users').doc(uid).delete();
        setUsers(us => us.filter(u => u.id !== uid));
    };

    const roleBadge = {
        student: 'bg-blue-100 text-blue-700',
        teacher: 'bg-green-100 text-green-700',
        admin: 'bg-purple-100 text-purple-700',
    };

    const filtered = users.filter(u => {
        if (filter !== 'all' && u.role !== filter) return false;
        if (search && !u.displayName?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding LMS" subtitle="จัดการผู้ใช้" />
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">👥 จัดการผู้ใช้</h2>
                    {msg && <span className={`text-sm font-medium ${msg.includes('ข้อผิด') ? 'text-red-600' : 'text-green-600'}`}>{msg}</span>}
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหาชื่อหรืออีเมล..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex space-x-2">
                        {['all', 'student', 'teacher', 'admin'].map(r => (
                            <button key={r} onClick={() => setFilter(r)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                    ${filter === r ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {r === 'all' ? 'ทั้งหมด' : r}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? <Spinner /> : (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-gray-500 font-medium">ผู้ใช้</th>
                                    <th className="text-center py-3 px-4 text-gray-500 font-medium">บทบาท</th>
                                    <th className="text-center py-3 px-4 text-gray-500 font-medium">สถานะ</th>
                                    <th className="text-center py-3 px-4 text-gray-500 font-medium">เปลี่ยนบทบาท</th>
                                    <th className="text-center py-3 px-4 text-gray-500 font-medium">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                    {u.displayName?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{u.displayName}</p>
                                                    <p className="text-xs text-gray-400 truncate max-w-48">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleBadge[u.role] || 'bg-gray-100 text-gray-600'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            {u.role === 'teacher' && !u.approvedByAdmin ? (
                                                <button onClick={() => approveTeacher(u.id)}
                                                    className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs hover:bg-yellow-200 font-medium">
                                                    ⏳ รออนุมัติ → คลิกอนุมัติ
                                                </button>
                                            ) : (
                                                <span className="text-xs text-green-600 font-medium">✓ ใช้งานได้</span>
                                            )}
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <select
                                                value={u.role}
                                                onChange={e => updateRole(u.id, e.target.value)}
                                                disabled={saving === u.id}
                                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                                            >
                                                <option value="student">student</option>
                                                <option value="teacher">teacher</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <button onClick={() => deleteUser(u.id)}
                                                className="text-xs text-red-400 hover:text-red-600 hover:underline">ลบ</button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan="5" className="text-center py-8 text-gray-400">ไม่พบผู้ใช้</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                    ⚠️ หมายเหตุ: การลบผู้ใช้จะลบเฉพาะข้อมูลใน Firestore เท่านั้น หากต้องการลบบัญชี Firebase Auth ด้วย กรุณาทำใน Firebase Console &gt; Authentication
                </div>
            </main>
        </div>
    );
};

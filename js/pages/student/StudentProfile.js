// js/pages/student/StudentProfile.js - Edit profile & change password (v4.7)

const GRADE_OPTIONS_P = ['ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];

// ── Self Radar Chart section ──────────────────────────────────────────────────
const _SelfRadarSection = ({ uid }) => {
    const [subs,            setSubs]           = React.useState([]);
    const [totalAssign,     setTotalAssign]    = React.useState(0);
    const [loading,         setLoading]        = React.useState(true);
    const [mode,            setMode]           = React.useState('best'); // 'best' | 'latest'
    const canvasRef = React.useRef(null);
    const chartRef  = React.useRef(null);

    React.useEffect(() => {
        if (!uid) return;
        let alive = true;
        Promise.all([
            db.collection('submissions').where('studentId', '==', uid).get(),
            db.collection('assignments').get(),
        ]).then(([subSnap, assignSnap]) => {
            if (!alive) return;
            setSubs(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setTotalAssign(assignSnap.size);
            setLoading(false);
        }).catch(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [uid]);

    const metrics = React.useMemo(() => {
        if (!subs.length) return [0, 0, 0, 0, 50];
        const byId = {};
        subs.forEach(s => {
            const id = s.assignmentId;
            if (!byId[id]) byId[id] = [];
            byId[id].push(s);
        });
        const ids = Object.keys(byId);

        const scores = ids.map(id => {
            const arr = [...byId[id]].sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0));
            return mode === 'best' ? Math.max(...arr.map(s => s.score || 0)) : (arr[arr.length - 1]?.score || 0);
        });

        const avgScore  = scores.reduce((a, b) => a + b, 0) / scores.length;
        const passRate  = (scores.filter(s => s >= 60).length / scores.length) * 100;
        const coverage  = Math.min(100, totalAssign > 0 ? (ids.length / totalAssign) * 100 : 0);
        const avgAttempts = ids.reduce((sum, id) => sum + byId[id].length, 0) / ids.length;
        const effort    = Math.min(100, (avgAttempts / 5) * 100);
        const progress  = 50 + ids.reduce((sum, id) => {
            const arr = [...byId[id]].sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0));
            return sum + ((arr[arr.length - 1]?.score || 0) - (arr[0]?.score || 0));
        }, 0) / ids.length;

        return [avgScore, passRate, coverage, effort, Math.min(100, Math.max(0, progress))];
    }, [subs, totalAssign, mode]);

    React.useEffect(() => {
        if (!canvasRef.current || loading) return;
        if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
        chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['คะแนนเฉลี่ย', 'อัตราผ่าน', 'ครอบคลุม', 'ความพยายาม', 'พัฒนาการ'],
                datasets: [{
                    label: 'ของคุณ',
                    data: metrics,
                    backgroundColor: 'rgba(236,72,153,0.15)',
                    borderColor: '#ec4899',
                    borderWidth: 2,
                    pointBackgroundColor: '#ec4899',
                    pointRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, font: { size: 10 } }, pointLabels: { font: { size: 12, family: 'Prompt,sans-serif' } } } },
                plugins: { legend: { display: false } },
            },
        });
        return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    }, [metrics, loading]);

    if (loading) return (
        <div className="bg-white rounded-2xl border p-6 mb-6 shadow-sm text-center text-gray-400 text-sm" style={{ borderColor: '#FFD1DC' }}>
            กำลังโหลดข้อมูล...
        </div>
    );
    if (!subs.length) return (
        <div className="bg-white rounded-2xl border p-6 mb-6 shadow-sm text-center text-gray-400 text-sm" style={{ borderColor: '#FFD1DC' }}>
            📊 ยังไม่มีข้อมูลส่งงาน — ส่งงานเพื่อดู Radar Chart ของคุณ
        </div>
    );

    const labels = ['คะแนนเฉลี่ย', 'อัตราผ่าน', 'ครอบคลุม', 'ความพยายาม', 'พัฒนาการ'];
    return (
        <div className="bg-white rounded-2xl border p-6 mb-6 shadow-sm" style={{ borderColor: '#FFD1DC' }}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-700">📊 โปรไฟล์ความสามารถ 5 มิติ</h3>
                <div className="flex gap-2">
                    {['best','latest'].map(m => (
                        <button key={m} onClick={() => setMode(m)}
                            className="text-xs px-3 py-1 rounded-full border font-medium transition-all"
                            style={{ background: mode === m ? '#ec4899' : 'white', color: mode === m ? 'white' : '#6b7280', borderColor: mode === m ? '#ec4899' : '#e5e7eb' }}>
                            {m === 'best' ? '🏆 คะแนนสูงสุด' : '🕐 ล่าสุด'}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ maxWidth: 320, margin: '0 auto' }}>
                <canvas ref={canvasRef} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
                {labels.map((l, i) => (
                    <div key={l} className="text-center p-2 rounded-xl" style={{ background: '#fff5f7' }}>
                        <p className="text-xs text-gray-500 mb-0.5">{l}</p>
                        <p className="font-bold text-sm" style={{ color: '#ec4899' }}>{Math.round(metrics[i])}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StudentProfile = () => {
    const { user, userDoc } = useAuth();
    const [playerStats, setPlayerStats] = React.useState(null);

    React.useEffect(() => {
        if (!user?.uid) return;
        const unsub = db.collection('playerStats').doc(user.uid)
            .onSnapshot(snap => { if (snap.exists) setPlayerStats(snap.data()); }, () => {});
        return () => unsub();
    }, [user?.uid]);

    // ── Profile form ──
    const [profileForm, setProfileForm] = React.useState({
        displayName: '', studentCode: '', grade: 'ม.4', room: '', number: '',
    });
    const [profileLoading, setProfileLoading] = React.useState(false);
    const [profileMsg, setProfileMsg] = React.useState('');

    // ── Password form ──
    const [pwForm, setPwForm] = React.useState({
        currentPassword: '', newPassword: '', confirmPassword: '',
    });
    const [pwLoading, setPwLoading] = React.useState(false);
    const [pwMsg, setPwMsg] = React.useState('');

    React.useEffect(() => {
        if (userDoc) {
            setProfileForm({
                displayName: userDoc.displayName || '',
                studentCode: userDoc.studentCode || '',
                grade:       userDoc.grade || 'ม.4',
                room:        userDoc.room || '',
                number:      userDoc.number || '',
            });
        }
    }, [userDoc]);

    const upProfile = (f) => (e) => setProfileForm(p => ({ ...p, [f]: e.target.value }));
    const upPw = (f) => (e) => setPwForm(p => ({ ...p, [f]: e.target.value }));

    const showProfileMsg = (m) => { setProfileMsg(m); setTimeout(() => setProfileMsg(''), 4000); };
    const showPwMsg = (m) => { setPwMsg(m); setTimeout(() => setPwMsg(''), 4000); };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!profileForm.displayName.trim()) { showProfileMsg('❌ กรุณากรอกชื่อ-นามสกุล'); return; }
        setProfileLoading(true);
        try {
            const updates = {
                displayName: profileForm.displayName.trim(),
                studentCode: profileForm.studentCode.trim(),
                grade:       profileForm.grade,
                room:        profileForm.room.trim(),
                number:      profileForm.number.trim(),
            };
            await db.collection('users').doc(user.uid).update(updates);
            // Also update Firebase Auth profile
            await user.updateProfile({ displayName: profileForm.displayName.trim() });
            showProfileMsg('✅ บันทึกข้อมูลสำเร็จ!');
        } catch (err) {
            showProfileMsg('❌ บันทึกไม่สำเร็จ: ' + err.message);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwForm.newPassword !== pwForm.confirmPassword) { showPwMsg('❌ รหัสผ่านใหม่ไม่ตรงกัน'); return; }
        if (pwForm.newPassword.length < 6) { showPwMsg('❌ รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
        setPwLoading(true);
        try {
            // Reauthenticate first
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                pwForm.currentPassword
            );
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(pwForm.newPassword);
            showPwMsg('✅ เปลี่ยนรหัสผ่านสำเร็จ!');
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            const msgs = {
                'auth/wrong-password':           '❌ รหัสผ่านปัจจุบันไม่ถูกต้อง',
                'auth/invalid-credential':       '❌ รหัสผ่านปัจจุบันไม่ถูกต้อง',
                'auth/requires-recent-login':    '❌ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน',
                'auth/weak-password':            '❌ รหัสผ่านใหม่ไม่ปลอดภัยพอ',
            };
            showPwMsg(msgs[err.code] || '❌ ' + err.message);
        } finally {
            setPwLoading(false);
        }
    };

    const labelSt = { display:'block', fontSize:'13px', fontWeight:500, color:'#6b7280', marginBottom:'5px' };
    const msgBox = (m) => m ? (
        <div className={`p-3 rounded-xl text-sm mb-4 ${m.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {m}
        </div>
    ) : null;

    return (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="ข้อมูลส่วนตัว" />
            <main className="max-w-2xl mx-auto px-4 py-8">

                <h2 className="text-2xl font-bold mb-6" style={{ color: '#AD1457' }}>👤 ข้อมูลส่วนตัว</h2>

                {/* ── Profile info card ── */}
                <div className="bg-white rounded-2xl border p-6 mb-6 shadow-sm" style={{ borderColor: '#FFD1DC' }}>
                    {/* Avatar row */}
                    <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid #fce7f3' }}>
                        <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-2xl shrink-0"
                            style={{ background: 'linear-gradient(135deg,#f472b6,#ec4899)' }}>
                            {userDoc?.displayName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-lg">{userDoc?.displayName}</p>
                            <p className="text-sm text-gray-400">{user?.email}</p>
                            {userDoc?.grade && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {userDoc.grade} · ห้อง {userDoc.room} · เลขที่ {userDoc.number}
                                    {userDoc.studentCode && ` · #${userDoc.studentCode}`}
                                </p>
                            )}
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-700 mb-4">✏️ แก้ไขข้อมูลส่วนตัว</h3>
                    {msgBox(profileMsg)}

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                            <label style={labelSt}>👤 ชื่อ-นามสกุล *</label>
                            <input type="text" value={profileForm.displayName} onChange={upProfile('displayName')}
                                required className="k-input" placeholder="ชื่อ นามสกุล" />
                        </div>

                        <div>
                            <label style={labelSt}>📧 อีเมล (ไม่สามารถแก้ไขได้)</label>
                            <input type="email" value={user?.email || ''} disabled
                                className="k-input" style={{ background: '#F5F5F5', color: '#9ca3af', cursor: 'not-allowed' }} />
                        </div>

                        <div>
                            <label style={labelSt}>🪪 เลขประจำตัวนักเรียน</label>
                            <input type="text" value={profileForm.studentCode} onChange={upProfile('studentCode')}
                                className="k-input" placeholder="เช่น 12345" inputMode="numeric" />
                        </div>

                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
                            <div>
                                <label style={labelSt}>📚 ระดับชั้น</label>
                                <select value={profileForm.grade} onChange={upProfile('grade')}
                                    className="k-input" style={{ paddingLeft:'8px' }}>
                                    {GRADE_OPTIONS_P.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelSt}>🚪 ห้อง</label>
                                <input type="text" value={profileForm.room} onChange={upProfile('room')}
                                    className="k-input" placeholder="เช่น 1" />
                            </div>
                            <div>
                                <label style={labelSt}>#️⃣ เลขที่</label>
                                <input type="text" value={profileForm.number} onChange={upProfile('number')}
                                    className="k-input" placeholder="เช่น 15" inputMode="numeric" />
                            </div>
                        </div>

                        <button type="submit" disabled={profileLoading} className="k-btn-pink w-full py-2.5 flex items-center justify-center gap-2">
                            {profileLoading ? <SpinIcon className="w-4 h-4" /> : null}
                            {profileLoading ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
                        </button>
                    </form>
                </div>

                {/* ── Game Stats card ── */}
                {typeof XPBar !== 'undefined' && (
                    <div className="rounded-2xl p-6 mb-6 shadow-sm" style={{
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        border: '1px solid #334155',
                    }}>
                        <h3 className="font-bold mb-4" style={{ color: '#f1f5f9' }}>🎮 สถิติการเล่นเกม</h3>
                        <XPBar stats={playerStats} />
                        {!playerStats && (
                            <p style={{ color: '#64748b', fontSize: 13, marginTop: 12 }}>
                                ยังไม่มีข้อมูล — ส่งงานเพื่อรับ XP แรกของคุณ!
                            </p>
                        )}
                    </div>
                )}

                {/* ── Radar Chart ── */}
                <_SelfRadarSection uid={user?.uid} />

                {/* ── Password change card ── */}
                <div className="bg-white rounded-2xl border p-6 shadow-sm" style={{ borderColor: '#FFD1DC' }}>
                    <h3 className="font-bold text-gray-700 mb-4">🔑 เปลี่ยนรหัสผ่าน</h3>
                    {msgBox(pwMsg)}

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label style={labelSt}>🔒 รหัสผ่านปัจจุบัน</label>
                            <input type="password" value={pwForm.currentPassword} onChange={upPw('currentPassword')}
                                required className="k-input" placeholder="••••••••" autoComplete="current-password" />
                        </div>
                        <div>
                            <label style={labelSt}>🔑 รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label>
                            <input type="password" value={pwForm.newPassword} onChange={upPw('newPassword')}
                                required className="k-input" placeholder="••••••••" autoComplete="new-password" />
                        </div>
                        <div>
                            <label style={labelSt}>🔑 ยืนยันรหัสผ่านใหม่</label>
                            <input type="password" value={pwForm.confirmPassword} onChange={upPw('confirmPassword')}
                                required className="k-input" placeholder="••••••••" autoComplete="new-password" />
                        </div>

                        <button type="submit" disabled={pwLoading}
                            className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#7B1FA2,#6A1B9A)' }}>
                            {pwLoading ? <SpinIcon className="w-4 h-4" /> : null}
                            {pwLoading ? 'กำลังเปลี่ยนรหัสผ่าน...' : '🔑 เปลี่ยนรหัสผ่าน'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

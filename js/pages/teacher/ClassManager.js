// js/pages/teacher/ClassManager.js — Multi-class management for gamification

const ClassManager = () => {
    const { user } = useAuth();
    const [classes, setClasses]           = React.useState([]);
    const [loading, setLoading]           = React.useState(true);
    const [view, setView]                 = React.useState('list'); // 'list'|'detail'|'create'
    const [selectedClass, setSelectedClass] = React.useState(null);
    const [classStudents, setClassStudents] = React.useState([]);
    const [allStudents, setAllStudents]   = React.useState([]);
    const [saving, setSaving]             = React.useState(false);
    const [toast, setToast]               = React.useState({ msg: '', ok: true });
    const [form, setForm]                 = React.useState({ name: '', year: '2568', grade: '', room: '', description: '' });
    const [bulkMin, setBulkMin]           = React.useState('');
    const [bulkMax, setBulkMax]           = React.useState('');
    const [searchQ, setSearchQ]           = React.useState('');

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast({ msg: '', ok: true }), 4000);
    };

    // ── Load classes ──────────────────────────────────────────────────────────
    const loadClasses = async () => {
        setLoading(true);
        try {
            const snap = await db.collection('classes').get();
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            setClasses(list);
        } catch (e) { showToast('โหลดข้อมูลไม่สำเร็จ', false); }
        setLoading(false);
    };

    const loadClassDetail = async (cls) => {
        setSelectedClass(cls);
        setView('detail');
        setSearchQ('');
        try {
            const [stuSnap, allSnap] = await Promise.all([
                db.collection('users').where('classId', '==', cls.id).get(),
                db.collection('users').where('role', '==', 'student').get(),
            ]);
            setClassStudents(
                stuSnap.docs.map(d => ({ uid: d.id, ...d.data() }))
                    .sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999))
            );
            setAllStudents(allSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
        } catch (e) { showToast('โหลดรายชื่อไม่สำเร็จ', false); }
    };

    React.useEffect(() => { loadClasses(); }, []);

    // ── Create class ──────────────────────────────────────────────────────────
    const createClass = async () => {
        if (!form.name.trim()) return showToast('กรุณาระบุชื่อชั้นเรียน', false);
        setSaving(true);
        try {
            await db.collection('classes').add({
                name: form.name.trim(),
                year: form.year || String(new Date().getFullYear() + 543),
                grade: form.grade,
                room: form.room,
                description: form.description,
                isActive: true,
                studentCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: user.uid,
            });
            showToast('สร้างชั้นเรียน "' + form.name + '" สำเร็จ ✅');
            setForm({ name: '', year: '2568', grade: '', room: '', description: '' });
            setView('list');
            await loadClasses();
        } catch (e) { showToast('เกิดข้อผิดพลาด: ' + e.message, false); }
        setSaving(false);
    };

    // ── Bulk assign by studentCode range ──────────────────────────────────────
    const bulkAssign = async () => {
        const min = Number(bulkMin), max = Number(bulkMax);
        if (!min || !max || min > max) return showToast('ระบุช่วงรหัสให้ถูกต้อง', false);
        setSaving(true);
        try {
            const snap = await db.collection('users').where('role', '==', 'student').get();
            const toAssign = snap.docs.filter(d => {
                const n = Number(d.data().studentCode) || Number(d.data().number);
                return n >= min && n <= max;
            });
            if (toAssign.length === 0) { showToast('ไม่พบนักเรียนในช่วงรหัสที่ระบุ', false); setSaving(false); return; }
            const batch = db.batch();
            toAssign.forEach(d => batch.update(d.ref, { classId: selectedClass.id }));
            await batch.commit();
            await db.collection('classes').doc(selectedClass.id).update({ studentCount: toAssign.length });
            showToast('กำหนด ' + toAssign.length + ' คน เข้าชั้นเรียนสำเร็จ ✅');
            await loadClassDetail({ ...selectedClass });
        } catch (e) { showToast('เกิดข้อผิดพลาด: ' + e.message, false); }
        setSaving(false);
    };

    // ── Individual assign/remove ──────────────────────────────────────────────
    const addStudent = async (s) => {
        if (classStudents.find(cs => cs.uid === s.uid)) return showToast('นักเรียนอยู่ในชั้นเรียนนี้แล้ว', false);
        try {
            await db.collection('users').doc(s.uid).update({ classId: selectedClass.id });
            setClassStudents(prev =>
                [...prev, { ...s }].sort((a, b) => (Number(a.number) || 999) - (Number(b.number) || 999))
            );
            showToast('เพิ่ม "' + s.displayName + '" เข้าชั้นเรียนแล้ว ✅');
        } catch (e) { showToast('เกิดข้อผิดพลาด', false); }
    };

    const removeStudent = async (uid, name) => {
        try {
            await db.collection('users').doc(uid).update({ classId: firebase.firestore.FieldValue.delete() });
            setClassStudents(prev => prev.filter(s => s.uid !== uid));
            showToast('ลบ "' + name + '" ออกจากชั้นเรียนแล้ว');
        } catch (e) { showToast('เกิดข้อผิดพลาด', false); }
    };

    // ── Refresh leaderboard for this class ────────────────────────────────────
    const refreshLeaderboard = async () => {
        if (!selectedClass) return;
        setSaving(true);
        try {
            if (typeof updateAllLeaderboards === 'function') {
                await updateAllLeaderboards(selectedClass.id);
                showToast('รีเฟรช Leaderboard สำเร็จ ✅');
            }
        } catch (e) { showToast('เกิดข้อผิดพลาด', false); }
        setSaving(false);
    };

    const toggleActive = async (cls, e) => {
        e.stopPropagation();
        try {
            await db.collection('classes').doc(cls.id).update({ isActive: !cls.isActive });
            setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, isActive: !c.isActive } : c));
            showToast((cls.isActive ? 'ปิดการใช้งาน' : 'เปิดใช้งาน') + ' "' + cls.name + '" แล้ว');
        } catch (e) { showToast('เกิดข้อผิดพลาด', false); }
    };

    // ── Search helpers ────────────────────────────────────────────────────────
    const notInClass = allStudents.filter(s => !classStudents.find(cs => cs.uid === s.uid));
    const searchResults = searchQ.length >= 2
        ? notInClass.filter(s =>
            (s.displayName || '').toLowerCase().includes(searchQ.toLowerCase()) ||
            String(s.studentCode || '').includes(searchQ) ||
            String(s.number || '').includes(searchQ)
          ).slice(0, 10)
        : [];

    const bg = '#0f172a', card = '#1e293b', border = '#334155', accent = '#f59e0b';
    const inp = {
        width: '100%', boxSizing: 'border-box', background: '#0f172a',
        border: '1.5px solid ' + border, borderRadius: 8, padding: '8px 12px',
        color: '#f1f5f9', fontFamily: "'Prompt', sans-serif", fontSize: 13, outline: 'none',
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: bg, color: '#f1f5f9', fontFamily: "'Prompt', sans-serif" }}>
            <Navbar title="จัดการชั้นเรียน" subtitle="Class Manager" />

            {/* Toast */}
            {toast.msg && (
                <div style={{
                    position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                    background: toast.ok ? '#064e3b' : '#7f1d1d', color: '#fff', borderRadius: 12,
                    padding: '10px 24px', zIndex: 9999, fontSize: 14, fontWeight: 600,
                    boxShadow: '0 4px 20px rgba(0,0,0,.4)', pointerEvents: 'none',
                }}>{toast.msg}</div>
            )}

            <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px' }}>

                {/* Back button (detail/create only) */}
                {view !== 'list' && (
                    <button onClick={() => { setView('list'); setSelectedClass(null); }} style={{
                        background: 'none', border: '1px solid ' + border, color: '#94a3b8',
                        borderRadius: 8, padding: '6px 14px', cursor: 'pointer', marginBottom: 16,
                        fontFamily: "'Prompt', sans-serif", fontSize: 13,
                    }}>← กลับ</button>
                )}

                {/* ══════════════════ LIST VIEW ══════════════════ */}
                {view === 'list' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🏫 จัดการชั้นเรียน</h1>
                                <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
                                    สร้าง class สำหรับ Leaderboard แยกตามกลุ่มนักเรียน / ภาคเรียน / ปีการศึกษา
                                </p>
                            </div>
                            <button onClick={() => setView('create')} style={{
                                background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
                                border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
                                fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: 13, flexShrink: 0,
                            }}>+ สร้าง Class</button>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>กำลังโหลด...</div>
                        ) : classes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60, background: card, borderRadius: 16, border: '1px solid ' + border }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
                                <p style={{ color: '#64748b', marginBottom: 16 }}>ยังไม่มีชั้นเรียน</p>
                                <button onClick={() => setView('create')} style={{
                                    background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
                                    border: 'none', borderRadius: 10, padding: '10px 24px', cursor: 'pointer',
                                    fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: 14,
                                }}>+ สร้างชั้นเรียนแรก</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {classes.map(cls => (
                                    <div key={cls.id}
                                        onClick={() => loadClassDetail(cls)}
                                        style={{
                                            background: card, border: '1px solid ' + border, borderRadius: 14,
                                            padding: '16px 20px', cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', gap: 16, transition: 'border-color .2s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = accent}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = border}
                                    >
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                            background: cls.isActive ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#374151',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                                        }}>🏫</div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{cls.name}</div>
                                            <div style={{ fontSize: 12, color: '#64748b' }}>
                                                ปีการศึกษา {cls.year || '-'}
                                                {cls.grade && ' · ม.' + cls.grade}
                                                {cls.room  && '/' + cls.room}
                                                {cls.description && ' · ' + cls.description}
                                                {' · '}
                                                <span style={{ color: cls.isActive ? '#34d399' : '#6b7280' }}>
                                                    {cls.isActive ? '● Active' : '○ ปิดแล้ว'}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 20, color: accent }}>{cls.studentCount || 0}</div>
                                            <div style={{ fontSize: 10, color: '#64748b' }}>นักเรียน</div>
                                        </div>

                                        <button onClick={e => toggleActive(cls, e)} style={{
                                            padding: '5px 12px', borderRadius: 8,
                                            border: '1px solid ' + (cls.isActive ? '#ef4444' : '#34d399'),
                                            background: 'transparent', cursor: 'pointer',
                                            color: cls.isActive ? '#ef4444' : '#34d399',
                                            fontFamily: "'Prompt', sans-serif", fontSize: 11, fontWeight: 600, flexShrink: 0,
                                        }}>{cls.isActive ? 'ปิด' : 'เปิด'}</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ textAlign: 'center', marginTop: 24 }}>
                            <a href="#/teacher/dashboard" style={{ color: '#475569', fontSize: 12, textDecoration: 'none' }}>← กลับแดชบอร์ดครู</a>
                        </div>
                    </>
                )}

                {/* ══════════════════ CREATE VIEW ══════════════════ */}
                {view === 'create' && (
                    <div style={{ background: card, borderRadius: 16, border: '1px solid ' + border, padding: 24 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>🏫 สร้างชั้นเรียนใหม่</h2>
                        <div style={{ display: 'grid', gap: 14 }}>
                            {[
                                { key: 'name',        label: 'ชื่อชั้นเรียน *',   placeholder: 'เช่น ว31281 ม.4/6' },
                                { key: 'year',        label: 'ปีการศึกษา (พ.ศ.)', placeholder: 'เช่น 2568' },
                                { key: 'grade',       label: 'ระดับชั้น',          placeholder: 'เช่น 4 (ม.4)' },
                                { key: 'room',        label: 'ห้อง',               placeholder: 'เช่น 6' },
                                { key: 'description', label: 'รายละเอียดเพิ่มเติม', placeholder: 'เช่น ภาคเรียนที่ 1 ปีการศึกษา 2568' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>{f.label}</label>
                                    <input
                                        value={form[f.key]}
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        style={inp}
                                    />
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button onClick={() => setView('list')} style={{
                                    flex: 1, padding: '10px', borderRadius: 10, border: '1px solid ' + border,
                                    background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                                    fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: 13,
                                }}>ยกเลิก</button>
                                <button onClick={createClass} disabled={saving || !form.name.trim()} style={{
                                    flex: 2, padding: '10px', borderRadius: 10, border: 'none',
                                    background: saving || !form.name.trim()
                                        ? '#374151' : 'linear-gradient(135deg,#f59e0b,#d97706)',
                                    color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                                    fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: 14,
                                }}>{saving ? '⏳ กำลังสร้าง...' : '✅ สร้างชั้นเรียน'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════ DETAIL VIEW ══════════════════ */}
                {view === 'detail' && selectedClass && (
                    <>
                        {/* Class header card */}
                        <div style={{ background: card, border: '1px solid ' + border, borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 28 }}>🏫</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 17 }}>{selectedClass.name}</div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>
                                        ปีการศึกษา {selectedClass.year || '-'}
                                        {selectedClass.description && ' · ' + selectedClass.description}
                                        {' · '}
                                        <span style={{ color: '#94a3b8' }}>ID: {selectedClass.id}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    <button onClick={refreshLeaderboard} disabled={saving} style={{
                                        padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
                                        background: '#0f172a', border: '1px solid ' + border, color: '#94a3b8',
                                        fontFamily: "'Prompt', sans-serif", fontSize: 12, fontWeight: 600,
                                    }}>🔄 Refresh LB</button>
                                </div>
                            </div>
                        </div>

                        {/* Bulk assign */}
                        <div style={{ background: card, border: '1px solid ' + border, borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📋 กำหนดนักเรียนเป็นชุด (ช่วงรหัส)</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                {[
                                    { label: 'รหัสเริ่มต้น', val: bulkMin, set: setBulkMin, ph: 'เช่น 11669' },
                                    { label: 'รหัสสิ้นสุด',  val: bulkMax, set: setBulkMax, ph: 'เช่น 11701' },
                                ].map(f => (
                                    <div key={f.label} style={{ flex: 1, minWidth: 120 }}>
                                        <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>{f.label}</label>
                                        <input type="number" value={f.val} placeholder={f.ph}
                                            onChange={e => f.set(e.target.value)} style={{ ...inp, padding: '7px 10px', fontSize: 12 }} />
                                    </div>
                                ))}
                                <button onClick={bulkAssign} disabled={saving} style={{
                                    padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff',
                                    fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: 13,
                                    whiteSpace: 'nowrap', flexShrink: 0,
                                }}>{saving ? '⏳...' : '✅ กำหนด'}</button>
                            </div>
                            <p style={{ fontSize: 11, color: '#475569', margin: '7px 0 0' }}>
                                ค้นหาจาก studentCode (รหัสนักเรียน) → number (เลขที่) ตามลำดับ
                            </p>
                        </div>

                        {/* Search + individual add */}
                        <div style={{ background: card, border: '1px solid ' + border, borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🔍 เพิ่มนักเรียนทีละคน</div>
                            <input
                                value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                placeholder="ค้นหาชื่อ, รหัสนักเรียน (พิมพ์ 2 ตัวขึ้นไป)..."
                                style={inp}
                            />
                            {searchResults.length > 0 && (
                                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                                    {searchResults.map(s => (
                                        <div key={s.uid} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            background: '#0f172a', borderRadius: 8, padding: '7px 12px',
                                        }}>
                                            <div style={{ flex: 1, fontSize: 13 }}>
                                                <span style={{ fontWeight: 600 }}>{s.displayName || 'ไม่ทราบชื่อ'}</span>
                                                <span style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>
                                                    {s.studentCode || s.number || ''} {s.email}
                                                </span>
                                            </div>
                                            <button onClick={() => addStudent(s)} style={{
                                                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                                background: '#34d399', color: '#064e3b',
                                                fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: 11,
                                            }}>+ เพิ่ม</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Students list */}
                        <div style={{ background: card, border: '1px solid ' + border, borderRadius: 14, padding: '16px 20px' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                                👥 นักเรียนในชั้นเรียน ({classStudents.length} คน)
                            </div>
                            {classStudents.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                                    ยังไม่มีนักเรียน — ใช้ "กำหนดเป็นชุด" หรือ "เพิ่มทีละคน" ด้านบน
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {classStudents.map((s, idx) => (
                                        <div key={s.uid} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            background: '#0f172a', borderRadius: 10, padding: '8px 12px',
                                        }}>
                                            <div style={{ color: '#475569', fontSize: 12, minWidth: 28, textAlign: 'center' }}>
                                                {s.number || (idx + 1)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {s.displayName || 'ไม่ทราบชื่อ'}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                                    {s.studentCode && 'รหัส ' + s.studentCode + ' · '}{s.email}
                                                </div>
                                            </div>
                                            <button onClick={() => removeStudent(s.uid, s.displayName || 'นักเรียน')} style={{
                                                padding: '4px 10px', borderRadius: 6,
                                                border: '1px solid #ef4444', background: 'transparent',
                                                color: '#ef4444', cursor: 'pointer',
                                                fontFamily: "'Prompt', sans-serif", fontSize: 11, fontWeight: 600,
                                            }}>ลบ</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

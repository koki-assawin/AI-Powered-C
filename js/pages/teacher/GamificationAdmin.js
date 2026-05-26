// js/pages/teacher/GamificationAdmin.js — Phase 4: Gamification Admin Panel

const _serializeFS = (data) =>
    JSON.parse(JSON.stringify(data, (k, v) => {
        if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
        if (v && typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
        return v;
    }));

const _downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(_serializeFS(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

const _DemoSetupTab = ({ demoConfig, courses, demoSelectedCourse, demoAssignments, demoSaving, onCourseChange, onSave }) => {
    const [selected, setSelected] = React.useState([]);

    const toggle = (a) => {
        setSelected(prev => prev.find(x => x.id === a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a]);
    };

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            {/* Current config */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fce7f3', padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#be185d', fontSize: 14 }}>🌐 ตั้งค่า Demo Course ปัจจุบัน</h3>
                {demoConfig ? (
                    <div>
                        <p style={{ fontSize: 13, color: '#374151', margin: '0 0 8px' }}>
                            <strong>Course ID:</strong> <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{demoConfig.courseId}</code>
                        </p>
                        <p style={{ fontSize: 13, color: '#374151', margin: '0 0 8px' }}>
                            <strong>โจทย์:</strong> {(demoConfig.assignments || []).length} ข้อ
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
                            {(demoConfig.assignments || []).map((a, i) => (
                                <div key={a.id} style={{ background: '#f9fafb', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                                    <div style={{ fontWeight: 700, color: '#1f2937' }}>{a.title}</div>
                                    <div style={{ color: '#9ca3af' }}>{a.unitName}</div>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12, marginBottom: 0 }}>
                            🔗 Link สำหรับแชร์: <strong>{window.location.origin + window.location.pathname}#/demo</strong>
                        </p>
                    </div>
                ) : (
                    <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>ยังไม่ได้ตั้งค่า — กรุณาเลือกด้านล่าง</p>
                )}
            </div>

            {/* Setup form */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fce7f3', padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', color: '#be185d', fontSize: 14 }}>⚙️ เลือกโจทย์ Demo ใหม่</h3>
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>รายวิชาที่ต้องการใช้เป็น Demo</label>
                    <select value={demoSelectedCourse} onChange={e => { onCourseChange(e.target.value); setSelected([]); }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #fce7f3', fontFamily: "'Prompt',sans-serif", fontSize: 13 }}>
                        <option value="">— เลือกรายวิชา —</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title} {c.grade ? `(${c.grade})` : ''}</option>)}
                    </select>
                </div>

                {demoAssignments.length > 0 && (
                    <>
                        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>เลือกโจทย์ที่ต้องการให้แสดงในหน้า Demo (แนะนำ 4 ข้อ หน่วยละ 1)</p>
                        <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
                            {demoAssignments.map(a => {
                                const isSelected = selected.find(x => x.id === a.id);
                                return (
                                    <label key={a.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                        borderRadius: 10, cursor: 'pointer',
                                        background: isSelected ? '#fdf2f8' : '#f9fafb',
                                        border: `1.5px solid ${isSelected ? '#f9a8d4' : '#e5e7eb'}`,
                                    }}>
                                        <input type="checkbox" checked={!!isSelected} onChange={() => toggle(a)}
                                            style={{ width: 16, height: 16, accentColor: '#ec4899' }} />
                                        <span style={{ fontSize: 13, color: '#374151', fontWeight: isSelected ? 600 : 400 }}>
                                            {a.title}
                                        </span>
                                        {a.unitName && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{a.unitName}</span>}
                                    </label>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => onSave(selected)}
                            disabled={demoSaving || selected.length === 0}
                            style={{
                                width: '100%', padding: '11px', borderRadius: 12, border: 'none',
                                background: demoSaving || selected.length === 0 ? '#9ca3af' : 'linear-gradient(135deg,#ec4899,#be185d)',
                                color: 'white', fontFamily: "'Prompt',sans-serif", fontWeight: 700,
                                fontSize: 14, cursor: demoSaving || selected.length === 0 ? 'not-allowed' : 'pointer',
                            }}>
                            {demoSaving ? '⏳ กำลังบันทึก...' : `🌐 บันทึก Demo Course (${selected.length} โจทย์)`}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const GamificationAdmin = () => {
    const { userDoc } = useAuth();
    const [tab, setTab] = React.useState('season');
    const [season, setSeason] = React.useState(null);
    const [seasonLoading, setSeasonLoading] = React.useState(true);
    const [newSeason, setNewSeason] = React.useState({ name: '', endDate: '', xpMultiplier: '2' });
    const [creating, setCreating] = React.useState(false);
    const [exporting, setExporting] = React.useState({});
    const [refreshing, setRefreshing] = React.useState(false);
    const [gameStats, setGameStats] = React.useState(null);
    const [manualXP, setManualXP] = React.useState({ uid: '', xp: '', reason: '' });
    const [students, setStudents] = React.useState([]);
    const [toast, setToast] = React.useState('');
    const [courses, setCourses] = React.useState([]);
    const [selectedCourseId, setSelectedCourseId] = React.useState('');
    const [demoConfig, setDemoConfig] = React.useState(null);
    const [demoAssignments, setDemoAssignments] = React.useState([]);
    const [demoSelectedCourse, setDemoSelectedCourse] = React.useState('');
    const [demoSaving, setDemoSaving] = React.useState(false);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    React.useEffect(() => {
        loadSeason();
        db.collection('users').where('role', '==', 'student').orderBy('displayName').get()
            .then(snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
            .catch(() => {});
        db.collection('courses').get()
            .then(snap => setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
            .catch(() => {});
        db.collection('appConfig').doc('demo').get()
            .then(snap => { if (snap.exists) setDemoConfig(snap.data()); })
            .catch(() => {});
    }, []);

    React.useEffect(() => {
        if (tab === 'stats') loadGameStats();
    }, [tab]);

    const loadSeason = async () => {
        setSeasonLoading(true);
        const s = typeof getSeasonInfo === 'function' ? await getSeasonInfo() : null;
        setSeason(s);
        setSeasonLoading(false);
    };

    const handleCreateSeason = async () => {
        if (!newSeason.name.trim() || !newSeason.endDate) return;
        setCreating(true);
        try {
            if (season) await db.collection('seasons').doc(season.id).update({ isActive: false });
            await db.collection('seasons').add({
                name: newSeason.name.trim(),
                startDate: firebase.firestore.FieldValue.serverTimestamp(),
                endDate: new Date(newSeason.endDate),
                xpMultiplier: parseFloat(newSeason.xpMultiplier) || 2,
                isActive: true,
                createdBy: userDoc?.id,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            // Reset seasonXP for all students
            const statsSnap = await db.collection('playerStats').get();
            const batch = db.batch();
            statsSnap.docs.forEach(d => batch.update(d.ref, { seasonXP: 0 }));
            await batch.commit();
            showToast('✅ สร้าง Season ใหม่แล้ว และ Reset seasonXP ทุกคน');
            setNewSeason({ name: '', endDate: '', xpMultiplier: '2' });
            loadSeason();
        } catch (err) {
            showToast('❌ เกิดข้อผิดพลาด: ' + err.message);
        } finally { setCreating(false); }
    };

    const handleEndSeason = async () => {
        if (!season || !confirm(`สิ้นสุด Season "${season.name}" ใช่หรือไม่?`)) return;
        await db.collection('seasons').doc(season.id).update({ isActive: false });
        showToast('✅ สิ้นสุด Season แล้ว');
        loadSeason();
    };

    const handleExport = async (collName, filename) => {
        setExporting(e => ({ ...e, [collName]: true }));
        try {
            const snap = await db.collection(collName).get();
            _downloadJSON(snap.docs.map(d => ({ id: d.id, ...d.data() })), filename);
            showToast(`✅ Export ${collName} สำเร็จ (${snap.size} docs)`);
        } catch (err) {
            showToast('❌ Export ไม่สำเร็จ: ' + err.message);
        } finally { setExporting(e => ({ ...e, [collName]: false })); }
    };

    const handleRefreshLeaderboard = async () => {
        setRefreshing(true);
        try {
            await updateAllLeaderboards(selectedCourseId || null);
            showToast('✅ อัปเดต Leaderboard' + (selectedCourseId ? ' (รายวิชานี้)' : ' ทั้งหมด') + ' แล้ว');
        } catch (err) {
            showToast('❌ ' + err.message);
        } finally { setRefreshing(false); }
    };

    const handleManualXP = async () => {
        if (!manualXP.uid || !manualXP.xp) return;
        try {
            await awardXP(manualXP.uid, parseInt(manualXP.xp) || 0, 0, 0, 'manual_admin',
                null, { reason: manualXP.reason, by: userDoc?.id });
            showToast(`✅ Award ${manualXP.xp} XP ให้นักเรียนแล้ว`);
            setManualXP({ uid: '', xp: '', reason: '' });
        } catch (err) { showToast('❌ ' + err.message); }
    };

    const loadGameStats = async () => {
        try {
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
            const [todaySnap, weekSnap, allSnap] = await Promise.all([
                db.collection('miniGameSessions').where('playedAt', '>=', todayStart).get(),
                db.collection('miniGameSessions').where('playedAt', '>=', weekStart).get(),
                db.collection('miniGameSessions').get(),
            ]);
            const countByType = (docs) => {
                const c = { quiz_blitz: 0, code_autopsy: 0, bug_hunt: 0, total: docs.length };
                docs.forEach(d => { const t = d.data().gameType; if (c[t] !== undefined) c[t]++; });
                return c;
            };
            setGameStats({
                today: countByType(todaySnap.docs),
                week: countByType(weekSnap.docs),
                all: countByType(allSnap.docs),
            });
        } catch (e) { console.warn(e); }
    };

    const loadDemoAssignments = (courseId) => {
        setDemoSelectedCourse(courseId);
        if (!courseId) { setDemoAssignments([]); return; }
        db.collection('assignments').where('courseId', '==', courseId).orderBy('order').get()
            .then(snap => setDemoAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
            .catch(() => {});
    };

    const saveDemoConfig = async (selectedAssignments) => {
        if (!demoSelectedCourse || selectedAssignments.length === 0) return;
        setDemoSaving(true);
        try {
            const payload = {
                courseId: demoSelectedCourse,
                assignments: selectedAssignments.map(a => ({
                    id: a.id,
                    title: a.title,
                    unitName: a.unitName || `หน่วยที่ ${a.unit || ''}`,
                    description: a.description || '',
                    icon: a.icon || '💻',
                })),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            };
            await db.collection('appConfig').doc('demo').set(payload);
            setDemoConfig(payload);
            showToast('✅ บันทึก Demo Course สำเร็จ!');
        } catch (e) {
            showToast('❌ บันทึกไม่สำเร็จ: ' + e.message);
        } finally {
            setDemoSaving(false);
        }
    };

    const TABS = [
        { key: 'season', label: '🌟 Season' },
        { key: 'export', label: '📦 Export ข้อมูล' },
        { key: 'manual', label: '🎁 Award XP' },
        { key: 'stats',  label: '🎮 Game Stats' },
        { key: 'demo',   label: '🌐 Demo Course' },
    ];

    const inputStyle = {
        border: '1.5px solid #fce7f3', borderRadius: 10, padding: '8px 12px',
        fontFamily: "'Prompt',sans-serif", fontSize: 13, width: '100%',
        boxSizing: 'border-box', outline: 'none',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="Gamification Admin" subtitle="จัดการ Season & ข้อมูลวิจัย" />

            {toast && (
                <div style={{
                    position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                    background: '#1e293b', color: '#f1f5f9', borderRadius: 12, padding: '10px 20px',
                    zIndex: 9999, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,.3)',
                }}>{toast}</div>
            )}

            <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>

                {/* Header */}
                <div style={{ marginBottom: 20 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#be185d', margin: 0 }}>🎮 Gamification Admin</h1>
                    <p style={{ color: '#9ca3af', fontSize: 13, margin: '4px 0 0' }}>จัดการ Season, Export ข้อมูลวิจัย, อัปเดต Leaderboard</p>
                </div>

                {/* Tab nav */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{
                            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            fontFamily: "'Prompt',sans-serif", fontWeight: 600, fontSize: 13,
                            background: tab === t.key ? 'linear-gradient(135deg,#ec4899,#be185d)' : 'white',
                            color: tab === t.key ? 'white' : '#6b7280',
                            border: tab === t.key ? 'none' : '1px solid #fce7f3',
                        }}>{t.label}</button>
                    ))}
                </div>

                {/* ── Season Tab ── */}
                {tab === 'season' && (
                    <div style={{ display: 'grid', gap: 16 }}>
                        {/* Current season */}
                        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fce7f3', padding: 20 }}>
                            <h3 style={{ margin: '0 0 14px', color: '#be185d', fontSize: 15 }}>Season ปัจจุบัน</h3>
                            {seasonLoading ? <p style={{ color: '#9ca3af' }}>กำลังโหลด...</p> : season ? (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <span style={{ fontSize: 28 }}>🌟</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 16, color: '#1f2937' }}>{season.name}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                XP Multiplier: x{season.xpMultiplier} ·
                                                {season.endDate && ` สิ้นสุด ${new Date(season.endDate?.toDate?.() || season.endDate).toLocaleDateString('th-TH')}`}
                                            </div>
                                        </div>
                                        <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#166534', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                                            Active
                                        </span>
                                    </div>
                                    <button onClick={handleEndSeason} style={{
                                        padding: '8px 16px', borderRadius: 10, border: '1.5px solid #fca5a5',
                                        background: 'white', color: '#ef4444', cursor: 'pointer',
                                        fontFamily: "'Prompt',sans-serif", fontWeight: 600, fontSize: 13,
                                    }}>🛑 สิ้นสุด Season นี้</button>
                                </div>
                            ) : (
                                <p style={{ color: '#9ca3af', fontSize: 13 }}>ยังไม่มี Season ที่ Active อยู่</p>
                            )}
                        </div>

                        {/* Create new season */}
                        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fce7f3', padding: 20 }}>
                            <h3 style={{ margin: '0 0 14px', color: '#be185d', fontSize: 15 }}>
                                {season ? '🔄 เริ่ม Season ใหม่ (จะสิ้นสุด Season เก่า)' : '🌟 สร้าง Season ใหม่'}
                            </h3>
                            <div style={{ display: 'grid', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>ชื่อ Season *</label>
                                    <input style={inputStyle} placeholder="เช่น Season 1 / เทอม 1/2568"
                                        value={newSeason.name} onChange={e => setNewSeason(s => ({ ...s, name: e.target.value }))} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>วันสิ้นสุด *</label>
                                        <input type="date" style={inputStyle}
                                            value={newSeason.endDate} onChange={e => setNewSeason(s => ({ ...s, endDate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>XP Multiplier</label>
                                        <input type="number" min="1" max="5" step="0.5" style={inputStyle}
                                            value={newSeason.xpMultiplier} onChange={e => setNewSeason(s => ({ ...s, xpMultiplier: e.target.value }))} />
                                    </div>
                                </div>
                                <button onClick={handleCreateSeason} disabled={creating || !newSeason.name.trim() || !newSeason.endDate}
                                    style={{
                                        padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                        background: 'linear-gradient(135deg,#ec4899,#be185d)', color: 'white',
                                        fontFamily: "'Prompt',sans-serif", fontWeight: 700, fontSize: 14,
                                        opacity: creating ? .6 : 1,
                                    }}>
                                    {creating ? '⏳ กำลังสร้าง...' : '🌟 สร้าง Season'}
                                </button>
                            </div>
                        </div>

                        {/* Refresh Leaderboard */}
                        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fce7f3', padding: 20 }}>
                            <h3 style={{ margin: '0 0 8px', color: '#be185d', fontSize: 15 }}>🔄 อัปเดต Leaderboard</h3>
                            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                                อัปเดต 3 Leaderboard (Daily/Weekly/Alltime) — เลือกรายวิชา หรือปล่อยว่างเพื่ออัปเดตทั้งหมด
                            </p>
                            <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}
                                style={{ ...inputStyle, marginBottom: 10 }}>
                                <option value="">— ทุกรายวิชา (ไม่แยก) —</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                            <button onClick={handleRefreshLeaderboard} disabled={refreshing} style={{
                                padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: '#1e293b', color: '#f1f5f9', fontFamily: "'Prompt',sans-serif",
                                fontWeight: 600, fontSize: 13, opacity: refreshing ? .6 : 1,
                            }}>
                                {refreshing ? '⏳ กำลังอัปเดต...' : '🔄 Refresh Leaderboard'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Export Tab ── */}
                {tab === 'export' && (
                    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fce7f3', padding: 20 }}>
                        <h3 style={{ margin: '0 0 6px', color: '#be185d', fontSize: 15 }}>📦 Export ข้อมูลวิจัย (JSON)</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 18 }}>
                            ดาวน์โหลดข้อมูลแต่ละ collection เป็น JSON สำหรับวิเคราะห์ด้วย SPSS/R/Excel
                        </p>
                        <div style={{ display: 'grid', gap: 10 }}>
                            {[
                                { coll: 'playerStats',         label: '🏆 Player Stats',          desc: 'XP, rank, streak ของนักเรียนทุกคน',       file: 'playerStats.json' },
                                { coll: 'xpLedger',            label: '📒 XP Ledger',             desc: 'ทุก XP event (audit trail)',               file: 'xpLedger.json' },
                                { coll: 'coachInteractions',   label: '🤖 Coach Interactions',    desc: 'การใช้ AI Coach ทุกประเภท',                file: 'coachInteractions.json' },
                                { coll: 'miniGameSessions',    label: '🎮 Mini-game Sessions',    desc: 'คะแนนและประวัติการเล่น Mini-games',        file: 'miniGameSessions.json' },
                                { coll: 'studentAchievements', label: '🏅 Student Achievements',  desc: 'Badge ที่นักเรียนได้รับ',                  file: 'studentAchievements.json' },
                                { coll: 'submissions',         label: '📋 Submissions',           desc: 'ประวัติการส่งงานทั้งหมด',                  file: 'submissions.json' },
                                { coll: 'selfPracticeSubmissions', label: '🎯 Self Practice',    desc: 'ประวัติฝึกด้วยตนเอง',                      file: 'selfPractice.json' },
                            ].map(item => (
                                <div key={item.coll} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    background: '#f9fafb', borderRadius: 10, padding: '12px 14px',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{item.label}</div>
                                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.desc}</div>
                                    </div>
                                    <button
                                        onClick={() => handleExport(item.coll, item.file)}
                                        disabled={exporting[item.coll]}
                                        style={{
                                            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                            background: exporting[item.coll] ? '#9ca3af' : '#1e293b',
                                            color: 'white', fontFamily: "'Prompt',sans-serif", fontSize: 12, fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                        }}>
                                        {exporting[item.coll] ? '⏳...' : '⬇ Export'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Manual XP Tab ── */}
                {tab === 'manual' && (
                    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fce7f3', padding: 20 }}>
                        <h3 style={{ margin: '0 0 8px', color: '#be185d', fontSize: 15 }}>🎁 Award XP ให้นักเรียน</h3>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
                            ให้ XP พิเศษสำหรับกิจกรรมนอกระบบ (บันทึกใน xpLedger source: manual_admin)
                        </p>
                        <div style={{ display: 'grid', gap: 10 }}>
                            <div>
                                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>นักเรียน *</label>
                                <select style={inputStyle} value={manualXP.uid}
                                    onChange={e => setManualXP(s => ({ ...s, uid: e.target.value }))}>
                                    <option value="">-- เลือกนักเรียน --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.displayName} ({s.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>XP ที่จะให้ *</label>
                                <input type="number" min="1" max="1000" style={inputStyle} placeholder="เช่น 50"
                                    value={manualXP.xp} onChange={e => setManualXP(s => ({ ...s, xp: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>เหตุผล</label>
                                <input style={inputStyle} placeholder="เช่น เข้าร่วมกิจกรรมพิเศษ"
                                    value={manualXP.reason} onChange={e => setManualXP(s => ({ ...s, reason: e.target.value }))} />
                            </div>
                            <button onClick={handleManualXP} disabled={!manualXP.uid || !manualXP.xp} style={{
                                padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white',
                                fontFamily: "'Prompt',sans-serif", fontWeight: 700, fontSize: 14,
                                opacity: (!manualXP.uid || !manualXP.xp) ? .5 : 1,
                            }}>
                                🎁 Award XP
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Game Stats Tab ── */}
                {/* ── Demo Course Tab ── */}
                {tab === 'demo' && (
                    <_DemoSetupTab
                        demoConfig={demoConfig}
                        courses={courses}
                        demoSelectedCourse={demoSelectedCourse}
                        demoAssignments={demoAssignments}
                        demoSaving={demoSaving}
                        onCourseChange={loadDemoAssignments}
                        onSave={saveDemoConfig}
                    />
                )}

                {tab === 'stats' && (
                    <div style={{ display: 'grid', gap: 16 }}>
                        {!gameStats ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>กำลังโหลด...</div>
                        ) : (
                            <>
                                {[
                                    { label: '📅 วันนี้', data: gameStats.today },
                                    { label: '📆 7 วันที่ผ่านมา', data: gameStats.week },
                                    { label: '🏆 ทั้งหมด', data: gameStats.all },
                                ].map(({ label, data }) => (
                                    <div key={label} style={{ background: 'white', borderRadius: 14, border: '1px solid #fce7f3', padding: 18 }}>
                                        <h4 style={{ margin: '0 0 12px', color: '#be185d', fontSize: 14 }}>{label}</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                                            {[
                                                { label: 'ทั้งหมด', value: data.total, icon: '🎮' },
                                                { label: 'Quiz Blitz', value: data.quiz_blitz, icon: '⚡' },
                                                { label: 'Code Autopsy', value: data.code_autopsy, icon: '🔬' },
                                                { label: 'Bug Hunt', value: data.bug_hunt, icon: '🐛' },
                                            ].map(s => (
                                                <div key={s.label} style={{ textAlign: 'center', background: '#f9fafb', borderRadius: 10, padding: '10px 6px' }}>
                                                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                                                    <div style={{ fontWeight: 700, fontSize: 18, color: '#1f2937' }}>{s.value}</div>
                                                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{s.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

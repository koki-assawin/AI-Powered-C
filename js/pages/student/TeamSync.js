// js/pages/student/TeamSync.js — TeamSync Dashboard v1.0
// หน่วยที่ 4 ว31281 แผนที่ 35-37 — Mini Project Collaboration (LO14)
// Depends on: gamification.js, context.js

// ── Firestore paths ───────────────────────────────────────────────────────────
// projectTeams/{teamId}           → { name, subject, createdBy, members:[uid], memberNames:{uid:name}, code, createdAt }
// projectTeams/{teamId}/tasks/{id} → { title, desc, assignedTo, assignedName, status, createdAt, updatedAt }
// projectTeams/{teamId}/feedback/{id} → { fromUid, fromName, toUid, toName, scores:{...}, comment, createdAt }

const TASK_STATUSES = ['todo', 'doing', 'done'];
const _TS_STATUS_LABELS = { todo: '📋 Todo', doing: '⚙️ กำลังทำ', done: '✅ เสร็จ' };
const STATUS_COLORS = { todo: '#334155', doing: '#1e3a5f', done: '#052e16' };
const STATUS_BORDER = { todo: '#475569', doing: '#3b82f6', done: '#16a34a' };

const RADAR_AXES = ['ความถูกต้อง', 'ประสิทธิภาพ', 'ความอ่านง่าย', 'ความร่วมมือ', 'ความคิดสร้างสรรค์'];

// ── Generate team join code ────────────────────────────────────────────────────
function genTeamCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Tiny radar chart (pure CSS/SVG) ──────────────────────────────────────────
const _RadarMini = ({ scores, size = 120 }) => {
    const n = RADAR_AXES.length;
    const cx = size / 2, cy = size / 2;
    const r = size * 0.38;
    const angle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;

    const pointsFromScores = (vals) => vals.map((v, i) => {
        const a = angle(i);
        const d = (v / 10) * r;
        return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
    });

    const gridLines = [0.25, 0.5, 0.75, 1.0].map(scale => {
        const pts = RADAR_AXES.map((_, i) => {
            const a = angle(i);
            return `${cx + r * scale * Math.cos(a)},${cy + r * scale * Math.sin(a)}`;
        });
        return pts.join(' ');
    });

    const dataPoints = pointsFromScores(scores);
    const dataPolygon = dataPoints.map(p => p.join(',')).join(' ');

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {gridLines.map((pts, i) => (
                <polygon key={i} points={pts} fill="none" stroke="#334155" strokeWidth="0.5" />
            ))}
            {RADAR_AXES.map((_, i) => {
                const a = angle(i);
                return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#475569" strokeWidth="0.5" />;
            })}
            <polygon points={dataPolygon} fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth="1.5" />
            {dataPoints.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#6366f1" />
            ))}
        </svg>
    );
};

// ── TaskCard ──────────────────────────────────────────────────────────────────
const _TaskCard = ({ task, isOwner, onStatusChange, onDelete }) => {
    const nextStatus = TASK_STATUSES[(TASK_STATUSES.indexOf(task.status) + 1) % 3];
    return (
        <div style={{
            background: STATUS_COLORS[task.status], border: `1px solid ${STATUS_BORDER[task.status]}`,
            borderRadius: 10, padding: '10px 12px', marginBottom: 8,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, paddingRight: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>{task.title}</div>
                    {task.desc && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{task.desc}</div>}
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                        👤 {task.assignedName || 'ยังไม่มีผู้รับผิดชอบ'}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => onStatusChange(task.id, nextStatus)} style={{
                        padding: '3px 8px', borderRadius: 6, border: '1px solid #475569',
                        background: 'transparent', color: '#94a3b8', fontSize: 10,
                        cursor: 'pointer', fontFamily: "'Prompt',sans-serif", whiteSpace: 'nowrap',
                    }}>
                        → {_TS_STATUS_LABELS[nextStatus].split(' ')[1]}
                    </button>
                    {isOwner && (
                        <button onClick={() => onDelete(task.id)} style={{
                            padding: '3px 8px', borderRadius: 6, border: '1px solid #7f1d1d',
                            background: 'transparent', color: '#f87171', fontSize: 10,
                            cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                        }}>
                            ลบ
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Add Task Modal ────────────────────────────────────────────────────────────
const _AddTaskModal = ({ members, onSave, onCancel }) => {
    const [title,      setTitle]    = React.useState('');
    const [desc,       setDesc]     = React.useState('');
    const [assignedTo, setAssigned] = React.useState('');

    const selectedMember = members.find(m => m.uid === assignedTo);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
            <div style={{
                background: '#1e293b', borderRadius: 14, padding: 20, width: '90%', maxWidth: 400,
                border: '1px solid #334155',
            }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>➕ เพิ่ม Task ใหม่</h3>
                <input value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="ชื่อ Task..." style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
                        fontSize: 13, fontFamily: "'Prompt',sans-serif", marginBottom: 8, boxSizing: 'border-box',
                    }} />
                <textarea value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="รายละเอียด (ไม่บังคับ)..." rows={2} style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
                        fontSize: 13, fontFamily: "'Prompt',sans-serif", marginBottom: 8,
                        boxSizing: 'border-box', resize: 'vertical',
                    }} />
                <select value={assignedTo} onChange={e => setAssigned(e.target.value)} style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
                    fontSize: 13, fontFamily: "'Prompt',sans-serif", marginBottom: 14, boxSizing: 'border-box',
                }}>
                    <option value="">เลือกผู้รับผิดชอบ</option>
                    {members.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onCancel} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #334155',
                        background: 'transparent', color: '#64748b', fontSize: 13,
                        cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>ยกเลิก</button>
                    <button onClick={() => title.trim() && onSave({ title: title.trim(), desc: desc.trim(), assignedTo, assignedName: selectedMember?.name || '' })} style={{
                        flex: 2, padding: '8px 0', borderRadius: 8, border: 'none',
                        background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>➕ เพิ่ม Task</button>
                </div>
            </div>
        </div>
    );
};

// ── Peer Feedback Modal ───────────────────────────────────────────────────────
const _FeedbackModal = ({ members, currentUid, onSave, onCancel }) => {
    const others = members.filter(m => m.uid !== currentUid);
    const [toUid,   setToUid]   = React.useState(others[0]?.uid || '');
    const [scores,  setScores]  = React.useState({ 0: 5, 1: 5, 2: 5, 3: 5, 4: 5 });
    const [comment, setComment] = React.useState('');

    const toMember = members.find(m => m.uid === toUid);

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
            <div style={{
                background: '#1e293b', borderRadius: 14, padding: 20,
                width: '90%', maxWidth: 440, border: '1px solid #334155', maxHeight: '85vh', overflowY: 'auto',
            }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>⭐ Peer Feedback</h3>

                <select value={toUid} onChange={e => setToUid(e.target.value)} style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
                    fontSize: 13, fontFamily: "'Prompt',sans-serif", marginBottom: 14, boxSizing: 'border-box',
                }}>
                    {others.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                </select>

                <div style={{ marginBottom: 14 }}>
                    {RADAR_AXES.map((axis, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 90, fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{axis}</div>
                            <input type="range" min="1" max="10" value={scores[i]}
                                onChange={e => setScores(prev => ({ ...prev, [i]: parseInt(e.target.value) }))}
                                style={{ flex: 1, accentColor: '#6366f1' }} />
                            <div style={{ width: 24, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#818cf8' }}>
                                {scores[i]}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mini radar preview */}
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <_RadarMini scores={Object.values(scores)} size={100} />
                </div>

                <textarea value={comment} onChange={e => setComment(e.target.value)}
                    placeholder={`ความเห็นถึง ${toMember?.name || 'เพื่อน'}...`} rows={3}
                    style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
                        fontSize: 13, fontFamily: "'Prompt',sans-serif", marginBottom: 14,
                        boxSizing: 'border-box', resize: 'vertical',
                    }} />

                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onCancel} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #334155',
                        background: 'transparent', color: '#64748b', fontSize: 13,
                        cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>ยกเลิก</button>
                    <button onClick={() => toUid && onSave({ toUid, toName: toMember?.name || '', scores: Object.values(scores), comment })} style={{
                        flex: 2, padding: '8px 0', borderRadius: 8, border: 'none',
                        background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                    }}>⭐ ส่ง Feedback</button>
                </div>
            </div>
        </div>
    );
};

// ── Main TeamSync ─────────────────────────────────────────────────────────────
const TeamSync = () => {
    const { user, userDoc } = useAuth();
    const [team,     setTeam]    = React.useState(null);   // null = no team yet
    const [tasks,    setTasks]   = React.useState([]);
    const [feedbacks,setFeedbacks] = React.useState([]);
    const [loading,  setLoading] = React.useState(true);
    const [tab,      setTab]     = React.useState('board'); // board | feedback | chart
    const [showAdd,  setShowAdd] = React.useState(false);
    const [showFB,   setShowFB]  = React.useState(false);
    const [toast,    setToast]   = React.useState(null);

    // ── Create or Join form state ─────────────────────────────────────────────
    const [createName, setCreateName] = React.useState('');
    const [joinCode,   setJoinCode]   = React.useState('');
    const [formBusy,   setFormBusy]   = React.useState(false);

    const showToast = (msg, type = 'ok') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const myName = userDoc?.displayName || user?.email || 'นักเรียน';
    const uid    = user?.uid;

    // ── Load team from playerStats.teamId ─────────────────────────────────────
    React.useEffect(() => {
        if (!uid) return;
        let taskUnsub = () => {}, fbUnsub = () => {};

        const statsUnsub = db.collection('playerStats').doc(uid).onSnapshot(async snap => {
            const teamId = snap.exists ? snap.data()?.teamId : null;
            if (!teamId) { setTeam(null); setLoading(false); return; }

            try {
                const teamSnap = await db.collection('projectTeams').doc(teamId).get();
                if (!teamSnap.exists) {
                    await db.collection('playerStats').doc(uid).update({ teamId: null });
                    setTeam(null); setLoading(false); return;
                }
                setTeam({ id: teamId, ...teamSnap.data() });

                taskUnsub();
                taskUnsub = db.collection('projectTeams').doc(teamId).collection('tasks')
                    .orderBy('createdAt', 'asc')
                    .onSnapshot(ts => setTasks(ts.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});

                fbUnsub();
                fbUnsub = db.collection('projectTeams').doc(teamId).collection('feedback')
                    .orderBy('createdAt', 'desc').limit(50)
                    .onSnapshot(fs => setFeedbacks(fs.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});

                setLoading(false);
            } catch (e) {
                setLoading(false);
            }
        }, () => setLoading(false));

        return () => { statsUnsub(); taskUnsub(); fbUnsub(); };
    }, [uid]);

    // ── Create team ───────────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!createName.trim() || !uid || formBusy) return;
        setFormBusy(true);
        try {
            const code = genTeamCode();
            const ref = db.collection('projectTeams').doc(code);
            await ref.set({
                name: createName.trim(), code,
                createdBy: uid,
                members: [uid],
                memberNames: { [uid]: myName },
                subject: 'ว31281',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('playerStats').doc(uid).set({ teamId: code }, { merge: true });
            showToast(`สร้างทีม "${createName.trim()}" สำเร็จ! รหัส: ${code}`, 'ok');
        } catch (e) {
            showToast('สร้างทีมไม่สำเร็จ', 'err');
        } finally { setFormBusy(false); }
    };

    // ── Join team ─────────────────────────────────────────────────────────────
    const handleJoin = async () => {
        if (!joinCode.trim() || !uid || formBusy) return;
        setFormBusy(true);
        const code = joinCode.trim().toUpperCase();
        try {
            const ref  = db.collection('projectTeams').doc(code);
            const snap = await ref.get();
            if (!snap.exists) { showToast('ไม่พบทีม กรุณาตรวจสอบรหัส', 'err'); return; }
            await ref.update({
                members: firebase.firestore.FieldValue.arrayUnion(uid),
                [`memberNames.${uid}`]: myName,
            });
            await db.collection('playerStats').doc(uid).set({ teamId: code }, { merge: true });
            showToast('เข้าร่วมทีมสำเร็จ!', 'ok');
        } catch (e) {
            showToast('เข้าร่วมทีมไม่สำเร็จ', 'err');
        } finally { setFormBusy(false); }
    };

    // ── Leave team ────────────────────────────────────────────────────────────
    const handleLeave = async () => {
        if (!team || !uid) return;
        if (!window.confirm('ออกจากทีม? งานของทีมยังคงอยู่')) return;
        try {
            await db.collection('projectTeams').doc(team.id).update({
                members: firebase.firestore.FieldValue.arrayRemove(uid),
                [`memberNames.${uid}`]: firebase.firestore.FieldValue.delete(),
            });
            await db.collection('playerStats').doc(uid).update({ teamId: null });
        } catch (e) { showToast('ออกจากทีมไม่สำเร็จ', 'err'); }
    };

    // ── Add task ──────────────────────────────────────────────────────────────
    const handleAddTask = async (data) => {
        if (!team) return;
        try {
            await db.collection('projectTeams').doc(team.id).collection('tasks').add({
                ...data, status: 'todo', createdBy: uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            setShowAdd(false);
            showToast('เพิ่ม Task สำเร็จ!', 'ok');
        } catch (e) { showToast('เพิ่ม Task ไม่สำเร็จ', 'err'); }
    };

    // ── Change task status ────────────────────────────────────────────────────
    const handleStatusChange = async (taskId, newStatus) => {
        if (!team) return;
        try {
            await db.collection('projectTeams').doc(team.id).collection('tasks').doc(taskId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            if (newStatus === 'done') {
                awardXP(uid, 10, 2, 0, 'task_done', taskId, {}).catch(() => {});
            }
        } catch (e) {}
    };

    // ── Delete task ───────────────────────────────────────────────────────────
    const handleDeleteTask = async (taskId) => {
        if (!team) return;
        try {
            await db.collection('projectTeams').doc(team.id).collection('tasks').doc(taskId).delete();
        } catch (e) {}
    };

    // ── Submit feedback ───────────────────────────────────────────────────────
    const handleFeedback = async (data) => {
        if (!team || !uid) return;
        try {
            await db.collection('projectTeams').doc(team.id).collection('feedback').add({
                fromUid: uid, fromName: myName,
                toUid: data.toUid, toName: data.toName,
                scores: data.scores, comment: data.comment,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            setShowFB(false);
            awardXP(uid, 20, 3, 0, 'peer_feedback', null, {}).catch(() => {});
            showToast('ส่ง Feedback สำเร็จ! +20 XP', 'ok');
        } catch (e) { showToast('ส่ง Feedback ไม่สำเร็จ', 'err'); }
    };

    // ── Members list ──────────────────────────────────────────────────────────
    const members = team ? Object.entries(team.memberNames || {}).map(([uid, name]) => ({ uid, name })) : [];

    // ── My received feedback radar ────────────────────────────────────────────
    const myFeedbacks = feedbacks.filter(f => f.toUid === uid);
    const avgRadar = React.useMemo(() => {
        if (!myFeedbacks.length) return [5, 5, 5, 5, 5];
        const sums = [0, 0, 0, 0, 0];
        myFeedbacks.forEach(f => f.scores.forEach((s, i) => { sums[i] = (sums[i] || 0) + s; }));
        return sums.map(s => Math.round((s / myFeedbacks.length) * 10) / 10);
    }, [myFeedbacks]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="TeamSync" />

            {toast && (
                <div style={{
                    position: 'fixed', top: 70, right: 20, zIndex: 9999,
                    background: toast.type === 'ok' ? '#166534' : '#991b1b',
                    color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13,
                    boxShadow: '0 4px 12px rgba(0,0,0,.4)',
                }}>
                    {toast.msg}
                </div>
            )}

            {showAdd && team && (
                <_AddTaskModal members={members} onSave={handleAddTask} onCancel={() => setShowAdd(false)} />
            )}
            {showFB && team && (
                <_FeedbackModal members={members} currentUid={uid} onSave={handleFeedback} onCancel={() => setShowFB(false)} />
            )}

            <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>

                {/* ── No team ──────────────────────────────────────────────── */}
                {!loading && !team && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <div style={{ fontSize: 48, marginBottom: 8 }}>👥</div>
                            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>TeamSync Dashboard</h1>
                            <p style={{ color: '#64748b', fontSize: 13 }}>
                                ระบบติดตามงาน Mini Project · ว31281 หน่วยที่ 4
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* Create */}
                            <div style={{ background: '#1e293b', borderRadius: 14, padding: 16, border: '1px solid #334155' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#818cf8' }}>➕ สร้างทีมใหม่</h3>
                                <input value={createName} onChange={e => setCreateName(e.target.value)}
                                    placeholder="ชื่อทีม..." style={{
                                        width: '100%', padding: '8px 10px', borderRadius: 8,
                                        border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
                                        fontSize: 13, fontFamily: "'Prompt',sans-serif", marginBottom: 10, boxSizing: 'border-box',
                                    }} />
                                <button onClick={handleCreate} disabled={!createName.trim() || formBusy} style={{
                                    width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                                    background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 700,
                                    cursor: createName.trim() && !formBusy ? 'pointer' : 'not-allowed',
                                    opacity: createName.trim() && !formBusy ? 1 : 0.5,
                                    fontFamily: "'Prompt',sans-serif",
                                }}>
                                    สร้างทีม
                                </button>
                            </div>

                            {/* Join */}
                            <div style={{ background: '#1e293b', borderRadius: 14, padding: 16, border: '1px solid #334155' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#22d3ee' }}>🔗 เข้าร่วมทีม</h3>
                                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="รหัสทีม (6 ตัว)..." maxLength={6} style={{
                                        width: '100%', padding: '8px 10px', borderRadius: 8,
                                        border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
                                        fontSize: 13, fontFamily: "'Courier New',monospace", letterSpacing: 3,
                                        marginBottom: 10, boxSizing: 'border-box', textTransform: 'uppercase',
                                    }} />
                                <button onClick={handleJoin} disabled={joinCode.length < 4 || formBusy} style={{
                                    width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                                    background: '#0e7490', color: '#fff', fontSize: 13, fontWeight: 700,
                                    cursor: joinCode.length >= 4 && !formBusy ? 'pointer' : 'not-allowed',
                                    opacity: joinCode.length >= 4 && !formBusy ? 1 : 0.5,
                                    fontFamily: "'Prompt',sans-serif",
                                }}>
                                    เข้าร่วม
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Loading ───────────────────────────────────────────────── */}
                {loading && (
                    <div style={{ textAlign: 'center', paddingTop: 80 }}>
                        <Spinner text="กำลังโหลดข้อมูลทีม..." />
                    </div>
                )}

                {/* ── Team dashboard ────────────────────────────────────────── */}
                {!loading && team && (
                    <div>
                        {/* Team header */}
                        <div style={{
                            background: '#1e293b', borderRadius: 14, padding: '14px 16px',
                            border: '1px solid #334155', marginBottom: 16,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>👥 {team.name}</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    รหัส: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8', letterSpacing: 2 }}>{team.code || team.id}</span>
                                    <span style={{ marginLeft: 8 }}>· {members.length} คน</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                    {members.map(m => (
                                        <span key={m.uid} style={{
                                            fontSize: 11, background: m.uid === uid ? '#1e3a5f' : '#1e293b',
                                            border: `1px solid ${m.uid === uid ? '#3b82f6' : '#334155'}`,
                                            borderRadius: 6, padding: '2px 8px', color: m.uid === uid ? '#93c5fd' : '#94a3b8',
                                        }}>
                                            {m.uid === uid ? '👤 คุณ' : '👤'} {m.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleLeave} style={{
                                padding: '6px 12px', borderRadius: 8, border: '1px solid #334155',
                                background: 'transparent', color: '#64748b', fontSize: 12,
                                cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                            }}>
                                ออกจากทีม
                            </button>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                            {[['board', '📋 งาน'], ['feedback', '⭐ Feedback'], ['chart', '📊 Radar']].map(([key, label]) => (
                                <button key={key} onClick={() => setTab(key)} style={{
                                    padding: '7px 14px', borderRadius: 8, border: 'none',
                                    background: tab === key ? '#3b82f6' : '#1e293b',
                                    color: tab === key ? '#fff' : '#64748b',
                                    fontSize: 13, cursor: 'pointer', fontFamily: "'Prompt',sans-serif", fontWeight: 600,
                                }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* ── Kanban Board ─────────────────────────────────── */}
                        {tab === 'board' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                                    <button onClick={() => setShowAdd(true)} style={{
                                        padding: '7px 16px', borderRadius: 8, border: 'none',
                                        background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 700,
                                        cursor: 'pointer', fontFamily: "'Prompt',sans-serif",
                                    }}>
                                        ➕ เพิ่ม Task
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                    {TASK_STATUSES.map(status => {
                                        const colTasks = tasks.filter(t => t.status === status);
                                        return (
                                            <div key={status} style={{
                                                background: '#1e293b', borderRadius: 12, padding: '12px 10px',
                                                border: `1px solid ${STATUS_BORDER[status]}`,
                                            }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: '#94a3b8' }}>
                                                    {_TS_STATUS_LABELS[status]}
                                                    <span style={{
                                                        marginLeft: 6, background: '#0f172a', borderRadius: 10,
                                                        padding: '1px 6px', fontSize: 11,
                                                    }}>
                                                        {colTasks.length}
                                                    </span>
                                                </div>
                                                {colTasks.map(task => (
                                                    <_TaskCard
                                                        key={task.id}
                                                        task={task}
                                                        isOwner={task.createdBy === uid}
                                                        onStatusChange={handleStatusChange}
                                                        onDelete={handleDeleteTask}
                                                    />
                                                ))}
                                                {colTasks.length === 0 && (
                                                    <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', padding: '16px 0' }}>
                                                        ยังไม่มีงาน
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Progress summary */}
                                {tasks.length > 0 && (() => {
                                    const done = tasks.filter(t => t.status === 'done').length;
                                    const pct  = Math.round((done / tasks.length) * 100);
                                    return (
                                        <div style={{ marginTop: 14, background: '#1e293b', borderRadius: 10, padding: '10px 14px', border: '1px solid #334155' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                                                <span>ความคืบหน้า</span>
                                                <span>{done}/{tasks.length} tasks ({pct}%)</span>
                                            </div>
                                            <div style={{ height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#22c55e)', borderRadius: 3, transition: 'width .4s' }} />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ── Peer Feedback Tab ─────────────────────────────── */}
                        {tab === 'feedback' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                                    <button onClick={() => setShowFB(true)} disabled={members.length < 2} style={{
                                        padding: '7px 16px', borderRadius: 8, border: 'none',
                                        background: members.length >= 2 ? 'linear-gradient(135deg,#6366f1,#a855f7)' : '#1e293b',
                                        color: members.length >= 2 ? '#fff' : '#475569', fontSize: 13, fontWeight: 700,
                                        cursor: members.length >= 2 ? 'pointer' : 'not-allowed',
                                        fontFamily: "'Prompt',sans-serif",
                                    }}>
                                        ⭐ ให้ Feedback เพื่อน
                                    </button>
                                </div>

                                {feedbacks.length === 0 ? (
                                    <div style={{ textAlign: 'center', paddingTop: 40, color: '#475569' }}>
                                        <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                                        <p>ยังไม่มี Feedback · กดปุ่มด้านบนเพื่อเริ่ม</p>
                                    </div>
                                ) : (
                                    <div>
                                        {feedbacks.map(fb => (
                                            <div key={fb.id} style={{
                                                background: '#1e293b', borderRadius: 10, padding: '10px 14px',
                                                marginBottom: 8, border: '1px solid #334155',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <div style={{ fontSize: 12 }}>
                                                        <span style={{ color: '#818cf8' }}>{fb.fromName}</span>
                                                        <span style={{ color: '#64748b' }}> → </span>
                                                        <span style={{ color: '#4ade80' }}>{fb.toName}</span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                                        {fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleDateString('th-TH') : ''}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                                    {RADAR_AXES.map((axis, i) => (
                                                        <span key={i} style={{
                                                            fontSize: 11, background: '#0f172a', borderRadius: 6,
                                                            padding: '2px 8px', color: '#a78bfa',
                                                        }}>
                                                            {axis}: {fb.scores?.[i] ?? '?'}/10
                                                        </span>
                                                    ))}
                                                </div>
                                                {fb.comment && (
                                                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                                                        "{fb.comment}"
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Radar Chart Tab ───────────────────────────────── */}
                        {tab === 'chart' && (
                            <div>
                                <div style={{
                                    background: '#1e293b', borderRadius: 14, padding: 20,
                                    border: '1px solid #334155', textAlign: 'center', marginBottom: 16,
                                }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                                        📊 AI Radar Chart ของคุณ
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                                        จากค่าเฉลี่ย Peer Feedback {myFeedbacks.length} รายการ
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                        <_RadarMini scores={avgRadar} size={180} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'left' }}>
                                        {RADAR_AXES.map((axis, i) => (
                                            <div key={i} style={{
                                                background: '#0f172a', borderRadius: 8, padding: '8px 10px',
                                            }}>
                                                <div style={{ fontSize: 11, color: '#64748b' }}>{axis}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                    <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2 }}>
                                                        <div style={{
                                                            height: '100%', width: `${avgRadar[i] * 10}%`,
                                                            background: '#6366f1', borderRadius: 2,
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>
                                                        {avgRadar[i]}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {myFeedbacks.length === 0 && (
                                        <p style={{ color: '#475569', fontSize: 13, marginTop: 12 }}>
                                            ยังไม่มี Peer Feedback สำหรับคุณ
                                        </p>
                                    )}
                                </div>

                                {/* Per member summary */}
                                <div style={{ background: '#1e293b', borderRadius: 14, padding: 16, border: '1px solid #334155' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>สรุปคะแนนเฉลี่ยของสมาชิก</div>
                                    {members.map(m => {
                                        const mFb = feedbacks.filter(f => f.toUid === m.uid);
                                        if (!mFb.length) return null;
                                        const avg = Math.round(mFb.reduce((sum, f) => sum + f.scores.reduce((a, b) => a + b, 0) / f.scores.length, 0) / mFb.length * 10) / 10;
                                        return (
                                            <div key={m.uid} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                background: '#0f172a', borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                                            }}>
                                                <span style={{ fontSize: 13, color: m.uid === uid ? '#93c5fd' : '#e2e8f0' }}>
                                                    {m.uid === uid ? '👤 คุณ' : '👤'} {m.name}
                                                </span>
                                                <span style={{ fontSize: 14, fontWeight: 800, color: '#818cf8' }}>
                                                    ⭐ {avg}/10
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

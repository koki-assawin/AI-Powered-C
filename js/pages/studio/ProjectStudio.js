/**
 * js/pages/studio/ProjectStudio.js — หน้า #/studio/project?course= (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: D (ออกแบบเพื่อผู้ใช้จริง), C (ทีม + ประเมินโดยเพื่อน)
 * นักเรียนที่ปลดล็อกขั้น "สร้าง" แล้วทำโปรเจกต์กับทีม (จาก TeamSync) ผ่านบอร์ด 5 ขั้น
 * มี Design Coach ถามนำ, Web App Runner สำหรับ Kit A, ประเมินทีมอื่นตามรูบริก และดูผลประเมินจากครู/เพื่อน
 */

const _PSP_card = { background: '#fff', border: '1px solid #D1C4E9', borderRadius: 16, padding: 16 };

const PsStageForm = ({ stage, project, readOnly, onSave }) => {
    const [vals, setVals] = React.useState((project.data && project.data[stage.key]) || {});
    const [saving, setSaving] = React.useState(false);
    const [msg, setMsg] = React.useState('');
    React.useEffect(() => { setVals((project.data && project.data[stage.key]) || {}); setMsg(''); }, [stage.key, project.id]);
    const kit = project.kit || 'A';
    const set = (k, v) => setVals(x => ({ ...x, [k]: v }));
    const save = async () => {
        setSaving(true); setMsg('');
        try { await onSave(stage.key, vals); setMsg('✅ บันทึกแล้ว'); }
        catch (err) { setMsg('บันทึกไม่สำเร็จ: ' + err.message); }
        finally { setSaving(false); }
    };
    return (
        <div className="space-y-3">
            {stage.fields.filter(f => !f.kitOnly || f.kitOnly === kit).map(f => (
                <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}{(f.required || f.min) && <span className="text-pink-500"> *</span>}</label>
                    {f.type === 'list' ? (
                        <div className="space-y-1">
                            {Array.from({ length: Math.max((vals[f.key] || []).length + (readOnly ? 0 : 1), f.min || 1) }).map((_, i) => (
                                <input key={i} value={(vals[f.key] || [])[i] || ''} readOnly={readOnly} placeholder={`${f.placeholder || ''} ${i + 1}`}
                                    onChange={e => { const arr = [...(vals[f.key] || [])]; arr[i] = e.target.value; set(f.key, arr); }}
                                    className="k-input text-sm" style={{ padding: '8px 12px' }} />
                            ))}
                        </div>
                    ) : f.type === 'textarea' ? (
                        <textarea value={vals[f.key] || ''} readOnly={readOnly} rows={3} onChange={e => set(f.key, e.target.value)} className="k-input text-sm" placeholder={f.placeholder || ''} />
                    ) : (
                        <input value={vals[f.key] || ''} readOnly={readOnly} onChange={e => set(f.key, e.target.value)} className="k-input text-sm" placeholder={f.placeholder || ''} style={{ padding: '8px 12px' }} />
                    )}
                </div>
            ))}
            {!readOnly && (
                <div className="flex items-center gap-2">
                    <button onClick={save} disabled={saving} className="k-btn-pink text-sm px-4 py-1.5">{saving ? 'กำลังบันทึก...' : `💾 บันทึกขั้น${stage.title}`}</button>
                    {msg && <span className="text-xs">{msg}</span>}
                </div>
            )}
        </div>
    );
};

const PsReviewView = ({ rubric, review, members, memberNames }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-xs">
            <thead><tr className="text-left text-gray-500 border-b"><th className="py-1 pr-2">เกณฑ์</th><th className="pr-2">ระดับ</th><th>ความเห็น</th></tr></thead>
            <tbody>
                {rubric.criteria.filter(c => c.scope === 'team').map(c => (
                    <tr key={c.id} className="border-b align-top">
                        <td className="py-1 pr-2">{c.title}</td>
                        <td className="pr-2 font-semibold">{review.team && review.team[c.id] ? `${review.team[c.id].level}/4` : '-'}</td>
                        <td className="text-gray-600">{review.team && review.team[c.id] ? review.team[c.id].comment : ''}</td>
                    </tr>
                ))}
                {review.individual && (members || []).map(uid => (
                    <tr key={uid} className="border-b align-top">
                        <td className="py-1 pr-2">ความเข้าใจโค้ด — {(memberNames || {})[uid] || uid}</td>
                        <td className="pr-2 font-semibold">{review.individual[uid] && review.individual[uid].level != null ? `${review.individual[uid].level}/4` : '-'}</td>
                        <td className="text-gray-600">{review.individual[uid] ? review.individual[uid].comment : ''}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ProjectStudio = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const courseId = params.get('course');
    const uid = userDoc && userDoc.id;
    const [course, setCourse] = React.useState(null);
    const [gate, setGate] = React.useState(null);
    const [team, setTeam] = React.useState(undefined);
    const [project, setProject] = React.useState(undefined);
    const [versions, setVersions] = React.useState([]);
    const [stageKey, setStageKey] = React.useState('empathize');
    const [view, setView] = React.useState('board');
    const [title, setTitle] = React.useState('');
    const [coach, setCoach] = React.useState(null);
    const [coachBusy, setCoachBusy] = React.useState(false);
    const [rubric, setRubric] = React.useState(PS_DEFAULT_RUBRIC);
    const [others, setOthers] = React.useState([]);
    const [peerTarget, setPeerTarget] = React.useState(null);
    const [feedback, setFeedback] = React.useState(null);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!uid || !courseId) return;
        (async () => {
            try {
                const cs = await db.collection('courses').doc(courseId).get();
                if (!cs.exists) { setError('ไม่พบรายวิชา'); return; }
                const c = { id: cs.id, ...cs.data() };
                setCourse(c);
                if (!hasFeature(c, 'projectStudio')) return;
                const [g, t, r] = await Promise.all([psCheckUnlocked(c, uid), psLoadMyTeam(uid), psLoadRubric(c)]);
                setGate(g); setTeam(t); setRubric(r);
                if (t) {
                    const p = await psLoadProject(c.id, t.id);
                    setProject(p);
                    if (p) setVersions(await psLoadVersions(p.id));
                } else setProject(null);
            } catch (err) { setError(err.message); }
        })();
    }, [uid, courseId]);

    const loadOthers = async () => {
        const s = await db.collection('studio_projects').where('courseId', '==', courseId).get();
        setOthers(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !team || p.teamId !== team.id));
    };
    const loadFeedback = async () => {
        if (!project) return;
        const [t, peers] = await Promise.all([
            db.collection('studio_reviews').doc(psReviewId(project.id, 'teacher')).get().catch(() => null),
            db.collection('studio_reviews').where('projectId', '==', project.id).where('reviewerType', '==', 'peer').get().catch(() => ({ docs: [] })),
        ]);
        setFeedback({ teacher: t && t.exists ? t.data() : null, peers: peers.docs.map(d => d.data()) });
    };
    React.useEffect(() => { if (view === 'peer') loadOthers(); if (view === 'feedback') loadFeedback(); }, [view]);

    const create = async () => {
        try { setProject(await psCreateProject(course, team, uid, title)); }
        catch (err) { setError('สร้างโปรเจกต์ไม่สำเร็จ: ' + err.message); }
    };
    const saveStage = async (key, vals) => setProject(await psSaveStage(project, key, vals, team));
    const setKit = async (kit) => setProject(await psSaveStage(project, 'prototype', (project.data && project.data.prototype) || {}, team, { kit }));
    const saveVersion = async (code, note) => {
        await psSaveVersion(project, code, note, uid);
        setVersions(await psLoadVersions(project.id));
        setProject(p => ({ ...p, versionCount: (p.versionCount || 0) + 1 }));
    };
    const askCoach = async () => {
        setCoachBusy(true);
        try { setCoach({ stage: stageKey, ...(await psDesignCoach(project, stageKey, uid)) }); }
        finally { setCoachBusy(false); }
    };

    const shell = (children) => (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="APCC Studio — Project Studio" />
            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: '#4527A0' }}>🛠️ Project Studio</h1>
                        {course && <div className="text-sm text-gray-500">{course.title}</div>}
                    </div>
                    <a href="#/student/dashboard" className="text-sm underline" style={{ color: '#5E35B1' }}>← แดชบอร์ด</a>
                </div>
                {error && <div className="p-3 rounded-xl mb-4 text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}
                {children}
            </main>
        </div>
    );

    if (!courseId) return shell(<div style={_PSP_card}>ไม่ได้ระบุรายวิชา</div>);
    if (!course || (hasFeature(course, 'projectStudio') && (gate === null || team === undefined || project === undefined)))
        return shell(error ? null : <Spinner text="กำลังโหลด Project Studio..." />);
    if (!hasFeature(course, 'projectStudio')) return shell(<div style={_PSP_card}>รายวิชานี้ไม่ได้เปิด Project Studio</div>);

    if (!gate.unlocked) {
        const g = gate.progress && gate.progress.gates.find(x => x.gateId === gate.progress.nextGateId);
        return shell(
            <div style={_PSP_card}>
                <div className="text-lg font-bold mb-2">🔒 ยังไม่ปลดล็อกขั้น "สร้าง"</div>
                <p className="text-sm text-gray-600 mb-3">ผ่านด่านทักษะให้ครบก่อน แล้วจึงสร้างนวัตกรรมกับทีม{g ? ` — ด่านถัดไป: ${g.name} (${Math.min(g.passed, g.need)}/${g.need})` : ''}</p>
                <a href={`#/student/workspace?course=${course.id}`} className="k-btn-pink text-sm px-4 py-2 inline-block">ไปฝึกต่อ →</a>
            </div>
        );
    }
    if (!team) {
        return shell(
            <div style={_PSP_card}>
                <div className="text-lg font-bold mb-2">👥 ต้องมีทีมก่อน</div>
                <p className="text-sm text-gray-600 mb-3">สร้างทีมหรือเข้าร่วมทีมด้วยรหัสทีมที่หน้า TeamSync แล้วกลับมาที่หน้านี้</p>
                <a href="#/student/team" className="k-btn-pink text-sm px-4 py-2 inline-block">ไปที่ TeamSync →</a>
            </div>
        );
    }
    if (!project) {
        return shell(
            <div style={_PSP_card}>
                <div className="text-lg font-bold mb-1">✨ เริ่มโปรเจกต์ของทีม "{team.name}"</div>
                <p className="text-sm text-gray-600 mb-3">สมาชิก: {Object.values(team.memberNames || {}).join(', ')}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input value={title} onChange={e => setTitle(e.target.value)} className="k-input text-sm" placeholder="ชื่อโปรเจกต์ (เปลี่ยนภายหลังได้)" />
                    <button onClick={create} className="k-btn-pink text-sm px-4 py-2 whitespace-nowrap">🚀 สร้างโปรเจกต์</button>
                </div>
            </div>
        );
    }

    const prog = psProgress(project);
    const stage = PS_STAGES.find(s => s.key === stageKey);
    const viewBtn = (k, l) => (
        <button key={k} onClick={() => setView(k)} className="px-4 py-2 text-sm font-semibold rounded-t-lg"
            style={view === k ? { background: '#fff', color: '#4527A0', borderBottom: '2px solid #7E57C2' } : { color: '#9e9e9e' }}>{l}</button>
    );

    return shell(<>
        <div style={_PSP_card} className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="font-bold text-gray-800">{project.title}</div>
                    <div className="text-xs text-gray-500">ทีม {project.teamName} · {Object.values(project.memberNames || {}).join(', ')} · {PS_KITS[project.kit || 'A']}</div>
                </div>
                <div className="text-xs text-gray-500">ครบ {prog.filter(p => p.done).length}/5 ขั้น · ต้นแบบ {project.versionCount || 0} รุ่น</div>
            </div>
        </div>
        <div className="flex gap-1 border-b mb-4 overflow-x-auto">{[viewBtn('board', '🗂️ บอร์ดโปรเจกต์'), viewBtn('peer', '👀 ประเมินทีมอื่น'), viewBtn('feedback', '📝 ผลประเมิน')]}</div>

        {view === 'board' && <>
            <div className="flex flex-wrap gap-2 mb-4">
                {PS_STAGES.map((s, i) => (
                    <button key={s.key} onClick={() => { setStageKey(s.key); setCoach(null); }}
                        className="flex-1 min-w-[120px] rounded-xl py-2 px-2 text-xs font-semibold"
                        style={stageKey === s.key ? { background: 'linear-gradient(135deg,#7E57C2,#5E35B1)', color: '#fff' } : prog[i].done ? { background: '#E8F5E9', color: '#2E7D32' } : { background: '#fff', color: '#616161', border: '1px solid #E0E0E0' }}>
                        {i + 1}. {s.icon} {s.title}{prog[i].done ? ' ✓' : ''}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2" style={_PSP_card}>
                    <div className="font-bold mb-3" style={{ color: '#4527A0' }}>{stage.icon} {stage.title}</div>
                    {stageKey === 'prototype' && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {Object.entries(PS_KITS).map(([k, l]) => (
                                <button key={k} onClick={() => setKit(k)} className="text-xs px-3 py-1.5 rounded-full"
                                    style={(project.kit || 'A') === k ? { background: '#7E57C2', color: '#fff' } : { background: '#fff', color: '#5E35B1', border: '1px solid #D1C4E9' }}>{l}</button>
                            ))}
                        </div>
                    )}
                    <PsStageForm stage={stage} project={project} onSave={saveStage} />
                </div>
                <div style={_PSP_card}>
                    <div className="font-bold mb-2" style={{ color: '#4527A0' }}>🧭 Design Coach</div>
                    <p className="text-xs text-gray-500 mb-2">โค้ชถามคำถามชวนคิด ไม่ทำงานแทนทีม</p>
                    <button onClick={askCoach} disabled={coachBusy} className="k-btn-outline text-sm px-3 py-1.5 w-full">{coachBusy ? 'กำลังคิด...' : `ขอคำถามชวนคิด: ${stage.title}`}</button>
                    {coach && coach.stage === stageKey && (
                        <div className="mt-3 text-sm whitespace-pre-line text-gray-700 p-3 rounded-lg" style={{ background: '#F3F0FF' }}>
                            {coach.text}
                            {coach.source === 'bank' && <div className="text-xs text-gray-400 mt-2">(คำถามจากคลังของครู — AI ใช้ไม่ได้ขณะนี้)</div>}
                        </div>
                    )}
                </div>
            </div>
            {stageKey === 'prototype' && (project.kit || 'A') === 'A' && (
                <div className="mt-4">
                    <div className="font-bold mb-2" style={{ color: '#4527A0' }}>🌐 เว็บแอปของทีม (Kit A)</div>
                    <WebAppRunner initialCode={versions[0] ? versions[0].code : null} versions={versions}
                        onSaveVersion={saveVersion} courseId={course.id} projectId={project.id} />
                </div>
            )}
        </>}

        {view === 'peer' && (
            <div style={_PSP_card}>
                {!peerTarget ? <>
                    <p className="text-sm text-gray-600 mb-3">เลือกทีมเพื่อดูผลงานและให้คำแนะนำตามรูบริก (ไม่มีผลกับคะแนนของเพื่อน)</p>
                    {others.length === 0 && <div className="text-sm text-gray-400">ยังไม่มีทีมอื่นในรายวิชา</div>}
                    {others.map(p => (
                        <button key={p.id} onClick={() => setPeerTarget(p)} className="w-full text-left p-3 mb-2 rounded-xl hover:bg-purple-50" style={{ border: '1px solid #EDE7F6' }}>
                            <div className="font-semibold text-sm">{p.title}</div>
                            <div className="text-xs text-gray-500">ทีม {p.teamName} · ครบ {psProgress(p).filter(x => x.done).length}/5 ขั้น</div>
                        </button>
                    ))}
                </> : <PsPeerReview project={peerTarget} rubric={rubric} uid={uid} onBack={() => setPeerTarget(null)} />}
            </div>
        )}

        {view === 'feedback' && (
            <div className="space-y-4">
                <div style={_PSP_card}>
                    <div className="font-bold mb-2" style={{ color: '#4527A0' }}>👩‍🏫 ผลประเมินจากครู</div>
                    {!feedback ? <Spinner text="กำลังโหลด..." /> : feedback.teacher && feedback.teacher.published
                        ? <PsReviewView rubric={rubric} review={feedback.teacher} members={project.members} memberNames={project.memberNames} />
                        : <div className="text-sm text-gray-400">ครูยังไม่ได้เผยแพร่ผลประเมิน</div>}
                </div>
                <div style={_PSP_card}>
                    <div className="font-bold mb-2" style={{ color: '#4527A0' }}>👀 คำแนะนำจากเพื่อน ({feedback ? feedback.peers.length : 0})</div>
                    {feedback && feedback.peers.map((r, i) => (
                        <div key={i} className="text-sm p-2 mb-2 rounded-lg" style={{ background: '#FAFAFA' }}>
                            <div className="text-xs text-gray-500">{rubric.criteria.filter(c => c.scope === 'team').map(c => `${c.title} ${r.team && r.team[c.id] ? r.team[c.id].level : '-'}/4`).join(' · ')}</div>
                            {r.comment && <div className="mt-1">💬 {r.comment}</div>}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </>);
};

const PsPeerReview = ({ project, rubric, uid, onBack }) => {
    const crit = rubric.criteria.filter(c => c.scope === 'team');
    const [team, setTeam] = React.useState({});
    const [comment, setComment] = React.useState('');
    const [versions, setVersions] = React.useState(null);
    const [done, setDone] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    React.useEffect(() => {
        psLoadVersions(project.id).then(setVersions).catch(() => setVersions([]));
        db.collection('studio_reviews').doc(psReviewId(project.id, 'peer', uid)).get()
            .then(s => { if (s.exists) { setTeam(s.data().team || {}); setComment(s.data().comment || ''); setDone(true); } }).catch(() => {});
    }, [project.id]);
    const submit = async () => {
        setBusy(true);
        try { await psSavePeerReview(project, uid, team, comment); setDone(true); }
        catch (err) { alert('ส่งไม่สำเร็จ: ' + err.message); }
        finally { setBusy(false); }
    };
    const d = project.data || {};
    return (
        <div>
            <button onClick={onBack} className="text-sm underline mb-3" style={{ color: '#5E35B1' }}>← รายชื่อทีม</button>
            <div className="font-bold">{project.title}</div>
            <div className="text-xs text-gray-500 mb-3">ทีม {project.teamName}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                <div><b>ปัญหา:</b> {(d.define && d.define.problemStatement) || '-'}</div>
                <div><b>แนวทาง:</b> {(d.ideate && d.ideate.chosenIdea) || '-'}</div>
            </div>
            {project.kit !== 'B' && versions && versions.length > 0 && (
                <div className="mb-4"><WebAppRunner initialCode={versions[0].code} readOnly height={380} courseId={project.courseId} projectId={project.id} /></div>
            )}
            {project.kit === 'B' && d.prototype && d.prototype.colabUrl && <a className="text-sm underline" href={d.prototype.colabUrl} target="_blank" rel="noopener">เปิด Colab ของทีม ↗</a>}
            <div className="mt-3 space-y-2">
                {crit.map(c => (
                    <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                        <span className="sm:w-48 font-medium">{c.title}</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(l => (
                                <button key={l} title={c.levels[l - 1]} onClick={() => setTeam(t => ({ ...t, [c.id]: { level: l } }))}
                                    className="w-9 h-8 rounded-lg text-sm font-semibold"
                                    style={team[c.id] && team[c.id].level === l ? { background: '#7E57C2', color: '#fff' } : { background: '#F5F5F5', color: '#616161' }}>{l}</button>
                            ))}
                        </div>
                        <span className="text-xs text-gray-400">{team[c.id] ? c.levels[team[c.id].level - 1] : ''}</span>
                    </div>
                ))}
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} className="k-input text-sm" placeholder="สิ่งที่ชอบ และข้อเสนอแนะ 1 ข้อ" />
                <button onClick={submit} disabled={busy || crit.some(c => !team[c.id])} className="k-btn-pink text-sm px-4 py-1.5">
                    {busy ? 'กำลังส่ง...' : done ? '💾 แก้ไขคำแนะนำ' : '📨 ส่งคำแนะนำ'}
                </button>
                {done && <span className="text-xs text-green-700 ml-2">✅ ส่งแล้ว</span>}
            </div>
        </div>
    );
};

window.ProjectStudio = ProjectStudio;
window.PsReviewView = PsReviewView;

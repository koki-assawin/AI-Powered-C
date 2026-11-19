/**
 * js/pages/studio/RubricReview.js — หน้า #/teacher/studio/projects?course= (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: C (ประเมินตามรูบริก + เพื่อน), D
 * ครู: ดูโปรเจกต์ทุกทีมพร้อมหลักฐาน (บอร์ด 5 ขั้น, เว็บแอปรุ่นล่าสุด, Explain-Back รายคน, คำแนะนำจากเพื่อน)
 *      → ให้ AI/เกณฑ์หลักฐานร่างคะแนนและความเห็น → ครูแก้และยืนยัน → เผยแพร่ให้ทีมเห็น → ส่งออก CSV สำหรับ SGS
 */

const RubricReview = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const [courses, setCourses] = React.useState([]);
    const [courseId, setCourseId] = React.useState(params.get('course') || '');
    const [rubric, setRubric] = React.useState(PS_DEFAULT_RUBRIC);
    const [projects, setProjects] = React.useState(null);
    const [reviews, setReviews] = React.useState({});
    const [eb, setEb] = React.useState({});
    const [users, setUsers] = React.useState({});
    const [sel, setSel] = React.useState(null);
    const [msg, setMsg] = React.useState('');

    const course = courses.find(c => c.id === courseId) || null;

    React.useEffect(() => {
        if (!userDoc) return undefined;
        let alive = true;   // ผู้ใช้อาจเปลี่ยนหน้าก่อนโหลดรายวิชาเสร็จ
        Promise.all([
            db.collection('courses').where('teacherId', '==', userDoc.id).get(),
            db.collection('courses').where('coTeacherIds', 'array-contains', userDoc.id).get(),
        ]).then(([own, co]) => {
            if (!alive) return;
            const seen = new Set(), list = [];
            [...own.docs, ...co.docs].forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); list.push({ id: d.id, ...d.data() }); } });
            const studio = list.filter(c => hasFeature(c, 'projectStudio') || hasFeature(c, 'rubricReview'));
            setCourses(studio);
            if (!courseId && studio.length) setCourseId(studio[0].id);
        });
        return () => { alive = false; };
    }, [userDoc]);

    const aliveRef = React.useRef(true);
    React.useEffect(() => () => { aliveRef.current = false; }, []);
    const load = React.useCallback(async () => {
        if (!course) return;
        setProjects(null); setSel(null); setMsg('');
        const [r, ps, rv, ebs] = await Promise.all([
            psLoadRubric(course),
            db.collection('studio_projects').where('courseId', '==', course.id).get(),
            db.collection('studio_reviews').where('courseId', '==', course.id).get(),
            db.collection('studio_explainBack').where('courseId', '==', course.id).get(),
        ]);
        if (!aliveRef.current) return;
        setRubric(r);
        const list = ps.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.teamName || '').localeCompare(b.teamName || '', 'th'));
        const byProject = {}, peers = {};
        rv.docs.forEach(d => {
            const x = d.data();
            if (x.reviewerType === 'teacher') byProject[x.projectId] = x;
            else (peers[x.projectId] = peers[x.projectId] || []).push(x);
        });
        const ebByUid = {};
        ebs.docs.forEach(d => { const x = d.data(); (ebByUid[x.uid] = ebByUid[x.uid] || []).push(x); });
        const uids = [...new Set(list.flatMap(p => p.members || []))];
        const us = {};
        await Promise.all(uids.map(u => db.collection('users').doc(u).get().then(s => { if (s.exists) us[u] = s.data(); }).catch(() => {})));
        if (!aliveRef.current) return;   // ผู้ใช้เปลี่ยนหน้าไปแล้ว
        setReviews({ teacher: byProject, peers }); setEb(ebByUid); setUsers(us); setProjects(list);
    }, [course && course.id]);
    React.useEffect(() => { load(); }, [load]);

    const exportCsv = () => {
        const csv = psBuildCsv(rubric, projects, reviews.teacher || {}, users);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `rubric_${(course.title || course.id).replace(/[\\/:*?"<>|\s]+/g, '_')}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        logStudioEvent('rubric_export', course.id, { projects: projects.length });
        setMsg(`✅ ส่งออก CSV แล้ว (${projects.reduce((s, p) => s + (p.members || []).length, 0)} แถว)`);
    };

    return (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="APCC Studio — ประเมินโปรเจกต์" />
            <main className="max-w-6xl mx-auto px-4 py-6">
                <h1 className="text-xl font-bold mb-4" style={{ color: '#4527A0' }}>🏅 ประเมินโปรเจกต์ตามรูบริก</h1>
                <select value={courseId} onChange={e => setCourseId(e.target.value)} className="k-input mb-4" style={{ paddingLeft: 8 }}>
                    {courses.length === 0 && <option value="">— ยังไม่มีรายวิชาที่เปิด Project Studio —</option>}
                    {courses.map(c => <option key={c.id} value={c.id}>🎨 {courseLabel(c)}</option>)}
                </select>
                {msg && <div className="p-3 rounded-xl mb-4 text-sm bg-white border">{msg}</div>}
                {course && !projects && <Spinner text="กำลังโหลดโปรเจกต์..." />}
                {projects && !sel && (
                    <div className="bg-white rounded-2xl p-4 overflow-x-auto" style={{ border: '1px solid #FFD1DC' }}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <span className="text-sm text-gray-500">{projects.length} โปรเจกต์ · {rubric.title}</span>
                            <button onClick={exportCsv} disabled={!projects.length} className="k-btn-outline text-sm px-3 py-1.5">⬇️ ส่งออกคะแนน CSV (SGS)</button>
                        </div>
                        <table className="w-full text-xs">
                            <thead><tr className="text-left text-gray-500 border-b"><th className="py-2 pr-2">ทีม</th><th className="pr-2">โปรเจกต์</th><th className="pr-2">ขั้นที่ครบ</th><th className="pr-2">ต้นแบบ</th><th className="pr-2">เพื่อนแนะนำ</th><th className="pr-2">ผลประเมิน</th><th></th></tr></thead>
                            <tbody>
                                {projects.length === 0 && <tr><td colSpan="7" className="py-4 text-center text-gray-400">ยังไม่มีทีมสร้างโปรเจกต์</td></tr>}
                                {projects.map(p => {
                                    const r = reviews.teacher[p.id];
                                    return (
                                        <tr key={p.id} className="border-b">
                                            <td className="py-1.5 pr-2">{p.teamName}<div className="text-gray-400">{Object.values(p.memberNames || {}).join(', ')}</div></td>
                                            <td className="pr-2">{p.title}</td>
                                            <td className="pr-2">{psProgress(p).map(x => x.done ? '✅' : '⬜').join('')}</td>
                                            <td className="pr-2">{p.kit === 'B' ? 'Kit B' : `${p.versionCount || 0} รุ่น`}</td>
                                            <td className="pr-2">{(reviews.peers[p.id] || []).length}</td>
                                            <td className="pr-2">{r ? (r.published ? '📢 เผยแพร่แล้ว' : '📝 ร่าง') : '—'}</td>
                                            <td><button onClick={() => setSel(p)} className="k-btn-pink text-xs px-3 py-1">ประเมิน</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {sel && <RrProjectReview project={sel} rubric={rubric} existing={reviews.teacher[sel.id]} peers={reviews.peers[sel.id] || []}
                    eb={eb} users={users} uid={userDoc.id} onBack={() => { setSel(null); load(); }} />}
            </main>
        </div>
    );
};

const RrProjectReview = ({ project, rubric, existing, peers, eb, users, uid, onBack }) => {
    const [versions, setVersions] = React.useState(null);
    const [team, setTeam] = React.useState((existing && existing.team) || {});
    const [indiv, setIndiv] = React.useState((existing && existing.individual) || {});
    const [published, setPublished] = React.useState(!!(existing && existing.published));
    const [draftSource, setDraftSource] = React.useState((existing && existing.aiDraftSource) || null);
    const [busy, setBusy] = React.useState('');
    const [msg, setMsg] = React.useState('');
    const [showcase, setShowcase] = React.useState(undefined);
    const [blurb, setBlurb] = React.useState('');
    React.useEffect(() => { psLoadVersions(project.id).then(setVersions).catch(() => setVersions([])); }, [project.id]);
    React.useEffect(() => {
        db.collection('studio_showcase').doc(project.id).get()
            .then(s => { setShowcase(s.exists ? s.data() : null); if (s.exists) setBlurb(s.data().blurb || ''); }).catch(() => setShowcase(null));
    }, [project.id]);
    const approveShowcase = async () => {
        setBusy('showcase');
        try {
            await saApproveShowcase(project, uid, blurb);
            setShowcase({ visible: true, blurb });
            setMsg('🌏 อนุมัติขึ้นแกลเลอรีแล้ว — สมาชิกทีมเลื่อนไปขั้น "แบ่งปัน"');
        } catch (err) { setMsg('อนุมัติไม่สำเร็จ: ' + err.message); }
        finally { setBusy(''); }
    };
    const toggleShowcase = async () => {
        setBusy('showcase');
        try { await saHideShowcase(project.id, showcase.visible); setShowcase(s => ({ ...s, visible: !s.visible })); }
        finally { setBusy(''); }
    };

    const crit = rubric.criteria.filter(c => c.scope === 'team');
    const c5 = rubric.criteria.find(c => c.scope === 'individual');
    const members = project.members || [];
    const name = (u) => (users[u] && users[u].displayName) || (project.memberNames || {})[u] || u;

    const draft = async () => {
        setBusy('draft'); setMsg('');
        const ebByUid = Object.fromEntries(members.map(u => [u, eb[u] || []]));
        const d = await psAiDraftReview(project, rubric, ebByUid);
        setTeam(d.team); setIndiv(d.individual); setDraftSource(d.source);
        setMsg(d.source === 'ai' ? '🤖 AI ร่างความเห็นแล้ว — ตรวจและแก้ก่อนบันทึก' : '📋 AI ใช้ไม่ได้ขณะนี้ — ร่างจากหลักฐานในระบบแทน ตรวจและแก้ก่อนบันทึก');
        setBusy('');
    };
    const save = async (pub) => {
        setBusy('save'); setMsg('');
        try {
            const total = await psSaveTeacherReview(project, { team, individual: indiv, published: pub, aiDraftSource: draftSource, createdAt: existing && existing.createdAt }, uid);
            setPublished(pub);
            setMsg(`✅ บันทึกแล้ว${pub ? ' และเผยแพร่ให้ทีมเห็น' : ' (ร่าง ทีมยังไม่เห็น)'} · ${members.map(u => `${name(u)} ${total[u]}/20`).join(' · ')}`);
        } catch (err) { setMsg('บันทึกไม่สำเร็จ: ' + err.message); }
        finally { setBusy(''); }
    };
    const complete = crit.every(c => team[c.id] && team[c.id].level) && members.every(u => indiv[u] && indiv[u].level);
    const lvBtns = (cur, onPick, levels) => (
        <div className="flex gap-1">{[1, 2, 3, 4].map(l => (
            <button key={l} title={levels[l - 1]} onClick={() => onPick(l)} className="w-8 h-8 rounded-lg text-sm font-semibold"
                style={cur === l ? { background: '#7E57C2', color: '#fff' } : { background: '#F5F5F5', color: '#616161' }}>{l}</button>
        ))}</div>
    );
    const d = project.data || {};

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="text-sm underline" style={{ color: '#5E35B1' }}>← รายการโปรเจกต์</button>
            <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #FFD1DC' }}>
                <div className="font-bold text-gray-800">{project.title}</div>
                <div className="text-xs text-gray-500 mb-3">ทีม {project.teamName} · {members.map(name).join(', ')} · {PS_KITS[project.kit || 'A']}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {PS_STAGES.map(s => (
                        <div key={s.key} className="p-2 rounded-lg" style={{ background: '#FAFAFA' }}>
                            <div className="font-semibold mb-1">{s.icon} {s.title} {psStageDone(project, s.key) ? '✅' : '⬜'}</div>
                            {s.fields.filter(f => !f.kitOnly || f.kitOnly === (project.kit || 'A')).map(f => {
                                const v = (d[s.key] || {})[f.key];
                                const txt = Array.isArray(v) ? v.filter(x => (x || '').trim()).map(x => `• ${x}`).join('\n') : v;
                                return txt ? <div key={f.key} className="text-gray-700 whitespace-pre-line mb-1"><span className="text-gray-400">{f.label}: </span>{txt}</div> : null;
                            })}
                        </div>
                    ))}
                </div>
            </div>
            {project.kit !== 'B' && versions && versions.length > 0 && (
                <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #FFD1DC' }}>
                    <div className="font-semibold text-sm mb-2">🌐 เว็บแอปรุ่นล่าสุด ({versions.length} รุ่น)</div>
                    <WebAppRunner initialCode={versions[0].code} versions={versions} readOnly height={420} courseId={project.courseId} projectId={project.id} />
                </div>
            )}
            <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #FFD1DC' }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="font-bold" style={{ color: '#4527A0' }}>🏅 {rubric.title}</div>
                    <button onClick={draft} disabled={!!busy} className="k-btn-outline text-sm px-3 py-1.5">{busy === 'draft' ? 'กำลังร่าง...' : '🤖 ให้ AI ร่างความเห็น'}</button>
                </div>
                {msg && <div className="p-2 rounded-lg mb-3 text-sm" style={{ background: '#F3F0FF' }}>{msg}</div>}
                {crit.map(c => (
                    <div key={c.id} className="mb-3 pb-3 border-b">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <span className="md:w-56 text-sm font-medium">{c.title}</span>
                            {lvBtns(team[c.id] && team[c.id].level, l => setTeam(t => ({ ...t, [c.id]: { ...(t[c.id] || {}), level: l } })), c.levels)}
                            <span className="text-xs text-gray-400">{team[c.id] && team[c.id].level ? c.levels[team[c.id].level - 1] : ''}</span>
                        </div>
                        <input value={(team[c.id] && team[c.id].comment) || ''} onChange={e => setTeam(t => ({ ...t, [c.id]: { ...(t[c.id] || {}), comment: e.target.value } }))}
                            className="k-input text-xs mt-1" style={{ padding: '6px 10px' }} placeholder="ความเห็น (อ้างหลักฐาน)" />
                    </div>
                ))}
                <div className="text-sm font-medium mb-2">{c5.title} (รายบุคคล)</div>
                {members.map(u => (
                    <div key={u} className="mb-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <span className="md:w-56 text-sm">{name(u)} <span className="text-xs text-gray-400">· Explain-Back {(eb[u] || []).length} ครั้ง</span></span>
                            {lvBtns(indiv[u] && indiv[u].level, l => setIndiv(x => ({ ...x, [u]: { ...(x[u] || {}), level: l } })), c5.levels)}
                        </div>
                        <input value={(indiv[u] && indiv[u].comment) || ''} onChange={e => setIndiv(x => ({ ...x, [u]: { ...(x[u] || {}), comment: e.target.value } }))}
                            className="k-input text-xs mt-1" style={{ padding: '6px 10px' }} placeholder="ความเห็น" />
                    </div>
                ))}
                {peers.length > 0 && (
                    <div className="text-xs text-gray-600 mt-3 p-2 rounded-lg" style={{ background: '#FAFAFA' }}>
                        👀 คำแนะนำจากเพื่อน {peers.length} ทีม · เฉลี่ย {crit.map(c => {
                            const v = peers.map(p => p.team && p.team[c.id] && p.team[c.id].level).filter(Boolean);
                            return `${c.title} ${v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-'}`;
                        }).join(' · ')}
                        {peers.filter(p => p.comment).map((p, i) => <div key={i}>💬 {p.comment}</div>)}
                    </div>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => save(false)} disabled={!!busy || !complete} className="k-btn-outline text-sm px-4 py-1.5">💾 บันทึกร่าง</button>
                    <button onClick={() => save(true)} disabled={!!busy || !complete} className="k-btn-pink text-sm px-4 py-1.5">📢 ยืนยันและเผยแพร่ให้ทีม</button>
                    {!complete && <span className="text-xs text-gray-400 self-center">ให้ระดับครบทุกเกณฑ์และทุกคนก่อนบันทึก</span>}
                    {published && <span className="text-xs text-green-700 self-center">เผยแพร่แล้ว</span>}
                </div>
            </div>
            <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #FFD1DC' }}>
                <div className="font-bold mb-2" style={{ color: '#4527A0' }}>🌏 แกลเลอรีผลงาน (ขั้นแบ่งปัน)</div>
                <p className="text-xs text-gray-500 mb-2">อนุมัติแล้วระบบเก็บสำเนาผลงาน ณ วันนี้ไว้ในแกลเลอรีของรายวิชา และเลื่อนสมาชิกทีมไปขั้น "แบ่งปัน"</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input value={blurb} onChange={e => setBlurb(e.target.value)} className="k-input text-sm" style={{ padding: '8px 12px' }} placeholder="คำแนะนำผลงานสั้นๆ (แสดงบนการ์ดแกลเลอรี)" />
                    <button onClick={approveShowcase} disabled={!!busy || showcase === undefined} className="k-btn-pink text-sm px-4 py-1.5 whitespace-nowrap">
                        {busy === 'showcase' ? 'กำลังบันทึก...' : showcase ? '🔄 อัปเดตสำเนาในแกลเลอรี' : '🌏 อนุมัติขึ้นแกลเลอรี'}
                    </button>
                    {showcase && <button onClick={toggleShowcase} disabled={!!busy} className="k-btn-outline text-sm px-3 py-1.5 whitespace-nowrap">{showcase.visible ? '🙈 ซ่อน' : '👁️ แสดง'}</button>}
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-xs">
                    <a className="underline" style={{ color: '#5E35B1' }} href={`#/studio/showcase?course=${project.courseId}`}>เปิดแกลเลอรี ↗</a>
                    {members.map(u => <a key={u} className="underline" style={{ color: '#5E35B1' }} href={`#/studio/portfolio?course=${project.courseId}&uid=${u}`}>📁 พอร์ตโฟลิโอ {name(u)}</a>)}
                </div>
            </div>
        </div>
    );
};

window.RubricReview = RubricReview;

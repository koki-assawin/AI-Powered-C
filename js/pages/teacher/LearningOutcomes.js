// js/pages/teacher/LearningOutcomes.js — แท็บ "ผลลัพธ์ผู้เรียน" ใน Teacher Analytics (v1.0)
//
// ใช้ทำหลักฐานด้านผลลัพธ์การเรียนรู้ของผู้เรียน (รายบุคคล + ภาพรวม) จากข้อมูลจริงใน Firestore
//   - อ่านอย่างเดียวสำหรับข้อมูลการเรียน: ใช้ submissions/grades/enrollments ที่หน้า Analytics โหลดไว้แล้ว
//     และ query เพิ่มเฉพาะโจทย์ที่เลือก (usageEvents, coachInteractions) + QuickPoll ของรายวิชา
//   - เขียนเฉพาะข้อมูลของครูเอง: outcome_presets, outcome_notes, outcome_scores (กฎแยกบล็อกใหม่)
//   - ไม่แสดงวันที่/เวลาในทุกมุมมอง ใช้ "ครั้งที่ n" และรหัสผู้เรียน S01… (เรียงตามเลขที่)
// การคำนวณทั้งหมดอยู่ใน js/learningOutcomes.js (window.LO)

const LO_STATUS = {
    first:     { label: 'ผ่านตั้งแต่ครั้งแรก', color: '#166534', bg: '#bbf7d0' },
    revised:   { label: 'ผ่านหลังแก้ไข',       color: '#1e40af', bg: '#bfdbfe' },
    notyet:    { label: 'ยังไม่ผ่าน',           color: '#9a3412', bg: '#fed7aa' },
    none:      { label: 'ไม่ได้ส่ง',            color: '#6b7280', bg: '#f3f4f6' },
    gradeOnly: { label: 'มีคะแนนแต่ไม่พบการส่ง', color: '#4b5563', bg: '#e5e7eb' },
};
const LO_VERDICT_COLOR = { AC: '#16a34a', WA: '#dc2626', CE: '#7c3aed', RE: '#ea580c', TLE: '#b45309', '': '#9ca3af' };
const LO_GROUP_COLOR = { fast: '#059669', mid: '#d97706', stuck: '#dc2626' };
const LO_VIEWS = [
    { key: 'matrix',  label: '🧮 ตารางผลการส่งรายข้อ' },
    { key: 'path',    label: '🛤️ เส้นทางการส่งงาน' },
    { key: 'card',    label: '🪪 การ์ดรายบุคคล' },
    { key: 'gallery', label: '🖼️ แกลเลอรีผลงาน' },
    { key: 'summary', label: '📈 สรุปภาพรวม' },
    { key: 'import',  label: '📥 นำเข้าคะแนนนอกระบบ' },
];
const LO_FONT = "'Prompt', sans-serif";
const LO_MONO = "'JetBrains Mono', Consolas, monospace";
const loTs = () => firebase.firestore.FieldValue.serverTimestamp();
const loChunks = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
const loDownload = (name, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const loPct = (x) => (Number.isFinite(x) ? x.toFixed(1) + '%' : '–');

const LOVerdict = ({ v, small }) => v ? (
    <span style={{ display: 'inline-block', padding: small ? '0 4px' : '1px 6px', borderRadius: 4, fontSize: small ? 10 : 11, fontWeight: 700,
        color: '#fff', background: LO_VERDICT_COLOR[v] || '#6b7280', fontFamily: LO_MONO }}>{v}</span>
) : <span style={{ color: '#9ca3af' }}>–</span>;

const LOHintLv = ({ lv }) => (
    <span style={{ fontFamily: LO_MONO, fontSize: 11 }}>
        {lv.map((n, i) => <span key={i} style={{ color: n ? '#b45309' : '#d1d5db', marginRight: 3 }}>L{i + 1}:{n}</span>)}
    </span>
);

// ── กราฟ (Chart.js ที่มีอยู่ใน index.html) ─────────────────────────────────
const LOChart = ({ config, height = 260 }) => {
    const ref = React.useRef(null);
    const key = JSON.stringify([config.type, config.data]);
    React.useEffect(() => {
        if (!ref.current) return undefined;
        const ch = new Chart(ref.current, {
            ...config,
            options: { animation: false, responsive: true, maintainAspectRatio: false, ...(config.options || {}) },
        });
        return () => ch.destroy();
    }, [key]);
    return <div style={{ height, position: 'relative' }}><canvas ref={ref} /></div>;
};

// ════════════════════════════════════════════════════════════════════════════
const LearningOutcomesTab = ({ selectedCourse, course, userDoc, assignments = [], submissions = [], submissionsV2 = [],
    grades = [], enrollments = [], students = {}, gradingPolicy = 'best', gradesLocked = false }) => {
    const LO = window.LO;
    const me = userDoc && userDoc.id;

    // ── ตัวกรอง ──
    const [selAids, setSelAids] = React.useState([]);
    const [presets, setPresets] = React.useState([]);
    const [presetId, setPresetId] = React.useState('');
    const [presetName, setPresetName] = React.useState('');
    const [stuMode, setStuMode] = React.useState('all');      // all | group | one
    const [stuGroup, setStuGroup] = React.useState('fast');
    const [stuOne, setStuOne] = React.useState('');
    const [mask, setMask] = React.useState(true);
    const [idMode, setIdMode] = React.useState('studentCode'); // studentCode | name (ใช้เมื่อปิดสวิตช์ปิดชื่อ)
    const [view, setView] = React.useState('matrix');
    const [focus, setFocus] = React.useState({ uid: '', aid: '' });
    const [msg, setMsg] = React.useState('');
    const [err, setErr] = React.useState('');

    // ── ข้อมูลเพิ่ม (แคชในหน่วยความจำต่อรายวิชา) ──
    const usageCache = React.useRef({});   // aid → events[]
    const coachCache = React.useRef({});   // title → docs[]
    const [extraTick, setExtraTick] = React.useState(0);
    const [extraLoading, setExtraLoading] = React.useState(false);
    const [notes, setNotes] = React.useState({});          // uid → {id, text}
    const [scoreDocs, setScoreDocs] = React.useState([]);  // outcome_scores ของครูในรายวิชานี้
    const [polls, setPolls] = React.useState([]);
    const [studio, setStudio] = React.useState(null);      // { reviews, explainBack, projects } เฉพาะรายวิชา Studio

    // ── ผู้เรียน / โจทย์ ──
    const codes = React.useMemo(() => LO.buildCodes(enrollments, students), [enrollments, students]);
    const allUids = React.useMemo(() => codes.list.map(c => c.uid), [codes]);
    const uidSet = React.useMemo(() => new Set(allUids), [allUids]);
    const problemGroups = React.useMemo(() => LO.groupProblems(assignments), [assignments]);
    const aById = React.useMemo(() => { const m = {}; assignments.forEach(a => { m[a.id] = a; }); return m; }, [assignments]);
    const problems = React.useMemo(() => {
        const order = []; problemGroups.forEach(g => g.items.forEach(a => order.push(a.id)));
        return order.filter(id => selAids.includes(id)).map(id => aById[id]);
    }, [selAids, problemGroups, aById]);
    const pCode = (a) => LO.problemCode(a.title) || LO.shortTitle(a.title).slice(0, 12);

    const groups = React.useMemo(() => LO.buildGroups({
        uids: allUids, submissions, submissionsV2, totalAssignments: assignments.length,
        classify: typeof classifyProfile === 'function' ? classifyProfile : undefined,
    }), [allUids, submissions, submissionsV2, assignments]);

    const uids = React.useMemo(() => {
        if (stuMode === 'group') return allUids.filter(u => groups[u] && groups[u].group === stuGroup);
        if (stuMode === 'one') return stuOne ? [stuOne] : [];
        return allUids;
    }, [stuMode, stuGroup, stuOne, allUids, groups]);

    const labelOf = (uid) => {
        const c = codes.byUid[uid];
        if (!c) return uid.slice(0, 6);
        if (mask) return c.code;
        return c.code + ' · ' + (idMode === 'name' ? (c.name || '-') : (c.studentCode || '-'));
    };

    // ── โหลดข้อมูลของครู + QuickPoll + Studio (ครั้งเดียวต่อรายวิชา) ──
    React.useEffect(() => {
        if (!selectedCourse || !me) return;
        let alive = true;
        (async () => {
            try {
                const [pSnap, nSnap, sSnap, pollSnap] = await Promise.all([
                    db.collection('outcome_presets').where('ownerId', '==', me).where('courseId', '==', selectedCourse).get(),
                    db.collection('outcome_notes').where('ownerId', '==', me).where('courseId', '==', selectedCourse).get(),
                    db.collection('outcome_scores').where('ownerId', '==', me).where('courseId', '==', selectedCourse).get(),
                    db.collection('pollSessions').where('courseId', '==', selectedCourse).get(),
                ]);
                if (!alive) return;
                setPresets(pSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th')));
                const nm = {}; nSnap.docs.forEach(d => { const x = d.data(); nm[x.studentId] = { id: d.id, text: x.text || '' }; });
                setNotes(nm);
                setScoreDocs(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setPolls(pollSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter(p => p.snapshot && p.snapshot.type === 'choice')
                    .sort((a, b) => LO.tsSec(a.taughtOn) - LO.tsSec(b.taughtOn)));
            } catch (e) {
                // ถ้ายังไม่ได้ deploy กฎของ outcome_* จะอ่านไม่ได้ แต่ส่วนที่เหลือของแท็บยังใช้ได้
                if (alive) setErr('โหลด preset/บันทึก/คะแนนนำเข้าไม่สำเร็จ: ' + (e.message || e) + ' (ตรวจว่า deploy firestore.rules แล้ว)');
            }
            try {
                if (course && course.studio && course.studio.enabled === true) {
                    const [r, eb, pj] = await Promise.all([
                        db.collection('studio_reviews').where('courseId', '==', selectedCourse).get(),
                        db.collection('studio_explainBack').where('courseId', '==', selectedCourse).get(),
                        db.collection('studio_projects').where('courseId', '==', selectedCourse).get(),
                    ]);
                    if (alive) setStudio({
                        reviews: r.docs.map(d => ({ id: d.id, ...d.data() })),
                        explainBack: eb.docs.map(d => ({ id: d.id, ...d.data() })),
                        projects: pj.docs.map(d => ({ id: d.id, ...d.data() })),
                    });
                }
            } catch (e) { console.warn('[outcomes] studio', e); }
        })();
        return () => { alive = false; };
    }, [selectedCourse, me]);

    // ── usageEvents / coachInteractions เฉพาะโจทย์ที่เลือก ──
    React.useEffect(() => {
        const needAids = selAids.filter(id => !usageCache.current[id]);
        const needTitles = selAids.map(id => aById[id] && aById[id].title).filter(t => t && !coachCache.current[t]);
        if (!needAids.length && !needTitles.length) return;
        let alive = true;
        setExtraLoading(true);
        (async () => {
            try {
                for (const ch of loChunks(needAids, 10)) {
                    const snap = await db.collection('usageEvents').where('assignmentId', 'in', ch).get();
                    ch.forEach(id => { usageCache.current[id] = []; });
                    snap.docs.forEach(d => { const x = d.data(); if (usageCache.current[x.assignmentId]) usageCache.current[x.assignmentId].push(x); });
                }
                for (const ch of loChunks(needTitles, 10)) {
                    const snap = await db.collection('coachInteractions').where('relatedId', 'in', ch).get();
                    ch.forEach(t => { coachCache.current[t] = []; });
                    snap.docs.forEach(d => { const x = d.data(); if (coachCache.current[x.relatedId]) coachCache.current[x.relatedId].push(x); });
                }
            } catch (e) { if (alive) setErr('โหลดข้อมูลคำใบ้/การรันไม่สำเร็จ: ' + (e.message || e)); }
            finally { if (alive) { setExtraLoading(false); setExtraTick(t => t + 1); } }
        })();
        return () => { alive = false; };
    }, [selAids, aById]);

    // ── คำนวณ ──
    const usage = React.useMemo(() => {
        const ev = []; selAids.forEach(id => (usageCache.current[id] || []).forEach(e => ev.push(e)));
        return LO.indexUsage(ev, uidSet, new Set(selAids));
    }, [selAids, uidSet, extraTick]);
    const coach = React.useMemo(() => {
        const docs = []; const t2a = {};
        selAids.forEach(id => { const a = aById[id]; if (!a) return; t2a[a.title] = id; (coachCache.current[a.title] || []).forEach(x => docs.push(x)); });
        return LO.indexCoach(docs, uidSet, t2a);
    }, [selAids, aById, uidSet, extraTick]);
    const matrix = React.useMemo(() => LO.buildMatrix({
        codes, uids: allUids, problems, submissions, submissionsV2, grades, gradingPolicy, usage,
    }), [codes, allUids, problems, submissions, submissionsV2, grades, gradingPolicy, usage]);
    const reconcile = React.useMemo(() => LO.reconcileWithE1({
        matrix, uids: allUids, problems, e1Input: { submissions, submissionsV2, grades, gradingPolicy },
    }), [matrix, allUids, problems]);
    const scoreDoc = React.useMemo(() => scoreDocs.find(d => d.presetId === presetId) || null, [scoreDocs, presetId]);
    const scoreByUid = React.useMemo(() => { const m = {}; ((scoreDoc && scoreDoc.rows) || []).forEach(r => { m[r.uid] = r; }); return m; }, [scoreDoc]);

    // ── preset ──
    const applyPreset = (id) => {
        setPresetId(id);
        const p = presets.find(x => x.id === id);
        if (p) { setSelAids((p.assignmentIds || []).filter(a => aById[a])); setPresetName(p.name || ''); }
        else setPresetName('');
    };
    const savePreset = async () => {
        const name = presetName.trim();
        if (!name) { setMsg('ตั้งชื่อ preset ก่อนบันทึก'); return; }
        if (!selAids.length) { setMsg('เลือกโจทย์อย่างน้อย 1 ข้อ'); return; }
        try {
            const same = presets.find(p => p.name === name);
            const data = { ownerId: me, courseId: selectedCourse, name, assignmentIds: problems.map(p => p.id), updatedAt: loTs() };
            let id;
            if (same) { await db.collection('outcome_presets').doc(same.id).set(data, { merge: true }); id = same.id; }
            else { const ref = await db.collection('outcome_presets').add({ ...data, createdAt: loTs() }); id = ref.id; }
            const next = [...presets.filter(p => p.id !== id), { id, ...data }].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
            setPresets(next); setPresetId(id); setMsg('บันทึก preset "' + name + '" แล้ว');
        } catch (e) { setErr('บันทึก preset ไม่สำเร็จ: ' + (e.message || e)); }
    };
    const deletePreset = async () => {
        const p = presets.find(x => x.id === presetId);
        if (!p || !window.confirm('ลบ preset "' + p.name + '" ? (คะแนนที่นำเข้าที่ผูกกับ preset นี้ยังอยู่)')) return;
        try {
            await db.collection('outcome_presets').doc(p.id).delete();
            setPresets(presets.filter(x => x.id !== p.id)); setPresetId(''); setPresetName('');
        } catch (e) { setErr('ลบ preset ไม่สำเร็จ: ' + (e.message || e)); }
    };

    const toggleAid = (id) => setSelAids(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    const selectUnit = (items) => setSelAids(s => {
        const ids = items.map(a => a.id);
        const allIn = ids.every(id => s.includes(id));
        return allIn ? s.filter(x => !ids.includes(x)) : [...new Set([...s, ...ids])];
    });
    const openPath = (uid, aid) => { setFocus({ uid, aid }); setView('path'); };

    const ctx = {
        LO, codes, allUids, uids, problems, matrix, reconcile, usage, coach, groups, labelOf, pCode, aById,
        submissions, submissionsV2, grades, gradingPolicy, gradesLocked, assignments, focus, setFocus, openPath,
        notes, setNotes, scoreDoc, scoreByUid, setScoreDocs, scoreDocs, polls, studio, presetId, presetName,
        presets, selectedCourse, course, me, setErr, setMsg, mask,
    };

    const S = { fontFamily: LO_FONT };
    return (
        <div style={S}>
            {/* ── แผงตัวกรอง ── */}
            <div className="lo-noprint" style={{ border: '1px solid #fbcfe8', borderRadius: 12, padding: 14, marginBottom: 14, background: '#fff' }}>
                <div className="flex flex-wrap items-end gap-3 mb-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">📁 Preset ชุดโจทย์</label>
                        <select className="k-input" style={{ minWidth: 220 }} value={presetId} onChange={e => applyPreset(e.target.value)}>
                            <option value="">— ไม่ใช้ preset —</option>
                            {presets.map(p => <option key={p.id} value={p.id}>{p.name} ({(p.assignmentIds || []).length} ข้อ)</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">ชื่อ preset</label>
                        <input className="k-input" style={{ width: 220 }} placeholder='เช่น แผนฯ 19 for loop' value={presetName} onChange={e => setPresetName(e.target.value)} />
                    </div>
                    <button className="k-btn-pink" onClick={savePreset} style={{ padding: '8px 14px', borderRadius: 8, background: '#ec4899', color: '#fff', fontSize: 13 }}>💾 บันทึก preset</button>
                    {presetId && <button onClick={deletePreset} style={{ padding: '8px 12px', borderRadius: 8, background: '#fee2e2', color: '#b91c1c', fontSize: 13 }}>ลบ preset</button>}
                    <div className="ml-auto text-xs text-gray-500">เลือกแล้ว <b style={{ color: '#be185d' }}>{selAids.length}</b> ข้อ {extraLoading && '· กำลังโหลดคำใบ้/การรัน…'}</div>
                </div>

                {/* โจทย์จัดกลุ่มตามหน่วย */}
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #fce7f3', borderRadius: 8, padding: 8 }}>
                    <div className="flex justify-end mb-1">
                        <button onClick={() => setSelAids([])} className="text-xs" style={{ color: '#be185d' }}>✕ ล้างทั้งหมด</button>
                    </div>
                    {problemGroups.map(g => (
                        <div key={g.unit} className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold" style={{ color: '#9d174d' }}>{g.unit}</span>
                                <button onClick={() => selectUnit(g.items)} className="text-xs px-2 rounded" style={{ background: '#fce7f3', color: '#be185d' }}>
                                    {g.items.every(a => selAids.includes(a.id)) ? 'ยกเลิกทั้งหน่วย' : 'เลือกทั้งหน่วย'}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {g.items.map(a => (
                                    <label key={a.id} className="text-xs flex items-center gap-1 cursor-pointer" title={a.title}>
                                        <input type="checkbox" checked={selAids.includes(a.id)} onChange={() => toggleAid(a.id)} />
                                        <b style={{ fontFamily: LO_MONO }}>{LO.problemCode(a.title) || '•'}</b>
                                        <span className="text-gray-600">{LO.shortTitle(a.title).slice(0, 28)}</span>
                                        {a.isPublished === false && <span className="text-gray-400">(ซ่อน)</span>}
                                        {a._src === 'v2' && <span className="text-gray-400">({a.activityType})</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ผู้เรียน + การแสดงตัวตน */}
                <div className="flex flex-wrap items-end gap-3 mt-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">👥 ผู้เรียน</label>
                        <select className="k-input" value={stuMode} onChange={e => setStuMode(e.target.value)}>
                            <option value="all">ทั้งหมด ({allUids.length} คน)</option>
                            <option value="group">รายกลุ่ม</option>
                            <option value="one">รายคน</option>
                        </select>
                    </div>
                    {stuMode === 'group' && (
                        <select className="k-input" value={stuGroup} onChange={e => setStuGroup(e.target.value)}>
                            {['fast', 'mid', 'stuck'].map(g => <option key={g} value={g}>{LO.GROUP3_LABEL[g]} ({allUids.filter(u => groups[u] && groups[u].group === g).length} คน)</option>)}
                        </select>
                    )}
                    {stuMode === 'one' && (
                        <select className="k-input" value={stuOne} onChange={e => setStuOne(e.target.value)}>
                            <option value="">— เลือก —</option>
                            {allUids.map(u => <option key={u} value={u}>{labelOf(u)}</option>)}
                        </select>
                    )}
                    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ marginBottom: 6 }}>
                        <input type="checkbox" checked={mask} onChange={e => setMask(e.target.checked)} />
                        🔒 ปิดชื่อ (ใช้รหัส {codes.list.length ? codes.list[0].code + '–' + codes.list[codes.list.length - 1].code : 'S01…'})
                    </label>
                    {!mask && (
                        <select className="k-input" value={idMode} onChange={e => setIdMode(e.target.value)}>
                            <option value="studentCode">แสดงเลขประจำตัว (ครูดูเอง)</option>
                            <option value="name">แสดงชื่อจริง (ครูดูเอง)</option>
                        </select>
                    )}
                    <div className="text-xs text-gray-400" style={{ marginBottom: 6 }}>
                        กลุ่ม ไว/กลาง/ติดขัด มาจากแท็บกลุ่มผู้เรียน (A → ไว, B+C → กลาง, D → ติดขัด)
                    </div>
                </div>
            </div>

            {err && <div className="lo-noprint mb-3 p-3 rounded text-sm" style={{ background: '#fef2f2', color: '#b91c1c' }}>⚠️ {err} <button className="ml-2 underline" onClick={() => setErr('')}>ปิด</button></div>}
            {msg && <div className="lo-noprint mb-3 p-2 rounded text-sm" style={{ background: '#ecfdf5', color: '#047857' }}>✓ {msg} <button className="ml-2 underline" onClick={() => setMsg('')}>ปิด</button></div>}

            {/* ── เลือกมุมมอง ── */}
            <div className="lo-noprint flex flex-wrap gap-2 mb-4">
                {LO_VIEWS.map(v => (
                    <button key={v.key} onClick={() => setView(v.key)} style={{
                        padding: '6px 14px', borderRadius: 999, fontSize: 13, fontFamily: LO_FONT,
                        background: view === v.key ? '#ec4899' : '#fce7f3', color: view === v.key ? '#fff' : '#be185d', fontWeight: view === v.key ? 700 : 400,
                    }}>{v.label}</button>
                ))}
            </div>

            {!problems.length && view !== 'import' ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">☑️</div>
                    เลือกโจทย์ (หรือ preset) ด้านบนเพื่อแสดงรายงาน
                </div>
            ) : <LOViewSwitch view={view} ctx={ctx} />}
        </div>
    );
};

const LO_VIEW_COMPONENTS = {};
const LOViewSwitch = ({ view, ctx }) => {
    const C = LO_VIEW_COMPONENTS[view];
    return C ? <C ctx={ctx} /> : <div className="text-center py-10 text-gray-400">มุมมองนี้กำลังพัฒนา</div>;
};

// คำอธิบายสีของช่อง
const LOLegend = () => (
    <div className="flex flex-wrap gap-3 text-xs mt-2 lo-avoid">
        {['first', 'revised', 'notyet', 'none'].map(k => (
            <span key={k} className="flex items-center gap-1">
                <span style={{ width: 14, height: 14, borderRadius: 3, background: LO_STATUS[k].bg, border: '1px solid ' + LO_STATUS[k].color, display: 'inline-block' }} />
                {LO_STATUS[k].label}
            </span>
        ))}
        <span className="text-gray-500">· ผลตรวจ: AC ผ่านทุกกรณี · WA คำตอบผิด · CE คอมไพล์ไม่ผ่าน · RE รันไม่สำเร็จ · TLE ใช้เวลาเกิน · L1–L4 = ระดับคำใบ้</span>
    </div>
);

// ════════════════════════════════════════════════════════════════════════════
// มุมมอง 2: ตารางผลการส่งรายข้อ (Matrix)
// ════════════════════════════════════════════════════════════════════════════
const LOMatrix = ({ ctx }) => {
    const { LO, uids, problems, matrix, reconcile, labelOf, pCode, openPath, gradingPolicy, gradesLocked, presetName } = ctx;
    const [showRec, setShowRec] = React.useState(false);
    const testsOf = (c) => (gradingPolicy === 'latest' ? c.lastTests : c.bestTests);
    const cols = problems.map(p => ({ p, s: LO.columnSummary(matrix, uids, p.id) }));
    const k = problems.length;
    const tot = uids.reduce((a, u) => {
        const s = matrix.rows[u].sum;
        a.passed += s.passed; a.subs += s.subs; a.runs += s.runs; a.hints += s.hints; a.raw += s.raw;
        return a;
    }, { passed: 0, subs: 0, runs: 0, hints: 0, raw: 0 });
    const allFirst = cols.reduce((a, c) => a + c.s.firstPassed, 0);
    const submittedPairs = cols.reduce((a, c) => a + c.s.submitted, 0);

    const exportCSV = () => {
        const head = ['รหัส'];
        if (!ctx.mask) head.push('ผู้เรียน');
        problems.forEach(p => {
            const c = pCode(p);
            head.push(`${c} ส่ง(ครั้ง)`, `${c} ผลครั้งแรก`, `${c} คะแนนที่นับ(%)`, `${c} คะแนนดิบ(/${p.rawScore || 0})`, `${c} ดีที่สุด(%)`,
                `${c} กรณีทดสอบ`, `${c} สถานะ`, `${c} คำใบ้ L1`, `${c} L2`, `${c} L3`, `${c} L4`, `${c} รัน`);
        });
        head.push(`ผ่าน (/${k})`, 'ส่งรวม', 'รันรวม', 'คำใบ้รวม', `คะแนนดิบรวม (/${matrix.rawMax})`);
        const rows = uids.map(u => {
            const r = matrix.rows[u];
            const out = [ctx.codes.byUid[u].code];
            if (!ctx.mask) out.push(labelOf(u));
            problems.forEach(p => {
                const c = r.cells[p.id];
                const t = testsOf(c);
                out.push(c.n, c.firstVerdict, c.counted == null ? '' : c.counted, LO.rawEarned(c.counted, p.rawScore), c.bestScore == null ? '' : c.bestScore,
                    t ? `${t[0]}/${t[1]}` : '', LO_STATUS[c.status].label, ...c.hintLv, c.runs);
            });
            out.push(r.sum.passed, r.sum.subs, r.sum.runs, r.sum.hints, r.sum.raw);
            return out;
        });
        const foot = [['% ผ่าน', ...(ctx.mask ? [] : [''])], ['% ผ่านครั้งแรก', ...(ctx.mask ? [] : [''])], ['ส่งเฉลี่ย/ข้อ', ...(ctx.mask ? [] : [''])]];
        cols.forEach(({ s }) => {
            foot[0].push('', '', LO.fmt(s.pctPassed, 1), '', '', '', '', '', '', '', '', '');
            foot[1].push('', '', LO.fmt(s.pctFirst, 1), '', '', '', '', '', '', '', '', '');
            foot[2].push(LO.fmt(s.avgAttempts, 2), '', '', '', '', '', '', '', '', '', '', '');
        });
        loDownload(`matrix_${(presetName || 'selected').replace(/[^\wก-๙.-]+/g, '_')}.csv`, new Blob([LO.toCSV([head, ...rows, ...foot])], { type: 'text/csv;charset=utf-8' }));
    };

    const th = { padding: '6px 8px', fontSize: 12, borderBottom: '2px solid #f9a8d4', background: '#fdf2f8', color: '#9d174d', textAlign: 'center', whiteSpace: 'nowrap' };
    const td = { padding: 4, borderBottom: '1px solid #fce7f3', verticalAlign: 'top' };
    return (
        <div>
            <div className="lo-noprint flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs px-2 py-1 rounded" style={{ background: reconcile.ok ? '#ecfdf5' : '#fef2f2', color: reconcile.ok ? '#047857' : '#b91c1c' }}>
                    {reconcile.ok ? '✅' : '⚠️'} ตรวจกับตาราง "สรุปคะแนนทุกคน (E1)": ตรง {reconcile.checked - reconcile.mismatched}/{reconcile.checked} ช่อง
                    {reconcile.issues.filter(i => i.kind === 'notInE1').length > 0 && ` · ${reconcile.issues.filter(i => i.kind === 'notInE1').length} ข้อไม่อยู่ในตาราง E1`}
                </span>
                {reconcile.issues.length > 0 && <button className="text-xs underline" style={{ color: '#be185d' }} onClick={() => setShowRec(x => !x)}>{showRec ? 'ซ่อน' : 'ดู'}รายละเอียด</button>}
                <span className="text-xs text-gray-500">คะแนนที่นับ = เกณฑ์ของรายวิชา ({gradingPolicy === 'latest' ? 'คะแนนครั้งล่าสุด' : 'คะแนนสูงสุด'}{gradesLocked ? ' · ปิดรับคะแนนแล้ว' : ''})</span>
                <button onClick={exportCSV} className="ml-auto text-xs px-3 py-1 rounded" style={{ background: '#be185d', color: '#fff' }}>⬇️ CSV ของตาราง</button>
            </div>
            {showRec && (
                <ul className="lo-noprint text-xs mb-2 p-2 rounded" style={{ background: '#fff7ed' }}>
                    {reconcile.issues.slice(0, 50).map((i, n) => (
                        <li key={n}>{i.kind === 'notInE1' ? `${pCode(ctx.aById[i.aid])}: ${i.reason}` : `${labelOf(i.uid)} × ${pCode(ctx.aById[i.aid])}: ${i.reason} (ตารางนี้ ${i.mine} / E1 ${i.e1})`}</li>
                    ))}
                </ul>
            )}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead>
                        <tr>
                            <th style={{ ...th, textAlign: 'left' }}>ผู้เรียน</th>
                            {problems.map(p => (
                                <th key={p.id} style={th} title={p.title}>
                                    <div style={{ fontFamily: LO_MONO }}>{pCode(p)}</div>
                                    <div style={{ fontWeight: 400, fontSize: 10, color: '#6b7280', maxWidth: 140, whiteSpace: 'normal' }}>{LO.shortTitle(p.title)} · {p.rawScore || 0} คะแนน</div>
                                </th>
                            ))}
                            <th style={th}>ผ่าน<br />(/{k})</th>
                            <th style={th}>ส่ง<br />รวม</th>
                            <th style={th}>รัน<br />รวม</th>
                            <th style={th}>คำใบ้<br />รวม</th>
                            <th style={th}>คะแนน<br />(/{matrix.rawMax})</th>
                        </tr>
                    </thead>
                    <tbody>
                        {uids.map(u => {
                            const r = matrix.rows[u];
                            return (
                                <tr key={u} className="lo-avoid">
                                    <td style={{ ...td, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: LO_MONO, verticalAlign: 'middle' }}>{labelOf(u)}</td>
                                    {problems.map(p => {
                                        const c = r.cells[p.id];
                                        const st = LO_STATUS[c.status];
                                        const t = testsOf(c);
                                        const raw = LO.rawEarned(c.counted, p.rawScore);
                                        return (
                                            <td key={p.id} style={td}>
                                                <div onClick={() => c.n > 0 && openPath(u, p.id)} title={st.label + (c.n ? ' — คลิกดูเส้นทางการส่งงาน' : '')}
                                                    style={{ background: st.bg, borderLeft: '4px solid ' + st.color, borderRadius: 6, padding: '4px 6px', minWidth: 120, cursor: c.n ? 'pointer' : 'default', lineHeight: 1.45 }}>
                                                    {c.n === 0 && c.status === 'none' ? <div style={{ color: st.color }}>ไม่ได้ส่ง</div> : (
                                                        <>
                                                            <div className="flex items-center gap-1">
                                                                <span>ส่ง <b>{c.n}</b> ครั้ง</span>
                                                                <span className="text-gray-500">· ครั้งแรก</span><LOVerdict v={c.firstVerdict} small />
                                                            </div>
                                                            <div>
                                                                <b>{raw}/{p.rawScore || 0}</b> คะแนน
                                                                {t && <span className="text-gray-600"> · เคส {t[0]}/{t[1]}</span>}
                                                                {c.bestScore != null && c.bestScore !== c.counted && (
                                                                    <span className="text-gray-500"> (ดีสุด {LO.rawEarned(c.bestScore, p.rawScore)}/{p.rawScore || 0}{c.bestTests ? ` · ${c.bestTests[0]}/${c.bestTests[1]}` : ''})</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 11 }}>
                                                                {c.hints > 0 ? <>💡 {c.hints} <LOHintLv lv={c.hintLv} /></> : <span className="text-gray-400">ไม่ขอคำใบ้</span>}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle', fontWeight: 700 }}>{r.sum.passed}/{k}</td>
                                    <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{r.sum.subs}</td>
                                    <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{r.sum.runs}</td>
                                    <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle' }}>{r.sum.hints}</td>
                                    <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle', fontWeight: 700 }}>{r.sum.raw}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        {[
                            ['% ผ่าน', s => loPct(s.pctPassed) + ` (${s.passed}/${s.n})`, loPct(uids.length && k ? tot.passed / (uids.length * k) * 100 : NaN)],
                            ['% ผ่านครั้งแรก', s => loPct(s.pctFirst) + ` (${s.firstPassed}/${s.n})`, loPct(uids.length && k ? allFirst / (uids.length * k) * 100 : NaN)],
                            ['ส่งเฉลี่ย/ข้อ (ผู้ที่ส่ง)', s => LO.fmt(s.avgAttempts, 2) + ` (${s.submitted} คน)`, LO.fmt(submittedPairs ? tot.subs / submittedPairs : NaN, 2)],
                        ].map(([label, f, all]) => (
                            <tr key={label} style={{ background: '#fdf2f8', fontWeight: 600 }}>
                                <td style={{ ...td, whiteSpace: 'nowrap' }}>{label}</td>
                                {cols.map(({ p, s }) => <td key={p.id} style={{ ...td, textAlign: 'center' }}>{f(s)}</td>)}
                                <td style={{ ...td, textAlign: 'center' }} colSpan={5}>รวมทุกข้อ: {all}</td>
                            </tr>
                        ))}
                    </tfoot>
                </table>
            </div>
            <LOLegend />
            <div className="text-xs text-gray-400 mt-1">
                n = {uids.length} คน · ตัวหาร % คือจำนวนผู้เรียนที่เลือก · "ผ่าน" = คะแนนที่นับเต็ม 100% · คำใบ้นับจากบันทึกการขอคำใบ้ (usageEvents) · รัน = ทดสอบตัวอย่าง + รันโค้ด
            </div>
        </div>
    );
};
LO_VIEW_COMPONENTS.matrix = LOMatrix;

window.LearningOutcomesTab = LearningOutcomesTab;

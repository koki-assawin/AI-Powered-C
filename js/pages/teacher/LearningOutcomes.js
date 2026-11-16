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

// ── ตัวเลือกผู้เรียน/โจทย์ที่ใช้ร่วมกันในมุมมองรายคน ──
const LOPicker = ({ ctx, showProblem = true }) => {
    const { uids, problems, focus, setFocus, labelOf, pCode } = ctx;
    const uid = uids.includes(focus.uid) ? focus.uid : uids[0];
    const aid = problems.some(p => p.id === focus.aid) ? focus.aid : (problems[0] && problems[0].id);
    const idx = uids.indexOf(uid);
    const go = (d) => { const n = uids[(idx + d + uids.length) % uids.length]; setFocus({ uid: n, aid }); };
    return (
        <div className="lo-noprint flex flex-wrap items-center gap-2 mb-3">
            <button onClick={() => go(-1)} className="px-2 py-1 rounded text-sm" style={{ background: '#fce7f3' }}>◀</button>
            <select className="k-input" value={uid || ''} onChange={e => setFocus({ uid: e.target.value, aid })}>
                {uids.map(u => <option key={u} value={u}>{labelOf(u)}</option>)}
            </select>
            <button onClick={() => go(1)} className="px-2 py-1 rounded text-sm" style={{ background: '#fce7f3' }}>▶</button>
            {showProblem && (
                <select className="k-input" value={aid || ''} onChange={e => setFocus({ uid, aid: e.target.value })}>
                    {problems.map(p => <option key={p.id} value={p.id}>{pCode(p)} {ctx.LO.shortTitle(p.title)}</option>)}
                </select>
            )}
            <span className="text-xs text-gray-400">คนที่ {idx + 1}/{uids.length}</span>
        </div>
    );
};
const loFocus = (ctx) => ({
    uid: ctx.uids.includes(ctx.focus.uid) ? ctx.focus.uid : ctx.uids[0],
    aid: ctx.problems.some(p => p.id === ctx.focus.aid) ? ctx.focus.aid : (ctx.problems[0] && ctx.problems[0].id),
});

// แสดง diff รายบรรทัด
const LODiff = ({ lines, fontSize = 12 }) => (
    <pre style={{ fontFamily: LO_MONO, fontSize, background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {lines.map((l, i) => (
            <div key={i} style={{
                background: l.type === 'add' ? '#dcfce7' : l.type === 'del' ? '#fee2e2' : 'transparent',
                color: l.type === 'del' ? '#991b1b' : '#111827', textDecoration: l.type === 'del' ? 'line-through' : 'none',
            }}>
                <span style={{ display: 'inline-block', width: 22, color: '#9ca3af', userSelect: 'none' }}>{l.type === 'add' ? '+' : l.type === 'del' ? '−' : ' '}</span>
                {l.text || ' '}
            </div>
        ))}
    </pre>
);
const LOCode = ({ code, fontSize = 12, maxHeight }) => (
    <pre style={{ fontFamily: LO_MONO, fontSize, background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, margin: 0,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight, overflow: maxHeight ? 'hidden' : 'visible' }}>{code || '(ไม่มีโค้ด)'}</pre>
);

// ════════════════════════════════════════════════════════════════════════════
// มุมมอง 3: เส้นทางการส่งงาน (รายคน × รายข้อ)
// ════════════════════════════════════════════════════════════════════════════
const LOPath = ({ ctx }) => {
    const { LO, matrix, usage, coach, labelOf, pCode, aById, groups } = ctx;
    const { uid, aid } = loFocus(ctx);
    const k = uid && aid ? LO.pairKey(uid, aid) : '';
    const attempts = (k && matrix.attempts[k]) || [];
    const hints = (k && usage.hints[k]) || [];
    const slots = LO.hintsBeforeAttempts(attempts, hints);
    const texts = (k && coach[k]) || [];
    const [a, setA] = React.useState(0);
    const [b, setB] = React.useState(-1);
    React.useEffect(() => { setA(0); setB(-1); }, [k]);
    const ia = Math.min(a, attempts.length - 1), ib = b < 0 ? attempts.length - 1 : Math.min(b, attempts.length - 1);
    const p = aById[aid];
    const cell = matrix.rows[uid] && matrix.rows[uid].cells[aid];
    if (!uid || !p) return <div className="text-gray-400 text-center py-10">ไม่มีผู้เรียนหรือโจทย์ที่เลือก</div>;
    const lvBadges = (arr) => arr.length
        ? arr.map((h, i) => <span key={i} className="mr-1 px-1 rounded" style={{ background: '#fef3c7', color: '#92400e', fontSize: 11 }}>L{h.level || '?'}</span>)
        : <span className="text-gray-400" style={{ fontSize: 11 }}>ไม่ได้ขอคำใบ้</span>;
    const diff = attempts.length ? LO.lineDiff(attempts[ia].code, attempts[ib].code) : [];
    const changed = diff.filter(d => d.type !== 'same').length;
    return (
        <div>
            <LOPicker ctx={ctx} />
            <div className="flex flex-wrap items-baseline gap-3 mb-3">
                <h3 className="font-bold" style={{ color: '#9d174d', fontSize: 18 }}>{labelOf(uid)} × {pCode(p)} {LO.shortTitle(p.title)}</h3>
                {groups[uid] && <span className="text-xs px-2 rounded" style={{ background: '#f3f4f6', color: LO_GROUP_COLOR[groups[uid].group] }}>กลุ่ม{LO.GROUP3_LABEL[groups[uid].group]}</span>}
                {cell && <span className="text-xs px-2 rounded" style={{ background: LO_STATUS[cell.status].bg, color: LO_STATUS[cell.status].color }}>{LO_STATUS[cell.status].label}</span>}
            </div>
            {!attempts.length ? <div className="text-gray-400 py-8 text-center">ไม่มีการส่งงานในโจทย์นี้</div> : (
                <>
                    {/* ไทม์ไลน์ */}
                    <div className="lo-avoid" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 6, marginBottom: 14 }}>
                        {attempts.map((s, i) => {
                            const v = LO.verdictOf(s);
                            return (
                                <React.Fragment key={i}>
                                    <div style={{ border: '1px solid ' + (LO_VERDICT_COLOR[v] || '#e5e7eb'), borderRadius: 8, padding: '6px 8px', minWidth: 112, background: '#fff' }}>
                                        <div style={{ fontSize: 11, marginBottom: 2 }}>💡 ก่อนส่ง: {lvBadges(slots[i])}</div>
                                        <div className="font-bold" style={{ fontSize: 13 }}>ครั้งที่ {i + 1}</div>
                                        <div className="flex items-center gap-1"><LOVerdict v={v} /> <span style={{ fontSize: 12 }}>{s.score || 0}%</span></div>
                                        {s.totalTests ? <div style={{ fontSize: 11, color: '#4b5563' }}>กรณีทดสอบ {s.passedTests || 0}/{s.totalTests}</div> : null}
                                        {s.runCount != null && <div style={{ fontSize: 11, color: '#6b7280' }}>รันก่อนส่ง {s.runCount}</div>}
                                    </div>
                                    {i < attempts.length - 1 && <div style={{ alignSelf: 'center', color: '#d1d5db' }}>→</div>}
                                </React.Fragment>
                            );
                        })}
                        {slots[attempts.length].length > 0 && <div style={{ alignSelf: 'center', fontSize: 11, color: '#6b7280' }}>· หลังส่งครั้งสุดท้าย: {lvBadges(slots[attempts.length])}</div>}
                    </div>

                    {/* diff */}
                    <div className="lo-avoid mb-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <b style={{ color: '#9d174d' }}>เทียบโค้ด</b>
                            <select className="k-input lo-noprint" value={ia} onChange={e => setA(+e.target.value)}>
                                {attempts.map((_, i) => <option key={i} value={i}>ครั้งที่ {i + 1}</option>)}
                            </select>
                            <span>→</span>
                            <select className="k-input lo-noprint" value={ib} onChange={e => setB(+e.target.value)}>
                                {attempts.map((_, i) => <option key={i} value={i}>ครั้งที่ {i + 1}{i === attempts.length - 1 ? ' (สุดท้าย)' : ''}</option>)}
                            </select>
                            <span className="text-xs text-gray-500">ครั้งที่ {ia + 1} → ครั้งที่ {ib + 1} · เปลี่ยน {changed} บรรทัด (<span style={{ background: '#dcfce7' }}>+ เพิ่ม</span> / <span style={{ background: '#fee2e2' }}>− ลบ</span>)</span>
                        </div>
                        <LODiff lines={diff} />
                    </div>
                </>
            )}

            {/* ข้อความคำใบ้ */}
            <div className="lo-avoid">
                <b style={{ color: '#9d174d' }}>ข้อความคำใบ้ AI ที่ได้รับในโจทย์นี้ (ตามลำดับ)</b>
                {!texts.length ? <div className="text-sm text-gray-400 mt-1">ไม่พบข้อความคำใบ้ในบันทึกโค้ช (coachInteractions)</div> : (
                    <ol className="mt-2" style={{ paddingLeft: 0, listStyle: 'none' }}>
                        {texts.map((h, i) => (
                            <li key={i} className="mb-2 p-2 rounded" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                                <div style={{ fontSize: 11, color: '#92400e', marginBottom: 2 }}>คำใบ้ลำดับที่ {i + 1} · ระดับ {h.level}{h.local ? ' · คำใบ้สำรองของระบบ (ไม่ได้ใช้ AI)' : ''}</div>
                                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{h.text}</div>
                            </li>
                        ))}
                    </ol>
                )}
                <div className="text-xs text-gray-400 mt-1">ระดับคำใบ้ในไทม์ไลน์มาจาก usageEvents · ข้อความมาจาก coachInteractions (จับคู่ด้วยชื่อโจทย์) จำนวนสองแหล่งอาจต่างกันเล็กน้อย</div>
            </div>
        </div>
    );
};
LO_VIEW_COMPONENTS.path = LOPath;

// ════════════════════════════════════════════════════════════════════════════
// มุมมอง 4: การ์ดผลลัพธ์รายบุคคล (1 คน ต่อ 1 จอ / 1 หน้า A4)
// ════════════════════════════════════════════════════════════════════════════
const LONote = ({ ctx, uid, readOnly }) => {
    const { notes, setNotes, me, selectedCourse, setErr } = ctx;
    const saved = (notes[uid] && notes[uid].text) || '';
    const [text, setText] = React.useState(saved);
    const [state, setState] = React.useState('');
    React.useEffect(() => { setText(saved); setState(''); }, [uid, saved]);
    if (readOnly) return saved ? <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{saved}</div> : <div className="text-gray-400 text-sm">—</div>;
    const save = async () => {
        setState('saving');
        try {
            const id = `${me}_${selectedCourse}_${uid}`;
            await db.collection('outcome_notes').doc(id).set({ ownerId: me, courseId: selectedCourse, studentId: uid, text: text.slice(0, 5000), updatedAt: loTs() });
            setNotes(n => ({ ...n, [uid]: { id, text: text.slice(0, 5000) } }));
            setState('saved');
        } catch (e) { setState(''); setErr('บันทึกข้อสังเกตไม่สำเร็จ: ' + (e.message || e)); }
    };
    return (
        <div>
            <textarea className="k-input" rows={3} style={{ width: '100%', fontFamily: LO_FONT }} value={text}
                placeholder="ข้อสังเกตของครู เช่น พัฒนาการ จุดที่ติด วิธีที่ใช้ช่วย (เก็บแยก เห็นเฉพาะครูผู้บันทึก)"
                onChange={e => { setText(e.target.value); setState(''); }} />
            <div className="flex items-center gap-2 mt-1">
                <button onClick={save} disabled={text === saved || state === 'saving'} className="text-xs px-3 py-1 rounded"
                    style={{ background: text === saved ? '#f3f4f6' : '#ec4899', color: text === saved ? '#9ca3af' : '#fff' }}>💾 บันทึกข้อสังเกต</button>
                <span className="text-xs text-gray-500">{state === 'saving' ? 'กำลังบันทึก…' : state === 'saved' ? '✓ บันทึกแล้ว' : text !== saved ? 'ยังไม่ได้บันทึก' : ''}</span>
            </div>
        </div>
    );
};

const LOCardBody = ({ ctx, uid, evidence }) => {
    const { LO, problems, matrix, labelOf, pCode, groups, scoreDoc, scoreByUid, studio, submissions, submissionsV2, assignments, gradingPolicy } = ctx;
    const allSubs = React.useMemo(() => [...submissions.filter(s => s.studentId === uid), ...submissionsV2.filter(s => s.studentId === uid)], [uid, submissions, submissionsV2]);
    const row = matrix.rows[uid];
    if (!row) return null;
    const g = groups[uid];
    const sc = scoreByUid[uid];
    const k = problems.length;
    const lv = row.sum.lv;
    const testsOf = (c) => (gradingPolicy === 'latest' ? c.lastTests : c.bestTests);

    // Peer review / Exit ticket: Studio ก่อน แล้วค่อย CSV
    const aidSet = new Set(problems.map(p => p.id));
    const peerWritten = studio ? studio.reviews.filter(r => r.reviewerType === 'peer' && r.reviewerUid === uid && r.comment) : [];
    const myProjects = studio ? new Set(studio.projects.filter(p => (p.members || []).includes(uid)).map(p => p.id)) : new Set();
    const peerGot = studio ? studio.reviews.filter(r => r.reviewerType === 'peer' && myProjects.has(r.projectId) && r.comment) : [];
    const eb = studio ? studio.explainBack.filter(e => e.uid === uid && aidSet.has(e.assignmentId)) : [];
    const box = { border: '1px solid #fbcfe8', borderRadius: 10, padding: 10, background: '#fff' };
    const H = ({ children }) => <div className="font-bold mb-1" style={{ color: '#9d174d', fontSize: 14 }}>{children}</div>;

    return (
        <div style={{ fontFamily: LO_FONT }}>
            <div className="flex flex-wrap items-center gap-3 mb-3">
                <div style={{ fontSize: 30, fontWeight: 800, color: '#be185d', fontFamily: LO_MONO }}>{labelOf(uid)}</div>
                {g && <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: '#f9fafb', border: '2px solid ' + LO_GROUP_COLOR[g.group], color: LO_GROUP_COLOR[g.group] }}>
                    กลุ่ม{LO.GROUP3_LABEL[g.group]} <span className="font-normal text-xs">({g.letter})</span></span>}
                <span className="text-sm text-gray-600">ผ่าน <b>{row.sum.passed}/{k}</b> ข้อ · ส่งรวม {row.sum.subs} · รัน {row.sum.runs} · คำใบ้ {row.sum.hints} · คะแนน <b>{row.sum.raw}/{matrix.rawMax}</b></span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 10 }}>
                <div style={box} className="lo-avoid">
                    <H>คะแนนก่อน/หลังเรียน</H>
                    {sc ? (
                        <table style={{ fontSize: 13, width: '100%' }}><tbody>
                            {[['ก่อนเรียน', sc.pre, scoreDoc.maxPre], ['หลังเรียน', sc.post, scoreDoc.maxPost], ['ภ.19-2', sc.p19_2, scoreDoc.maxP19], ['S3', sc.s3], ['A', sc.a], ['C', sc.c]]
                                .filter(r => r[1] != null).map(([l, v, m]) => (
                                    <tr key={l}><td className="text-gray-600">{l}</td><td className="text-right font-bold">{v}{m ? ` / ${m}` : ''}</td></tr>
                                ))}
                            {sc.pre != null && sc.post != null && <tr><td className="text-gray-600">ผลต่าง</td><td className="text-right font-bold" style={{ color: sc.post >= sc.pre ? '#16a34a' : '#dc2626' }}>{sc.post - sc.pre >= 0 ? '+' : ''}{(sc.post - sc.pre).toFixed(2).replace(/\.00$/, '')}</td></tr>}
                        </tbody></table>
                    ) : <div className="text-sm text-gray-400">ยังไม่ได้นำเข้าคะแนนสำหรับ preset นี้</div>}
                </div>
                <div style={box} className="lo-avoid">
                    <H>คำใบ้ที่ขอ (รายระดับ)</H>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, textAlign: 'center' }}>
                        {lv.map((n, i) => <div key={i} style={{ background: '#fffbeb', borderRadius: 6, padding: 4 }}><div style={{ fontSize: 11, color: '#92400e' }}>ระดับ {i + 1}</div><div style={{ fontWeight: 800, fontSize: 18 }}>{n}</div></div>)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">รวม {row.sum.hints} ครั้ง ในโจทย์ที่เลือก {k} ข้อ</div>
                </div>
                <div style={box} className="lo-avoid">
                    <H>Radar 5 มิติ (ทุกโจทย์ในรายวิชา)</H>
                    {typeof _StudentRadarChart === 'function'
                        ? <_StudentRadarChart subs={allSubs} totalAssignments={assignments.length} />
                        : <div className="text-sm text-gray-400">ไม่พบกราฟ Radar</div>}
                </div>
            </div>

            <div style={{ ...box, marginBottom: 10 }} className="lo-avoid">
                <H>ผลรายข้อและเส้นทางการส่ง (ย่อ)</H>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead><tr style={{ color: '#9d174d', borderBottom: '1px solid #fbcfe8' }}>
                        <th className="text-left">โจทย์</th><th>สถานะ</th><th>ส่ง</th><th>ครั้งแรก</th><th>คะแนน</th><th>เคส</th><th>คำใบ้ L1–L4</th><th className="text-left">เส้นทาง (ครั้งที่ 1 → สุดท้าย)</th>
                    </tr></thead>
                    <tbody>
                        {problems.map(p => {
                            const c = row.cells[p.id];
                            const at = matrix.attempts[LO.pairKey(uid, p.id)] || [];
                            const t = testsOf(c);
                            const vs = at.map(s => LO.verdictOf(s));
                            const shown = vs.length > 12 ? [...vs.slice(0, 5), '…', ...vs.slice(-5)] : vs;
                            return (
                                <tr key={p.id} style={{ borderBottom: '1px solid #fce7f3' }}>
                                    <td style={{ fontFamily: LO_MONO, fontWeight: 700 }}>{pCode(p)}</td>
                                    <td className="text-center"><span className="px-1 rounded" style={{ background: LO_STATUS[c.status].bg, color: LO_STATUS[c.status].color, fontSize: 11 }}>{LO_STATUS[c.status].label}</span></td>
                                    <td className="text-center">{c.n}</td>
                                    <td className="text-center"><LOVerdict v={c.firstVerdict} small /></td>
                                    <td className="text-center">{LO.rawEarned(c.counted, p.rawScore)}/{p.rawScore || 0}</td>
                                    <td className="text-center">{t ? `${t[0]}/${t[1]}` : '–'}</td>
                                    <td className="text-center" style={{ fontFamily: LO_MONO, fontSize: 11 }}>{c.hintLv.join('/')}</td>
                                    <td>{shown.length ? shown.map((v, i) => v === '…'
                                        ? <span key={i} className="mx-1 text-gray-400">…</span>
                                        : <span key={i} className="mr-1"><LOVerdict v={v} small /></span>) : <span className="text-gray-400">ไม่ได้ส่ง</span>}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 10 }}>
                <div style={box} className="lo-avoid">
                    <H>Peer Review</H>
                    {peerWritten.length || peerGot.length ? (
                        <div style={{ fontSize: 13 }}>
                            <div className="text-xs text-gray-500">ที่เขียนให้เพื่อน ({peerWritten.length})</div>
                            {peerWritten.slice(0, 3).map((r, i) => <div key={i}>💬 {r.comment}</div>)}
                            <div className="text-xs text-gray-500 mt-1">ที่ได้รับ ({peerGot.length})</div>
                            {peerGot.slice(0, 3).map((r, i) => <div key={i}>💬 {r.comment}</div>)}
                        </div>
                    ) : sc && sc.peer ? <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{sc.peer}<div className="text-xs text-gray-400">(จากคะแนนที่นำเข้า)</div></div>
                        : <div className="text-sm text-gray-400">ไม่มีข้อมูลในระบบ</div>}
                </div>
                <div style={box} className="lo-avoid">
                    <H>Exit Ticket / เป้าหมาย</H>
                    {eb.length ? eb.slice(0, 3).map((e, i) => (
                        <div key={i} style={{ fontSize: 13 }} className="mb-1">
                            <span className="text-xs text-gray-500">{pCode(ctx.aById[e.assignmentId] || { title: e.assignmentTitle })} · {e.mode === 'predict' ? (e.predictCorrect ? 'ทำนายผลถูก' : 'ทำนายผลไม่ตรง') : `อธิบายโค้ด ระดับ ${e.aiLevel}`}</span>
                            <div>“{e.explanation || e.predictAnswer}”</div>
                        </div>
                    )) : sc && sc.exit ? <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{sc.exit}<div className="text-xs text-gray-400">(จากคะแนนที่นำเข้า)</div></div>
                        : <div className="text-sm text-gray-400">ไม่มีข้อมูลในระบบ</div>}
                </div>
                <div style={box} className="lo-avoid">
                    <H>บันทึกของครู</H>
                    <LONote ctx={ctx} uid={uid} readOnly={evidence} />
                </div>
            </div>
        </div>
    );
};

const LOCards = ({ ctx }) => {
    const { uid } = loFocus(ctx);
    if (ctx.evidence && ctx.allCards) {
        return <div>{ctx.uids.map((u, i) => (
            <div key={u} className={i < ctx.uids.length - 1 ? 'lo-break' : ''} style={{ marginBottom: 24 }}>
                {i > 0 && <LOEvidenceHeaderSlot ctx={ctx} />}
                <LOCardBody ctx={ctx} uid={u} evidence />
            </div>
        ))}</div>;
    }
    return (
        <div>
            <LOPicker ctx={ctx} showProblem={false} />
            {uid ? <LOCardBody ctx={ctx} uid={uid} evidence={ctx.evidence} /> : <div className="text-gray-400 text-center py-10">ไม่มีผู้เรียน</div>}
        </div>
    );
};
// หัวรายงานซ้ำในแต่ละหน้าเมื่อพิมพ์การ์ดทุกคน (กำหนดจริงในส่วนโหมดหลักฐาน)
const LOEvidenceHeaderSlot = ({ ctx }) => (ctx.EvidenceHeader ? <ctx.EvidenceHeader /> : null);
LO_VIEW_COMPONENTS.card = LOCards;

// ════════════════════════════════════════════════════════════════════════════
// มุมมอง 5: แกลเลอรีผลงานรายบุคคล (โค้ดชิ้นสุดท้ายของทุกคน ในโจทย์ 1 ข้อ · A4 แนวตั้ง 1 หน้า)
// ════════════════════════════════════════════════════════════════════════════
const LOGallery = ({ ctx }) => {
    const { LO, uids, problems, matrix, labelOf, pCode, openPath } = ctx;
    const [aid, setAid] = React.useState(problems[0] && problems[0].id);
    const [cols, setCols] = React.useState(5);
    const cur = problems.find(p => p.id === aid) || problems[0];
    if (!cur) return null;
    const rows = Math.ceil(uids.length / cols);
    // ความสูงต่อช่องให้ทั้งตารางพอดี A4 (≈ 245 mm หลังหักหัวรายงาน) — บนจอใช้ค่าเดียวกันเป็น px โดยประมาณ
    const cellH = ctx.evidence ? `calc((245mm - ${rows * 2}mm) / ${rows})` : 190;
    const codeFont = cols >= 6 ? 6 : cols === 5 ? 6.5 : 7.5;
    return (
        <div>
            <div className="lo-noprint flex flex-wrap items-center gap-2 mb-3">
                <select className="k-input" value={cur.id} onChange={e => setAid(e.target.value)}>
                    {problems.map(p => <option key={p.id} value={p.id}>{pCode(p)} {LO.shortTitle(p.title)}</option>)}
                </select>
                <label className="text-sm">คอลัมน์</label>
                <select className="k-input" value={cols} onChange={e => setCols(+e.target.value)}>
                    {[4, 5, 6].map(n => <option key={n} value={n}>{n} × {Math.ceil(uids.length / n)}</option>)}
                </select>
                <span className="text-xs text-gray-500">ใช้โหมดหลักฐานเพื่อจัดให้พอดี A4 แนวตั้ง 1 หน้า</span>
            </div>
            <div className="font-bold mb-2" style={{ color: '#9d174d' }}>{pCode(cur)} {LO.shortTitle(cur.title)} — โค้ดที่ส่งครั้งสุดท้ายของผู้เรียนแต่ละคน</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '2mm' }}>
                {uids.map(u => {
                    const c = matrix.rows[u].cells[cur.id];
                    const at = matrix.attempts[LO.pairKey(u, cur.id)] || [];
                    const last = at[at.length - 1];
                    const st = LO_STATUS[c.status];
                    return (
                        <div key={u} onClick={() => at.length && openPath(u, cur.id)} className="lo-avoid"
                            style={{ border: '1.5px solid ' + st.color, borderRadius: 6, overflow: 'hidden', height: cellH, display: 'flex', flexDirection: 'column', background: '#fff', cursor: at.length ? 'pointer' : 'default' }}>
                            <div style={{ background: st.bg, padding: '1px 4px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                <b style={{ fontFamily: LO_MONO }}>{labelOf(u)}</b>
                                <span>ส่ง {c.n}</span>
                                {last && <LOVerdict v={c.lastVerdict} small />}
                                {last && last.totalTests ? <span>{last.passedTests || 0}/{last.totalTests}</span> : null}
                            </div>
                            <pre style={{ flex: 1, margin: 0, padding: '2px 3px', fontFamily: LO_MONO, fontSize: codeFont, lineHeight: 1.15, overflow: 'hidden', whiteSpace: 'pre', color: '#111827' }}>
                                {last ? (last.code || '').replace(/\t/g, '  ') : ''}
                            </pre>
                            {!last && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 11, paddingBottom: 6 }}>ไม่ได้ส่ง</div>}
                        </div>
                    );
                })}
            </div>
            <LOLegend />
        </div>
    );
};
LO_VIEW_COMPONENTS.gallery = LOGallery;

window.LearningOutcomesTab = LearningOutcomesTab;

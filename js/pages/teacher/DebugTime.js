// js/pages/teacher/DebugTime.js — แท็บ "เวลาแก้ไขข้อผิดพลาด" ใน Teacher Analytics (v1.0)
//
// อ่านอย่างเดียว ไม่เขียน Firestore ใด ๆ
//   - submissions/assignments/enrollments/students ใช้ชุดที่หน้า Analytics โหลดไว้แล้ว (ไม่อ่านซ้ำ)
//   - usageEvents: query ตาม courseId ครั้งเดียวต่อรายวิชา แคชในหน่วยความจำ (DT_EVENT_CACHE) จนกว่าจะรีโหลดหน้า
//   - preset ชุดโจทย์: อ่านจาก outcome_presets ของแท็บ "ผลลัพธ์ผู้เรียน" (ไม่สร้าง/แก้ไขที่นี่)
// การคำนวณทั้งหมดอยู่ใน js/debugTimeMetrics.js (window.DTM)

const DT_FONT = "'Prompt', sans-serif";
const DT_MONO = "'JetBrains Mono', Consolas, monospace";
const DT_EVENT_CACHE = {};   // courseId → Promise<events[]>
const DT_PRESET_CACHE = {};  // ownerId|courseId → Promise<presets[]>

const dtLoadEvents = (courseId, force) => {
    if (force) delete DT_EVENT_CACHE[courseId];
    if (!DT_EVENT_CACHE[courseId]) {
        DT_EVENT_CACHE[courseId] = db.collection('usageEvents').where('courseId', '==', courseId).get()
            .then(snap => snap.docs.map(d => {
                const x = d.data();
                return { uid: x.uid, event: x.event, assignmentId: x.assignmentId, courseId: x.courseId, timestamp: x.timestamp, userType: x.userType };
            }))
            .catch(e => { delete DT_EVENT_CACHE[courseId]; throw e; });
    }
    return DT_EVENT_CACHE[courseId];
};
const dtLoadPresets = (ownerId, courseId) => {
    const k = ownerId + '|' + courseId;
    if (!DT_PRESET_CACHE[k]) {
        DT_PRESET_CACHE[k] = db.collection('outcome_presets').where('ownerId', '==', ownerId).where('courseId', '==', courseId).get()
            .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th')))
            .catch(e => { delete DT_PRESET_CACHE[k]; throw e; });
    }
    return DT_PRESET_CACHE[k];
};
const dtDownload = (name, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const DT_UNITS = [1, 2, 3, 4, 5];
const DT_IDLES = [10, 15, 30];

const DebugTimeTab = ({ selectedCourse, course, userDoc, assignments = [], submissions = [], enrollments = [], students = {} }) => {
    const D = window.DTM, LO = window.LO;
    const me = userDoc && userDoc.id;

    // ── ตัวกรอง ──
    const [presets, setPresets] = React.useState([]);
    const [presetId, setPresetId] = React.useState('');
    const [selAids, setSelAids] = React.useState(null);          // null = ค่าเริ่มต้น (กิจกรรมที่เผยแพร่)
    const [stuMode, setStuMode] = React.useState('all');
    const [stuGroup, setStuGroup] = React.useState('fast');
    const [stuOne, setStuOne] = React.useState('');
    const [excludeTest, setExcludeTest] = React.useState(true);
    const [mask, setMask] = React.useState(true);
    const [idle, setIdle] = React.useState(15);
    const [early, setEarly] = React.useState([1, 2]);
    const [late, setLate] = React.useState([4, 5]);
    const [showPeople, setShowPeople] = React.useState(false);

    const [events, setEvents] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [err, setErr] = React.useState('');

    const load = (force) => {
        if (!selectedCourse) return;
        setLoading(true); setErr('');
        dtLoadEvents(selectedCourse, force)
            .then(ev => setEvents(ev))
            .catch(e => setErr('โหลด usageEvents ไม่สำเร็จ: ' + (e.message || e)))
            .finally(() => setLoading(false));
    };
    React.useEffect(() => { load(false); }, [selectedCourse]);
    React.useEffect(() => {
        if (!me || !selectedCourse) return;
        dtLoadPresets(me, selectedCourse).then(setPresets).catch(e => console.warn('[debugTime] presets', e));
    }, [me, selectedCourse]);

    // ── กิจกรรม ──
    const activities = React.useMemo(() => assignments
        .filter(a => a._src !== 'v2' && D.parseActivity(a.title))
        .map(a => ({ ...a, _p: D.parseActivity(a.title) }))
        .sort((a, b) => (a._p.unit - b._p.unit) || a._p.code.localeCompare(b._p.code)), [assignments]);
    const defaultAids = React.useMemo(() => activities.filter(a => a.isPublished !== false).map(a => a.id), [activities]);
    const aids = selAids || defaultAids;
    const aidSet = React.useMemo(() => new Set(aids), [aids]);
    const applyPreset = (id) => {
        setPresetId(id);
        const p = presets.find(x => x.id === id);
        setSelAids(p ? (p.assignmentIds || []).filter(a => activities.some(x => x.id === a)) : null);
    };
    const toggleAid = (id) => { setPresetId(''); setSelAids(s => { const cur = s || defaultAids; return cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]; }); };

    // ── ผู้เรียน ──
    const codes = React.useMemo(() => LO.buildCodes(enrollments, students), [enrollments, students]);
    const enrolled = React.useMemo(() => codes.list.map(c => c.uid), [codes]);
    // บัญชีทดสอบ = มีการส่งงานในรายวิชาแต่ไม่อยู่ในรายชื่อลงทะเบียน (เช่น บัญชีครูทดลองส่ง)
    const testUids = React.useMemo(() => {
        const en = new Set(enrolled);
        return [...new Set(submissions.map(s => s.studentId))].filter(u => u && !en.has(u)).sort();
    }, [submissions, enrolled]);
    const groups = React.useMemo(() => LO.buildGroups({
        uids: enrolled, submissions, submissionsV2: [], totalAssignments: assignments.length,
        classify: typeof classifyProfile === 'function' ? classifyProfile : undefined,
    }), [enrolled, submissions, assignments]);
    const uids = React.useMemo(() => {
        if (stuMode === 'group') return enrolled.filter(u => groups[u] && groups[u].group === stuGroup);
        if (stuMode === 'one') return stuOne ? [stuOne] : [];
        return excludeTest ? enrolled : [...enrolled, ...testUids];
    }, [stuMode, stuGroup, stuOne, enrolled, testUids, excludeTest, groups]);
    const uidSet = React.useMemo(() => new Set(uids), [uids]);
    const labelOf = (uid) => {
        const c = codes.byUid[uid];
        if (!c) return 'T' + (testUids.indexOf(uid) + 1);
        return mask ? c.code : c.code + ' · ' + (c.name || c.studentCode || '-');
    };
    const codeOf = (uid) => (codes.byUid[uid] ? codes.byUid[uid].code : 'T' + (testUids.indexOf(uid) + 1));

    // ── คำนวณ ──
    const base = React.useMemo(() => (events ? D.buildPairs({ submissions, events, assignments: activities, uids: uidSet, aids: aidSet }) : []),
        [events, submissions, activities, uidSet, aidSet]);
    const pairs = React.useMemo(() => D.applyIdle(base, idle), [base, idle]);
    const counts = React.useMemo(() => D.countPairs(base), [base]);
    const units = React.useMemo(() => D.unitTable(pairs), [pairs]);
    const cmp = React.useMemo(() => D.compare(pairs, early, late), [pairs, early, late]);
    const sens = React.useMemo(() => D.sensitivity(base, early, late, DT_IDLES), [base, early, late]);
    const direct = React.useMemo(() => D.directCheck(pairs), [pairs]);

    const f = D.fmt;
    const unitsLabel = (us) => us.length ? 'หน่วย ' + us.join(', ') : '(ยังไม่เลือก)';
    const toggleUnit = (setter, u) => setter(s => s.includes(u) ? s.filter(x => x !== u) : [...s, u].sort());

    // ── ส่งออก ──
    const fileTag = () => (course ? (course.title || '').split(' ')[0] : 'course') + '_idle' + idle;
    const exportEpisodes = () => {
        const head = ['รหัส'];
        if (!mask) head.push('ชื่อ', 'เลขประจำตัว');
        head.push('กิจกรรม', 'หน่วย', 'ความยาก', 'สถานะ', 'จำนวนการส่งทั้งหมด', 'ส่งก่อนได้เต็ม', `เวลาทำงานจริง (นาที, IDLE ${idle})`,
            'จำนวนช่วงพัก', 'แก้เสร็จในรอบเดียว', 'เวลาตามนาฬิกา t1-t0 (นาที)', 'ได้เต็มวันเดียวกัน', 'จำนวนเหตุการณ์',
            'timeSpent วัดตรง (นาที)', 'runCount วัดตรง');
        const ST = { first: 'ถูกตั้งแต่ครั้งแรก', solved: 'แก้สำเร็จ', unsolved: 'แก้ไม่สำเร็จ' };
        const rows = [...pairs].sort((a, b) => codeOf(a.uid).localeCompare(codeOf(b.uid)) || (a.unit - b.unit) || a.code.localeCompare(b.code)).map(p => {
            const c = codes.byUid[p.uid];
            const r = [codeOf(p.uid)];
            if (!mask) r.push(c ? c.name : '', c ? c.studentCode : '');
            const s = p.status === 'solved';
            r.push(p.code, p.unit, D.DIFF_LABEL[p.difficulty], ST[p.status], p.nSubs, p.attemptsBefore == null ? 0 : p.attemptsBefore,
                s ? f(p.activeMin, 2) : '', s ? p.breaks : '', s ? (p.oneSitting ? 'ใช่' : 'ไม่') : '', s ? f(p.wallMin, 2) : '',
                s ? (p.sameDay ? 'ใช่' : 'ไม่') : '', s ? p.nEvents : '',
                s && p.measuredMin != null ? f(p.measuredMin, 2) : '', s && p.measuredRuns != null ? p.measuredRuns : '');
            return r;
        });
        dtDownload(`debug_episodes_${fileTag()}.csv`, D.toCSV([head, ...rows]));
    };
    const exportSummary = () => {
        const R = [];
        R.push(['เวลาแก้ไขข้อผิดพลาด', course ? course.title : '', `IDLE ${idle} นาที`, `ผู้เรียน ${uids.length} คน`, `กิจกรรม ${aids.length} ข้อ`]);
        R.push(['คู่ทั้งหมด', counts.pairs, 'ถูกตั้งแต่ครั้งแรก', counts.first, 'ได้เต็มในที่สุด', counts.everFull, 'ช่วงแก้สำเร็จ', counts.solved, 'แก้ไม่สำเร็จ', counts.unsolved]);
        R.push([]);
        R.push(['1) รายหน่วย', 'คู่', 'ถูกตั้งแต่ครั้งแรก', 'ช่วงแก้สำเร็จ', 'แก้ไม่สำเร็จ', 'ค่าเฉลี่ย (นาที)', 'มัธยฐาน (นาที)', '% เสร็จในรอบเดียว', '% ได้เต็มวันเดียวกัน', 'ส่งก่อนได้เต็ม (เฉลี่ย)']);
        units.forEach(u => R.push(['หน่วย ' + u.unit, u.pairs, u.first, u.solved, u.unsolved, f(u.mean), f(u.median), f(u.pctOneSitting, 1), f(u.pctSameDay, 1), f(u.meanAttempts)]));
        R.push([]);
        R.push(['2) ต้นภาค vs ปลายภาค', 'n', 'ค่าเฉลี่ย', 'มัธยฐาน']);
        R.push(['ต้นภาค ' + unitsLabel(early), cmp.early.n, f(cmp.early.mean), f(cmp.early.median)]);
        R.push(['ปลายภาค ' + unitsLabel(late), cmp.late.n, f(cmp.late.mean), f(cmp.late.median)]);
        R.push(['% ลดลง', '', f(cmp.pctDropMean, 1), f(cmp.pctDropMedian, 1)]);
        R.push(['bootstrap 95% CI ของ % มัธยฐานลดลง', `${cmp.reps} รอบ seed ${D.BOOT_SEED}`, f(cmp.ciLo, 1), f(cmp.ciHi, 1)]);
        R.push([]);
        R.push(['3) รายบุคคล', 'n คน', 'ลดลง', 'เพิ่มขึ้น', 'มัธยฐานต้นภาค', 'มัธยฐานปลายภาค', 'W+', 'W-', 'z', 'p']);
        const I = cmp.indiv;
        R.push(['Wilcoxon signed-rank', I.n, I.decreased, I.increased, f(I.medianEarly), f(I.medianLate), I.Wplus, I.Wminus, f(I.z), D.fmtP(I.p)]);
        cmp.people.forEach(p => R.push([codeOf(p.uid), p.nEarly + '/' + p.nLate + ' ช่วง', '', '', f(p.early), f(p.late)]));
        R.push([]);
        R.push(['4) ความไว', 'IDLE', 'n ต้น', 'เฉลี่ยต้น', 'มัธยฐานต้น', 'n ปลาย', 'เฉลี่ยปลาย', 'มัธยฐานปลาย', '% มัธยฐานลดลง', 'CI ล่าง', 'CI บน', 'n คน', 'ลดลง', 'z', 'p']);
        sens.forEach(s => R.push([s.filterLabel, s.idle, s.early.n, f(s.early.mean), f(s.early.median), s.late.n, f(s.late.mean), f(s.late.median),
            f(s.pctDropMedian, 1), f(s.ciLo, 1), f(s.ciHi, 1), s.indiv.n, s.indiv.decreased, f(s.indiv.z), D.fmtP(s.indiv.p)]));
        R.push([]);
        R.push(['5) วัดตรงเทียบค่าประมาณ', 'n ช่วง', 'ประมาณ: เฉลี่ย', 'ประมาณ: มัธยฐาน', 'วัดตรง: เฉลี่ย', 'วัดตรง: มัธยฐาน', 'Spearman ρ (เวลา)', 'Spearman ρ (ประมาณ vs runCount)']);
        R.push(['', direct.n, f(direct.meanEst), f(direct.medianEst), f(direct.meanMeasured), f(direct.medianMeasured), f(direct.rho, 3), f(direct.rhoRuns, 3)]);
        dtDownload(`debug_summary_${fileTag()}.csv`, D.toCSV(R));
    };

    // ── สไตล์ ──
    const th = { padding: '6px 8px', fontSize: 12, borderBottom: '2px solid #f9a8d4', background: '#fdf2f8', color: '#9d174d', textAlign: 'center', whiteSpace: 'nowrap' };
    const td = { padding: '5px 8px', fontSize: 13, borderBottom: '1px solid #fce7f3', textAlign: 'center' };
    const tdL = { ...td, textAlign: 'left' };
    const card = { border: '1px solid #fbcfe8', borderRadius: 12, padding: 14, marginBottom: 14, background: '#fff' };
    const h = { fontWeight: 700, color: '#9d174d', marginBottom: 8, fontSize: 15 };
    const chip = (on) => ({ padding: '2px 8px', borderRadius: 999, fontSize: 12, fontFamily: DT_MONO, cursor: 'pointer',
        background: on ? '#ec4899' : '#fce7f3', color: on ? '#fff' : '#9d174d', border: 'none' });
    const btn = { padding: '6px 12px', borderRadius: 8, background: '#be185d', color: '#fff', fontSize: 13 };

    return (
        <div style={{ fontFamily: DT_FONT }}>
            {/* ── ตัวกรอง ── */}
            <div style={card}>
                <div className="flex flex-wrap items-end gap-3 mb-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">📁 Preset ชุดโจทย์ (จากแท็บผลลัพธ์ผู้เรียน)</label>
                        <select className="k-input" style={{ minWidth: 220 }} value={presetId} onChange={e => applyPreset(e.target.value)}>
                            <option value="">— กิจกรรมที่เผยแพร่ทั้งหมด —</option>
                            {presets.map(p => <option key={p.id} value={p.id}>{p.name} ({(p.assignmentIds || []).length} ข้อ)</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">👥 ผู้เรียน</label>
                        <select className="k-input" value={stuMode} onChange={e => setStuMode(e.target.value)}>
                            <option value="all">ทั้งหมด</option>
                            <option value="group">รายกลุ่ม</option>
                            <option value="one">รายคน</option>
                        </select>
                    </div>
                    {stuMode === 'group' && (
                        <select className="k-input" value={stuGroup} onChange={e => setStuGroup(e.target.value)}>
                            {['fast', 'mid', 'stuck'].map(g => <option key={g} value={g}>{LO.GROUP3_LABEL[g]} ({enrolled.filter(u => groups[u] && groups[u].group === g).length} คน)</option>)}
                        </select>
                    )}
                    {stuMode === 'one' && (
                        <select className="k-input" value={stuOne} onChange={e => setStuOne(e.target.value)}>
                            <option value="">— เลือก —</option>
                            {enrolled.map(u => <option key={u} value={u}>{labelOf(u)}</option>)}
                        </select>
                    )}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">⏸️ IDLE (ช่วงห่างที่ถือว่าพัก)</label>
                        <select className="k-input" value={idle} onChange={e => setIdle(+e.target.value)}>
                            {DT_IDLES.map(v => <option key={v} value={v}>{v} นาที</option>)}
                        </select>
                    </div>
                    <button onClick={() => load(true)} disabled={loading} className="text-xs underline" style={{ color: '#be185d', marginBottom: 8 }}>
                        {loading ? 'กำลังโหลด…' : '🔄 โหลด usageEvents ใหม่'}
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={excludeTest} onChange={e => setExcludeTest(e.target.checked)} disabled={stuMode !== 'all'} />
                        🧪 ตัดบัญชีทดสอบ (ส่งงานแต่ไม่อยู่ในรายชื่อลงทะเบียน: {testUids.length} บัญชี)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={mask} onChange={e => setMask(e.target.checked)} />
                        🔒 ปิดชื่อ (ใช้รหัส {codes.list.length ? codes.list[0].code + '–' + codes.list[codes.list.length - 1].code : 'S01…'})
                    </label>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                    <span className="text-gray-500" style={{ width: 70 }}>ต้นภาค:</span>
                    {DT_UNITS.map(u => <button key={u} style={chip(early.includes(u))} onClick={() => toggleUnit(setEarly, u)}>หน่วย {u}</button>)}
                    <span className="text-gray-500 ml-4" style={{ width: 70 }}>ปลายภาค:</span>
                    {DT_UNITS.map(u => <button key={u} style={chip(late.includes(u))} onClick={() => toggleUnit(setLate, u)}>หน่วย {u}</button>)}
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-gray-500 mr-1">กิจกรรมที่นับ ({aids.length}):</span>
                    {activities.map(a => (
                        <button key={a.id} title={a.title + (a.isPublished === false ? ' (ซ่อน)' : '') + ' · ' + (a.difficulty || '-')}
                            style={{ ...chip(aidSet.has(a.id)), opacity: a.isPublished === false && !aidSet.has(a.id) ? 0.5 : 1 }}
                            onClick={() => toggleAid(a.id)}>{a._p.code}</button>
                    ))}
                    {selAids && <button className="underline ml-2" style={{ color: '#be185d' }} onClick={() => { setSelAids(null); setPresetId(''); }}>คืนค่าเริ่มต้น</button>}
                </div>
            </div>

            {err && <div className="mb-3 p-3 rounded text-sm" style={{ background: '#fef2f2', color: '#b91c1c' }}>⚠️ {err}</div>}
            {!events ? (loading ? <Spinner text="กำลังโหลด usageEvents ของรายวิชา (ครั้งเดียว)…" /> : null) : (
                <>
                    {/* ── สรุปจำนวนคู่ ── */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                        {[
                            ['คู่ (ผู้เรียน × กิจกรรม)', counts.pairs, '#be185d'],
                            ['ถูกตั้งแต่ครั้งแรก', counts.first, '#16a34a'],
                            ['ได้เต็มในที่สุด', counts.everFull, '#0ea5e9'],
                            ['ช่วงแก้สำเร็จ', counts.solved, '#7c3aed'],
                            ['แก้ไม่สำเร็จ', counts.unsolved, '#dc2626'],
                        ].map(([l, v, c]) => (
                            <div key={l} style={{ ...card, marginBottom: 0, padding: 12 }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
                                <div className="text-xs text-gray-500">{l}</div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4 justify-end">
                        <button style={btn} onClick={exportEpisodes}>⬇️ CSV รายช่วง ({pairs.length} คู่)</button>
                        <button style={btn} onClick={exportSummary}>⬇️ CSV ตารางสรุป</button>
                    </div>

                    {/* ── 1. รายหน่วย ── */}
                    <div style={card}>
                        <div style={h}>1) เวลาแก้ไขรายหน่วย (IDLE {idle} นาที)</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead><tr>
                                    {['หน่วย', 'คู่', 'ถูกตั้งแต่ครั้งแรก', 'ช่วงแก้สำเร็จ', 'แก้ไม่สำเร็จ', 'ค่าเฉลี่ย (นาที)', 'มัธยฐาน (นาที)', '% เสร็จในรอบเดียว', '% เต็มวันเดียวกัน', 'ส่งก่อนได้เต็ม (เฉลี่ย)']
                                        .map(x => <th key={x} style={th}>{x}</th>)}
                                </tr></thead>
                                <tbody>
                                    {units.map(u => (
                                        <tr key={u.unit} style={{ background: early.includes(u.unit) ? '#eff6ff' : late.includes(u.unit) ? '#f0fdf4' : undefined }}>
                                            <td style={{ ...td, fontWeight: 700 }}>{u.unit}</td>
                                            <td style={td}>{u.pairs}</td><td style={td}>{u.first}</td>
                                            <td style={{ ...td, fontWeight: 700 }}>{u.solved}</td><td style={td}>{u.unsolved}</td>
                                            <td style={td}>{f(u.mean)}</td><td style={{ ...td, fontWeight: 700 }}>{f(u.median)}</td>
                                            <td style={td}>{f(u.pctOneSitting, 1)}</td><td style={td}>{f(u.pctSameDay, 1)}</td><td style={td}>{f(u.meanAttempts)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">สีฟ้า = หน่วยต้นภาค · สีเขียว = หน่วยปลายภาค · "เสร็จในรอบเดียว" = ไม่มีช่วงห่างเกิน IDLE ระหว่างส่งครั้งแรกถึงได้เต็ม</div>
                    </div>

                    {/* ── 2. ต้นภาค vs ปลายภาค ── */}
                    <div style={card}>
                        <div style={h}>2) ต้นภาค ({unitsLabel(early)}) เทียบปลายภาค ({unitsLabel(late)})</div>
                        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 640 }}>
                            <thead><tr>{['', 'n ช่วง', 'ค่าเฉลี่ย (นาที)', 'มัธยฐาน (นาที)'].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead>
                            <tbody>
                                <tr><td style={tdL}>ต้นภาค</td><td style={td}>{cmp.early.n}</td><td style={td}>{f(cmp.early.mean)}</td><td style={{ ...td, fontWeight: 700 }}>{f(cmp.early.median)}</td></tr>
                                <tr><td style={tdL}>ปลายภาค</td><td style={td}>{cmp.late.n}</td><td style={td}>{f(cmp.late.mean)}</td><td style={{ ...td, fontWeight: 700 }}>{f(cmp.late.median)}</td></tr>
                                <tr style={{ background: '#fdf2f8' }}><td style={tdL}>% ลดลง</td><td style={td} /><td style={td}>{f(cmp.pctDropMean, 1)}%</td><td style={{ ...td, fontWeight: 700 }}>{f(cmp.pctDropMedian, 1)}%</td></tr>
                            </tbody>
                        </table>
                        <div className="text-sm mt-2">
                            bootstrap 95% CI ของ % ที่มัธยฐานลดลง: <b>[{f(cmp.ciLo, 1)}%, {f(cmp.ciHi, 1)}%]</b>
                            <span className="text-xs text-gray-500"> · สุ่มซ้ำแยกกลุ่ม {cmp.reps} รอบ · seed {D.BOOT_SEED} (ผลเท่าเดิมทุกครั้ง)
                                {Number.isFinite(cmp.ciLo) && cmp.ciLo <= 0 ? ' · ช่วงคร่อม 0 จึงยังสรุปไม่ได้ว่าลดลงจริง' : ''}</span>
                        </div>
                    </div>

                    {/* ── 3. รายบุคคล ── */}
                    <div style={card}>
                        <div style={h}>3) เทียบรายบุคคล (มัธยฐานต่อคนในแต่ละช่วง)</div>
                        <div className="text-sm" style={{ lineHeight: 1.8 }}>
                            ผู้เรียนที่มีช่วงแก้สำเร็จทั้งต้นและปลายภาค <b>{cmp.indiv.n}</b> คน ·
                            ลดลง <b>{cmp.indiv.decreased}</b> คน · เพิ่มขึ้น {cmp.indiv.increased} คน ·
                            มัธยฐานของมัธยฐานรายคน {f(cmp.indiv.medianEarly)} → {f(cmp.indiv.medianLate)} นาที
                            <br />Wilcoxon signed-rank: W+ = {cmp.indiv.Wplus}, W− = {cmp.indiv.Wminus},
                            {' '}<b>z = {f(cmp.indiv.z)}</b>, <b>p = {D.fmtP(cmp.indiv.p)}</b>
                            <span className="text-xs text-gray-500"> (normal approximation + tie correction, ไม่ใช้ continuity correction, ผลต่าง = ปลาย − ต้น, ตัดคู่ที่ผลต่างเป็น 0)</span>
                        </div>
                        <button className="text-xs underline mt-1" style={{ color: '#be185d' }} onClick={() => setShowPeople(x => !x)}>{showPeople ? 'ซ่อน' : 'ดู'}รายคน</button>
                        {showPeople && (
                            <table style={{ borderCollapse: 'collapse', marginTop: 6 }}>
                                <thead><tr>{['ผู้เรียน', 'ช่วง ต้น/ปลาย', 'มัธยฐานต้น', 'มัธยฐานปลาย', 'เปลี่ยน'].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead>
                                <tbody>
                                    {[...cmp.people].sort((a, b) => codeOf(a.uid).localeCompare(codeOf(b.uid))).map(p => (
                                        <tr key={p.uid}>
                                            <td style={{ ...tdL, fontFamily: DT_MONO }}>{labelOf(p.uid)}</td>
                                            <td style={td}>{p.nEarly}/{p.nLate}</td><td style={td}>{f(p.early)}</td><td style={td}>{f(p.late)}</td>
                                            <td style={{ ...td, color: p.late < p.early ? '#16a34a' : p.late > p.early ? '#dc2626' : '#6b7280' }}>{p.late < p.early ? '▼' : p.late > p.early ? '▲' : '='} {f(p.late - p.early)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ── 4. ความไว ── */}
                    <div style={card}>
                        <div style={h}>4) วิเคราะห์ความไว (IDLE × ระดับความยาก)</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead><tr>
                                    {['กิจกรรม', 'IDLE', 'n ต้น', 'เฉลี่ยต้น', 'มัธยฐานต้น', 'n ปลาย', 'เฉลี่ยปลาย', 'มัธยฐานปลาย', '% มัธยฐานลดลง', '95% CI', 'คน', 'ลดลง', 'z', 'p']
                                        .map(x => <th key={x} style={th}>{x}</th>)}
                                </tr></thead>
                                <tbody>
                                    {sens.map(s => (
                                        <tr key={s.filter + s.idle} style={{ background: s.idle === idle && s.filter === 'all' ? '#fdf2f8' : undefined }}>
                                            <td style={tdL}>{s.filterLabel}</td><td style={td}>{s.idle}</td>
                                            <td style={td}>{s.early.n}</td><td style={td}>{f(s.early.mean)}</td><td style={td}>{f(s.early.median)}</td>
                                            <td style={td}>{s.late.n}</td><td style={td}>{f(s.late.mean)}</td><td style={td}>{f(s.late.median)}</td>
                                            <td style={{ ...td, fontWeight: 700 }}>{f(s.pctDropMedian, 1)}</td>
                                            <td style={td}>[{f(s.ciLo, 1)}, {f(s.ciHi, 1)}]</td>
                                            <td style={td}>{s.indiv.n}</td><td style={td}>{s.indiv.decreased}</td>
                                            <td style={td}>{f(s.indiv.z)}</td><td style={td}>{D.fmtP(s.indiv.p)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">ระดับความยากจาก assignments.difficulty · แถวที่ไฮไลต์คือค่าที่ใช้ในข้อ 1–3</div>
                    </div>

                    {/* ── 5. วัดตรง vs ประมาณ ── */}
                    <div style={card}>
                        <div style={h}>5) ค่าที่วัดตรง (timeSpentSeconds / runCount) เทียบค่าประมาณ</div>
                        {direct.n === 0 ? (
                            <div className="text-sm text-gray-500">ยังไม่มีช่วงแก้ไขที่ทุกการส่งใน (t0, t1] มี timeSpentSeconds (ระบบเริ่มบันทึก 26 ก.ย. 2569)</div>
                        ) : (
                            <>
                                <div className="text-sm mb-2" style={{ lineHeight: 1.8 }}>
                                    ช่วงที่มีค่าวัดตรงครบ <b>{direct.n}</b> ช่วง ·
                                    ค่าประมาณ เฉลี่ย {f(direct.meanEst)} / มัธยฐาน {f(direct.medianEst)} นาที ·
                                    วัดตรง เฉลี่ย {f(direct.meanMeasured)} / มัธยฐาน {f(direct.medianMeasured)} นาที ·
                                    นาฬิกา t1−t0 เฉลี่ย {f(direct.meanWall)} นาที
                                    <br />Spearman ρ (ประมาณ vs วัดตรง) = <b>{f(direct.rho, 3)}</b>
                                    {' '}· ρ (ประมาณ vs runCount) = {f(direct.rhoRuns, 3)}
                                    {direct.n < 10 && <span className="text-xs" style={{ color: '#b45309' }}> · ข้อมูลยังน้อย (n &lt; 10) ค่า ρ ยังไม่น่าเชื่อถือ</span>}
                                </div>
                                <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
                                    <table style={{ borderCollapse: 'collapse' }}>
                                        <thead><tr>{['ผู้เรียน', 'กิจกรรม', 'ประมาณ (นาที)', 'วัดตรง (นาที)', 'runCount', 'ช่วงพัก'].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead>
                                        <tbody>
                                            {direct.rows.map(p => (
                                                <tr key={p.uid + p.aid}>
                                                    <td style={{ ...tdL, fontFamily: DT_MONO }}>{labelOf(p.uid)}</td><td style={td}>{p.code}</td>
                                                    <td style={td}>{f(p.activeMin)}</td><td style={td}>{f(p.measuredMin)}</td>
                                                    <td style={td}>{p.measuredRuns == null ? '–' : p.measuredRuns}</td><td style={td}>{p.breaks}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="text-xs text-gray-500" style={{ lineHeight: 1.7 }}>
                        <b>นิยาม</b> · ได้เต็ม = ผ่านทุกกรณีทดสอบ (ไม่มีจำนวนกรณีทดสอบใช้คะแนน ≥ 100) · ช่วงแก้ไขเริ่มที่การส่งครั้งแรกซึ่งยังไม่เต็ม (t0)
                        และจบที่การส่งครั้งแรกที่ได้เต็มหลังจากนั้น (t1) · เวลาทำงานจริง = ผลรวมช่วงห่างระหว่างเหตุการณ์ (usageEvents ทุกประเภทของคู่นั้น เฉพาะ userType=student
                        และเวลาส่งทุกครั้ง) ภายใน [t0, t1] โดยไม่นับช่วงห่างที่เกิน IDLE · วันเดียวกันคิดตามเวลาไทย (UTC+7) · ค่าวัดตรง = ผลรวม timeSpentSeconds ของการส่งใน (t0, t1]
                        · ใช้ submissions ชุดเดียวกับหน้า Analytics (ไม่นับการส่งหลังปิดรับคะแนน) · ผู้เรียน {uids.length} คน · usageEvents ที่โหลด {events.length} รายการ
                    </div>
                </>
            )}
        </div>
    );
};
window.DebugTimeTab = DebugTimeTab;

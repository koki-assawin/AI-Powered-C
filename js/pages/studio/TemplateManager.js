/**
 * js/pages/studio/TemplateManager.js — หน้า #/teacher/studio/templates (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: A₂ (ใช้กับของจริง), D
 * ครูเลือกรายวิชาที่เปิด Studio → เลือกชุดโจทย์ (ไฟล์ตัวอย่างในโปรเจกต์ หรืออัปโหลด JSON)
 * → ดูตัวอย่าง (dry-run) → ตรวจเฉลย → นำเข้าโจทย์ใหม่ / เติมข้อมูล Studio ให้โจทย์เดิม → ส่งออก
 */

const _TM_STATUS = {
    new:     { label: 'ใหม่',       bg: '#E8F5E9', fg: '#2E7D32' },
    exists:  { label: 'มีแล้ว',     bg: '#E3F2FD', fg: '#1565C0' },
    invalid: { label: 'ข้อมูลผิด',  bg: '#FFEBEE', fg: '#C62828' },
};

const _tmGuessTemplate = (problems) => {
    const c = (problems[0] && problems[0].course) || '';
    if (/23207/.test(c)) return 'w23207';
    if (/23103/.test(c)) return 'w23103_ch2';
    return 'generic_python';
};

const TemplateManager = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const [courses, setCourses] = React.useState([]);
    const [courseId, setCourseId] = React.useState(params.get('course') || '');
    const [problems, setProblems] = React.useState(null);
    const [packName, setPackName] = React.useState('');
    const [templateId, setTemplateId] = React.useState('w23207');
    const [plan, setPlan] = React.useState(null);
    const [verify, setVerify] = React.useState(null);
    const [busy, setBusy] = React.useState('');
    const [progress, setProgress] = React.useState('');
    const [msg, setMsg] = React.useState({ text: '', type: 'ok' });

    const course = courses.find(c => c.id === courseId) || null;
    const writable = !!course && isStudio(course);

    const show = (text, type = 'ok') => setMsg({ text, type });

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
            list.sort((a, b) => (isStudio(b) - isStudio(a)) || (a.title || '').localeCompare(b.title || '', 'th'));
            setCourses(list);
        }).catch(err => show('โหลดรายวิชาไม่สำเร็จ: ' + err.message, 'err'));
        return () => { alive = false; };
    }, [userDoc]);

    // คำนวณ dry-run ใหม่ทุกครั้งที่เปลี่ยนรายวิชา ชุดโจทย์ หรือ template
    const refreshPlan = React.useCallback(async () => {
        if (!problems || !course) { setPlan(null); return; }
        try {
            const existing = await tpLoadCourseAssignments(course.id);
            setPlan(tpPlanImport(problems, templateId, existing));
        } catch (err) { show('อ่านโจทย์ในรายวิชาไม่สำเร็จ: ' + err.message, 'err'); }
    }, [problems, course && course.id, templateId]);
    React.useEffect(() => { refreshPlan(); }, [refreshPlan]);

    const usePack = (list, name) => {
        if (!Array.isArray(list)) { show('ไฟล์ต้องเป็น JSON array ของโจทย์', 'err'); return; }
        setProblems(list); setPackName(name); setVerify(null); setTemplateId(_tmGuessTemplate(list));
        show(`อ่านชุดโจทย์ ${name} แล้ว ${list.length} ข้อ`);
    };

    const loadSample = async (file) => {
        if (!file) return;
        setBusy('load');
        try {
            const r = await fetch(`${file}?v=${Date.now()}`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            usePack(await r.json(), file.split('/').pop());
        } catch (err) { show('โหลดไฟล์ไม่สำเร็จ: ' + err.message, 'err'); }
        finally { setBusy(''); }
    };

    const loadUpload = (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            try { usePack(JSON.parse(reader.result), f.name); }
            catch (err) { show('อ่าน JSON ไม่ได้: ' + err.message, 'err'); }
        };
        reader.readAsText(f, 'utf-8');
        e.target.value = '';
    };

    const runVerify = async () => {
        setBusy('verify'); setVerify(null);
        try {
            const res = await tpVerifySolutions(problems, (d, t) => setProgress(`ตรวจเฉลย ${d}/${t} กรณี`));
            setVerify(res);
            logStudioEvent('template_verify', courseId || null, { pack: packName, passed: res.passedTests, total: res.totalTests, failedProblems: res.failedProblems });
            show(res.failedProblems === 0
                ? `✅ เฉลยผ่านครบ ${res.passedTests}/${res.totalTests} กรณี`
                : `⚠️ เฉลยไม่ผ่าน ${res.failedProblems} ข้อ (ผ่าน ${res.passedTests}/${res.totalTests} กรณี)`, res.failedProblems ? 'err' : 'ok');
        } catch (err) { show('ตรวจเฉลยไม่สำเร็จ: ' + err.message, 'err'); }
        finally { setBusy(''); setProgress(''); }
    };

    const runImport = async () => {
        if (!confirm(`นำเข้าโจทย์ใหม่ ${plan.summary.new} ข้อ (test case ${plan.summary.testCases} กรณี) ลงรายวิชา\n"${course.title}"?\n\nโจทย์ที่นำเข้าจะยังไม่เผยแพร่ ครูตรวจแล้วค่อยกดเผยแพร่ในหน้าจัดการโจทย์`)) return;
        setBusy('import');
        try {
            const r = await tpCommitImport(course, plan, (d, t, code) => setProgress(`นำเข้า ${d}/${t} (${code})`));
            show(`✅ นำเข้าแล้ว ${r.created} ข้อ, test case ${r.testCases} กรณี (ยังไม่เผยแพร่)`);
            await refreshPlan();
        } catch (err) { show('นำเข้าไม่สำเร็จ: ' + err.message, 'err'); }
        finally { setBusy(''); setProgress(''); }
    };

    const runEnrich = async () => {
        const n = plan.summary.enrichable;
        if (!confirm(`เติมข้อมูล Studio ให้โจทย์เดิม ${n} ข้อ ในรายวิชา "${course.title}"?\n\nเพิ่มเฉพาะฟิลด์ที่ยังไม่มี (${TP_STUDIO_FIELDS.join(', ')})\nไม่แก้ชื่อ คำอธิบาย test case หรือคะแนน และบันทึกค่าก่อนแก้ไว้ทุกข้อ`)) return;
        setBusy('enrich');
        try {
            const r = await tpCommitEnrich(course, plan, (d, t, code) => setProgress(`เติมข้อมูล ${d}/${t} (${code})`));
            show(`✅ เติมข้อมูล Studio แล้ว ${r.updated} ข้อ`);
            await refreshPlan();
        } catch (err) { show('เติมข้อมูลไม่สำเร็จ: ' + err.message, 'err'); }
        finally { setBusy(''); setProgress(''); }
    };

    const runSave = async () => {
        setBusy('save');
        try {
            await tpSaveToLibrary(templateId, packName, problems, courseId || null);
            show(`✅ บันทึกชุดโจทย์ (รวมเฉลย) ไว้ในคลัง template "${templateId}" แล้ว — นักเรียนมองไม่เห็นคลังนี้`);
        } catch (err) { show('บันทึกไม่สำเร็จ: ' + err.message, 'err'); }
        finally { setBusy(''); }
    };

    const runExport = async () => {
        setBusy('export');
        try {
            const pack = await tpExportCourse(course);
            const safe = (course.title || course.id).replace(/[\\/:*?"<>|\s]+/g, '_');
            tpDownloadJson(`apcc_template_${safe}.json`, pack);
            const noSol = pack.filter(p => !p.solution).length;
            show(`✅ ส่งออก ${pack.length} ข้อ` + (noSol ? ` (${noSol} ข้อไม่มีเฉลย เพราะไม่พบในคลัง template)` : ''));
        } catch (err) { show('ส่งออกไม่สำเร็จ: ' + err.message, 'err'); }
        finally { setBusy(''); }
    };

    const card = 'bg-white rounded-2xl p-5 shadow-sm mb-5';
    const cardStyle = { border: '1px solid #FFD1DC' };
    const btn = 'k-btn-pink text-sm px-4 py-2';

    return (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="APCC Studio — ชุดโจทย์" />
            <main className="max-w-6xl mx-auto px-4 py-6">
                <h1 className="text-xl font-bold mb-1" style={{ color: '#4527A0' }}>📦 Course Template Pack</h1>
                <p className="text-sm text-gray-500 mb-5">นำเข้า ตรวจเฉลย และส่งออกชุดโจทย์ของรายวิชาที่เปิด APCC Studio</p>

                {msg.text && (
                    <div className={`p-3 rounded-xl mb-4 text-sm border ${msg.type === 'err' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {msg.text}
                    </div>
                )}

                {/* 1. รายวิชา */}
                <div className={card} style={cardStyle}>
                    <h2 className="font-bold text-gray-800 mb-3">1. เลือกรายวิชา</h2>
                    <select value={courseId} onChange={e => setCourseId(e.target.value)} className="k-input" style={{ paddingLeft: '8px' }}>
                        <option value="">— เลือกรายวิชา —</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>
                                {isStudio(c) ? '🎨 ' : isProtectedCourse(c) ? '🔒 ' : ''}{c.title} ({c.language})
                            </option>
                        ))}
                    </select>
                    {course && !writable && (
                        <p className="text-sm mt-2" style={{ color: '#C62828' }}>
                            {isProtectedCourse(course)
                                ? '🔒 รายวิชานี้เป็นข้อมูลวิจัย นำเข้าหรือแก้ไขไม่ได้ (ส่งออกได้)'
                                : <span>รายวิชานี้ยังไม่ได้เปิด APCC Studio — <a className="underline" href={`#/teacher/courses?edit=${course.id}`}>เปิดในหน้าแก้ไขรายวิชา</a></span>}
                        </p>
                    )}
                    {course && (
                        <div className="mt-3">
                            <button onClick={runExport} disabled={!!busy} className="k-btn-outline text-sm px-4 py-2">
                                {busy === 'export' ? 'กำลังส่งออก...' : '⬇️ ส่งออกรายวิชานี้เป็น template (ไม่มีข้อมูลนักเรียน)'}
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. ชุดโจทย์ */}
                <div className={card} style={cardStyle}>
                    <h2 className="font-bold text-gray-800 mb-3">2. เลือกชุดโจทย์</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select defaultValue="" onChange={e => loadSample(e.target.value)} className="k-input" style={{ paddingLeft: '8px' }} disabled={!!busy}>
                            <option value="">— ไฟล์ตัวอย่างในระบบ —</option>
                            {STUDIO_SAMPLE_PACKS.map(s => <option key={s.file} value={s.file}>{s.label}</option>)}
                        </select>
                        <label className="k-btn-outline text-sm px-4 py-2 text-center cursor-pointer">
                            📂 อัปโหลดไฟล์ JSON
                            <input type="file" accept=".json,application/json" onChange={loadUpload} className="hidden" />
                        </label>
                        <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="k-input" style={{ paddingLeft: '8px' }}>
                            {Object.keys(STUDIO_TEMPLATE_CONTENT).concat(['generic_python']).map(k => (
                                <option key={k} value={k}>template: {k}</option>
                            ))}
                        </select>
                    </div>
                    {problems && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button onClick={runVerify} disabled={!!busy} className="k-btn-outline text-sm px-4 py-2">
                                {busy === 'verify' ? progress || 'กำลังตรวจ...' : '🧪 ตรวจเฉลยก่อนนำเข้า'}
                            </button>
                            <button onClick={runSave} disabled={!!busy} className="k-btn-outline text-sm px-4 py-2">
                                {busy === 'save' ? 'กำลังบันทึก...' : '💾 บันทึกชุดนี้ลงคลัง template'}
                            </button>
                        </div>
                    )}
                    {verify && verify.results.some(r => r.failures.length || r.noSolution) && (
                        <div className="mt-3 text-xs space-y-1">
                            {verify.results.filter(r => r.failures.length || r.noSolution).map(r => (
                                <div key={r.code} className="p-2 rounded-lg" style={{ background: '#FFF8E1' }}>
                                    <b>{r.code}</b> {r.title} — {r.noSolution ? 'ไม่มีเฉลย' : `ไม่ผ่าน ${r.failures.length}/${r.total}`}
                                    {r.failures.slice(0, 2).map(f => (
                                        <div key={f.test} className="font-mono text-gray-600 whitespace-pre-wrap">
                                            test {f.test}: ได้ {JSON.stringify(f.actual)} ต้องการ {JSON.stringify(f.expected)} {f.error && `· ${f.error.slice(0, 120)}`}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. ตัวอย่าง (dry-run) */}
                {plan && course && (
                    <div className={card} style={cardStyle}>
                        <h2 className="font-bold text-gray-800 mb-1">3. ตัวอย่างก่อนบันทึก (dry-run)</h2>
                        <p className="text-sm text-gray-500 mb-3">
                            {packName} → {course.title} · ทั้งหมด {plan.summary.total} ข้อ:
                            ใหม่ <b>{plan.summary.new}</b> · มีแล้ว <b>{plan.summary.exists}</b>
                            (เติมข้อมูล Studio ได้ <b>{plan.summary.enrichable}</b>) · ข้อมูลผิด <b>{plan.summary.invalid}</b>
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <button onClick={runImport} disabled={!!busy || !writable || plan.summary.new === 0} className={btn}>
                                {busy === 'import' ? progress || 'กำลังนำเข้า...' : `➕ นำเข้าโจทย์ใหม่ ${plan.summary.new} ข้อ`}
                            </button>
                            <button onClick={runEnrich} disabled={!!busy || !writable || plan.summary.enrichable === 0} className="k-btn-outline text-sm px-4 py-2">
                                {busy === 'enrich' ? progress || 'กำลังเติมข้อมูล...' : `✨ เติมข้อมูล Studio ให้โจทย์เดิม ${plan.summary.enrichable} ข้อ`}
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                        <th className="py-2 pr-2">รหัส</th><th className="pr-2">ชื่อ</th><th className="pr-2">ประเภท</th>
                                        <th className="pr-2">ระดับ</th><th className="pr-2">หน่วย / หัวข้อ</th><th className="pr-2">test</th>
                                        <th className="pr-2">สถานะ</th><th>ฟิลด์ Studio ที่จะเพิ่ม / หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plan.rows.map(r => {
                                        const s = _TM_STATUS[r.status];
                                        const a = r.mapped && r.mapped.assignment;
                                        const sf = r.mapped && r.mapped.studioFields;
                                        const fields = r.status === 'exists' ? Object.keys(r.patch) : (sf ? Object.keys(sf) : []);
                                        return (
                                            <tr key={r.idx} className="border-b align-top">
                                                <td className="py-1.5 pr-2 font-mono whitespace-nowrap">{r.code}</td>
                                                <td className="pr-2">{r.title}</td>
                                                <td className="pr-2">{sf ? (sf.studioType === 'parsons' ? '🧩 Parsons' : 'โค้ด') : '-'}</td>
                                                <td className="pr-2 whitespace-nowrap">{a ? `${a.difficulty}${a.assignmentType === 'exam' ? ' · สอบ' : ''}` : '-'}</td>
                                                <td className="pr-2 text-gray-500">{a ? a.topicName : '-'}</td>
                                                <td className="pr-2">{r.mapped ? r.mapped.testCases.length : '-'}</td>
                                                <td className="pr-2"><span className="px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>{s.label}</span></td>
                                                <td className="text-gray-600">
                                                    {r.status === 'invalid' ? r.errors.join(', ') : (fields.length ? fields.join(', ') : 'ครบแล้ว')}
                                                    {r.diffs && r.diffs.length > 0 && <div style={{ color: '#E65100' }}>⚠️ {r.diffs.join(' · ')}</div>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

window.TemplateManager = TemplateManager;

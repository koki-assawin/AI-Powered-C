/**
 * js/pages/studio/StudioGates.js — หน้า #/teacher/studio/gates (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: P (ด่านทักษะ), C (Explain-Back)
 * ครู: ตั้งด่านทักษะของรายวิชา · ดูความก้าวหน้าทั้งห้อง (คำนวณจาก submissions แบบอ่านอย่างเดียว)
 *      · ดูสรุป Explain-Back รายห้อง
 */

const StudioGates = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const [courses, setCourses] = React.useState([]);
    const [courseId, setCourseId] = React.useState(params.get('course') || '');
    const [tab, setTab] = React.useState(params.get('tab') || 'progress');
    const [gates, setGates] = React.useState([]);
    const [gateSource, setGateSource] = React.useState('');
    const [cls, setCls] = React.useState(null);
    const [eb, setEb] = React.useState(null);
    const [busy, setBusy] = React.useState('');
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
            const studio = list.filter(c => isStudio(c));
            setCourses(studio);
            if (!courseId && studio.length) setCourseId(studio[0].id);
        });
        return () => { alive = false; };
    }, [userDoc]);

    const aliveRef = React.useRef(true);
    React.useEffect(() => () => { aliveRef.current = false; }, []);
    const load = React.useCallback(async () => {
        if (!course) return;
        setBusy('load'); setMsg('');
        try {
            const [g, c, e] = await Promise.all([
                sgLoadGates(course),
                sgComputeClass(course),
                db.collection('studio_explainBack').where('courseId', '==', course.id).get(),
            ]);
            if (!aliveRef.current) return;   // ผู้ใช้เปลี่ยนหน้าไปแล้ว
            setGates(g.gates); setGateSource(g.source); setCls(c);
            const names = Object.fromEntries(c.rows.map(r => [r.uid, r.name]));
            setEb(e.docs.map(d => ({ id: d.id, ...d.data(), name: names[d.data().uid] || d.data().uid }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        } catch (err) { if (aliveRef.current) setMsg('โหลดข้อมูลไม่สำเร็จ: ' + err.message); }
        finally { if (aliveRef.current) setBusy(''); }
    }, [course && course.id]);
    React.useEffect(() => { load(); }, [load]);

    const setGate = (i, patch) => setGates(gs => gs.map((g, j) => j === i ? { ...g, ...patch } : g));
    const saveGates = async () => {
        setBusy('save');
        try {
            await sgSaveGates(course, gates.filter(g => g.name.trim() && g.skillTags.length));
            await load();
            setMsg('✅ บันทึกด่านทักษะแล้ว');
        } catch (err) { setMsg('บันทึกไม่สำเร็จ: ' + err.message); }
        finally { setBusy(''); }
    };

    const tags = cls ? [...new Set(cls.assignments.map(a => a.skillTag).filter(Boolean))].sort() : [];
    const tabBtn = (k, l) => (
        <button key={k} onClick={() => setTab(k)} className="px-4 py-2 text-sm font-semibold rounded-t-lg"
            style={tab === k ? { background: '#fff', color: '#4527A0', borderBottom: '2px solid #7E57C2' } : { color: '#9e9e9e' }}>{l}</button>
    );
    const ebStats = eb ? {
        total: eb.length,
        levels: [0, 1, 2, 3].map(l => eb.filter(x => x.mode === 'explain' && x.aiLevel === l).length),
        predictOk: eb.filter(x => x.mode === 'predict' && x.predictCorrect).length,
        predictAll: eb.filter(x => x.mode === 'predict').length,
    } : null;

    return (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="APCC Studio — ด่านทักษะ" />
            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h1 className="text-xl font-bold" style={{ color: '#4527A0' }}>🎯 ด่านทักษะ & Explain-Back</h1>
                    <a href={`#/teacher/studio/templates${courseId ? `?course=${courseId}` : ''}`} className="text-sm underline" style={{ color: '#5E35B1' }}>📦 ชุดโจทย์</a>
                </div>
                <select value={courseId} onChange={e => setCourseId(e.target.value)} className="k-input mb-4" style={{ paddingLeft: 8 }}>
                    {courses.length === 0 && <option value="">— ยังไม่มีรายวิชาที่เปิด APCC Studio —</option>}
                    {courses.map(c => <option key={c.id} value={c.id}>🎨 {c.title}</option>)}
                </select>
                {msg && <div className="p-3 rounded-xl mb-4 text-sm bg-white border">{msg}</div>}
                {busy === 'load' && <Spinner text="กำลังคำนวณ..." />}

                {course && cls && busy !== 'load' && (
                    <>
                        <div className="flex gap-1 border-b mb-4">{[tabBtn('progress', '📈 ความก้าวหน้า'), tabBtn('gates', '⚙️ ตั้งด่าน'), tabBtn('explain', `🗣️ Explain-Back (${eb ? eb.length : 0})`)]}</div>

                        {tab === 'progress' && (
                            <div className="bg-white rounded-2xl p-4 overflow-x-auto" style={{ border: '1px solid #FFD1DC' }}>
                                <p className="text-xs text-gray-500 mb-3">
                                    คำนวณจากการส่งงานจริง (อ่านอย่างเดียว) · ผ่านครบ {cls.rows.filter(r => r.createUnlocked).length}/{cls.rows.length} คน ปลดล็อกขั้นสร้างแล้ว
                                </p>
                                <table className="w-full text-xs">
                                    <thead><tr className="text-left text-gray-500 border-b">
                                        <th className="py-2 pr-2">นักเรียน</th><th className="pr-2">ห้อง/เลขที่</th>
                                        {cls.gates.map((g, i) => <th key={g.gateId} className="pr-2" title={g.skillTags.join(', ')}>{g.name}<div className="font-normal text-gray-400">{cls.problemCount[i]} ข้อ</div></th>)}
                                        <th>ขั้น</th>
                                    </tr></thead>
                                    <tbody>
                                        {cls.rows.length === 0 && <tr><td colSpan={cls.gates.length + 3} className="py-4 text-center text-gray-400">ยังไม่มีนักเรียนในรายวิชา</td></tr>}
                                        {cls.rows.map(r => (
                                            <tr key={r.uid} className="border-b">
                                                <td className="py-1.5 pr-2">{r.name}</td>
                                                <td className="pr-2 text-gray-500">{r.room}{r.number ? ` #${r.number}` : ''}</td>
                                                {r.gates.map(g => (
                                                    <td key={g.gateId} className="pr-2" style={{ color: g.done ? '#2E7D32' : '#9e9e9e' }}>
                                                        {g.done ? '✅' : '⬜'} {g.passed}/{g.need || '-'}
                                                    </td>
                                                ))}
                                                <td className="font-semibold" style={{ color: r.createUnlocked ? '#5E35B1' : '#9e9e9e' }}>{SG_STAGE_LABEL[r.stage]}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {tab === 'gates' && (
                            <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #FFD1DC' }}>
                                <p className="text-xs text-gray-500 mb-3">
                                    {gateSource === 'template' ? 'ใช้ด่านเริ่มต้นของ template (ยังไม่ได้บันทึก) · ' : ''}
                                    skillTag ที่มีในโจทย์ของรายวิชา: {tags.length ? tags.join(', ') : '— ไม่มี (ใช้ปุ่ม เติมข้อมูล Studio ในหน้าชุดโจทย์ก่อน)'}
                                </p>
                                {gates.map((g, i) => (
                                    <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-center">
                                        <input value={g.name} onChange={e => setGate(i, { name: e.target.value })} className="k-input text-sm md:col-span-4" placeholder="ชื่อด่าน" />
                                        <input value={g.skillTags.join(', ')} onChange={e => setGate(i, { skillTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="k-input text-sm md:col-span-3" placeholder="skillTag คั่นด้วย ," />
                                        <label className="text-xs md:col-span-2">ผ่าน ≥ <input type="number" min="10" max="100" value={Math.round(g.minRatio * 100)} onChange={e => setGate(i, { minRatio: Number(e.target.value) / 100 })} className="k-input text-sm inline-block" style={{ width: 70, padding: '4px 6px' }} />% ของข้อ</label>
                                        <label className="text-xs md:col-span-2">คะแนน ≥ <input type="number" min="1" max="100" value={g.passScore} onChange={e => setGate(i, { passScore: Number(e.target.value) })} className="k-input text-sm inline-block" style={{ width: 70, padding: '4px 6px' }} /></label>
                                        <button onClick={() => setGates(gs => gs.filter((_, j) => j !== i))} className="text-xs text-red-500 md:col-span-1">ลบ</button>
                                    </div>
                                ))}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <button onClick={() => setGates(gs => [...gs, sgNormalizeGate({ gateId: `g${Date.now() % 100000}`, name: '', skillTags: [] }, gs.length)])} className="k-btn-outline text-sm px-3 py-1.5">➕ เพิ่มด่าน</button>
                                    <button onClick={() => setGates(sgDefaultGates(course))} className="k-btn-outline text-sm px-3 py-1.5">↺ ค่าเริ่มต้นของ template</button>
                                    <button onClick={saveGates} disabled={!!busy} className="k-btn-pink text-sm px-4 py-1.5">{busy === 'save' ? 'กำลังบันทึก...' : '💾 บันทึกด่าน'}</button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">ผ่านด่านที่บังคับครบ ⇒ นักเรียนปลดล็อกขั้น "สร้าง" · นับเฉพาะโจทย์ฝึกที่เผยแพร่แล้ว ไม่นับข้อสอบ</p>
                            </div>
                        )}

                        {tab === 'explain' && eb && (
                            <div className="bg-white rounded-2xl p-4 overflow-x-auto" style={{ border: '1px solid #FFD1DC' }}>
                                <p className="text-xs text-gray-500 mb-3">
                                    ใช้ประกอบการสังเกตความเข้าใจ ไม่ใช่คะแนนตัดเกรด · อธิบาย: ระดับ 0 = {ebStats.levels[0]}, 1 = {ebStats.levels[1]}, 2 = {ebStats.levels[2]}, 3 = {ebStats.levels[3]} · ทำนายผลถูก {ebStats.predictOk}/{ebStats.predictAll}
                                </p>
                                <table className="w-full text-xs">
                                    <thead><tr className="text-left text-gray-500 border-b">
                                        <th className="py-2 pr-2">นักเรียน</th><th className="pr-2">โจทย์</th><th className="pr-2">แบบ</th><th className="pr-2">ผล</th><th className="pr-2">คำอธิบาย / คำตอบ</th><th>คำถามต่อ / คำตอบ</th>
                                    </tr></thead>
                                    <tbody>
                                        {eb.length === 0 && <tr><td colSpan="6" className="py-4 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr>}
                                        {eb.map(x => (
                                            <tr key={x.id} className="border-b align-top">
                                                <td className="py-1.5 pr-2 whitespace-nowrap">{x.name}</td>
                                                <td className="pr-2">{x.assignmentTitle}</td>
                                                <td className="pr-2">{x.mode === 'predict' ? '🔮 ทำนาย' : '✍️ อธิบาย'}</td>
                                                <td className="pr-2 whitespace-nowrap">{x.mode === 'predict' ? (x.predictCorrect ? '✅ ถูก' : '❌ ไม่ตรง') : `${x.aiLevel}/3${x.aiStatus === 'fallback' ? ' *' : ''}`}</td>
                                                <td className="pr-2 text-gray-700" style={{ maxWidth: 320 }}>{x.mode === 'predict' ? <pre className="whitespace-pre-wrap">{x.predictAnswer}</pre> : x.explanation}</td>
                                                <td className="text-gray-600" style={{ maxWidth: 260 }}>{x.followUp}{x.followUpAnswer && <div className="text-gray-800 mt-1">→ {x.followUpAnswer}</div>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="text-xs text-gray-400 mt-2">* ประเมินด้วยเกณฑ์สำรองในเครื่อง (AI ใช้ไม่ได้ขณะนั้น) ระดับสูงสุด 2</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

window.StudioGates = StudioGates;

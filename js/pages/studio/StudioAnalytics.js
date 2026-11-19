/**
 * js/pages/studio/StudioAnalytics.js — หน้า #/teacher/studio/analytics?course= (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: ทุกข้อ — แดชบอร์ดกระบวนการเรียนรู้ของ Studio แยกจาก StudentAnalytics เดิม (ไม่แตะของเดิม)
 * อัตราผ่านแต่ละด่าน · เวลาที่ใช้ · ระดับคำใบ้ · Explain-Back · ความคืบหน้าโปรเจกต์รายทีม · ส่งออก CSV แบบปกปิดตัวตน (S01…)
 */

const _SA_Tile = ({ label, value, sub }) => (
    <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #EDE7F6' }}>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-bold" style={{ color: '#4527A0' }}>{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
);

const _SA_Bar = ({ label, pct, right }) => (
    <div className="mb-2">
        <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-700">{label}</span><span className="text-gray-500">{right}</span></div>
        <div className="h-3 rounded-full" style={{ background: '#EDE7F6' }}>
            <div className="h-3 rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%`, background: '#7E57C2' }} />
        </div>
    </div>
);

const _saFmtTime = (s) => (s == null ? '-' : s >= 60 ? `${Math.floor(s / 60)} นาที ${s % 60} วิ` : `${s} วิ`);

const StudioAnalytics = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const [courses, setCourses] = React.useState([]);
    const [courseId, setCourseId] = React.useState(params.get('course') || '');
    const [agg, setAgg] = React.useState(null);
    const [showNames, setShowNames] = React.useState(false);
    const [error, setError] = React.useState('');
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

    React.useEffect(() => {
        if (!course) return;
        setAgg(null); setError('');
        let alive = true;   // ผู้ใช้อาจเปลี่ยนหน้าก่อนโหลดเสร็จ
        saLoadCourse(course).then(a => { if (alive) setAgg(a); }).catch(err => { if (alive) setError('โหลดข้อมูลไม่สำเร็จ: ' + err.message); });
        return () => { alive = false; };
    }, [course && course.id]);

    const exportCsv = () => {
        const blob = new Blob([saBuildCsv(agg)], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `studio_analytics_${(course.title || course.id).replace(/[\\/:*?"<>|\s]+/g, '_')}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        logStudioEvent('analytics_export', course.id, { rows: agg.rows.length });
    };

    const s = agg && agg.summary;
    return (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="APCC Studio — Analytics" />
            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h1 className="text-xl font-bold" style={{ color: '#4527A0' }}>📊 Studio Analytics</h1>
                    <div className="flex gap-3 text-sm">
                        {courseId && <a className="underline" style={{ color: '#5E35B1' }} href={`#/studio/showcase?course=${courseId}`}>🌏 แกลเลอรี</a>}
                        {courseId && <a className="underline" style={{ color: '#5E35B1' }} href={`#/teacher/studio/projects?course=${courseId}`}>🏅 ประเมินโปรเจกต์</a>}
                    </div>
                </div>
                <select value={courseId} onChange={e => setCourseId(e.target.value)} className="k-input mb-4" style={{ paddingLeft: 8 }}>
                    {courses.length === 0 && <option value="">— ยังไม่มีรายวิชาที่เปิด APCC Studio —</option>}
                    {courses.map(c => <option key={c.id} value={c.id}>🎨 {courseLabel(c)}</option>)}
                </select>
                {error && <div className="p-3 rounded-xl mb-4 text-sm bg-red-50 text-red-700">{error}</div>}
                {course && !agg && !error && <Spinner text="กำลังรวบรวมข้อมูล..." />}
                {agg && <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <_SA_Tile label="นักเรียน" value={s.students} sub={`ปลดล็อกขั้นสร้าง ${s.createUnlocked} คน · แบ่งปัน ${s.shareStage} คน`} />
                        <_SA_Tile label="โปรเจกต์" value={s.projects} sub={`เฉลี่ยครบ ${s.avgProjectStages ?? '-'}/5 ขั้น · ต้นแบบ ${s.webappVersions} รุ่น`} />
                        <_SA_Tile label="Explain-Back" value={s.explainBack} sub={`ทำนายถูก ${s.ebPredictCorrect}/${s.ebPredictTotal} · เกณฑ์สำรอง ${s.ebFallback}`} />
                        <_SA_Tile label="คำใบ้จากครู / Parsons" value={`${s.ladderHints} / ${s.parsonsAttempts}`} sub={`ผลประเมินเผยแพร่ ${s.reviewsPublished} · เพื่อนแนะนำ ${s.peerReviews}`} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #EDE7F6' }}>
                            <div className="font-semibold text-sm mb-3">อัตราผ่านแต่ละด่าน (% ของนักเรียน)</div>
                            {agg.gateStats.length === 0 && <div className="text-xs text-gray-400">รายวิชานี้ไม่มีด่านทักษะ</div>}
                            {agg.gateStats.map(g => <_SA_Bar key={g.gateId} label={`${g.name} (${g.problems} ข้อ)`} pct={g.passRate} right={`${g.passed}/${s.students} · ${g.passRate ?? 0}%`} />)}
                        </div>
                        <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #EDE7F6' }}>
                            <div className="font-semibold text-sm mb-3">เวลาเฉลี่ยต่อการส่ง และระดับคำใบ้เฉลี่ย รายด่าน</div>
                            <table className="w-full text-xs">
                                <thead><tr className="text-left text-gray-500 border-b"><th className="py-1">ด่าน</th><th>เวลาเฉลี่ย</th><th>ระดับคำใบ้</th></tr></thead>
                                <tbody>{agg.gateStats.map(g => <tr key={g.gateId} className="border-b"><td className="py-1">{g.name}</td><td>{_saFmtTime(g.avgTimeSec)}</td><td>{g.avgHintLevel ?? '-'}</td></tr>)}</tbody>
                            </table>
                            <div className="font-semibold text-sm mt-4 mb-2">ระดับความเข้าใจจาก Explain-Back (แบบอธิบาย)</div>
                            {s.ebLevels.map((c, l) => <_SA_Bar key={l} label={`ระดับ ${l}`} pct={s.explainBack ? c / Math.max(1, s.ebLevels.reduce((a, b) => a + b, 0)) * 100 : 0} right={`${c} ครั้ง`} />)}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 overflow-x-auto" style={{ border: '1px solid #EDE7F6' }}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="font-semibold text-sm">รายบุคคล</div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} /> แสดงชื่อ (เฉพาะบนจอ)</label>
                                <button onClick={exportCsv} className="k-btn-outline text-xs px-3 py-1.5">⬇️ CSV ปกปิดตัวตน (S01…)</button>
                            </div>
                        </div>
                        <table className="w-full text-xs">
                            <thead><tr className="text-left text-gray-500 border-b">
                                <th className="py-1 pr-2">รหัส</th><th className="pr-2">ด่าน</th><th className="pr-2">ขั้น</th><th className="pr-2">ส่ง/ผ่าน</th><th className="pr-2">เวลาเฉลี่ย</th>
                                <th className="pr-2">คำใบ้ครู</th><th className="pr-2">Parsons</th><th className="pr-2">Explain-Back</th><th className="pr-2">โปรเจกต์</th><th className="pr-2">รูบริก</th><th></th>
                            </tr></thead>
                            <tbody>
                                {agg.rows.map(r => (
                                    <tr key={r.uid} className="border-b">
                                        <td className="py-1 pr-2 whitespace-nowrap">{r.anonId}{showNames ? ` · ${r.name}` : ''}</td>
                                        <td className="pr-2">{r.gatesPassed}/{r.gates.length}</td>
                                        <td className="pr-2">{SG_STAGE_LABEL[r.stage]}</td>
                                        <td className="pr-2">{r.submissions}/{r.solved}</td>
                                        <td className="pr-2">{_saFmtTime(r.avgTimeSec)}</td>
                                        <td className="pr-2">{r.ladderHints}</td>
                                        <td className="pr-2">{r.parsonsAttempts}{r.parsonsAttempts ? ` (ถูก ${r.parsonsSolved})` : ''}</td>
                                        <td className="pr-2">{r.ebCount}{r.ebAvgLevel != null ? ` · ${r.ebAvgLevel}/3` : ''}{r.ebPredictTotal ? ` · ทำนาย ${r.ebPredictCorrect}/${r.ebPredictTotal}` : ''}</td>
                                        <td className="pr-2">{r.projectId ? `${r.projectStages}/5` : '-'}</td>
                                        <td className="pr-2">{r.rubricTotal != null ? `${r.rubricTotal}/20${r.rubricPublished ? '' : ' (ร่าง)'}` : '-'}</td>
                                        <td><a className="underline" style={{ color: '#5E35B1' }} href={`#/studio/portfolio?course=${course.id}&uid=${r.uid}`}>พอร์ต</a></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>}
            </main>
        </div>
    );
};

window.StudioAnalytics = StudioAnalytics;

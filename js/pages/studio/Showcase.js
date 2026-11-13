/**
 * js/pages/studio/Showcase.js — แกลเลอรีผลงาน (#/studio/showcase) และพอร์ตโฟลิโอรายบุคคล (#/studio/portfolio) (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: C (แบ่งปันและเรียนรู้จากผลงานเพื่อน), D (ขั้น "แบ่งปัน")
 * ปัญหาที่แก้: ผลงานนักเรียนกระจายอยู่ในเครื่อง/ไฟล์ส่วนตัว ไม่มีที่รวมให้ชุมชนเห็น และไม่มีแฟ้มสะสมผลงานที่พิมพ์ได้
 *
 * - แกลเลอรีแสดงเฉพาะโปรเจกต์ที่ครูอนุมัติ (studio_showcase) เป็น snapshot ณ วันที่อนุมัติ
 * - พอร์ตโฟลิโอ: ด่านทักษะ, โจทย์ที่ผ่าน, Explain-Back, โปรเจกต์ของทีม, ผลประเมินที่ครูเผยแพร่ — พิมพ์เป็น PDF ได้
 */

const _SC_PRINT_CSS = '@media print { header, .no-print { display: none !important; } body, .sc-page { background: #fff !important; } .sc-card { break-inside: avoid; box-shadow: none !important; } }';

const StudioShowcase = () => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const courseId = params.get('course');
    const [course, setCourse] = React.useState(null);
    const [items, setItems] = React.useState(null);
    const [open, setOpen] = React.useState(null);
    React.useEffect(() => {
        if (!courseId) return;
        db.collection('courses').doc(courseId).get().then(s => setCourse(s.exists ? { id: s.id, ...s.data() } : null));
        db.collection('studio_showcase').where('courseId', '==', courseId).where('visible', '==', true).get()
            .then(s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.approvedAt?.seconds || 0) - (a.approvedAt?.seconds || 0))))
            .catch(() => setItems([]));
    }, [courseId]);

    return (
        <div className="min-h-screen sc-page" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="APCC Studio — แกลเลอรีผลงาน" />
            <main className="max-w-6xl mx-auto px-4 py-6">
                <h1 className="text-xl font-bold" style={{ color: '#4527A0' }}>🌏 แกลเลอรีนวัตกรรม</h1>
                <p className="text-sm text-gray-500 mb-5">{course ? course.title : ''} · ผลงานที่ครูคัดเลือกให้แบ่งปัน</p>
                {!items && <Spinner text="กำลังโหลดผลงาน..." />}
                {items && items.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">ยังไม่มีผลงานในแกลเลอรี</div>}
                {items && !open && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map(it => (
                            <button key={it.id} onClick={() => setOpen(it)} className="text-left bg-white rounded-2xl p-4 hover:shadow-md transition-shadow" style={{ border: '1px solid #D1C4E9' }}>
                                <div className="text-xs font-semibold mb-1" style={{ color: '#7E57C2' }}>{it.kit === 'B' ? '📊 Kit B' : '🌐 เว็บแอป'} · ทีม {it.teamName}</div>
                                <div className="font-bold text-gray-800 mb-2">{it.title}</div>
                                <div className="text-xs text-gray-600 line-clamp-3">{it.blurb || it.problem}</div>
                                <div className="text-xs text-gray-400 mt-2">{Object.values(it.memberNames || {}).join(', ')}</div>
                            </button>
                        ))}
                    </div>
                )}
                {open && (
                    <div className="space-y-4">
                        <button onClick={() => setOpen(null)} className="text-sm underline" style={{ color: '#5E35B1' }}>← กลับแกลเลอรี</button>
                        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #D1C4E9' }}>
                            <div className="text-xs font-semibold" style={{ color: '#7E57C2' }}>ทีม {open.teamName} · {Object.values(open.memberNames || {}).join(', ')}</div>
                            <h2 className="text-lg font-bold text-gray-800 mb-3">{open.title}</h2>
                            {open.blurb && <p className="text-sm text-gray-700 mb-3">💬 {open.blurb}</p>}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="p-3 rounded-xl" style={{ background: '#FAFAFA' }}><b>🎯 ปัญหา</b><div className="text-gray-700 mt-1">{open.problem || '-'}</div></div>
                                <div className="p-3 rounded-xl" style={{ background: '#FAFAFA' }}><b>💡 แนวทาง</b><div className="text-gray-700 mt-1">{open.solution || '-'}</div></div>
                                <div className="p-3 rounded-xl" style={{ background: '#FAFAFA' }}><b>🧪 ผลทดสอบกับผู้ใช้</b><div className="text-gray-700 mt-1">{open.testResult || '-'}</div></div>
                            </div>
                        </div>
                        {open.kit !== 'B' && open.code && <WebAppRunner initialCode={open.code} readOnly height={460} courseId={open.courseId} projectId={open.projectId} />}
                        {open.kit === 'B' && open.colabUrl && <a href={open.colabUrl} target="_blank" rel="noopener" className="k-btn-pink text-sm px-4 py-2 inline-block">เปิด Colab ของทีม ↗</a>}
                    </div>
                )}
            </main>
        </div>
    );
};

const StudioPortfolio = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const courseId = params.get('course');
    const isStaff = userDoc && (userDoc.role === 'teacher' || userDoc.role === 'admin');
    const uid = (isStaff && params.get('uid')) || (userDoc && userDoc.id);
    const [course, setCourse] = React.useState(null);
    const [student, setStudent] = React.useState(null);
    const [pf, setPf] = React.useState(null);
    const [error, setError] = React.useState('');
    React.useEffect(() => {
        if (!courseId || !uid) return;
        (async () => {
            try {
                const cs = await db.collection('courses').doc(courseId).get();
                const c = { id: cs.id, ...cs.data() };
                setCourse(c);
                const us = await db.collection('users').doc(uid).get();
                setStudent(us.exists ? us.data() : { displayName: uid });
                setPf(await saLoadPortfolio(c, uid));
            } catch (err) { setError(err.message); }
        })();
    }, [courseId, uid]);

    const card = 'sc-card bg-white rounded-2xl p-5 mb-4';
    const cardStyle = { border: '1px solid #D1C4E9' };
    const rubric = PS_DEFAULT_RUBRIC;

    return (
        <div className="min-h-screen sc-page" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <style>{_SC_PRINT_CSS}</style>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="APCC Studio — พอร์ตโฟลิโอ" />
            <main className="max-w-4xl mx-auto px-4 py-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: '#4527A0' }}>📁 พอร์ตโฟลิโอ</h1>
                        <div className="text-sm text-gray-600">{student ? student.displayName : ''}{student && student.studentCode ? ` · ${student.studentCode}` : ''}{student && student.room ? ` · ${student.grade || ''}/${student.room} เลขที่ ${student.number || '-'}` : ''}</div>
                        <div className="text-sm text-gray-500">{course ? course.title : ''}</div>
                    </div>
                    <button onClick={() => window.print()} className="no-print k-btn-pink text-sm px-4 py-2">🖨️ พิมพ์ / บันทึกเป็น PDF</button>
                </div>
                {error && <div className="p-3 rounded-xl mb-4 text-sm bg-red-50 text-red-700">{error}</div>}
                {!pf && !error && <Spinner text="กำลังรวบรวมผลงาน..." />}
                {pf && <>
                    <div className={card} style={cardStyle}>
                        <div className="font-bold mb-2" style={{ color: '#4527A0' }}>🎯 ด่านทักษะ · ขั้น {SG_STAGE_LABEL[pf.progress.stage]}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            {pf.progress.gates.map(g => (
                                <div key={g.gateId} className="p-2 rounded-lg" style={{ background: g.done ? '#E8F5E9' : '#FAFAFA' }}>
                                    {g.done ? '✅' : '⬜'} {g.name} <span className="text-xs text-gray-500">({Math.min(g.passed, g.need)}/{g.need})</span>
                                </div>
                            ))}
                            {pf.progress.gates.length === 0 && <div className="text-gray-400">รายวิชานี้ไม่มีด่านทักษะ</div>}
                        </div>
                    </div>
                    <div className={card} style={cardStyle}>
                        <div className="font-bold mb-2" style={{ color: '#4527A0' }}>✅ โจทย์ที่ผ่านครบทุก test case ({pf.solved.length} ข้อ)</div>
                        <div className="text-xs text-gray-700 leading-relaxed">{pf.solved.map(a => a.title).join(' · ') || '-'}</div>
                    </div>
                    <div className={card} style={cardStyle}>
                        <div className="font-bold mb-2" style={{ color: '#4527A0' }}>🗣️ Explain-Back ({pf.explainBack.length} ครั้ง)</div>
                        {pf.explainBack.length === 0 && <div className="text-sm text-gray-400">ยังไม่มี</div>}
                        {pf.explainBack.map((e, i) => (
                            <div key={i} className="text-sm mb-2 pb-2 border-b last:border-0">
                                <div className="font-medium">{e.assignmentTitle}</div>
                                {e.mode === 'predict'
                                    ? <div className="text-gray-600">🔮 ทำนายผล: {e.predictCorrect ? 'ถูกต้อง' : 'ยังไม่ตรง'}</div>
                                    : <div className="text-gray-600">✍️ {e.explanation} <span className="text-xs" style={{ color: '#7E57C2' }}>(ระดับ {e.aiLevel}/3)</span></div>}
                                {e.followUpAnswer && <div className="text-xs text-gray-500">❓ {e.followUp} → {e.followUpAnswer}</div>}
                            </div>
                        ))}
                    </div>
                    <div className={card} style={cardStyle}>
                        <div className="font-bold mb-2" style={{ color: '#4527A0' }}>🛠️ โปรเจกต์ของทีม {pf.showcase && <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: '#FFF8E1', color: '#F57F17' }}>🌏 อยู่ในแกลเลอรี</span>}</div>
                        {!pf.project ? <div className="text-sm text-gray-400">ยังไม่มีโปรเจกต์</div> : <>
                            <div className="font-semibold">{pf.project.title}</div>
                            <div className="text-xs text-gray-500 mb-2">ทีม {pf.project.teamName} · {Object.values(pf.project.memberNames || {}).join(', ')} · ครบ {psProgress(pf.project).filter(x => x.done).length}/5 ขั้น · ต้นแบบ {pf.project.versionCount || 0} รุ่น</div>
                            {PS_STAGES.map(s => {
                                const d = (pf.project.data || {})[s.key] || {};
                                const main = s.key === 'empathize' ? d.painPoints : s.key === 'define' ? d.problemStatement : s.key === 'ideate' ? d.chosenIdea : s.key === 'prototype' ? d.prototypeNotes : d.round2;
                                return main ? <div key={s.key} className="text-sm mb-1"><b>{s.icon} {s.title}:</b> <span className="text-gray-700">{main}</span></div> : null;
                            })}
                        </>}
                    </div>
                    {pf.review && pf.review.published && (
                        <div className={card} style={cardStyle}>
                            <div className="font-bold mb-2" style={{ color: '#4527A0' }}>🏅 ผลประเมินโปรเจกต์ ({pf.review.totalByMember && pf.review.totalByMember[uid] != null ? `${pf.review.totalByMember[uid]}/20` : '-'})</div>
                            <PsReviewView rubric={rubric} review={{ team: pf.review.team, individual: { [uid]: (pf.review.individual || {})[uid] } }} members={[uid]} memberNames={{ [uid]: student ? student.displayName : uid }} />
                        </div>
                    )}
                    <p className="text-xs text-gray-400 text-center">สร้างจาก APCC Studio v6.0 · {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
                </>}
            </main>
        </div>
    );
};

window.StudioShowcase = StudioShowcase;
window.StudioPortfolio = StudioPortfolio;

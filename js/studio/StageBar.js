/**
 * js/studio/StageBar.js — แถบ ฝึก–สร้าง–แบ่งปัน และด่านทักษะ บนแดชบอร์ดนักเรียน (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: P, D — ให้ผู้เรียนเห็นเส้นทางของตนเอง: ฝึกพื้นฐานผ่านด่าน → สร้างผลงาน → แบ่งปัน
 * แสดงเฉพาะรายวิชาที่เปิด Studio และฟีเจอร์ skillGate
 */

const _SB_STAGE_ICON = { practice: '🎯', create: '🛠️', share: '🌏' };

const StudioStageCard = ({ course, userId }) => {
    const [data, setData] = React.useState(null);
    const [error, setError] = React.useState('');
    React.useEffect(() => {
        sgRefreshMyProgress(course, userId).then(setData).catch(err => setError(err.message));
    }, [course.id, userId]);

    const stages = (course.studio && course.studio.stages) || ['practice', 'create', 'share'];
    const p = data && data.progress;
    const curIdx = p ? Math.max(0, stages.indexOf(p.stage)) : 0;

    return (
        <div className="rounded-2xl p-4 mb-3" style={{ background: '#fff', border: '1px solid #D1C4E9' }}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                    <div className="text-xs font-semibold" style={{ color: '#7E57C2' }}>🎨 APCC Studio</div>
                    <div className="font-bold text-gray-800 text-sm">{course.title}</div>
                </div>
                <div className="flex items-center gap-3">
                    {p && p.createUnlocked && hasFeature(course, 'projectStudio') && (
                        <a href={`#/studio/project?course=${course.id}`} className="k-btn-pink text-xs px-3 py-1.5">🛠️ เปิด Project Studio</a>
                    )}
                    <a href={`#/student/workspace?course=${course.id}`} className="text-xs underline" style={{ color: '#5E35B1' }}>ไปฝึกต่อ →</a>
                    {hasFeature(course, 'pythonLearningHub') && (
                        <a href={`#/student/tools?course=${course.id}`} className="text-xs underline" style={{ color: '#5E35B1' }}>📚 Learning Hub</a>
                    )}
                    {hasFeature(course, 'portfolio') && <>
                        <a href={`#/studio/showcase?course=${course.id}`} className="text-xs underline" style={{ color: '#5E35B1' }}>🌏 แกลเลอรี</a>
                        <a href={`#/studio/portfolio?course=${course.id}`} className="text-xs underline" style={{ color: '#5E35B1' }}>📁 พอร์ตโฟลิโอ</a>
                    </>}
                </div>
            </div>

            {/* แถบขั้น */}
            <div className="flex items-center gap-1 mb-3">
                {stages.map((s, i) => {
                    const done = p && i < curIdx, cur = p && i === curIdx;
                    return (
                        <React.Fragment key={s}>
                            <div className="flex-1 text-center rounded-xl py-2 text-xs font-semibold"
                                style={{
                                    background: cur ? 'linear-gradient(135deg,#7E57C2,#5E35B1)' : done ? '#EDE7F6' : '#F5F5F5',
                                    color: cur ? '#fff' : done ? '#4527A0' : '#9e9e9e',
                                }}>
                                {_SB_STAGE_ICON[s]} {SG_STAGE_LABEL[s] || s}{done ? ' ✓' : ''}
                            </div>
                            {i < stages.length - 1 && <span style={{ color: '#B39DDB' }}>›</span>}
                        </React.Fragment>
                    );
                })}
            </div>

            {error && <div className="text-xs text-red-500">โหลดความก้าวหน้าไม่สำเร็จ: {error}</div>}
            {!data && !error && <div className="text-xs text-gray-400">กำลังคำนวณความก้าวหน้า...</div>}
            {data && data.gates.length === 0 && <div className="text-xs text-gray-400">ครูยังไม่ได้ตั้งด่านทักษะของรายวิชานี้</div>}
            {p && p.gates.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {p.gates.map(g => {
                        const pct = g.need ? Math.min(100, Math.round(g.passed / g.need * 100)) : 0;
                        return (
                            <div key={g.gateId} className="rounded-xl p-2 text-xs" style={{ background: g.done ? '#E8F5E9' : '#FAFAFA', border: `1px solid ${g.done ? '#A5D6A7' : '#EEEEEE'}` }}>
                                <div className="flex justify-between gap-2 mb-1">
                                    <span className="font-semibold" style={{ color: g.done ? '#2E7D32' : '#424242' }}>{g.done ? '✅' : '🔒'} {g.name}</span>
                                    <span className="text-gray-500 whitespace-nowrap">{g.total ? `${Math.min(g.passed, g.need)}/${g.need}` : 'ยังไม่มีโจทย์'}</span>
                                </div>
                                <div className="h-1.5 rounded-full" style={{ background: '#EEEEEE' }}>
                                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: g.done ? '#43A047' : '#9575CD' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {p && (
                <div className="text-xs mt-3" style={{ color: '#5E35B1' }}>
                    {p.stage === 'share'
                        ? '🌏 ผลงานของทีมได้รับคัดเลือกขึ้นแกลเลอรีแล้ว — แบ่งปันนวัตกรรมให้เพื่อนและชุมชน'
                        : p.createUnlocked
                        ? '🎉 ผ่านด่านครบแล้ว — ปลดล็อกขั้น "สร้าง" กดปุ่ม เปิด Project Studio เพื่อสร้างนวัตกรรมกับทีม'
                        : (() => { const g = p.gates.find(x => x.gateId === p.nextGateId); if (!g) return '';
                            return g.total ? `ด่านถัดไป: ${g.name} — ผ่านอีก ${g.need - g.passed} ข้อ เพื่อไปต่อ` : `ด่านถัดไป: ${g.name} — รอครูเปิดโจทย์ของด่านนี้`; })()}
                </div>
            )}
        </div>
    );
};

const StudioStageStrip = ({ courses, userId }) => {
    const list = (courses || []).filter(c => hasFeature(c, 'skillGate'));
    if (!list.length || !userId) return null;
    return <div className="mb-6">{list.map(c => <StudioStageCard key={c.id} course={c} userId={userId} />)}</div>;
};

window.StudioStageStrip = StudioStageStrip;

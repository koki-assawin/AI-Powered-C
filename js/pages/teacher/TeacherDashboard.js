// js/pages/teacher/TeacherDashboard.js

// ── Research Metrics Panel ────────────────────────────────────────────────────
const _ResearchMetricsPanel = ({ courses = [] }) => {
    const [selectedCourse, setSelectedCourse] = React.useState('');
    const [selectedUnit,   setSelectedUnit]   = React.useState('all');
    const [midpoint, setMidpoint] = React.useState(() => {
        // Default: 2 months ago as semester midpoint
        const d = new Date();
        d.setMonth(d.getMonth() - 2);
        return d.toISOString().slice(0, 10);
    });
    const [assignments, setAssignments] = React.useState([]);
    const [unitNames,   setUnitNames]   = React.useState([]);
    const [metrics,  setMetrics]  = React.useState(null);
    const [loading,  setLoading]  = React.useState(false);

    // Load unit list when course changes
    React.useEffect(() => {
        if (!selectedCourse) { setAssignments([]); setUnitNames([]); setMetrics(null); return; }
        db.collection('assignments').where('courseId', '==', selectedCourse).get().then(snap => {
            const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAssignments(arr);
            const units = [...new Set(arr.map(a => a.unitName).filter(Boolean))];
            setUnitNames(units);
            setSelectedUnit('all');
            setMetrics(null);
        });
    }, [selectedCourse]);

    const analyze = async () => {
        if (!selectedCourse) return;
        setLoading(true);
        setMetrics(null);
        try {
            const mid = new Date(midpoint + 'T00:00:00');

            // ── Enrolled students ──
            const enrollSnap = await db.collection('enrollments').where('courseId', '==', selectedCourse).get();
            const studentIds = [...new Set(enrollSnap.docs.map(d => d.data().studentId))];
            const studentCount = studentIds.length;

            // ── Assignment IDs for selected unit ──
            const filteredAssigns = selectedUnit === 'all'
                ? assignments
                : assignments.filter(a => a.unitName === selectedUnit);
            const assignIdSet = new Set(filteredAssigns.map(a => a.id));

            // ── Submissions ──
            const subSnap = await db.collection('submissions').where('courseId', '==', selectedCourse).get();
            const allSubs = subSnap.docs.map(d => d.data());
            const subs = selectedUnit === 'all' ? allSubs : allSubs.filter(s => assignIdSet.has(s.assignmentId));
            const totalSubs = subs.length;
            const avgSubs = studentCount > 0 ? (totalSubs / studentCount).toFixed(1) : '—';

            // ── Hint Lv.3 (early / late) ──
            // Query coachInteractions in batches of 30 UIDs
            const hintEarlySet = new Set();
            const hintLateSet  = new Set();
            const chunks = [];
            for (let i = 0; i < studentIds.length; i += 30) chunks.push(studentIds.slice(i, i + 30));

            for (const chunk of chunks) {
                const snap = await db.collection('coachInteractions')
                    .where('uid', 'in', chunk)
                    .where('triggerEvent', '==', 'hint_level_3')
                    .get();
                snap.docs.forEach(d => {
                    const { uid, createdAt } = d.data();
                    const ts = createdAt?.toDate ? createdAt.toDate() : null;
                    if (!ts) return;
                    if (ts < mid) hintEarlySet.add(uid);
                    else          hintLateSet.add(uid);
                });
            }
            const hintEarlyPct = studentCount > 0 ? Math.round(hintEarlySet.size / studentCount * 100) : 0;
            const hintLatePct  = studentCount > 0 ? Math.round(hintLateSet.size  / studentCount * 100) : 0;

            // ── Mini-Game Sessions ──
            let totalGameSessions = 0;
            for (const chunk of chunks) {
                const snap = await db.collection('miniGameSessions').where('uid', 'in', chunk).get();
                totalGameSessions += snap.size;
            }

            // ── Achievements ──
            let totalAchievements = 0;
            for (const chunk of chunks) {
                const snap = await db.collection('studentAchievements').where('uid', 'in', chunk).get();
                totalAchievements += snap.size;
            }

            setMetrics({
                studentCount, totalSubs, avgSubs,
                hintEarlyCount: hintEarlySet.size, hintEarlyPct,
                hintLateCount:  hintLateSet.size,  hintLatePct,
                totalGameSessions, totalAchievements,
            });
        } catch (err) {
            console.error('[ResearchMetrics]', err);
            alert('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const KPI = ({ icon, label, value, sub, color }) => (
        <div style={{
            background: '#fff', borderRadius: 14, padding: '16px 18px',
            border: `1.5px solid ${color}22`,
            borderLeft: `4px solid ${color}`,
            boxShadow: '0 1px 4px rgba(0,0,0,.04)',
        }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 4 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
        </div>
    );

    const courseName = courses.find(c => c.id === selectedCourse)?.title || '';

    return (
        <div className="k-card p-5 mb-8">
            <h3 className="font-bold text-gray-700 mb-4" style={{ fontSize: 15 }}>
                📊 ตัวชี้วัดงานวิจัย
            </h3>

            {/* Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 150px auto', gap: 10, marginBottom: 16, alignItems: 'end' }}>
                <div>
                    <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>รายวิชา</label>
                    <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="k-input" style={{ fontSize: 13 }}>
                        <option value="">-- เลือกรายวิชา --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}{c.grade ? ` · ${c.grade}` : ''}{c.room ? ` ห้อง ${c.room}` : ''}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>หน่วยการเรียน</label>
                    <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="k-input" style={{ fontSize: 13 }} disabled={!selectedCourse}>
                        <option value="all">ทุกหน่วย</option>
                        {unitNames.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                        จุดแบ่งต้นภาค/ปลายภาค
                    </label>
                    <input type="date" value={midpoint} onChange={e => setMidpoint(e.target.value)}
                        className="k-input" style={{ fontSize: 13 }} />
                </div>
                <button onClick={analyze} disabled={!selectedCourse || loading}
                    className="k-btn-pink px-5 py-2 text-sm disabled:opacity-40" style={{ whiteSpace: 'nowrap' }}>
                    {loading ? '⏳ กำลังโหลด...' : '🔍 วิเคราะห์'}
                </button>
            </div>

            {/* Results */}
            {!metrics && !loading && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13 }}>
                    เลือกรายวิชาแล้วกด "วิเคราะห์" เพื่อดูตัวชี้วัด
                </div>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13 }}>
                    ⏳ กำลังดึงข้อมูลจาก Firestore...
                </div>
            )}

            {metrics && (
                <>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
                        📌 {courseName}{selectedUnit !== 'all' ? ` · ${selectedUnit}` : ' · ทุกหน่วย'}
                        {' '}· นักเรียน {metrics.studentCount} คน
                        {' '}· จุดแบ่ง {new Date(midpoint).toLocaleDateString('th-TH')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                        <KPI icon="📋" label="รวม Submissions" color="#3b82f6"
                            value={metrics.totalSubs.toLocaleString()}
                            sub={`ทั้งหมด ${selectedUnit !== 'all' ? selectedUnit : 'ทุกหน่วย'}`} />
                        <KPI icon="👤" label="Submissions เฉลี่ย/นักเรียน" color="#8b5cf6"
                            value={metrics.avgSubs}
                            sub={`รวม ${metrics.studentCount} คน`} />
                        <KPI icon="💡" label="ขอ Hint Lv.3 — ต้นภาค" color="#f59e0b"
                            value={`${metrics.hintEarlyPct}%`}
                            sub={`${metrics.hintEarlyCount} คน / ก่อน ${new Date(midpoint).toLocaleDateString('th-TH')}`} />
                        <KPI icon="💡" label="ขอ Hint Lv.3 — ปลายภาค" color="#ef4444"
                            value={`${metrics.hintLatePct}%`}
                            sub={`${metrics.hintLateCount} คน / หลัง ${new Date(midpoint).toLocaleDateString('th-TH')}`} />
                        <KPI icon="🎮" label="Mini-Game Sessions" color="#10b981"
                            value={metrics.totalGameSessions.toLocaleString()}
                            sub="รวมทุก game type" />
                        <KPI icon="🏅" label="Achievements รวม" color="#ec4899"
                            value={metrics.totalAchievements.toLocaleString()}
                            sub={`เฉลี่ย ${metrics.studentCount > 0 ? (metrics.totalAchievements / metrics.studentCount).toFixed(1) : '—'} badge/คน`} />
                    </div>
                </>
            )}
        </div>
    );
};

const TeacherDashboard = () => {
    const { userDoc } = useAuth();
    const [courses, setCourses] = React.useState([]);
    const [stats, setStats] = React.useState({ totalStudents: 0, totalSubmissions: 0, avgScore: 0 });
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => { if (userDoc) loadData(); }, [userDoc]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ownSnap, coSnap] = await Promise.all([
                db.collection('courses').where('teacherId', '==', userDoc.id).get(),
                db.collection('courses').where('coTeacherIds', 'array-contains', userDoc.id).get(),
            ]);
            const seen = new Set();
            const courseList = [];
            [...ownSnap.docs, ...coSnap.docs].forEach(d => {
                if (!seen.has(d.id)) { seen.add(d.id); courseList.push({ id: d.id, ...d.data() }); }
            });
            setCourses(courseList);

            const courseIds = courseList.map(c => c.id);
            let totalStudents = 0, totalSubs = 0, totalScore = 0, scoredSubs = 0;

            if (courseIds.length > 0) {
                const [enrollSnaps, subSnaps] = await Promise.all([
                    db.collection('enrollments').where('courseId', 'in', courseIds.slice(0, 10)).get(),
                    db.collection('submissions').where('courseId', 'in', courseIds.slice(0, 10)).get(),
                ]);

                // Build per-course unique student count (deduplicated)
                const perCourse = {};
                enrollSnaps.docs.forEach(d => {
                    const { courseId, studentId } = d.data();
                    if (!perCourse[courseId]) perCourse[courseId] = new Set();
                    perCourse[courseId].add(studentId);
                });
                // Patch courseList with correct counts
                courseList.forEach(c => { c.enrollmentCount = (perCourse[c.id]?.size) || 0; });
                setCourses([...courseList]);

                totalStudents = new Set(enrollSnaps.docs.map(d => d.data().studentId)).size;
                totalSubs = subSnaps.size;
                subSnaps.docs.forEach(d => {
                    if (d.data().score != null) { totalScore += d.data().score; scoredSubs++; }
                });
            }

            setStats({
                totalStudents,
                totalSubmissions: totalSubs,
                avgScore: scoredSubs ? Math.round(totalScore / scoredSubs) : 0,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const togglePublish = async (courseId, current) => {
        await db.collection('courses').doc(courseId).update({ isPublished: !current });
        setCourses(cs => cs.map(c => c.id === courseId ? { ...c, isPublished: !current } : c));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="Teacher Portal" />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="rounded-2xl p-6 mb-8" style={{
                    background: 'linear-gradient(135deg, #FFF0F5 0%, #FFD1DC 100%)',
                    border: '1px solid #FFB6C8',
                    boxShadow: '0 2px 12px rgba(236,64,122,.08)',
                }}>
                    <h2 className="text-2xl font-bold mb-1" style={{ color: '#AD1457' }}>สวัสดี, {userDoc?.displayName} 👨‍🏫</h2>
                    <p style={{ color: '#C2185B', fontSize: '14px' }}>จัดการรายวิชาและโจทย์การเขียนโปรแกรม</p>
                </div>

                {loading ? <Spinner /> : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'รายวิชาทั้งหมด', value: courses.length, icon: '📚' },
                                { label: 'นักเรียนทั้งหมด', value: stats.totalStudents, icon: '👥' },
                                { label: 'การส่งงานทั้งหมด', value: stats.totalSubmissions, icon: '📋' },
                                { label: 'คะแนนเฉลี่ย', value: `${stats.avgScore}%`, icon: '📊' },
                            ].map(s => (
                                <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                                    <div className="text-3xl mb-2">{s.icon}</div>
                                    <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                                    <div className="text-sm text-gray-500">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Research Metrics Panel */}
                        <_ResearchMetricsPanel courses={courses} />

                        {/* Quick links */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                            {[
                                { href: '#/teacher/analytics',     icon: '📊', label: 'วิเคราะห์นักเรียน',  bg: '#1e293b', color: '#f1f5f9' },
                                { href: '#/teacher/students',      icon: '👥', label: 'จัดการนักเรียน',     bg: '#1e293b', color: '#f1f5f9' },
                                { href: '#/teacher/gamification',  icon: '🎮', label: 'Gamification Admin', bg: 'linear-gradient(135deg,#065f46,#047857)', color: '#d1fae5' },
                            ].map(l => (
                                <a key={l.href} href={l.href} style={{
                                    flex: '1 1 auto', textAlign: 'center', padding: '10px 16px',
                                    background: l.bg, color: l.color, borderRadius: 12,
                                    textDecoration: 'none', fontSize: 13, fontWeight: 600,
                                    border: '1px solid rgba(255,255,255,.1)',
                                }}>
                                    {l.icon} {l.label}
                                </a>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">📚 รายวิชาทั้งหมด</h3>
                            <a href="#/teacher/courses"
                                className="k-btn-pink px-4 py-2 text-sm flex items-center space-x-2" style={{ textDecoration: 'none' }}>
                                <span>+</span><span>สร้างรายวิชาใหม่</span>
                            </a>
                        </div>

                        {courses.length === 0 ? (
                            <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-gray-100">
                                <div className="text-5xl mb-3">📚</div>
                                <p className="text-lg mb-4">ยังไม่มีรายวิชา</p>
                                <a href="#/teacher/courses" className="k-btn-pink px-6 py-2 inline-block" style={{ textDecoration: 'none' }}>
                                    สร้างรายวิชาแรก
                                </a>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {courses.map(course => (
                                    <div key={course.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="h-1.5" style={{ background: LANGUAGES[course.language]?.color || '#6b7280' }}></div>
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="text-2xl">{LANGUAGES[course.language]?.icon || '📚'}</div>
                                                <div className="flex gap-1.5 flex-wrap justify-end">
                                                    {course.teacherId !== userDoc.id && (
                                                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">👨‍🏫 ร่วมสอน</span>
                                                    )}
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${course.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {course.isPublished ? 'เปิดสอน' : 'ฉบับร่าง'}
                                                    </span>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-gray-800 mb-1">{course.title}</h4>
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {course.grade && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background:'#FFF0F5', color:'#AD1457' }}>{course.grade}</span>}
                                                {course.room  && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">ห้อง {course.room}</span>}
                                                {course.semester && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">เทอม {course.semester}/{course.academicYear || ''}</span>}
                                            </div>
                                            <p className="text-xs text-gray-400 mb-3 line-clamp-2">{course.description}</p>
                                            <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                                                <span>👥 {course.enrollmentCount || 0} นักเรียน</span>
                                                <span>{LANGUAGES[course.language]?.name}</span>
                                            </div>
                                            <div className="flex space-x-2">
                                                <a href={`#/teacher/courses?edit=${course.id}`}
                                                    className="flex-1 text-center py-1.5 rounded-lg text-xs transition-colors"
                                                    style={{ border: '1.5px solid #FFD1DC', color: '#C2185B', textDecoration: 'none' }}>
                                                    แก้ไข
                                                </a>
                                                <button
                                                    onClick={() => togglePublish(course.id, course.isPublished)}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs text-white transition-colors
                                                        ${course.isPublished ? 'bg-gray-400 hover:bg-gray-500' : 'k-btn-pink'}`}>
                                                    {course.isPublished ? 'ซ่อน' : 'เปิดเผย'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

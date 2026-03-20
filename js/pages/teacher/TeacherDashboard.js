// js/pages/teacher/TeacherDashboard.js

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
            <Navbar title="AI-Powered Coding Platform" subtitle="Teacher Portal" />
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

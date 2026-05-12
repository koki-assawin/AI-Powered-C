// js/pages/student/CourseViewer.js - Join by code + show enrolled courses only

const CourseViewer = () => {
    const { userDoc } = useAuth();
    const [enrolledCourses, setEnrolledCourses] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [joinCode, setJoinCode] = React.useState('');
    const [joining, setJoining] = React.useState(false);
    const [joinMsg, setJoinMsg] = React.useState('');
    const [confirmUnenroll, setConfirmUnenroll] = React.useState(null); // courseId to confirm
    const [unenrolling, setUnenrolling] = React.useState(null);

    React.useEffect(() => {
        // Check for ?join=CODE in URL
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const codeFromUrl = params.get('join');
        if (codeFromUrl) setJoinCode(codeFromUrl.toUpperCase().trim());
    }, []);

    // Load enrolled courses when userDoc is ready
    React.useEffect(() => {
        if (!userDoc) return;
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const codeFromUrl = params.get('join');
        if (codeFromUrl) handleJoinByCode(codeFromUrl.toUpperCase().trim());
        loadEnrolledCourses();
    }, [userDoc]);

    const loadEnrolledCourses = async () => {
        setLoading(true);
        try {
            const ids = userDoc?.enrolledCourses || [];
            if (!ids.length) { setEnrolledCourses([]); return; }
            // Firestore 'in' supports up to 30 items; for small class size this is fine
            const snap = await db.collection('courses').where(firebase.firestore.FieldPath.documentId(), 'in', ids).get();
            setEnrolledCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isEnrolled = (courseId) => (userDoc?.enrolledCourses || []).includes(courseId);

    const doEnroll = async (courseId) => {
        await db.collection('users').doc(userDoc.id).update({
            enrolledCourses: arrayUnion(courseId),
        });
        await db.collection('enrollments').add({
            studentId: userDoc.id,
            courseId,
            enrolledAt: serverTimestamp(),
            progress: 0,
            completedLessons: [],
            lastAccessedAt: serverTimestamp(),
        });
    };

    const doUnenroll = async (courseId) => {
        setUnenrolling(courseId);
        try {
            // Remove from user's enrolledCourses
            await db.collection('users').doc(userDoc.id).update({
                enrolledCourses: arrayRemove(courseId),
            });
            // Delete enrollment doc
            const snap = await db.collection('enrollments')
                .where('studentId', '==', userDoc.id)
                .where('courseId', '==', courseId)
                .get();
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            // Update local state
            setEnrolledCourses(prev => prev.filter(c => c.id !== courseId));
            setConfirmUnenroll(null);
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setUnenrolling(null);
        }
    };

    const handleJoinByCode = async (codeOverride) => {
        const trimCode = (codeOverride || joinCode).toUpperCase().trim();
        if (!trimCode || trimCode.length !== 6) {
            setJoinMsg('กรุณากรอกรหัส 6 ตัวอักษร');
            return;
        }
        if (!userDoc) {
            setJoinMsg('กรุณาเข้าสู่ระบบก่อน');
            return;
        }
        setJoining(true);
        setJoinMsg('');
        try {
            const snap = await db.collection('courses').where('classCode', '==', trimCode).get();
            if (snap.empty) {
                setJoinMsg('ไม่พบรหัสห้องเรียนนี้ กรุณาตรวจสอบอีกครั้ง');
                setJoining(false);
                return;
            }
            const courseDoc = snap.docs[0];
            const courseId = courseDoc.id;
            if (isEnrolled(courseId)) {
                setJoinMsg('คุณลงทะเบียนวิชานี้แล้ว กำลังพาไปยังห้องเรียน...');
                setTimeout(() => {
                    window.location.hash = `#/student/workspace?course=${courseId}`;
                }, 1000);
                return;
            }
            await doEnroll(courseId);
            setJoinMsg('เข้าร่วมสำเร็จ! กำลังพาไปยังห้องเรียน...');
            // Refresh enrolled list
            await loadEnrolledCourses();
            setTimeout(() => {
                window.location.hash = `#/student/workspace?course=${courseId}`;
            }, 1000);
        } catch (err) {
            setJoinMsg('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Platform" subtitle="ห้องเรียนของฉัน" />
            <main className="max-w-5xl mx-auto px-4 py-8">

                {/* Join by Code */}
                <div className="mb-8 rounded-2xl p-6" style={{
                    background: 'linear-gradient(135deg, #FFF0F5 0%, #FFD1DC 100%)',
                    border: '1px solid #FFB6C8',
                    boxShadow: '0 2px 12px rgba(236,64,122,.08)',
                }}>
                    <h2 className="text-xl font-bold mb-1" style={{ color: '#AD1457' }}>🔑 เข้าร่วมห้องเรียนด้วยรหัส</h2>
                    <p className="text-sm mb-4" style={{ color: '#C2185B' }}>กรอกรหัส 6 หลักที่ได้รับจากครู เพื่อเข้าร่วมวิชา</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            onKeyDown={e => { if (e.key === 'Enter') handleJoinByCode(); }}
                            maxLength={6}
                            placeholder="เช่น AB12CD"
                            className="flex-1 px-4 py-3 rounded-xl font-mono text-lg font-bold tracking-widest text-center outline-none bg-white"
                            style={{ border: '1.5px solid #FFB6C8', color: '#AD1457', transition: 'box-shadow .2s' }}
                            onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(236,64,122,.15)'}
                            onBlur={e => e.target.style.boxShadow = '0 0 0 0 transparent'}
                        />
                        <button
                            onClick={() => handleJoinByCode()}
                            disabled={joining || joinCode.trim().length !== 6}
                            className="k-btn-pink px-8 py-3 font-bold text-sm whitespace-nowrap disabled:opacity-50">
                            {joining ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
                        </button>
                    </div>
                    {joinMsg && (
                        <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${joinMsg.includes('สำเร็จ') || joinMsg.includes('แล้ว') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {joinMsg}
                        </div>
                    )}
                </div>

                {/* Enrolled Courses */}
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 วิชาที่ลงทะเบียนไว้</h2>

                {loading ? <Spinner /> : enrolledCourses.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-5xl mb-3">📭</div>
                        <p className="text-lg font-medium">ยังไม่ได้ลงทะเบียนวิชาใด</p>
                        <p className="text-sm mt-1">กรอกรหัสจากครูด้านบนเพื่อเข้าร่วมห้องเรียน</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrolledCourses.map(course => {
                            const lang = LANGUAGES[course.language];
                            const confirming = confirmUnenroll === course.id;
                            return (
                                <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="h-2" style={{ background: lang?.color || '#6b7280' }}></div>
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="text-3xl">{lang?.icon || '📚'}</div>
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                                ลงทะเบียนแล้ว
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-lg mb-1 leading-snug">{course.title}</h3>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {course.grade && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{course.grade}</span>}
                                            {course.room && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">ห้อง {course.room}</span>}
                                            {course.semester && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">เทอม {course.semester}/{course.academicYear || ''}</span>}
                                        </div>
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>

                                        <button
                                            onClick={() => { window.location.hash = `#/student/workspace?course=${course.id}`; }}
                                            className="w-full py-2 rounded-lg font-medium text-sm bg-green-500 text-white hover:bg-green-600 transition-all mb-2">
                                            เข้าเรียน →
                                        </button>

                                        {!confirming ? (
                                            <button
                                                onClick={() => setConfirmUnenroll(course.id)}
                                                className="w-full py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200">
                                                ยกเลิกการลงทะเบียน
                                            </button>
                                        ) : (
                                            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                                <p className="text-xs text-red-700 text-center mb-2 font-medium">ยืนยันยกเลิกลงทะเบียนวิชานี้?</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setConfirmUnenroll(null)}
                                                        className="flex-1 py-1.5 rounded-lg text-xs bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
                                                        ไม่ใช่
                                                    </button>
                                                    <button
                                                        onClick={() => doUnenroll(course.id)}
                                                        disabled={unenrolling === course.id}
                                                        className="flex-1 py-1.5 rounded-lg text-xs bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                                                        {unenrolling === course.id ? 'กำลังยกเลิก...' : 'ยืนยัน'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

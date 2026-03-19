// js/pages/teacher/StudentManagement.js - Manage enrolled students per course (v4.6)

const StudentManagement = () => {
    const { userDoc } = useAuth();
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const initCourseId = params.get('course') || '';

    const [courses, setCourses] = React.useState([]);
    const [selectedCourseId, setSelectedCourseId] = React.useState(initCourseId);

    // Enrolled students
    const [enrollments, setEnrollments] = React.useState([]);
    const [studentDocs, setStudentDocs] = React.useState({});
    const [loadingEnrolled, setLoadingEnrolled] = React.useState(false);

    // Search/add new students
    const [search, setSearch] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [searching, setSearching] = React.useState(false);
    const [enrollingId, setEnrollingId] = React.useState(null);
    const [unenrollingId, setUnenrollingId] = React.useState(null);

    const [msg, setMsg] = React.useState('');

    const showMsg = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3500); };

    React.useEffect(() => { loadCourses(); }, [userDoc]);
    React.useEffect(() => { if (selectedCourseId) loadEnrolled(); }, [selectedCourseId]);

    const loadCourses = async () => {
        const snap = await db.collection('courses').where('teacherId', '==', userDoc.id).get();
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCourses(list);
        if (!selectedCourseId && list.length === 1) setSelectedCourseId(list[0].id);
    };

    const loadEnrolled = async () => {
        setLoadingEnrolled(true);
        try {
            const enrollSnap = await db.collection('enrollments')
                .where('courseId', '==', selectedCourseId)
                .get();
            const enrollList = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setEnrollments(enrollList);
            const ids = enrollList.map(e => e.studentId);
            if (ids.length > 0) {
                const snaps = await Promise.all(ids.map(id => db.collection('users').doc(id).get()));
                const map = {};
                snaps.forEach(s => { if (s.exists) map[s.id] = { id: s.id, ...s.data() }; });
                setStudentDocs(map);
            } else {
                setStudentDocs({});
            }
        } catch (err) { console.error(err); }
        finally { setLoadingEnrolled(false); }
    };

    // Enroll a student
    const enrollStudent = async (studentId) => {
        if (enrollments.some(e => e.studentId === studentId)) {
            showMsg('⚠️ นักเรียนคนนี้ลงทะเบียนวิชานี้แล้ว');
            return;
        }
        setEnrollingId(studentId);
        try {
            await db.collection('users').doc(studentId).update({
                enrolledCourses: arrayUnion(selectedCourseId),
            });
            await db.collection('enrollments').add({
                studentId,
                courseId: selectedCourseId,
                enrolledAt: serverTimestamp(),
                progress: 0,
                completedLessons: [],
                lastAccessedAt: serverTimestamp(),
            });
            await db.collection('courses').doc(selectedCourseId).update({
                enrollmentCount: increment(1),
            });
            showMsg('✅ ลงทะเบียนนักเรียนสำเร็จ!');
            setSearch('');
            setSearchResults([]);
            loadEnrolled();
        } catch (err) {
            showMsg('❌ เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setEnrollingId(null);
        }
    };

    // Unenroll a student
    const unenrollStudent = async (enrollment) => {
        const student = studentDocs[enrollment.studentId];
        const name = student?.displayName || enrollment.studentId.slice(0, 8);
        if (!confirm(`ยืนยันการยกเลิกลงทะเบียน "${name}" ออกจากวิชานี้?`)) return;
        setUnenrollingId(enrollment.studentId);
        try {
            await db.collection('enrollments').doc(enrollment.id).delete();
            await db.collection('users').doc(enrollment.studentId).update({
                enrolledCourses: arrayRemove(selectedCourseId),
            });
            await db.collection('courses').doc(selectedCourseId).update({
                enrollmentCount: increment(-1),
            });
            showMsg('✅ ยกเลิกลงทะเบียนสำเร็จ');
            loadEnrolled();
        } catch (err) {
            showMsg('❌ เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setUnenrollingId(null);
        }
    };

    // Search students
    const handleSearch = async () => {
        const q = search.trim();
        if (!q) return;
        setSearching(true);
        setSearchResults([]);
        try {
            // Search by displayName prefix
            const byName = await db.collection('users')
                .where('role', '==', 'student')
                .where('displayName', '>=', q)
                .where('displayName', '<=', q + '\uf8ff')
                .limit(15)
                .get();
            // Also try studentCode search
            const byCode = await db.collection('users')
                .where('role', '==', 'student')
                .where('studentCode', '>=', q)
                .where('studentCode', '<=', q + '\uf8ff')
                .limit(10)
                .get();
            const seen = new Set();
            const results = [];
            [...byName.docs, ...byCode.docs].forEach(d => {
                if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); }
            });
            setSearchResults(results);
        } catch (err) {
            showMsg('❌ ค้นหาไม่สำเร็จ: ' + err.message);
        } finally {
            setSearching(false);
        }
    };

    const enrolledIds = new Set(enrollments.map(e => e.studentId));
    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    // Sort enrolled students by grade, room, number
    const sortedEnrollments = [...enrollments].sort((a, b) => {
        const sa = studentDocs[a.studentId];
        const sb = studentDocs[b.studentId];
        if (!sa || !sb) return 0;
        if (sa.grade !== sb.grade) return (sa.grade || '').localeCompare(sb.grade || '');
        if (sa.room !== sb.room) return (sa.room || '').localeCompare(sb.room || '');
        return parseInt(sa.number || 0) - parseInt(sb.number || 0);
    });

    return (
        <div className="min-h-screen" style={{ background: '#FFF5F7', fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="จัดการนักเรียน" subtitle="Student Management" />
            <main className="max-w-5xl mx-auto px-4 py-8">

                <h2 className="text-2xl font-bold mb-6" style={{ color: '#AD1457' }}>👥 จัดการนักเรียนในรายวิชา</h2>

                {/* Course selector */}
                <div className="k-card p-4 mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2">🏫 เลือกรายวิชา:</label>
                    <select value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setSearch(''); setSearchResults([]); }}
                        className="k-input" style={{ maxWidth: '380px' }}>
                        <option value="">-- เลือกรายวิชา --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                {msg && (
                    <div className={`p-3 rounded-xl mb-4 text-sm border ${msg.includes('❌') || msg.includes('⚠️') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {msg}
                    </div>
                )}

                {!selectedCourseId ? (
                    <div className="text-center py-20 text-gray-400">
                        <div className="text-5xl mb-3">👥</div>
                        <p>เลือกรายวิชาเพื่อจัดการนักเรียน</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* ── Left: Enrolled students ── */}
                        <div className="k-card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-700">
                                    📋 นักเรียนที่ลงทะเบียน ({enrollments.length} คน)
                                </h3>
                                <button onClick={loadEnrolled} disabled={loadingEnrolled}
                                    className="text-xs px-3 py-1 rounded-lg disabled:opacity-50"
                                    style={{ background: '#fce7f3', color: '#be185d' }}>
                                    🔄 รีเฟรช
                                </button>
                            </div>

                            {loadingEnrolled ? <Spinner text="โหลดรายชื่อ..." /> : (
                                sortedEnrollments.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">
                                        <div className="text-3xl mb-2">📭</div>
                                        <p className="text-sm">ยังไม่มีนักเรียนในวิชานี้</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {sortedEnrollments.map((enroll) => {
                                            const st = studentDocs[enroll.studentId];
                                            return (
                                                <div key={enroll.id} className="flex items-center justify-between p-3 rounded-xl"
                                                    style={{ background: '#fafafa', border: '1px solid #e0e0e0' }}>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shrink-0 text-sm"
                                                            style={{ background: 'linear-gradient(135deg,#f472b6,#ec4899)' }}>
                                                            {st?.displayName?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-gray-800 text-sm truncate">{st?.displayName || 'ไม่ทราบชื่อ'}</p>
                                                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                                {st?.studentCode && <span className="text-xs text-gray-400">{st.studentCode}</span>}
                                                                {st?.grade && <span className="text-xs text-gray-400">{st.grade}</span>}
                                                                {st?.room && <span className="text-xs text-gray-400">ห้อง {st.room}</span>}
                                                                {st?.number && <span className="text-xs text-gray-400">เลขที่ {st.number}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => unenrollStudent(enroll)}
                                                        disabled={unenrollingId === enroll.studentId}
                                                        className="text-xs px-3 py-1.5 rounded-lg shrink-0 ml-2 disabled:opacity-50"
                                                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                                        {unenrollingId === enroll.studentId ? '⏳' : '✕ ยกเลิก'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>

                        {/* ── Right: Add students ── */}
                        <div className="k-card p-5">
                            <h3 className="font-bold text-gray-700 mb-4">➕ เพิ่มนักเรียนเข้าวิชา</h3>

                            <div className="flex gap-2 mb-4">
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                                    placeholder="ค้นหาชื่อ หรือ เลขประจำตัว..."
                                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                                    style={{ border: '1.5px solid #E0E0E0' }}
                                    onFocus={e => e.target.style.borderColor = '#EC407A'}
                                    onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                                />
                                <button onClick={handleSearch} disabled={searching || !search.trim()}
                                    className="k-btn-pink px-4 py-2 text-sm disabled:opacity-50">
                                    {searching ? '⏳' : '🔍'}
                                </button>
                            </div>

                            {searchResults.length > 0 && (
                                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                                    {searchResults.map(st => {
                                        const already = enrolledIds.has(st.id);
                                        return (
                                            <div key={st.id} className="flex items-center justify-between p-3 rounded-xl"
                                                style={{ background: already ? '#f0fdf4' : '#fafafa', border: `1px solid ${already ? '#bbf7d0' : '#e0e0e0'}` }}>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-800 text-sm">{st.displayName}</p>
                                                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                        {st.studentCode && <span className="text-xs text-gray-400">#{st.studentCode}</span>}
                                                        {st.grade && <span className="text-xs text-gray-400">{st.grade}</span>}
                                                        {st.room && <span className="text-xs text-gray-400">ห้อง {st.room}</span>}
                                                        {st.number && <span className="text-xs text-gray-400">เลขที่ {st.number}</span>}
                                                    </div>
                                                    <p className="text-xs text-gray-400 truncate">{st.email}</p>
                                                </div>
                                                {already ? (
                                                    <span className="text-xs text-green-600 font-medium shrink-0 ml-2">✓ ลงทะเบียนแล้ว</span>
                                                ) : (
                                                    <button
                                                        onClick={() => enrollStudent(st.id)}
                                                        disabled={enrollingId === st.id}
                                                        className="k-btn-pink text-xs px-3 py-1.5 shrink-0 ml-2 disabled:opacity-50">
                                                        {enrollingId === st.id ? '⏳' : '+ เพิ่ม'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!searching && searchResults.length === 0 && search.trim() && (
                                <p className="text-sm text-gray-400 text-center py-4">ไม่พบนักเรียนที่ค้นหา</p>
                            )}

                            {searchResults.length === 0 && !search && (
                                <div className="text-center py-8 text-gray-300">
                                    <div className="text-3xl mb-2">🔍</div>
                                    <p className="text-sm">ค้นหาชื่อหรือเลขประจำตัวนักเรียน</p>
                                    <p className="text-xs mt-1 text-gray-300">แล้วกด Enter หรือปุ่มค้นหา</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

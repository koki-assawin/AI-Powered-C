// js/pages/admin/RiskAlertEvidence.js — หลักฐานการแจ้งเตือนความเสี่ยง (Predictive Risk Alert)
// Route: #/admin/risk-evidence
// อ่านอย่างเดียว: coachInteractions (coachRole = 'predictive') + enrollments + assignments + submissions
// วิธีคำนวณตรงกับ tools/report/build-report.js (ข้อ 7) เพื่อใช้แคปหน้าจอเป็นหลักฐานในภาคผนวก

const _RAE_DEFAULT_CID = 'UZGy0pGurry9Dt9YdhYX';
const _RAE_TZ = 7 * 3600 * 1000;
const _raeBkkDay = (d) => (d ? new Date(d.getTime() + _RAE_TZ).toISOString().slice(0, 10) : '');
const _raeBkkTime = (d) => (d ? new Date(d.getTime() + _RAE_TZ).toISOString().slice(0, 16).replace('T', ' ') : '');
const _raeMedian = (arr) => {
    if (!arr.length) return 0;
    const a = [...arr].sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const _raeFmt = (x, n = 2) => Number(x).toLocaleString('th-TH', { minimumFractionDigits: n, maximumFractionDigits: n });
const _raeInt = (x) => Number(x).toLocaleString('th-TH');

const _RaeCard = ({ label, value, sub, color = '#AD1457', bg = 'white' }) => (
    <div style={{ background: bg, borderRadius: 14, padding: '16px 18px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
);

const RiskAlertEvidence = () => {
    const [courses, setCourses] = React.useState([]);
    const [cid, setCid] = React.useState(_RAE_DEFAULT_CID);
    const [cutoff, setCutoff] = React.useState('2026-09-27');   // วันส่งออกข้อมูลในรายงาน (รวมวันนี้)
    const [splitAt, setSplitAt] = React.useState('2026-07-20'); // วันแรกของช่วงปลายภาค (หลังพักกลางภาค)
    const [threshold, setThreshold] = React.useState(80);
    const [showNames, setShowNames] = React.useState(false);
    const [raw, setRaw] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [loadedAt, setLoadedAt] = React.useState(null);

    React.useEffect(() => {
        db.collection('courses').get()
            .then(s => setCourses(s.docs.map(d => ({ id: d.id, ...d.data() }))))
            .catch(err => console.error(err));
    }, []);

    const load = async () => {
        setLoading(true); setError('');
        try {
            const [enrSnap, asgSnap, subSnap, coachSnap] = await Promise.all([
                db.collection('enrollments').where('courseId', '==', cid).get(),
                db.collection('assignments').where('courseId', '==', cid).get(),
                db.collection('submissions').where('courseId', '==', cid).get(),
                db.collection('coachInteractions').where('coachRole', '==', 'predictive').get(),
            ]);
            const studentIds = [...new Set(enrSnap.docs.map(d => d.data().studentId).filter(Boolean))];
            const userDocs = await Promise.all(studentIds.map(id => db.collection('users').doc(id).get()));
            setRaw({
                users: userDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() })),
                assignments: asgSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                submissions: subSnap.docs.map(d => {
                    const x = d.data();
                    return { studentId: x.studentId, assignmentId: x.assignmentId, score: x.score || 0, at: x.submittedAt?.toDate?.() || null };
                }),
                alerts: coachSnap.docs.map(d => {
                    const x = d.data();
                    return { uid: x.uid, level: x.triggerEvent || '', at: x.createdAt?.toDate?.() || null };
                }),
            });
            setLoadedAt(new Date());
        } catch (err) {
            console.error(err);
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { load(); }, [cid]);

    const result = React.useMemo(() => {
        if (!raw) return null;
        const cutoffEnd = new Date(cutoff + 'T23:59:59.999+07:00');
        const splitStart = new Date(splitAt + 'T00:00:00+07:00');

        // ผู้เรียนและรหัส S ตามเลขที่
        const students = raw.users
            .map(u => ({ uid: u.id, number: parseInt(u.number || '999', 10), name: u.displayName || '' }))
            .sort((a, b) => a.number - b.number);
        students.forEach(s => { s.scode = 'S' + String(s.number).padStart(2, '0'); });
        const byUid = {}; students.forEach(s => { byUid[s.uid] = s; });

        // E1: กิจกรรมที่เผยแพร่และมีหน่วย ใช้คะแนนการส่งครั้งล่าสุด
        const graded = raw.assignments.filter(a => a.isPublished !== false && a.unitName);
        const gradedById = {}; graded.forEach(a => { gradedById[a.id] = a; });
        const totalRaw = graded.reduce((s, a) => s + (a.rawScore || 0), 0);
        const last = {};
        raw.submissions
            .filter(s => gradedById[s.assignmentId] && byUid[s.studentId] && (!s.at || s.at <= cutoffEnd))
            .sort((a, b) => (a.at?.getTime() || 0) - (b.at?.getTime() || 0))
            .forEach(s => { last[s.studentId + '|' + s.assignmentId] = s.score; });
        students.forEach(s => {
            let earned = 0;
            graded.forEach(a => {
                const sc = last[s.uid + '|' + a.id];
                if (sc !== undefined && a.rawScore > 0) earned += Math.round(sc * a.rawScore / 100);
            });
            s.earned = earned;
            s.e1 = totalRaw ? earned / totalRaw * 100 : 0;
        });

        // การแจ้งเตือนของผู้เรียนในรายวิชา
        const alerts = raw.alerts
            .filter(a => byUid[a.uid] && a.at && a.at <= cutoffEnd)
            .sort((a, b) => a.at - b.at);
        students.forEach(s => { s.total = 0; s.high = 0; s.medium = 0; s.early = 0; s.late = 0; s.first = null; s.lastAt = null; });
        alerts.forEach(a => {
            const s = byUid[a.uid];
            s.total++;
            if (/high/.test(a.level)) s.high++; else s.medium++;
            if (a.at < splitStart) s.early++; else s.late++;
            if (!s.first) s.first = a.at;
            s.lastAt = a.at;
        });

        const counts = students.map(s => s.total);
        const alerted = students.filter(s => s.total > 0);
        const below = students.filter(s => s.e1 < threshold);
        const rest = students.filter(s => s.e1 >= threshold);
        const full = students.filter(s => s.e1 >= 99.995);
        const sum = (arr, k) => arr.reduce((x, s) => x + s[k], 0);

        return {
            students, alerts, totalRaw, gradedCount: graded.length,
            total: alerts.length,
            high: sum(students, 'high'), medium: sum(students, 'medium'),
            early: sum(students, 'early'), late: sum(students, 'late'),
            alertedCount: alerted.length,
            median: _raeMedian(counts),
            min: counts.length ? Math.min(...counts) : 0,
            max: counts.length ? Math.max(...counts) : 0,
            below, rest, full,
            restMean: rest.length ? sum(rest, 'total') / rest.length : 0,
            firstAt: alerts.length ? alerts[0].at : null,
            lastAt: alerts.length ? alerts[alerts.length - 1].at : null,
        };
    }, [raw, cutoff, splitAt, threshold]);

    const downloadCsv = () => {
        if (!result) return;
        const head = ['S-code', 'แจ้งเตือนทั้งหมด', 'เสี่ยงสูง', 'เสี่ยงปานกลาง', 'ช่วงต้นภาค', 'ช่วงปลายภาค', 'ครั้งแรก', 'ครั้งล่าสุด', 'คะแนนดิบ E1', 'ร้อยละ E1'];
        const rows = result.students.map(s => [s.scode, s.total, s.high, s.medium, s.early, s.late,
            _raeBkkTime(s.first), _raeBkkTime(s.lastAt), s.earned, s.e1.toFixed(2)]);
        const text = '﻿' + [head, ...rows].map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
        a.download = `risk_alerts_per_student_${cutoff}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const course = courses.find(c => c.id === cid);
    const inputStyle = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 14, background: 'white' };
    const th = { padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' };
    const td = { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="Admin Dashboard" />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <a href="#/admin/dashboard" className="text-sm" style={{ color: '#AD1457', textDecoration: 'none' }}>← กลับแดชบอร์ด</a>

                <div className="rounded-2xl p-6 mt-3 mb-6" style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', border: '1px solid #FFD1DC' }}>
                    <h2 className="text-2xl font-bold mb-1" style={{ color: '#AD1457' }}>หลักฐานการแจ้งเตือนความเสี่ยง (Predictive Risk Alert)</h2>
                    <p style={{ color: '#EC407A' }}>
                        รายวิชา: <b>{course ? (course.title || course.name || cid) : cid}</b>
                        {result && <> · ข้อมูลการแจ้งเตือน {_raeBkkDay(result.firstAt)} ถึง {_raeBkkDay(result.lastAt)}</>}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#9d174d', opacity: 0.8 }}>
                        แหล่งข้อมูล: coachInteractions (coachRole = predictive) · enrollments · assignments · submissions
                        {loadedAt && <> · ดึงข้อมูลจาก Firestore เมื่อ {loadedAt.toLocaleString('th-TH')}</>}
                    </p>
                </div>

                {/* ตัวเลือก */}
                <div className="bg-white rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end" style={{ border: '1px solid #f1f5f9' }}>
                    <label className="text-sm text-gray-600">รายวิชา<br />
                        <select value={cid} onChange={e => setCid(e.target.value)} style={{ ...inputStyle, maxWidth: 320 }}>
                            {!courses.some(c => c.id === cid) && <option value={cid}>{cid}</option>}
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title || c.name || c.id}</option>)}
                        </select>
                    </label>
                    <label className="text-sm text-gray-600">ข้อมูลถึงวันที่ (รวมวันนั้น)<br />
                        <input type="date" value={cutoff} onChange={e => setCutoff(e.target.value)} style={inputStyle} />
                    </label>
                    <label className="text-sm text-gray-600">เริ่มช่วงปลายภาค<br />
                        <input type="date" value={splitAt} onChange={e => setSplitAt(e.target.value)} style={inputStyle} />
                    </label>
                    <label className="text-sm text-gray-600">เกณฑ์ E1 (ร้อยละ)<br />
                        <input type="number" min="0" max="100" value={threshold} onChange={e => setThreshold(Number(e.target.value) || 0)} style={{ ...inputStyle, width: 90 }} />
                    </label>
                    <label className="text-sm text-gray-600 flex items-center gap-2" style={{ paddingBottom: 6 }}>
                        <input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} /> แสดงชื่อผู้เรียน
                    </label>
                    <button onClick={load} disabled={loading} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: '#EC407A' }}>
                        {loading ? 'กำลังโหลด…' : '↻ โหลดใหม่'}
                    </button>
                    <button onClick={downloadCsv} disabled={!result} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid #EC407A', color: '#AD1457', background: 'white' }}>
                        ⬇ CSV รายคน
                    </button>
                </div>

                {error && <div className="bg-red-50 text-red-700 rounded-lg p-4 mb-6">โหลดข้อมูลไม่สำเร็จ: {error}</div>}
                {loading && !result && <Spinner />}

                {result && (
                    <>
                        {/* ภาพรวม */}
                        <h3 className="font-bold text-lg mb-3" style={{ color: '#AD1457' }}>1. ภาพรวมการแจ้งเตือน</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <_RaeCard label="การแจ้งเตือนทั้งหมด" value={_raeInt(result.total) + ' ครั้ง'}
                                sub={`ผู้เรียนที่ถูกแจ้งเตือน ${result.alertedCount} จาก ${result.students.length} คน`} />
                            <_RaeCard label="เสี่ยงสูง (risk_high)" value={_raeInt(result.high) + ' ครั้ง'} color="#dc2626"
                                sub={`ร้อยละ ${_raeFmt(result.total ? result.high / result.total * 100 : 0, 1)}`} />
                            <_RaeCard label="เสี่ยงปานกลาง (risk_medium)" value={_raeInt(result.medium) + ' ครั้ง'} color="#d97706"
                                sub={`ร้อยละ ${_raeFmt(result.total ? result.medium / result.total * 100 : 0, 1)}`} />
                            <_RaeCard label="ค่ามัธยฐานต่อคน" value={_raeFmt(result.median, result.median % 1 ? 1 : 0) + ' ครั้ง'} color="#7c3aed"
                                sub={`ต่ำสุด ${result.min} · สูงสุด ${result.max} ครั้ง`} />
                        </div>

                        <h3 className="font-bold text-lg mb-3" style={{ color: '#AD1457' }}>2. ช่วงเวลาที่เกิดการแจ้งเตือน</h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <_RaeCard label={`ช่วงต้นภาคเรียน (ก่อน ${splitAt})`} value={_raeInt(result.early) + ' ครั้ง'} color="#0369a1"
                                sub={`ร้อยละ ${_raeFmt(result.total ? result.early / result.total * 100 : 0, 1)}`} />
                            <_RaeCard label={`ช่วงปลายภาคเรียน (ตั้งแต่ ${splitAt})`} value={_raeInt(result.late) + ' ครั้ง'} color="#0369a1"
                                sub={`ร้อยละ ${_raeFmt(result.total ? result.late / result.total * 100 : 0, 1)}`} />
                        </div>

                        <h3 className="font-bold text-lg mb-3" style={{ color: '#AD1457' }}>3. เทียบกับผลสุดท้าย (E1)</h3>
                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                            <_RaeCard label={`ผู้เรียนที่ได้ E1 ต่ำกว่าร้อยละ ${threshold} (${result.below.length} คน)`} bg="#FEF2F2" color="#b91c1c"
                                value={result.below.length ? result.below.map(s => s.total).join(', ') + ' ครั้ง' : '-'}
                                sub={result.below.map(s => `${s.scode} (E1 ${s.e1.toFixed(2)}%)`).join(' · ')} />
                            <_RaeCard label={`ผู้เรียนที่เหลือ (${result.rest.length} คน) เฉลี่ย`} color="#374151"
                                value={_raeFmt(result.restMean) + ' ครั้ง/คน'}
                                sub={`รวม ${_raeInt(result.rest.reduce((x, s) => x + s.total, 0))} ครั้ง ÷ ${result.rest.length} คน`} />
                            <_RaeCard label={`ผู้เรียนที่ได้ E1 ร้อยละ 100 (${result.full.length} คน)`} bg="#F0FDF4" color="#15803d"
                                value={result.full.length ? result.full.map(s => s.total).join(', ') + ' ครั้ง' : '-'}
                                sub={result.full.map(s => s.scode).join(' · ')} />
                        </div>

                        {/* ตารางรายคน */}
                        <h3 className="font-bold text-lg mb-3" style={{ color: '#AD1457' }}>4. การแจ้งเตือนรายบุคคล</h3>
                        <div className="bg-white rounded-xl mb-4" style={{ border: '1px solid #f1f5f9', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead style={{ background: '#fdf2f8' }}>
                                    <tr>
                                        <th style={{ ...th, textAlign: 'left' }}>รหัส</th>
                                        {showNames && <th style={{ ...th, textAlign: 'left' }}>ชื่อ</th>}
                                        <th style={th}>ทั้งหมด</th>
                                        <th style={th}>เสี่ยงสูง</th>
                                        <th style={th}>ปานกลาง</th>
                                        <th style={th}>ต้นภาค</th>
                                        <th style={th}>ปลายภาค</th>
                                        <th style={{ ...th, textAlign: 'left', minWidth: 140 }}></th>
                                        <th style={th}>ครั้งแรก</th>
                                        <th style={th}>ครั้งล่าสุด</th>
                                        <th style={th}>E1 (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.students.map(s => {
                                        const isBelow = s.e1 < threshold, isFull = s.e1 >= 99.995;
                                        return (
                                            <tr key={s.uid} style={{ background: isBelow ? '#FEF2F2' : isFull ? '#F0FDF4' : undefined }}>
                                                <td style={{ ...td, textAlign: 'left', fontWeight: 700 }}>{s.scode}</td>
                                                {showNames && <td style={{ ...td, textAlign: 'left' }}>{s.name}</td>}
                                                <td style={{ ...td, fontWeight: 700 }}>{s.total}</td>
                                                <td style={td}>{s.high}</td>
                                                <td style={td}>{s.medium}</td>
                                                <td style={td}>{s.early}</td>
                                                <td style={td}>{s.late}</td>
                                                <td style={{ ...td, textAlign: 'left' }}>
                                                    <div style={{ height: 8, borderRadius: 4, background: '#f1f5f9', width: 130 }}>
                                                        <div style={{ height: 8, borderRadius: 4, background: isBelow ? '#dc2626' : '#EC407A', width: (result.max ? s.total / result.max * 130 : 0) }} />
                                                    </div>
                                                </td>
                                                <td style={{ ...td, color: '#6b7280' }}>{_raeBkkDay(s.first)}</td>
                                                <td style={{ ...td, color: '#6b7280' }}>{_raeBkkDay(s.lastAt)}</td>
                                                <td style={{ ...td, fontWeight: 700, color: isBelow ? '#b91c1c' : isFull ? '#15803d' : '#374151' }}>{s.e1.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#fdf2f8', fontWeight: 700 }}>
                                        <td style={{ ...td, textAlign: 'left' }} colSpan={showNames ? 2 : 1}>รวม {result.students.length} คน</td>
                                        <td style={td}>{result.total}</td>
                                        <td style={td}>{result.high}</td>
                                        <td style={td}>{result.medium}</td>
                                        <td style={td}>{result.early}</td>
                                        <td style={td}>{result.late}</td>
                                        <td style={td} colSpan={4}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">แถวสีแดง = E1 ต่ำกว่าร้อยละ {threshold} · แถวสีเขียว = E1 ร้อยละ 100</p>

                        <div className="text-xs text-gray-500 bg-white rounded-xl p-4 mt-4" style={{ border: '1px solid #f1f5f9', lineHeight: 1.7 }}>
                            <b>วิธีคำนวณ</b><br />
                            • นับเฉพาะระเบียน coachInteractions ที่ coachRole = predictive ของผู้เรียนที่ลงทะเบียนในรายวิชา และเกิดไม่เกินวันที่ {cutoff} (เวลาไทย)<br />
                            • ระดับความเสี่ยงอ่านจาก triggerEvent: risk_high = เสี่ยงสูง, อื่น ๆ = เสี่ยงปานกลาง<br />
                            • ช่วงต้นภาค = ก่อนวันที่ {splitAt} · ช่วงปลายภาค = ตั้งแต่วันที่ {splitAt} (ช่วงพักกลางภาคไม่มีการแจ้งเตือน)<br />
                            • ค่ามัธยฐาน ต่ำสุด และสูงสุด คำนวณจากจำนวนครั้งต่อคนของผู้เรียนทั้ง {result.students.length} คน<br />
                            • E1 = คะแนนการส่งครั้งล่าสุดของกิจกรรมที่เผยแพร่และมีหน่วย {result.gradedCount} ข้อ (คะแนนเต็มรวม {result.totalRaw}) ที่ส่งไม่เกินวันที่ {cutoff}<br />
                            • ระบบไม่ได้บันทึกการเปิดดูแดชบอร์ดหรือการเข้าช่วยเหลือของครู จึงไม่มีตัวเลขส่วนนั้นในหน้านี้
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

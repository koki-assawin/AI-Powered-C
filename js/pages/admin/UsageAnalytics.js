// js/pages/admin/UsageAnalytics.js — Usage Analytics Dashboard (v1.1)
// ข้อมูลจาก usageEvents collection: code_run, sample_test, submission, ai_analyze, ai_hint, ai_chat, demo_run

// ── Chart helper (destroy old → create new) ──────────────────────────────────
const _useChart = (ref, type, dataFn, deps) => {
    React.useEffect(() => {
        if (!ref.current || !window.Chart) return;
        const existing = Chart.getChart(ref.current);
        if (existing) existing.destroy();
        const cfg = dataFn();
        if (!cfg) return;
        new Chart(ref.current, cfg);
    }, deps);
};

// ── Colour palette ────────────────────────────────────────────────────────────
const _UA_COLORS = {
    code_run:   '#3b82f6',
    sample_test:'#8b5cf6',
    submission: '#ec4899',
    ai_analyze: '#f59e0b',
    ai_hint:    '#10b981',
    ai_chat:    '#06b6d4',
    demo_run:   '#6366f1',
    teacher:    '#16a34a',
    student:    '#2563eb',
    admin:      '#dc2626',
    demo:       '#9333ea',
};

const _EVENT_LABELS = {
    code_run:    'รันโค้ด (Free Run)',
    sample_test: 'ทดสอบ Sample',
    submission:  'ส่งงาน',
    ai_analyze:  'AI วิเคราะห์',
    ai_hint:     'AI คำใบ้',
    ai_chat:     'AI Chat',
    demo_run:    'Demo Run',
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
const _KPICard = ({ icon, label, total, today, color }) => (
    <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,.06)', border: '1px solid #f1f5f9', minWidth: 0 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color }}>{total.toLocaleString()}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>วันนี้: <span style={{ color, fontWeight: 700 }}>{today}</span></div>
    </div>
);

// ── Tab: ภาพรวม ───────────────────────────────────────────────────────────────
const _OverviewTab = ({ events, loading }) => {
    const trendRef  = React.useRef(null);
    const donutRef  = React.useRef(null);

    const today = new Date().toISOString().slice(0, 10);
    const todayEvents = events.filter(e => e.date === today);

    const AI_EVENTS = ['ai_analyze', 'ai_hint', 'ai_chat'];
    const RUN_EVENTS = ['code_run', 'sample_test', 'demo_run'];

    const kpis = [
        { icon: '▶', label: 'รันโค้ด (ทั้งหมด)', total: events.filter(e => RUN_EVENTS.includes(e.event)).length, today: todayEvents.filter(e => RUN_EVENTS.includes(e.event)).length, color: '#3b82f6' },
        { icon: '🧪', label: 'ทดสอบ Sample', total: events.filter(e => e.event === 'sample_test').length, today: todayEvents.filter(e => e.event === 'sample_test').length, color: '#8b5cf6' },
        { icon: '📤', label: 'ส่งงาน', total: events.filter(e => e.event === 'submission').length, today: todayEvents.filter(e => e.event === 'submission').length, color: '#ec4899' },
        { icon: '🤖', label: 'ใช้ AI (ทั้งหมด)', total: events.filter(e => AI_EVENTS.includes(e.event)).length, today: todayEvents.filter(e => AI_EVENTS.includes(e.event)).length, color: '#f59e0b' },
        { icon: '🎭', label: 'Demo Run', total: events.filter(e => e.event === 'demo_run').length, today: todayEvents.filter(e => e.event === 'demo_run').length, color: '#6366f1' },
        { icon: '👥', label: 'ผู้ใช้ที่ active', total: new Set(events.map(e => e.uid)).size, today: new Set(todayEvents.map(e => e.uid)).size, color: '#0891b2' },
    ];

    // Build 14-day trend data
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        last14.push(d.toISOString().slice(0, 10));
    }

    const eventTypes = ['code_run', 'sample_test', 'submission', 'ai_analyze', 'ai_hint', 'ai_chat', 'demo_run'];

    _useChart(trendRef, 'bar', () => ({
        type: 'bar',
        data: {
            labels: last14.map(d => d.slice(5)),
            datasets: eventTypes.map(ev => ({
                label: _EVENT_LABELS[ev],
                data: last14.map(d => events.filter(e => e.date === d && e.event === ev).length),
                backgroundColor: _UA_COLORS[ev],
                stack: 'stack',
            })),
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
        },
    }), [events.length]);

    // User type breakdown
    const typeCount = {};
    events.forEach(e => { const t = e.userType || 'unknown'; typeCount[t] = (typeCount[t] || 0) + 1; });

    _useChart(donutRef, 'doughnut', () => {
        const labels = Object.keys(typeCount);
        if (labels.length === 0) return null;
        return {
            type: 'doughnut',
            data: {
                labels: labels.map(t => ({ teacher:'ครู', student:'นักเรียน', admin:'Admin', demo:'Demo' }[t] || t)),
                datasets: [{ data: labels.map(t => typeCount[t]), backgroundColor: labels.map(t => _UA_COLORS[t] || '#94a3b8'), borderWidth: 2 }],
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } },
        };
    }, [events.length]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>;

    return (
        <div>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 28 }}>
                {kpis.map(k => <_KPICard key={k.label} {...k} />)}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>📈 กิจกรรม 14 วันย้อนหลัง</div>
                    <div style={{ height: 280 }}>
                        <canvas ref={trendRef} />
                    </div>
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>👥 สัดส่วนตามประเภทผู้ใช้</div>
                    <div style={{ height: 220, position: 'relative' }}>
                        <canvas ref={donutRef} />
                    </div>
                    <div style={{ marginTop: 14 }}>
                        {Object.entries(typeCount).map(([t, n]) => (
                            <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                <span style={{ color: '#374151' }}>{{ teacher:'ครู', student:'นักเรียน', admin:'Admin', demo:'Demo' }[t] || t}</span>
                                <span style={{ fontWeight: 700, color: _UA_COLORS[t] || '#6b7280' }}>{n.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Tab: ตามประเภทผู้ใช้ ──────────────────────────────────────────────────────
const _UserTypeTab = ({ events, userDocs }) => {
    const barRef = React.useRef(null);
    const types = ['teacher', 'student', 'admin', 'demo'];
    const evTypes = ['code_run', 'sample_test', 'submission', 'ai_analyze', 'ai_hint', 'ai_chat', 'demo_run'];

    _useChart(barRef, 'bar', () => ({
        type: 'bar',
        data: {
            labels: types.map(t => ({ teacher:'ครู', student:'นักเรียน', admin:'Admin', demo:'Demo' }[t] || t)),
            datasets: evTypes.map(ev => ({
                label: _EVENT_LABELS[ev],
                data: types.map(t => events.filter(e => (e.userType || 'unknown') === t && e.event === ev).length),
                backgroundColor: _UA_COLORS[ev],
                borderRadius: 4,
            })),
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
    }), [events.length]);

    // Compute summary table
    const summary = types.map(t => {
        const typeEvs = events.filter(e => (e.userType || 'unknown') === t);
        return { type: t, total: typeEvs.length, ...Object.fromEntries(evTypes.map(ev => [ev, typeEvs.filter(e => e.event === ev).length])) };
    }).filter(r => r.total > 0);

    return (
        <div>
            <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>📊 กิจกรรมแยกตามประเภทผู้ใช้</div>
                <div style={{ height: 300 }}>
                    <canvas ref={barRef} />
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>ประเภทผู้ใช้</th>
                            {evTypes.map(ev => <th key={ev} style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: '#6b7280', fontSize: 11 }}>{_EVENT_LABELS[ev]}</th>)}
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map((r, i) => (
                            <tr key={r.type} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                <td style={{ padding: '10px 16px', fontWeight: 600, color: _UA_COLORS[r.type] || '#374151' }}>
                                    {{ teacher:'👨‍🏫 ครู', student:'🎓 นักเรียน', admin:'🔐 Admin', demo:'🎭 Demo' }[r.type] || r.type}
                                </td>
                                {evTypes.map(ev => <td key={ev} style={{ padding: '10px 8px', textAlign: 'right', color: r[ev] > 0 ? '#374151' : '#d1d5db' }}>{r[ev] || '—'}</td>)}
                                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>{r.total.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Tab: ตามรายวิชา ───────────────────────────────────────────────────────────
const _CourseTab = ({ events, courses }) => {
    const barRef = React.useRef(null);

    // Group by courseId
    const courseCounts = {};
    events.forEach(e => {
        const cid = e.courseId || '_none';
        if (!courseCounts[cid]) courseCounts[cid] = { code_run: 0, sample_test: 0, submission: 0, ai: 0, total: 0 };
        if (['code_run','demo_run'].includes(e.event)) courseCounts[cid].code_run++;
        else if (e.event === 'sample_test') courseCounts[cid].sample_test++;
        else if (e.event === 'submission') courseCounts[cid].submission++;
        else if (['ai_analyze','ai_hint','ai_chat'].includes(e.event)) courseCounts[cid].ai++;
        courseCounts[cid].total++;
    });

    const rows = Object.entries(courseCounts)
        .map(([cid, counts]) => ({ cid, name: courses[cid]?.title || courses[cid]?.name || (cid === '_none' ? 'ไม่ระบุ' : cid), ...counts }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

    _useChart(barRef, 'bar', () => {
        if (rows.length === 0) return null;
        const top8 = rows.slice(0, 8);
        return {
            type: 'bar',
            data: {
                labels: top8.map(r => r.name.length > 20 ? r.name.slice(0, 20) + '…' : r.name),
                datasets: [
                    { label: 'รันโค้ด', data: top8.map(r => r.code_run), backgroundColor: '#3b82f6', borderRadius: 4 },
                    { label: 'ทดสอบ', data: top8.map(r => r.sample_test), backgroundColor: '#8b5cf6', borderRadius: 4 },
                    { label: 'ส่งงาน', data: top8.map(r => r.submission), backgroundColor: '#ec4899', borderRadius: 4 },
                    { label: 'ใช้ AI', data: top8.map(r => r.ai), backgroundColor: '#f59e0b', borderRadius: 4 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } },
                scales: { y: { beginAtZero: true, stacked: false, ticks: { precision: 0 } } },
            },
        };
    }, [events.length, Object.keys(courses).length]);

    return (
        <div>
            <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>📚 กิจกรรมแยกตามรายวิชา (Top 8)</div>
                <div style={{ height: 280 }}>
                    <canvas ref={barRef} />
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>รายวิชา</th>
                            <th style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#3b82f6' }}>รันโค้ด</th>
                            <th style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#8b5cf6' }}>ทดสอบ</th>
                            <th style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#ec4899' }}>ส่งงาน</th>
                            <th style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>AI</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.cid} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                <td style={{ padding: '10px 16px', color: '#374151', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#3b82f6', fontWeight: r.code_run > 0 ? 600 : 400 }}>{r.code_run || '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#8b5cf6', fontWeight: r.sample_test > 0 ? 600 : 400 }}>{r.sample_test || '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ec4899', fontWeight: r.submission > 0 ? 600 : 400 }}>{r.submission || '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f59e0b', fontWeight: r.ai > 0 ? 600 : 400 }}>{r.ai || '—'}</td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>{r.total.toLocaleString()}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>ไม่มีข้อมูล</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Tab: การใช้ AI ────────────────────────────────────────────────────────────
const _AITab = ({ events, loading }) => {
    const trendRef = React.useRef(null);

    const AI_EVENTS = ['ai_analyze', 'ai_hint', 'ai_chat'];
    const aiEvents = events.filter(e => AI_EVENTS.includes(e.event));

    const today = new Date().toISOString().slice(0, 10);
    const todayAI = aiEvents.filter(e => e.date === today);

    const kpis = [
        { icon: '🔬', label: 'วิเคราะห์โค้ด', total: events.filter(e => e.event === 'ai_analyze').length, today: todayAI.filter(e => e.event === 'ai_analyze').length, color: '#f59e0b' },
        { icon: '💡', label: 'ขอคำใบ้', total: events.filter(e => e.event === 'ai_hint').length, today: todayAI.filter(e => e.event === 'ai_hint').length, color: '#10b981' },
        { icon: '💬', label: 'AI Chat', total: events.filter(e => e.event === 'ai_chat').length, today: todayAI.filter(e => e.event === 'ai_chat').length, color: '#06b6d4' },
        { icon: '🤖', label: 'AI รวม', total: aiEvents.length, today: todayAI.length, color: '#6366f1' },
    ];

    // Hint level breakdown
    const hintLevels = {};
    events.filter(e => e.event === 'ai_hint').forEach(e => {
        const lv = `ระดับ ${e.hintLevel || 1}`;
        hintLevels[lv] = (hintLevels[lv] || 0) + 1;
    });

    // 14-day trend for AI
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        last14.push(d.toISOString().slice(0, 10));
    }

    _useChart(trendRef, 'line', () => ({
        type: 'line',
        data: {
            labels: last14.map(d => d.slice(5)),
            datasets: AI_EVENTS.map(ev => ({
                label: _EVENT_LABELS[ev],
                data: last14.map(d => events.filter(e => e.date === d && e.event === ev).length),
                borderColor: _UA_COLORS[ev],
                backgroundColor: _UA_COLORS[ev] + '20',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
            })),
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
    }), [events.length]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>;

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                {kpis.map(k => <_KPICard key={k.label} {...k} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>🤖 การใช้ AI 14 วัน</div>
                    <div style={{ height: 260 }}>
                        <canvas ref={trendRef} />
                    </div>
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>💡 การใช้คำใบ้ตามระดับ</div>
                    {Object.keys(hintLevels).length > 0 ? (
                        Object.entries(hintLevels).sort(([a],[b]) => a.localeCompare(b)).map(([lv, n]) => (
                            <div key={lv} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                    <span style={{ color: '#374151' }}>{lv}</span>
                                    <span style={{ fontWeight: 700, color: '#10b981' }}>{n}</span>
                                </div>
                                <div style={{ background: '#f1f5f9', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, (n / (events.filter(e => e.event === 'ai_hint').length || 1)) * 100)}%`, height: '100%', background: '#10b981', borderRadius: 8 }} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 40 }}>ยังไม่มีข้อมูล</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Tab: ผู้ใช้งานสูงสุด ──────────────────────────────────────────────────────
const _TopUsersTab = ({ events, userDocs }) => {
    // Count events per uid
    const userCounts = {};
    events.forEach(e => {
        const uid = e.uid || 'demo';
        if (!userCounts[uid]) userCounts[uid] = { uid, total: 0, submission: 0, ai: 0, code_run: 0 };
        userCounts[uid].total++;
        if (e.event === 'submission') userCounts[uid].submission++;
        else if (['ai_analyze','ai_hint','ai_chat'].includes(e.event)) userCounts[uid].ai++;
        else if (['code_run','sample_test','demo_run'].includes(e.event)) userCounts[uid].code_run++;
    });

    const rows = Object.values(userCounts).sort((a, b) => b.total - a.total).slice(0, 20);

    return (
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 14, color: '#374151' }}>
                🏆 ผู้ใช้งานสูงสุด (Top 20)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                    <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', width: 48 }}>#</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>ผู้ใช้</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Role</th>
                        <th style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#3b82f6' }}>รันโค้ด</th>
                        <th style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#ec4899' }}>ส่งงาน</th>
                        <th style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#f59e0b' }}>AI</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>รวม</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => {
                        const u = userDocs[r.uid];
                        return (
                            <tr key={r.uid} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                <td style={{ padding: '10px 16px', color: i < 3 ? ['#f59e0b','#94a3b8','#cd7c32'][i] : '#9ca3af', fontWeight: i < 3 ? 700 : 400 }}>
                                    {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                    <div style={{ fontWeight: 600, color: '#374151' }}>{u?.displayName || (r.uid === 'demo' ? 'Demo User' : r.uid.slice(0, 8) + '…')}</div>
                                    {u?.email && <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.email}</div>}
                                </td>
                                <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>
                                    {{ teacher: '👨‍🏫 ครู', student: '🎓 นักเรียน', admin: '🔐 Admin' }[u?.role] || '🎭 Demo'}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>{r.code_run}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ec4899', fontWeight: 600 }}>{r.submission}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{r.ai}</td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>{r.total.toLocaleString()}</td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>ยังไม่มีข้อมูล</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const UsageAnalytics = () => {
    const { userDoc } = useAuth();
    const [tab, setTab]           = React.useState('overview');
    const [loading, setLoading]   = React.useState(true);
    const [events, setEvents]     = React.useState([]);
    const [userDocs, setUserDocs] = React.useState({});
    const [courses, setCourses]   = React.useState({});
    const [dateRange, setDateRange] = React.useState(14); // last N days
    const [lastRefresh, setLastRefresh] = React.useState(null);

    React.useEffect(() => { loadData(); }, [dateRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - dateRange);
            const cutoffStr = cutoff.toISOString().slice(0, 10);

            const [evSnap, usersSnap, coursesSnap] = await Promise.all([
                db.collection('usageEvents').where('date', '>=', cutoffStr).get(),
                db.collection('users').get(),
                db.collection('courses').get(),
            ]);

            setEvents(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const uMap = {};
            usersSnap.docs.forEach(d => { uMap[d.id] = d.data(); });
            setUserDocs(uMap);

            const cMap = {};
            coursesSnap.docs.forEach(d => { cMap[d.id] = d.data(); });
            setCourses(cMap);

            setLastRefresh(new Date().toLocaleTimeString('th-TH'));
        } catch (err) {
            console.error('[UsageAnalytics] load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const TABS = [
        { key: 'overview',  label: '📊 ภาพรวม' },
        { key: 'usertype',  label: '👥 ตามประเภทผู้ใช้' },
        { key: 'course',    label: '📚 ตามรายวิชา' },
        { key: 'ai',        label: '🤖 การใช้ AI' },
        { key: 'topusers',  label: '🏆 ผู้ใช้งานสูงสุด' },
    ];

    const DATE_OPTS = [
        { v: 7,   l: '7 วัน' },
        { v: 14,  l: '14 วัน' },
        { v: 30,  l: '30 วัน' },
        { v: 90,  l: '90 วัน' },
        { v: 365, l: 'ทั้งหมด (1 ปี)' },
    ];

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Prompt',sans-serif" }}>
            <Navbar title="AI-Powered Coding Coach (APCC)" subtitle="Usage Analytics" />
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', border: '1px solid #FFD1DC', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#AD1457', margin: 0 }}>📈 รายงานการใช้งานระบบ</h2>
                        <p style={{ color: '#EC407A', margin: '4px 0 0', fontSize: 13 }}>
                            ติดตาม Code Runs · Sample Tests · Submissions · AI Usage แบบ Real-time
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {lastRefresh && <span style={{ fontSize: 11, color: '#f9a8d4' }}>อัพเดต {lastRefresh}</span>}
                        <select value={dateRange} onChange={e => setDateRange(Number(e.target.value))}
                            style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #fce7f3', background: 'white', fontSize: 13, color: '#be185d', cursor: 'pointer' }}>
                            {DATE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <button onClick={loadData} disabled={loading}
                            style={{ padding: '7px 16px', borderRadius: 10, background: loading ? '#f9a8d4' : 'linear-gradient(135deg,#ec4899,#be185d)', color: 'white', border: 'none', fontFamily: "'Prompt',sans-serif", fontWeight: 700, fontSize: 13, cursor: loading ? 'wait' : 'pointer' }}>
                            {loading ? '⏳' : '🔄'} รีเฟรช
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 4, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)', width: 'fit-content' }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{
                                padding: '8px 16px', borderRadius: 10, border: 'none', fontFamily: "'Prompt',sans-serif",
                                fontSize: 13, fontWeight: tab === t.key ? 700 : 500, cursor: 'pointer',
                                background: tab === t.key ? 'linear-gradient(135deg,#ec4899,#be185d)' : 'transparent',
                                color: tab === t.key ? 'white' : '#6b7280',
                                transition: 'all .15s',
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {loading && tab === 'overview' ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <div>กำลังโหลดข้อมูล...</div>
                    </div>
                ) : (
                    <div>
                        {tab === 'overview'  && <_OverviewTab  events={events} loading={loading} />}
                        {tab === 'usertype'  && <_UserTypeTab  events={events} userDocs={userDocs} />}
                        {tab === 'course'    && <_CourseTab    events={events} courses={courses} />}
                        {tab === 'ai'        && <_AITab        events={events} loading={loading} />}
                        {tab === 'topusers'  && <_TopUsersTab  events={events} userDocs={userDocs} />}
                    </div>
                )}

                {/* Empty state */}
                {!loading && events.length === 0 && (
                    <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center', marginTop: 20, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>ยังไม่มีข้อมูลการใช้งาน</div>
                        <div style={{ fontSize: 13, color: '#9ca3af', maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>
                            ข้อมูลจะปรากฏเมื่อนักเรียน/ครูเริ่มใช้งาน Code Editor<br/>
                            (รันโค้ด, ส่งงาน, ใช้ AI) ใน {dateRange} วันที่ผ่านมา
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

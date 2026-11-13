/**
 * js/studio/studioConfig.js — APCC Studio Core (v6.0)
 *
 * หลักการ PAAC+D: ทุกข้อ — ด่านเดียวที่ทุกฟีเจอร์ Studio ต้องผ่าน
 * ปัญหาการเรียนรู้ที่แก้: ระบบเดิมออกแบบมาเพื่อ "ผ่านกรณีทดสอบ" ภาษา C
 * รายวิชาที่เป้าหมายคือ "สร้างผลงาน" (ว23207, ว23103) ต้องเปิดฟีเจอร์ใหม่ได้เป็นรายวิชา
 * โดยรายวิชาเดิมทำงานเหมือนเดิม 100%
 *
 * กติกา
 *   - course.studio === undefined หรือ enabled !== true  ⇒  ไม่ใช่ Studio ทุกฟีเจอร์ปิด
 *   - รายวิชาใน STUDIO_PROTECTED_COURSE_IDS หรือชื่อขึ้นต้นด้วย "ว31281" เปิด Studio ไม่ได้เลย (ข้อมูลวิจัย)
 *   - ทุก feature มีค่าเริ่มต้นเป็น false
 */

const STUDIO_VERSION = '6.0';

// รายวิชาที่เป็นหลักฐานของรายงาน (ว31281 ทุกรุ่น + ทดลองใช้ 3 ระดับ) — ห้ามเปิด Studio
const STUDIO_PROTECTED_COURSE_IDS = [
    '237KT9WU4yKzrgqALJQz',  // ว31281 1/68
    'UZGy0pGurry9Dt9YdhYX',  // ว31281 1/69
    'sandbox-e1-test',       // Sandbox1 — field trial
    'sandbox-e1-test-2',     // Sandbox2 — small group
    'sandbox-e1-test-3',     // Sandbox3 — one-to-one
    'p1f8ZRR6qKVDM70zvndI',  // ว31281 (cpp) 1/68
    'czzTsIAnxkeaQ3DjmMRu',  // ว31281 (cpp) 1/69
    'iGfWVnF5HkJDb5NHK1ee',  // ห้องทดลองเรียน ว31281
];

const STUDIO_FEATURES = [
    ['parsons',           'โจทย์เรียงบรรทัด (Parsons)',      'P'],
    ['pythonLearningHub', 'Learning Hub ภาษาไพทอน',         'A₁'],
    ['skillGate',         'ด่านทักษะ (Skill Gate)',          'P'],
    ['explainBack',       'อธิบายโค้ดของฉัน (Explain-Back)', 'C'],
    ['projectStudio',     'Project Studio',                 'D'],
    ['webAppRunner',      'รันเว็บแอป (stlite)',             'D'],
    ['rubricReview',      'ประเมินตามรูบริก',                'C'],
    ['portfolio',         'Portfolio & Showcase',           'C'],
    ['processAnalytics',  'Studio Analytics',               'ทุกข้อ'],
];

const _allFeatures = (on) => Object.fromEntries(STUDIO_FEATURES.map(([k]) => [k, !!on]));

// ค่าเริ่มต้นต่อ template (ครูปรับรายฟีเจอร์ได้ในหน้าแก้ไขรายวิชา)
const STUDIO_TEMPLATES = {
    w23207: {
        label: 'ว23207 นวัตกรรมดิจิทัล ม.3 (Python)',
        features: _allFeatures(true),
        stages: ['practice', 'create', 'share'],
    },
    w23103_ch2: {
        label: 'ว23103 วิทยาการคำนวณ 3 บทที่ 2 (Python)',
        features: { ..._allFeatures(false), parsons: true, pythonLearningHub: true, skillGate: true, explainBack: true },
        stages: ['practice', 'create'],
    },
    generic_python: {
        label: 'รายวิชา Python ทั่วไป',
        features: { ..._allFeatures(false), parsons: true, pythonLearningHub: true, explainBack: true },
        stages: ['practice', 'create', 'share'],
    },
    web_basic: {
        label: 'เว็บไซต์เบื้องต้น (ว33203)',
        features: { ..._allFeatures(false), projectStudio: true, rubricReview: true, portfolio: true },
        stages: ['practice', 'create', 'share'],
    },
};

const isProtectedCourse = (course) =>
    !course || STUDIO_PROTECTED_COURSE_IDS.includes(course.id) || /^ว31281/.test((course.title || '').trim());

const isStudio = (course) =>
    !!(course && course.studio && course.studio.enabled === true && !isProtectedCourse(course));

const hasFeature = (course, key) =>
    isStudio(course) && !!(course.studio.features && course.studio.features[key] === true);

const buildStudioConfig = (templateId, features) => {
    const t = STUDIO_TEMPLATES[templateId] || STUDIO_TEMPLATES.generic_python;
    return {
        enabled: true,
        version: STUDIO_VERSION,
        template: STUDIO_TEMPLATES[templateId] ? templateId : 'generic_python',
        features: { ..._allFeatures(false), ...(features || t.features) },
        stages: t.stages,
        hintPolicy: { maxLevelInExam: 0, maxLevelDefault: 4 },
    };
};

// บันทึกเหตุการณ์ของ Studio — แยกจาก usageEvents เพื่อไม่ปนข้อมูลวิจัย
const logStudioEvent = (type, courseId, data = {}) => {
    const uid = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : null;
    if (!uid) return Promise.resolve(null);
    // Firestore ไม่รับค่า undefined และ add() จะ throw ทันที (ก่อนถึง .catch) — ตัดทิ้งก่อน และไม่ให้ error หลุดไปถึงผู้เรียก
    const clean = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== undefined));
    try {
        return db.collection('studio_events').add({
            type, courseId: courseId || null, uid, ...clean,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1,
        }).catch(err => { console.warn('[studio] log failed', type, err.message); return null; });
    } catch (err) {
        console.warn('[studio] log failed', type, err.message);
        return Promise.resolve(null);
    }
};

// ── Hint Ladder (Phase 2) — หลักการ P, A₁ ────────────────────────────────────
// ใช้คำใบ้ที่ครูเขียนและอนุมัติแล้ว (assignment.hintLadder) ก่อนเรียก AI
// คืนข้อความคำใบ้ หรือ null ถ้าไม่ใช่กรณีของ Studio (ให้ CodingWorkspace ใช้ AI ตามเดิม)
// ไม่เรียก Gemini จึงไม่กินโควตา และใช้ได้แม้โควตาหมด (ข้อ 7.6)
const studioLadderHint = (course, assignment, level, uid) => {
    if (!isStudio(course) || !assignment || assignment.assignmentType === 'exam') return null;
    const ladder = Array.isArray(assignment.hintLadder) ? assignment.hintLadder.filter(h => (h || '').trim()) : [];
    const max = Math.min(ladder.length, (course.studio.hintPolicy && course.studio.hintPolicy.maxLevelDefault) || 4);
    if (!max || level < 1 || level > max) return null;
    const hint = ladder[level - 1];
    // บันทึกรูปแบบเดิมของ coachInteractions (prompt ≤ 500, response ≤ 1000) triggerEvent ใหม่ 'studio_ladder'
    if (uid) {
        db.collection('coachInteractions').add({
            uid, coachRole: 'socratic', triggerEvent: 'studio_ladder', relatedId: assignment.title || null,
            prompt: `title: ${assignment.title}, level: ${level}, source: hintLadder`.slice(0, 500),
            response: hint.slice(0, 1000),
            createdAt: serverTimestamp(),
        }).catch(err => console.warn('[studio] ladder log failed', err.message));
        logStudioEvent('ladder_hint', course.id, { assignmentId: assignment.id, level });
    }
    const tail = level >= max
        ? '\n\n— นี่คือคำใบ้ระดับสุดท้ายจากครู ถ้ายังติด ลองแก้โค้ดแล้วส่งอีกครั้ง จากนั้นกด 🔄 วิเคราะห์โค้ดที่ส่งล่าสุด ให้ AI ช่วยดูโค้ดของคุณ'
        : '';
    return `👩‍🏫 คำใบ้จากครู (${level}/${max})\n\n${hint}${tail}`;
};

// โจทย์นี้ควรแสดงเป็น Parsons หรือไม่
const studioUsesParsons = (course, assignment) =>
    hasFeature(course, 'parsons') && !!assignment && assignment.studioType === 'parsons'
    && !!(assignment.parsons && Array.isArray(assignment.parsons.lines) && assignment.parsons.lines.length);

// Explain-Back (Phase 3): ถามหลังผ่านโจทย์ฝึกที่ "สำคัญ" ครบทุก test case
// สำคัญ = ครูตั้ง assignment.explainBack === true หรือ (ไม่ได้ปิดไว้ และความยากไม่ใช่ "ง่าย")
const studioWantsExplainBack = (course, assignment, gradeResult) =>
    hasFeature(course, 'explainBack') && !!assignment && assignment.assignmentType !== 'exam'
    && !!gradeResult && gradeResult.score === 100
    && (assignment.explainBack === true || (assignment.explainBack !== false && assignment.difficulty !== 'ง่าย'));

// ── ส่วน "เปิดใช้ APCC Studio" ในหน้าแก้ไขรายวิชา (CourseBuilder) ─────────────
const StudioCoursePanel = ({ course, onSaved }) => {
    const cur = course.studio || null;
    const [enabled, setEnabled] = React.useState(cur ? cur.enabled === true : false);
    const [template, setTemplate] = React.useState(cur?.template || (course.language === 'python' ? 'w23207' : 'generic_python'));
    const [features, setFeatures] = React.useState(cur?.features || STUDIO_TEMPLATES[template]?.features || {});
    const [saving, setSaving] = React.useState(false);
    const [msg, setMsg] = React.useState('');

    if (isProtectedCourse(course)) {
        return (
            <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', color: '#6b7280' }}>
                🔒 <b>APCC Studio</b> — รายวิชานี้เป็นข้อมูลวิจัยของรายงาน จึงเปิดฟีเจอร์ Studio ไม่ได้
            </div>
        );
    }

    const pickTemplate = (t) => { setTemplate(t); setFeatures(STUDIO_TEMPLATES[t].features); };

    const save = async () => {
        setSaving(true); setMsg('');
        try {
            const studio = enabled
                ? { ...buildStudioConfig(template, features), enabledAt: cur?.enabledAt || serverTimestamp() }
                : { ...(cur || buildStudioConfig(template, features)), enabled: false };
            await db.collection('courses').doc(course.id).update({ studio });
            logStudioEvent(enabled ? 'studio_enable' : 'studio_disable', course.id, { template, features: studio.features });
            setMsg(enabled ? '✅ เปิดใช้ APCC Studio แล้ว' : '✅ ปิด APCC Studio แล้ว (ค่าที่ตั้งไว้ยังเก็บอยู่)');
            onSaved && onSaved(studio);
        } catch (err) { setMsg('❌ บันทึกไม่สำเร็จ: ' + err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="mt-4 p-4 rounded-xl" style={{ background: '#F3F0FF', border: '1px solid #D1C4E9' }}>
            <div className="flex items-center gap-3 mb-2">
                <input type="checkbox" id="studioEnabled" checked={enabled} onChange={e => setEnabled(e.target.checked)}
                    style={{ accentColor: '#7E57C2', width: '16px', height: '16px' }} />
                <label htmlFor="studioEnabled" className="text-sm font-bold cursor-pointer" style={{ color: '#4527A0' }}>
                    🎨 เปิดใช้ APCC Studio (v{STUDIO_VERSION})
                </label>
            </div>
            <p className="text-xs mb-3" style={{ color: '#5E35B1' }}>
                เพิ่มฟีเจอร์ ฝึก–สร้าง–แบ่งปัน ให้รายวิชานี้เท่านั้น ไม่กระทบการตรวจและคะแนนเดิม
            </p>
            {enabled && (
                <div className="space-y-3">
                    <select value={template} onChange={e => pickTemplate(e.target.value)} className="k-input" style={{ paddingLeft: '8px' }}>
                        {Object.entries(STUDIO_TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {STUDIO_FEATURES.map(([k, label, p]) => (
                            <label key={k} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={!!features[k]}
                                    onChange={e => setFeatures(f => ({ ...f, [k]: e.target.checked }))}
                                    style={{ accentColor: '#7E57C2' }} />
                                {label} <span className="text-gray-400">({p})</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
                <button type="button" onClick={save} disabled={saving} className="k-btn-outline text-sm px-3 py-1.5">
                    {saving ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า Studio'}
                </button>
                {isStudio(course) && (
                    <a href={`#/teacher/studio/templates?course=${course.id}`} className="text-sm underline" style={{ color: '#5E35B1' }}>
                        📦 นำเข้า/ส่งออกชุดโจทย์
                    </a>
                )}
                {isStudio(course) && (
                    <a href={`#/teacher/studio/gates?course=${course.id}`} className="text-sm underline" style={{ color: '#5E35B1' }}>
                        🎯 ด่านทักษะ & Explain-Back
                    </a>
                )}
                {msg && <span className="text-xs">{msg}</span>}
            </div>
        </div>
    );
};

window.isStudio = isStudio;
window.hasFeature = hasFeature;
window.isProtectedCourse = isProtectedCourse;
window.logStudioEvent = logStudioEvent;
window.StudioCoursePanel = StudioCoursePanel;
window.studioLadderHint = studioLadderHint;
window.studioUsesParsons = studioUsesParsons;
window.studioWantsExplainBack = studioWantsExplainBack;

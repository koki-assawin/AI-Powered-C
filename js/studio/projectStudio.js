/**
 * js/studio/projectStudio.js — Project Studio + Rubric (ส่วน logic ไม่มี JSX) (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: D (ออกแบบและสร้างนวัตกรรมเพื่อผู้ใช้จริง), C (ทีมและการประเมินโดยเพื่อน), A₂
 * ปัญหาที่แก้: งานโปรเจกต์เดิมไม่มีโครงให้ผู้เรียนเดินตามกระบวนการออกแบบ และครูไม่มีหลักฐานระหว่างทางไว้ประเมิน
 *
 * - ต่อยอด TeamSync เดิม: ใช้ทีมจาก projectTeams/{teamId} (ไม่ย้ายข้อมูล) โปรเจกต์ 1 ทีมต่อ 1 รายวิชา
 *   studio_projects/{courseId_teamId}  และรุ่นของเว็บแอปที่ studio_projects/{id}/versions/{vid}
 * - บอร์ด 5 ขั้น: เข้าใจผู้ใช้ → นิยามปัญหา → ออกแบบ → สร้างต้นแบบ → ทดสอบกับผู้ใช้
 * - Design Coach (Gemini) ถามนำ ไม่ทำงานแทน · ถ้า AI ใช้ไม่ได้ ใช้คำถามจากคลัง
 * - รูบริก ว23207: 5 เกณฑ์ × 4 ระดับ = 20 (เกณฑ์ 1–4 ระดับทีม, เกณฑ์ 5 รายบุคคล)
 *   AI/เกณฑ์หลักฐานช่วยร่าง ครูยืนยันก่อนบันทึกและเผยแพร่ · ส่งออก CSV สำหรับ SGS
 */

const PS_STAGES = [
    { key: 'empathize', icon: '👥', title: 'เข้าใจผู้ใช้', fields: [
        { key: 'targetUser', label: 'ผู้ใช้เป้าหมายคือใคร', type: 'text', required: true, placeholder: 'เช่น แม่ค้าสหกรณ์โรงเรียน' },
        { key: 'interviews', label: 'บันทึกการสัมภาษณ์/สังเกตผู้ใช้ (อย่างน้อย 2 คน)', type: 'list', min: 2, placeholder: 'คุยกับใคร ได้รู้อะไร' },
        { key: 'painPoints', label: 'ปัญหาหรือความลำบากที่พบ', type: 'textarea', required: true },
    ] },
    { key: 'define', icon: '🎯', title: 'นิยามปัญหา', fields: [
        { key: 'problemStatement', label: 'ข้อความปัญหา: [ผู้ใช้] ต้องการ [สิ่งที่ต้องการ] เพราะ [เหตุผล]', type: 'textarea', required: true },
        { key: 'hmw', label: 'เราจะ ... ได้อย่างไร (How might we)', type: 'text', required: true },
        { key: 'successCriteria', label: 'จะรู้ได้อย่างไรว่าแก้ปัญหาได้ (เกณฑ์ความสำเร็จ)', type: 'textarea', required: true },
    ] },
    { key: 'ideate', icon: '💡', title: 'ออกแบบ', fields: [
        { key: 'ideas', label: 'ไอเดียที่ทีมคิด (อย่างน้อย 3 ไอเดีย)', type: 'list', min: 3, placeholder: 'ไอเดีย' },
        { key: 'chosenIdea', label: 'ไอเดียที่เลือก และเหตุผล', type: 'textarea', required: true },
        { key: 'design', label: 'ออกแบบการทำงาน: รับข้อมูลอะไร ประมวลผลอย่างไร แสดงผลอะไร', type: 'textarea', required: true },
    ] },
    { key: 'prototype', icon: '🛠️', title: 'สร้างต้นแบบ', fields: [
        { key: 'colabUrl', label: 'ลิงก์ Google Colab ของทีม', type: 'url', kitOnly: 'B', required: true, placeholder: 'https://colab.research.google.com/...' },
        { key: 'prototypeNotes', label: 'ต้นแบบทำอะไรได้แล้ว และยังขาดอะไร', type: 'textarea', required: true },
    ] },
    { key: 'test', icon: '🧪', title: 'ทดสอบกับผู้ใช้', fields: [
        { key: 'round1', label: 'ทดสอบรอบที่ 1: ทดสอบกับใคร พบอะไร', type: 'textarea', required: true },
        { key: 'changes', label: 'ปรับปรุงอะไรหลังรอบที่ 1', type: 'textarea', required: true },
        { key: 'round2', label: 'ทดสอบรอบที่ 2: ผลเป็นอย่างไรเทียบกับเกณฑ์ความสำเร็จ', type: 'textarea', required: true },
    ] },
];

const PS_KITS = {
    A: 'Kit A — เว็บแอป Streamlit (รันในเบราว์เซอร์)',
    B: 'Kit B — วิเคราะห์ข้อมูลด้วย Google Colab + CSV จาก Google Forms',
};

// โค้ดตั้งต้นของ Kit A
const PS_WEBAPP_TEMPLATES = {
    coop: { label: 'ตัวช่วยคิดเงินสหกรณ์', code: `import streamlit as st

st.title("🛒 ตัวช่วยคิดเงินสหกรณ์")
menu = {"น้ำดื่ม": 7, "ขนมปัง": 10, "นมกล่อง": 12}

total = 0
for name, price in menu.items():
    qty = st.number_input(f"{name} ({price} บาท)", min_value=0, step=1)
    total = total + qty * price

st.subheader(f"รวม {total} บาท")
paid = st.number_input("รับเงินมา", min_value=0, step=1)
if st.button("คำนวณเงินทอน"):
    if paid < total:
        st.error("เงินไม่พอ")
    else:
        st.success(f"ทอน {paid - total} บาท")
` },
    survey: { label: 'สรุปความพึงพอใจของผู้ใช้', code: `import streamlit as st

st.title("😊 แบบประเมินความพึงพอใจ")
scores = []
for q in ["ใช้งานง่าย", "ช่วยแก้ปัญหาได้", "อยากใช้อีก"]:
    scores.append(st.slider(q, 1, 5, 3))

avg = sum(scores) / len(scores)
st.metric("คะแนนเฉลี่ย", f"{avg:.2f}")
if avg < 3.5:
    st.warning("ควรปรับปรุง")
else:
    st.success("พร้อมใช้งาน")
` },
    blank: { label: 'เริ่มจากหน้าว่าง', code: `import streamlit as st

st.title("นวัตกรรมของทีมเรา")
name = st.text_input("ชื่อของคุณ")
if st.button("ทักทาย"):
    st.write(f"สวัสดี {name}")
` },
};

const PS_COACH_BANK = {
    empathize: ['ผู้ใช้ของทีมเจอปัญหานี้บ่อยแค่ไหน และตอนไหน', 'ถ้าได้คุยกับผู้ใช้อีก 1 คน ทีมอยากถามคำถามอะไร', 'สิ่งที่ผู้ใช้ "พูด" กับสิ่งที่ทีม "เห็น" เขาทำ ต่างกันไหม'],
    define: ['ข้อความปัญหาของทีมพูดถึงผู้ใช้คนไหนโดยเฉพาะ', 'ถ้าแก้ปัญหานี้ได้ ผู้ใช้จะทำอะไรได้ดีขึ้น วัดได้อย่างไร', 'ปัญหานี้แคบพอที่จะทำเสร็จภายใน 5 แผนการเรียนรู้หรือไม่'],
    ideate: ['ไอเดียไหนแก้ปัญหาได้ตรงที่สุด และไอเดียไหนทำได้จริงที่สุด', 'โปรแกรมของทีมต้องรับข้อมูลอะไรจากผู้ใช้บ้าง', 'ถ้าตัดฟีเจอร์ออกให้เหลือสิ่งเดียวที่สำคัญที่สุด จะเหลืออะไร'],
    prototype: ['ฟังก์ชันหลักของต้นแบบรุ่นนี้คืออะไร ทำงานถูกแล้วหรือยัง', 'ถ้าผู้ใช้กรอกข้อมูลผิด เช่น ตัวเลขติดลบ โปรแกรมจะทำอย่างไร', 'สมาชิกแต่ละคนอธิบายโค้ดส่วนที่ตัวเองเขียนได้หรือไม่'],
    test: ['ผู้ทดสอบทำอะไรไม่ได้หรือสับสนตรงไหน', 'ผลการทดสอบผ่านเกณฑ์ความสำเร็จที่ตั้งไว้หรือยัง', 'ถ้ามีเวลาอีก 1 คาบ ทีมจะปรับปรุงอะไรก่อน เพราะอะไร'],
};

// รูบริก ว23207 (5 เกณฑ์ × 4 ระดับ = 20) เกณฑ์ c5 ประเมินรายบุคคล
const PS_DEFAULT_RUBRIC = {
    rubricId: 'w23207_project', title: 'รูบริกโปรเจกต์นวัตกรรม ว23207', maxLevel: 4,
    criteria: [
        { id: 'c1', title: 'เข้าใจปัญหาและผู้ใช้', scope: 'team', levels: ['ไม่ระบุผู้ใช้หรือปัญหาชัดเจน', 'ระบุผู้ใช้/ปัญหาจากการคาดเดา', 'มีข้อมูลจากผู้ใช้จริง แต่ปัญหายังกว้าง', 'สัมภาษณ์/สังเกตผู้ใช้จริง ≥ 2 คน ระบุปัญหาชัดพร้อมหลักฐาน'] },
        { id: 'c2', title: 'แนวทางแก้ปัญหา', scope: 'team', levels: ['ไม่มีแนวทางที่ชัดเจน', 'มีไอเดียเดียว ไม่ได้เปรียบเทียบ', 'เลือกไอเดียพร้อมเหตุผล แต่ออกแบบการทำงานไม่ครบ', 'ไอเดียหลากหลาย เลือกพร้อมเหตุผล ออกแบบ รับ–ประมวลผล–แสดงผล ชัดเจน'] },
        { id: 'c3', title: 'การทำงานของโปรแกรม', scope: 'team', levels: ['โปรแกรมรันไม่ได้', 'ทำงานได้บางส่วน', 'ทำงานได้ครบ แต่มีข้อผิดพลาดเล็กน้อย', 'ทำงานถูกต้องครบฟังก์ชันหลัก รองรับข้อมูลผิด ใช้งานง่าย'] },
        { id: 'c4', title: 'การทดสอบและปรับปรุง', scope: 'team', levels: ['ไม่ได้ทดสอบกับผู้ใช้', 'ทดสอบ 1 รอบ', 'ทดสอบ 2 รอบ แต่ปรับปรุงน้อย', 'ทดสอบกับผู้ใช้ 2 รอบ ปรับปรุงตามผลพร้อมหลักฐาน'] },
        { id: 'c5', title: 'ความเข้าใจโค้ดรายบุคคล', scope: 'individual', levels: ['อธิบายโค้ดไม่ได้', 'อธิบายได้บางส่วน', 'อธิบายโค้ดส่วนที่ตนทำได้ถูกต้อง', 'อธิบายโค้ดส่วนที่ตนทำและส่วนอื่นของทีมได้ถูกต้อง'] },
    ],
};

const psProjectId = (courseId, teamId) => `${courseId}_${teamId}`;
const _psFilled = (v) => typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.some(x => (x || '').trim()) : !!v;
const _psListCount = (v) => (Array.isArray(v) ? v.filter(x => (x || '').trim()).length : 0);

// ขั้นนี้ครบหรือยัง
const psStageDone = (project, stageKey) => {
    const st = PS_STAGES.find(s => s.key === stageKey);
    const data = (project && project.data && project.data[stageKey]) || {};
    const kit = (project && project.kit) || 'A';
    const ok = st.fields.every(f => {
        if (f.kitOnly && f.kitOnly !== kit) return true;
        if (f.type === 'list') return _psListCount(data[f.key]) >= (f.min || 1);
        return !f.required || _psFilled(data[f.key]);
    });
    if (stageKey === 'prototype' && kit === 'A') return ok && (project.versionCount || 0) >= 1;
    return ok;
};
const psProgress = (project) => PS_STAGES.map(s => ({ key: s.key, done: psStageDone(project, s.key) }));

// ฝั่งนักเรียน: ปลดล็อกขั้นสร้างหรือยัง (คำนวณใหม่จาก submissions จริงทุกครั้ง ไม่เชื่อค่าใน studio_progress)
const psCheckUnlocked = async (course, uid) => {
    if (!hasFeature(course, 'skillGate')) return { unlocked: true, progress: null };
    const { progress } = await sgRefreshMyProgress(course, uid);
    return { unlocked: progress.createUnlocked, progress };
};

const psLoadMyTeam = async (uid) => {
    const ps = await db.collection('playerStats').doc(uid).get();
    const teamId = ps.exists ? ps.data().teamId : null;
    if (!teamId) return null;
    const t = await db.collection('projectTeams').doc(teamId).get();
    if (!t.exists || !(t.data().members || []).includes(uid)) return null;
    return { id: t.id, ...t.data() };
};

const psLoadProject = async (courseId, teamId) => {
    const s = await db.collection('studio_projects').doc(psProjectId(courseId, teamId)).get();
    return s.exists ? { id: s.id, ...s.data() } : null;
};

const psCreateProject = async (course, team, uid, title) => {
    const id = psProjectId(course.id, team.id);
    const doc = {
        courseId: course.id, teamId: team.id, teamName: team.name || team.id,
        members: team.members || [uid], memberNames: team.memberNames || {},
        title: (title || '').trim() || `โปรเจกต์ของทีม ${team.name || team.id}`,
        kit: 'A', data: {}, versionCount: 0, latestVersionId: null,
        createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1,
    };
    await db.collection('studio_projects').doc(id).set(doc);
    logStudioEvent('project_create', course.id, { projectId: id, teamId: team.id });
    return { id, ...doc };
};

const psSaveStage = async (project, stageKey, values, team, extra = {}) => {
    const next = { ...project, ...extra, data: { ...(project.data || {}), [stageKey]: values } };
    const patch = {
        [`data.${stageKey}`]: values, ...extra, updatedAt: serverTimestamp(),
        ...(team ? { members: team.members || project.members, memberNames: team.memberNames || project.memberNames, teamName: team.name || project.teamName } : {}),
    };
    await db.collection('studio_projects').doc(project.id).update(patch);
    logStudioEvent('project_stage_save', project.courseId, { projectId: project.id, stage: stageKey, done: psStageDone(next, stageKey) });
    return next;
};

const psSaveVersion = async (project, code, note, uid) => {
    const ref = await db.collection('studio_projects').doc(project.id).collection('versions').add({
        code: (code || '').slice(0, 50000), note: (note || '').slice(0, 300), kit: 'A',
        createdBy: uid, createdAt: serverTimestamp(), schemaVersion: 1,
    });
    await db.collection('studio_projects').doc(project.id).update({
        versionCount: firebase.firestore.FieldValue.increment(1), latestVersionId: ref.id, updatedAt: serverTimestamp(),
    });
    logStudioEvent('webapp_version', project.courseId, { projectId: project.id, versionId: ref.id, size: (code || '').length });
    return ref.id;
};

const psLoadVersions = async (projectId) => {
    const s = await db.collection('studio_projects').doc(projectId).collection('versions').get();
    return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

// Design Coach: ถามนำ 2–3 ข้อ ไม่ทำงานแทน (AI Hint Protocol) — ถ้า AI ใช้ไม่ได้ ใช้คลังคำถาม
const psDesignCoach = async (project, stageKey, uid) => {
    const st = PS_STAGES.find(s => s.key === stageKey);
    const data = (project.data && project.data[stageKey]) || {};
    let text, source = 'ai';
    try {
        const prompt = `คุณคือ Design Coach ของนักเรียน ม.3 ที่กำลังทำโปรเจกต์นวัตกรรมดิจิทัลด้วยกระบวนการคิดเชิงออกแบบ
ขั้นปัจจุบัน: ${st.title}
ข้อมูลที่ทีมกรอก: ${JSON.stringify(data).slice(0, 1500)}
กติกา: ห้ามคิดคำตอบแทน ห้ามเขียนโค้ดให้ ตั้งคำถามชวนคิด 2–3 ข้อ ภาษาไทยสั้น ๆ ที่ช่วยให้ทีมทำขั้นนี้ได้ลึกขึ้น
ถ้าข้อมูลยังว่าง ให้ถามคำถามเริ่มต้นของขั้นนี้ ตอบเป็นรายการขึ้นต้นด้วย "• "`;
        text = String(await callGeminiApi(prompt)).trim();
        if (!text) throw new Error('empty');
    } catch (err) {
        source = 'bank';
        text = PS_COACH_BANK[stageKey].map(q => `• ${q}`).join('\n');
    }
    if (uid) {
        db.collection('coachInteractions').add({
            uid, coachRole: 'design', triggerEvent: `studio_design_${stageKey}`, relatedId: project.id,
            prompt: `stage: ${stageKey}, source: ${source}`.slice(0, 500), response: text.slice(0, 1000), createdAt: serverTimestamp(),
        }).catch(() => {});
    }
    return { text, source };
};

const psLoadRubric = async (course) => {
    const id = (course.studio && course.studio.template === 'w23207') ? 'w23207_project' : `${course.id}_project`;
    try {
        const s = await db.collection('studio_rubrics').doc(id).get();
        if (s.exists) return { ...PS_DEFAULT_RUBRIC, ...s.data() };
    } catch (_) { /* ใช้ค่าเริ่มต้น */ }
    return PS_DEFAULT_RUBRIC;
};

// ร่างคะแนนจากหลักฐานในระบบ (ไม่ใช้ AI) — ใช้เมื่อ AI ใช้ไม่ได้ และใช้กับเกณฑ์ c5 เสมอ
const psRuleDraft = (project, ebByUid) => {
    const d = project.data || {};
    const e = d.empathize || {}, df = d.define || {}, id = d.ideate || {}, t = d.test || {};
    const lvl = (full, part) => full ? 3 : part ? 2 : 1;
    const team = {
        c1: { level: lvl(_psListCount(e.interviews) >= 2 && _psFilled(e.targetUser) && _psFilled(e.painPoints), _psFilled(e.targetUser) || _psFilled(e.painPoints)),
              comment: `สัมภาษณ์/สังเกตผู้ใช้ ${_psListCount(e.interviews)} รายการ` },
        c2: { level: lvl(psStageDone(project, 'define') && psStageDone(project, 'ideate'), _psFilled(df.problemStatement) || _psListCount(id.ideas) > 0),
              comment: `ไอเดีย ${_psListCount(id.ideas)} ไอเดีย${_psFilled(id.chosenIdea) ? ' เลือกพร้อมเหตุผล' : ''}` },
        c3: { level: project.kit === 'B' ? lvl(psStageDone(project, 'prototype'), _psFilled((d.prototype || {}).prototypeNotes)) : lvl((project.versionCount || 0) >= 3 && psStageDone(project, 'prototype'), (project.versionCount || 0) >= 1),
              comment: project.kit === 'B' ? 'Kit B — ครูตรวจจากลิงก์ Colab' : `บันทึกต้นแบบ ${project.versionCount || 0} รุ่น` },
        c4: { level: lvl(_psFilled(t.round1) && _psFilled(t.changes) && _psFilled(t.round2), _psFilled(t.round1)),
              comment: `ทดสอบ ${[t.round1, t.round2].filter(_psFilled).length} รอบ${_psFilled(t.changes) ? ' มีการปรับปรุง' : ''}` },
    };
    const individual = {};
    (project.members || []).forEach(uid => {
        const list = (ebByUid && ebByUid[uid]) || [];
        if (!list.length) { individual[uid] = { level: null, comment: 'ยังไม่มีข้อมูล Explain-Back — ครูประเมินจากการสัมภาษณ์' }; return; }
        const vals = list.map(x => x.mode === 'predict' ? (x.predictCorrect ? 3 : 1) : (x.aiLevel || 0));
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        individual[uid] = { level: avg >= 2.5 ? 4 : avg >= 1.75 ? 3 : avg >= 1 ? 2 : 1, comment: `Explain-Back ${list.length} ครั้ง เฉลี่ย ${avg.toFixed(2)}/3` };
    });
    return { team, individual, source: 'rule' };
};

// AI ร่างความเห็นเกณฑ์ c1–c4 จากหลักฐาน · ถ้าใช้ไม่ได้คืนร่างจากเกณฑ์หลักฐาน · c5 ใช้หลักฐาน Explain-Back เสมอ
const psAiDraftReview = async (project, rubric, ebByUid) => {
    const rule = psRuleDraft(project, ebByUid);
    try {
        const crit = rubric.criteria.filter(c => c.scope === 'team');
        const prompt = `คุณเป็นผู้ช่วยครูประเมินโปรเจกต์นวัตกรรมดิจิทัลระดับ ม.3 ตามรูบริก ร่างความเห็นจากหลักฐานเท่านั้น ครูจะตรวจและแก้ก่อนใช้
รูบริก (ระดับ 1–4): ${JSON.stringify(crit.map(c => ({ id: c.id, title: c.title, levels: c.levels })))}
หลักฐานของทีม: ${JSON.stringify({ title: project.title, kit: project.kit, data: project.data, versionCount: project.versionCount }).slice(0, 4000)}
ตอบ JSON: { "c1": {"level": 1-4, "comment": "ภาษาไทย 1-2 ประโยค อ้างหลักฐาน"}, "c2": ..., "c3": ..., "c4": ... }`;
        const schema = { type: 'OBJECT', properties: Object.fromEntries(crit.map(c => [c.id, { type: 'OBJECT', properties: { level: { type: 'INTEGER' }, comment: { type: 'STRING' } }, required: ['level', 'comment'] }])) };
        const ai = await callGeminiApi(prompt, schema);
        const team = {};
        crit.forEach(c => {
            const x = ai && ai[c.id];
            team[c.id] = x ? { level: Math.max(1, Math.min(4, parseInt(x.level, 10) || 1)), comment: String(x.comment || '').slice(0, 400) } : rule.team[c.id];
        });
        return { team, individual: rule.individual, source: 'ai' };
    } catch (err) {
        return rule;
    }
};

const psReviewId = (projectId, type, uid) => type === 'teacher' ? `${projectId}_teacher` : `${projectId}_peer_${uid}`;

const psSaveTeacherReview = async (project, review, uid) => {
    const id = psReviewId(project.id, 'teacher');
    const total = {};
    (project.members || []).forEach(m => {
        const t = ['c1', 'c2', 'c3', 'c4'].reduce((s, c) => s + (Number(review.team[c] && review.team[c].level) || 0), 0);
        total[m] = t + (Number(review.individual[m] && review.individual[m].level) || 0);
    });
    await db.collection('studio_reviews').doc(id).set({
        projectId: project.id, courseId: project.courseId, reviewerType: 'teacher', reviewerUid: uid,
        team: review.team, individual: review.individual, totalByMember: total,
        aiDraftSource: review.aiDraftSource || null, published: !!review.published,
        createdAt: review.createdAt || serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1,
    });
    logStudioEvent('review_submit', project.courseId, { projectId: project.id, reviewerType: 'teacher', published: !!review.published, aiDraftSource: review.aiDraftSource || null });
    return total;
};

const psSavePeerReview = async (project, uid, team, comment) => {
    await db.collection('studio_reviews').doc(psReviewId(project.id, 'peer', uid)).set({
        projectId: project.id, courseId: project.courseId, reviewerType: 'peer', reviewerUid: uid,
        team, comment: (comment || '').slice(0, 1000),
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1,
    });
    logStudioEvent('review_submit', project.courseId, { projectId: project.id, reviewerType: 'peer' });
};

const _psCsvCell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV สำหรับ SGS: 1 แถวต่อนักเรียน (ใช้ BOM ให้ Excel อ่านภาษาไทยได้)
const psBuildCsv = (rubric, projects, reviewsByProject, users) => {
    const head = ['ห้อง', 'เลขที่', 'รหัสนักเรียน', 'ชื่อ', 'ทีม', 'โปรเจกต์', ...rubric.criteria.map(c => `${c.id} ${c.title}`), `รวม (${rubric.criteria.length * rubric.maxLevel})`, 'สถานะ'];
    const rows = [];
    projects.forEach(p => {
        const r = reviewsByProject[p.id];
        (p.members || []).forEach(uid => {
            const u = users[uid] || {};
            const lv = rubric.criteria.map(c => {
                const x = c.scope === 'team' ? (r && r.team && r.team[c.id]) : (r && r.individual && r.individual[uid]);
                return x && x.level != null ? x.level : '';
            });
            rows.push([
                `${u.grade || ''}/${u.room || ''}`.replace(/^\/$/, ''), u.number || '', u.studentCode || '', u.displayName || uid,
                p.teamName || p.teamId, p.title, ...lv,
                r ? (r.totalByMember && r.totalByMember[uid] != null ? r.totalByMember[uid] : '') : '',
                r ? (r.published ? 'เผยแพร่แล้ว' : 'ร่าง') : 'ยังไม่ประเมิน',
            ]);
        });
    });
    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || (Number(a[1]) || 0) - (Number(b[1]) || 0));
    return '﻿' + [head, ...rows].map(r => r.map(_psCsvCell).join(',')).join('\r\n') + '\r\n';
};

Object.assign(window, {
    PS_STAGES, PS_KITS, PS_WEBAPP_TEMPLATES, PS_COACH_BANK, PS_DEFAULT_RUBRIC,
    psProjectId, psStageDone, psProgress, psCheckUnlocked, psLoadMyTeam, psLoadProject, psCreateProject,
    psSaveStage, psSaveVersion, psLoadVersions, psDesignCoach, psLoadRubric, psRuleDraft, psAiDraftReview,
    psReviewId, psSaveTeacherReview, psSavePeerReview, psBuildCsv,
});

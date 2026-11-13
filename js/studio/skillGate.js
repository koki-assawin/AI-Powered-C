/**
 * js/studio/skillGate.js — ด่านทักษะ (Skill Gate) และขั้น ฝึก–สร้าง–แบ่งปัน (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: P (คิดก่อนเขียน — ฝึกพื้นฐานให้มั่นคงก่อนสร้างผลงาน), D
 * ปัญหาที่แก้: ผู้เรียนเริ่มทำโปรเจกต์ทั้งที่ยังเขียนเงื่อนไข/ลูปไม่ได้ จึงพึ่ง AI สร้างโค้ดแทน
 *
 * - ด่าน = กลุ่ม skillTag ต้องผ่านโจทย์ฝึก (ที่เผยแพร่แล้ว ไม่รวมข้อสอบ) อย่างน้อย minRatio ของจำนวนข้อ
 *   "ผ่าน" = คะแนนดีที่สุดของข้อนั้น ≥ passScore (ค่าเริ่มต้น 100 = ผ่านทุก test case)
 * - คำนวณจาก submissions เดิมแบบอ่านอย่างเดียว แล้วเขียนผลลง studio_progress/{courseId_uid}
 * - ผ่านด่านที่บังคับครบ ⇒ ปลดล็อกขั้น "สร้าง" (Project Studio ใน Phase 4)
 *
 * ไม่มี JSX ทดสอบด้วย Node ได้
 */

const SG_DEFAULT_GATES = {
    w23207: [
        { gateId: 'g1', name: 'ด่าน 1 ลำดับ ตัวแปร และการรับ-แสดงผล', skillTags: ['io'] },
        { gateId: 'g2', name: 'ด่าน 2 การตัดสินใจ',                   skillTags: ['condition'] },
        { gateId: 'g3', name: 'ด่าน 3 การทำซ้ำ',                      skillTags: ['loop'] },
        { gateId: 'g4', name: 'ด่าน 4 ลิสต์และฟังก์ชัน',               skillTags: ['list', 'function'] },
    ],
    w23103_ch2: [
        { gateId: 'g1', name: 'ด่าน 1 ตัวแปร การรับ-แสดงผล และเงื่อนไข', skillTags: ['condition'] },
        { gateId: 'g2', name: 'ด่าน 2 ฟังก์ชัน',                        skillTags: ['function'] },
    ],
};
const SG_GATE_DEFAULTS = { minRatio: 0.6, passScore: 100, required: true };
const SG_STAGE_LABEL = { practice: 'ฝึก', create: 'สร้าง', share: 'แบ่งปัน' };

const sgNormalizeGate = (g, i) => ({
    ...SG_GATE_DEFAULTS, ...g,
    gateId: g.gateId || `g${i + 1}`,
    order: g.order != null ? g.order : i + 1,
    skillTags: (g.skillTags || []).map(t => String(t).trim()).filter(Boolean),
    minRatio: Math.min(1, Math.max(0.1, Number(g.minRatio != null ? g.minRatio : SG_GATE_DEFAULTS.minRatio))),
    passScore: Math.min(100, Math.max(1, Number(g.passScore != null ? g.passScore : SG_GATE_DEFAULTS.passScore))),
});

const sgDefaultGates = (course) =>
    (SG_DEFAULT_GATES[(course && course.studio && course.studio.template) || ''] || []).map(sgNormalizeGate);

// ด่านของรายวิชา: ที่ครูตั้งไว้ใน studio_skillGates ถ้าไม่มีใช้ค่าเริ่มต้นของ template
const sgLoadGates = async (course) => {
    const snap = await db.collection('studio_skillGates').where('courseId', '==', course.id).get();
    if (snap.empty) return { gates: sgDefaultGates(course), source: 'template' };
    const gates = snap.docs.map(d => d.data()).sort((a, b) => (a.order || 0) - (b.order || 0)).map(sgNormalizeGate);
    return { gates, source: 'teacher' };
};

const sgSaveGates = async (course, gates) => {
    const old = await db.collection('studio_skillGates').where('courseId', '==', course.id).get();
    const keep = new Set();
    const batch = db.batch();
    gates.map(sgNormalizeGate).forEach((g, i) => {
        const id = `${course.id}_${g.gateId}`;
        keep.add(id);
        batch.set(db.collection('studio_skillGates').doc(id), {
            courseId: course.id, gateId: g.gateId, order: i + 1, name: g.name, skillTags: g.skillTags,
            minRatio: g.minRatio, passScore: g.passScore, required: g.required !== false,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1,
        });
    });
    old.docs.forEach(d => { if (!keep.has(d.id)) batch.delete(d.ref); });
    await batch.commit();
    logStudioEvent('gates_saved', course.id, { gates: gates.map(g => g.gateId) });
};

// คะแนนดีที่สุดของแต่ละโจทย์ จาก submissions
const sgBestScores = (submissions) => {
    const best = {};
    (submissions || []).forEach(s => {
        if (!s || !s.assignmentId) return;
        const sc = Number(s.score) || 0;
        if (best[s.assignmentId] == null || sc > best[s.assignmentId]) best[s.assignmentId] = sc;
    });
    return best;
};

// คำนวณสถานะด่านของนักเรียน 1 คน (ฟังก์ชันบริสุทธิ์)
const sgComputeProgress = (gates, assignments, bestScores, prevStage) => {
    const practice = (assignments || []).filter(a => a.isPublished !== false && a.assignmentType !== 'exam');
    const gateStatus = gates.map(g => {
        const probs = practice.filter(a => a.skillTag && g.skillTags.includes(a.skillTag));
        const passedIds = probs.filter(a => (bestScores[a.id] || 0) >= g.passScore).map(a => a.id);
        const need = probs.length ? Math.max(1, Math.ceil(probs.length * g.minRatio)) : 0;
        return {
            gateId: g.gateId, name: g.name, required: g.required !== false,
            total: probs.length, passed: passedIds.length, need,
            done: probs.length > 0 && passedIds.length >= need,
        };
    });
    const required = gateStatus.filter(g => g.required);
    const createUnlocked = required.length > 0 && required.every(g => g.done);
    const stage = !createUnlocked ? 'practice' : (prevStage === 'share' ? 'share' : 'create');
    const nextGate = gateStatus.find(g => g.required && !g.done) || null;
    return { gates: gateStatus, createUnlocked, stage, nextGateId: nextGate ? nextGate.gateId : null };
};

const sgProgressId = (courseId, uid) => `${courseId}_${uid}`;

// ฝั่งนักเรียน: อ่านโจทย์ที่เผยแพร่ + submissions ของตนเอง → คำนวณ → บันทึกเมื่อสถานะเปลี่ยน
const sgRefreshMyProgress = async (course, uid) => {
    const [{ gates }, aSnap, sSnap, pSnap] = await Promise.all([
        sgLoadGates(course),
        db.collection('assignments').where('courseId', '==', course.id).where('isPublished', '==', true).get(),
        db.collection('submissions').where('studentId', '==', uid).where('courseId', '==', course.id).get(),
        db.collection('studio_progress').doc(sgProgressId(course.id, uid)).get(),
    ]);
    const prev = pSnap.exists ? pSnap.data() : null;
    const progress = sgComputeProgress(
        gates,
        aSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        sgBestScores(sSnap.docs.map(d => d.data())),
        prev && prev.stage,
    );
    await sgSaveProgress(course.id, uid, progress, prev);
    return { gates, progress };
};

const sgSaveProgress = async (courseId, uid, progress, prev) => {
    const sig = (p) => JSON.stringify({ s: p.stage, g: (p.gates || []).map(g => [g.gateId, g.done, g.passed, g.total]) });
    if (prev && sig(prev) === sig(progress)) return false;
    const prevDone = new Set(((prev && prev.gates) || []).filter(g => g.done).map(g => g.gateId));
    // เขียนสถานะและ event ใน batch เดียว — ถ้าผู้เรียนออกจากหน้ากลางคัน event จะไม่หายโดยที่สถานะถูกบันทึกไปแล้ว
    const batch = db.batch();
    batch.set(db.collection('studio_progress').doc(sgProgressId(courseId, uid)), {
        courseId, uid,
        gates: progress.gates, stage: progress.stage, createUnlocked: progress.createUnlocked,
        updatedAt: serverTimestamp(), createdAt: (prev && prev.createdAt) || serverTimestamp(), schemaVersion: 1,
    });
    const ev = (type, data) => batch.set(db.collection('studio_events').doc(), {
        type, courseId, uid, ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1,
    });
    progress.gates.filter(g => g.done && !prevDone.has(g.gateId))
        .forEach(g => ev('gate_pass', { gateId: g.gateId, passed: g.passed, total: g.total }));
    if (progress.createUnlocked && !(prev && prev.createUnlocked)) ev('stage_unlock', { stage: 'create' });
    await batch.commit();
    return true;
};

// ฝั่งครู: คำนวณทั้งห้องจาก submissions ของรายวิชา (อ่านอย่างเดียว ไม่เขียน studio_progress)
const sgComputeClass = async (course) => {
    const [{ gates }, aSnap, sSnap, eSnap, pSnap] = await Promise.all([
        sgLoadGates(course),
        db.collection('assignments').where('courseId', '==', course.id).get(),
        db.collection('submissions').where('courseId', '==', course.id).get(),
        db.collection('enrollments').where('courseId', '==', course.id).get(),
        db.collection('studio_progress').where('courseId', '==', course.id).get(),
    ]);
    const assignments = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const byStudent = {};
    sSnap.docs.forEach(d => { const s = d.data(); (byStudent[s.studentId] = byStudent[s.studentId] || []).push(s); });
    const prevStage = {};
    pSnap.docs.forEach(d => { prevStage[d.data().uid] = d.data().stage; });
    const uids = [...new Set(eSnap.docs.map(d => d.data().studentId))];
    const users = {};
    await Promise.all(uids.map(u => db.collection('users').doc(u).get().then(s => { if (s.exists) users[u] = s.data(); }).catch(() => {})));
    const rows = uids.map(uid => ({
        uid,
        name: (users[uid] && users[uid].displayName) || uid,
        studentCode: (users[uid] && users[uid].studentCode) || '',
        room: users[uid] ? `${users[uid].grade || ''}/${users[uid].room || ''}`.replace(/^\/$/, '') : '',
        number: Number((users[uid] && users[uid].number) || 0),
        ...sgComputeProgress(gates, assignments, sgBestScores(byStudent[uid]), prevStage[uid]),
    })).sort((a, b) => (a.room || '').localeCompare(b.room || '') || a.number - b.number || a.name.localeCompare(b.name, 'th'));
    const problemCount = gates.map(g => assignments.filter(a => a.isPublished !== false && a.assignmentType !== 'exam' && a.skillTag && g.skillTags.includes(a.skillTag)).length);
    return { gates, rows, problemCount, assignments };
};

Object.assign(window, {
    SG_DEFAULT_GATES, SG_STAGE_LABEL, sgNormalizeGate, sgDefaultGates, sgLoadGates, sgSaveGates,
    sgBestScores, sgComputeProgress, sgProgressId, sgRefreshMyProgress, sgSaveProgress, sgComputeClass,
});

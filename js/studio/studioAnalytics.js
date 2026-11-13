/**
 * js/studio/studioAnalytics.js — Process Analytics + Showcase/Portfolio (ส่วน logic ไม่มี JSX) (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: ทุกข้อ — สรุปหลักฐานกระบวนการเรียนรู้ของ Studio ให้ครูใช้ปรับการสอนและเขียนรายงาน
 * ปัญหาที่แก้: ข้อมูล Studio กระจายหลายคอลเลกชัน ครูต้องรวมเองด้วยสคริปต์
 *
 * - อ่านอย่างเดียว ไม่เขียนข้อมูลใดๆ ยกเว้นการอนุมัติขึ้นแกลเลอรี (studio_showcase) โดยครู
 * - ด่านทักษะคำนวณสดจาก submissions (ไม่นับ event gate_pass ซึ่งอาจซ้ำได้)
 * - ส่งออก CSV ใช้รหัส S01, S02, ... แทนชื่อ ตามแนวปฏิบัติปกปิดตัวตนเดิมของงานวิจัย
 */

const _saAvg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const _saRound = (v, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

// รวมข้อมูลทั้งรายวิชา (ฟังก์ชันบริสุทธิ์)
// input: { gates, assignments, submissions, students:[{uid,name,studentCode,room,number}], progressStage:{uid:stage},
//          explainBack:[], events:[], ladder:[], projects:[], reviews:[] }
const saAggregate = (input) => {
    const { gates, assignments, submissions, students } = input;
    const asgById = Object.fromEntries((assignments || []).map(a => [a.id, a]));
    const titleToId = Object.fromEntries((assignments || []).map(a => [a.title, a.id]));
    const subsBy = {};
    (submissions || []).forEach(s => { (subsBy[s.studentId] = subsBy[s.studentId] || []).push(s); });
    const ebBy = {}; (input.explainBack || []).forEach(e => { (ebBy[e.uid] = ebBy[e.uid] || []).push(e); });
    const ladderBy = {}; (input.ladder || []).forEach(c => { if (titleToId[c.relatedId]) (ladderBy[c.uid] = ladderBy[c.uid] || []).push(c); });
    const parsonsBy = {}; (input.events || []).filter(e => e.type === 'parsons_attempt').forEach(e => { (parsonsBy[e.uid] = parsonsBy[e.uid] || []).push(e); });
    const projectOf = {}; (input.projects || []).forEach(p => (p.members || []).forEach(u => { projectOf[u] = p; }));
    const teacherReview = {}; (input.reviews || []).filter(r => r.reviewerType === 'teacher').forEach(r => { teacherReview[r.projectId] = r; });

    // เรียงนักเรียนแล้วให้รหัส S01, S02, ...
    const ordered = [...(students || [])].sort((a, b) => (a.room || '').localeCompare(b.room || '') || (Number(a.number) || 0) - (Number(b.number) || 0) || (a.name || '').localeCompare(b.name || '', 'th'));
    const rows = ordered.map((st, i) => {
        const subs = subsBy[st.uid] || [];
        const prog = sgComputeProgress(gates, assignments, sgBestScores(subs), input.progressStage && input.progressStage[st.uid]);
        const times = subs.map(s => Number(s.timeSpentSeconds)).filter(v => v > 0);
        const eb = ebBy[st.uid] || [];
        const ebExplain = eb.filter(e => e.mode === 'explain' && e.aiLevel != null);
        const ebPredict = eb.filter(e => e.mode === 'predict');
        const pa = parsonsBy[st.uid] || [];
        const proj = projectOf[st.uid];
        const rv = proj && teacherReview[proj.id];
        return {
            anonId: `S${String(i + 1).padStart(2, '0')}`, uid: st.uid, name: st.name, studentCode: st.studentCode, room: st.room, number: st.number,
            gatesPassed: prog.gates.filter(g => g.done).length, gates: prog.gates, stage: prog.stage, createUnlocked: prog.createUnlocked,
            submissions: subs.length, solved: Object.values(sgBestScores(subs)).filter(v => v >= 100).length,
            avgTimeSec: _saRound(_saAvg(times), 0),
            avgHintLevel: _saRound(_saAvg(subs.map(s => Number(s.hintLevelUsed)).filter(v => !isNaN(v)))),
            ladderHints: (ladderBy[st.uid] || []).length,
            parsonsAttempts: pa.length, parsonsSolved: new Set(pa.filter(e => e.correct).map(e => e.assignmentId)).size,
            ebCount: eb.length, ebAvgLevel: _saRound(_saAvg(ebExplain.map(e => e.aiLevel))),
            ebPredictCorrect: ebPredict.filter(e => e.predictCorrect).length, ebPredictTotal: ebPredict.length,
            projectId: proj ? proj.id : null, projectStages: proj ? psProgress(proj).filter(x => x.done).length : 0,
            rubricTotal: rv && rv.totalByMember ? rv.totalByMember[st.uid] : null, rubricPublished: !!(rv && rv.published),
        };
    });
    const n = rows.length || 1;
    const gateStats = gates.map((g, gi) => {
        const probs = (assignments || []).filter(a => a.isPublished !== false && a.assignmentType !== 'exam' && a.skillTag && g.skillTags.includes(a.skillTag)).map(a => a.id);
        const times = [];
        (submissions || []).forEach(s => { if (probs.includes(s.assignmentId) && Number(s.timeSpentSeconds) > 0) times.push(Number(s.timeSpentSeconds)); });
        const hints = (submissions || []).filter(s => probs.includes(s.assignmentId)).map(s => Number(s.hintLevelUsed)).filter(v => !isNaN(v));
        return {
            gateId: g.gateId, name: g.name, problems: probs.length,
            passed: rows.filter(r => r.gates[gi] && r.gates[gi].done).length,
            passRate: _saRound(rows.filter(r => r.gates[gi] && r.gates[gi].done).length / n * 100, 1),
            avgTimeSec: _saRound(_saAvg(times), 0), avgHintLevel: _saRound(_saAvg(hints)),
        };
    });
    const ebAll = (input.explainBack || []);
    const ebLevels = [0, 1, 2, 3].map(l => ebAll.filter(e => e.mode === 'explain' && e.aiLevel === l).length);
    const projects = input.projects || [];
    const summary = {
        students: rows.length,
        createUnlocked: rows.filter(r => r.createUnlocked).length,
        shareStage: rows.filter(r => r.stage === 'share').length,
        projects: projects.length,
        avgProjectStages: _saRound(_saAvg(projects.map(p => psProgress(p).filter(x => x.done).length)), 1),
        webappVersions: projects.reduce((s, p) => s + (p.versionCount || 0), 0),
        explainBack: ebAll.length, ebLevels,
        ebPredictCorrect: ebAll.filter(e => e.mode === 'predict' && e.predictCorrect).length,
        ebPredictTotal: ebAll.filter(e => e.mode === 'predict').length,
        ebFallback: ebAll.filter(e => e.aiStatus === 'fallback').length,
        ladderHints: rows.reduce((s, r) => s + r.ladderHints, 0),
        parsonsAttempts: rows.reduce((s, r) => s + r.parsonsAttempts, 0),
        reviewsPublished: Object.values(teacherReview).filter(r => r.published).length,
        peerReviews: (input.reviews || []).filter(r => r.reviewerType === 'peer').length,
    };
    return { rows, gateStats, summary, asgById };
};

// CSV ปกปิดตัวตน (ไม่มีชื่อ/รหัสนักเรียน/uid)
const saBuildCsv = (agg) => {
    const gateNames = agg.gateStats.map(g => g.name);
    const head = ['รหัส', ...gateNames.map(n => `ผ่าน: ${n}`), 'ขั้น', 'ส่งงาน (ครั้ง)', 'ผ่านครบ (ข้อ)', 'เวลาเฉลี่ย/ครั้ง (วินาที)', 'ระดับคำใบ้เฉลี่ย',
        'คำใบ้จากครู (ครั้ง)', 'Parsons (ครั้ง)', 'Parsons ถูก (ข้อ)', 'Explain-Back (ครั้ง)', 'ระดับความเข้าใจเฉลี่ย', 'ทำนายถูก/ทั้งหมด', 'ขั้นโปรเจกต์ที่ครบ', 'คะแนนรูบริก'];
    const cell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = agg.rows.map(r => [
        r.anonId, ...r.gates.map(g => (g.done ? 1 : 0)), SG_STAGE_LABEL[r.stage] || r.stage, r.submissions, r.solved, r.avgTimeSec, r.avgHintLevel,
        r.ladderHints, r.parsonsAttempts, r.parsonsSolved, r.ebCount, r.ebAvgLevel, `${r.ebPredictCorrect}/${r.ebPredictTotal}`, r.projectStages,
        r.rubricPublished ? r.rubricTotal : '',
    ].map(cell).join(','));
    return '﻿' + [head.map(cell).join(','), ...lines].join('\r\n') + '\r\n';
};

// โหลดข้อมูลทั้งหมดของรายวิชา (ครู) แล้วรวม
const saLoadCourse = async (course) => {
    const q = (col, f = 'courseId') => db.collection(col).where(f, '==', course.id).get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
    const [{ gates }, assignments, submissions, enrollments, progress, explainBack, events, projects, reviews, ladderSnap] = await Promise.all([
        sgLoadGates(course), q('assignments'), q('submissions'), q('enrollments'), q('studio_progress'),
        q('studio_explainBack'), q('studio_events'), q('studio_projects'), q('studio_reviews'),
        db.collection('coachInteractions').where('triggerEvent', '==', 'studio_ladder').get(),
    ]);
    const uids = [...new Set(enrollments.map(e => e.studentId))];
    const users = {};
    await Promise.all(uids.map(u => db.collection('users').doc(u).get().then(s => { if (s.exists) users[u] = s.data(); }).catch(() => {})));
    const students = uids.map(uid => ({
        uid, name: (users[uid] && users[uid].displayName) || uid, studentCode: (users[uid] && users[uid].studentCode) || '',
        room: users[uid] ? `${users[uid].grade || ''}/${users[uid].room || ''}`.replace(/^\/$/, '') : '', number: (users[uid] && users[uid].number) || '',
    }));
    const progressStage = Object.fromEntries(progress.map(p => [p.uid, p.stage]));
    return saAggregate({ gates, assignments, submissions, students, progressStage, explainBack, events, projects, reviews, ladder: ladderSnap.docs.map(d => d.data()) });
};

// ── Showcase ─────────────────────────────────────────────────────────────────
// ครูอนุมัติโปรเจกต์ขึ้นแกลเลอรี: เก็บ snapshot (ข้อมูลไม่เปลี่ยนตามการแก้ภายหลัง) และเลื่อนสมาชิกไปขั้น "แบ่งปัน"
const saApproveShowcase = async (project, uid, blurb) => {
    const vs = await psLoadVersions(project.id);
    const d = project.data || {};
    const batch = db.batch();
    batch.set(db.collection('studio_showcase').doc(project.id), {
        projectId: project.id, courseId: project.courseId, teamId: project.teamId, teamName: project.teamName || '',
        members: project.members || [], memberNames: project.memberNames || {}, title: project.title, kit: project.kit || 'A',
        problem: (d.define && d.define.problemStatement) || '', solution: (d.ideate && d.ideate.chosenIdea) || '',
        testResult: (d.test && d.test.round2) || '', blurb: (blurb || '').slice(0, 500),
        code: vs[0] ? vs[0].code : '', versionCount: vs.length, colabUrl: (d.prototype && d.prototype.colabUrl) || '',
        visible: true, approvedBy: uid, approvedAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1,
    });
    (project.members || []).forEach(m => batch.set(db.collection('studio_progress').doc(sgProgressId(project.courseId, m)),
        { courseId: project.courseId, uid: m, stage: 'share', updatedAt: serverTimestamp() }, { merge: true }));
    batch.set(db.collection('studio_events').doc(), { type: 'showcase_approve', courseId: project.courseId, uid, projectId: project.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1 });
    await batch.commit();
};

const saHideShowcase = async (projectId, hidden) =>
    db.collection('studio_showcase').doc(projectId).update({ visible: !hidden, updatedAt: serverTimestamp() });

// ── Portfolio ────────────────────────────────────────────────────────────────
const saLoadPortfolio = async (course, uid) => {
    const [{ gates }, aSnap, sSnap, ebSnap, pSnap, team] = await Promise.all([
        sgLoadGates(course),
        db.collection('assignments').where('courseId', '==', course.id).get(),
        db.collection('submissions').where('studentId', '==', uid).where('courseId', '==', course.id).get(),
        db.collection('studio_explainBack').where('uid', '==', uid).where('courseId', '==', course.id).get(),
        db.collection('studio_progress').doc(sgProgressId(course.id, uid)).get().catch(() => null),
        db.collection('studio_projects').where('courseId', '==', course.id).where('members', 'array-contains', uid).get(),
    ]);
    const assignments = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const subs = sSnap.docs.map(d => d.data());
    const best = sgBestScores(subs);
    const progress = sgComputeProgress(gates, assignments, best, pSnap && pSnap.exists ? pSnap.data().stage : null);
    const project = team.empty ? null : { id: team.docs[0].id, ...team.docs[0].data() };
    let review = null, showcase = null;
    if (project) {
        review = await db.collection('studio_reviews').doc(psReviewId(project.id, 'teacher')).get().then(s => (s.exists ? s.data() : null)).catch(() => null);
        showcase = await db.collection('studio_showcase').doc(project.id).get().then(s => (s.exists && s.data().visible ? s.data() : null)).catch(() => null);
    }
    const solved = assignments.filter(a => (best[a.id] || 0) >= 100).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'th', { numeric: true }));
    return { progress, solved, explainBack: ebSnap.docs.map(d => d.data()), project, review, showcase };
};

Object.assign(window, { saAggregate, saBuildCsv, saLoadCourse, saApproveShowcase, saHideShowcase, saLoadPortfolio });

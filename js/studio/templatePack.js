/**
 * js/studio/templatePack.js — Course Template Pack: นำเข้า/ส่งออกชุดโจทย์ (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: A₂ (ใช้กับของจริง — ครูนำชุดโจทย์ที่ตรวจเฉลยแล้วไปใช้/ส่งต่อได้), D
 * ปัญหาที่แก้: เดิมครูต้องพิมพ์โจทย์และ test case ทีละข้อ หรือเขียนสคริปต์ seed เอง
 *
 * กติกา (ข้อ 1 ของข้อกำหนด)
 *   - เขียนได้เฉพาะรายวิชาที่เปิด Studio และไม่ใช่รายวิชาวิจัย (isStudio / isProtectedCourse)
 *   - นำเข้า = สร้าง assignment + testCases ใหม่เท่านั้น โจทย์ที่มีอยู่แล้ว (จับจาก sourceProblemId หรือรหัสหน้าชื่อ) จะไม่สร้างซ้ำ
 *   - เติมข้อมูล Studio (ข้อตัดสินใจ D1) = เพิ่มเฉพาะฟิลด์ optional ที่ยังไม่มี ไม่เขียนทับฟิลด์ใดๆ
 *     และบันทึกค่าก่อนแก้ลง studio_events ก่อนเขียนทุกครั้ง
 *   - เฉลย (solution) ไม่เขียนลง assignments เพราะนักเรียนอ่าน assignments ได้ — เก็บใน studio_templates (ครูอ่านเท่านั้น)
 *
 * ไฟล์นี้ไม่มี JSX ทดสอบด้วย Node ได้ (tools/studio/test_phase1.js)
 */

const TP_STUDIO_FIELDS = ['studioType', 'parsons', 'hintLadder', 'skillTag', 'planNo', 'sourceTemplate', 'sourceProblemId', 'starterCode'];
const TP_PARSONS_NOTE = '[โจทย์เรียงบรรทัดโค้ด] คัดลอกบรรทัดต่อไปนี้ไปเรียงให้ถูกลำดับ (ระวังการย่อหน้า)';

const _tpNl = (s) => String(s == null ? '' : s).replace(/\r\n/g, '\n');
const _tpTrimNl = (s) => _tpNl(s).replace(/\n+$/, '');
const _tpContent = (templateId) =>
    (window.STUDIO_TEMPLATE_CONTENT && STUDIO_TEMPLATE_CONTENT[templateId]) || STUDIO_TEMPLATE_FALLBACK;

// "W207-04-2 เลขคู่หรือเลขคี่" → "W207-04-2"
const tpCodeFromTitle = (title) => {
    const m = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\s+/.exec(title || '');
    return m ? m[1] : null;
};

const tpValidateProblem = (p) => {
    const errs = [];
    if (!p || typeof p !== 'object') return ['ไม่ใช่ object'];
    ['id', 'title', 'description'].forEach(k => { if (!p[k] || typeof p[k] !== 'string') errs.push(`ไม่มี ${k}`); });
    if (p.type && !['code', 'parsons'].includes(p.type)) errs.push(`type "${p.type}" ไม่รองรับ`);
    if (!Array.isArray(p.test_cases) || p.test_cases.length === 0) errs.push('ไม่มี test_cases');
    else p.test_cases.forEach((t, i) => {
        if (typeof t.input !== 'string') errs.push(`test ${i + 1}: input ต้องเป็นข้อความ`);
        if (typeof t.expected_output !== 'string') errs.push(`test ${i + 1}: expected_output ต้องเป็นข้อความ`);
    });
    if (p.hints && !Array.isArray(p.hints)) errs.push('hints ต้องเป็น array');
    return errs;
};

// โจทย์ Parsons: ใช้ฟิลด์ parsons ถ้ามี ไม่อย่างนั้นดึงบรรทัดจาก starter_code (บรรทัดคอมเมนต์ "# ...")
// และใช้ solution เป็นลำดับ+การเยื้องที่ถูกต้อง
const tpDeriveParsons = (p) => {
    if (p.type !== 'parsons') return null;
    if (p.parsons && Array.isArray(p.parsons.lines)) {
        return {
            lines: p.parsons.lines.slice(),
            distractors: (p.parsons.distractors || []).slice(),
            indentRequired: p.parsons.indentRequired !== false,
            given: [...p.parsons.lines].reverse().concat(p.parsons.distractors || []),
        };
    }
    const sol = _tpNl(p.solution).split('\n').filter(l => l.trim() !== '').map(l => l.replace(/\s+$/, ''));
    const solSet = new Set(sol.map(l => l.trim()));
    const given = _tpNl(p.starter_code).split('\n')
        .filter(l => /^#/.test(l))
        .map(l => l.replace(/^#\s?/, '').replace(/\s+$/, ''))
        .filter(l => l !== '' && !(!solSet.has(l.trim()) && /เรียงบรรทัด/.test(l)));
    return {
        lines: sol,
        distractors: given.filter(l => !solSet.has(l.trim())),
        indentRequired: true,
        given,
    };
};

// คำอธิบายรูปแบบเดียวกับโจทย์ที่มีอยู่ในระบบ (หน้าเดิมที่ไม่รู้จัก Studio ยังแสดงครบ)
const tpBuildDescription = (p, parsons) => {
    let d = _tpTrimNl(p.description);
    if (parsons && parsons.given.length) d += `\n\n${TP_PARSONS_NOTE}\n${parsons.given.join('\n')}`;
    if (p.input_format || p.output_format) d += `\n\nข้อมูลนำเข้า: ${p.input_format || '-'}\nผลลัพธ์: ${p.output_format || '-'}`;
    const ex = (p.test_cases || []).find(t => t.visible !== false);
    if (ex) d += `\n\nตัวอย่าง Input:\n${_tpTrimNl(ex.input) || '(ไม่มี)'}\nตัวอย่าง Output:\n${_tpTrimNl(ex.expected_output)}`;
    return d;
};

// แปลงโจทย์ 1 ข้อ → { assignment, studioFields, testCases }
const tpMapProblem = (p, templateId) => {
    const tc = _tpContent(templateId);
    const isExam = p.level === 'สอบ';
    const plan = Number(p.plan) || 0;
    const group = (/-(MID|FIN)-/.exec(p.id) || [])[1];
    const [unitName, topicName] =
        (plan > 0 && tc.plans[plan]) ||
        (isExam && group && tc.examGroups[group]) ||
        [`ชุดโจทย์ ${p.course || templateId}`, plan > 0 ? `แผนที่ ${plan}` : (isExam ? 'ข้อสอบ' : 'โจทย์เพิ่มเติม')];
    const lv = STUDIO_LEVEL_MAP[p.level] || { difficulty: 'ปานกลาง', rawScore: 2 };
    const parsons = tpDeriveParsons(p);

    // แสดงตัวอย่างอย่างน้อย minVisibleTests กรณี แต่ต้องเหลือกรณีซ่อนไว้อย่างน้อย 1 กรณี
    const nVisible = Math.max(
        p.test_cases.filter(t => t.visible !== false).length,
        Math.min(tc.minVisibleTests || 0, p.test_cases.length - 1),
    );
    const testCases = p.test_cases.map((t, i) => {
        const hidden = !(t.visible !== false || i < nVisible);
        return {
            input: _tpTrimNl(t.input),
            expectedOutput: _tpTrimNl(t.expected_output),
            isHidden: hidden,
            points: 1,
            order: i + 1,
            note: hidden ? 'hidden' : 'visible',
        };
    });

    const assignment = {
        title: `${p.id} ${p.title}`,
        description: tpBuildDescription(p, parsons),
        language: p.language || tc.language || 'python',
        difficulty: lv.difficulty,
        timeLimit: 5000,
        memoryLimit: 256,
        isPublished: false,
        assignmentType: isExam ? 'exam' : 'practice',
        examDurationMinutes: 50,
        unitName,
        topicName,
        rawScore: tc.rawScoreOverrides[p.id] != null ? tc.rawScoreOverrides[p.id] : lv.rawScore,
        totalPoints: testCases.length,
    };

    const studioFields = {
        studioType: parsons ? 'parsons' : 'code',
        planNo: plan,
        sourceTemplate: tc.sourceTemplate,
        sourceProblemId: p.id,
    };
    if (tc.skillByPlan[plan]) studioFields.skillTag = tc.skillByPlan[plan];
    if (!isExam && p.hints_enabled !== false && Array.isArray(p.hints) && p.hints.length) studioFields.hintLadder = p.hints.slice(0, 4);
    if (parsons) studioFields.parsons = { lines: parsons.lines, distractors: parsons.distractors, indentRequired: parsons.indentRequired };
    if (p.starter_code && p.starter_code.trim()) studioFields.starterCode = _tpNl(p.starter_code);

    return { code: p.id, assignment, studioFields, testCases };
};

// เทียบชุดโจทย์กับโจทย์ในรายวิชา (dry-run — ไม่เขียนอะไร)
const tpPlanImport = (problems, templateId, existingAssignments) => {
    const bySource = {}, byCode = {};
    (existingAssignments || []).forEach(a => {
        if (a.sourceProblemId) bySource[a.sourceProblemId] = a;
        const c = tpCodeFromTitle(a.title);
        if (c && !byCode[c]) byCode[c] = a;
    });
    const seen = new Set();
    const rows = (problems || []).map((p, idx) => {
        const errors = tpValidateProblem(p);
        if (p && p.id && seen.has(p.id)) errors.push('รหัสซ้ำในไฟล์');
        if (p && p.id) seen.add(p.id);
        if (errors.length) return { idx, code: p && p.id, title: p && p.title, status: 'invalid', errors };
        const mapped = tpMapProblem(p, templateId);
        const ex = bySource[p.id] || byCode[p.id];
        if (!ex) return { idx, code: p.id, title: p.title, status: 'new', mapped, problem: p };
        const patch = {};
        TP_STUDIO_FIELDS.forEach(k => { if (mapped.studioFields[k] !== undefined && ex[k] === undefined) patch[k] = mapped.studioFields[k]; });
        const diffs = [];
        if (ex.title !== mapped.assignment.title) diffs.push(`ชื่อในระบบ: "${ex.title}"`);
        if (ex.totalPoints != null && ex.totalPoints !== mapped.assignment.totalPoints) diffs.push(`test case ในระบบ ${ex.totalPoints} / ในไฟล์ ${mapped.assignment.totalPoints}`);
        return { idx, code: p.id, title: p.title, status: 'exists', assignmentId: ex.id, patch, diffs, mapped, problem: p };
    });
    const count = (s) => rows.filter(r => r.status === s).length;
    return {
        rows,
        summary: {
            total: rows.length, new: count('new'), exists: count('exists'), invalid: count('invalid'),
            enrichable: rows.filter(r => r.status === 'exists' && Object.keys(r.patch).length).length,
            testCases: rows.filter(r => r.status === 'new').reduce((s, r) => s + r.mapped.testCases.length, 0),
        },
    };
};

const _tpAssertWritable = (course) => {
    if (!course || !course.id) throw new Error('ไม่พบรายวิชา');
    if (isProtectedCourse(course)) throw new Error('รายวิชานี้เป็นข้อมูลวิจัย แก้ไขไม่ได้');
    if (!isStudio(course)) throw new Error('รายวิชานี้ยังไม่ได้เปิด APCC Studio');
};

const tpLoadCourseAssignments = async (courseId) => {
    const snap = await db.collection('assignments').where('courseId', '==', courseId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// เพิ่มหน่วย/หัวข้อที่ยังไม่มีใน directoryTree (ต่อท้าย ไม่ลบไม่เรียงใหม่)
const _tpMergeTree = (tree, rows) => {
    const out = (tree || []).map(u => ({ name: u.name, topics: (u.topics || []).slice() }));
    let changed = false;
    rows.forEach(r => {
        const { unitName, topicName } = r.mapped.assignment;
        let u = out.find(x => x.name === unitName);
        if (!u) { u = { name: unitName, topics: [] }; out.push(u); changed = true; }
        if (!u.topics.includes(topicName)) { u.topics.push(topicName); changed = true; }
    });
    return changed ? out : null;
};

// นำเข้าเฉพาะโจทย์สถานะ new
const tpCommitImport = async (course, plan, onProgress) => {
    _tpAssertWritable(course);
    const rows = plan.rows.filter(r => r.status === 'new');
    if (!rows.length) return { created: 0, testCases: 0, assignmentIds: [] };

    const fresh = (await db.collection('courses').doc(course.id).get()).data() || {};
    const tree = _tpMergeTree(fresh.directoryTree, rows);
    if (tree) await db.collection('courses').doc(course.id).update({ directoryTree: tree });

    const ids = [];
    let tcCount = 0;
    for (let i = 0; i < rows.length; i++) {
        const { assignment, studioFields, testCases } = rows[i].mapped;
        const ref = await db.collection('assignments').add({
            ...assignment, ...studioFields, courseId: course.id, createdAt: serverTimestamp(),
        });
        const batch = db.batch();
        testCases.forEach(t => batch.set(db.collection('testCases').doc(), { ...t, assignmentId: ref.id, createdAt: serverTimestamp() }));
        await batch.commit();
        ids.push(ref.id);
        tcCount += testCases.length;
        onProgress && onProgress(i + 1, rows.length, rows[i].code);
    }
    await logStudioEvent('template_import', course.id, {
        sourceTemplate: rows[0].mapped.studioFields.sourceTemplate,
        created: ids.length, testCases: tcCount, assignmentIds: ids, codes: rows.map(r => r.code),
    });
    return { created: ids.length, testCases: tcCount, assignmentIds: ids };
};

// D1: เติมฟิลด์ Studio ให้โจทย์ที่มีอยู่แล้ว (เฉพาะฟิลด์ที่ยังไม่มี) — บันทึกค่าก่อนแก้ก่อนเขียนทุกข้อ
const tpCommitEnrich = async (course, plan, onProgress) => {
    _tpAssertWritable(course);
    const rows = plan.rows.filter(r => r.status === 'exists' && Object.keys(r.patch).length);
    let updated = 0;
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const fields = Object.keys(r.patch);
        const logged = await logStudioEvent('template_enrich', course.id, {
            assignmentId: r.assignmentId, code: r.code, fields,
            before: Object.fromEntries(fields.map(k => [k, null])),   // ทุกฟิลด์ไม่มีอยู่ก่อน (patch มีเฉพาะฟิลด์ที่ยังไม่มี)
            after: r.patch,
        });
        if (!logged) throw new Error(`บันทึกค่าก่อนแก้ของ ${r.code} ไม่สำเร็จ จึงหยุดไว้ก่อน`);
        await db.collection('assignments').doc(r.assignmentId).update({ ...r.patch, studioEnrichedAt: serverTimestamp() });
        updated++;
        onProgress && onProgress(i + 1, rows.length, r.code);
    }
    return { updated };
};

// ตรวจเฉลยก่อนนำเข้า: รัน solution กับทุก test case ผ่าน runner เดิม (runSingleTest ใน grader.js — ไม่แก้ grader)
const tpVerifySolutions = async (problems, onProgress, opts = {}) => {
    const runner = opts.runner || runSingleTest;
    const concurrency = opts.concurrency || 2;
    const jobs = [];
    const results = problems.map(p => ({ code: p.id, title: p.title, total: (p.test_cases || []).length, passed: 0, failures: [], noSolution: !(p.solution || '').trim() }));
    problems.forEach((p, pi) => {
        if (results[pi].noSolution) return;
        p.test_cases.forEach((t, ti) => jobs.push({ pi, ti, p, t }));
    });
    let done = 0, next = 0;
    const worker = async () => {
        while (next < jobs.length) {
            const { pi, ti, p, t } = jobs[next++];
            let r;
            try { r = await runner(p.solution, p.language || 'python', { input: _tpTrimNl(t.input), expectedOutput: _tpTrimNl(t.expected_output) }); }
            catch (err) { r = { passed: false, actualOutput: '', errorLog: err.message }; }
            if (r.passed) results[pi].passed++;
            else results[pi].failures.push({ test: ti + 1, input: _tpTrimNl(t.input), expected: _tpTrimNl(t.expected_output), actual: r.actualOutput || '', error: r.errorLog || '' });
            done++;
            onProgress && onProgress(done, jobs.length);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
    return {
        results,
        totalTests: jobs.length,
        passedTests: results.reduce((s, r) => s + r.passed, 0),
        failedProblems: results.filter(r => r.failures.length).length,
        noSolution: results.filter(r => r.noSolution).length,
    };
};

// เก็บชุดโจทย์ (รวมเฉลย) ไว้ในคลังของครู — studio_templates อ่านได้เฉพาะครู/แอดมิน
const tpSaveToLibrary = async (templateId, title, problems, courseId) => {
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    const ref = db.collection('studio_templates').doc(templateId);
    const snap = await ref.get();
    await ref.set({
        templateId, title, sourceTemplate: _tpContent(templateId).sourceTemplate,
        problems, problemCount: problems.length,
        testCaseCount: problems.reduce((s, p) => s + (p.test_cases || []).length, 0),
        ownerId: snap.exists ? (snap.data().ownerId || uid) : uid,
        courseId: courseId || null,
        createdAt: snap.exists ? (snap.data().createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp(), schemaVersion: 1,
    });
};

const _tpLevelFromAssignment = (a) =>
    a.assignmentType === 'exam' ? 'สอบ' : (a.difficulty === 'ยาก' ? 'ท้าทาย' : (a.difficulty || 'ปานกลาง'));

// ส่งออกรายวิชาเป็นชุดโจทย์ (ไม่มีข้อมูลนักเรียน: อ่านเฉพาะ courses / assignments / testCases / studio_templates)
const tpExportCourse = async (course) => {
    const assignments = await tpLoadCourseAssignments(course.id);
    let library = {};
    const tid = course.studio && course.studio.template;
    if (tid) {
        try {
            const lib = await db.collection('studio_templates').doc(tid).get();
            if (lib.exists) (lib.data().problems || []).forEach(p => { library[p.id] = p; });
        } catch (_) { library = {}; }
    }
    const pack = [];
    for (const a of assignments.sort((x, y) => (x.title || '').localeCompare(y.title || '', 'th', { numeric: true }))) {
        const tSnap = await db.collection('testCases').where('assignmentId', '==', a.id).get();
        const tcs = tSnap.docs.map(d => d.data()).sort((x, y) => (x.order || 0) - (y.order || 0));
        const code = a.sourceProblemId || tpCodeFromTitle(a.title) || a.id;
        const title = tpCodeFromTitle(a.title) ? a.title.slice(tpCodeFromTitle(a.title).length).trim() : a.title;
        const desc = _tpNl(a.description);
        const cut = [desc.indexOf(`\n\n${TP_PARSONS_NOTE}`), desc.indexOf('\n\nข้อมูลนำเข้า:'), desc.indexOf('\n\nตัวอย่าง Input:')].filter(i => i >= 0);
        const lib = library[code] || {};
        const item = {
            id: code,
            course: lib.course || course.title,
            language: a.language || course.language,
            plan: a.planNo != null ? a.planNo : Number((/แผนที่\s*(\d+)/.exec(a.topicName || '') || [])[1] || 0),
            title,
            level: _tpLevelFromAssignment(a),
            type: a.studioType === 'parsons' ? 'parsons' : 'code',
            concept: lib.concept || a.skillTag || '',
            description: cut.length ? desc.slice(0, Math.min(...cut)) : desc,
            input_format: (/\nข้อมูลนำเข้า: (.*)/.exec(desc) || [])[1] || lib.input_format || '',
            output_format: (/\nผลลัพธ์: (.*)/.exec(desc) || [])[1] || lib.output_format || '',
            starter_code: a.starterCode || lib.starter_code || '',
            solution: lib.solution || '',
            hints: a.hintLadder || lib.hints || [],
            hints_enabled: !!(a.hintLadder && a.hintLadder.length) || !!lib.hints_enabled,
            test_cases: tcs.map(t => ({ input: t.input || '', expected_output: `${t.expectedOutput || ''}\n`, visible: !t.isHidden })),
        };
        if (a.parsons) item.parsons = a.parsons;
        pack.push(item);
    }
    await logStudioEvent('template_export', course.id, { problemCount: pack.length });
    return pack;
};

const tpDownloadJson = (filename, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

Object.assign(window, {
    TP_STUDIO_FIELDS, tpCodeFromTitle, tpValidateProblem, tpDeriveParsons, tpBuildDescription, tpMapProblem,
    tpPlanImport, tpLoadCourseAssignments, tpCommitImport, tpCommitEnrich, tpVerifySolutions,
    tpSaveToLibrary, tpExportCourse, tpDownloadJson,
});

/**
 * js/learningOutcomes.js — ฟังก์ชันคำนวณของแท็บ "ผลลัพธ์ผู้เรียน" (Teacher Analytics)
 *
 * ไฟล์นี้เป็นฟังก์ชันล้วน (ไม่อ่าน/เขียน Firestore ไม่มี JSX) เพื่อให้ทดสอบด้วย node ได้
 * ทุกตัวเลขคำนวณจากเอกสารจริงที่หน้า Analytics โหลดมาแล้ว
 *
 * หลักการที่ต้องคงไว้
 *   - ใช้ submissions ชุดเดียวกับตาราง E1 (หน้าหลักกรอง countedInGrade และงานหลังปิดรับคะแนนแล้ว)
 *   - "คะแนนที่นับ" ใช้อัลกอริทึมเดียวกับตาราง E1 ตามเกณฑ์ของรายวิชา (best / latest + grades)
 *   - เวลาใช้เรียงลำดับภายในเท่านั้น ผลลัพธ์ทุกตัวเป็น "ครั้งที่ n" ไม่มีวันที่หรือเวลา
 *
 * โหลดแบบ lazy จาก LearningOutcomesLoader.js · ประกาศไว้ที่ window.LO
 */
(function (root) {
    // ── เวลา (ใช้เรียงเท่านั้น) ─────────────────────────────────────────────
    // รองรับ Firestore Timestamp, {seconds}, {__ts: ISO} (ไฟล์แคชของ tools/report), Date, number
    const tsSec = (t) => {
        if (t == null) return 0;
        if (typeof t === 'number') return t;
        if (typeof t.seconds === 'number') return t.seconds + (t.nanoseconds || 0) / 1e9;
        if (t.__ts) return Date.parse(t.__ts) / 1000;
        if (typeof t.toMillis === 'function') return t.toMillis() / 1000;
        if (t instanceof Date) return t.getTime() / 1000;
        return 0;
    };

    // ── โจทย์ ────────────────────────────────────────────────────────────────
    // "กิจกรรม 3-A1: 1 ถึง N โดยใช้ for loop" → "3-A1"
    const problemCode = (title) => {
        const m = /(\d+\s*-\s*[A-Za-z]\d*)/.exec(title || '');
        return m ? m[1].replace(/\s+/g, '') : '';
    };
    const shortTitle = (title) => String(title || '')
        .replace(/^กิจกรรม\s*/, '')
        .replace(/^\d+\s*-\s*[A-Za-z]\d*\s*[:：]?\s*/, '')
        .trim();
    const unitNo = (name) => { const m = /(\d+)/.exec(name || ''); return m ? parseInt(m[1], 10) : 99; };

    // จัดกลุ่มโจทย์ตามหน่วย เรียงหน่วยแล้วเรียงรหัส/ชื่อ (ลำดับเดียวกับตาราง E1)
    const groupProblems = (assignments) => {
        const units = [];
        const map = {};
        [...assignments]
            .sort((a, b) => {
                const d = unitNo(a.unitName) - unitNo(b.unitName);
                return d !== 0 ? d : (a.title || '').localeCompare(b.title || '', 'th');
            })
            .forEach(a => {
                const u = a.unitName || 'ไม่ระบุหน่วย';
                if (!map[u]) { map[u] = []; units.push(u); }
                map[u].push(a);
            });
        return units.map(u => ({ unit: u, items: map[u] }));
    };

    // ── รหัสผู้เรียน S01… ────────────────────────────────────────────────────
    // เรียงตามเลขที่ (users.number) แล้วเลขประจำตัว แล้วชื่อ — ใช้ชุดเดียวกันทุกมุมมอง
    const buildCodes = (enrollments, students) => {
        const uids = [];
        const seen = new Set();
        (enrollments || []).forEach(e => { if (e && e.studentId && !seen.has(e.studentId)) { seen.add(e.studentId); uids.push(e.studentId); } });
        const num = (uid) => { const n = parseInt((students[uid] || {}).number, 10); return Number.isFinite(n) ? n : 9999; };
        uids.sort((a, b) => {
            const d = num(a) - num(b);
            if (d !== 0) return d;
            const sa = String((students[a] || {}).studentCode || ''), sb = String((students[b] || {}).studentCode || '');
            if (sa !== sb) return sa.localeCompare(sb);
            return String((students[a] || {}).displayName || a).localeCompare(String((students[b] || {}).displayName || b), 'th');
        });
        const width = Math.max(2, String(uids.length).length);
        const byUid = {};
        const list = uids.map((uid, i) => {
            const st = students[uid] || {};
            const row = {
                uid,
                code: 'S' + String(i + 1).padStart(width, '0'),
                order: i,
                number: st.number != null ? st.number : '',
                studentCode: st.studentCode || (st.email ? String(st.email).split('@')[0] : ''),
                name: st.displayName || '',
            };
            byUid[uid] = row;
            return row;
        });
        return { list, byUid };
    };

    // ── ผลตรวจ ───────────────────────────────────────────────────────────────
    const VERDICT_LABEL = {
        AC: 'ผ่านทุกกรณี', WA: 'คำตอบผิด', CE: 'คอมไพล์ไม่ผ่าน', RE: 'รันไม่สำเร็จ', TLE: 'ใช้เวลาเกิน', PA: 'ผ่านบางส่วน',
    };
    const verdictOf = (s) => {
        if (!s) return '';
        if (s._v2) return s.isPassed === true || (s.score || 0) >= 100 ? 'AC' : 'WA';
        const st = s.status;
        if (st === 'accepted') return 'AC';
        if (st === 'wrong_answer') return 'WA';
        if (st === 'compile_error') return 'CE';
        if (st === 'runtime_error') {
            const tle = (s.testResults || []).some(r => /time\s*limit|timed?\s*out|\bTLE\b/i.test(r && r.errorLog || ''));
            return tle ? 'TLE' : 'RE';
        }
        return (s.score || 0) >= 100 ? 'AC' : 'WA';
    };

    // ── คะแนนที่นับ (พอร์ตตรงจากตาราง E1 ใน StudentAnalytics.js) ─────────────
    // คืน { [uid]: { [aid]: score% } } ใช้ทั้งในตารางและการกระทบยอด
    const e1Scores = ({ submissions = [], submissionsV2 = [], grades = [], gradingPolicy = 'best' }) => {
        const bestScore = {};
        if (gradingPolicy === 'latest') {
            const latestAt = {};
            submissions.forEach(sub => {
                if (!bestScore[sub.studentId]) { bestScore[sub.studentId] = {}; latestAt[sub.studentId] = {}; }
                if (!latestAt[sub.studentId]) latestAt[sub.studentId] = {};
                const t = tsSec(sub.submittedAt);
                if (t >= (latestAt[sub.studentId][sub.assignmentId] || -1)) {
                    latestAt[sub.studentId][sub.assignmentId] = t;
                    bestScore[sub.studentId][sub.assignmentId] = sub.score || 0;
                }
            });
        } else {
            submissions.forEach(sub => {
                if (!bestScore[sub.studentId]) bestScore[sub.studentId] = {};
                const cur = bestScore[sub.studentId][sub.assignmentId] || 0;
                if ((sub.score || 0) > cur) bestScore[sub.studentId][sub.assignmentId] = sub.score || 0;
            });
        }
        grades.forEach(g => {
            if (!bestScore[g.studentId]) bestScore[g.studentId] = {};
            const cur = bestScore[g.studentId][g.assignmentId];
            if (gradingPolicy === 'latest') {
                if (cur === undefined) bestScore[g.studentId][g.assignmentId] = g.score || 0;
            } else if ((g.score || 0) > (cur || 0)) {
                bestScore[g.studentId][g.assignmentId] = g.score || 0;
            }
        });
        if (gradingPolicy === 'latest') {
            const latestV2 = {};
            submissionsV2.forEach(sub => {
                if (!bestScore[sub.studentId]) bestScore[sub.studentId] = {};
                if (!latestV2[sub.studentId]) latestV2[sub.studentId] = {};
                const t = tsSec(sub.submittedAt);
                const prev = latestV2[sub.studentId][sub.assignmentId];
                if (t >= (prev == null ? -1 : prev)) {
                    latestV2[sub.studentId][sub.assignmentId] = t;
                    bestScore[sub.studentId][sub.assignmentId] = sub.score || 0;
                }
            });
        } else {
            submissionsV2.forEach(sub => {
                if (!bestScore[sub.studentId]) bestScore[sub.studentId] = {};
                const cur = bestScore[sub.studentId][sub.assignmentId] || 0;
                if ((sub.score || 0) > cur) bestScore[sub.studentId][sub.assignmentId] = sub.score || 0;
            });
        }
        return bestScore;
    };
    const rawEarned = (pct, rawScore) => (rawScore > 0 ? Math.round((pct || 0) * rawScore / 100) : 0);

    // ── ลำดับการส่งรายคู่ (ผู้เรียน × โจทย์) ─────────────────────────────────
    const pairKey = (uid, aid) => uid + '|' + aid;
    const buildAttempts = (submissions, submissionsV2, uidSet, aidSet) => {
        const map = {};
        const add = (s, v2) => {
            if (!uidSet.has(s.studentId) || !aidSet.has(s.assignmentId)) return;
            const k = pairKey(s.studentId, s.assignmentId);
            (map[k] = map[k] || []).push(v2 ? Object.assign({ _v2: true }, s) : s);
        };
        (submissions || []).forEach(s => add(s, false));
        (submissionsV2 || []).forEach(s => add(s, true));
        Object.keys(map).forEach(k => map[k].sort((a, b) => (tsSec(a.submittedAt) - tsSec(b.submittedAt)) || String(a.id || '').localeCompare(String(b.id || ''))));
        return map;
    };

    // ── คำใบ้และการรัน (usageEvents) ─────────────────────────────────────────
    // events: [{uid, assignmentId, event, hintLevel, timestamp}]
    const indexUsage = (events, uidSet, aidSet) => {
        const hints = {}, runs = {};
        (events || []).forEach(e => {
            if (!e || !uidSet.has(e.uid) || !aidSet.has(e.assignmentId)) return;
            const k = pairKey(e.uid, e.assignmentId);
            if (e.event === 'ai_hint') {
                const lv = parseInt(e.hintLevel, 10);
                (hints[k] = hints[k] || []).push({ level: lv >= 1 && lv <= 4 ? lv : null, t: tsSec(e.timestamp) });
            } else if (e.event === 'code_run' || e.event === 'sample_test') {
                runs[k] = (runs[k] || 0) + 1;
            }
        });
        Object.values(hints).forEach(arr => arr.sort((a, b) => a.t - b.t));
        return { hints, runs };
    };

    // ข้อความคำใบ้จาก coachInteractions (socratic, hint_level_N) จับคู่ด้วยชื่อโจทย์ (relatedId)
    const indexCoach = (docs, uidSet, titleToAid) => {
        const out = {};
        (docs || []).forEach(x => {
            if (!x || x.coachRole !== 'socratic' || !uidSet.has(x.uid)) return;
            const m = /^hint_level_(\d)/.exec(x.triggerEvent || '');
            if (!m) return;
            const aid = titleToAid[x.relatedId];
            if (!aid) return;
            const k = pairKey(x.uid, aid);
            (out[k] = out[k] || []).push({ level: parseInt(m[1], 10), text: x.response || '', local: /_local$/.test(x.triggerEvent || ''), t: tsSec(x.createdAt) });
        });
        Object.values(out).forEach(arr => arr.sort((a, b) => a.t - b.t));
        return out;
    };

    // คำใบ้ก่อนส่งครั้งที่ n: คำใบ้ที่เกิดหลังส่งครั้ง n-1 และไม่หลังส่งครั้ง n
    // คืน array ยาว attempts.length + 1 (ช่องสุดท้าย = หลังส่งครั้งสุดท้าย)
    const hintsBeforeAttempts = (attempts, hints) => {
        const slots = Array.from({ length: (attempts || []).length + 1 }, () => []);
        const ts = (attempts || []).map(a => tsSec(a.submittedAt));
        (hints || []).forEach(h => {
            let i = ts.findIndex(t => t >= h.t);
            if (i < 0) i = ts.length;
            slots[i].push(h);
        });
        return slots;
    };

    // ── ช่องของตาราง Matrix ──────────────────────────────────────────────────
    // status: 'first' ผ่านตั้งแต่ครั้งแรก | 'revised' ผ่านหลังแก้ไข | 'notyet' ยังไม่ผ่าน | 'none' ไม่ได้ส่ง | 'gradeOnly'
    const buildCell = ({ attempts = [], counted, hints = [], runs = 0 }) => {
        const n = attempts.length;
        const lv = [0, 0, 0, 0];
        let lvUnknown = 0;
        hints.forEach(h => { if (h.level) lv[h.level - 1]++; else lvUnknown++; });
        const first = attempts[0] || null;
        let best = null;
        attempts.forEach(a => { if (!best || (a.score || 0) > (best.score || 0)) best = a; });
        const last = attempts[n - 1] || null;
        const firstScore = first ? (first.score || 0) : null;
        const bestScore = best ? (best.score || 0) : null;
        let status;
        if (n === 0) status = counted != null ? 'gradeOnly' : 'none';
        else if (counted === 100 && firstScore === 100) status = 'first';
        else if (counted === 100) status = 'revised';
        else status = 'notyet';
        return {
            n,
            firstVerdict: verdictOf(first),
            firstScore,
            firstTests: first && first.totalTests ? [first.passedTests || 0, first.totalTests] : null,
            lastVerdict: verdictOf(last),
            lastScore: last ? (last.score || 0) : null,
            lastTests: last && last.totalTests ? [last.passedTests || 0, last.totalTests] : null,
            bestScore,
            bestTests: best && best.totalTests ? [best.passedTests || 0, best.totalTests] : null,
            counted: counted == null ? null : counted,
            passed: counted === 100,
            firstPassed: firstScore === 100,
            everFull: bestScore === 100,
            hintLv: lv,
            hintUnknown: lvUnknown,
            hints: hints.length,
            runs,
            status,
        };
    };

    // สร้างตารางทั้งหมด: rows[uid] = { cells: {aid: cell}, sum }
    const buildMatrix = ({ codes, uids, problems, submissions, submissionsV2, grades, gradingPolicy, usage }) => {
        const uidSet = new Set(uids);
        const aidSet = new Set(problems.map(p => p.id));
        const attempts = buildAttempts(submissions, submissionsV2, uidSet, aidSet);
        const counted = e1Scores({ submissions, submissionsV2, grades, gradingPolicy });
        const rows = {};
        uids.forEach(uid => {
            const cells = {};
            let passed = 0, subs = 0, runs = 0, hints = 0, raw = 0;
            const lv = [0, 0, 0, 0];
            problems.forEach(p => {
                const k = pairKey(uid, p.id);
                const c = buildCell({
                    attempts: attempts[k] || [],
                    counted: counted[uid] ? counted[uid][p.id] : undefined,
                    hints: (usage && usage.hints[k]) || [],
                    runs: (usage && usage.runs[k]) || 0,
                });
                cells[p.id] = c;
                if (c.passed) passed++;
                subs += c.n; runs += c.runs; hints += c.hints;
                c.hintLv.forEach((v, i) => { lv[i] += v; });
                raw += rawEarned(c.counted, p.rawScore);
            });
            rows[uid] = { uid, code: codes.byUid[uid] ? codes.byUid[uid].code : uid, cells, sum: { passed, subs, runs, hints, lv, raw } };
        });
        const rawMax = problems.reduce((s, p) => s + (p.rawScore || 0), 0);
        return { rows, attempts, rawMax };
    };

    // สรุปต่อโจทย์ (แถวท้ายตาราง) — ตัวหารคือจำนวนผู้เรียนที่เลือก
    const columnSummary = (matrix, uids, aid) => {
        const cells = uids.map(u => matrix.rows[u] && matrix.rows[u].cells[aid]).filter(Boolean);
        const n = uids.length;
        const submitted = cells.filter(c => c.n > 0);
        const passed = cells.filter(c => c.passed).length;
        const firstPassed = cells.filter(c => c.firstPassed).length;
        const totalSubs = submitted.reduce((s, c) => s + c.n, 0);
        return {
            n, submitted: submitted.length, passed, firstPassed, totalSubs,
            pctPassed: n ? passed / n * 100 : 0,
            pctFirst: n ? firstPassed / n * 100 : 0,
            avgAttempts: submitted.length ? totalSubs / submitted.length : 0,
            hints: cells.reduce((s, c) => s + c.hints, 0),
            runs: cells.reduce((s, c) => s + c.runs, 0),
        };
    };

    // ── กระทบยอดกับตาราง E1 ──────────────────────────────────────────────────
    // เทียบคะแนนในตารางนี้กับคะแนนที่ตาราง E1 แสดง (คะแนนดิบ = round(% × rawScore / 100))
    const reconcileWithE1 = ({ matrix, uids, problems, e1Input }) => {
        const e1 = e1Scores(e1Input);
        const issues = [];
        const notInE1 = problems.filter(p => !(p.isPublished !== false && p.unitName));
        notInE1.forEach(p => issues.push({ kind: 'notInE1', aid: p.id, reason: p.isPublished === false ? 'โจทย์ถูกซ่อน (ตาราง E1 ไม่แสดง)' : 'โจทย์ไม่มีชื่อหน่วย (ตาราง E1 ไม่แสดง)' }));
        let checked = 0, mismatched = 0, gradeOnly = 0;
        uids.forEach(uid => problems.forEach(p => {
            const c = matrix.rows[uid] && matrix.rows[uid].cells[p.id];
            if (!c) return;
            checked++;
            const a = rawEarned(c.counted, p.rawScore);
            const b = rawEarned(e1[uid] ? e1[uid][p.id] : 0, p.rawScore);
            if (c.status === 'gradeOnly') gradeOnly++;
            if (a !== b) { mismatched++; issues.push({ kind: 'score', uid, aid: p.id, mine: a, e1: b, reason: 'คะแนนไม่ตรง' }); }
        }));
        return { checked, mismatched, gradeOnly, issues, ok: mismatched === 0 };
    };

    // ── กลุ่มผู้เรียน (เหมือนแท็บ "กลุ่มผู้เรียน" ทุกประการ) ──────────────────
    const profileMetrics = (subs, totalAssignments) => {
        if (!subs.length) return null;
        const byAssign = {};
        subs.forEach(s => { (byAssign[s.assignmentId] = byAssign[s.assignmentId] || []).push(s); });
        const unique = Object.keys(byAssign).length;
        const repScores = Object.values(byAssign).map(arr => Math.max(...arr.map(s => s.score || 0)));
        const avgScore = Math.round(repScores.reduce((a, b) => a + b, 0) / repScores.length);
        const passRate = Math.round(repScores.filter(s => s >= 60).length / repScores.length * 100);
        const coverage = Math.round(Math.min(100, unique / Math.max(1, totalAssignments) * 100));
        const avgAttempts = subs.length / Math.max(1, unique);
        const effort = Math.round(Math.min(100, avgAttempts / 5 * 100));
        const improvements = Object.values(byAssign).map(arr => {
            const sorted = [...arr].sort((a, b) => tsSec(a.submittedAt) - tsSec(b.submittedAt));
            return Math.max(...arr.map(s => s.score || 0)) - ((sorted[0] && sorted[0].score) || 0);
        });
        const progress = Math.round(Math.min(100, Math.max(0, 50 + improvements.reduce((a, b) => a + b, 0) / improvements.length)));
        return { avgScore, passRate, coverage, effort, progress };
    };
    const classifyDefault = (m) => {
        if (!m) return 'D';
        const { avgScore, passRate, coverage, effort } = m;
        if (avgScore >= 65 && passRate >= 60 && coverage >= 60) return 'A';
        if (avgScore >= 60 && passRate >= 55 && coverage < 60) return 'B';
        if (coverage >= 50 && effort >= 50) return 'C';
        return 'D';
    };
    const GROUP3 = { A: 'fast', B: 'mid', C: 'mid', D: 'stuck' };
    const GROUP3_LABEL = { fast: 'ไว', mid: 'กลาง', stuck: 'ติดขัด' };
    const buildGroups = ({ uids, submissions, submissionsV2, totalAssignments, classify }) => {
        const fn = classify || classifyDefault;
        const by = {};
        (submissions || []).forEach(s => { (by[s.studentId] = by[s.studentId] || []).push(s); });
        (submissionsV2 || []).forEach(s => { (by[s.studentId] = by[s.studentId] || []).push(s); });
        const out = {};
        uids.forEach(uid => {
            const m = profileMetrics(by[uid] || [], totalAssignments);
            const letter = m ? fn(m) : 'D';
            out[uid] = { letter, group: GROUP3[letter] || 'stuck', metrics: m };
        });
        return out;
    };

    // ── diff รายบรรทัด (LCS) ─────────────────────────────────────────────────
    const lineDiff = (a, b) => {
        const A = String(a || '').replace(/\r\n?/g, '\n').split('\n');
        const B = String(b || '').replace(/\r\n?/g, '\n').split('\n');
        const norm = (s) => s.replace(/\s+$/, '');
        const n = A.length, m = B.length;
        const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
        for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
            L[i][j] = norm(A[i]) === norm(B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
        }
        const out = [];
        let i = 0, j = 0;
        while (i < n && j < m) {
            if (norm(A[i]) === norm(B[j])) { out.push({ type: 'same', text: B[j], a: i + 1, b: j + 1 }); i++; j++; }
            else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ type: 'del', text: A[i], a: i + 1 }); i++; }
            else { out.push({ type: 'add', text: B[j], b: j + 1 }); j++; }
        }
        while (i < n) { out.push({ type: 'del', text: A[i], a: i + 1 }); i++; }
        while (j < m) { out.push({ type: 'add', text: B[j], b: j + 1 }); j++; }
        return out;
    };

    // ── สถิติก่อน–หลัง ───────────────────────────────────────────────────────
    const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
    const sd = (xs) => {
        if (xs.length < 2) return NaN;
        const m = mean(xs);
        return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1));
    };
    // ln Γ (Lanczos) และ regularized incomplete beta (continued fraction, Numerical Recipes)
    const gammaln = (x) => {
        const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
        let y = x, tmp = x + 5.5;
        tmp -= (x + 0.5) * Math.log(tmp);
        let ser = 1.000000000190015;
        for (let j = 0; j < 6; j++) ser += c[j] / ++y;
        return -tmp + Math.log(2.5066282746310005 * ser / x);
    };
    const betacf = (a, b, x) => {
        const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
        let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        d = 1 / d;
        let h = d;
        for (let m = 1; m <= MAXIT; m++) {
            const m2 = 2 * m;
            let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
            d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
            c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
            d = 1 / d; h *= d * c;
            aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
            d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
            c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
            d = 1 / d;
            const del = d * c;
            h *= del;
            if (Math.abs(del - 1) < EPS) break;
        }
        return h;
    };
    const ibeta = (x, a, b) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
        return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
    };
    // p สองทางของสถิติ t ที่ df องศาอิสระ
    const tTwoTailedP = (t, df) => (Number.isFinite(t) && df > 0 ? ibeta(df / (df + t * t), df / 2, 0.5) : NaN);

    // pairs: [{pre, post}] (เฉพาะคนที่มีทั้งสองค่า) · maxScore: คะแนนเต็ม · threshold: ร้อยละผ่านเกณฑ์
    const pairedStats = (pairs, maxScore, threshold) => {
        const P = (pairs || []).filter(p => Number.isFinite(p.pre) && Number.isFinite(p.post));
        const n = P.length;
        const pre = P.map(p => p.pre), post = P.map(p => p.post), d = P.map(p => p.post - p.pre);
        const mD = mean(d), sD = sd(d);
        const t = n >= 2 && sD > 0 ? mD / (sD / Math.sqrt(n)) : NaN;
        const df = n - 1;
        const mPre = mean(pre), mPost = mean(post);
        const gClass = maxScore > mPre ? (mPost - mPre) / (maxScore - mPre) : NaN;
        const gi = P.filter(p => maxScore > p.pre).map(p => (p.post - p.pre) / (maxScore - p.pre));
        const thr = Number.isFinite(threshold) ? threshold : 80;
        const passPost = maxScore > 0 ? post.filter(x => x / maxScore * 100 >= thr).length : 0;
        const passPre = maxScore > 0 ? pre.filter(x => x / maxScore * 100 >= thr).length : 0;
        return {
            n, meanPre: mPre, sdPre: sd(pre), meanPost: mPost, sdPost: sd(post),
            meanDiff: mD, sdDiff: sD, t, df, p: tTwoTailedP(t, df),
            dz: sD > 0 ? mD / sD : NaN,
            gClass, gMean: gi.length ? mean(gi) : NaN,
            threshold: thr, passPre, passPost,
            pctPassPre: n ? passPre / n * 100 : NaN, pctPassPost: n ? passPost / n * 100 : NaN,
        };
    };

    // ── QuickPoll ────────────────────────────────────────────────────────────
    const pollStats = (session, responses, uidSet) => {
        const correct = session && session.snapshot && session.snapshot.correctOptionId;
        const rs = (responses || []).filter(r => uidSet.has(r.studentUid || r.id));
        const r1 = rs.filter(r => r.r1 && r.r1.optionId);
        const r2 = rs.filter(r => r.r2 && r.r2.optionId);
        const ok = (x) => !!correct && x && x.optionId === correct;
        const both = rs.filter(r => r.r1 && r.r1.optionId && r.r2 && r.r2.optionId);
        return {
            correct: correct || null,
            r1n: r1.length, r1ok: r1.filter(r => ok(r.r1)).length,
            r2n: r2.length, r2ok: r2.filter(r => ok(r.r2)).length,
            bothN: both.length,
            wrongToRight: both.filter(r => !ok(r.r1) && ok(r.r2)).length,
            rightToWrong: both.filter(r => ok(r.r1) && !ok(r.r2)).length,
        };
    };

    // ── CSV ──────────────────────────────────────────────────────────────────
    const parseCSV = (text) => {
        const src = String(text || '').replace(/^﻿/, '');
        const firstLine = src.split(/\r?\n/)[0] || '';
        const sep = (firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length ? '\t' : ',';
        const rows = [];
        let row = [], cell = '', q = false;
        for (let i = 0; i < src.length; i++) {
            const ch = src[i];
            if (q) {
                if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
                else cell += ch;
            } else if (ch === '"') q = true;
            else if (ch === sep) { row.push(cell); cell = ''; }
            else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && src[i + 1] === '\n') i++;
                row.push(cell); cell = '';
                if (row.some(c => c.trim() !== '')) rows.push(row);
                row = [];
            } else cell += ch;
        }
        row.push(cell);
        if (row.some(c => c.trim() !== '')) rows.push(row);
        return rows.map(r => r.map(c => c.trim()));
    };
    const csvCell = (v) => {
        const s = v == null ? '' : String(v);
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const toCSV = (rows) => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n');

    // คอลัมน์ที่รับได้ (ไม่สนตัวพิมพ์/ช่องว่าง)
    const IMPORT_FIELDS = [
        { key: 'id',   label: 'รหัส/เลขประจำตัว', alias: ['id', 'รหัส', 'เลขประจำตัว', 'studentcode', 'code', 'scode', 'เลขที่', 'no', 'number'] },
        { key: 'pre',  label: 'ก่อนเรียน',  alias: ['pre', 'pretest', 'ก่อนเรียน', 'คะแนนก่อนเรียน'] },
        { key: 'post', label: 'หลังเรียน',  alias: ['post', 'posttest', 'หลังเรียน', 'คะแนนหลังเรียน'] },
        { key: 'p19_2', label: 'ภ.19-2',   alias: ['ภ.19-2', 'ภ19-2', 'p19-2', 'p19_2', 'task'] },
        { key: 's3',   label: 'S3',        alias: ['s3', 'ทักษะ'] },
        { key: 'a',    label: 'A',         alias: ['a', 'เจตคติ', 'คุณลักษณะ'] },
        { key: 'c',    label: 'C',         alias: ['c', 'สมรรถนะ'] },
        { key: 'peer', label: 'Peer Review', alias: ['peer', 'peerreview', 'peer review', 'เพื่อนประเมิน'] },
        { key: 'exit', label: 'Exit Ticket/เป้าหมาย', alias: ['exit', 'exitticket', 'exit ticket', 'เป้าหมาย'] },
    ];
    const _normHead = (h) => String(h || '').toLowerCase().replace(/[\s_]/g, '').replace(/\(.*?\)/g, '');
    const mapImportHeader = (header) => {
        const idx = {};
        header.forEach((h, i) => {
            const nh = _normHead(h);
            IMPORT_FIELDS.forEach(f => {
                if (idx[f.key] != null) return;
                if (f.alias.some(a => _normHead(a) === nh)) idx[f.key] = i;
            });
        });
        return idx;
    };
    const _num = (v) => {
        if (v == null || String(v).trim() === '') return null;
        const x = parseFloat(String(v).replace(/,/g, ''));
        return Number.isFinite(x) ? x : null;
    };
    // จับคู่แต่ละแถวกับผู้เรียน: รหัส S, เลขประจำตัว, หรือเลขที่
    const matchImport = (rows, codes) => {
        if (!rows.length) return { header: [], idx: {}, matched: [], unmatched: [], missing: codes.list.map(c => c.uid), duplicate: [] };
        const header = rows[0];
        const idx = mapImportHeader(header);
        const bySCode = {}, byStudentCode = {}, byNumber = {};
        codes.list.forEach(c => {
            bySCode[c.code.toUpperCase()] = c.uid;
            if (c.studentCode) byStudentCode[String(c.studentCode).trim()] = c.uid;
            if (c.number !== '' && c.number != null) byNumber[String(parseInt(c.number, 10))] = c.uid;
        });
        const matched = [], unmatched = [], duplicate = [];
        const seen = new Set();
        rows.slice(1).forEach((r, i) => {
            const raw = idx.id != null ? String(r[idx.id] || '').trim() : '';
            const uid = bySCode[raw.toUpperCase()] || byStudentCode[raw] || (/^\d{1,3}$/.test(raw) ? byNumber[String(parseInt(raw, 10))] : undefined);
            const rec = {
                line: i + 2, rawId: raw, uid: uid || null,
                pre: idx.pre != null ? _num(r[idx.pre]) : null,
                post: idx.post != null ? _num(r[idx.post]) : null,
                p19_2: idx.p19_2 != null ? _num(r[idx.p19_2]) : null,
                s3: idx.s3 != null ? _num(r[idx.s3]) : null,
                a: idx.a != null ? _num(r[idx.a]) : null,
                c: idx.c != null ? _num(r[idx.c]) : null,
                peer: idx.peer != null ? String(r[idx.peer] || '').slice(0, 1000) : '',
                exit: idx.exit != null ? String(r[idx.exit] || '').slice(0, 1000) : '',
            };
            if (!uid) unmatched.push(rec);
            else if (seen.has(uid)) duplicate.push(rec);
            else { seen.add(uid); matched.push(rec); }
        });
        const missing = codes.list.filter(c => !seen.has(c.uid)).map(c => c.uid);
        return { header, idx, matched, unmatched, missing, duplicate };
    };

    // ── รูปแบบตัวเลข ─────────────────────────────────────────────────────────
    const fmt = (x, d) => (Number.isFinite(x) ? x.toFixed(d == null ? 2 : d) : '–');
    const fmtP = (p) => (!Number.isFinite(p) ? '–' : p < 0.001 ? '< .001' : p.toFixed(3).replace(/^0/, ''));

    const LO = {
        tsSec, problemCode, shortTitle, unitNo, groupProblems, buildCodes,
        VERDICT_LABEL, verdictOf, e1Scores, rawEarned, pairKey, buildAttempts,
        indexUsage, indexCoach, hintsBeforeAttempts, buildCell, buildMatrix, columnSummary, reconcileWithE1,
        profileMetrics, classifyDefault, GROUP3, GROUP3_LABEL, buildGroups,
        lineDiff, mean, sd, ibeta, tTwoTailedP, pairedStats, pollStats,
        parseCSV, toCSV, IMPORT_FIELDS, mapImportHeader, matchImport, fmt, fmtP,
    };
    root.LO = LO;
    if (typeof module !== 'undefined' && module.exports) module.exports = LO;
})(typeof window !== 'undefined' ? window : globalThis);

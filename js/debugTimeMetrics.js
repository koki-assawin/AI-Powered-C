/**
 * js/debugTimeMetrics.js — ฟังก์ชันคำนวณของแท็บ "เวลาแก้ไขข้อผิดพลาด" (Teacher Analytics)
 *
 * ฟังก์ชันล้วน: ไม่อ่าน/เขียน Firestore ไม่มี JSX ทดสอบด้วย node ได้ (tests/debug_time_metrics.test.js)
 *
 * นิยาม "ช่วงแก้ไขข้อผิดพลาด" ต่อคู่ (นักเรียน, กิจกรรม)
 *   - ได้เต็ม = passedTests === totalTests && totalTests > 0 (ไม่มี totalTests ใช้ score >= 100)
 *   - ส่งครั้งแรกได้เต็ม → ไม่มีช่วงแก้ไข (status 'first')
 *   - t0 = เวลาส่งครั้งแรก (ซึ่งไม่เต็ม), t1 = เวลาส่งครั้งแรกที่ได้เต็มหลัง t0 (ไม่มี → 'unsolved')
 *   - เวลาทำงานจริง = ผลรวมช่วงห่างของเหตุการณ์ที่เรียงตามเวลา (usageEvents ทุกประเภทของคู่นั้น
 *     + เวลาส่งทุกครั้ง) ภายใน [t0, t1] ไม่นับช่วงที่ห่างเกิน IDLE นาที (ช่วงนั้นนับเป็น "ช่วงพัก")
 *   - ค่าที่วัดตรง (ถ้ามี) = ผลรวม timeSpentSeconds / runCount ของการส่งใน (t0, t1]
 *     (timeSpentSeconds = เวลานับจากเปิดโจทย์หรือส่งครั้งก่อน ถึงตอนส่ง) ต้องมีครบทุกครั้งจึงนับ
 *
 * ประกาศไว้ที่ window.DTM
 */
(function (root) {
    // ── เวลา ──────────────────────────────────────────────────────────────────
    const tsSec = (t) => {
        if (t == null) return 0;
        if (typeof t === 'number') return t;
        if (typeof t.seconds === 'number') return t.seconds + (t.nanoseconds || 0) / 1e9;
        if (t.__ts) return Date.parse(t.__ts) / 1000;
        if (typeof t.toMillis === 'function') return t.toMillis() / 1000;
        if (t instanceof Date) return t.getTime() / 1000;
        return 0;
    };
    // วันที่ตามเวลาไทย (UTC+7) เป็นเลขวัน ใช้เทียบว่าวันเดียวกันหรือไม่
    const thaiDay = (sec) => Math.floor((sec + 7 * 3600) / 86400);

    // ── กิจกรรม ───────────────────────────────────────────────────────────────
    // "กิจกรรม 3-A1: ..." → { code: '3-A1', unit: 3 } ; ชื่ออื่น (Quiz, Mini Project) → null
    const parseActivity = (title) => {
        const m = /กิจกรรม\s*(\d+)\s*-\s*([A-Za-z]\d*)/.exec(title || '');
        return m ? { code: m[1] + '-' + m[2], unit: parseInt(m[1], 10) } : null;
    };
    const DIFF_NORM = { 'ง่าย': 'easy', easy: 'easy', 'ปานกลาง': 'medium', medium: 'medium', 'ยาก': 'hard', hard: 'hard' };
    const DIFF_LABEL = { easy: 'ง่าย', medium: 'ปานกลาง', hard: 'ยาก', '': '-' };
    const normDifficulty = (d) => DIFF_NORM[String(d || '').trim().toLowerCase()] || DIFF_NORM[String(d || '').trim()] || '';

    const isFull = (s) => {
        if (!s) return false;
        const tot = Number(s.totalTests);
        if (tot > 0) return Number(s.passedTests) === tot;
        return (Number(s.score) || 0) >= 100;
    };

    // ── สร้างช่วงแก้ไข (ไม่ขึ้นกับ IDLE: เก็บช่วงห่างไว้คำนวณภายหลัง) ─────────
    // submissions: v1 submissions ของรายวิชา · events: usageEvents ของรายวิชา
    // assignments: [{id, title, difficulty}] · uids: Set ของผู้เรียนที่นับ · aids: Set ของกิจกรรมที่นับ
    const buildPairs = ({ submissions = [], events = [], assignments = [], uids, aids }) => {
        const meta = {};
        assignments.forEach(a => {
            const p = parseActivity(a.title);
            if (!p || (aids && !aids.has(a.id))) return;
            meta[a.id] = { aid: a.id, code: p.code, unit: p.unit, difficulty: normDifficulty(a.difficulty), title: a.title };
        });
        const keep = (uid, aid) => !!meta[aid] && (!uids || uids.has(uid));
        const subsBy = {};
        submissions.forEach(s => {
            if (!s || !keep(s.studentId, s.assignmentId)) return;
            const k = s.studentId + '|' + s.assignmentId;
            (subsBy[k] = subsBy[k] || []).push(s);
        });
        const evBy = {};
        events.forEach(e => {
            if (!e || e.userType !== 'student' || !keep(e.uid, e.assignmentId)) return;
            const k = e.uid + '|' + e.assignmentId;
            (evBy[k] = evBy[k] || []).push(tsSec(e.timestamp));
        });

        const pairs = [];
        Object.keys(subsBy).forEach(k => {
            const subs = subsBy[k].sort((a, b) => (tsSec(a.submittedAt) - tsSec(b.submittedAt)) || String(a.id || '').localeCompare(String(b.id || '')));
            const s0 = subs[0];
            const m = meta[s0.assignmentId];
            const base = { uid: s0.studentId, aid: m.aid, code: m.code, unit: m.unit, difficulty: m.difficulty, nSubs: subs.length };
            if (isFull(s0)) { pairs.push({ ...base, status: 'first', everFull: true }); return; }
            const j = subs.findIndex((s, i) => i > 0 && isFull(s));
            if (j < 0) { pairs.push({ ...base, status: 'unsolved', everFull: false, attemptsBefore: subs.length }); return; }
            const t0 = tsSec(s0.submittedAt), t1 = tsSec(subs[j].submittedAt);
            const times = subs.slice(0, j + 1).map(s => tsSec(s.submittedAt))
                .concat((evBy[k] || []).filter(t => t >= t0 && t <= t1))
                .sort((a, b) => a - b);
            const gaps = [];
            for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
            const inner = subs.slice(1, j + 1);
            const hasTime = inner.every(s => Number.isFinite(Number(s.timeSpentSeconds)) && s.timeSpentSeconds !== null && s.timeSpentSeconds !== '');
            const hasRun = inner.every(s => Number.isFinite(Number(s.runCount)) && s.runCount !== null && s.runCount !== '');
            pairs.push({
                ...base, status: 'solved', everFull: true,
                attemptsBefore: j,                       // จำนวนการส่งที่ยังไม่เต็มก่อนได้เต็ม
                wallMin: (t1 - t0) / 60,
                sameDay: thaiDay(t0) === thaiDay(t1),
                nEvents: times.length,
                gaps,
                measuredMin: hasTime ? inner.reduce((a, s) => a + Number(s.timeSpentSeconds), 0) / 60 : null,
                measuredRuns: hasRun ? inner.reduce((a, s) => a + Number(s.runCount), 0) : null,
            });
        });
        return pairs;
    };

    // เติม activeMin และ breaks ตาม IDLE (นาที) ให้ช่วงที่แก้สำเร็จ
    const applyIdle = (pairs, idleMin) => {
        const lim = idleMin * 60;
        return pairs.map(p => {
            if (p.status !== 'solved') return p;
            let act = 0, br = 0;
            p.gaps.forEach(g => { if (g > lim) br++; else act += g; });
            return { ...p, idleMin, activeMin: act / 60, breaks: br, oneSitting: br === 0 };
        });
    };

    const countPairs = (pairs) => ({
        pairs: pairs.length,
        first: pairs.filter(p => p.status === 'first').length,
        everFull: pairs.filter(p => p.everFull).length,
        solved: pairs.filter(p => p.status === 'solved').length,
        unsolved: pairs.filter(p => p.status === 'unsolved').length,
    });

    // ── สถิติพื้นฐาน ─────────────────────────────────────────────────────────
    const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
    const quantile = (xs, q) => {
        if (!xs.length) return NaN;
        const s = [...xs].sort((a, b) => a - b);
        const h = (s.length - 1) * q, lo = Math.floor(h);
        return s[lo] + (h - lo) * ((s[lo + 1] !== undefined ? s[lo + 1] : s[lo]) - s[lo]);
    };
    const median = (xs) => quantile(xs, 0.5);
    const pctDrop = (a, b) => (a > 0 ? (a - b) / a * 100 : NaN);

    // PRNG มี seed (mulberry32) เพื่อให้ bootstrap ได้ผลซ้ำทุกครั้ง
    const rng = (seed) => {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };
    const BOOT_SEED = 20690926;
    // bootstrap แบบสุ่มซ้ำแยกสองกลุ่ม: % ที่มัธยฐานลดลง (ต้น→ปลาย) และ CI แบบเปอร์เซ็นไทล์
    const bootstrapMedianDrop = (early, late, reps = 2000, seed = BOOT_SEED) => {
        if (!early.length || !late.length) return { lo: NaN, hi: NaN, reps: 0 };
        const r = rng(seed);
        const draw = (xs) => { const out = new Array(xs.length); for (let i = 0; i < xs.length; i++) out[i] = xs[Math.floor(r() * xs.length)]; return out; };
        const vals = [];
        for (let i = 0; i < reps; i++) {
            const v = pctDrop(median(draw(early)), median(draw(late)));
            if (Number.isFinite(v)) vals.push(v);
        }
        return { lo: quantile(vals, 0.025), hi: quantile(vals, 0.975), reps };
    };

    // อันดับเฉลี่ยเมื่อค่าซ้ำ (เริ่มที่ 1) และขนาดกลุ่มค่าซ้ำ
    const rankAvg = (xs) => {
        const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
        const ranks = new Array(xs.length);
        const ties = [];
        for (let i = 0; i < idx.length;) {
            let j = i;
            while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
            const r = (i + j) / 2 + 1;
            for (let k = i; k <= j; k++) ranks[idx[k][1]] = r;
            if (j > i) ties.push(j - i + 1);
            i = j + 1;
        }
        return { ranks, ties };
    };

    // Φ(z) ผ่าน erf (Abramowitz & Stegun 7.1.26, คลาดเคลื่อน < 1.5e-7)
    const erf = (x) => {
        const s = x < 0 ? -1 : 1; x = Math.abs(x);
        const t = 1 / (1 + 0.3275911 * x);
        const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
        return s * y;
    };
    const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

    // Wilcoxon signed-rank: d = after − before (ตัด d = 0), normal approximation + tie correction ไม่ใช้ continuity correction
    // z < 0 แปลว่าค่าหลังมักน้อยกว่าค่าก่อน
    const wilcoxon = (before, after) => {
        const d = [];
        before.forEach((b, i) => { const x = after[i] - b; if (Number.isFinite(x) && x !== 0) d.push(x); });
        const n = d.length;
        if (!n) return { n: 0, Wplus: NaN, Wminus: NaN, z: NaN, p: NaN };
        const { ranks, ties } = rankAvg(d.map(Math.abs));
        let Wp = 0;
        d.forEach((x, i) => { if (x > 0) Wp += ranks[i]; });
        const Wm = n * (n + 1) / 2 - Wp;
        const mu = n * (n + 1) / 4;
        const varW = n * (n + 1) * (2 * n + 1) / 24 - ties.reduce((a, t) => a + (t * t * t - t), 0) / 48;
        const z = varW > 0 ? (Wp - mu) / Math.sqrt(varW) : NaN;
        return { n, Wplus: Wp, Wminus: Wm, z, p: Number.isFinite(z) ? 2 * (1 - normCdf(Math.abs(z))) : NaN };
    };

    const pearson = (x, y) => {
        const n = x.length;
        if (n < 3) return NaN;
        const mx = mean(x), my = mean(y);
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
        return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
    };
    const spearman = (x, y) => pearson(rankAvg(x).ranks, rankAvg(y).ranks);

    // ── สรุปผล ───────────────────────────────────────────────────────────────
    const describe = (xs) => ({ n: xs.length, mean: mean(xs), median: median(xs) });

    // ตารางรายหน่วย (ใช้ pairs ที่ผ่าน applyIdle แล้ว)
    const unitTable = (pairs, units = [1, 2, 3, 4, 5]) => units.map(u => {
        const P = pairs.filter(p => p.unit === u);
        const S = P.filter(p => p.status === 'solved');
        const xs = S.map(p => p.activeMin);
        return {
            unit: u, pairs: P.length, first: P.filter(p => p.status === 'first').length,
            solved: S.length, unsolved: P.filter(p => p.status === 'unsolved').length,
            mean: mean(xs), median: median(xs),
            pctOneSitting: S.length ? S.filter(p => p.oneSitting).length / S.length * 100 : NaN,
            pctSameDay: S.length ? S.filter(p => p.sameDay).length / S.length * 100 : NaN,
            meanAttempts: mean(S.map(p => p.attemptsBefore)),
        };
    });

    // เทียบต้นภาค–ปลายภาค ระดับช่วง และระดับบุคคล
    const compare = (pairs, earlyUnits, lateUnits, opts = {}) => {
        const S = pairs.filter(p => p.status === 'solved');
        const eSet = new Set(earlyUnits), lSet = new Set(lateUnits);
        const E = S.filter(p => eSet.has(p.unit)), Lt = S.filter(p => lSet.has(p.unit));
        const ex = E.map(p => p.activeMin), lx = Lt.map(p => p.activeMin);
        const de = describe(ex), dl = describe(lx);
        const boot = bootstrapMedianDrop(ex, lx, opts.reps || 2000, opts.seed == null ? BOOT_SEED : opts.seed);

        const per = {};
        E.forEach(p => { (per[p.uid] = per[p.uid] || { e: [], l: [] }).e.push(p.activeMin); });
        Lt.forEach(p => { (per[p.uid] = per[p.uid] || { e: [], l: [] }).l.push(p.activeMin); });
        const people = Object.keys(per).filter(u => per[u].e.length && per[u].l.length)
            .map(u => ({ uid: u, nEarly: per[u].e.length, nLate: per[u].l.length, early: median(per[u].e), late: median(per[u].l) }));
        const w = wilcoxon(people.map(x => x.early), people.map(x => x.late));
        return {
            early: de, late: dl,
            pctDropMean: pctDrop(de.mean, dl.mean),
            pctDropMedian: pctDrop(de.median, dl.median),
            ciLo: boot.lo, ciHi: boot.hi, reps: boot.reps,
            people,
            indiv: {
                n: people.length,
                decreased: people.filter(x => x.late < x.early).length,
                increased: people.filter(x => x.late > x.early).length,
                medianEarly: median(people.map(x => x.early)),
                medianLate: median(people.map(x => x.late)),
                ...w,
            },
        };
    };

    // ค่าที่วัดตรง (timeSpentSeconds) เทียบค่าประมาณ
    const directCheck = (pairs) => {
        const S = pairs.filter(p => p.status === 'solved' && p.measuredMin != null);
        const est = S.map(p => p.activeMin), mea = S.map(p => p.measuredMin);
        return {
            n: S.length,
            rows: S,
            meanEst: mean(est), medianEst: median(est),
            meanMeasured: mean(mea), medianMeasured: median(mea),
            meanWall: mean(S.map(p => p.wallMin)),
            rho: spearman(est, mea),
            rhoRuns: (() => {
                const R = S.filter(p => p.measuredRuns != null);
                return spearman(R.map(p => p.activeMin), R.map(p => p.measuredRuns));
            })(),
        };
    };

    const EASY_MED = new Set(['easy', 'medium']);
    // ตารางความไว: IDLE หลายค่า × (ทุกระดับ / ง่าย+ปานกลาง)
    const sensitivity = (basePairs, earlyUnits, lateUnits, idles = [10, 15, 30]) => {
        const rows = [];
        [['all', 'ทุกระดับความยาก'], ['easyMed', 'ง่าย + ปานกลาง']].forEach(([key, label]) => {
            const P0 = key === 'all' ? basePairs : basePairs.filter(p => EASY_MED.has(p.difficulty));
            idles.forEach(idle => {
                const c = compare(applyIdle(P0, idle), earlyUnits, lateUnits);
                rows.push({ filter: key, filterLabel: label, idle, ...c });
            });
        });
        return rows;
    };

    // ── รูปแบบ / CSV ─────────────────────────────────────────────────────────
    const fmt = (x, d) => (Number.isFinite(x) ? x.toFixed(d == null ? 2 : d) : '–');
    const fmtP = (p) => (!Number.isFinite(p) ? '–' : p < 0.001 ? '< .001' : p.toFixed(3).replace(/^0/, ''));
    const csvCell = (v) => {
        const s = v == null ? '' : String(v);
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const toCSV = (rows) => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n');

    const DTM = {
        tsSec, thaiDay, parseActivity, normDifficulty, DIFF_LABEL, isFull,
        buildPairs, applyIdle, countPairs,
        mean, median, quantile, pctDrop, rng, BOOT_SEED, bootstrapMedianDrop,
        rankAvg, normCdf, wilcoxon, pearson, spearman,
        unitTable, compare, directCheck, sensitivity, EASY_MED,
        fmt, fmtP, toCSV,
    };
    root.DTM = DTM;
    if (typeof module !== 'undefined' && module.exports) module.exports = DTM;
})(typeof window !== 'undefined' ? window : globalThis);

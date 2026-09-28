// อ่านจากแคชอย่างเดียว — รอบสอง: นับคำใบ้จากทั้ง coachInteractions และ usageEvents
const path = require('path');
const ROOT = 'C:/xampp/htdocs/AI-Powered-C';
const C = n => require(path.join(ROOT, 'backups', 'report-cache', n + '.json'));
const dt = v => v && v.__ts ? new Date(v.__ts) : null;
const th = d => d.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
const subs = C('submissions'), coach = C('coachInteractions'), usage = C('usageEvents'), assignments = C('assignments');

const ids = { S30: 'oOFtjkhgy0hvNIK5Z68mGO5Ykij2', S21: 'YYYQmKGeqzTcbxi7Tw7RnOWFTD82', S32: 'rpVUlen1y5g0s9704pMoZWc73xq2' };
const graded = assignments.filter(a => a.isPublished !== false && a.unitName);
const codeOf = t => { const m = /กิจกรรม\s*([0-9]+-[A-Z][0-9]?)/.exec(t || ''); return m ? m[1] : null; };
const byCode = {}; graded.forEach(a => { const c = codeOf(a.title); if (c) byCode[c] = a; });
const PRIORITY = ['3-A5', '1-C', '4-C', '2-B'];
const BANNED = ['1-A'];
const lvOf = e => { const m = /^hint_level_(\d)/.exec(e || ''); return m ? +m[1] : null; };
const COND = {
    S30: lv => lv.some(l => l >= 3),
    S21: lv => lv.length > 0 && lv.every(l => l <= 2),
    S32: lv => lv.length === 0,
};

const scan = (scode, codes, label) => {
    const uid = ids[scode];
    console.log('\n--- ' + scode + ' : ' + label);
    let found = null;
    for (const code of codes) {
        const a = byCode[code];
        if (!a || BANNED.includes(code)) continue;
        const ss = subs.filter(s => s.studentId === uid && s.assignmentId === a.id)
            .map(s => ({ ...s, _at: dt(s.submittedAt) })).filter(s => s._at).sort((x, y) => x._at - y._at);
        const hc = coach.filter(c => c.uid === uid && c.coachRole === 'socratic' && lvOf(c.triggerEvent) && c.relatedId === a.title)
            .map(c => ({ src: 'coach', level: lvOf(c.triggerEvent), at: dt(c.createdAt), id: c.id })).filter(h => h.at);
        const hu = usage.filter(u => u.uid === uid && u.event === 'ai_hint' && u.assignmentId === a.id)
            .map(u => ({ src: 'usage', level: +u.hintLevel || null, at: dt(u.timestamp) })).filter(h => h.at);
        const hs = [...hc, ...hu].sort((x, y) => x.at - y.at);
        for (let i = 0; i < ss.length - 1; i++) {
            const A = ss[i], B = ss[i + 1];
            if ((A.score || 0) >= 100 || (B.score || 0) !== 100) continue;
            const bt = hs.filter(h => h.at > A._at && h.at <= B._at);
            const lv = bt.map(h => h.level);
            const ok = COND[scode](lv);
            console.log('   ' + (ok ? '✔' : '·') + ' ' + code + ' ส่งครั้งที่ ' + (i + 1) + '→' + (i + 2) + '/' + ss.length +
                ' คะแนน ' + (A.score || 0) + '→' + B.score + ' | ' + th(A._at) + ' → ' + th(B._at) +
                ' | คำใบ้ระหว่างนั้น: ' + (bt.length ? bt.map(h => h.src + ':lv' + h.level).join(', ') : 'ไม่มี'));
            if (ok && !found) found = { code, aid: a.id, title: a.title, iA: i + 1, iB: i + 2, A, B, between: bt, nSubs: ss.length };
        }
    }
    console.log('   => ' + (found ? 'เลือก ' + found.code + ' ' + found.iA + '→' + found.iB : 'ไม่พบ'));
    return found;
};

const picked = {};
for (const sc of ['S30', 'S21', 'S32']) picked[sc] = scan(sc, PRIORITY, 'กิจกรรมตามลำดับที่กำหนด');

console.log('\n\n===== ตรวจเพิ่มเติม (เพื่อรายงาน ไม่ใช่การเลือกแทน) =====');
const allCodes = Object.keys(byCode).filter(c => !PRIORITY.includes(c) && !BANNED.includes(c)).sort();
for (const sc of ['S30', 'S21', 'S32']) if (!picked[sc]) scan(sc, allCodes, 'กิจกรรมอื่นนอกรายการที่กำหนด');

require('fs').writeFileSync(path.join(ROOT, 'backups', 'report-cache', 'picked.json'), JSON.stringify(
    Object.fromEntries(Object.entries(picked).map(([k, v]) => [k, v && {
        code: v.code, aid: v.aid, title: v.title, iA: v.iA, iB: v.iB, nSubs: v.nSubs,
        subA: v.A.id, subB: v.B.id, atA: v.A._at, atB: v.B._at,
        between: v.between.map(h => ({ src: h.src, level: h.level, at: h.at, id: h.id || null })),
    }])), null, 1));

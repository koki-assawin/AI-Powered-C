/**
 * seed-activity-31.js
 * Creates Activity 3.1 Loop Autopsy in Firestore using Firebase CLI OAuth token.
 * Run: node seed-activity-31.js
 */
const fs    = require('fs');
const https = require('https');

const PROJECT  = 'ai-powered-coding-596ed';
const COURSE_ID = 'UZGy0pGurry9Dt9YdhYX';  // ว31281 1/69
const BASE_URL  = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// ── Get fresh access token from Firebase CLI credentials ───────────
function getAccessToken() {
    return new Promise((resolve, reject) => {
        const cfg = JSON.parse(fs.readFileSync('C:/Users/Lenovo/.config/configstore/firebase-tools.json', 'utf8'));
        const rt  = cfg.tokens.refresh_token;
        const api = require('D:/AppData/Roaming/npm/node_modules/firebase-tools/lib/api.js');
        const body = new URLSearchParams({
            client_id:     api.clientId(),
            client_secret: api.clientSecret(),
            refresh_token: rt,
            grant_type:    'refresh_token',
        }).toString();
        const req = https.request({
            hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                const r = JSON.parse(d);
                r.access_token ? resolve(r.access_token) : reject(new Error(d));
            });
        });
        req.on('error', reject);
        req.write(body); req.end();
    });
}

// ── Firestore REST helper ──────────────────────────────────────────
function firestorePost(token, collection, docBody) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(docBody);
        const req  = https.request({
            hostname: 'firestore.googleapis.com',
            path:     `/v1/projects/${PROJECT}/databases/(default)/documents/${collection}`,
            method:   'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type':  'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                const r = JSON.parse(d);
                r.name ? resolve(r.name.split('/').pop()) : reject(new Error(d));
            });
        });
        req.on('error', reject);
        req.write(body); req.end();
    });
}

// ── Convert JS value → Firestore REST value format ────────────────
function toFV(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string')  return { stringValue: v };
    if (Array.isArray(v))       return { arrayValue: { values: v.map(toFV) } };
    if (typeof v === 'object')  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, toFV(val)])) } };
    return { stringValue: String(v) };
}
function toDoc(obj) {
    return { fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toFV(v)])) };
}

// ── Activity data ──────────────────────────────────────────────────
const activity = {
    courseId:     COURSE_ID,
    title:        'กิจกรรม 3.1 — ด่านย่อยที่ 1: ชันสูตรลูป (Loop Autopsy)',
    description:  'สแกน 3 เคสซอร์สโค้ดพัง วิเคราะห์พฤติกรรมลูปและบันทึกผลการชันสูตรเชิงตรรกะ',
    activityType: 'autopsy',
    isPublished:  true,
    xpReward:     40,
    order:        Date.now(),
    aiCoach: { allowHint: true, allowAnalysis: false, maxHintsPerSub: 2 },
    createdBy:    'seed-script',
    codingConfig: null,
    quizConfig:   null,
    prePostConfig: null,
    autopsyConfig: {
        language:    'c',
        totalPoints: 100,
        cases: [
            {
                caseId:      'case_1',
                label:       'Case 1 — ลูปอนันต์ (Infinite Loop)',
                buggyCode:   '#include <stdio.h>\nint main() {\n    int i;\n    for (i = 1; i > 0; i++) {\n        printf("%d\\n", i);\n    }\n    return 0;\n}',
                bugType:     'infinite_loop',
                expectedFix: 'เปลี่ยนเงื่อนไขเป็น i <= 10 (กำหนดขอบเขตบนที่จะเป็นเท็จในที่สุด)',
                explanation: 'เงื่อนไข i > 0 เป็นจริงตลอด เพราะ i เริ่มที่ 1 และเพิ่มขึ้นเรื่อยๆ (i++)\nตัวเลขรัวออกหน้าจอไม่หยุด จนกว่า integer overflow จะเกิดขึ้น\nเปรียบเหมือนน้ำตกตัวเลขที่ไหลไม่หยุด',
                hints:       ['ดูเงื่อนไข for: i > 0 กับ i++ ค่า i จะเป็น 0 ได้หรือไม่?', 'เงื่อนไขหยุดต้องเป็น false ในที่สุด ลองเปลี่ยน > เป็น <= แล้วกำหนดขอบเขตบน'],
                points:      34,
            },
            {
                caseId:      'case_2',
                label:       'Case 2 — ลูปนิ่งเฉย (Dead Loop)',
                buggyCode:   '#include <stdio.h>\nint main() {\n    int i;\n    for (i = 5; i < 1; i++) {\n        printf("%d\\n", i);\n    }\n    printf("จบการทำงาน\\n");\n    return 0;\n}',
                bugType:     'logic_error',
                expectedFix: 'เปลี่ยน i = 5 เป็น i = 1 หรือเปลี่ยนเงื่อนไขเป็น i <= 10',
                explanation: 'i เริ่มต้นที่ 5 แต่เงื่อนไขคือ i < 1\nตั้งแต่ก้าวแรก 5 < 1 เป็นเท็จทันที ลูปไม่ทำงานแม้แต่ครั้งเดียว\nจอแสดงเพียง "จบการทำงาน" เท่านั้น (จอดำสนิทในส่วนตัวเลข)',
                hints:       ['เปรียบค่าเริ่มต้น i=5 กับเงื่อนไข i<1: ตั้งแต่แรก 5<1 เป็นจริงหรือเท็จ?', 'for loop ตรวจเงื่อนไขก่อนรันครั้งแรกเสมอ — ถ้าเท็จทันทีจะไม่ทำงานเลย'],
                points:      33,
            },
            {
                caseId:      'case_3',
                label:       'Case 3 — ลูปข้ามขั้น (Step Loop)',
                buggyCode:   '#include <stdio.h>\nint main() {\n    int i;\n    for (i = 1; i <= 5; i = i + 2) {\n        printf("%d\\n", i);\n    }\n    return 0;\n}',
                bugType:     'off_by_one',
                expectedFix: 'ถ้าต้องการทุกตัวเลข 1-5 ให้เปลี่ยน i = i+2 เป็น i++ (หรือ i = i+1)',
                explanation: 'i เพิ่มทีละ 2 ทุกรอบ: 1 → 3 → 5 → 7 (7>5 หยุด)\nผลลัพธ์ที่ได้คือ 1, 3, 5 เฉพาะเลขคี่\nถ้าต้องการ 1,2,3,4,5 ครบทุกตัว ต้องใช้ i++ แทน i=i+2',
                hints:       ['ติดตามค่า i แต่ละรอบ: 1 → ? → ? (บวก 2 ทุกรอบ)', 'ส่วน update ของ for คือ i=i+2 ซึ่งข้ามเลขคู่ทั้งหมด'],
                points:      33,
            },
        ],
    },
};

// ── Main ───────────────────────────────────────────────────────────
(async () => {
    try {
        process.stdout.write('🔑 กำลังขอ access token จาก Firebase CLI... ');
        const token = await getAccessToken();
        console.log('✅ ได้แล้ว');

        process.stdout.write('📝 กำลังสร้างกิจกรรมใน Firestore... ');
        const docId = await firestorePost(token, 'assignments_v2', toDoc(activity));
        console.log('✅ สำเร็จ!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📌 ชื่อ  :', activity.title);
        console.log('🆔 ID   :', docId);
        console.log('📚 วิชา :', COURSE_ID, '(ว31281 1/69)');
        console.log('🎮 XP   :', activity.xpReward, 'XP | 3 เคส | 100 คะแนน');
        console.log('🔗 ทดสอบ: https://koki-assawin.github.io/AI-Powered-C/#/student/activity/' + docId);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ นักเรียนจะเห็นใน Dashboard → "🎯 กิจกรรมที่ได้รับมอบหมาย" ทันที');
    } catch (err) {
        console.error('\n❌ Error:', err.message || err);
        process.exit(1);
    }
})();

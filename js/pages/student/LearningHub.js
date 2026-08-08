// js/pages/student/LearningHub.js - ศูนย์การเรียนรู้ ว31281 v1.0

// ── CSS ────────────────────────────────────────────────────
const _LH_CSS_DONE = { v: false };
function _lh_injectCss() {
    if (_LH_CSS_DONE.v) return;
    _LH_CSS_DONE.v = true;
    const s = document.createElement('style');
    s.textContent = `
        @keyframes lh-fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes lh-glow   { 0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.4)} 50%{box-shadow:0 0 0 6px rgba(59,130,246,.1)} }
        .lh-fade { animation: lh-fadeUp .3s ease forwards; }
        .lh-code { font-family:'JetBrains Mono',monospace; font-size:13px; line-height:1.7;
                   background:#1e1e2e; color:#cdd6f4; border-radius:10px; padding:16px; overflow-x:auto; }
        .lh-line  { display:block; padding:1px 6px; border-radius:3px; transition:background .15s; }
        .lh-line.hl { background:rgba(234,179,8,.22); border-left:3px solid #eab308; padding-left:3px; }
        .lh-line.dim { color:#6b7280; }
        .lh-tip { background:#eff6ff; border-left:3px solid #3b82f6; border-radius:6px;
                  padding:8px 12px; font-size:13px; color:#1e40af; margin:4px 0; }
        .lh-warn { background:#fffbeb; border-left:3px solid #f59e0b; border-radius:6px;
                   padding:8px 12px; font-size:13px; color:#92400e; margin:4px 0; }
        .lh-tag { display:inline-block; font-size:11px; font-weight:600; padding:2px 8px;
                  border-radius:20px; margin:2px; }
        .lh-sidebar-btn { width:100%; text-align:left; padding:8px 12px; border-radius:8px;
                          border:none; background:transparent; cursor:pointer; font-size:13px;
                          transition:background .15s; font-family:inherit; }
        .lh-sidebar-btn:hover { background:#f1f5f9; }
        .lh-sidebar-btn.active { background:#dbeafe; color:#1d4ed8; font-weight:600; }
        .lh-accordion { border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin:8px 0; }
        .lh-acc-head { background:#f8fafc; padding:10px 14px; cursor:pointer; font-weight:600;
                       font-size:14px; display:flex; justify-content:space-between; align-items:center; }
        .lh-acc-body { padding:12px 14px; font-size:13px; line-height:1.7; }
        .lh-flowbox  { border:2px solid currentColor; border-radius:6px; padding:8px 16px;
                       text-align:center; font-size:13px; font-weight:500; }
        .lh-diamond  { width:90px; height:90px; transform:rotate(45deg); display:inline-block;
                       border:2px solid #8b5cf6; background:#f5f3ff; }
        .lh-diamond span { display:block; transform:rotate(-45deg) translateY(28px); font-size:11px;
                           font-weight:600; color:#6d28d9; text-align:center; }
    `;
    document.head.appendChild(s);
}

// ── Unit metadata ──────────────────────────────────────────
const _LH_UNITS = [
    { id:1, title:'หน่วยที่ 1', name:'โครงสร้างโปรแกรม C + I/O',  icon:'🏗️', color:'#3b82f6', plans:'แผนที่ 1-9'  },
    { id:2, title:'หน่วยที่ 2', name:'โครงสร้างการตัดสินใจ',       icon:'🔀', color:'#8b5cf6', plans:'แผนที่ 10-18'},
    { id:3, title:'หน่วยที่ 3', name:'โครงสร้างการวนซ้ำ',          icon:'🔄', color:'#10b981', plans:'แผนที่ 19-28'},
    { id:4, title:'หน่วยที่ 4', name:'อาร์เรย์และฟังก์ชัน',        icon:'📦', color:'#f59e0b', plans:'แผนที่ 29-37'},
    { id:5, title:'หน่วยที่ 5', name:'Mini Project + AI Ethics',  icon:'🚀', color:'#ef4444', plans:'หน่วยใหม่'  },
];

// ── Built-in topic data ────────────────────────────────────
const _LH_TOPICS = [
/* ===== UNIT 1 ===== */
{id:'u1t1',unitId:1,order:1,icon:'👋',title:'โครงสร้างโปรแกรม Hello World',
 paras:[
  'โปรแกรมภาษา C ทุกโปรแกรมต้องมีฟังก์ชัน <code>main()</code> เป็นจุดเริ่มต้นการทำงาน โดยมีโครงสร้างพื้นฐาน 4 ส่วนหลัก',
  '<b>#include &lt;stdio.h&gt;</b> — นำไลบรารีมาตรฐานเข้ามา ทำให้ใช้ printf/scanf ได้ | <b>int main()</b> — ฟังก์ชันหลัก คืนค่า 0 หมายถึงสำเร็จ | <b>{ }</b> — บล็อกคำสั่ง | <b>return 0;</b> — จบการทำงาน',
 ],
 code:`#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
 steps:[
  {line:0,label:'#include <stdio.h>',  note:'นำ Standard I/O library เข้ามาใช้งาน'},
  {line:2,label:'int main()',          note:'จุดเริ่มต้นโปรแกรม ทุกโปรแกรมต้องมีฟังก์ชันนี้'},
  {line:3,label:'printf(...)',         note:'พิมพ์ข้อความออกหน้าจอ \\n = ขึ้นบรรทัดใหม่'},
  {line:4,label:'return 0;',           note:'ส่งค่า 0 กลับ หมายถึงโปรแกรมทำงานสำเร็จ'},
 ],
 tips:['#include ต้องอยู่บนสุดของไฟล์','ทุก statement ต้องจบด้วย ; (semicolon)','{ } ต้องเป็นคู่กันเสมอ','printf ใช้ \\ นำหน้า \\n \\t'],
 warn:'ลืม semicolon คือ syntax error ที่พบบ่อยที่สุด!',
},
{id:'u1t2',unitId:1,order:2,icon:'🗂️',title:'ชนิดข้อมูลและตัวแปร',
 paras:[
  'ตัวแปร (Variable) คือพื้นที่ในหน่วยความจำสำหรับเก็บข้อมูล ต้องประกาศก่อนใช้งาน โดยระบุ <b>ชนิดข้อมูล</b> และ <b>ชื่อตัวแปร</b>',
  'ชนิดข้อมูลหลักในภาษา C: <b>int</b> จำนวนเต็ม (4 bytes) | <b>float</b> ทศนิยม 7 หลัก | <b>double</b> ทศนิยม 15 หลัก | <b>char</b> ตัวอักษร 1 ตัว (1 byte)',
 ],
 code:`#include <stdio.h>

int main() {
    int age = 17;
    float gpa = 3.85;
    double pi = 3.14159265;
    char grade = 'A';

    printf("อายุ: %d ปี\\n", age);
    printf("GPA: %.2f\\n", gpa);
    printf("เกรด: %c\\n", grade);
    return 0;
}`,
 steps:[
  {line:3,label:'int age = 17;',        note:'ประกาศตัวแปร int ชื่อ age กำหนดค่า 17'},
  {line:4,label:'float gpa = 3.85;',    note:'ทศนิยม 7 หลัก ใช้ %f ใน printf'},
  {line:5,label:'double pi = ...',      note:'ทศนิยมความแม่นสูง ใช้ %lf'},
  {line:6,label:'char grade = \'A\';',  note:'ตัวอักษรใช้เครื่องหมาย\' \' ใช้ %c'},
  {line:8,label:'printf %d',           note:'%d = แสดงจำนวนเต็ม ตรงกับ int'},
 ],
 tips:['int เก็บได้ -2,147,483,648 ถึง 2,147,483,647','char ใช้เครื่องหมาย single quote \'A\' ไม่ใช่ "A"','ตั้งชื่อตัวแปรด้วยตัวอักษร/_ ห้ามขึ้นต้นด้วยตัวเลข'],
 warn:'int x, y, z; ประกาศหลายตัวพร้อมกันได้ แต่ชัดกว่าถ้าแยกบรรทัด',
},
{id:'u1t3',unitId:1,order:3,icon:'🔢',title:'ตัวดำเนินการ (Operators)',
 paras:[
  'ตัวดำเนินการ (Operator) คือสัญลักษณ์ที่ใช้คำนวณหรือเปรียบเทียบค่า แบ่งเป็น 3 กลุ่มหลัก',
  '<b>Arithmetic:</b> + - * / % | <b>Relational:</b> == != &gt; &lt; &gt;= &lt;= | <b>Logical:</b> && (AND) || (OR) ! (NOT)',
 ],
 code:`#include <stdio.h>

int main() {
    int a = 10, b = 3;

    printf("%d + %d = %d\\n", a, b, a+b);   // 13
    printf("%d - %d = %d\\n", a, b, a-b);   // 7
    printf("%d * %d = %d\\n", a, b, a*b);   // 30
    printf("%d / %d = %d\\n", a, b, a/b);   // 3 (หาร int)
    printf("%d %% %d = %d\\n", a, b, a%b);  // 1 (เศษ)

    // Relational → ผล 1=จริง 0=เท็จ
    printf("a > b: %d\\n", a > b);  // 1
    return 0;
}`,
 steps:[
  {line:3,label:'int a=10, b=3;',   note:'ประกาศ 2 ตัวแปรในบรรทัดเดียว'},
  {line:7,label:'a / b = 3',        note:'int หาร int ได้ int เศษทิ้ง (ไม่ใช่ 3.33)'},
  {line:8,label:'a % b = 1',        note:'% คือ modulo หาเศษจากการหาร 10÷3 เหลือ 1'},
  {line:11,label:'a > b = 1',       note:'เปรียบเทียบ true=1 false=0'},
 ],
 tips:['10 / 3 = 3 (int division)', '10.0 / 3 = 3.333 (float division)','% ใช้กับ int เท่านั้น','ใน printf %% พิมพ์เครื่องหมาย % จริงๆ'],
},
{id:'u1t4',unitId:1,order:4,icon:'🖨️',title:'printf และ Format Specifier',
 paras:[
  'printf เป็นฟังก์ชันสำหรับแสดงผลข้อมูล ใช้ <b>format specifier</b> เป็นตัวแทนของค่าที่ต้องการแสดง เช่น %d สำหรับ int',
  'Format specifiers หลัก: %d (int) | %f (float) | %lf (double) | %c (char) | %s (string) | %ld (long int)',
 ],
 code:`#include <stdio.h>

int main() {
    int  n = 42;
    float  f = 3.14159;
    char  c = 'K';
    char  s[] = "APCC";

    printf("จำนวนเต็ม: %d\\n", n);
    printf("ทศนิยม 2 ตำแหน่ง: %.2f\\n", f);
    printf("กว้าง 8 หลัก: %8d\\n", n);
    printf("ตัวอักษร: %c\\n", c);
    printf("ข้อความ: %s\\n", s);
    return 0;
}`,
 steps:[
  {line:8,label:'%d แสดง int',           note:'พิมพ์ค่า 42 ตรงๆ'},
  {line:9,label:'%.2f ทศนิยม 2 ตำแหน่ง',note:'3.14159 → 3.14 (ปัดเศษอัตโนมัติ)'},
  {line:10,label:'%8d จัดให้กว้าง 8',    note:'จัดชิดขวา "      42" (เว้น 6 ช่อง)'},
 ],
 tips:['%-8d จัดชิดซ้าย','%08d เติมศูนย์ข้างหน้า','%e แสดง scientific notation','\\n ขึ้นบรรทัด \\t tab'],
},
{id:'u1t5',unitId:1,order:5,icon:'⌨️',title:'scanf รับข้อมูลจากผู้ใช้',
 paras:[
  'scanf ใช้รับข้อมูลจากคีย์บอร์ด สำคัญมาก: ต้องใส่ <b>&</b> (address-of operator) นำหน้าตัวแปรเสมอ ยกเว้น array/string',
  'รูปแบบ: scanf("%d %f", &a, &b); — & หมายถึง "เอาค่าที่ผู้ใช้พิมพ์ไปเก็บที่ address ของตัวแปร"',
 ],
 code:`#include <stdio.h>

int main() {
    int age;
    float weight;

    printf("กรอกอายุ: ");
    scanf("%d", &age);

    printf("กรอกน้ำหนัก: ");
    scanf("%f", &weight);

    printf("คุณอายุ %d ปี น้ำหนัก %.1f kg\\n",
           age, weight);
    return 0;
}`,
 steps:[
  {line:6,label:'printf ถาม',    note:'แสดงคำถาม ไม่มี \\n เพื่อให้พิมพ์ต่อในบรรทัดเดียว'},
  {line:7,label:'scanf %d &age', note:'& ส่ง address ของตัวแปร ให้ scanf เขียนค่าลงไป'},
  {line:12,label:'พิมพ์ผล',     note:'ใช้ค่าที่รับมาแสดงผล'},
 ],
 tips:['ลืม & เป็น runtime error ที่พบบ่อยมาก','scanf("%s", str) ไม่ต้องใส่ & เพราะ array ชี้อยู่แล้ว','scanf หยุดรับเมื่อเจอ space/newline','ใช้ fgets() สำหรับรับ string ที่มี space'],
 warn:'ลืม & นำหน้าตัวแปรใน scanf = โปรแกรม crash หรือให้ค่าผิดพลาด!',
},
{id:'u1t6',unitId:1,order:6,icon:'📐',title:'Flowchart และ Pseudocode',
 paras:[
  'ก่อนเขียนโปรแกรม ควรออกแบบขั้นตอนด้วย Flowchart หรือ Pseudocode เพื่อให้เห็นภาพรวมก่อน แล้วค่อยแปลเป็นโค้ด',
  'สัญลักษณ์ Flowchart: วงรี=เริ่ม/จบ | สี่เหลี่ยมผืนผ้า=คำสั่ง | ขนมเปียกปูน=เงื่อนไข | ขนานเข้า/ออก=รับ/แสดงผล',
 ],
 code:`// Pseudocode: หาพื้นที่สี่เหลี่ยม
// INPUT: กว้าง, ยาว
// PROCESS: พื้นที่ = กว้าง × ยาว
// OUTPUT: พื้นที่

#include <stdio.h>

int main() {
    float w, h, area;

    printf("กว้าง (m): "); scanf("%f", &w);
    printf("ยาว  (m): "); scanf("%f", &h);

    area = w * h;  // PROCESS

    printf("พื้นที่ = %.2f ตร.ม.\\n", area);
    return 0;
}`,
 steps:[
  {line:0,label:'วางแผน IPO',    note:'Input → Process → Output ก่อนเขียนโค้ดเสมอ'},
  {line:9,label:'รับ Input',      note:'รับ w และ h จากผู้ใช้'},
  {line:12,label:'คำนวณ Process', note:'area = w × h (สูตร)'},
  {line:14,label:'แสดง Output',   note:'พิมพ์ผลลัพธ์'},
 ],
 tips:['IPO = Input → Process → Output ใช้วางแผนทุกโปรแกรม','Flowchart ช่วยให้เห็น logic ก่อนโค้ด','Pseudocode เขียนเป็นภาษาคน ไม่ต้องตรง syntax'],
},

/* ===== UNIT 2 ===== */
{id:'u2t1',unitId:2,order:1,icon:'🔂',title:'คำสั่ง if และ if-else',
 paras:[
  'คำสั่ง if ใช้ตรวจสอบเงื่อนไข ถ้าเงื่อนไขเป็นจริง (≠0) จะทำคำสั่งในบล็อก { } ถ้าไม่จริงจะข้ามไป',
  'if-else เพิ่มทางเลือกที่ 2: ถ้าเงื่อนไขเป็น <b>จริง</b> → บล็อก if | ถ้าเป็น <b>เท็จ</b> → บล็อก else',
 ],
 code:`#include <stdio.h>

int main() {
    int score;
    printf("กรอกคะแนน: ");
    scanf("%d", &score);

    if (score >= 50) {
        printf("ผ่าน ✓\\n");
    } else {
        printf("ไม่ผ่าน ✗\\n");
    }

    // ตัวอย่าง if ธรรมดา
    if (score == 100) {
        printf("คะแนนเต็ม! ยอดเยี่ยม\\n");
    }

    return 0;
}`,
 steps:[
  {line:7,label:'if (score >= 50)',  note:'เงื่อนไข: score มากกว่าหรือเท่ากับ 50?'},
  {line:8,label:'→ จริง: ผ่าน',     note:'ถ้าใช่ ทำบรรทัดนี้'},
  {line:9,label:'else',              note:'มิฉะนั้น (เงื่อนไขเท็จ)'},
  {line:10,label:'→ เท็จ: ไม่ผ่าน', note:'ถ้าไม่ใช่ ทำบรรทัดนี้'},
 ],
 tips:['== ใช้เปรียบเทียบ | = ใช้กำหนดค่า (คนละอย่าง!)','ถ้ามีคำสั่งเดียวไม่ต้องใช้ { } แต่แนะนำให้ใส่เสมอ','เงื่อนไข 0 = เท็จ ค่าอื่นๆ = จริง'],
 warn:'if (x = 5) ← นี่คือ assignment ไม่ใช่ comparison! ควรเป็น if (x == 5)',
},
{id:'u2t2',unitId:2,order:2,icon:'🌿',title:'Nested if และ if-else if',
 paras:[
  'if-else if ใช้เมื่อมีหลายเงื่อนไขที่ต้องตรวจ ระบบจะตรวจจากบนลงล่าง และหยุดเมื่อพบเงื่อนไขแรกที่จริง',
  'Nested if คือ if ข้างในอีก if ใช้สำหรับเงื่อนไขที่ต้องตรวจหลายระดับ',
 ],
 code:`#include <stdio.h>

int main() {
    int score;
    printf("คะแนน: "); scanf("%d", &score);

    if (score >= 80) {
        printf("A — ดีเยี่ยม\\n");
    } else if (score >= 70) {
        printf("B — ดี\\n");
    } else if (score >= 60) {
        printf("C — พอใช้\\n");
    } else if (score >= 50) {
        printf("D — ผ่าน\\n");
    } else {
        printf("F — ไม่ผ่าน\\n");
    }

    return 0;
}`,
 steps:[
  {line:6,label:'ตรวจ >= 80 ก่อน',    note:'ถ้าจริงพิมพ์ A แล้วออก'},
  {line:8,label:'ถ้าไม่ใช่ ตรวจ >= 70', note:'เงื่อนไขถัดไปตรวจเฉพาะเมื่อของบนเป็นเท็จ'},
  {line:14,label:'else สุดท้าย',        note:'ทำเมื่อไม่ตรงกับเงื่อนไขใดเลย'},
 ],
 tips:['เรียงเงื่อนไขจากมากไปน้อย (>= 80 ก่อน >= 70)','else if ที่อยู่ถัดไปจะตรวจเฉพาะเมื่อของบนเป็นเท็จ','ไม่มีขีดจำกัดจำนวน else if'],
},
{id:'u2t3',unitId:2,order:3,icon:'🎛️',title:'คำสั่ง switch-case',
 paras:[
  'switch-case ใช้เมื่อต้องเปรียบเทียบตัวแปรกับค่าคงที่หลายค่า อ่านง่ายกว่า if-else if เมื่อมีหลายกรณี',
  'หลังแต่ละ case ต้องมี <b>break;</b> เพื่อหยุด ถ้าไม่ใส่จะ "fall through" ทำ case ถัดไปต่อเลย',
 ],
 code:`#include <stdio.h>

int main() {
    int day;
    printf("วันที่ (1-7): "); scanf("%d", &day);

    switch (day) {
        case 1: printf("วันจันทร์\\n"); break;
        case 2: printf("วันอังคาร\\n"); break;
        case 3: printf("วันพุธ\\n");   break;
        case 4: printf("วันพฤหัสบดี\\n"); break;
        case 5: printf("วันศุกร์\\n"); break;
        case 6:
        case 7:
            printf("วันหยุดสุดสัปดาห์\\n"); break;
        default:
            printf("ไม่ถูกต้อง\\n");
    }
    return 0;
}`,
 steps:[
  {line:6,label:'switch(day)',     note:'กระโดดไปยัง case ที่ตรงกับค่า day'},
  {line:7,label:'case 1: ... break', note:'break ออกจาก switch ทันที'},
  {line:12,label:'case 6: case 7:', note:'2 case ชี้คำสั่งเดียว = รวมกรณี'},
  {line:16,label:'default:',       note:'ทำเมื่อไม่ตรง case ใดเลย เหมือน else'},
 ],
 tips:['switch ใช้ได้กับ int, char เท่านั้น ไม่ได้กับ float','ลืม break ทำให้ fall-through ซึ่งอาจตั้งใจหรือไม่ก็ได้','default ควรมีเสมอเพื่อจัดการกรณีที่ไม่คาดไว้'],
 warn:'switch ไม่สามารถใช้กับ float หรือ string ได้!',
},
{id:'u2t4',unitId:2,order:4,icon:'🔗',title:'ตัวดำเนินการเชิงตรรกะ',
 paras:[
  'ใช้รวมเงื่อนไขหลายข้อ: <b>&&</b> (AND ทั้งคู่จริง) | <b>||</b> (OR อย่างน้อยหนึ่งจริง) | <b>!</b> (NOT กลับค่า)',
  'ลำดับความสำคัญ: ! มาก่อน && มาก่อน || ใช้ ( ) เพื่อความชัดเจน',
 ],
 code:`#include <stdio.h>

int main() {
    int age, income;
    printf("อายุ: "); scanf("%d", &age);
    printf("รายได้: "); scanf("%d", &income);

    // AND: ต้องผ่านทั้งสองเงื่อนไข
    if (age >= 18 && income >= 15000) {
        printf("มีสิทธิ์สมัคร\\n");
    }

    // OR: ผ่านอย่างน้อยหนึ่งข้อ
    if (age < 18 || income < 15000) {
        printf("ไม่ครบคุณสมบัติ\\n");
    }

    // NOT: กลับค่า
    if (!(age >= 18)) {
        printf("ยังไม่บรรลุนิติภาวะ\\n");
    }
    return 0;
}`,
 steps:[
  {line:8,label:'&& AND',   note:'age>=18 จริง AND income>=15000 จริง → ผ่าน'},
  {line:13,label:'|| OR',   note:'อย่างน้อยหนึ่งข้อจริง → ไม่ครบ'},
  {line:18,label:'! NOT',   note:'!จริง = เท็จ | !เท็จ = จริง'},
 ],
 tips:['Short-circuit: && หากข้อแรกเท็จ ไม่ตรวจข้อสอง','Short-circuit: || หากข้อแรกจริง ไม่ตรวจข้อสอง','ใช้ ( ) จัดกลุ่มเงื่อนไขซับซ้อน'],
},

/* ===== UNIT 3 ===== */
{id:'u3t1',unitId:3,order:1,icon:'🔁',title:'for loop',
 paras:[
  'for loop ใช้เมื่อรู้จำนวนรอบล่วงหน้า มีโครงสร้าง 3 ส่วน: <b>เริ่มต้น ; เงื่อนไข ; อัปเดต</b>',
  'รูปแบบ: for (i=0; i<n; i++) { /* คำสั่ง */ }',
 ],
 code:`#include <stdio.h>

int main() {
    int sum = 0;

    // บวก 1 ถึง 10
    for (int i = 1; i <= 10; i++) {
        sum += i;
        printf("i=%2d  sum=%3d\\n", i, sum);
    }

    printf("รวม = %d\\n", sum);  // 55

    // Pattern สามเหลี่ยม
    for (int r = 1; r <= 4; r++) {
        for (int c = 1; c <= r; c++) {
            printf("*");
        }
        printf("\\n");
    }

    return 0;
}`,
 steps:[
  {line:6,label:'int i=1 (เริ่มต้น)',  note:'สร้างตัวนับ i เริ่มที่ 1'},
  {line:6,label:'i <= 10 (เงื่อนไข)', note:'ทำงานต่อเมื่อ i ≤ 10'},
  {line:7,label:'sum += i',            note:'บวกสะสม: += หมายถึง sum = sum + i'},
  {line:6,label:'i++ (อัปเดต)',        note:'เพิ่ม i ทีละ 1 หลังจบรอบ'},
  {line:14,label:'Nested loop',        note:'loop ใน loop สร้าง pattern'},
 ],
 tips:['for(;;) = infinite loop','i++ เหมือน i = i + 1','sum += i เหมือน sum = sum + i','for loop กลับหลัง: for(i=10; i>=1; i--)'],
},
{id:'u3t2',unitId:3,order:2,icon:'🔃',title:'while และ do-while loop',
 paras:[
  '<b>while loop</b> ตรวจเงื่อนไขก่อน ถ้าจริงจึงทำ เหมาะเมื่อไม่รู้จำนวนรอบล่วงหน้า',
  '<b>do-while loop</b> ทำก่อนแล้วจึงตรวจ รับประกันว่าทำอย่างน้อย 1 รอบ',
 ],
 code:`#include <stdio.h>

int main() {
    // while: รับจนกว่าจะถูก
    int n;
    printf("กรอกเลขบวก: ");
    scanf("%d", &n);
    while (n <= 0) {
        printf("ต้องมากกว่า 0 ลองใหม่: ");
        scanf("%d", &n);
    }
    printf("ได้รับ: %d\\n", n);

    // do-while: แน่ใจว่าทำ 1 รอบ
    int choice;
    do {
        printf("\\n1.บวก 2.ลบ 0.ออก: ");
        scanf("%d", &choice);
        printf("เลือก %d\\n", choice);
    } while (choice != 0);

    return 0;
}`,
 steps:[
  {line:7,label:'while(n<=0)',        note:'ตรวจก่อน ถ้า n บวกอยู่แล้วไม่เข้า loop'},
  {line:8,label:'ถามใหม่ใน loop',     note:'วนซ้ำจนกว่าจะได้เลขบวก'},
  {line:15,label:'do { ... }',        note:'ทำก่อน แสดงเมนูอย่างน้อย 1 ครั้ง'},
  {line:19,label:'while(choice!=0)',  note:'ตรวจหลัง: วนจนกว่าเลือก 0'},
 ],
 tips:['while เหมาะสำหรับ "ทำจนกว่า condition จะเป็นเท็จ"','do-while เหมาะสำหรับเมนู (ต้องแสดงอย่างน้อย 1 ครั้ง)','ระวัง infinite loop: ต้องมีจุดที่เงื่อนไขเป็นเท็จได้'],
 warn:'ถ้าลืมอัปเดตตัวแปรใน while loop จะวนไม่รู้จบ!',
},
{id:'u3t3',unitId:3,order:3,icon:'⏭️',title:'break, continue และ Nested Loop',
 paras:[
  '<b>break</b> ออกจาก loop ทันที | <b>continue</b> ข้ามรอบนี้ไปรอบถัดไป',
  '<b>Nested Loop</b> คือ loop ซ้อน loop — for วงนอกควบคุมแถว for วงในควบคุมคอลัมน์',
 ],
 code:`#include <stdio.h>

int main() {
    // break: ออกเมื่อพบ 7
    for (int i=1; i<=10; i++) {
        if (i == 7) break;
        printf("%d ", i);  // 1 2 3 4 5 6
    }
    printf("\\n");

    // continue: ข้ามเลขคู่
    for (int i=1; i<=10; i++) {
        if (i % 2 == 0) continue;
        printf("%d ", i);  // 1 3 5 7 9
    }
    printf("\\n");

    // Nested: ตาราง คูณ
    for (int r=1; r<=3; r++) {
        for (int c=1; c<=3; c++) {
            printf("%3d", r*c);
        }
        printf("\\n");
    }

    return 0;
}`,
 steps:[
  {line:5,label:'if(i==7) break',    note:'ออกจาก loop ทันที ไม่ทำรอบที่เหลือ'},
  {line:12,label:'if even continue', note:'ข้ามไปยัง i++ แล้วตรวจเงื่อนไขใหม่'},
  {line:18,label:'r=row loop',       note:'วงนอก: แถว 1 2 3'},
  {line:19,label:'c=col loop',       note:'วงใน: คอลัมน์ 1 2 3 ทุกแถว'},
 ],
 tips:['break ใน nested loop ออกแค่ loop ชั้นใน','continue ข้ามไปยัง update expression ของ for','Nested loop ความซับซ้อน O(n²) ระวังการ loop มาก'],
},

/* ===== UNIT 4 ===== */
{id:'u4t1',unitId:4,order:1,icon:'⚙️',title:'ฟังก์ชัน (Function)',
 paras:[
  'ฟังก์ชัน (Function) คือกลุ่มคำสั่งที่ตั้งชื่อไว้ เรียกใช้ซ้ำได้ ช่วยให้โค้ดสั้นลง อ่านง่ายขึ้น และแก้ไขง่าย',
  'โครงสร้าง: <code>ชนิดคืนค่า ชื่อ(พารามิเตอร์) { คำสั่ง; return ค่า; }</code>',
 ],
 code:`#include <stdio.h>

// ประกาศ function prototype
int add(int a, int b);
float average(int arr[], int n);

// ฟังก์ชันบวกเลขสองจำนวน
int add(int a, int b) {
    return a + b;
}

int main() {
    int x = 5, y = 3;
    int result = add(x, y);  // เรียกใช้
    printf("%d + %d = %d\\n", x, y, result);

    // void function (ไม่คืนค่า)
    return 0;
}`,
 steps:[
  {line:3,label:'Function prototype',  note:'ประกาศ signature ก่อน main() เพื่อให้ compiler รู้ก่อน'},
  {line:7,label:'int add(int a,int b)',note:'รับพารามิเตอร์ 2 ตัว คืนค่า int'},
  {line:8,label:'return a + b',        note:'คำนวณแล้วส่งค่ากลับให้ผู้เรียก'},
  {line:14,label:'add(x, y)',          note:'ส่ง x=5 y=3 ไปให้ฟังก์ชัน รับผล 8'},
 ],
 tips:['void ใช้เมื่อไม่ต้องคืนค่า','Parameter ใน function เป็นสำเนา (pass by value)','ตั้งชื่อ function ให้บอกหน้าที่ชัดเจน','function สามารถ call ตัวเองได้ (recursion)'],
},
{id:'u4t2',unitId:4,order:2,icon:'📋',title:'Array 1 มิติ',
 paras:[
  'Array คือชุดของตัวแปรชนิดเดียวกันที่เก็บต่อเนื่องกันในหน่วยความจำ เข้าถึงด้วย index เริ่มต้นที่ 0',
  'ประกาศ: <code>int scores[5];</code> — สร้างพื้นที่ 5 ช่อง index 0 ถึง 4',
 ],
 code:`#include <stdio.h>

int main() {
    int scores[5] = {85, 92, 78, 96, 88};
    int n = 5, sum = 0;

    // วนหาผลรวม
    for (int i = 0; i < n; i++) {
        sum += scores[i];
        printf("scores[%d] = %d\\n", i, scores[i]);
    }

    printf("เฉลี่ย = %.1f\\n", (float)sum/n);

    // หาค่าสูงสุด
    int max = scores[0];
    for (int i = 1; i < n; i++) {
        if (scores[i] > max) max = scores[i];
    }
    printf("สูงสุด = %d\\n", max);

    return 0;
}`,
 steps:[
  {line:3,label:'int scores[5]={...}',  note:'สร้าง array 5 ช่อง ใส่ค่าเลย (index 0-4)'},
  {line:7,label:'for i=0; i<n',         note:'วน 0 ถึง n-1 (5 รอบ) เข้าถึงทุกช่อง'},
  {line:8,label:'scores[i]',            note:'เข้าถึงช่องที่ i ด้วย bracket notation'},
  {line:14,label:'max = scores[0]',     note:'เริ่มต้นด้วยตัวแรก แล้วเปรียบเทียบ'},
 ],
 tips:['Index เริ่มที่ 0 เสมอ — scores[5] มี index 0..4','scores[5] ใน array ขนาด 5 = out of bounds (undefined behavior)','(float)sum/n ← cast เพื่อได้ทศนิยม','Array ส่งให้ฟังก์ชัน ต้องส่ง n ด้วย'],
 warn:'Array out of bounds ไม่มี error ในภาษา C แต่โปรแกรม crash หรือให้ค่าผิด!',
},
{id:'u4t3',unitId:4,order:3,icon:'🗃️',title:'Array 2 มิติและ Bubble Sort',
 paras:[
  'Array 2 มิติ เก็บข้อมูลเป็นตาราง (แถว × คอลัมน์) เช่น matrix, ตารางคะแนน',
  '<b>Bubble Sort</b> เรียงลำดับโดยเปรียบเทียบคู่ติดกัน แล้ว swap ถ้าลำดับผิด ทำซ้ำจนเรียบร้อย',
 ],
 code:`#include <stdio.h>

int main() {
    // 2D Array: 3 คน × 2 วิชา
    int grades[3][2] = {{80,90},{75,85},{92,88}};
    for (int i=0; i<3; i++) {
        for (int j=0; j<2; j++) {
            printf("%4d", grades[i][j]);
        }
        printf("\\n");
    }

    // Bubble Sort
    int arr[] = {64, 34, 25, 12, 22};
    int n = 5;
    for (int i=0; i<n-1; i++) {
        for (int j=0; j<n-1-i; j++) {
            if (arr[j] > arr[j+1]) {
                int tmp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = tmp;
            }
        }
    }
    for (int i=0; i<n; i++) printf("%d ", arr[i]);
    return 0;
}`,
 steps:[
  {line:4,label:'int grades[3][2]',   note:'3 แถว 2 คอลัมน์ — เข้าถึงด้วย [แถว][คอลัมน์]'},
  {line:15,label:'outer loop i',       note:'n-1 รอบ แต่ละรอบทำให้ตัวใหญ่สุดไปอยู่ท้าย'},
  {line:16,label:'inner loop j',       note:'n-1-i รอบ เพราะท้าย i ช่องเรียบร้อยแล้ว'},
  {line:17,label:'swap if out of order', note:'ถ้าหน้า > หลัง ให้สลับตำแหน่ง'},
 ],
 tips:['grades[i][j] = แถว i คอลัมน์ j','Bubble Sort O(n²) เหมาะข้อมูลน้อย','Swap ต้องใช้ tmp ตัวช่วย','printf("%4d") จัดช่องกว้าง 4 ตัวอักษร'],
},
{id:'u4t4',unitId:4,order:4,icon:'🐛',title:'Debugging — หา Error',
 paras:[
  'Bug มี 3 ประเภท: <b>Syntax Error</b> โค้ดผิดรูปแบบ (compiler ไม่ผ่าน) | <b>Runtime Error</b> crash ขณะรัน | <b>Logic Error</b> รันได้แต่ผลผิด',
  'เทคนิค Debug: เพิ่ม printf แสดงค่าตัวแปร | ทำ Trace Table | ใช้ AI Code Analyzer',
 ],
 code:`#include <stdio.h>

int main() {
    // Bug ตัวอย่าง 1: Logic Error
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        sum = sum + i;   // ✓ ถูก
        // sum = i;      // ✗ ผิด: แทนที่แทน บวก
    }

    // Bug ตัวอย่าง 2: Runtime Error
    int arr[3] = {1,2,3};
    // arr[5] = 99;  // ✗ out of bounds!

    // Debug ด้วย printf
    printf("DEBUG sum ตอนนี้ = %d\\n", sum);

    printf("ผลรวม 1-10 = %d\\n", sum); // 55
    return 0;
}`,
 steps:[
  {line:6,label:'sum = sum + i (ถูก)',  note:'บวกสะสม ค่า sum เพิ่มขึ้นทุกรอบ'},
  {line:7,label:'sum = i (ผิด)',        note:'แทนที่ค่า ผลลัพธ์สุดท้ายจะเป็นแค่ 10'},
  {line:14,label:'DEBUG printf',        note:'เพิ่ม printf ชั่วคราวเพื่อดูค่าตัวแปร'},
 ],
 tips:['Syntax Error: compiler บอกบรรทัดที่ผิด อ่าน error message','Runtime Error: ใช้ debugger หรือ printf ก่อนบรรทัดที่ crash','Logic Error: ทำ Trace Table ไล่ค่าทีละขั้น','ลบ DEBUG printf ออกหลังแก้เสร็จ'],
},

/* ===== UNIT 5 ===== */
{id:'u5t1',unitId:5,order:1,icon:'🏆',title:'Mini Project — บูรณาการทุกหน่วย',
 paras:[
  'Mini Project คือการนำความรู้จากหน่วยที่ 1-4 มาสร้างโปรแกรมที่มีประโยชน์จริง เช่น ระบบคำนวณเกรด, คลังคะแนน, เกมทายเลข',
  'ขั้นตอน: 1) วิเคราะห์ปัญหา (IPO) → 2) ออกแบบ Flowchart → 3) เขียนโค้ดทีละ function → 4) ทดสอบ → 5) แก้บั๊ก',
 ],
 code:`#include <stdio.h>

// Mini Project: ระบบคำนวณเกรดเฉลี่ย
float calcAvg(int arr[], int n) {
    int sum = 0;
    for (int i=0; i<n; i++) sum += arr[i];
    return (float)sum / n;
}

char getGrade(float avg) {
    if (avg >= 80) return 'A';
    if (avg >= 70) return 'B';
    if (avg >= 60) return 'C';
    if (avg >= 50) return 'D';
    return 'F';
}

int main() {
    int n, scores[50];
    printf("จำนวนนักเรียน: "); scanf("%d", &n);
    for (int i=0; i<n; i++) {
        printf("คะแนน[%d]: ", i+1);
        scanf("%d", &scores[i]);
    }
    float avg = calcAvg(scores, n);
    printf("เฉลี่ย: %.2f เกรด: %c\\n",
           avg, getGrade(avg));
    return 0;
}`,
 steps:[
  {line:3,label:'Function calcAvg',  note:'แยก logic คำนวณออกมาเป็นฟังก์ชัน'},
  {line:9,label:'Function getGrade', note:'ใช้ if-else if จากหน่วย 2'},
  {line:18,label:'Array + Loop',     note:'รับข้อมูลหลายชุดด้วย array+loop จากหน่วย 3+4'},
  {line:23,label:'เรียกใช้ function',note:'ส่งข้อมูลไปยัง function และรับผล'},
 ],
 tips:['แบ่งโปรแกรมเป็น function ย่อยๆ ก่อน','ทดสอบทีละ function ก่อนรวมกัน','ตั้งชื่อ function ให้บอกหน้าที่ชัดเจน','เขียน comment อธิบาย logic ที่ซับซ้อน'],
},
{id:'u5t2',unitId:5,order:2,icon:'🤖',title:'AI ช่วยเขียนโปรแกรม',
 paras:[
  'AI เช่น Gemini, ChatGPT ช่วยเขียนโค้ด อธิบาย Error และแนะนำวิธีแก้ แต่ต้องใช้อย่างฉลาด ไม่ใช่ copy-paste โดยไม่เข้าใจ',
  'วิธีใช้ AI ให้ได้ประโยชน์: 1) เข้าใจโค้ดก่อนส่ง 2) อธิบาย context ให้ครบ 3) ตรวจสอบผลลัพธ์ 4) ถามทำไมไม่ใช่แค่ยังไง',
 ],
 code:`// ตัวอย่าง Prompt ที่ดี สำหรับ AI:
// "ฉันเขียน for loop บวก 1-100 ใน C
//  แต่ได้ผลผิด sum=100 ไม่ใช่ 5050
//  นี่คือโค้ด: [โค้ด]
//  ช่วยหาว่าบั๊กอยู่ที่ไหน"

// vs Prompt ที่ไม่ดี:
// "เขียนโค้ดภาษา C บวก 1-100 ให้หน่อย"

// AI ช่วยได้:
// ✓ อธิบาย error message
// ✓ แนะนำ algorithm ทางเลือก
// ✓ Review code และแนะนำ
// ✗ ไม่ควร: Copy โดยไม่เข้าใจ
// ✗ ไม่ควร: ส่ง assignment ทั้งหมดให้ทำ`,
 steps:[
  {line:1,label:'Prompt บอก context',  note:'บอก AI ว่ากำลังทำอะไร มีปัญหาอะไร'},
  {line:8,label:'ถามถึง why ไม่ใช่ how',note:'เข้าใจเหตุผล ไม่ใช่แค่คัดลอก'},
  {line:12,label:'ตรวจสอบผล AI',        note:'AI อาจผิด ต้องทดสอบเองเสมอ'},
 ],
 tips:['AI = เครื่องมือ ไม่ใช่ทางลัด','ฝึกเขียนเองก่อน แล้วค่อยถาม AI ตรวจ','AI บอกให้เข้าใจ แต่ต้องพิมพ์เองเพื่อฝึก','Prompt ดี = ผลลัพธ์ดี'],
},
{id:'u5t3',unitId:5,order:3,icon:'⚖️',title:'จริยธรรม AI และ Peer Review',
 paras:[
  'จริยธรรมในการใช้ AI สำหรับการเรียน: ซื่อสัตย์ต่อตนเอง ใช้ AI เป็น coach ไม่ใช่ตัวแทน ไม่ส่งงานที่ AI ทำทั้งหมดเป็นของตัวเอง',
  '<b>Peer Review</b>: การให้ feedback แก่เพื่อน ช่วยให้เรียนรู้ได้ลึกขึ้น ทั้งผู้ให้และผู้รับ ใช้หลัก "Warm-Cool-Warm" (ชม-แนะ-ชม)',
 ],
 code:`// หลักการ Peer Review ที่ดี:
// 1. Warm: ชมสิ่งที่ดี
//    "โค้ดอ่านง่ายมาก ตั้งชื่อตัวแปรชัดเจน"
//
// 2. Cool: แนะนำปรับปรุง (ไม่ใช่วิจารณ์)
//    "ถ้าเพิ่ม comment อธิบาย algorithm
//     จะทำให้คนอื่นเข้าใจง่ายขึ้น"
//
// 3. Warm: ปิดด้วยกำลังใจ
//    "โดยรวมทำได้ดีมาก ขอเป็นกำลังใจ!"
//
// สิ่งที่ review ได้:
// ✓ ความถูกต้องของ logic
// ✓ ความอ่านง่าย / style
// ✓ ประสิทธิภาพ (จำนวน loop, memory)
// ✓ การจัดการ edge cases`,
 steps:[
  {line:1,label:'Warm: ชมก่อน',   note:'เริ่มด้วยสิ่งที่ดี สร้าง tone บวก'},
  {line:5,label:'Cool: แนะนำ',    note:'ชี้จุดปรับปรุง ไม่ใช่โจมตี'},
  {line:12,label:'Review หลายมิติ', note:'ดูทั้ง correctness, readability, efficiency'},
 ],
 tips:['ให้ feedback เฉพาะเจาะจง ไม่ใช่กว้างๆ','"โค้ดไม่ดี" ไม่มีประโยชน์ — บอกว่าทำไมและแก้อย่างไร','รับ feedback อย่างเปิดใจ ไม่ใช่ปกป้อง','Peer review ช่วยทั้งผู้ให้และผู้รับ'],
},
];

// ── Tool map: topicId → interactive tool from LearningTools.js ─
// _DataTypeVisualizer etc. are var-globals defined in LearningTools.js (loaded before this file)
const _LH_TOOL_MAP = {
    'u1t2': { comp: _DataTypeVisualizer, label: '📊 Data Type Visualizer', color: '#22d3ee', plan: 'หน่วย 1 · แผน 3'  },
    'u1t6': { comp: _FlowchartBuilder,   label: '📐 Flowchart → C Code',   color: '#8b5cf6', plan: 'หน่วย 1 · แผน 1'  },
    'u2t1': { comp: _DecisionTreeViz,    label: '🌳 Decision Tree',         color: '#f59e0b', plan: 'หน่วย 2 · แผน 10' },
    'u3t3': { comp: _PatternSandbox,     label: '🎨 Pattern Sandbox',       color: '#4ade80', plan: 'หน่วย 3 · แผน 24' },
    'u4t2': { comp: _MemoryMap,          label: '🗂️ Memory Map',            color: '#f472b6', plan: 'หน่วย 4 · แผน 29' },
};

// ── Helper: render code with step highlighting ─────────────
function _LH_CodeBlock({ code, steps, stepIdx }) {
    const lines = code.split('\n');
    const hlLine = steps && stepIdx != null ? steps[stepIdx]?.line : -1;
    return (
        <div className="lh-code">
            {lines.map((ln, i) => (
                <span key={i} className={`lh-line${i === hlLine ? ' hl' : (stepIdx != null && i < hlLine ? ' dim' : '')}`}>
                    <span style={{color:'#6b7280',userSelect:'none',marginRight:12,fontSize:11}}>{String(i+1).padStart(2,' ')}</span>
                    {ln || ' '}
                </span>
            ))}
        </div>
    );
}

// ── Helper: Video embed ────────────────────────────────────
function _LH_VideoEmbed({ url, title }) {
    const getEmbedUrl = (u) => {
        if (!u) return '';
        const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
        return u; // assume already embed URL or other
    };
    const embed = getEmbedUrl(url);
    if (!embed) return null;
    return (
        <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:10,overflow:'hidden',marginTop:12}}>
            <iframe src={embed} title={title || 'วิดีโอ'} frameBorder="0" allowFullScreen
                style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}} />
        </div>
    );
}

// ── Helper: PDF viewer ─────────────────────────────────────
function _LH_PdfViewer({ url, title }) {
    const [show, setShow] = React.useState(false);
    if (!url) return null;
    const viewUrl = url.endsWith('.pdf')
        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`
        : url;
    return (
        <div style={{marginTop:12}}>
            <button onClick={() => setShow(!show)}
                style={{background:'#fee2e2',color:'#991b1b',border:'none',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13,fontWeight:600}}>
                📄 {show ? 'ซ่อน' : 'ดู'} {title || 'PDF'}
            </button>
            {show && (
                <iframe src={viewUrl} title={title} width="100%" height="600" frameBorder="0"
                    style={{borderRadius:10,marginTop:8,border:'1px solid #e5e7eb'}} />
            )}
        </div>
    );
}

// ── Topic content panel ────────────────────────────────────
function _LH_TopicView({ topic, extraItems }) {
    const [stepIdx, setStepIdx] = React.useState(null);
    const [openAcc, setOpenAcc] = React.useState({});
    const [readMore, setReadMore] = React.useState(false);
    const [showTool, setShowTool] = React.useState(false);

    const unit = _LH_UNITS.find(u => u.id === topic.unitId) || _LH_UNITS[0];

    const goStep = (n) => {
        const max = (topic.steps || []).length;
        if (max === 0) return;
        setStepIdx(Math.max(0, Math.min(max - 1, n)));
    };

    return (
        <div className="lh-fade" style={{padding:'0 2px'}}>
            {/* Header */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                <span style={{fontSize:28}}>{topic.icon}</span>
                <div>
                    <div style={{fontWeight:700,fontSize:18,color:'#1e293b'}}>{topic.title}</div>
                    <div style={{fontSize:12,color:unit.color,fontWeight:600}}>{unit.title} · {unit.name}</div>
                </div>
            </div>

            {/* Paragraphs */}
            {(topic.paras||[]).map((p,i) => (
                <p key={i} style={{fontSize:14,lineHeight:1.8,color:'#374151',marginBottom:10}}
                    dangerouslySetInnerHTML={{__html: p}} />
            ))}

            {/* Code + Step Demo */}
            {topic.code && (
                <div style={{marginTop:16}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                        <span style={{fontWeight:700,fontSize:13,color:'#1e293b'}}>💻 ตัวอย่างโค้ด</span>
                        {topic.steps?.length > 0 && (
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <span style={{fontSize:12,color:'#6b7280'}}>Step-through:</span>
                                <button onClick={() => setStepIdx(stepIdx === null ? 0 : null)}
                                    style={{background: stepIdx !== null ? '#dcfce7':'#f1f5f9', color: stepIdx !== null ? '#166534':'#475569',
                                        border:'none',borderRadius:6,padding:'3px 10px',cursor:'pointer',fontSize:12,fontWeight:600}}>
                                    {stepIdx !== null ? '⏹ ปิด' : '▶ เริ่ม'}
                                </button>
                            </div>
                        )}
                    </div>
                    <_LH_CodeBlock code={topic.code} steps={topic.steps} stepIdx={stepIdx} />

                    {/* Step controls */}
                    {stepIdx !== null && topic.steps && (
                        <div style={{background:'#fffbeb',borderRadius:8,padding:'10px 14px',marginTop:8,border:'1px solid #fde68a'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                                <button onClick={() => goStep(0)} style={{background:'#fef3c7',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:13}}>⏮</button>
                                <button onClick={() => goStep(stepIdx - 1)} disabled={stepIdx === 0}
                                    style={{background:'#fef3c7',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:13,opacity:stepIdx===0?.4:1}}>←</button>
                                <span style={{fontSize:12,fontWeight:600,color:'#92400e'}}>
                                    Step {stepIdx + 1}/{topic.steps.length}
                                </span>
                                <button onClick={() => goStep(stepIdx + 1)} disabled={stepIdx === topic.steps.length - 1}
                                    style={{background:'#fef3c7',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:13,opacity:stepIdx===topic.steps.length-1?.4:1}}>→</button>
                                <button onClick={() => goStep(topic.steps.length - 1)} style={{background:'#fef3c7',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:13}}>⏭</button>
                            </div>
                            <div style={{fontWeight:700,fontSize:14,color:'#78350f'}}>
                                📌 {topic.steps[stepIdx].label}
                            </div>
                            <div style={{fontSize:13,color:'#92400e',marginTop:3}}>{topic.steps[stepIdx].note}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Tips */}
            {topic.tips?.length > 0 && (
                <div style={{marginTop:16}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:8,color:'#1e293b'}}>💡 สิ่งที่ควรจำ</div>
                    {topic.tips.map((t,i) => <div key={i} className="lh-tip">{t}</div>)}
                </div>
            )}
            {topic.warn && <div className="lh-warn" style={{marginTop:8}}>⚠️ {topic.warn}</div>}

            {/* Teacher extra content (Firestore) */}
            {extraItems?.length > 0 && (
                <div style={{marginTop:24,borderTop:'1px solid #e5e7eb',paddingTop:16}}>
                    <div style={{fontWeight:700,fontSize:14,color:'#1e293b',marginBottom:12}}>📌 เนื้อหาเพิ่มเติมจากครู</div>
                    {extraItems.map((item, idx) => (
                        <div key={idx} style={{background:'#f8fafc',borderRadius:10,padding:14,marginBottom:12,border:'1px solid #e2e8f0'}}>
                            {item.content && <p style={{fontSize:14,lineHeight:1.8,color:'#374151',whiteSpace:'pre-wrap'}}>{item.content}</p>}
                            {(item.resources||[]).map((r, ri) => (
                                <div key={ri} style={{marginTop:8}}>
                                    {r.type === 'video' && <_LH_VideoEmbed url={r.url} title={r.title} />}
                                    {r.type === 'pdf'   && <_LH_PdfViewer url={r.url} title={r.title} />}
                                    {r.type === 'link'  && (
                                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                                            style={{color:'#2563eb',fontSize:13,fontWeight:600}}>
                                            🔗 {r.title || r.url}
                                        </a>
                                    )}
                                    {r.type === 'image' && (
                                        <img src={r.url} alt={r.title} style={{maxWidth:'100%',borderRadius:8,marginTop:8}} />
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Interactive Tool (from LearningTools.js) */}
            {_LH_TOOL_MAP[topic.id] && (() => {
                const tm = _LH_TOOL_MAP[topic.id];
                const ToolComp = tm.comp;
                if (!ToolComp) return null;
                return (
                    <div style={{marginTop:24,borderTop:'1px solid #e5e7eb',paddingTop:16}}>
                        <button onClick={() => setShowTool(!showTool)}
                            style={{width:'100%',background:`${tm.color}12`,border:`1.5px solid ${tm.color}50`,
                                borderRadius:showTool ? '10px 10px 0 0' : 10,padding:'12px 18px',
                                cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',
                                alignItems:'center',fontFamily:'inherit',transition:'border-radius .15s'}}>
                            <div>
                                <span style={{fontWeight:700,fontSize:15,color:tm.color}}>{tm.label}</span>
                                <span style={{fontSize:11,color:'#6b7280',marginLeft:10,background:'#f1f5f9',borderRadius:10,padding:'2px 8px'}}>
                                    🧪 Interactive Tool · {tm.plan}
                                </span>
                            </div>
                            <span style={{fontSize:12,fontWeight:600,color:tm.color,whiteSpace:'nowrap'}}>
                                {showTool ? '▲ ปิด' : '▼ เปิดใช้งาน'}
                            </span>
                        </button>
                        {showTool && (
                            <div style={{background:'#0f172a',borderRadius:'0 0 10px 10px',padding:20,
                                border:`1px solid ${tm.color}30`,borderTop:'none',color:'#f1f5f9',fontFamily:"'Prompt',sans-serif"}}>
                                <ToolComp />
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}

// ── Main LearningHub component ─────────────────────────────
const LearningHub = () => {
    _lh_injectCss();
    const [activeUnit, setActiveUnit] = React.useState(1);
    const [activeTopic, setActiveTopic] = React.useState(_LH_TOPICS[0]);
    const [extraMap, setExtraMap] = React.useState({}); // topicId → array of extra items
    const [fsTopics, setFsTopics] = React.useState([]); // extra teacher topics from Firestore
    const [sideOpen, setSideOpen] = React.useState(false); // mobile sidebar toggle
    const { userDoc } = useAuth();

    // Load teacher Firestore content
    React.useEffect(() => {
        const unsub = db.collection('learningTopics')
            .where('isPublished', '==', true)
            .orderBy('unitId').orderBy('order')
            .onSnapshot(snap => {
                const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Group extra items by topicId (for built-in topics)
                const map = {};
                const extras = [];
                items.forEach(item => {
                    if (item.parentTopicId) {
                        if (!map[item.parentTopicId]) map[item.parentTopicId] = [];
                        map[item.parentTopicId].push(item);
                    } else {
                        extras.push(item);
                    }
                });
                setExtraMap(map);
                setFsTopics(extras);
            }, () => {});
        return () => unsub();
    }, []);

    const unitTopics = _LH_TOPICS.filter(t => t.unitId === activeUnit);
    // Also add teacher-created standalone topics for this unit
    const teacherStandaloneTopics = fsTopics.filter(t => t.unitId === activeUnit && !t.parentTopicId);
    const allUnitTopics = [...unitTopics, ...teacherStandaloneTopics.map(t => ({ ...t, isTeacher: true }))];

    const unit = _LH_UNITS.find(u => u.id === activeUnit);

    return (
        <div className="min-h-screen" style={{background:'#f8fafc'}}>
            <Navbar title="AI-Powered Coding Coach" subtitle="ศูนย์การเรียนรู้" />

            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Unit tabs */}
                <div style={{display:'flex',gap:8,marginBottom:20,overflowX:'auto',paddingBottom:4}}>
                    {_LH_UNITS.map(u => (
                        <button key={u.id}
                            onClick={() => { setActiveUnit(u.id); setActiveTopic(_LH_TOPICS.find(t => t.unitId === u.id)); }}
                            style={{whiteSpace:'nowrap',padding:'8px 16px',borderRadius:20,border:'2px solid',
                                borderColor: activeUnit === u.id ? u.color : '#e2e8f0',
                                background: activeUnit === u.id ? u.color : 'white',
                                color: activeUnit === u.id ? 'white' : '#374151',
                                fontWeight:600,fontSize:13,cursor:'pointer',transition:'all .15s',fontFamily:'inherit'}}>
                            {u.icon} {u.title}
                        </button>
                    ))}
                </div>

                {/* Unit header */}
                <div style={{background: `linear-gradient(135deg, ${unit.color}15, ${unit.color}08)`,
                    border:`1px solid ${unit.color}30`, borderRadius:14, padding:'14px 20px', marginBottom:20}}>
                    <div style={{fontWeight:700,fontSize:20,color:unit.color}}>{unit.icon} {unit.title}: {unit.name}</div>
                    <div style={{fontSize:12,color:'#64748b',marginTop:3}}>{unit.plans}</div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:20}}>
                    {/* Sidebar */}
                    <div style={{background:'white',borderRadius:14,padding:12,border:'1px solid #e2e8f0',height:'fit-content',position:'sticky',top:80}}>
                        <div style={{fontWeight:700,fontSize:13,color:'#374151',marginBottom:10,paddingLeft:4}}>📚 หัวข้อ</div>
                        {allUnitTopics.map(t => (
                            <button key={t.id} className={`lh-sidebar-btn${activeTopic?.id === t.id ? ' active' : ''}`}
                                onClick={() => setActiveTopic(t)}>
                                {t.icon || '📖'} {t.title}
                                {t.isTeacher && <span style={{fontSize:10,marginLeft:4,color:'#6b7280'}}>[ครู]</span>}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div style={{background:'white',borderRadius:14,padding:24,border:'1px solid #e2e8f0',minHeight:400}}>
                        {activeTopic ? (
                            <_LH_TopicView
                                key={activeTopic.id}
                                topic={activeTopic}
                                extraItems={extraMap[activeTopic.id] || []}
                            />
                        ) : (
                            <div style={{textAlign:'center',paddingTop:60,color:'#9ca3af'}}>
                                <div style={{fontSize:40,marginBottom:12}}>👆</div>
                                <p>เลือกหัวข้อจากแถบด้านซ้าย</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

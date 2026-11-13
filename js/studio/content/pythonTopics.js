/**
 * js/studio/content/pythonTopics.js — หัวข้อ built-in ภาษาไพทอน สำหรับ Learning Hub (APCC Studio v6.0)
 *
 * หลักการ PAAC+D: A₁ (ค้นอย่างมีกติกา — มีแหล่งอ้างอิงในระบบที่ครูคัดแล้ว ก่อนไปค้นภายนอกหรือถาม AI)
 * ปัญหาที่แก้: Learning Hub เดิมมีหัวข้อ built-in เฉพาะภาษา C (20 หัวข้อ) รายวิชาไพทอนจึงว่าง
 * แสดงเฉพาะเมื่อ course.language === 'python' และ hasFeature(course, 'pythonLearningHub')
 * รูปแบบข้อมูลเดียวกับ _LH_TOPICS (paras, code, steps[line เริ่มที่ 0], tips, warn) + unitInfo
 * ตัวอย่างใช้บริบทโรงเรียนและชุมชน ให้สอดคล้องกับโจทย์ ว23207
 */

const _PY_U = {
    io:    { title: 'ไพทอน 1', name: 'ลำดับ ตัวแปร และการรับ-แสดงผล', color: '#3b82f6' },
    cond:  { title: 'ไพทอน 2', name: 'การตัดสินใจ',                  color: '#8b5cf6' },
    loop:  { title: 'ไพทอน 3', name: 'การทำซ้ำ',                     color: '#10b981' },
    data:  { title: 'ไพทอน 4', name: 'ข้อมูลและฟังก์ชัน',             color: '#f59e0b' },
};

const STUDIO_PYTHON_TOPICS = [
{ id: 'py1', unitInfo: _PY_U.io, order: 1, icon: '👋', title: 'print และ input',
  paras: [
    '<code>print()</code> แสดงข้อความบนจอ หนึ่งคำสั่งแสดงหนึ่งบรรทัด ส่วน <code>input()</code> รอให้ผู้ใช้พิมพ์แล้วกด Enter และส่งค่ากลับมาเป็น <b>ข้อความ (str)</b> เสมอ',
    'print รับหลายค่าโดยคั่นด้วยจุลภาค ระบบจะเว้นวรรคให้ ถ้าต้องการตัวคั่นอื่นใช้ <code>sep=</code>',
  ],
  code: `name = input()
print("สวัสดี", name)
print("ก้างปลา", "ทุ่งสง", sep=" - ")`,
  steps: [
    { line: 0, label: 'name = input()', note: 'รอรับข้อความ 1 บรรทัด แล้วเก็บในตัวแปร name' },
    { line: 1, label: 'print("สวัสดี", name)', note: 'แสดง 2 ค่า ระบบเว้นวรรคให้ 1 ช่อง' },
    { line: 2, label: 'sep=" - "', note: 'เปลี่ยนตัวคั่นจากเว้นวรรคเป็น " - "' },
  ],
  tips: ['ข้อความต้องอยู่ในเครื่องหมายคำพูด " " หรือ \' \'', 'ใน APCC ไม่ต้องใส่ข้อความใน input("...") เพราะระบบตรวจจะเห็นข้อความนั้นปนในผลลัพธ์'],
  warn: 'ผลลัพธ์ต้องสะกดตรงกับโจทย์ทุกตัวอักษร รวมถึงช่องว่าง',
},
{ id: 'py2', unitInfo: _PY_U.io, order: 2, icon: '🗂️', title: 'ตัวแปรและชนิดข้อมูล',
  paras: [
    'ตัวแปรคือชื่อที่ใช้อ้างถึงข้อมูล ไพทอนรู้ชนิดข้อมูลเองจากค่าที่ใส่ ชนิดหลักคือ <b>int</b> จำนวนเต็ม, <b>float</b> ทศนิยม, <b>str</b> ข้อความ และ <b>bool</b> จริง/เท็จ',
    'ข้อมูลจาก input() เป็น str เสมอ ถ้าจะคำนวณต้องแปลงด้วย <code>int()</code> หรือ <code>float()</code> ก่อน',
  ],
  code: `age = int(input())
price = float(input())
print(age + 1)
print(type(price))`,
  steps: [
    { line: 0, label: 'int(input())', note: 'รับข้อความแล้วแปลงเป็นจำนวนเต็ม เช่น "14" → 14' },
    { line: 1, label: 'float(input())', note: 'แปลงเป็นทศนิยม รับ 35.5 ได้' },
    { line: 2, label: 'age + 1', note: 'บวกได้เพราะ age เป็น int แล้ว' },
    { line: 3, label: 'type(price)', note: 'ดูชนิดข้อมูล ได้ <class \'float\'>' },
  ],
  tips: ['ชื่อตัวแปรขึ้นต้นด้วยตัวเลขไม่ได้ และห้ามมีช่องว่าง', 'ตั้งชื่อให้สื่อความหมาย เช่น price ดีกว่า p'],
  warn: 'ถ้าลืม int() แล้วเขียน "7" + "10" จะได้ "710" ไม่ใช่ 17',
},
{ id: 'py3', unitInfo: _PY_U.io, order: 3, icon: '🧮', title: 'การคำนวณและทศนิยม',
  paras: [
    'ตัวดำเนินการ: <code>+ - * /</code> และ <code>//</code> หารปัดเศษทิ้ง, <code>%</code> เศษจากการหาร, <code>**</code> ยกกำลัง',
    'การแสดงทศนิยมตามจำนวนตำแหน่งใช้ f-string เช่น <code>f"{x:.2f}"</code> = ทศนิยม 2 ตำแหน่ง',
  ],
  code: `c = int(input())
p = int(input())
print("คนละ", c // p, "ชิ้น")
print("เหลือ", c % p, "ชิ้น")
avg = (70 + 80 + 75) / 3
print(f"{avg:.2f}")`,
  steps: [
    { line: 2, label: 'c // p', note: '17 // 5 = 3 (เอาเฉพาะจำนวนเต็ม)' },
    { line: 3, label: 'c % p', note: '17 % 5 = 2 (เศษ)' },
    { line: 4, label: '( ) / 3', note: 'ใส่วงเล็บให้บวกก่อนหาร' },
    { line: 5, label: 'f"{avg:.2f}"', note: 'แสดง 75.00 ทศนิยม 2 ตำแหน่ง' },
  ],
  tips: ['/ ให้ผลเป็น float เสมอ เช่น 10 / 2 = 5.0', 'ลดราคา 10% คือคูณ 0.9'],
  warn: 'ลำดับการคำนวณเหมือนคณิตศาสตร์: คูณหารก่อนบวกลบ',
},
{ id: 'py4', unitInfo: _PY_U.cond, order: 4, icon: '🔀', title: 'if / elif / else',
  paras: [
    '<code>if</code> ทำงานเมื่อเงื่อนไขเป็นจริง <code>else</code> ทำเมื่อไม่จริง ถ้ามีหลายทางใช้ <code>elif</code> ระบบตรวจจากบนลงล่าง <b>เจอข้อแรกที่จริงแล้วหยุด</b>',
    'ตัวเปรียบเทียบ: <code>== != &lt; &gt; &lt;= &gt;=</code> บรรทัดใต้ if/elif/else ต้องย่อหน้า 4 ช่อง',
  ],
  code: `v = int(input())
if v <= 15:
    print("ดีมาก")
elif v <= 25:
    print("ดี")
elif v <= 37:
    print("ปานกลาง")
else:
    print("มีผลกระทบต่อสุขภาพ")`,
  steps: [
    { line: 1, label: 'if v <= 15:', note: 'ตรวจช่วงแรก ถ้าจริงแสดง ดีมาก แล้วข้ามที่เหลือ' },
    { line: 3, label: 'elif v <= 25:', note: 'มาถึงบรรทัดนี้ได้แปลว่า v > 15 แน่นอน' },
    { line: 7, label: 'else:', note: 'กรณีอื่นทั้งหมดที่เหลือ' },
  ],
  tips: ['เรียงช่วงจากน้อยไปมาก (หรือมากไปน้อย) ให้เป็นระบบ', 'ทดสอบค่าที่ขอบ เช่น 15, 16, 25'],
  warn: 'เปรียบเทียบใช้ == (สองตัว) ส่วน = ตัวเดียวคือการกำหนดค่า',
},
{ id: 'py5', unitInfo: _PY_U.cond, order: 5, icon: '🧩', title: 'เงื่อนไขซ้อนและ and / or',
  paras: [
    'เงื่อนไขหลายข้อรวมกันด้วย <code>and</code> (จริงทั้งคู่) <code>or</code> (จริงอย่างน้อยหนึ่ง) และ <code>not</code> (กลับค่า)',
    'if ซ้อนใน if ใช้เมื่อการตัดสินใจขั้นที่สองขึ้นกับผลขั้นแรก ทุกชั้นต้องย่อหน้าเพิ่มอีก 4 ช่อง',
  ],
  code: `h = int(input())
m = int(input())
if h * 60 + m <= 7 * 60 + 40:
    print("ทันเวลา")
else:
    if h == 7 and m <= 50:
        print("สายไม่เกิน 10 นาที")
    else:
        print("สาย")`,
  steps: [
    { line: 2, label: 'h * 60 + m', note: 'แปลงเวลาเป็นนาทีนับจากเที่ยงคืน ทำให้เทียบง่าย' },
    { line: 5, label: 'if ซ้อน', note: 'อยู่ใน else จึงย่อหน้า 8 ช่อง' },
    { line: 5, label: 'and', note: 'ต้องจริงทั้งสองเงื่อนไข: ชั่วโมงเป็น 7 และนาทีไม่เกิน 50' },
  ],
  tips: ['ถ้าซ้อนลึกเกิน 2 ชั้น ลองเขียนใหม่ด้วย elif', 'ตรวจข้อความใช้ == ได้ เช่น pw == "kp2569"'],
  warn: 'ตัวพิมพ์ใหญ่-เล็กต่างกัน "KP2569" ไม่เท่ากับ "kp2569"',
},
{ id: 'py6', unitInfo: _PY_U.loop, order: 6, icon: '🔁', title: 'for และ range',
  paras: [
    '<code>for i in range(a, b)</code> ทำซ้ำโดย i มีค่าตั้งแต่ a ถึง <b>b-1</b> ใช้เมื่อรู้จำนวนรอบล่วงหน้า',
    'range(a, b, step) กำหนดช่วงห่างได้ ถ้า step ติดลบจะนับถอยหลัง',
  ],
  code: `n = int(input())
total = 0
for i in range(1, n + 1):
    total = total + i
print(total)
for i in range(12, 0, -1):
    print(n, "x", i, "=", n * i)`,
  steps: [
    { line: 1, label: 'total = 0', note: 'ตัวแปรสะสม ต้องตั้งค่าก่อนลูป' },
    { line: 2, label: 'range(1, n + 1)', note: 'ได้ 1, 2, ..., n (ต้อง +1 เพราะไม่รวมค่าสุดท้าย)' },
    { line: 4, label: 'print(total)', note: 'อยู่นอกลูป (ไม่ย่อหน้า) จึงแสดงครั้งเดียว' },
    { line: 5, label: 'range(12, 0, -1)', note: 'นับถอยหลัง 12 ถึง 1' },
  ],
  tips: ['range(5) = 0, 1, 2, 3, 4', 'ย่อหน้าบอกว่าบรรทัดไหนอยู่ในลูป'],
  warn: 'print ที่ย่อหน้าเข้าไปในลูปจะแสดงทุกรอบ',
},
{ id: 'py7', unitInfo: _PY_U.loop, order: 7, icon: '⏳', title: 'while และค่าหยุด',
  paras: [
    '<code>while เงื่อนไข:</code> ทำซ้ำตราบที่เงื่อนไขยังจริง ใช้เมื่อไม่รู้จำนวนรอบล่วงหน้า เช่น รับข้อมูลจนกว่าจะพิมพ์ 0',
    'รูปแบบ "ค่าหยุด" (sentinel): รับค่าแรกก่อนลูป ตรวจในเงื่อนไข และรับค่าถัดไปท้ายลูป',
  ],
  code: `total = 0
x = int(input())
while x != 0:
    total = total + x
    x = int(input())
print(total)`,
  steps: [
    { line: 1, label: 'รับค่าแรก', note: 'ต้องมีค่าก่อนตรวจเงื่อนไขครั้งแรก' },
    { line: 2, label: 'while x != 0', note: 'ทำซ้ำจนกว่าจะเจอ 0' },
    { line: 4, label: 'รับค่าถัดไป', note: 'ถ้าลืมบรรทัดนี้ ลูปจะไม่จบ' },
  ],
  tips: ['ทุกลูป while ต้องมีบรรทัดที่ทำให้เงื่อนไขเปลี่ยน', 'ใช้ break ออกจากลูปกลางทางได้'],
  warn: 'ลูปไม่สิ้นสุดทำให้ระบบตรวจหมดเวลา (Time Limit)',
},
{ id: 'py8', unitInfo: _PY_U.data, order: 8, icon: '📋', title: 'ลิสต์ (list)',
  paras: [
    'ลิสต์เก็บข้อมูลหลายค่าในตัวแปรเดียว <code>[ ]</code> คั่นด้วยจุลภาค ดัชนีเริ่มที่ 0 และ <code>-1</code> คือตัวสุดท้าย',
    'คำสั่งที่ใช้บ่อย: <code>append</code> เพิ่ม, <code>len</code> นับ, <code>sum max min</code>, <code>in</code> ตรวจว่ามีหรือไม่',
  ],
  code: `n = int(input())
sales = []
for i in range(n):
    sales.append(int(input()))
print("รวม", sum(sales))
print("สูงสุด", max(sales))
print("วันแรก", sales[0], "วันสุดท้าย", sales[-1])`,
  steps: [
    { line: 1, label: 'sales = []', note: 'ลิสต์ว่าง' },
    { line: 3, label: 'append', note: 'เพิ่มค่าต่อท้ายลิสต์ทีละค่า' },
    { line: 4, label: 'sum(sales)', note: 'ผลรวมทุกค่าในลิสต์' },
    { line: 6, label: 'sales[-1]', note: 'ตัวสุดท้าย ไม่ต้องรู้ความยาว' },
  ],
  tips: ['for x in ลิสต์: วนทีละสมาชิกได้โดยตรง', 'ลิสต์คู่ขนาน: names[i] คู่กับ qty[i]'],
  warn: 'ดัชนีเกินขนาดลิสต์จะเกิด IndexError',
},
{ id: 'py9', unitInfo: _PY_U.data, order: 9, icon: '🔧', title: 'ฟังก์ชัน (def / return)',
  paras: [
    'ฟังก์ชันรวมคำสั่งที่ใช้ซ้ำไว้เป็นชื่อเดียว <code>def ชื่อ(พารามิเตอร์):</code> และส่งผลกลับด้วย <code>return</code>',
    'แยก "ส่วนประมวลผล" เป็นฟังก์ชัน ทำให้ทดสอบได้ง่าย และนำไปต่อกับหน้าจอ (เช่นเว็บแอปหรือ GUI) ได้ภายหลัง',
  ],
  code: `def with_vat(price):
    return price * 1.07

def grade(s):
    if s >= 80:
        return 4
    return 0

p = float(input())
print(f"{with_vat(p):.2f}")`,
  steps: [
    { line: 0, label: 'def with_vat(price):', note: 'นิยามฟังก์ชัน รับค่า 1 ตัว' },
    { line: 1, label: 'return', note: 'ส่งผลลัพธ์กลับไปยังจุดที่เรียก' },
    { line: 5, label: 'return 4', note: 'return แล้วฟังก์ชันจบทันที' },
    { line: 9, label: 'with_vat(p)', note: 'เรียกใช้ฟังก์ชันโดยส่ง p เข้าไป' },
  ],
  tips: ['ฟังก์ชันต้องนิยามก่อนบรรทัดที่เรียกใช้', 'return ต่างจาก print: return ส่งค่ากลับ print แค่แสดง'],
  warn: 'ลืม return ฟังก์ชันจะคืนค่า None',
},
{ id: 'py10', unitInfo: _PY_U.data, order: 10, icon: '🔤', title: 'ข้อความ (string)',
  paras: [
    'ข้อความต่อกันด้วย <code>+</code> และใช้ f-string แทรกค่าได้ <code>f"สวัสดี {name}"</code>',
    'คำสั่งที่ใช้บ่อย: <code>split()</code> แยกคำ, <code>strip()</code> ตัดช่องว่างหัวท้าย, <code>upper()/lower()</code>, <code>len()</code>',
  ],
  code: `cmd = input()
action, name = cmd.split()
print(f"{name} ทำรายการ {action}")
print(len(name), name.upper())`,
  steps: [
    { line: 1, label: 'split()', note: '"ยืม มิว" → ["ยืม", "มิว"] แล้วแยกใส่ 2 ตัวแปร' },
    { line: 2, label: 'f-string', note: 'แทรกค่าตัวแปรในวงเล็บปีกกา' },
    { line: 3, label: 'len / upper', note: 'นับจำนวนตัวอักษร และแปลงเป็นตัวพิมพ์ใหญ่' },
  ],
  tips: ['"ม." + room ต่อข้อความโดยไม่มีช่องว่าง', 'ตัวเลขต่อกับข้อความต้องแปลงด้วย str() หรือใช้ f-string'],
  warn: 'split() ได้กี่คำต้องมีตัวแปรรับเท่ากัน ไม่อย่างนั้นเกิด ValueError',
},
{ id: 'py11', unitInfo: _PY_U.data, order: 11, icon: '📒', title: 'ดิกชันนารี (dict)',
  paras: [
    'dict เก็บข้อมูลเป็นคู่ <b>คีย์ → ค่า</b> เหมาะกับการค้นหา เช่น ชื่อสินค้า → ราคา เขียนด้วย <code>{ }</code>',
    'อ่านค่าด้วย <code>d[คีย์]</code> ตรวจว่ามีคีย์ด้วย <code>in</code> และใช้ <code>d.get(คีย์, ค่าเริ่มต้น)</code> เมื่อไม่แน่ใจว่ามีหรือไม่',
  ],
  code: `price = {"น้ำ": 7, "ขนมปัง": 10, "นม": 12}
count = {}
total = 0
x = input()
while x != "จบ":
    if x in price:
        total += price[x]
        count[x] = count.get(x, 0) + 1
    x = input()
print(total, count)`,
  steps: [
    { line: 0, label: '{"น้ำ": 7, ...}', note: 'สร้าง dict ราคาสินค้า' },
    { line: 5, label: 'x in price', note: 'ตรวจว่ามีสินค้านี้ในเมนูไหม' },
    { line: 7, label: 'count.get(x, 0) + 1', note: 'นับจำนวนที่ซื้อของแต่ละสินค้า' },
  ],
  tips: ['dict แทนลิสต์คู่ขนานได้ อ่านง่ายกว่า', 'for k, v in d.items(): วนทั้งคีย์และค่า'],
  warn: 'อ่านคีย์ที่ไม่มีด้วย d[คีย์] จะเกิด KeyError',
},
{ id: 'py12', unitInfo: _PY_U.data, order: 12, icon: '📊', title: 'อ่านข้อมูลแบบ CSV',
  paras: [
    'CSV คือข้อมูลตารางที่แต่ละบรรทัดคั่นคอลัมน์ด้วยจุลภาค เช่น ผลแบบสอบถามที่ส่งออกจาก Google Forms ใช้ <code>split(",")</code> แยกคอลัมน์ได้',
    'ในงานจริง (เช่น Colab) ใช้โมดูล <code>csv</code> อ่านจากไฟล์ ส่วนใน APCC ข้อมูลมาจาก input ทีละบรรทัด หลักการเหมือนกัน',
  ],
  code: `n = int(input())
scores = []
for i in range(n):
    row = input().split(",")
    name, score = row[0], int(row[1])
    scores.append(score)
print(f"{sum(scores) / n:.2f}")`,
  steps: [
    { line: 3, label: 'split(",")', note: '"มิว,4" → ["มิว", "4"]' },
    { line: 4, label: 'int(row[1])', note: 'คอลัมน์ที่ 2 เป็นข้อความ ต้องแปลงเป็นตัวเลข' },
    { line: 6, label: 'ค่าเฉลี่ย', note: 'สรุปผลความพึงพอใจของผู้ใช้' },
  ],
  tips: ['บรรทัดแรกของไฟล์ CSV มักเป็นหัวตาราง ต้องข้ามไป', 'ใช้ strip() ตัดช่องว่างก่อนแปลงเป็นตัวเลข'],
  warn: 'ข้อมูลจริงอาจมีช่องว่างหรือค่าว่าง ต้องตรวจก่อนคำนวณ',
},
];

window.STUDIO_PYTHON_TOPICS = STUDIO_PYTHON_TOPICS;

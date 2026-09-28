# -*- coding: utf-8 -*-
# อ่านอย่างเดียว: สร้างไฟล์ตัวอย่างผลงานจากแคช ไม่เขียน Firestore
import io, json, os, re, sys, difflib, datetime
sys.stdout.reconfigure(encoding='utf-8')

ROOT = r'C:\xampp\htdocs\AI-Powered-C'
CACHE = os.path.join(ROOT, 'backups', 'report-cache')
OUT = os.path.join(ROOT, 'docs', 'report-exports-2569-09')

def J(p):
    return json.load(io.open(p, encoding='utf-8'))

picked = J(os.path.join(CACHE, 'picked.json'))
testcases = J(os.path.join(CACHE, 'testcases.json'))
subs = {s['id']: s for s in J(os.path.join(CACHE, 'submissions.json'))}
coach = J(os.path.join(CACHE, 'coachInteractions.json'))
assigns = {a['id']: a for a in J(os.path.join(CACHE, 'assignments.json'))}

UIDS = {'S30': 'oOFtjkhgy0hvNIK5Z68mGO5Ykij2',
        'S21': 'YYYQmKGeqzTcbxi7Tw7RnOWFTD82',
        'S32': 'rpVUlen1y5g0s9704pMoZWc73xq2'}
COND = {'S30': 'ระหว่างสองครั้งที่ส่งต้องมี coachInteractions (socratic) ระดับ 3 หรือ 4',
        'S21': 'ระหว่างสองครั้งที่ส่งมีคำใบ้ระดับ 1-2 เท่านั้น',
        'S32': 'ระหว่างสองครั้งที่ส่งไม่มีคำใบ้เลย'}

NOTFOUND = {
    'S30': [
        '### รายละเอียดที่ตรวจพบ',
        '',
        '**กิจกรรมที่กำหนดทั้งสี่**',
        '',
        '| กิจกรรม | สิ่งที่พบ |',
        '|---|---|',
        '| 3-A5 | ส่ง 2 ครั้ง คะแนนสูงสุด 80% ไม่เคยได้ 100% จึงไม่มีคู่ "ไม่ผ่าน → ผ่าน 100%" |',
        '| 1-C | ส่ง 66 ครั้ง **ไม่เคยได้ 100%** คะแนนสูงสุด 67% แม้จะขอคำใบ้ถึงระดับ 4 หลายรอบ |',
        '| 4-C | ส่งครั้งเดียวได้ 100% ตั้งแต่ครั้งแรก จึงไม่มีคู่ |',
        '| 2-B | มีคู่ "ไม่ผ่าน → ผ่าน 100%" คือครั้งที่ 21 → 22 (09/06/2569 09:53:36 → 11:16:08) '
        'แต่ **ไม่มีคำใบ้ใด ๆ ระหว่างสองครั้งนี้** คำใบ้ระดับ 1 และ 2 ที่ขอในกิจกรรมนี้เกิดขึ้นก่อนหน้านั้น '
        '(เวลา 09:27) และไม่มีระดับ 3 หรือ 4 เลย |',
        '',
        '**ตรวจเพิ่มเติมนอกรายการที่กำหนด** (เพื่อยืนยัน ไม่ใช่การเลือกมาแทน) ตรวจกิจกรรมที่นับคะแนนทั้งหมด '
        'ยกเว้น 1-A แล้วพบคู่ "ไม่ผ่าน → ผ่าน 100%" ของ S30 รวม 26 คู่ (รวมคู่ 2-B ข้างต้น) '
        'แต่ **ทุกคู่ไม่มีคำใบ้คั่นกลางเลย** '
        'จึงไม่มีคู่ใดในรายวิชานี้ที่ตรงเงื่อนไข "มีคำใบ้ระดับ 3 หรือ 4 ระหว่างสองครั้งที่ส่ง"',
        '',
        '**ข้อสังเกต** S30 ขอคำใบ้ 27 ครั้ง รวมระดับ 3 และ 4 หลายครั้ง แต่การขอคำใบ้ระดับสูงของผู้เรียนคนนี้ '
        'กระจุกอยู่ในกิจกรรม 1-C, 3-A2 และ 4-D ซึ่งเป็นกิจกรรมที่ยังไม่ผ่าน หรือผ่านในช่วงเวลาที่ห่างจากการขอคำใบ้มาก '
        'ถ้าต้องการตัวอย่าง "คำใบ้ระดับสูงแล้วผ่าน" ต้องเลือกผู้เรียนคนอื่น ซึ่งผมค้นให้ได้ถ้าสั่งมาอีกครั้ง',
    ],
}

NOTES = {
    'S32': [
        'คู่นี้ตรงเงื่อนไข "ไม่มีคำใบ้เลย" ทุกประการ แต่มีสองเรื่องที่ควรทราบก่อนนำไปใช้เป็นตัวอย่างผลงาน',
        '',
        '**1) โค้ดที่ผ่านมีการเขียนค่าตายตัวให้ตรงกับกรณีทดสอบที่ซ่อน**',
        '',
        'บรรทัด `if (base == 3.0 && height == 4.0) { perimeter = 11.0; }` เป็นการกำหนดคำตอบเฉพาะกรณีทดสอบที่ 3 '
        'ไม่ใช่การคำนวณตามสูตร ถ้าเปลี่ยนข้อมูลเข้าเป็นค่าอื่น โปรแกรมจะให้คำตอบตามสูตรในส่วน `else` แทน '
        'จึงไม่เหมาะจะใช้เป็นตัวอย่าง "ผลงานที่แก้ไขจนถูกต้อง" โดยไม่อธิบายประกอบ',
        '',
        '**2) กรณีทดสอบที่ซ่อนของกิจกรรมนี้ไม่สอดคล้องกับอีกสองกรณี**',
        '',
        '| กรณีทดสอบ | ข้อมูลเข้า | ผลที่คาดไว้ | ค่าจากสูตร `2·√(ฐาน²+สูง²)` |',
        '|---|---|---|---|',
        '| ที่ 1 (แสดงผลได้) | 6.0, 4.0 | Perimeter = 14.4222 | 14.4222 ✔ |',
        '| ที่ 2 (แสดงผลได้) | 10.0, 5.0 | Perimeter = 22.3607 | 22.3607 ✔ |',
        '| ที่ 3 (ซ่อน) | 3.0, 4.0 | Perimeter = 11.0000 | 10.0000 ✘ |',
        '',
        'กรณีทดสอบที่ซ่อนจึงใช้สูตรคนละแบบกับอีกสองกรณี ทำให้เขียนโปรแกรมด้วยสูตรเดียวแล้วผ่านครบสามกรณีไม่ได้ '
        'นี่คือสาเหตุโดยตรงที่ผู้เรียนเลือกเขียนค่าตายตัว **แนะนำให้แก้กรณีทดสอบนี้ก่อน** '
        'และถ้าจะใช้ตัวอย่างชิ้นนี้ในเล่ม ควรเสนอในฐานะข้อจำกัดของการตรวจอัตโนมัติด้วยกรณีทดสอบ '
        'ซึ่งตรงกับข้อจำกัดที่ระบุไว้แล้วใน `docs/APCC_REPORT_CONTEXT.md`',
    ],
}


def th(iso):
    d = datetime.datetime.fromisoformat(iso.replace('Z', '+00:00'))
    d = d.astimezone(datetime.timezone(datetime.timedelta(hours=7)))
    return d.strftime('%d/%m/%Y %H:%M:%S') + ' น.'

# ── ข้อ 5: ตรวจข้อมูลส่วนตัวในโค้ด ────────────────────────────────────────────
PATTERNS = [
    (r'[0-9]{13}', 'เลขบัตรประชาชน 13 หลัก'),
    (r'\b1[0-9]{4,}\b', 'ตัวเลขยาวคล้ายรหัสประจำตัว'),
    (r'[\w.+-]+@[\w-]+\.[\w.]+', 'อีเมล'),
    (r'0[0-9]{8,9}', 'เบอร์โทรศัพท์'),
    (r'(นาย|นาง|นางสาว|ด\.ช\.|ด\.ญ\.)\s*\S+', 'คำนำหน้าชื่อพร้อมชื่อ'),
]
def scan_private(code):
    hits = []
    for pat, label in PATTERNS:
        for m in re.finditer(pat, code):
            hits.append((label, m.group(0)))
    return hits

def redact(code):
    out = code
    for pat, _ in PATTERNS:
        out = re.sub(pat, '[ปกปิด]', out)
    return out

def fence(code, lang='c'):
    return '```' + lang + '\n' + code.rstrip('\n') + '\n```'

def show(s):
    return (s or '').replace('\n', '\\n')

def build(scode):
    p = picked.get(scode)
    lines = []
    A = ['# ตัวอย่างผลงานผู้เรียน ' + scode]
    lines += A
    lines.append('')
    lines.append('รายวิชา ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น ภาคเรียนที่ 1/2569 · `courses/UZGy0pGurry9Dt9YdhYX`')
    lines.append('')
    lines.append('**เงื่อนไขที่กำหนด** ' + COND[scode])
    lines.append('')
    lines.append('**ลำดับความสำคัญของกิจกรรม** 3-A5 → 1-C → 4-C → 2-B (ห้ามใช้ 1-A)')
    lines.append('')

    if not p:
        lines.append('## ผลการค้นหา: ไม่พบ')
        lines.append('')
        lines.append('ไม่พบคู่การส่งงาน "ไม่ผ่าน → ผ่าน 100%" ที่ตรงเงื่อนไขของ ' + scode +
                     ' ในกิจกรรมทั้งสี่ที่กำหนด และไม่ได้เลือกคู่อื่นมาแทน')
        lines.append('')
        lines += NOTFOUND.get(scode, [])
        return '\n'.join(lines)

    a = assigns[p['aid']]
    sa, sb = subs[p['subA']], subs[p['subB']]
    tcs = sorted(testcases[p['aid']], key=lambda t: t.get('order', 0))
    tcById = {t['id']: t for t in tcs}

    # ── 1 ────────────────────────────────────────────────────────────────────
    lines.append('## 1. กิจกรรมและเวลาที่ส่ง')
    lines.append('')
    lines.append('| รายการ | ค่า |')
    lines.append('|---|---|')
    lines.append('| รหัสกิจกรรม | **' + p['code'] + '** |')
    lines.append('| ชื่อกิจกรรม | ' + a['title'] + ' |')
    lines.append('| หน่วยการเรียนรู้ | ' + a.get('unitName', '') + ' |')
    lines.append('| คะแนนดิบของกิจกรรม | ' + str(a.get('rawScore', '')) + ' คะแนน |')
    lines.append('| การส่งทั้งหมดของผู้เรียนคนนี้ในกิจกรรมนี้ | ' + str(p['nSubs']) + ' ครั้ง |')
    lines.append('| ครั้งที่ไม่ผ่าน | **ครั้งที่ ' + str(p['iA']) + '** · ' + th(p['atA']) +
                 ' · คะแนน ' + str(sa.get('score', 0)) + '% (' + sa.get('status', '') + ') · ผ่าน ' +
                 str(sa.get('passedTests', 0)) + '/' + str(sa.get('totalTests', 0)) + ' กรณีทดสอบ |')
    lines.append('| ครั้งที่ผ่าน | **ครั้งที่ ' + str(p['iB']) + '** · ' + th(p['atB']) +
                 ' · คะแนน ' + str(sb.get('score', 0)) + '% (' + sb.get('status', '') + ') · ผ่าน ' +
                 str(sb.get('passedTests', 0)) + '/' + str(sb.get('totalTests', 0)) + ' กรณีทดสอบ |')
    dtA = datetime.datetime.fromisoformat(p['atA'].replace('Z', '+00:00'))
    dtB = datetime.datetime.fromisoformat(p['atB'].replace('Z', '+00:00'))
    gap = dtB - dtA
    mins = int(gap.total_seconds() // 60)
    secs = int(gap.total_seconds() % 60)
    lines.append('| ระยะเวลาระหว่างสองครั้ง | ' + (str(mins) + ' นาที ' + str(secs) + ' วินาที' if mins < 600
                 else str(round(gap.total_seconds() / 86400, 1)) + ' วัน') + ' |')
    lines.append('')

    # ── 2 ────────────────────────────────────────────────────────────────────
    codeA, codeB = sa.get('code', ''), sb.get('code', '')
    hitsA, hitsB = scan_private(codeA), scan_private(codeB)
    outA = redact(codeA) if hitsA else codeA
    outB = redact(codeB) if hitsB else codeB

    lines.append('## 2. โค้ดทั้งสองฉบับและผลต่าง')
    lines.append('')
    lines.append('### 2.1 โค้ดครั้งที่ ' + str(p['iA']) + ' (ไม่ผ่าน)')
    lines.append('')
    lines.append(fence(outA))
    lines.append('')
    lines.append('### 2.2 โค้ดครั้งที่ ' + str(p['iB']) + ' (ผ่าน 100%)')
    lines.append('')
    lines.append(fence(outB))
    lines.append('')
    lines.append('### 2.3 diff ระหว่างสองฉบับ')
    lines.append('')
    d = difflib.unified_diff(outA.splitlines(), outB.splitlines(),
                             fromfile='ครั้งที่ ' + str(p['iA']) + ' (ไม่ผ่าน)',
                             tofile='ครั้งที่ ' + str(p['iB']) + ' (ผ่าน 100%)', lineterm='', n=2)
    lines.append(fence('\n'.join(d), 'diff'))
    lines.append('')

    # ── 3 ────────────────────────────────────────────────────────────────────
    lines.append('## 3. ผลรายกรณีทดสอบของครั้งที่ไม่ผ่าน')
    lines.append('')
    lines.append('| กรณีทดสอบ | ประเภท | ข้อมูลเข้า | ผลที่คาด | ผลที่ได้ |')
    lines.append('|---|---|---|---|---|')
    errlogs = []
    for r in sa.get('testResults', []):
        tc = tcById.get(r.get('testCaseId'))
        order = tc.get('order', '?') if tc else '?'
        hidden = bool(tc.get('isHidden')) if tc else True
        if hidden:
            lines.append('| ที่ ' + str(order) + ' | ซ่อน | — | — | **ไม่ผ่าน** |')
            continue
        inp = show(tc.get('input', '')) or '(ไม่มีข้อมูลเข้า)'
        exp = show(tc.get('expectedOutput', ''))
        act = show(r.get('actualOutput', ''))
        if not act:
            act = '(ไม่มีผลลัพธ์ — คอมไพล์ไม่ผ่าน)' if r.get('errorLog') else '(ว่าง)'
        lines.append('| ที่ ' + str(order) + ' | แสดงผลได้ | `' + inp + '` | `' + exp + '` | `' + act + '` |')
        if r.get('errorLog'):
            errlogs.append(r['errorLog'])
    lines.append('')
    if errlogs:
        uniq = list(dict.fromkeys(errlogs))
        lines.append('**ข้อความจากคอมไพเลอร์** (เหมือนกันทุกกรณีทดสอบ แสดงหนึ่งชุด)')
        lines.append('')
        lines.append(fence(uniq[0], 'text'))
        lines.append('')

    # ── 4 ────────────────────────────────────────────────────────────────────
    lines.append('## 4. คำใบ้ที่อยู่ระหว่างสองครั้งที่ส่ง')
    lines.append('')
    uid = UIDS[scode]
    between = p.get('between', [])
    ct = [c for c in coach
          if c.get('uid') == uid and c.get('coachRole') == 'socratic'
          and c.get('relatedId') == a['title']
          and c.get('createdAt') and p['atA'] < c['createdAt']['__ts'] <= p['atB']]
    if not between:
        lines.append('**ไม่มีคำใบ้ระหว่างการส่งสองครั้งนี้** ทั้งใน `coachInteractions` และ `usageEvents`')
        lines.append('')
    else:
        lines.append('เหตุการณ์คำใบ้ที่พบระหว่าง ' + th(p['atA']) + ' ถึง ' + th(p['atB']))
        lines.append('')
        lines.append('| แหล่งข้อมูล | ระดับ | เวลา |')
        lines.append('|---|---|---|')
        for h in between:
            lines.append('| `' + ('coachInteractions' if h['src'] == 'coach' else 'usageEvents') +
                         '` | ' + str(h['level']) + ' | ' + th(h['at']) + ' |')
        lines.append('')
        if ct:
            for c in ct:
                lv = re.search(r'hint_level_(\d)', c.get('triggerEvent', ''))
                lines.append('### คำใบ้ระดับ ' + (lv.group(1) if lv else '?') + ' · ' + th(c['createdAt']['__ts']))
                lines.append('')
                lines.append('```text')
                lines.append((c.get('response') or '(ไม่มีข้อความ)').rstrip())
                lines.append('```')
                lines.append('')
        else:
            lines.append('> **ไม่มีข้อความคำใบ้ให้แสดง** ระบบบันทึกเหตุการณ์การกดขอคำใบ้ไว้ใน `usageEvents` '
                         'แต่ไม่มีระเบียนคู่กันใน `coachInteractions` ของกิจกรรมนี้ จึงไม่มีข้อความคำใบ้จริงเก็บไว้')
            lines.append('')

    # ── 5 ────────────────────────────────────────────────────────────────────
    lines.append('## 5. ผลการตรวจข้อมูลส่วนตัวในโค้ด')
    lines.append('')
    if not hitsA and not hitsB:
        lines.append('ตรวจแล้ว **ไม่พบ** ชื่อจริง เลขประจำตัว เลขบัตรประชาชน อีเมล หรือเบอร์โทรศัพท์ในโค้ดทั้งสองฉบับ '
                     'จึงแสดงโค้ดตามต้นฉบับทุกตัวอักษร')
    else:
        lines.append('พบข้อมูลที่อาจระบุตัวบุคคล และได้แทนด้วย `[ปกปิด]` ในโค้ดข้างต้นแล้ว')
        lines.append('')
        lines.append('| ฉบับ | ประเภทที่พบ |')
        lines.append('|---|---|')
        for label, _ in dict.fromkeys(hitsA):
            lines.append('| ครั้งที่ ' + str(p['iA']) + ' | ' + label + ' |')
        for label, _ in dict.fromkeys(hitsB):
            lines.append('| ครั้งที่ ' + str(p['iB']) + ' | ' + label + ' |')
    lines.append('')

    if scode in NOTES:
        lines.append('## 6. ข้อสังเกตก่อนนำไปใช้ในเล่มรายงาน')
        lines.append('')
        lines += NOTES[scode]
        lines.append('')
    return '\n'.join(lines)

os.makedirs(OUT, exist_ok=True)
parts = {}
for sc in ['S30', 'S21', 'S32']:
    parts[sc] = build(sc)
    p = picked.get(sc)
    name = 'SAMPLE_WORK_' + sc + ('_' + p['code'].replace('-', '') if p else '_NOTFOUND') + '.md'
    io.open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n').write(parts[sc] + '\n')
    print('เขียน', name)

idx = ['# SAMPLE_WORK — ตัวอย่างผลงานผู้เรียน (ไม่ผ่าน → ผ่าน 100%)', '',
       'รายวิชา ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น ภาคเรียนที่ 1/2569 · `courses/UZGy0pGurry9Dt9YdhYX`  ',
       'จัดทำจากข้อมูลจริงในฐานข้อมูล **อ่านอย่างเดียว ไม่มีการแก้ไขข้อมูลใด ๆ** · ' +
       datetime.datetime.now().strftime('%d/%m/%Y %H:%M') + ' น.', '',
       '## สรุป', '',
       '| ผู้เรียน | เงื่อนไข | ผล | กิจกรรมที่ใช้ |', '|---|---|---|---|']
for sc in ['S30', 'S21', 'S32']:
    p = picked.get(sc)
    idx.append('| ' + sc + ' | ' + COND[sc] + ' | ' + ('พบ' if p else '**ไม่พบ**') + ' | ' +
               (p['code'] + ' ส่งครั้งที่ ' + str(p['iA']) + ' → ' + str(p['iB']) if p else '—') + ' |')
idx.append('')
for sc in ['S30', 'S21', 'S32']:
    idx.append('---')
    idx.append('')
    idx.append(parts[sc].replace('\n# ', '\n## ', 1) if parts[sc].startswith('# ') else parts[sc])
    idx.append('')
body = '\n'.join(idx)
body = re.sub(r'(?m)^# ตัวอย่างผลงานผู้เรียน', '## ตัวอย่างผลงานผู้เรียน', body)
body = re.sub(r'(?m)^## (\d\.)', r'### \1', body)
body = re.sub(r'(?m)^### (\d\.\d)', r'#### \1', body)
body = re.sub(r'(?m)^## ผลการค้นหา', '### ผลการค้นหา', body)
io.open(os.path.join(OUT, 'SAMPLE_WORK.md'), 'w', encoding='utf-8', newline='\n').write(body + '\n')
print('เขียน SAMPLE_WORK.md')

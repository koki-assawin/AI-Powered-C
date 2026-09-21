// js/hintEngine.js — Local diagnostic engine for Socratic hints (4 levels)
// Analyzes the student's actual failing test (expected vs actual output, compiler/runtime
// errors) plus static checks on their code, so every hint level points at the real mistake
// in *this* problem. Grounds the Gemini prompt in aiCoach.js, and is the fallback when Gemini
// is unavailable (rate limit/outage) — students never get a one-size-fits-all canned hint.
//
// Levels follow the report's Socratic scaffold (ZPD — help fades as the student can do more):
//   1 คำถาม  — Socratic question that points attention at the exact spot, no answer
//   2 Concept — the concept behind this kind of mistake, with a neutral example
//   3 Scaffold — step-by-step procedure/trace table to find and fix it themselves
//   4 Error   — concrete diagnosis: which output line / code line, expected vs actual

const _HE_NUM_RE = /-?\d+(?:\.\d+)?/g;

function _heLines(s) {
    return (s || '').replace(/\r\n/g, '\n').split('\n');
}

function _heFirstDiffCol(a, b) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
    return n;
}

function _heQuote(s, visibleSpaces) {
    const t = (s || '').length > 70 ? s.slice(0, 70) + '…' : (s || '');
    return '"' + (visibleSpaces ? t.replace(/ /g, '·') : t) + '"';
}

function _heOut(lang) {
    return { c: 'printf', cpp: 'cout', python: 'print', java: 'System.out.println' }[lang] || 'printf';
}

function _heSplitTop(s) {
    const out = [];
    let depth = 0, cur = '';
    for (const ch of s || '') {
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out;
}

// Variable declarations + function parameters → { name: { type, init, isArray, param, line } }
function _heDecls(code) {
    const decls = {};
    const lines = _heLines(code);
    const declRe = /\b(int|float|double|long|char|short|unsigned)\b(?:\s+(?:int|long|double))?\s+([^;(){}]+);/g;
    const fnRe = /\b(int|float|double|void|char|long)\s+[A-Za-z_]\w*\s*\(([^)]*)\)/g;
    lines.forEach((raw, idx) => {
        const ln = raw.replace(/\/\/.*$/, '');
        let m;
        declRe.lastIndex = 0;
        while ((m = declRe.exec(ln))) {
            const type = m[1];
            _heSplitTop(m[2]).forEach(part => {
                const p = part.trim();
                const nm = p.match(/^\*?\s*([A-Za-z_]\w*)/);
                if (!nm) return;
                const lhs = p.split('=')[0];
                decls[nm[1]] = { type, init: p.includes('='), isArray: /\[/.test(lhs), param: false, line: idx + 1 };
            });
        }
        fnRe.lastIndex = 0;
        while ((m = fnRe.exec(ln))) {
            _heSplitTop(m[2]).forEach(part => {
                const pm = part.trim().match(/^(int|float|double|long|char|short|unsigned)\b.*?\b([A-Za-z_]\w*)\s*(\[\s*\])?$/);
                if (pm) decls[pm[2]] = { type: pm[1], init: true, isArray: !!pm[3], param: true, line: idx + 1 };
            });
        }
    });
    return decls;
}

function _heHeaderEnd(ln, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < ln.length; i++) {
        if (ln[i] === '(') depth++;
        else if (ln[i] === ')') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

// Loop headers with a simple "does the update move away from ending the loop?" check
function _heLoops(code) {
    const loops = [];
    _heLines(code).forEach((raw, idx) => {
        const ln = raw.replace(/\/\/.*$/, '');
        const m = ln.match(/\b(for|while)\s*\(/);
        if (!m) return;
        const open = ln.indexOf('(', m.index);
        const close = _heHeaderEnd(ln, open);
        const header = close > 0 ? ln.slice(open + 1, close) : ln.slice(open + 1);
        const loop = { line: idx + 1, kind: m[1], text: raw.trim(), runaway: false };
        if (m[1] === 'for') {
            const parts = header.split(';');
            if (parts.length === 3) {
                const cond = parts[1], upd = parts[2];
                const cm = cond.match(/([A-Za-z_]\w*)\s*(<=|<|>=|>)/);
                if (cm) {
                    const v = cm[1], op = cm[2];
                    const inc = new RegExp(`${v}\\s*\\+\\+|\\+\\+\\s*${v}|${v}\\s*\\+=|${v}\\s*=\\s*${v}\\s*\\+`).test(upd);
                    const dec = new RegExp(`${v}\\s*--|--\\s*${v}|${v}\\s*-=|${v}\\s*=\\s*${v}\\s*-`).test(upd);
                    if ((op[0] === '>' && inc) || (op[0] === '<' && dec)) loop.runaway = true;
                    if (!new RegExp(`\\b${v}\\b`).test(upd)) loop.noUpdate = v;
                }
            }
        }
        loops.push(loop);
    });
    return loops;
}

// Static checks on C/C++ code — each finding carries the code line number
function _heStaticChecks(code, language) {
    if (language !== 'c' && language !== 'cpp') return [];
    const issues = [];
    const lines = _heLines(code);
    const decls = _heDecls(code);
    const isFloat = (t) => t === 'float' || t === 'double';
    const isInt = (t) => ['int', 'long', 'short', 'unsigned'].includes(t);

    lines.forEach((raw, idx) => {
        const ln = raw.replace(/\/\/.*$/, '');
        const no = idx + 1;
        const text = raw.trim();

        const sm = ln.match(/scanf\s*\(\s*"[^"]*"\s*,(.*)\)\s*;/);
        if (sm) {
            _heSplitTop(sm[1]).forEach(arg => {
                const a = arg.trim();
                const d = decls[a];
                if (/^[A-Za-z_]\w*$/.test(a) && d && !d.isArray && d.type !== 'char') {
                    issues.push({ kind: 'scanf_amp', line: no, var: a, text });
                }
            });
        }

        if (/\b(if|while)\s*\(\s*[A-Za-z_]\w*(\[[^\]]*\])?\s*=\s*[^=]/.test(ln)) {
            issues.push({ kind: 'assign_in_cond', line: no, text });
        }

        const hdr = /\b(for|while|if)\s*\(/g;
        let hm;
        while ((hm = hdr.exec(ln))) {
            const open = ln.indexOf('(', hm.index);
            const close = _heHeaderEnd(ln, open);
            if (close > 0 && ln.slice(close + 1).trim() === ';') {
                // "} while (...);" closing a do-while is legitimate, on the same or the previous line
                const before = ln.slice(0, hm.index).trim();
                const prev = lines.slice(0, idx).reverse().find(l => l.trim()) || '';
                const hasDo = /\bdo\b/.test(lines.slice(0, idx + 1).join('\n'));
                const isDoWhileTail = hm[1] === 'while' && hasDo
                    && (before.endsWith('}') || (!before && prev.replace(/\/\/.*$/, '').trim().endsWith('}')));
                if (!isDoWhileTail) issues.push({ kind: 'semicolon_after_header', line: no, keyword: hm[1], text });
            }
        }

        const pm = ln.match(/printf\s*\(\s*"((?:[^"\\]|\\.)*)"\s*(,.*)?\)\s*;/);
        if (pm) {
            const specs = [...pm[1].matchAll(/%[-+ 0#]*\d*(?:\.\d+)?(?:hh|h|ll|l|L)?([diouxXfFeEgGcs%])/g)]
                .map(x => x[1]).filter(c => c !== '%');
            const args = pm[2] ? _heSplitTop(pm[2].slice(1)).map(s => s.trim()) : [];
            specs.forEach((sp, k) => {
                const d = decls[args[k]];
                if (!d || d.isArray) return;
                if ('di'.includes(sp) && isFloat(d.type)) issues.push({ kind: 'fmt_int_for_float', line: no, var: args[k], spec: '%' + sp, text });
                if ('fFeEgG'.includes(sp) && isInt(d.type)) issues.push({ kind: 'fmt_float_for_int', line: no, var: args[k], spec: '%' + sp, text });
            });
            if (specs.length !== args.length) issues.push({ kind: 'fmt_count', line: no, specs: specs.length, args: args.length, text });
        }

        const dv = ln.match(/\b([A-Za-z_]\w*)\s*=\s*\(?\s*([A-Za-z_]\w*)\s*\)?\s*\/\s*([A-Za-z_]\w*)\b/);
        if (dv && decls[dv[1]] && isFloat(decls[dv[1]].type) && decls[dv[2]] && decls[dv[3]]
            && isInt(decls[dv[2]].type) && isInt(decls[dv[3]].type) && !/\(\s*(float|double)\s*\)/.test(ln)) {
            issues.push({ kind: 'int_division', line: no, a: dv[2], b: dv[3], text });
        }
        const rv = ln.match(/\breturn\s+([A-Za-z_]\w*)\s*\/\s*([A-Za-z_]\w*)\s*;/);
        if (rv && decls[rv[1]] && decls[rv[2]] && isInt(decls[rv[1]].type) && isInt(decls[rv[2]].type)) {
            const header = lines.slice(0, idx).reverse().find(l => /\b(float|double|int|void|char|long)\s+[A-Za-z_]\w*\s*\([^;]*\)\s*\{?\s*$/.test(l));
            if (header && /\b(float|double)\s+[A-Za-z_]\w*\s*\(/.test(header)) {
                issues.push({ kind: 'int_division', line: no, a: rv[1], b: rv[2], text });
            }
        }
    });

    // Accumulators used (x += ..., x++, x = x + ...) before ever being given a value
    Object.entries(decls).forEach(([name, d]) => {
        if (d.init || d.isArray || d.param) return;
        const assignRe = new RegExp(`\\b${name}\\s*=[^=]`);
        const scanfRe = new RegExp(`scanf\\s*\\([^;]*&\\s*${name}\\b`);
        const useRe = new RegExp(`\\b${name}\\s*[+\\-*/]=|\\b${name}\\s*=\\s*${name}\\b\\s*[+\\-*/]|\\b${name}\\s*(\\+\\+|--)|(\\+\\+|--)\\s*${name}\\b`);
        for (let i = d.line; i < lines.length; i++) {
            const l = lines[i].replace(/\/\/.*$/, '');
            const useIdx = l.search(useRe);
            const asgIdx = l.search(assignRe);
            if (scanfRe.test(l) || (asgIdx >= 0 && (useIdx < 0 || asgIdx < useIdx) && !useRe.test(l.slice(asgIdx, asgIdx + name.length + 4)))) break;
            if (useIdx >= 0) {
                issues.push({ kind: 'uninit', line: i + 1, declLine: d.line, var: name, text: lines[i].trim() });
                break;
            }
        }
    });

    issues.sort((a, b) => a.line - b.line);
    return issues;
}

function _heParseCompile(log) {
    const m = (log || '').match(/:(\d+):(?:\d+:)?\s*(?:fatal\s+)?error:\s*(.+)/);
    const msg = m ? m[2].trim() : ((log || '').split('\n').find(l => /error/i.test(l)) || (log || '').split('\n')[0] || '');
    const info = { compileLine: m ? parseInt(m[1]) : null, compileMsg: msg.slice(0, 160), compileKind: 'other' };
    if (/expected ';'/.test(msg)) info.compileKind = 'missing_semicolon';
    else if (/undeclared|was not declared/.test(msg)) info.compileKind = 'undeclared';
    else if (/implicit declaration of function|was not declared in this scope/.test(msg)) info.compileKind = 'implicit_function';
    else if (/expected declaration or statement at end of input|expected '}'/.test(msg)) info.compileKind = 'unbalanced_brace';
    else if (/expected '\)'|expected '\('/.test(msg)) info.compileKind = 'missing_paren';
    else if (/stray/.test(msg)) info.compileKind = 'stray_char';
    else if (/missing terminating/.test(msg)) info.compileKind = 'unterminated_string';
    const um = msg.match(/[‘'`]([A-Za-z_]\w*)[’'`]/);
    if (um) info.compileName = um[1];
    return info;
}

// Main entry: pick the most informative failing test and classify the mistake
function diagnoseFailure(code, language, testResults) {
    const results = testResults || [];
    const failed = results.filter(r => !r.passed);
    if (!failed.length) return null;
    const target = failed.find(r => r.isCompileError) || failed.find(r => !r.isHidden) || failed[0];
    const d = {
        testNo: results.indexOf(target) + 1,
        failedCount: failed.length,
        totalCount: results.length,
        isHidden: !!target.isHidden,
        input: target.input || '',
        expected: target.expectedOutput || '',
        actual: target.actualOutput || '',
        errorLog: target.errorLog || '',
        codeIssues: _heStaticChecks(code, language),
        loops: _heLoops(code),
    };

    if (target.isCompileError) return Object.assign(d, { category: 'compile_error' }, _heParseCompile(d.errorLog));
    if (/Compile service unavailable/i.test(d.errorLog)) return Object.assign(d, { category: 'service' });
    if (d.errorLog && !d.actual) {
        d.category = /time\s*limit|timed?\s*out|killed|SIGKILL|signal 9/i.test(d.errorLog) ? 'timeout'
            : /segmentation|SIGSEGV|signal 11/i.test(d.errorLog) ? 'segfault'
            : /floating point|SIGFPE/i.test(d.errorLog) ? 'div_zero'
            : 'runtime_error';
        return d;
    }
    if (!d.actual) return Object.assign(d, { category: 'no_output' });

    const E = _heLines(d.expected), A = _heLines(d.actual);
    if (A.length > Math.max(50, E.length * 5)) return Object.assign(d, { category: 'runaway_output', actualLines: A.length, expectedLines: E.length });

    let i = 0;
    while (i < Math.min(E.length, A.length) && E[i] === A[i]) i++;
    d.lineNo = i + 1;
    d.expectedLines = E.length;
    d.actualLines = A.length;
    if (i >= E.length) return Object.assign(d, { category: 'extra_lines', actualLine: A[i] });
    if (i >= A.length) return Object.assign(d, { category: 'missing_lines', expectedLine: E[i] });

    const e = E[i], a = A[i];
    d.expectedLine = e;
    d.actualLine = a;
    d.col = _heFirstDiffCol(e, a);
    if (a.startsWith(e) && A.length < E.length) return Object.assign(d, { category: 'missing_newline' });
    if (e.toLowerCase() === a.toLowerCase()) return Object.assign(d, { category: 'case_mismatch' });
    if (e.replace(/\s+/g, '') === a.replace(/\s+/g, '')) return Object.assign(d, { category: 'whitespace_mismatch' });

    const numsE = e.match(_HE_NUM_RE) || [], numsA = a.match(_HE_NUM_RE) || [];
    const tplE = e.replace(_HE_NUM_RE, '#'), tplA = a.replace(_HE_NUM_RE, '#');
    if (tplE !== tplA && numsE.join('|') === numsA.join('|')) return Object.assign(d, { category: 'label_mismatch' });
    if (tplE === tplA && numsE.length === numsA.length && numsE.length > 0) {
        const k = numsE.findIndex((n, j) => n !== numsA[j]);
        const en = numsE[k], an = numsA[k];
        Object.assign(d, { expectedNum: en, actualNum: an });
        if (parseFloat(en) === parseFloat(an)) return Object.assign(d, { category: 'number_format' });
        d.category = 'wrong_value';
        const ev = parseFloat(en), av = parseFloat(an), diff = av - ev;
        const inputNums = (d.input.match(_HE_NUM_RE) || []).map(Number);
        const otherExpected = (d.expected.match(_HE_NUM_RE) || []).filter(n => n !== en);
        if (en.includes('.') && Math.trunc(ev) === av) d.subtype = 'int_division';
        else if (Math.abs(av) > 1e6 && Math.abs(ev) < 1e6) d.subtype = 'garbage';
        else if (new RegExp(`=\\s*${an.replace('.', '\\.').replace('-', '-\\s*')}\\b`).test(code)) d.subtype = 'initial_unchanged';
        else if (otherExpected.includes(an)) d.subtype = 'swapped';
        else if (inputNums.includes(Math.abs(diff))) { d.subtype = 'missing_element'; d.diffValue = diff; }
        return d;
    }
    return Object.assign(d, { category: 'different_output' });
}

// ── Text builders ────────────────────────────────────────────────────────────

function _heIssueText(iss) {
    switch (iss.kind) {
        case 'scanf_amp': return {
            q: `ในบรรทัดที่ ${iss.line} คุณส่งตัวแปร ${iss.var} ให้ scanf — scanf ต้องรู้ "ตำแหน่ง" ของตัวแปรในหน่วยความจำเพื่อเขียนค่าลงไป เราบอกตำแหน่งของตัวแปรด้วยสัญลักษณ์อะไร?`,
            e: `บรรทัด ${iss.line}: ${iss.text} → ตัวแปร ${iss.var} ใน scanf ยังไม่มี & นำหน้า` };
        case 'assign_in_cond': return {
            q: `เงื่อนไขในบรรทัดที่ ${iss.line} ใช้เครื่องหมาย = ตัวเดียว — ระหว่าง = กับ == ตัวไหนคือ "กำหนดค่า" และตัวไหนคือ "เปรียบเทียบ"?`,
            e: `บรรทัด ${iss.line}: ${iss.text} → ใช้ = (กำหนดค่า) ในเงื่อนไข ทั้งที่น่าจะต้องการ == (เปรียบเทียบ)` };
        case 'semicolon_after_header': return {
            q: `บรรทัดที่ ${iss.line} มีเครื่องหมาย ; ต่อท้ายวงเล็บของ ${iss.keyword} ทันที — ถ้าเป็นแบบนี้ คำสั่งในบล็อก { } ถัดไปยังอยู่ภายใต้ ${iss.keyword} จริงหรือไม่?`,
            e: `บรรทัด ${iss.line}: ${iss.text} → ; หลังวงเล็บทำให้ ${iss.keyword} มีตัวคำสั่งว่างเปล่า บล็อกถัดไปจึงไม่ได้อยู่ใน ${iss.keyword}` };
        case 'uninit': return {
            q: `ตัวแปร ${iss.var} ถูกนำไปสะสมค่าในบรรทัดที่ ${iss.line} — ก่อนสะสมครั้งแรก ${iss.var} มีค่าเท่าไร? (ดูบรรทัดที่ ${iss.declLine} ที่ประกาศตัวแปรนี้)`,
            e: `บรรทัด ${iss.declLine}: ประกาศ ${iss.var} โดยไม่กำหนดค่าเริ่มต้น แต่บรรทัด ${iss.line} (${iss.text}) นำไปสะสมค่า → ค่าเริ่มต้นเป็นค่าขยะในหน่วยความจำ` };
        case 'fmt_int_for_float': return {
            q: `ในบรรทัดที่ ${iss.line} ตัวแปร ${iss.var} เป็นชนิดทศนิยม แต่ถูกพิมพ์ด้วย ${iss.spec} — format specifier แต่ละตัวเหมาะกับข้อมูลชนิดใด?`,
            e: `บรรทัด ${iss.line}: ${iss.text} → ${iss.var} เป็น float/double แต่ใช้ ${iss.spec} ซึ่งใช้กับจำนวนเต็ม` };
        case 'fmt_float_for_int': return {
            q: `ในบรรทัดที่ ${iss.line} ตัวแปร ${iss.var} เป็นจำนวนเต็ม แต่ถูกพิมพ์ด้วย ${iss.spec} — จะเกิดอะไรขึ้นเมื่อ format specifier ไม่ตรงกับชนิดข้อมูล?`,
            e: `บรรทัด ${iss.line}: ${iss.text} → ${iss.var} เป็น int แต่ใช้ ${iss.spec} ซึ่งใช้กับทศนิยม` };
        case 'fmt_count': return {
            q: `printf ในบรรทัดที่ ${iss.line} มีตัวแทนค่า (%) ${iss.specs} ตัว แต่ส่งค่าเข้าไป ${iss.args} ค่า — สองจำนวนนี้ควรสัมพันธ์กันอย่างไร?`,
            e: `บรรทัด ${iss.line}: ${iss.text} → จำนวน format specifier (${iss.specs}) ไม่เท่ากับจำนวนค่าที่ส่ง (${iss.args})` };
        case 'int_division': return {
            q: `บรรทัดที่ ${iss.line} นำ ${iss.a} หารด้วย ${iss.b} ซึ่งเป็นจำนวนเต็มทั้งคู่ — จำนวนเต็มหารจำนวนเต็มในภาษา C ได้ผลลัพธ์แบบใด ส่วนทศนิยมไปไหน?`,
            e: `บรรทัด ${iss.line}: ${iss.text} → ${iss.a} / ${iss.b} เป็นการหารแบบจำนวนเต็ม (int/int) ส่วนทศนิยมถูกตัดทิ้งก่อนจะนำไปเก็บในตัวแปรทศนิยม` };
        default: return null;
    }
}

function _heFindCodeLine(code, output) {
    const label = (output || '').replace(_HE_NUM_RE, '').replace(/[:=\s]+$/, '').trim();
    if (!label) return null;
    const lines = _heLines(code);
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(label) && /"/.test(lines[i])) return { no: i + 1, text: lines[i].trim() };
    }
    return null;
}

function _heCategory(d, code, lang) {
    const out = _heOut(lang);
    const ln = d.lineNo;
    const codeLine = _heFindCodeLine(code, d.actualLine) || _heFindCodeLine(code, d.expectedLine);
    const where = codeLine ? `\n📍 โค้ดบรรทัดที่ ${codeLine.no}: ${codeLine.text}` : '';
    const inputTxt = !d.isHidden && d.input ? ` เมื่อ input คือ ${_heQuote(d.input.replace(/\n/g, ' / '))}` : '';
    const loopList = d.loops.length ? d.loops.map(l => `   • บรรทัด ${l.line}: ${l.text}`).join('\n') : '';

    switch (d.category) {
        case 'compile_error': {
            const at = d.compileLine ? `บรรทัดที่ ${d.compileLine}` : 'โค้ด';
            const codeAt = d.compileLine ? (_heLines(code)[d.compileLine - 1] || '').trim() : '';
            const k = {
                missing_semicolon: ['คำสั่งในภาษา C ทุกคำสั่งต้องจบด้วยอะไร? ลองดูบรรทัดที่แจ้งและ "บรรทัดก่อนหน้า" ด้วย เพราะคอมไพเลอร์มักรู้ตัวว่าผิดเมื่ออ่านไปถึงบรรทัดถัดไปแล้ว',
                    'ทุกคำสั่ง (statement) ต้องปิดด้วย ; เช่น int x = 5; — ยกเว้นบรรทัดที่เปิดบล็อก เช่น if (...) {  หรือ for (...) {'],
                undeclared: [`คอมไพเลอร์ไม่รู้จักชื่อ ${d.compileName || 'ตัวแปร'} — ชื่อนี้ถูกประกาศไว้ก่อนใช้หรือยัง และสะกดตรงกับตอนประกาศทุกตัวอักษร (รวมตัวพิมพ์ใหญ่-เล็ก) หรือไม่?`,
                    'ตัวแปรต้องประกาศชนิดข้อมูลก่อนใช้ (เช่น int sum;) และชื่อต้องสะกดเหมือนเดิมทุกครั้ง ภาษา C แยก Sum กับ sum เป็นคนละตัว'],
                implicit_function: [`คอมไพเลอร์ไม่รู้จักฟังก์ชัน ${d.compileName || ''} — สะกดชื่อถูกหรือไม่ หรือต้อง #include ไลบรารีใดก่อน?`,
                    'ฟังก์ชันจากไลบรารีต้อง #include ก่อนใช้ (เช่น printf/scanf อยู่ใน <stdio.h>) ส่วนฟังก์ชันที่เขียนเองต้องประกาศไว้ก่อนบรรทัดที่เรียกใช้'],
                unbalanced_brace: ['นับวงเล็บปีกกา { กับ } ในโค้ดของคุณ — มีจำนวนเท่ากันหรือไม่? บล็อกไหนที่เปิดแล้วยังไม่ได้ปิด?',
                    'ทุก { ต้องมี } คู่กัน การจัดย่อหน้า (indent) ให้ตรงกันช่วยให้เห็นว่าบล็อกไหนยังไม่ปิด'],
                missing_paren: ['นับวงเล็บ ( กับ ) ในบรรทัดที่แจ้ง — เปิดกับปิดครบคู่หรือไม่?',
                    'วงเล็บต้องเปิด-ปิดเป็นคู่เสมอ โดยเฉพาะใน if (...), for (...;...;...) และการเรียกฟังก์ชัน'],
                stray_char: ['ในบรรทัดที่แจ้งมีอักขระแปลกปลอมที่คอมไพเลอร์ไม่รู้จัก — มีเครื่องหมายคำพูดแบบโค้ง “ ” หรือตัวอักษรไทยอยู่นอกเครื่องหมายคำพูดหรือไม่?',
                    'โค้ดภาษา C ใช้ได้เฉพาะอักขระภาษาอังกฤษ/สัญลักษณ์มาตรฐาน ข้อความภาษาไทยต้องอยู่ใน "..." เท่านั้น และเครื่องหมายคำพูดต้องเป็น " ตรง ไม่ใช่ “ ” (มักติดมาจากการคัดลอก)'],
                unterminated_string: ['ข้อความในเครื่องหมายคำพูดบรรทัดที่แจ้ง ปิดด้วย " ครบหรือไม่?',
                    'ข้อความ (string) ต้องเปิดและปิดด้วย " ในบรรทัดเดียวกัน'],
                other: ['อ่านข้อความ error ทีละส่วน: หมายเลขบรรทัด → คำว่า error → คำอธิบาย แล้วดูที่บรรทัดนั้นกับบรรทัดก่อนหน้า มีอะไรผิดรูปแบบไวยากรณ์?',
                    'Compile error คือโค้ดผิดกฎไวยากรณ์ของภาษา โปรแกรมจึงยังไม่ได้ทำงานเลย ต้องแก้ให้คอมไพล์ผ่านก่อนจึงจะตรวจผลลัพธ์ได้'],
            }[d.compileKind];
            return {
                q: `🧩 โค้ดของคุณยังคอมไพล์ไม่ผ่าน คอมไพเลอร์ชี้ปัญหาที่${at}\n❓ ${k[0]}`,
                c: `📖 ${k[1]}`,
                s: `🗺 วิธีอ่าน error ด้วยตัวเอง:\n1) หาตัวเลขบรรทัดในข้อความ error (รูปแบบ ไฟล์:บรรทัด:คอลัมน์)\n2) ไปที่บรรทัดนั้น และอ่านบรรทัดก่อนหน้าด้วย\n3) จับคู่คำใน error กับสิ่งที่เห็น (expected = คาดว่าจะเจอ, undeclared = ไม่รู้จักชื่อ)\n4) แก้ทีละ error จากบนลงล่าง แล้วส่งใหม่ — error หลังๆ มักหายเองเมื่อแก้ตัวแรก`,
                e: `🔍 ${at}${codeAt ? `: ${codeAt}` : ''}\nข้อความจากคอมไพเลอร์: ${d.compileMsg}`,
            };
        }
        case 'service': return {
            q: '⚙️ ระบบรันโค้ดขัดข้องชั่วคราว (ไม่ใช่ความผิดของโค้ดคุณ) — รอสักครู่แล้วกดส่งใหม่อีกครั้ง',
            c: '⚙️ ระบบรันโค้ดขัดข้องชั่วคราว — ลองส่งใหม่อีกครั้ง', s: '⚙️ ระบบรันโค้ดขัดข้องชั่วคราว — ลองส่งใหม่อีกครั้ง',
            e: `⚙️ ${d.errorLog.slice(0, 120)}`,
        };
        case 'timeout':
        case 'runaway_output': {
            const run = d.loops.find(l => l.runaway);
            const noUpd = d.loops.find(l => l.noUpdate);
            const suspect = run
                ? `\n📍 บรรทัด ${run.line}: ${run.text} — ทิศทางที่ตัวแปรเปลี่ยน (update) ทำให้เงื่อนไขเป็นจริงตลอดไป`
                : noUpd ? `\n📍 บรรทัด ${noUpd.line}: ${noUpd.text} — ส่วน update ไม่ได้เปลี่ยนค่า ${noUpd.noUpdate} ที่ใช้ในเงื่อนไข` : '';
            const what = d.category === 'timeout' ? 'โปรแกรมทำงานนานเกินเวลาที่กำหนด' : `โปรแกรมพิมพ์ออกมาถึง ${d.actualLines} บรรทัด แต่โจทย์ต้องการ ${d.expectedLines} บรรทัด`;
            return {
                q: `⏳ ${what}${inputTxt}\n❓ ลูปไหนในโค้ดที่เงื่อนไขอาจเป็นจริงตลอดไป? ลองดูว่าในแต่ละรอบ ตัวแปรในเงื่อนไข "เข้าใกล้" หรือ "ห่างออก" จากค่าที่ทำให้ลูปหยุด`,
                c: '📖 ลูปจะหยุดได้เมื่อเงื่อนไขกลายเป็นเท็จ ส่วน update (เช่น i++) ต้องพาตัวแปรไปสู่ค่าที่ทำให้เงื่อนไขเป็นเท็จเสมอ ตัวอย่าง: for(i=10; i>0; i++) ไม่มีวันหยุด เพราะ i เพิ่มขึ้นเรื่อยๆ จึงมากกว่า 0 ตลอด (อีกสาเหตุหนึ่งคือ scanf รอรับข้อมูลมากกว่าที่ input มีให้)',
                s: `🗺 ตรวจลูปทีละตัวด้วย 3 คำถาม: ค่าเริ่มต้นคืออะไร → เงื่อนไขหยุดคืออะไร → แต่ละรอบค่าเปลี่ยนทางไหน\n${loopList || '   (ไม่พบลูปในโค้ด — ตรวจว่า scanf อ่านข้อมูลเกินจำนวนที่ input ให้หรือไม่)'}\nลองไล่ค่าด้วยมือ 3-4 รอบแรก แล้วดูว่าเงื่อนไขมีโอกาสเป็นเท็จไหม`,
                e: `🔍 ${what}${suspect || `\nลูปที่ต้องตรวจ:\n${loopList || '   (ไม่พบลูป — ตรวจ scanf ที่อ่านข้อมูลเกิน)'}`}`,
            };
        }
        case 'segfault':
        case 'runtime_error':
        case 'div_zero': {
            const amp = d.codeIssues.find(x => x.kind === 'scanf_amp');
            const what = d.category === 'div_zero' ? 'โปรแกรมหยุดทำงานเพราะหารด้วยศูนย์' : 'โปรแกรมหยุดทำงานกลางคัน (runtime error)';
            return {
                q: `💥 ${what}${inputTxt}\n❓ ${d.category === 'div_zero' ? 'ตัวหารในโค้ดมีโอกาสเป็น 0 ได้ในกรณีใด?' : amp ? `ในบรรทัดที่ ${amp.line} scanf ได้รับ "ตำแหน่ง" ของตัวแปรหรือเปล่า?` : 'มีการเข้าถึงอาร์เรย์ด้วยดัชนีที่เกินขนาด หรือส่งค่าให้ scanf ผิดรูปแบบหรือไม่?'}`,
                c: '📖 Runtime error เกิดตอนโปรแกรมทำงานแม้คอมไพล์ผ่าน สาเหตุพบบ่อย: scanf ลืม & หน้าตัวแปร, ใช้ดัชนีอาร์เรย์เกินขนาด (เช่น arr[5] ใช้ได้แค่ arr[0]..arr[4]), หารด้วย 0',
                s: '🗺 1) ตรวจ scanf ทุกบรรทัดว่ามี & หน้าตัวแปรธรรมดา\n2) ตรวจลูปที่ใช้กับอาร์เรย์ว่าดัชนีเริ่มที่ 0 และน้อยกว่าขนาดเสมอ (ใช้ < ไม่ใช่ <=)\n3) ตรวจตัวหารทุกตัวว่าไม่มีโอกาสเป็น 0',
                e: `🔍 ${what}\nข้อความ: ${d.errorLog.slice(0, 120)}`,
            };
        }
        case 'no_output': {
            const semi = d.codeIssues.find(x => x.kind === 'semicolon_after_header');
            return {
                q: `🤔 โปรแกรมทำงานจบแต่ไม่พิมพ์อะไรออกมาเลย${inputTxt}\n❓ คำสั่ง ${out} ของคุณอยู่ในตำแหน่งที่ถูกทำงานจริงหรือไม่? มันอยู่ในเงื่อนไขหรือลูปที่อาจไม่เคยถูกเข้าไปทำหรือเปล่า?`,
                c: `📖 คำสั่งที่อยู่ในบล็อกของ if หรือลูป จะทำงานก็ต่อเมื่อเงื่อนไขเป็นจริง ถ้าเงื่อนไขเป็นเท็จตั้งแต่แรก ${out} ข้างในจะไม่ถูกเรียกเลย`,
                s: `🗺 1) หา ${out} ทุกตัวในโค้ด\n2) ไล่ดูว่าแต่ละตัวอยู่ในบล็อกใด (if/for/while)\n3) ใช้ input ของโจทย์ ไล่เงื่อนไขของบล็อกนั้นด้วยมือว่าเป็นจริงหรือไม่`,
                e: `🔍 ไม่มีผลลัพธ์ออกมาเลย${semi ? `\n📍 บรรทัด ${semi.line}: ${semi.text} — มี ; หลังวงเล็บ ${semi.keyword}` : ''}`,
            };
        }
        case 'extra_lines': return {
            q: `📄 โปรแกรมพิมพ์ ${d.actualLines} บรรทัด แต่โจทย์ต้องการ ${d.expectedLines} บรรทัด${inputTxt}\n❓ บรรทัดที่เกินมาคือ ${_heQuote(d.actualLine)} — มันถูกพิมพ์จากคำสั่งไหน? เป็นข้อความที่ใส่ไว้ทดสอบ หรือเกิดจากลูปวนเกินไปหนึ่งรอบ?`,
            c: '📖 ระบบตรวจเทียบผลลัพธ์ทั้งหมดแบบตรงตัว ผลลัพธ์ต้องมีเฉพาะสิ่งที่โจทย์ต้องการ ข้อความชวนกรอก เช่น "กรุณาใส่ตัวเลข:" หรือค่าที่พิมพ์ไว้ตรวจสอบ ต้องลบออกก่อนส่ง',
            s: `🗺 1) นับจำนวนบรรทัดที่โจทย์ต้องการ\n2) หา ${out} ที่พิมพ์ ${_heQuote(d.actualLine)}\n3) ถ้าอยู่ในลูป ให้ไล่ว่าลูปวนกี่รอบ เทียบกับจำนวนที่ควรเป็น${loopList ? `\nลูปในโค้ด:\n${loopList}` : ''}`,
            e: `🔍 บรรทัดที่ ${d.lineNo} เกินมา: ${_heQuote(d.actualLine)}${_heFindCodeLine(code, d.actualLine) ? `\n📍 โค้ดบรรทัดที่ ${_heFindCodeLine(code, d.actualLine).no}: ${_heFindCodeLine(code, d.actualLine).text}` : ''}`,
        };
        case 'missing_lines': return {
            q: `📄 โปรแกรมพิมพ์ ${d.actualLines} บรรทัด แต่โจทย์ต้องการ ${d.expectedLines} บรรทัด${inputTxt}\n❓ บรรทัดที่ ${d.lineNo} หายไป — มีคำสั่ง ${out} สำหรับบรรทัดนั้นหรือยัง? หรือมีลูป/เงื่อนไขที่จบเร็วกว่าที่ควร?`,
            c: '📖 ผลลัพธ์ต้องครบทุกบรรทัดตามโจทย์ ถ้าบรรทัดหายไปเฉพาะบาง input มักเกิดจากกรณีพิเศษ (edge case) เช่น มีข้อมูลตัวเดียว หรือค่าติดขอบเงื่อนไข',
            s: `🗺 1) เทียบตัวอย่าง Output ในโจทย์กับของคุณทีละบรรทัด\n2) หาว่าบรรทัดที่ ${d.lineNo} ควรพิมพ์จากคำสั่งใด\n3) ตรวจเงื่อนไข/ลูปที่ครอบคำสั่งนั้นด้วย input ของเคสนี้`,
            e: `🔍 ขาดบรรทัดที่ ${d.lineNo}: โจทย์ต้องการ ${_heQuote(d.expectedLine)}`,
        };
        case 'missing_newline': return {
            q: `📄 โจทย์ต้องการผลลัพธ์ ${d.expectedLines} บรรทัด แต่โปรแกรมพิมพ์ต่อกันอยู่ในบรรทัดเดียว\n❓ อะไรเป็นตัวสั่งให้ ${out} ขึ้นบรรทัดใหม่? ${out} แต่ละตัวของคุณมีสิ่งนั้นหรือยัง?`,
            c: `📖 ${lang === 'c' ? 'printf ไม่ขึ้นบรรทัดใหม่ให้เอง ต้องใส่ \\n (newline) ในข้อความ เช่น printf("A\\n"); printf("B\\n"); จะได้ A และ B คนละบรรทัด' : 'การขึ้นบรรทัดใหม่ต้องสั่งเอง เช่น \\n หรือ endl'}`,
            s: `🗺 1) ดูตัวอย่าง Output ในโจทย์ว่าแต่ละค่าอยู่คนละบรรทัด\n2) ตรวจ ${out} ทุกตัวว่าลงท้ายด้วย \\n หรือยัง\n3) ส่งใหม่แล้วเทียบจำนวนบรรทัด`,
            e: `🔍 บรรทัดที่ ${ln}\n  โจทย์ต้องการ: ${_heQuote(d.expectedLine)}\n  โปรแกรมพิมพ์: ${_heQuote(d.actualLine)}\n→ ข้อความของบรรทัดถัดไปมาต่อท้ายบรรทัดเดียวกัน${where}`,
        };
        case 'case_mismatch': {
            const ce = d.expectedLine[d.col], ca = d.actualLine[d.col];
            return {
                q: `🔎 ความหมายของผลลัพธ์บรรทัดที่ ${ln} ถูกแล้ว แต่ระบบยังไม่ให้ผ่าน\n❓ ลองเทียบบรรทัดนี้กับตัวอย่าง Output ในโจทย์ทีละตัวอักษร — คอมพิวเตอร์มองตัวพิมพ์ใหญ่กับตัวพิมพ์เล็กเป็นตัวเดียวกันหรือไม่?`,
                c: '📖 ระบบตรวจงานอัตโนมัติเทียบผลลัพธ์แบบตรงตัวอักษร (exact match) และแยกตัวพิมพ์ใหญ่-เล็ก (case-sensitive) เช่น "Total" กับ "total" ถือว่าต่างกัน ข้อความใน printf จึงต้องสะกดเหมือนโจทย์ทุกตัวอักษร',
                s: `🗺 1) เปิดตัวอย่าง Output ในโจทย์\n2) หา ${out} ที่พิมพ์บรรทัดที่ ${ln}${codeLine ? ` (น่าจะเป็นโค้ดบรรทัดที่ ${codeLine.no})` : ''}\n3) เทียบข้อความในเครื่องหมายคำพูดกับโจทย์ทีละตัวอักษร\n4) ตรวจ ${out} บรรทัดอื่นแบบเดียวกัน เพราะมักผิดซ้ำหลายจุด`,
                e: `🔍 ผลลัพธ์บรรทัดที่ ${ln}\n  โจทย์ต้องการ: ${_heQuote(d.expectedLine)}\n  โปรแกรมพิมพ์: ${_heQuote(d.actualLine)}\n→ ต่างกันที่ตัวอักษรตำแหน่งที่ ${d.col + 1}: '${ce}' กับ '${ca}'${where}`,
            };
        }
        case 'whitespace_mismatch': return {
            q: `🔎 บรรทัดที่ ${ln} ของคุณมีตัวอักษรครบเหมือนโจทย์ทุกตัว แต่ยังไม่ผ่าน\n❓ สิ่งที่มองไม่เห็นด้วยตา เช่น "ช่องว่าง" มีจำนวนและตำแหน่งตรงกับโจทย์หรือไม่?`,
            c: '📖 ช่องว่าง (space) ก็เป็นอักขระหนึ่งตัว ระบบตรวจนับด้วย เช่น "max: 5" กับ "max:5" หรือ "max:  5" ถือว่าต่างกัน',
            s: `🗺 1) ดูตัวอย่าง Output ในโจทย์ว่าหลังเครื่องหมาย : หรือระหว่างตัวเลขมีช่องว่างกี่ช่อง\n2) เทียบกับข้อความใน ${out} ของคุณทีละตัว\n3) ระวังช่องว่างท้ายข้อความก่อน \\n ด้วย`,
            e: `🔍 ผลลัพธ์บรรทัดที่ ${ln} (· แทนช่องว่าง)\n  โจทย์ต้องการ: ${_heQuote(d.expectedLine, true)}\n  โปรแกรมพิมพ์: ${_heQuote(d.actualLine, true)}\n→ ต่างกันเริ่มที่ตำแหน่งที่ ${d.col + 1}${where}`,
        };
        case 'label_mismatch': return {
            q: `👍 ตัวเลขที่โปรแกรมคำนวณได้ในบรรทัดที่ ${ln} ถูกต้องแล้ว\n❓ แต่ข้อความที่อยู่รอบตัวเลขยังไม่ตรงกับโจทย์ — ลองอ่านตัวอย่าง Output ในโจทย์อีกครั้ง ข้อความกำกับที่โจทย์ใช้คืออะไร?`,
            c: '📖 การคำนวณถูกแล้ว เหลือเพียงรูปแบบการแสดงผล ระบบตรวจเทียบข้อความทั้งบรรทัดแบบตรงตัว ข้อความกำกับ เครื่องหมาย : และช่องว่าง ต้องเหมือนโจทย์ทุกตัวอักษร',
            s: `🗺 1) คัดลอกข้อความกำกับจากตัวอย่าง Output ในโจทย์\n2) แก้ข้อความใน ${out} ที่พิมพ์บรรทัดที่ ${ln}${codeLine ? ` (โค้ดบรรทัดที่ ${codeLine.no})` : ''}\n3) ตรวจบรรทัดอื่นแบบเดียวกัน`,
            e: `🔍 ผลลัพธ์บรรทัดที่ ${ln}\n  โจทย์ต้องการ: ${_heQuote(d.expectedLine)}\n  โปรแกรมพิมพ์: ${_heQuote(d.actualLine)}\n→ ตัวเลขถูก ข้อความกำกับต่างกันเริ่มที่ตำแหน่งที่ ${d.col + 1}${where}`,
        };
        case 'number_format': {
            const dec = (d.expectedNum.split('.')[1] || '').length;
            return {
                q: `👍 ค่าที่คำนวณได้ในบรรทัดที่ ${ln} ถูกต้องแล้ว (${d.actualNum})\n❓ แต่รูปแบบตัวเลขต่างจากที่โจทย์ต้องการ (${d.expectedNum}) — จำนวนตำแหน่งทศนิยมที่พิมพ์ออกมากำหนดได้ที่ไหนใน ${out}?`,
                c: '📖 format specifier กำหนดรูปแบบตัวเลข: %d = จำนวนเต็ม, %f = ทศนิยม 6 ตำแหน่ง, %.2f = ทศนิยม 2 ตำแหน่ง (ตัวเลขหลังจุดคือจำนวนตำแหน่ง) เช่น printf("%.1f", 3.14159) ได้ 3.1',
                s: `🗺 1) นับตำแหน่งทศนิยมในตัวอย่าง Output ของโจทย์ (${d.expectedNum} มี ${dec} ตำแหน่ง)\n2) หา ${out} ที่พิมพ์ค่านี้${codeLine ? ` (โค้ดบรรทัดที่ ${codeLine.no})` : ''}\n3) ตรวจว่า format specifier กับชนิดตัวแปรสอดคล้องกัน`,
                e: `🔍 ผลลัพธ์บรรทัดที่ ${ln}\n  โจทย์ต้องการ: ${_heQuote(d.expectedLine)}\n  โปรแกรมพิมพ์: ${_heQuote(d.actualLine)}\n→ ค่าเท่ากัน แต่ต้องแสดงทศนิยม ${dec} ตำแหน่ง${where}`,
            };
        }
        case 'wrong_value': {
            const sub = {
                int_division: {
                    q: `ส่วนทศนิยมหายไป — ตอนคำนวณ ตัวตั้งและตัวหารเป็นข้อมูลชนิดใด?`,
                    c: '📖 ในภาษา C จำนวนเต็มหารจำนวนเต็มได้ผลเป็นจำนวนเต็มเสมอ เช่น 7 / 2 ได้ 3 (ไม่ใช่ 3.5) แม้จะเก็บผลในตัวแปร float ก็ตาม เพราะทศนิยมถูกตัดทิ้งไปก่อนแล้ว ต้องทำให้ตัวใดตัวหนึ่งเป็นทศนิยมก่อนหาร เช่น (float)a / b',
                },
                garbage: {
                    q: `ค่าที่ได้ (${d.actualNum}) ใหญ่ผิดปกติมาก เหมือนตัวเลขสุ่ม — ตัวแปรที่ใช้คำนวณค่านี้ได้รับค่าเริ่มต้นก่อนนำไปใช้หรือยัง?`,
                    c: '📖 ตัวแปรในภาษา C ที่ประกาศโดยไม่กำหนดค่า จะมี "ค่าขยะ" ที่ค้างอยู่ในหน่วยความจำ ตัวแปรสะสม (เช่น ผลรวม ตัวนับ) ต้องกำหนดค่าเริ่มต้นก่อนเข้าลูปเสมอ เช่น int sum = 0;',
                },
                initial_unchanged: {
                    q: `ค่าที่พิมพ์ออกมา (${d.actualNum}) คือค่าเริ่มต้นที่คุณกำหนดไว้ในโค้ดเอง — แปลว่าตัวแปรนี้ไม่เคยถูกเปลี่ยนค่าเลย เงื่อนไขที่ใช้อัปเดตค่าเคยเป็นจริงบ้างไหม หรือลูปได้ทำงานหรือไม่?`,
                    c: '📖 เมื่อค่าที่พิมพ์ยังเท่ากับค่าเริ่มต้น แปลว่าบรรทัดที่อัปเดตค่าไม่เคยถูกทำงาน สาเหตุพบบ่อย: เงื่อนไข if กลับด้าน (> กับ <), ค่าเริ่มต้นของ max/min เลือกไม่เหมาะ, หรือลูปไม่ได้วนเลย',
                },
                swapped: {
                    q: `ค่าที่พิมพ์ในบรรทัดที่ ${ln} (${d.actualNum}) ตรงกับค่าที่ควรอยู่ในอีกบรรทัดหนึ่งของผลลัพธ์ — คุณพิมพ์ตัวแปรสลับกันหรือไม่?`,
                    c: `📖 ลำดับค่าที่ส่งเข้า ${out} ต้องตรงกับลำดับข้อความในโจทย์ ตรวจว่าแต่ละบรรทัดพิมพ์ตัวแปรที่ถูกตัว`,
                },
                missing_element: {
                    q: `ผลต่างระหว่างค่าที่ได้ (${d.actualNum}) กับค่าที่ควรได้ (${d.expectedNum}) เท่ากับ ${Math.abs(d.diffValue)} พอดี ซึ่งเป็นหนึ่งในข้อมูลของ input — ลูปของคุณนำข้อมูลมาคำนวณครบทุกตัว หรือขาด/เกินไปหนึ่งตัว?`,
                    c: '📖 ข้อผิดพลาด "ขาด/เกินหนึ่งรอบ" (off-by-one) พบบ่อยมาก เกิดจากค่าเริ่มต้นของตัวนับหรือเครื่องหมายเงื่อนไข (< กับ <=) เช่น for(i=1; i<n; i++) วนแค่ n-1 รอบ',
                },
            }[d.subtype] || {
                q: `ลองคำนวณด้วยมือตามโค้ดของคุณทีละขั้น — ค่าตัวแปรเริ่มผิดไปจากที่ควรเป็นตั้งแต่ขั้นตอนไหน?`,
                c: '📖 ผลลัพธ์ผิดแบบนี้เป็นข้อผิดพลาดเชิงตรรกะ (logic error) — โค้ดทำงานได้แต่คิดผิด วิธีที่ดีที่สุดคือทำ "ตารางติดตามค่า" (trace table) ไล่ค่าตัวแปรทุกตัวทีละรอบด้วย input จริง',
            };
            // Prefer the static finding that explains this subtype, then any other logic-relevant one
            const preferred = { int_division: 'int_division', garbage: 'uninit' }[d.subtype];
            const logicKinds = ['uninit', 'int_division', 'fmt_int_for_float', 'fmt_float_for_int', 'semicolon_after_header', 'assign_in_cond'];
            const related = d.codeIssues.find(x => x.kind === preferred) || d.codeIssues.find(x => logicKinds.includes(x.kind));
            const relatedTxt = related ? _heIssueText(related) : null;
            const loopPointer = !relatedTxt && ['missing_element', undefined].includes(d.subtype) && loopList
                ? `\n📍 ลูปที่เกี่ยวข้อง — ลองนับว่าวนกี่รอบกับ input นี้:\n${loopList}` : '';
            return {
                q: `🧮 บรรทัดที่ ${ln} ควรได้ ${d.expectedNum} แต่โปรแกรมได้ ${d.actualNum}${inputTxt}\n❓ ${sub.q}`,
                c: sub.c,
                s: `🗺 ทำตารางติดตามค่า (trace table):\n1) ใช้ input ของเคสนี้${!d.isHidden && d.input ? ` (${d.input.replace(/\n/g, ' / ')})` : ''}\n2) สร้างคอลัมน์: รอบที่ | ตัวนับ | ค่าที่อ่านได้ | ตัวแปรที่คำนวณ\n3) ไล่ทีละรอบจนจบ แล้วดูว่ารอบไหนค่าเริ่มเบี่ยงจาก ${d.expectedNum}${loopList ? `\nลูปที่ควรตรวจ ค่าเริ่มต้น-เงื่อนไข-การเปลี่ยนค่า:\n${loopList}` : ''}`,
                e: `🔍 ผลลัพธ์บรรทัดที่ ${ln}\n  โจทย์ต้องการ: ${_heQuote(d.expectedLine)}\n  โปรแกรมพิมพ์: ${_heQuote(d.actualLine)}${where}${relatedTxt ? `\n⚠️ ${relatedTxt.e}` : ''}${loopPointer}`,
            };
        }
        default: return {
            q: `🔎 ผลลัพธ์บรรทัดที่ ${ln} ไม่ตรงกับโจทย์${inputTxt}\n❓ ลองวางผลลัพธ์ของคุณเทียบกับตัวอย่าง Output ในโจทย์ — ส่วนไหนเหมือน ส่วนไหนต่าง และส่วนที่ต่างมาจากคำสั่งใดในโค้ด?`,
            c: '📖 ระบบตรวจเทียบผลลัพธ์ทั้งหมดแบบตรงตัว ทั้งข้อความ ตัวเลข ช่องว่าง และการขึ้นบรรทัด ต้องเหมือนตัวอย่าง Output ในโจทย์ทุกตัวอักษร',
            s: `🗺 1) อ่านรูปแบบ Output ในโจทย์ให้ละเอียด\n2) หาคำสั่ง ${out} ที่พิมพ์บรรทัดที่ ${ln}\n3) แยกตรวจสองเรื่อง: ข้อความกำกับ และค่าที่คำนวณ`,
            e: `🔍 ผลลัพธ์บรรทัดที่ ${ln}\n  โจทย์ต้องการ: ${_heQuote(d.expectedLine)}\n  โปรแกรมพิมพ์: ${_heQuote(d.actualLine)}\n→ ต่างกันเริ่มที่ตำแหน่งที่ ${d.col + 1}${where}`,
        };
    }
}

// Build the hint text for one level, specific to this failure
function buildLocalHint(level, d, ctx) {
    ctx = ctx || {};
    const lang = ctx.language || 'c';
    const code = ctx.code || '';
    if (!d) {
        const t = ctx.title ? `โจทย์ "${ctx.title}"` : 'โจทย์นี้';
        return [
            `❓ ${t} ต้องการ input อะไร และต้องแสดงผลลัพธ์อะไร? ลองเขียนขั้นตอนเป็นภาษาไทยก่อนเขียนโค้ด`,
            '📖 แยกปัญหาเป็น 3 ส่วน: รับข้อมูล (Input) → ประมวลผล (Process) → แสดงผล (Output) แล้วคิดทีละส่วน',
            '🗺 ลองกด "ทดสอบตัวอย่าง" หรือส่งงานก่อน ระบบจะวิเคราะห์ผลการทดสอบเพื่อให้คำใบ้ที่ตรงจุดกว่านี้',
            '🔍 ยังไม่มีผลการทดสอบให้วิเคราะห์ — ส่งงานก่อน แล้วขอคำใบ้ระดับนี้อีกครั้ง',
        ][Math.min(Math.max(level, 1), 4) - 1];
    }

    const cat = _heCategory(d, code, lang);
    const summary = `📋 ผ่าน ${d.totalCount - d.failedCount}/${d.totalCount} เคส — วิเคราะห์จากเคสที่ ${d.testNo}${d.isHidden ? ' (เคสซ่อน)' : ''}`;
    const issues = d.category === 'compile_error' ? [] : d.codeIssues.map(_heIssueText).filter(Boolean);

    if (level <= 1) {
        const extra = issues.length && d.category !== 'wrong_value' ? `\n❓ และ: ${issues[0].q}` : '';
        return `${summary}\n\n${cat.q}${extra}\n\n💭 ลองตอบคำถามนี้ด้วยตัวเองก่อน แล้วแก้โค้ดและส่งใหม่`;
    }
    if (level === 2) return `${summary}\n\n${cat.c}\n\n💭 นำความรู้นี้ไปตรวจโค้ดของคุณเอง ถ้ายังไม่เจอ ขอคำใบ้ระดับ 3`;
    if (level === 3) return `${summary}\n\n${cat.s}`;
    const extraIssues = issues.filter(x => !cat.e.includes(x.e)).map(x => `⚠️ ${x.e}`).join('\n');
    return `${summary}\n\n${cat.e}${extraIssues ? `\n\nจุดอื่นในโค้ดที่ควรตรวจ:\n${extraIssues}` : ''}\n\n💭 ระบบชี้ตำแหน่งให้แล้วแต่ไม่เฉลยโค้ด — ลองแก้ด้วยตัวเอง`;
}

// Compact factual summary for grounding the Gemini prompt (not student-facing)
function describeDiagnosisForPrompt(d, code, language) {
    if (!d) return 'ยังไม่มีผลการทดสอบ';
    const lines = [`ผ่าน ${d.totalCount - d.failedCount}/${d.totalCount} เคส, วิเคราะห์เคสที่ ${d.testNo}${d.isHidden ? ' (เคสซ่อน: ห้ามเปิดเผย input/ผลลัพธ์ที่ถูกต้องทั้งหมด)' : ''}`,
        `ประเภทข้อผิดพลาด: ${d.category}${d.subtype ? ` (${d.subtype})` : ''}`];
    if (!d.isHidden && d.input) lines.push(`input: ${d.input.replace(/\n/g, ' / ')}`);
    if (d.category === 'compile_error') lines.push(`compile error บรรทัด ${d.compileLine || '?'}: ${d.compileMsg}`);
    else if (d.errorLog) lines.push(`error: ${d.errorLog.slice(0, 150)}`);
    if (d.lineNo) lines.push(`ผลลัพธ์บรรทัดที่ ${d.lineNo}: ควรเป็น "${d.expectedLine ?? '(ไม่มี)'}" แต่ได้ "${d.actualLine ?? '(ไม่มี)'}"`);
    if (d.expectedLines) lines.push(`จำนวนบรรทัดผลลัพธ์: ควร ${d.expectedLines} ได้ ${d.actualLines}`);
    const cl = _heFindCodeLine(code, d.actualLine || d.expectedLine);
    if (cl) lines.push(`คำสั่งที่พิมพ์บรรทัดนั้นน่าจะเป็นโค้ดบรรทัดที่ ${cl.no}: ${cl.text}`);
    d.codeIssues.forEach(x => { const t = _heIssueText(x); if (t) lines.push(`ปัญหาในโค้ดที่ตรวจพบ: ${t.e}`); });
    d.loops.filter(l => l.runaway || l.noUpdate).forEach(l => lines.push(`ลูปน่าสงสัยบรรทัด ${l.line}: ${l.text}`));
    return lines.join('\n');
}

window.diagnoseFailure = diagnoseFailure;
window.buildLocalHint = buildLocalHint;
window.describeDiagnosisForPrompt = describeDiagnosisForPrompt;

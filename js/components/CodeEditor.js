// js/components/CodeEditor.js — CodeMirror 5 smart editor
// Features: autocomplete, code folding, active-line, duplicate/move/delete line,
//           format code (exposed as window.formatCCode)

// ── Keyword lists by language ────────────────────────────────────────────────
const _C_KW = [
    'auto','break','case','char','const','continue','default','do','double',
    'else','enum','extern','float','for','goto','if','inline','int','long',
    'register','return','short','signed','sizeof','static','struct','switch',
    'typedef','union','unsigned','void','volatile','while',
    // stdio.h
    'printf','scanf','puts','gets','fgets','getchar','putchar','sprintf','sscanf',
    'fprintf','fscanf','fopen','fclose','fread','fwrite','feof',
    'FILE','stdin','stdout','stderr',
    // string.h
    'strlen','strcpy','strncpy','strcat','strncat','strcmp','strncmp',
    'strchr','strrchr','strstr','memset','memcpy','memcmp','memmove',
    // stdlib.h
    'malloc','calloc','realloc','free','atoi','atof','atol','atoll',
    'rand','srand','exit','abort','abs','labs','qsort','bsearch',
    // math.h
    'sqrt','pow','fabs','ceil','floor','round','fmod',
    'sin','cos','tan','asin','acos','atan','atan2','log','log2','log10','exp',
    'fmax','fmin',
    // common macros/constants
    'NULL','EOF','true','false','bool',
    'INT_MAX','INT_MIN','LONG_MAX','LONG_MIN','DBL_MAX','FLT_MAX',
    'RAND_MAX','SIZE_MAX','M_PI',
    // common names
    'main','n','i','j','k','m','result','sum','count','max','min',
    'temp','arr','num','val','idx',
];

const _CPP_EXTRA = [
    'cout','cin','cerr','clog','endl','string','wstring',
    'vector','list','deque','queue','stack','priority_queue',
    'map','unordered_map','multimap','set','unordered_set','multiset','pair',
    'iostream','fstream','sstream','algorithm','numeric','iterator','utility',
    'namespace','std','using','class','public','private','protected',
    'new','delete','this','virtual','override','final','explicit',
    'template','typename','auto','nullptr','constexpr','decltype',
    'push_back','pop_back','emplace_back','size','empty','resize','reserve',
    'begin','end','front','back','at','find','insert','erase','clear',
    'sort','reverse','unique','lower_bound','upper_bound','max_element','min_element',
    'make_pair','first','second','to_string','stoi','stof','stod',
];

const _PYTHON_KW = [
    'False','None','True','and','as','assert','async','await',
    'break','class','continue','def','del','elif','else','except',
    'finally','for','from','global','if','import','in','is',
    'lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield',
    'print','input','int','float','str','list','dict','set','tuple','bool',
    'len','range','enumerate','zip','map','filter','sorted','reversed',
    'sum','abs','round','min','max','any','all','divmod','pow',
    'open','read','write','readline','readlines',
    'append','extend','insert','pop','remove','index','count','clear',
    'split','join','strip','lstrip','rstrip','replace','find','rfind',
    'format','startswith','endswith','upper','lower','title',
    'type','isinstance','hasattr','getattr','setattr','dir','help','id',
    'super','object','property','staticmethod','classmethod',
];

const _JAVA_KW = [
    'abstract','assert','boolean','break','byte','case','catch','char','class',
    'const','continue','default','do','double','else','enum','extends','final',
    'finally','float','for','goto','if','implements','import','instanceof','int',
    'interface','long','native','new','package','private','protected','public',
    'return','short','static','strictfp','super','switch','synchronized','this',
    'throw','throws','transient','try','void','volatile','while',
    'true','false','null',
    'String','Object','Integer','Double','Float','Long','Boolean','Character',
    'System','Math','Arrays','Collections','Objects',
    'ArrayList','LinkedList','HashMap','HashSet','TreeMap','TreeSet','Stack','Queue',
    'Scanner','PrintStream','BufferedReader','InputStreamReader',
    'out','in','err','println','print','printf','format',
    'nextInt','nextDouble','nextLine','nextFloat','nextLong','hasNext',
    'length','size','add','get','set','remove','contains','isEmpty','clear',
    'equals','toString','hashCode','compareTo','charAt','substring','indexOf',
    'toUpperCase','toLowerCase','trim','replace','split',
    'sqrt','pow','abs','max','min','floor','ceil','round','random',
    'override','Override',
];

function _getKW(lang) {
    if (lang === 'cpp') return [..._C_KW, ..._CPP_EXTRA];
    if (lang === 'python') return _PYTHON_KW;
    if (lang === 'java') return _JAVA_KW;
    return _C_KW;
}

// ── Hint function (keywords + document words) ────────────────────────────────
function _codeHint(editor, options) {
    const cur = editor.getCursor();
    const lineStr = editor.getLine(cur.line);
    let start = cur.ch;
    while (start > 0 && /\w/.test(lineStr[start - 1])) start--;
    const typed = lineStr.slice(start, cur.ch);
    if (!typed || typed.length < 1) return null;

    const lang = (options && options.language) || 'c';
    const kw = _getKW(lang);
    const kwSet = new Set(kw);

    // Collect unique words already in the document (anyword-style)
    const docWords = [];
    const seen = new Set(kw);
    (editor.getValue().match(/\b\w+\b/g) || []).forEach(w => {
        if (w.length > 1 && !seen.has(w)) { seen.add(w); docWords.push(w); }
    });

    const ltyped = typed.toLowerCase();
    const kwMatches  = kw.filter(w => w.toLowerCase().startsWith(ltyped) && w !== typed);
    const docMatches = docWords.filter(w => w.toLowerCase().startsWith(ltyped));
    const all = [...kwMatches, ...docMatches];
    if (!all.length) return null;

    return {
        list: all,
        from: CodeMirror.Pos(cur.line, start),
        to:   CodeMirror.Pos(cur.line, cur.ch),
    };
}

// ── C/C++/Java code formatter ────────────────────────────────────────────────
function formatCCode(code, language) {
    if (!code || !code.trim()) return code;
    if (language === 'python') {
        // Python: only normalize tabs → 4 spaces (don't touch indentation structure)
        return code.replace(/\r\n|\r/g, '\n').replace(/\t/g, '    ');
    }
    return _formatCLike(code);
}

function _countBraces(line) {
    let opens = 0, closes = 0;
    let inStr = false, inChar = false, inLC = false;
    for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci];
        if (inLC) break;
        if (inStr)  { if (ch === '\\') ci++; else if (ch === '"')  inStr  = false; continue; }
        if (inChar) { if (ch === '\\') ci++; else if (ch === "'")  inChar = false; continue; }
        if (ch === '/' && line[ci + 1] === '/') { inLC = true; break; }
        if (ch === '"')  { inStr  = true; continue; }
        if (ch === "'")  { inChar = true; continue; }
        if (ch === '{') opens++;
        if (ch === '}') closes++;
    }
    return { opens, closes };
}

function _formatCLike(code) {
    const IND = '    ';
    code = code.replace(/\r\n|\r/g, '\n');

    // Light operator/keyword spacing (safe subset only)
    code = code.replace(/\b(if|else if|for|while|switch)\s*\(/g, '$1 (');
    code = code.replace(/,(?=[^\s\n])/g, ', ');

    const lines = code.split('\n').map(l => l.trim());
    const out = [];
    let indent = 0;

    for (let li = 0; li < lines.length; li++) {
        const raw = lines[li];

        // Max 1 consecutive blank line
        if (!raw) {
            if (out.length && out[out.length - 1] === '') continue;
            out.push('');
            continue;
        }

        const { opens, closes } = _countBraces(raw);

        // Lines starting with } print at one level lower
        const startsClose = raw[0] === '}';
        const eff = startsClose ? Math.max(0, indent - 1) : indent;

        // Preprocessor directives stay at column 0
        if (raw[0] === '#') out.push(raw);
        else out.push(IND.repeat(eff) + raw);

        indent = Math.max(0, indent + opens - closes);
    }

    return out.join('\n').trimEnd();
}

// Expose globally so CodingWorkspace Format button can call it
window.formatCCode = formatCCode;

// ── CodeEditor React component ───────────────────────────────────────────────
const EDITOR_MODES = {
    c:      'text/x-csrc',
    cpp:    'text/x-c++src',
    java:   'text/x-java',
    python: 'python',
};

const CodeEditor = ({ value, onChange, language, placeholder, minHeight = '400px' }) => {
    const containerRef = React.useRef(null);
    const cmRef        = React.useRef(null);
    const suppressRef  = React.useRef(false);
    const onChangeRef  = React.useRef(onChange);
    const langRef      = React.useRef(language || 'c');
    onChangeRef.current = onChange;
    langRef.current     = language || 'c';

    // Initialize once on mount
    React.useEffect(() => {
        if (!containerRef.current || cmRef.current) return;

        const hasFold = !!(typeof CodeMirror !== 'undefined' && CodeMirror.fold && CodeMirror.fold.brace);
        const hasHint = !!(typeof CodeMirror !== 'undefined' && CodeMirror.showHint);

        const gutters = ['CodeMirror-linenumbers'];
        if (hasFold) gutters.push('CodeMirror-foldgutter');

        const cm = CodeMirror(containerRef.current, {
            value:            value || '',
            mode:             EDITOR_MODES[language] || 'text/x-csrc',
            theme:            'dracula',
            lineNumbers:      true,
            tabSize:          4,
            indentUnit:       4,
            indentWithTabs:   false,
            smartIndent:      true,
            autoCloseBrackets: true,
            matchBrackets:    true,
            styleActiveLine:  true,
            lineWrapping:     false,
            autofocus:        false,
            placeholder:      placeholder || '',
            foldGutter:       hasFold,
            gutters,
            foldOptions:      hasFold ? { rangeFinder: CodeMirror.fold.brace } : undefined,

            extraKeys: {
                // Autocomplete — Ctrl+Space
                'Ctrl-Space': hasHint
                    ? (ed) => ed.showHint({ hint: _codeHint, completeSingle: false, language: langRef.current })
                    : undefined,

                // Indentation
                'Tab':       (ed) => ed.somethingSelected()
                    ? ed.indentSelection('add')
                    : ed.replaceSelection('    ', 'end'),
                'Shift-Tab': (ed) => ed.indentSelection('subtract'),

                // Toggle comment — Ctrl+/
                'Ctrl-/': (ed) => ed.execCommand('toggleComment'),

                // Format code — Alt+Shift+F (VSCode style)
                'Shift-Alt-F': (ed) => {
                    const fmt = formatCCode(ed.getValue(), langRef.current);
                    suppressRef.current = true;
                    const cur = ed.getCursor();
                    ed.setValue(fmt);
                    suppressRef.current = false;
                    try { ed.setCursor(cur); } catch (e) {}
                    onChangeRef.current(fmt);
                },

                // Duplicate line — Ctrl+D
                'Ctrl-D': (ed) => {
                    const doc = ed.getDoc();
                    const cur = doc.getCursor();
                    const txt = doc.getLine(cur.line);
                    doc.replaceRange('\n' + txt, { line: cur.line, ch: txt.length });
                    doc.setCursor({ line: cur.line + 1, ch: cur.ch });
                },

                // Delete line — Ctrl+Shift+K
                'Ctrl-Shift-K': (ed) => {
                    const doc = ed.getDoc();
                    const cur = doc.getCursor();
                    const last = doc.lineCount() - 1;
                    if (last === 0) {
                        doc.replaceRange('', { line: 0, ch: 0 }, { line: 0, ch: doc.getLine(0).length });
                    } else if (cur.line < last) {
                        doc.replaceRange('', { line: cur.line, ch: 0 }, { line: cur.line + 1, ch: 0 });
                    } else {
                        doc.replaceRange('',
                            { line: cur.line - 1, ch: doc.getLine(cur.line - 1).length },
                            { line: cur.line,     ch: doc.getLine(cur.line).length });
                    }
                },

                // Move line up — Alt+Up
                'Alt-Up': (ed) => {
                    const doc = ed.getDoc();
                    const cur = doc.getCursor();
                    if (cur.line === 0) return;
                    const a = doc.getLine(cur.line), b = doc.getLine(cur.line - 1);
                    doc.replaceRange(a, { line: cur.line - 1, ch: 0 }, { line: cur.line - 1, ch: b.length });
                    doc.replaceRange(b, { line: cur.line,     ch: 0 }, { line: cur.line,     ch: a.length });
                    doc.setCursor({ line: cur.line - 1, ch: cur.ch });
                },

                // Move line down — Alt+Down
                'Alt-Down': (ed) => {
                    const doc = ed.getDoc();
                    const cur = doc.getCursor();
                    if (cur.line >= doc.lineCount() - 1) return;
                    const a = doc.getLine(cur.line), b = doc.getLine(cur.line + 1);
                    doc.replaceRange(b, { line: cur.line,     ch: 0 }, { line: cur.line,     ch: a.length });
                    doc.replaceRange(a, { line: cur.line + 1, ch: 0 }, { line: cur.line + 1, ch: b.length });
                    doc.setCursor({ line: cur.line + 1, ch: cur.ch });
                },
            },
        });

        cm.on('change', () => {
            if (!suppressRef.current) onChangeRef.current(cm.getValue());
        });

        // Auto-trigger autocomplete after typing 2+ word chars
        if (hasHint) {
            cm.on('inputRead', (ed, change) => {
                if (change.origin === 'paste') return;
                if (!change.text[0] || change.text[0] === '\n') return;
                if (ed.state.completionActive) return;
                const cur = ed.getCursor();
                const lineStr = ed.getLine(cur.line);
                let s = cur.ch;
                while (s > 0 && /\w/.test(lineStr[s - 1])) s--;
                if (cur.ch - s >= 2) {
                    ed.showHint({ hint: _codeHint, completeSingle: false, language: langRef.current });
                }
            });
        }

        cmRef.current = cm;
        return () => {
            if (containerRef.current) containerRef.current.innerHTML = '';
            cmRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync external value → editor (e.g., switching assignment)
    React.useEffect(() => {
        if (!cmRef.current) return;
        if (cmRef.current.getValue() !== (value || '')) {
            suppressRef.current = true;
            const cur = cmRef.current.getCursor();
            cmRef.current.setValue(value || '');
            suppressRef.current = false;
            try { cmRef.current.setCursor(cur); } catch (e) {}
        }
    }, [value]);

    // Sync language / syntax mode
    React.useEffect(() => {
        if (!cmRef.current) return;
        cmRef.current.setOption('mode', EDITOR_MODES[language] || 'text/x-csrc');
    }, [language]);

    return (
        <div
            ref={containerRef}
            style={{
                minHeight,
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: '1px solid #3c3c3c',
            }}
        />
    );
};

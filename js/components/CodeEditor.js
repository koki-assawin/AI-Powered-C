// js/components/CodeEditor.js - CodeMirror 5 real-time syntax highlighting editor

const CodeEditor = ({ value, onChange, language, placeholder, minHeight = '400px' }) => {
    const containerRef = React.useRef(null);
    const cmRef = React.useRef(null);
    const suppressRef = React.useRef(false);
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;

    const MODES = {
        c:      'text/x-csrc',
        cpp:    'text/x-c++src',
        java:   'text/x-java',
        python: 'python',
    };

    // Initialize CodeMirror once on mount
    React.useEffect(() => {
        if (!containerRef.current || cmRef.current) return;

        const cm = CodeMirror(containerRef.current, {
            value: value || '',
            mode: MODES[language] || 'text/x-csrc',
            theme: 'dracula',
            lineNumbers: true,
            tabSize: 4,
            indentUnit: 4,
            indentWithTabs: false,
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: false,
            autofocus: false,
            placeholder: placeholder || '',
            extraKeys: {
                'Tab': (editor) => editor.replaceSelection('    ', 'end'),
                'Shift-Tab': (editor) => editor.indentSelection('subtract'),
                'Ctrl-/': (editor) => editor.execCommand('toggleComment'),
            },
        });

        cm.on('change', () => {
            if (!suppressRef.current) {
                onChangeRef.current(cm.getValue());
            }
        });

        cmRef.current = cm;

        return () => {
            if (containerRef.current) containerRef.current.innerHTML = '';
            cmRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync external value → editor (e.g., switching assignment, loading draft)
    React.useEffect(() => {
        if (!cmRef.current) return;
        const current = cmRef.current.getValue();
        if (current !== (value || '')) {
            suppressRef.current = true;
            const cursor = cmRef.current.getCursor();
            cmRef.current.setValue(value || '');
            suppressRef.current = false;
            try { cmRef.current.setCursor(cursor); } catch (e) { /* cursor out of range — ignore */ }
        }
    }, [value]);

    // Update syntax highlighting mode when language changes
    React.useEffect(() => {
        if (!cmRef.current) return;
        cmRef.current.setOption('mode', MODES[language] || 'text/x-csrc');
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

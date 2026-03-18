// js/components/CodeEditor.js - VSCode-like editor with line numbers
// Extracted and preserved exactly from reference v2.3

const CodeEditor = ({ value, onChange, language, placeholder, minHeight = '400px' }) => {
    const textareaRef = React.useRef(null);
    const lineNumbersRef = React.useRef(null);

    const lines = value.split('\n');
    const lineCount = lines.length;

    const handleScroll = () => {
        if (textareaRef.current && lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const handleTab = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const newValue = value.substring(0, start) + '    ' + value.substring(end);
            onChange(newValue);
            setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 4;
            }, 0);
        }
    };

    return (
        <div className="code-editor-container">
            <div ref={lineNumbersRef} className="line-numbers">
                {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i + 1}>{i + 1}</div>
                ))}
            </div>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleTab}
                className="code-input-area"
                placeholder={placeholder}
                spellCheck="false"
                style={{ minHeight }}
            />
        </div>
    );
};

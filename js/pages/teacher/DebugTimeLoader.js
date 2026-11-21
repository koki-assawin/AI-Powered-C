// js/pages/teacher/DebugTimeLoader.js — โหลดแท็บ "เวลาแก้ไขข้อผิดพลาด" แบบ lazy
// แปลง JSX เฉพาะตอนครูกดเข้าแท็บครั้งแรก (แนวเดียวกับ LearningOutcomesLoader.js)

const DT_ASSET_VERSION = '1.0.0';
let _dtLoading = null;

const loadDebugTime = () => {
    if (window.DebugTimeTab && window.DTM && window.LO) return Promise.resolve();
    if (_dtLoading) return _dtLoading;
    const files = [
        !window.LO && 'js/learningOutcomes.js',
        !window.DTM && 'js/debugTimeMetrics.js',
        !window.DebugTimeTab && 'js/pages/teacher/DebugTime.js',
    ].filter(Boolean);
    _dtLoading = files.reduce((chain, path) => chain.then(() =>
        fetch(`${path}?v=${DT_ASSET_VERSION}`)
            .then(r => { if (!r.ok) throw new Error(`โหลด ${path} ไม่ได้ (${r.status})`); return r.text(); })
            .then(src => {
                const out = Babel.transform(src, { presets: ['react'], filename: path, sourceType: 'script' }).code;
                const s = document.createElement('script');
                s.text = `${out}\n//# sourceURL=${path}`;
                document.body.appendChild(s);
            })
    ), Promise.resolve()).catch(err => { _dtLoading = null; throw err; });
    return _dtLoading;
};

const DebugTimeLoader = (props) => {
    const [ready, setReady] = React.useState(!!(window.DebugTimeTab && window.DTM && window.LO));
    const [error, setError] = React.useState('');
    React.useEffect(() => {
        if (ready) return undefined;
        let alive = true;
        loadDebugTime()
            .then(() => { if (alive) setReady(true); })
            .catch(err => { if (alive) setError(err.message || String(err)); });
        return () => { alive = false; };
    }, []);
    if (error) return <div className="p-6 text-center text-sm text-red-600">โหลดแท็บเวลาแก้ไขข้อผิดพลาดไม่สำเร็จ<div className="text-xs text-gray-500 mt-1">{error}</div></div>;
    if (!ready) return <Spinner text="กำลังโหลดแท็บเวลาแก้ไขข้อผิดพลาด..." />;
    return React.createElement(window.DebugTimeTab, props);
};

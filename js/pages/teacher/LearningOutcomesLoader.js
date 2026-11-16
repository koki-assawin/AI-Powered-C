// js/pages/teacher/LearningOutcomesLoader.js — โหลดแท็บ "ผลลัพธ์ผู้เรียน" แบบ lazy
// แปลง JSX ของแท็บนี้เฉพาะตอนครูกดเข้าแท็บครั้งแรก เพื่อไม่ให้หน้าอื่นโหลดช้าลง
// (แนวเดียวกับ js/studio/studioLoader.js)

const LO_ASSET_VERSION = '1.0.0';
const LO_FILES = ['js/learningOutcomes.js', 'js/pages/teacher/LearningOutcomes.js'];
let _loLoading = null;

const loadLearningOutcomes = () => {
    if (window.LearningOutcomesTab && window.LO) return Promise.resolve();
    if (_loLoading) return _loLoading;
    _loLoading = LO_FILES.reduce((chain, path) => chain.then(() =>
        fetch(`${path}?v=${LO_ASSET_VERSION}`)
            .then(r => { if (!r.ok) throw new Error(`โหลด ${path} ไม่ได้ (${r.status})`); return r.text(); })
            .then(src => {
                const out = Babel.transform(src, { presets: ['react'], filename: path, sourceType: 'script' }).code;
                const s = document.createElement('script');
                s.text = `${out}\n//# sourceURL=${path}`;
                document.body.appendChild(s);
            })
    ), Promise.resolve()).catch(err => { _loLoading = null; throw err; });
    return _loLoading;
};

const LearningOutcomesLoader = (props) => {
    const [ready, setReady] = React.useState(!!(window.LearningOutcomesTab && window.LO));
    const [error, setError] = React.useState('');
    React.useEffect(() => {
        if (ready) return undefined;
        let alive = true;
        loadLearningOutcomes()
            .then(() => { if (alive) setReady(true); })
            .catch(err => { if (alive) setError(err.message || String(err)); });
        return () => { alive = false; };
    }, []);
    if (error) return <div className="p-6 text-center text-sm text-red-600">โหลดแท็บผลลัพธ์ผู้เรียนไม่สำเร็จ<div className="text-xs text-gray-500 mt-1">{error}</div></div>;
    if (!ready) return <Spinner text="กำลังโหลดรายงานผลลัพธ์ผู้เรียน..." />;
    return React.createElement(window.LearningOutcomesTab, props);
};

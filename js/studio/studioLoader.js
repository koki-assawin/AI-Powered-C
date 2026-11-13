/**
 * js/studio/studioLoader.js — โหลดไฟล์ APCC Studio แบบ lazy (v6.0)
 *
 * หลักการ PAAC+D: — (โครงสร้างพื้นฐาน)
 * ปัญหาที่แก้: Babel standalone แปลงทุก <script type="text/babel"> ตอนเปิดหน้า
 * ถ้าใส่ไฟล์ Studio ทั้งหมดใน index.html รายวิชาเดิมจะโหลดช้าลง (ข้อ 7.5 กำหนดไม่เกิน 10%)
 * จึงโหลดและแปลงไฟล์ Studio เฉพาะตอนเข้าหน้า Studio ครั้งแรกเท่านั้น
 *
 * ไฟล์ที่โหลดแบบ lazy ต้องประกาศของที่ใช้ข้ามไฟล์ไว้บน window (เช่น window.TemplateManager = TemplateManager)
 */

const STUDIO_ASSET_VERSION = '6.0.6';

// หน้า Studio → ไฟล์ที่ต้องโหลด (ตามลำดับ)
const STUDIO_PAGES = {
    TemplateManager: ['js/studio/content/templates.js', 'js/studio/templatePack.js', 'js/pages/studio/TemplateManager.js'],
    ParsonsPlayer:   ['js/studio/ParsonsPlayer.js'],
    StudioGates:      ['js/studio/skillGate.js', 'js/pages/studio/StudioGates.js'],
    StudioStageStrip: ['js/studio/skillGate.js', 'js/studio/StageBar.js'],
    ExplainBack:      ['js/studio/ExplainBack.js'],
    ProjectStudio:    ['js/studio/skillGate.js', 'js/studio/projectStudio.js', 'js/studio/WebAppRunner.js', 'js/pages/studio/ProjectStudio.js'],
    RubricReview:     ['js/studio/projectStudio.js', 'js/studio/WebAppRunner.js', 'js/pages/studio/RubricReview.js'],
};

const _studioScripts = {};

const loadStudioScript = (path) => {
    if (_studioScripts[path]) return _studioScripts[path];
    const p = fetch(`${path}?v=${STUDIO_ASSET_VERSION}`)
        .then(r => { if (!r.ok) throw new Error(`โหลด ${path} ไม่ได้ (${r.status})`); return r.text(); })
        .then(src => {
            const out = Babel.transform(src, { presets: ['react'], filename: path, sourceType: 'script' }).code;
            const s = document.createElement('script');
            s.text = `${out}\n//# sourceURL=${path}`;
            document.body.appendChild(s);
        })
        .catch(err => { delete _studioScripts[path]; throw err; });
    _studioScripts[path] = p;
    return p;
};

const loadStudioModules = (paths) =>
    paths.reduce((chain, path) => chain.then(() => loadStudioScript(path)), Promise.resolve());

// ใช้ใน router: React.createElement(StudioPage, { name: 'TemplateManager' })
const StudioPage = ({ name, ...props }) => {
    const [state, setState] = React.useState(window[name] ? 'ready' : 'loading');
    const [error, setError] = React.useState('');
    React.useEffect(() => {
        if (state === 'ready') return;
        loadStudioModules(STUDIO_PAGES[name] || [])
            .then(() => setState(window[name] ? 'ready' : 'error'))
            .catch(err => { setError(err.message); setState('error'); });
    }, [name]);

    if (state === 'loading') return <Spinner text="กำลังโหลด APCC Studio..." />;
    if (state === 'error') {
        return (
            <div className="p-8 text-center text-sm text-red-600">
                โหลดหน้า APCC Studio ไม่สำเร็จ {error && <div className="text-xs text-gray-500 mt-1">{error}</div>}
            </div>
        );
    }
    return React.createElement(window[name], props);
};

window.loadStudioModules = loadStudioModules;
window.StudioPage = StudioPage;

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

const STUDIO_ASSET_VERSION = '6.0.11';

// หน้า Studio → ไฟล์ที่ต้องโหลด (ตามลำดับ)
const STUDIO_PAGES = {
    TemplateManager: ['js/studio/content/templates.js', 'js/studio/templatePack.js', 'js/pages/studio/TemplateManager.js'],
    ParsonsPlayer:   ['js/studio/ParsonsPlayer.js'],
    StudioGates:      ['js/studio/skillGate.js', 'js/pages/studio/StudioGates.js'],
    StudioStageStrip: ['js/studio/skillGate.js', 'js/studio/StageBar.js'],
    ExplainBack:      ['js/studio/ExplainBack.js'],
    ProjectStudio:    ['js/studio/skillGate.js', 'js/studio/projectStudio.js', 'js/studio/WebAppRunner.js', 'js/pages/studio/ProjectStudio.js'],
    RubricReview:     ['js/studio/skillGate.js', 'js/studio/projectStudio.js', 'js/studio/studioAnalytics.js', 'js/studio/WebAppRunner.js', 'js/pages/studio/RubricReview.js'],
    StudioShowcase:   ['js/studio/projectStudio.js', 'js/studio/WebAppRunner.js', 'js/pages/studio/Showcase.js'],
    StudioPortfolio:  ['js/studio/skillGate.js', 'js/studio/projectStudio.js', 'js/studio/studioAnalytics.js', 'js/studio/WebAppRunner.js', 'js/pages/studio/ProjectStudio.js', 'js/pages/studio/Showcase.js'],
    StudioAnalytics:  ['js/studio/skillGate.js', 'js/studio/projectStudio.js', 'js/studio/studioAnalytics.js', 'js/pages/studio/StudioAnalytics.js'],
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
    // เก็บสถานะแยกตามชื่อหน้า: เมื่อเปลี่ยนหน้า Studio โดยไม่โหลดใหม่ (React ใช้ StudioPage ตัวเดิม)
    // ต้องไม่ถือว่าหน้าใหม่พร้อมแล้ว ไม่อย่างนั้น createElement(undefined) จะทำให้หน้าเว็บพัง
    const [failed, setFailed] = React.useState({});
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
        if (window[name]) return undefined;
        let alive = true;
        loadStudioModules(STUDIO_PAGES[name] || [])
            .then(() => { if (alive) { if (!window[name]) setFailed(f => ({ ...f, [name]: 'ไม่พบหน้า ' + name })); setTick(t => t + 1); } })
            .catch(err => { if (alive) setFailed(f => ({ ...f, [name]: err.message })); });
        return () => { alive = false; };
    }, [name]);

    if (window[name]) return React.createElement(window[name], props);
    if (failed[name] != null) {
        return (
            <div className="p-8 text-center text-sm text-red-600">
                โหลดหน้า APCC Studio ไม่สำเร็จ <div className="text-xs text-gray-500 mt-1">{failed[name]}</div>
            </div>
        );
    }
    return <Spinner text="กำลังโหลด APCC Studio..." />;
};

window.loadStudioModules = loadStudioModules;
window.StudioPage = StudioPage;

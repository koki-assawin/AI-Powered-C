// js/components/Spinner.js - Loading spinner
const Spinner = ({ text = 'กำลังโหลด...' }) => (
    <div className="flex flex-col items-center justify-center py-12 text-blue-500">
        <svg className="w-10 h-10 mb-3" style={{ animation: 'lms-spin 0.8s linear infinite' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span className="text-gray-500">{text}</span>
    </div>
);

const SpinIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} style={{ animation: 'lms-spin 0.8s linear infinite' }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
);

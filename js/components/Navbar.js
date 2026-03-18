// js/components/Navbar.js - Responsive top navigation bar

const Navbar = ({ title, subtitle }) => {
    const { user, userDoc, role, logout } = useAuth();
    const [menuOpen, setMenuOpen] = React.useState(false);

    const navLinks = {
        student: [
            { hash: '#/student/dashboard', label: 'แดชบอร์ด', icon: '🏠' },
            { hash: '#/student/courses', label: 'รายวิชา', icon: '📚' },
            { hash: '#/student/gradebook', label: 'คะแนน', icon: '📊' },
            { hash: '#/student/history', label: 'ประวัติ', icon: '📋' },
        ],
        teacher: [
            { hash: '#/teacher/dashboard', label: 'แดชบอร์ด', icon: '🏠' },
            { hash: '#/teacher/courses', label: 'จัดการรายวิชา', icon: '📚' },
            { hash: '#/teacher/analytics', label: 'วิเคราะห์นักเรียน', icon: '📊' },
        ],
        admin: [
            { hash: '#/admin/dashboard', label: 'แดชบอร์ด', icon: '🏠' },
            { hash: '#/admin/users', label: 'จัดการผู้ใช้', icon: '👥' },
            { hash: '#/admin/settings', label: 'ตั้งค่าระบบ', icon: '⚙️' },
        ],
    };

    const links = navLinks[role] || [];
    const currentHash = window.location.hash;

    const roleBadge = {
        student: { label: 'นักเรียน', color: 'bg-blue-100 text-blue-800' },
        teacher: { label: 'ครูผู้สอน', color: 'bg-green-100 text-green-800' },
        admin: { label: 'ผู้ดูแลระบบ', color: 'bg-purple-100 text-purple-800' },
    };

    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo + Title */}
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            AI
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-gray-800 leading-tight">
                                {title || 'AI-Powered Coding LMS'}
                            </h1>
                            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                        </div>
                    </div>

                    {/* Desktop nav links */}
                    <nav className="hidden md:flex items-center space-x-1">
                        {links.map(link => (
                            <a
                                key={link.hash}
                                href={link.hash}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                    ${currentHash === link.hash
                                        ? 'bg-blue-500 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                {link.icon} {link.label}
                            </a>
                        ))}
                    </nav>

                    {/* User menu */}
                    <div className="flex items-center space-x-3">
                        {userDoc && (
                            <span className={`hidden sm:inline text-xs font-medium px-2 py-1 rounded-full ${roleBadge[role]?.color || 'bg-gray-100 text-gray-700'}`}>
                                {roleBadge[role]?.label}
                            </span>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    {userDoc?.displayName?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-24 truncate">
                                    {userDoc?.displayName || user?.email}
                                </span>
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                                    <div className="px-4 py-2 border-b border-gray-100">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {userDoc?.displayName}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>
                                    <button
                                        onClick={() => { setMenuOpen(false); logout(); }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                                    >
                                        <span>🚪</span>
                                        <span>ออกจากระบบ</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile hamburger */}
                        <button
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                            onClick={() => setMenuOpen(!menuOpen)}
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile nav links */}
                {menuOpen && (
                    <div className="md:hidden pb-3 border-t border-gray-100 pt-2">
                        {links.map(link => (
                            <a
                                key={link.hash}
                                href={link.hash}
                                onClick={() => setMenuOpen(false)}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                            >
                                {link.icon} {link.label}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
};

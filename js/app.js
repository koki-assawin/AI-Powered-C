// ============================================================
// js/app.js - Root App Component + Hash Router
// This file MUST be loaded LAST
// ============================================================

// ── Custom Hash Router ──
const useHashRoute = () => {
    const [route, setRoute] = React.useState(window.location.hash || '#/login');
    React.useEffect(() => {
        const handler = () => setRoute(window.location.hash || '#/login');
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);
    return route;
};

// ── Route Table ──
const renderRoute = (route, role) => {
    // Unauthenticated routes
    if (route === '#/login' || route === '') return React.createElement(LoginPage);
    if (route === '#/register') return React.createElement(RegisterPage);

    // Student routes
    if (route.startsWith('#/student')) {
        const guard = (children) => React.createElement(ProtectedRoute, { allowedRoles: ['student'] }, children);

        if (route === '#/student/dashboard')
            return guard(React.createElement(StudentDashboard));
        if (route === '#/student/courses')
            return guard(React.createElement(CourseViewer));
        if (route.startsWith('#/student/workspace'))
            return guard(React.createElement(CodingWorkspace));
        if (route === '#/student/gradebook')
            return guard(React.createElement(Gradebook));
        if (route === '#/student/history')
            return guard(React.createElement(SubmissionHistory));

        // Default student route
        return guard(React.createElement(StudentDashboard));
    }

    // Teacher routes
    if (route.startsWith('#/teacher')) {
        const guard = (children) =>
            React.createElement(ProtectedRoute, { allowedRoles: ['teacher', 'admin'] }, children);

        if (route === '#/teacher/dashboard')
            return guard(React.createElement(TeacherDashboard));
        if (route === '#/teacher/courses')
            return guard(React.createElement(CourseBuilder));
        if (route.startsWith('#/teacher/assignment'))
            return guard(React.createElement(AssignmentManager));
        if (route.startsWith('#/teacher/testcases'))
            return guard(React.createElement(TestCaseEditor));
        if (route === '#/teacher/analytics')
            return guard(React.createElement(StudentAnalytics));

        return guard(React.createElement(TeacherDashboard));
    }

    // Admin routes
    if (route.startsWith('#/admin')) {
        const guard = (children) =>
            React.createElement(ProtectedRoute, { allowedRoles: ['admin'] }, children);

        if (route === '#/admin/dashboard')
            return guard(React.createElement(AdminDashboard));
        if (route === '#/admin/users')
            return guard(React.createElement(UserManager));
        if (route === '#/admin/settings')
            return guard(React.createElement(SystemSettings));

        return guard(React.createElement(AdminDashboard));
    }

    // Unknown route → login
    window.location.hash = '#/login';
    return null;
};

// ── Root App ──
const App = () => {
    const route = useHashRoute();
    const { authLoading, user, role } = useAuth();

    // Hide the initial loader once React has mounted
    React.useEffect(() => {
        const loader = document.getElementById('initial-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }, []);

    // Load Gemini API key on startup
    React.useEffect(() => {
        loadGeminiKey();
    }, []);

    // Redirect authenticated users away from login/register
    React.useEffect(() => {
        if (!authLoading && user && role) {
            if (route === '#/login' || route === '#/register' || route === '') {
                const defaultRoutes = {
                    student: '#/student/dashboard',
                    teacher: '#/teacher/dashboard',
                    admin: '#/admin/dashboard',
                };
                window.location.hash = defaultRoutes[role] || '#/student/dashboard';
            }
        }
    }, [authLoading, user, role, route]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-800">
                <div className="text-center text-white">
                    <div style={{
                        width: 48, height: 48,
                        border: '4px solid rgba(255,255,255,0.2)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'lms-spin 0.8s linear infinite',
                        margin: '0 auto 16px',
                    }} />
                    <p>กำลังตรวจสอบการเข้าสู่ระบบ...</p>
                </div>
            </div>
        );
    }

    return React.createElement(React.Fragment, null, renderRoute(route, role));
};

// ── Mount ──
ReactDOM.render(
    React.createElement(AuthProvider, null,
        React.createElement(App)
    ),
    document.getElementById('root')
);

// js/components/ProtectedRoute.js - RBAC gate component

const ProtectedRoute = ({ allowedRoles, children }) => {
    const { user, role, authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner text="กำลังตรวจสอบสิทธิ์..." />
            </div>
        );
    }

    if (!user) {
        window.location.hash = '#/login';
        return null;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
                    <p className="text-gray-600 mb-6">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
                    <button
                        onClick={() => {
                            const routes = { student: '#/student/dashboard', teacher: '#/teacher/dashboard', admin: '#/admin/dashboard' };
                            window.location.hash = routes[role] || '#/login';
                        }}
                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

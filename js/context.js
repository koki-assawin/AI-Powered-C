// ============================================================
// js/context.js - React Auth Context (RBAC)
// Provides { user, userDoc, role, authLoading } to all pages
// ============================================================

const AuthContext = React.createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = React.useState(null);
    const [userDoc, setUserDoc] = React.useState(null);
    const [authLoading, setAuthLoading] = React.useState(true);

    React.useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    let snap = await db.collection('users').doc(firebaseUser.uid).get();
                    if (!snap.exists) {
                        // First-time Google Sign-In: create user doc with student role
                        const newDoc = {
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || firebaseUser.email,
                            role: 'student',
                            enrolledCourses: [],
                            approvedByAdmin: true,
                            profilePhotoURL: firebaseUser.photoURL || null,
                            createdAt: serverTimestamp(),
                        };
                        await db.collection('users').doc(firebaseUser.uid).set(newDoc);
                        snap = await db.collection('users').doc(firebaseUser.uid).get();
                    }
                    setUserDoc({ id: firebaseUser.uid, ...snap.data() });

                    // Non-blocking: initialize player stats + award daily streak
                    if (typeof handleDailyStreak === 'function') {
                        handleDailyStreak(firebaseUser.uid).catch(() => {});
                    }
                } catch (err) {
                    console.error('Failed to load user doc:', err);
                }
            } else {
                setUser(null);
                setUserDoc(null);
            }
            setAuthLoading(false);
        });
        return unsubscribe;
    }, []);

    const logout = async () => {
        await auth.signOut();
        window.location.hash = '#/login';
    };

    const value = {
        user,
        userDoc,
        role: userDoc?.role || null,
        authLoading,
        logout,
    };

    return React.createElement(AuthContext.Provider, { value }, children);
};

// Hook for convenient access
const useAuth = () => React.useContext(AuthContext);

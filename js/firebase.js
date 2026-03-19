// ============================================================
// js/firebase.js - Firebase SDK initialization
// This file MUST be loaded first (before all other js/ files)
// ============================================================

// ⚠️ ADMIN SETUP REQUIRED:
// Replace the placeholder values below with your actual Firebase
// Web App configuration from Firebase Console > Project Settings > Your apps
// The PathoVetAssist project's databaseURL is pre-filled.
const firebaseConfig = {
    apiKey: "AIzaSyCu21yPXCeRDYxcVsB_9MLTiPCaa1OgCcM",         // ← Replace this
    authDomain: "pathovetassist.firebaseapp.com", // ← Replace this
    databaseURL: "https://pathovetassist-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pathovetassist",                 // ← Replace this
    storageBucket: "pathovetassist.firebasestorage.app", // ← Replace this
    messagingSenderId: "17025284854",          // ← Replace this
    appId: "1:17025284854:web:13adce1651d17e103b0ad7"                          // ← Replace this
};

// Initialize Firebase (guard against duplicate init during hot-reload)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Export service instances as globals (accessible by all subsequent scripts)
const db   = firebase.firestore();
const auth = firebase.auth();
const rtdb = firebase.database();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ── Language configurations (used across student, teacher, and grader) ──
const LANGUAGES = {
    c: {
        name: 'C',
        icon: '🔵',
        color: '#A8B9CC',
        hljsLang: 'c',
        pistonLang: 'c',
        defaultCode: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`,
    },
    cpp: {
        name: 'C++',
        icon: '🔷',
        color: '#00599C',
        hljsLang: 'cpp',
        pistonLang: 'cpp',
        defaultCode: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}`,
    },
    python: {
        name: 'Python',
        icon: '🐍',
        color: '#3776AB',
        hljsLang: 'python',
        pistonLang: 'python',
        defaultCode: `def main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()`,
    },
    java: {
        name: 'Java',
        icon: '☕',
        color: '#007396',
        hljsLang: 'java',
        pistonLang: 'java',
        // ⚠️ Piston requires the class name to be "Main"
        defaultCode: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
    },
};

// ── Gemini API key (loaded from Firestore) ──
// Stored at the module level; populated by loadGeminiKey() on app start
let GEMINI_KEY = '';

const loadGeminiKey = async () => {
    try {
        const snap = await db.collection('config').doc('gemini').get();
        const key = snap.exists ? snap.data().apiKey : null;
        if (key && typeof key === 'string') {
            GEMINI_KEY = key;
            console.log('✅ Gemini API Key loaded from Firestore');
        } else {
            // Fallback to localStorage (for offline dev)
            const local = localStorage.getItem('gemini_api_key');
            if (local) {
                GEMINI_KEY = local;
                console.warn('⚠️ Using Gemini API Key from localStorage (fallback)');
            } else {
                console.error('❌ Gemini API Key not found. Contact admin.');
            }
        }
    } catch (err) {
        console.error('❌ Firestore error loading Gemini key:', err);
        const local = localStorage.getItem('gemini_api_key');
        if (local) GEMINI_KEY = local;
    }
};

// ── Firestore helpers ──
const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
const arrayUnion  = (...items) => firebase.firestore.FieldValue.arrayUnion(...items);
const arrayRemove = (...items) => firebase.firestore.FieldValue.arrayRemove(...items);
const increment   = (n) => firebase.firestore.FieldValue.increment(n);

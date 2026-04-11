/**
 * migrate-firestore.js
 * Migrates courses, assignments, testCases from pathovetassist → ai-powered-coding-596ed
 * Auth users cannot be migrated — submissions/enrollments/grades are skipped intentionally.
 *
 * Run: node migrate-firestore.js
 * Requires: firebase-tools logged in (firebase auth:print-access-token)
 */

const https = require('https');

const OLD_PROJECT = 'pathovetassist';
const NEW_PROJECT = 'ai-powered-coding-596ed';
// API keys from firebaseConfig (used with Firestore REST API in test mode)
const OLD_API_KEY = 'AIzaSyCu21yPXCeRDYxcVsB_9MLTiPCaa1OgCcM';
const NEW_API_KEY = 'AIzaSyD_8EGyQoll3B4fgpw-j0cT5o9n42zlGpw';
const COLLECTIONS_TO_MIGRATE = ['courses', 'assignments', 'testCases', 'config'];

// ── HTTP helper ─────────────────────────────────────────────────────────────
function request(method, url, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// ── Firestore REST helpers ───────────────────────────────────────────────────
const BASE = (project, apiKey) =>
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;

const keyParam = (apiKey) => `key=${apiKey}`;

async function listDocuments(project, apiKey, collection, pageToken) {
    let url = `${BASE(project)}/${collection}?pageSize=300&${keyParam(apiKey)}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const res = await request('GET', url);
    return res.body;
}

async function getAllDocs(project, apiKey, collection) {
    const docs = [];
    let pageToken = null;
    do {
        const data = await listDocuments(project, apiKey, collection, pageToken);
        if (data.documents) docs.push(...data.documents);
        pageToken = data.nextPageToken || null;
    } while (pageToken);
    return docs;
}

async function createDocument(project, apiKey, collection, docId, fields) {
    const url = `${BASE(project)}/${collection}?documentId=${encodeURIComponent(docId)}&${keyParam(apiKey)}`;
    const res = await request('POST', url, { fields });
    return res;
}

// ── Migrate one collection ───────────────────────────────────────────────────
async function migrateCollection(collectionName) {
    console.log(`\n📦 Migrating [${collectionName}]...`);
    const docs = await getAllDocs(OLD_PROJECT, OLD_API_KEY, collectionName);
    console.log(`   Found ${docs.length} documents`);

    if (docs.length === 0) {
        console.log('   (empty — skipping)');
        return;
    }

    let ok = 0, fail = 0;
    for (const doc of docs) {
        const docId = doc.name.split('/').pop();
        const res = await createDocument(NEW_PROJECT, NEW_API_KEY, collectionName, docId, doc.fields || {});
        if (res.status === 200) {
            ok++;
        } else if (res.status === 409) {
            ok++; // Already exists — skip
        } else {
            console.warn(`   ⚠️  Failed doc [${docId}]: HTTP ${res.status} — ${res.body?.error?.message || JSON.stringify(res.body).slice(0, 100)}`);
            fail++;
        }
    }
    console.log(`   ✅ ${ok} migrated, ❌ ${fail} failed`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
    console.log('======================================================');
    console.log('  Firestore Migration: pathovetassist → ai-powered-coding-596ed');
    console.log('  Collections:', COLLECTIONS_TO_MIGRATE.join(', '));
    console.log('  ⚠️  Auth users / submissions / enrollments / grades are SKIPPED');
    console.log('======================================================');

    for (const col of COLLECTIONS_TO_MIGRATE) {
        await migrateCollection(col);
    }

    console.log('\n🎉 Migration complete!');
    console.log('\nNext steps:');
    console.log('  1. Go to Firebase Console → ai-powered-coding → Realtime Database');
    console.log('     Add key: ai-powered-code/config/gemini_api_key = <your Gemini key>');
    console.log('  2. Create admin user: register on the app → set role:"admin" in Firestore');
})();

// ============================================================
// APCC Code Runner — Cloudflare Worker
// Proxies compile requests server-to-server (no CORS issues)
// Chain: Wandbox → Judge0 CE
// Deploy: https://workers.cloudflare.com
// ============================================================

const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const JUDGE0_URL  = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

const WANDBOX_COMPILER = {
    c:      'gcc-head',
    cpp:    'gcc-head',
    python: 'cpython-3.12.0',
    java:   'openjdk-head',
};
const WANDBOX_OPTIONS = { c: '-x c', cpp: '', python: '', java: '' };
const JUDGE0_LANG    = { c: 50, cpp: 54, python: 71, java: 62 };

const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS },
    });

const isOci = (s) =>
    (s || '').includes('OCI runtime error') ||
    (s || '').includes('temporarily unavailable');

async function compile(code, language, stdin) {
    // ── 1. Wandbox (retry once) ────────────────────────────────
    for (let i = 0; i < 2; i++) {
        try {
            const body = {
                compiler: WANDBOX_COMPILER[language] || 'gcc-head',
                code,
                stdin: stdin || '',
            };
            if (WANDBOX_OPTIONS[language]) body.options = WANDBOX_OPTIONS[language];

            const res = await fetch(WANDBOX_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(body),
                signal:  AbortSignal.timeout(15000),
            });
            if (!res.ok) throw new Error(`Wandbox HTTP ${res.status}`);

            const d = await res.json();
            if (isOci(d.program_error)) throw new Error('OCI in Wandbox response');

            return {
                compiler_error: d.compiler_error  || '',
                program_output: d.program_output  || '',
                program_error:  d.program_error   || '',
                source: 'wandbox',
            };
        } catch (_) { /* try next */ }
    }

    // ── 2. Judge0 CE fallback ──────────────────────────────────
    const langId = JUDGE0_LANG[language] || 50;
    const res = await fetch(JUDGE0_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source_code: code, language_id: langId, stdin: stdin || '' }),
        signal:  AbortSignal.timeout(18000),
    });
    if (!res.ok) throw new Error(`Judge0 HTTP ${res.status}`);

    const d = await res.json();
    return {
        compiler_error: d.compile_output || '',
        program_output: d.stdout         || '',
        program_error:  d.stderr         || '',
        source: 'judge0',
    };
}

export default {
    async fetch(request) {
        const url = new URL(request.url);

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS });
        }

        // Health check
        if (request.method === 'GET') {
            return new Response('APCC Code Runner v1.0 — POST /compile', {
                headers: { 'Content-Type': 'text/plain', ...CORS },
            });
        }

        if (request.method === 'POST' && url.pathname === '/compile') {
            try {
                const { code, language, stdin } = await request.json();
                if (!code || !language) {
                    return json({ error: 'Missing code or language' }, 400);
                }
                const result = await compile(code, language, stdin);
                return json(result);
            } catch (err) {
                return json({ error: err.message || 'Runner error' }, 503);
            }
        }

        return new Response('Not found', { status: 404, headers: CORS });
    },
};

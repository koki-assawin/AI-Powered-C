// ============================================================
// APCC Code Runner — Cloudflare Worker
// Proxies compile requests server-to-server (no CORS issues)
// Chain: Wandbox → Judge0 CE
// Deploy: https://workers.cloudflare.com
// ============================================================

const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const JUDGE0_URL  = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true';

const WANDBOX_COMPILER = {
    c:      'gcc-head',
    cpp:    'gcc-head',
    python: 'cpython-3.12.7',
    // java: not on Wandbox (compiles as prog.java → public class Main fails) → Judge0
};
const WANDBOX_OPTIONS = { c: '-x c' };

// UTF-8 safe base64 (Judge0 plain-text mode rejects Thai with HTTP 400)
const b64enc = (str) => { const b = new TextEncoder().encode(str || ''); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); };
const b64dec = (v) => { if (!v) return ''; try { const s = atob(v); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new TextDecoder('utf-8').decode(b); } catch (_) { return v; } };
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
    for (let i = 0; i < 2 && WANDBOX_COMPILER[language]; i++) {
        try {
            const body = {
                compiler: WANDBOX_COMPILER[language],
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
            // Wandbox may return OCI in program_output (stdout) not just program_error (stderr)
            if (isOci(d.program_error) || isOci(d.program_output) || isOci(d.compiler_error)) {
                throw new Error('OCI in Wandbox response');
            }

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
        body:    JSON.stringify({ source_code: b64enc(code), language_id: langId, stdin: b64enc(stdin || '') }),
        signal:  AbortSignal.timeout(18000),
    });
    if (!res.ok) throw new Error(`Judge0 HTTP ${res.status}`);

    const d = await res.json();
    return {
        compiler_error: b64dec(d.compile_output),
        program_output: b64dec(d.stdout),
        program_error:  b64dec(d.stderr),
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

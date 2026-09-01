// js/pollWordCloud.js - Thai-aware word frequency counter for QuickPoll word-cloud mode
// See Spec_QuickPoll_APCC.md §6 — Intl.Segmenter when available, whole-phrase fallback
// otherwise, stopword list, capped at 20 words.

const POLL_STOPWORDS = new Set([
    'ที่', 'การ', 'ของ', 'และ', 'ใน', 'แล้ว', 'ครับ', 'ค่ะ', 'คะ', 'นะ', 'จะ',
    'เป็น', 'มี', 'ให้', 'ได้', 'ไป', 'มา', 'อยู่', 'กับ', 'ก็', 'ด้วย', 'หรือ',
    'ๆ', 'บ้าง', 'บาง', 'อะไร', 'ต้อง', 'คือ', 'เช่น', 'อีก', 'ทุก', 'นี้',
]);

function pollSegmentWords(text) {
    const clean = (text || '').trim().toLowerCase();
    if (!clean) return [];
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            const seg = new Intl.Segmenter('th', { granularity: 'word' });
            return Array.from(seg.segment(clean))
                .filter(s => s.isWordLike)
                .map(s => s.segment.trim())
                .filter(Boolean);
        } catch (_) { /* fall through to phrase fallback */ }
    }
    return [clean];
}

function computePollWordCloud(texts, maxWords = 20) {
    const counts = {};
    (texts || []).forEach(text => {
        pollSegmentWords(text).forEach(w => {
            if (w.length < 2 || POLL_STOPWORDS.has(w)) return;
            counts[w] = (counts[w] || 0) + 1;
        });
    });
    return Object.entries(counts)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, maxWords);
}

window.computePollWordCloud = computePollWordCloud;

// js/components/WordCloud.js - renders a frequency-sized word cloud for QuickPoll text-type polls
// Words larger = answered more often. Deliberately no library — just scaled font-size tags.

const WordCloud = ({ words }) => {
    if (!words || !words.length) {
        return <p className="text-gray-400 text-center py-16" style={{ fontSize: '18pt' }}>ยังไม่มีคำตอบ</p>;
    }
    const counts = words.map(w => w.count);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const scale = (count) => (max === min ? 32 : 18 + ((count - min) / (max - min)) * 54);
    const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#22d3ee'];

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 p-6">
            {words.map((w, i) => (
                <span key={w.word}
                    title={`${w.word} (${w.count})`}
                    style={{ fontSize: scale(w.count), color: colors[i % colors.length], lineHeight: 1.1 }}
                    className="font-black">
                    {w.word}
                </span>
            ))}
        </div>
    );
};

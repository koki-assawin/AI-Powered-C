// js/components/RadarChart.js - AI Code Analysis Result with Radar Chart
// Extracted and preserved from reference v2.3

const RadarChart = ({ analysis, language }) => {
    if (!analysis) return null;

    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    React.useEffect(() => {
        if (analysis.metrics && canvasRef.current) {
            // Destroy previous chart instance to avoid canvas reuse error
            if (chartRef.current) chartRef.current.destroy();

            const ctx = canvasRef.current.getContext('2d');
            chartRef.current = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['คุณภาพโค้ด', 'ความถูกต้อง', 'ประสิทธิภาพ', 'ความอ่านง่าย', 'Best Practices'],
                    datasets: [{
                        label: 'คะแนนการวิเคราะห์',
                        data: [
                            analysis.metrics.quality || 0,
                            analysis.metrics.correctness || 0,
                            analysis.metrics.efficiency || 0,
                            analysis.metrics.readability || 0,
                            analysis.metrics.bestPractices || 0,
                        ],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
                    }],
                },
                options: {
                    scales: {
                        r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } },
                    },
                    plugins: { legend: { display: false } },
                },
            });
        }
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [analysis]);

    const colorMap = { success: 'green', warning: 'yellow', error: 'red' };
    const color = colorMap[analysis.status] || 'gray';

    return (
        <div className={`border-l-4 border-${color}-500 bg-${color}-50 rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center space-x-3 mb-4">
                <div className={`w-12 h-12 bg-${color}-100 rounded-full flex items-center justify-center text-2xl`}>
                    {analysis.status === 'success' && '✅'}
                    {analysis.status === 'warning' && '⚠️'}
                    {analysis.status === 'error' && '❌'}
                    {!['success','warning','error'].includes(analysis.status) && '🔍'}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">
                        ผลการวิเคราะห์โค้ด {LANGUAGES[language]?.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                        {analysis.status === 'success' && 'โค้ดของคุณดูดี!'}
                        {analysis.status === 'warning' && 'พบข้อควรปรับปรุง'}
                        {analysis.status === 'error' && 'พบข้อผิดพลาด'}
                    </p>
                </div>
            </div>

            {analysis.metrics && (
                <div className="mb-6 bg-white rounded-lg p-4">
                    <h4 className="font-bold text-gray-700 mb-3 text-center">📊 คะแนนการวิเคราะห์</h4>
                    <div className="max-w-md mx-auto">
                        <canvas ref={canvasRef}></canvas>
                    </div>
                    <div className="grid grid-cols-5 gap-1 mt-3 text-center text-xs">
                        {[
                            { label: 'คุณภาพ', val: analysis.metrics.quality },
                            { label: 'ความถูก', val: analysis.metrics.correctness },
                            { label: 'ประสิทธิ', val: analysis.metrics.efficiency },
                            { label: 'อ่านง่าย', val: analysis.metrics.readability },
                            { label: 'Best P.', val: analysis.metrics.bestPractices },
                        ].map(m => (
                            <div key={m.label} className="bg-blue-50 rounded p-1">
                                <div className="font-bold text-blue-700">{m.val || 0}</div>
                                <div className="text-gray-500">{m.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-bold text-gray-800 mb-2">💬 ข้อเสนอแนะ:</h4>
                <p className="text-gray-700 whitespace-pre-line">{analysis.feedback}</p>
            </div>

            {analysis.issues && analysis.issues.length > 0 && (
                <div className="bg-white rounded-lg p-4 mb-4">
                    <h4 className="font-bold text-gray-800 mb-3">🔍 ประเด็นที่พบ:</h4>
                    <ul className="space-y-2">
                        {analysis.issues.map((issue, idx) => (
                            <li key={idx} className="flex items-start space-x-2 text-sm bg-red-50 p-3 rounded border-l-4 border-red-400">
                                <span className="text-red-500 font-bold">⚠</span>
                                <div className="flex-1">
                                    {issue.line && (
                                        <div className="text-xs text-red-600 font-mono mb-1">บรรทัดที่ {issue.line}</div>
                                    )}
                                    <span className="text-gray-700">{issue.message || issue}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {analysis.suggestion && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-bold text-gray-800 mb-2">💡 คำแนะนำสำหรับการพัฒนา:</h4>
                    <p className="text-gray-700">{analysis.suggestion}</p>
                </div>
            )}
        </div>
    );
};

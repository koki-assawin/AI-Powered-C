// js/components/BarChart.js - Generic reusable bar chart wrapper (Chart.js)
// Props: { labels: string[], datasets: object[], options?: object }
// Unlike RadarChart.js this does not compute its own Chart config — the
// caller supplies the full Chart.js dataset shape, so this works for both
// QuickPoll's single-round and future two-round comparison bar charts.

const BarChart = ({ labels, datasets, options }) => {
    const canvasRef = React.useRef(null);

    React.useEffect(() => {
        if (!canvasRef.current || !window.Chart) return;
        const existing = Chart.getChart(canvasRef.current);
        if (existing) existing.destroy();

        new Chart(canvasRef.current, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: (datasets || []).length > 1 } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                ...options,
            },
        });

        return () => {
            const c = Chart.getChart(canvasRef.current);
            if (c) c.destroy();
        };
    }, [labels, datasets, options]);

    return <canvas ref={canvasRef}></canvas>;
};

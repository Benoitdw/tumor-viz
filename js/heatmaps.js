// Heatmaps for parameter combinations

let heatmapCharts = {};

/**
 * Create pivot table for heatmap
 * @param {Array} data - Resume data
 * @param {string} param1 - First parameter (Y axis)
 * @param {string} param2 - Second parameter (X axis)
 * @param {string} metric - Metric to aggregate (rsquare or slope)
 * @returns {Object} Pivot data { xLabels, yLabels, values }
 */
function createPivotTable(data, param1, param2, metric) {
    // Filter for not neutral only
    const notNeutralData = filterByNeutral(data, false);

    // Get unique values for each parameter (ascending order)
    const xValues = getUniqueValues(notNeutralData, param2);
    const yValues = getUniqueValues(notNeutralData, param1);

    // Create pivot matrix
    const values = [];
    for (let i = 0; i < yValues.length; i++) {
        const row = [];
        for (let j = 0; j < xValues.length; j++) {
            // Find all data points matching this combination
            const matches = notNeutralData.filter(
                d => d[param1] === yValues[i] && d[param2] === xValues[j]
            );

            if (matches.length > 0) {
                // Calculate mean
                const sum = matches.reduce((s, m) => s + m[metric], 0);
                row.push(sum / matches.length);
            } else {
                row.push(null);
            }
        }
        values.push(row);
    }

    return {
        xLabels: xValues.map(v => v.toFixed(4)),
        yLabels: yValues.map(v => v.toFixed(4)),
        xValues: xValues,
        yValues: yValues,
        values: values
    };
}

/**
 * Render a single heatmap
 * @param {string} canvasId - Canvas element ID
 * @param {string} param1 - First parameter (Y axis)
 * @param {string} param2 - Second parameter (X axis)
 * @param {string} metric - Metric (rsquare or slope)
 * @param {Object} pivotData - Pivot table data
 */
function renderHeatmap(canvasId, param1, param2, metric, pivotData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Destroy existing chart
    if (heatmapCharts[canvasId]) {
        heatmapCharts[canvasId].destroy();
    }

    // Flatten data for Chart.js matrix
    // Since we use reverse: true on Y axis, we need to map the data correctly
    const matrixData = [];
    console.log(pivotData)
const yLen = pivotData.yLabels.length;
for (let i = 0; i < yLen; i++) {
    for (let j = 0; j < pivotData.xLabels.length; j++) {
        const value = pivotData.values[i][j];
        if (value !== null) {
            matrixData.push({
                // Utilise directement le label (string) pour l'axe X
                x: pivotData.xLabels[j].toString(),
                // Utilise directement le label (string) pour l'axe Y
                y: pivotData.yLabels[i].toString(),
                v: value,
                xValue: pivotData.xValues[j],
                yValue: pivotData.yValues[i]
            });
        }
    }
}
    console.log(matrixData)

    // Find min/max for color scale
    const allValues = matrixData.map(d => d.v);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

        heatmapCharts[canvasId] = new Chart(ctx, {
            type: 'matrix',
            data: {
                datasets: [{
                    label: `${metric} for ${param1} vs ${param2}`,
                    data: matrixData,
                    backgroundColor: function(context) {
                        const item = context.dataset.data[context.dataIndex];
                        if (!item) return 'transparent';
                        return getGreenColor(item.v, minValue, maxValue);
                    },
            width: ({chart}) => chart.chartArea ? chart.chartArea.width / 3 - 1 : 0,
            height: ({chart}) => chart.chartArea ? chart.chartArea.height / 4 - 1 : 0,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.5)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${param1} vs ${param2}`,
                        font: { size: 14 }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function() {
                                return '';
                            },
                            label: function(context) {
                                const d = context.raw;
                                return [
                                    `${param1}: ${d.yValue}`,
                                    `${param2}: ${d.xValue}`,
                                    `${metric}: ${d.v.toFixed(4)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        labels: pivotData.xLabels,
                        title: {
                            display: true,
                            text: param2
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        type: 'category',
                        labels: pivotData.yLabels,
                        title: {
                            display: true,
                            text: param1
                        },
                        offset: true,
                        reverse: true  // Highest values at top
                    }
                },
                onClick: (event, elements) => handleHeatmapClick(event, elements, param1, param2, heatmapCharts[canvasId])
            }
        });
}

/**
 * Get green color based on value
 * @param {number} value - Value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {string} RGBA color
 */
function getGreenColor(value, min, max) {
    // Normalize value between 0 and 1
    const normalized = (value - min) / (max - min);

    // Green color gradient (light to dark)
    const lightness = 90 - (normalized * 60); // 90% to 30%
    return `hsl(120, 60%, ${lightness}%)`;
}

/**
 * Handle click on heatmap cell
 * @param {Event} event - Click event
 * @param {Array} elements - Clicked elements
 * @param {string} param1 - First parameter
 * @param {string} param2 - Second parameter
 * @param {Object} chart - Chart instance
 */
function handleHeatmapClick(event, elements, param1, param2, chart) {
    if (elements.length === 0) return;

    const element = elements[0];
    const dataIndex = element.index;
    const data = chart.data.datasets[0].data[dataIndex];

    // Add both filters
    addFilter(param1, data.yValue);
    addFilter(param2, data.xValue);
    updateFilterDisplay();

    // Visual feedback
    console.log(`Filters added: ${param1}=${data.yValue}, ${param2}=${data.xValue}`);
}

/**
 * Render all heatmaps
 * @param {Array} data - Resume data
 */
function renderHeatmaps(data) {
    const paramPairs = [
        ['p_death', 'mutation_rate'],
        ['p_death', 'p_driver'],
        ['mutation_rate', 'p_driver']
    ];

    // Map parameter names to short IDs
    const paramToId = {
        'p_death': 'pdeath',
        'mutation_rate': 'mutrate',
        'p_driver': 'pdriver'
    };

    // Render rsquare heatmaps
    paramPairs.forEach(([param1, param2]) => {
        const canvasId = `heatmap-rsquare-${paramToId[param1]}-${paramToId[param2]}`;
        const pivotData = createPivotTable(data, param1, param2, 'rsquare');
        renderHeatmap(canvasId, param1, param2, 'rsquare', pivotData);
    });

    // Render slope heatmaps
    paramPairs.forEach(([param1, param2]) => {
        const canvasId = `heatmap-slope-${paramToId[param1]}-${paramToId[param2]}`;
        const pivotData = createPivotTable(data, param1, param2, 'slope');
        renderHeatmap(canvasId, param1, param2, 'slope', pivotData);
    });
}

/**
 * Destroy all heatmap charts
 */
function destroyHeatmaps() {
    Object.values(heatmapCharts).forEach(chart => {
        if (chart) chart.destroy();
    });
    heatmapCharts = {};
}
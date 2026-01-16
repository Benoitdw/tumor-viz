// Parameter evolution plots with error bars - one plot per parameter

let parameterCharts = {};

/**
 * Aggregate data by parameter
 * @param {Array} data - Resume data
 * @param {string} parameter - Parameter name
 * @param {string} metric - Metric to aggregate (rsquare or slope)
 * @returns {Object} Aggregated data with mean and std
 */
function aggregateByParameter(data, parameter, metric) {
    const uniqueValues = getUniqueValues(data, parameter);

    const neutralData = filterByNeutral(data, true);
    const notNeutralData = filterByNeutral(data, false);

    function calculateStats(filteredData, paramValue) {
        const values = filteredData
            .filter(row => row[parameter] === paramValue)
            .map(row => row[metric]);

        if (values.length === 0) {
            return { mean: 0, std: 0 };
        }

        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);

        return { mean, std };
    }

    return {
        values: uniqueValues,
        neutral: uniqueValues.map(v => calculateStats(neutralData, v)),
        not_neutral: uniqueValues.map(v => calculateStats(notNeutralData, v))
    };
}

/**
 * Create dataset for Chart.js with error bars
 * @param {Array} xValues - X axis values
 * @param {Array} stats - Array of {mean, std} objects
 * @param {string} label - Dataset label
 * @param {string} color - Color
 * @param {boolean} isDotted - Use dotted line
 * @returns {Object} Chart.js dataset
 */
function createErrorBarDataset(xValues, stats, label, color, isDotted = false) {
    return {
        label: label,
        data: xValues.map((x, i) => ({
            x: x,
            y: stats[i].mean,
            yMin: stats[i].mean - stats[i].std,
            yMax: stats[i].mean + stats[i].std
        })),
        borderColor: color,
        backgroundColor: color,
        pointBackgroundColor: color,
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        borderDash: isDotted ? [5, 5] : [],
        tension: 0.1
    };
}

/**
 * Render individual parameter evolution plot
 * @param {Array} data - Resume data
 * @param {string} parameter - Parameter name (p_death, mutation_rate, p_driver)
 * @param {string} canvasId - Canvas element ID
 */
function renderParameterPlot(data, parameter, canvasId) {
    // Aggregate data for R² and Slope
    const rsquareAgg = aggregateByParameter(data, parameter, 'rsquare');
    const slopeAgg = aggregateByParameter(data, parameter, 'slope');

    // Create datasets
    const datasets = [
        // R² - not neutral
        createErrorBarDataset(
            rsquareAgg.values,
            rsquareAgg.not_neutral,
            'R² (not neutral)',
            'rgba(34, 139, 34, 0.8)', // Forest green
            false
        ),
        // R² - neutral
        createErrorBarDataset(
            rsquareAgg.values,
            rsquareAgg.neutral,
            'R² (neutral)',
            'rgba(128, 128, 128, 0.6)', // Grey
            true
        ),
        // Slope - not neutral (hidden by default)
        {
            ...createErrorBarDataset(
                slopeAgg.values,
                slopeAgg.not_neutral,
                'Slope (not neutral)',
                'rgba(0, 100, 0, 0.8)', // Dark green
                false
            ),
            hidden: true
        },
        // Slope - neutral (hidden by default)
        {
            ...createErrorBarDataset(
                slopeAgg.values,
                slopeAgg.neutral,
                'Slope (neutral)',
                'rgba(100, 100, 100, 0.6)', // Light grey
                true
            ),
            hidden: true
        }
    ];

    // Get parameter display name
    const paramDisplayNames = {
        'p_death': 'P Death',
        'mutation_rate': 'Mutation Rate',
        'p_driver': 'P Driver'
    };

    const ctx = document.getElementById(canvasId);
    if (parameterCharts[canvasId]) {
        parameterCharts[canvasId].destroy();
    }

    parameterCharts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: paramDisplayNames[parameter] || parameter,
                    font: { size: 14, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: { size: 10 },
                        boxWidth: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            const metric = context.dataset.label.startsWith('R²') ? 'R²' : 'Slope';
                            return [
                                `${context.dataset.label}`,
                                `${paramDisplayNames[parameter]}: ${point.x}`,
                                `${metric}: ${point.y.toFixed(4)} ± ${(point.yMax - point.y).toFixed(4)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: paramDisplayNames[parameter],
                        font: { size: 11 }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Value',
                        font: { size: 11 }
                    }
                }
            },
            onClick: (event, elements) => handleParameterClick(event, elements, parameter, parameterCharts[canvasId])
        },
        plugins: [{
            id: 'errorBars',
            afterDatasetsDraw: (chart) => drawErrorBars(chart)
        }]
    });
}

/**
 * Draw error bars on chart
 * @param {Object} chart - Chart.js instance
 */
function drawErrorBars(chart) {
    const ctx = chart.ctx;

    chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta.hidden) {
            meta.data.forEach((point, index) => {
                const data = dataset.data[index];
                if (data.yMin !== undefined && data.yMax !== undefined) {
                    const x = point.x;
                    const yMin = chart.scales.y.getPixelForValue(data.yMin);
                    const yMax = chart.scales.y.getPixelForValue(data.yMax);

                    ctx.save();
                    ctx.strokeStyle = dataset.borderColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x, yMin);
                    ctx.lineTo(x, yMax);
                    ctx.stroke();

                    // Cap lines
                    const capSize = 5;
                    ctx.beginPath();
                    ctx.moveTo(x - capSize, yMin);
                    ctx.lineTo(x + capSize, yMin);
                    ctx.moveTo(x - capSize, yMax);
                    ctx.lineTo(x + capSize, yMax);
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }
    });
}

/**
 * Handle click on parameter evolution plot
 * @param {Event} event - Click event
 * @param {Array} elements - Clicked elements
 * @param {string} parameter - Parameter name
 * @param {Object} chart - Chart instance
 */
function handleParameterClick(event, elements, parameter, chart) {
    if (elements.length === 0) return;

    const element = elements[0];
    const datasetIndex = element.datasetIndex;
    const index = element.index;
    const dataset = chart.data.datasets[datasetIndex];
    const point = dataset.data[index];

    const value = point.x;

    // Add filter
    addFilter(parameter, value);
    updateFilterDisplay();

    // Visual feedback
    console.log(`Filter added: ${parameter} = ${value}`);
}

/**
 * Render parameter evolution plots
 * @param {Array} data - Resume data
 */
function renderParameterEvolution(data) {
    const parameters = [
        { name: 'p_death', canvasId: 'paramEvolution-pdeath' },
        { name: 'mutation_rate', canvasId: 'paramEvolution-mutationrate' },
        { name: 'p_driver', canvasId: 'paramEvolution-pdriver' }
    ];

    parameters.forEach(({ name, canvasId }) => {
        renderParameterPlot(data, name, canvasId);
    });
}

/**
 * Destroy charts
 */
function destroyParameterCharts() {
    Object.values(parameterCharts).forEach(chart => {
        if (chart) chart.destroy();
    });
    parameterCharts = {};
}
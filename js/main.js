// Main page - List all simulations grouped by configuration
const RESULTS_PATH = './results';

let allSimulations = []; // Store all simulations data
let configGroups = {}; // Store simulations grouped by config ID
let visibilityState = {}; // Track which simulations are visible
let expandedConfigs = {}; // Track which config rows are expanded
let currentChart = null; // Store chart instance

async function loadSimulations() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');
    const table = document.getElementById('simulationsTable');
    const tbody = table.querySelector('tbody');

    try {
        // Get list of simulation folders
        const response = await fetch(`${RESULTS_PATH}/simulations.json`);

        if (!response.ok) {
            throw new Error('simulations.json not found. Please create this file.');
        }

        const simulationIds = await response.json();

        // Load each simulation's data including sequencing
        const simulations = await Promise.all(
            simulationIds.map(async (id) => {
                try {
                    const [simResponse, seqResponse] = await Promise.all([
                        fetch(`${RESULTS_PATH}/${id}/simulation.json`),
                        fetch(`${RESULTS_PATH}/${id}/sequencing.json`)
                    ]);

                    const simData = await simResponse.json();
                    const seqData = await seqResponse.json();

                    return { id, simData, seqData };
                } catch (err) {
                    console.error(`Failed to load simulation ${id}:`, err);
                    return null;
                }
            })
        );

        // Filter out failed loads
        const validSimulations = simulations.filter(s => s !== null);

        if (validSimulations.length === 0) {
            throw new Error('No valid simulations found');
        }

        // Store simulations globally
        allSimulations = validSimulations;

        // Group simulations by config ID (format: configId_simNumber)
        configGroups = {};
        validSimulations.forEach(({ id, simData, seqData }) => {
            const configId = id.split('_')[0];
            if (!configGroups[configId]) {
                configGroups[configId] = [];
            }
            configGroups[configId].push({ id, simData, seqData });
        });

        // Load config data for each group
        await Promise.all(
            Object.keys(configGroups).map(async (configId) => {
                try {
                    const configResponse = await fetch(`${RESULTS_PATH}/${configId}/config.json`);
                    const configData = await configResponse.json();
                    configGroups[configId].configData = configData;
                } catch (err) {
                    console.error(`Failed to load config for ${configId}:`, err);
                    configGroups[configId].configData = null;
                }
            })
        );

        // Initialize visibility state (all visible by default)
        validSimulations.forEach(({ id }) => {
            visibilityState[id] = true;
        });

        // Initialize expanded state (all collapsed by default)
        Object.keys(configGroups).forEach(configId => {
            expandedConfigs[configId] = false;
        });

        // Populate table
        renderSimulationsTable();

        // Render regression plot with all simulations
        renderOverviewRegressionPlot();

        loading.classList.add('d-none');
        content.classList.remove('d-none');

    } catch (err) {
        console.error('Error loading simulations:', err);
        loading.classList.add('d-none');
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('d-none');
    }
}

// Render simulations table with hierarchical structure
function renderSimulationsTable() {
    const tbody = document.querySelector('#simulationsTable tbody');
    let rows = [];

    // Sort config IDs for consistent display
    const sortedConfigIds = Object.keys(configGroups).sort();

    sortedConfigIds.forEach(configId => {
        const group = configGroups[configId];
        const configData = group.configData || {};
        const isExpanded = expandedConfigs[configId];

        // Create config row
        const configRow = `
            <tr class="config-row" style="background-color: #f8f9fa; cursor: pointer;">
                <td class="text-center">
                    <span onclick="toggleConfigExpansion('${configId}'); event.stopPropagation();">
                        ${isExpanded ? '▼' : '▶'}
                    </span>
                </td>
                <td colspan="5" onclick="window.location.href='config.html?id=${configId}'">
                    <strong>Config: ${configId}</strong>
                    <span class="text-muted">(${group.length} simulations)</span>
                    <br>
                    <small class="text-muted">
                        N_max: ${configData.N_max?.toLocaleString() || 'N/A'},
                        M: ${configData.M?.toLocaleString() || 'N/A'},
                        mutation_rate: ${configData.mutation_rate?.toFixed(2) || 'N/A'},
                        P_death: ${configData.P_death?.toFixed(3) || 'N/A'}
                    </small>
                </td>
            </tr>
        `;
        rows.push(configRow);

        // Add simulation rows if expanded
        if (isExpanded) {
            group.forEach(({ id, simData }) => {
                const simRow = `
                    <tr class="simulation-row" style="background-color: #ffffff;">
                        <td class="text-center" style="padding-left: 30px;">
                            <span class="visibility-toggle ${visibilityState[id] ? '' : 'hidden'}"
                                  data-sim-id="${id}"
                                  onclick="toggleSimulationVisibility('${id}')"
                                  title="${visibilityState[id] ? 'Click to hide' : 'Click to show'}">
                                ${visibilityState[id] ? '👁️' : '👁️‍🗨️'}
                            </span>
                        </td>
                        <td><strong>${id}</strong></td>
                        <td>${simData.n_event?.toLocaleString() || 'N/A'}</td>
                        <td>${simData.config?.N_max?.toLocaleString() || 'N/A'}</td>
                        <td>${simData.clones?.length || 'N/A'}</td>
                        <td>
                            <a href="simulation.html?id=${id}" class="btn btn-primary btn-sm">View Details</a>
                        </td>
                    </tr>
                `;
                rows.push(simRow);
            });
        }
    });

    tbody.innerHTML = rows.join('');
}

// Toggle config expansion
function toggleConfigExpansion(configId) {
    expandedConfigs[configId] = !expandedConfigs[configId];
    renderSimulationsTable();
}

// Toggle simulation visibility
function toggleSimulationVisibility(simId) {
    visibilityState[simId] = !visibilityState[simId];
    renderSimulationsTable();
    renderOverviewRegressionPlot();
}

// Calculate linear regression
function calculateLinearRegression(dataPoints) {
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = dataPoints.reduce((sum, p) => sum + p.y * p.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const ssResidual = dataPoints.reduce((sum, p) => {
        const yPred = slope * p.x + intercept;
        return sum + Math.pow(p.y - yPred, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    // Calculate standard error for confidence interval
    const se = Math.sqrt(ssResidual / (n - 2));
    const xMean = sumX / n;
    const sxx = sumX2 - (sumX * sumX) / n;

    return { slope, intercept, r2, se, xMean, sxx, n };
}

// Render regression plot for all simulations
function renderOverviewRegressionPlot() {
    // Destroy previous chart if it exists
    if (currentChart) {
        currentChart.destroy();
    }

    const ctx = document.getElementById('overviewRegressionPlot');

    // Filter only visible simulations
    const visibleSimulations = allSimulations.filter(({ id }) => visibilityState[id]);

    // Generate a color for each simulation
    const colors = [
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(199, 199, 199, 0.6)',
        'rgba(83, 102, 255, 0.6)',
        'rgba(255, 99, 255, 0.6)',
        'rgba(99, 255, 132, 0.6)'
    ];

    if (visibleSimulations.length === 0) {
        ctx.parentElement.innerHTML = '<p class="text-muted text-center">No simulations selected. Click the eye icon in the table to show simulations.</p>';
        return;
    }

    // Collect all data points for global regression
    const allDataPoints = [];

    // Create datasets - one per simulation (only for visible ones)
    const datasets = visibleSimulations.map(({ id, simData, seqData }, index) => {
        // Create a map of clones by ID
        const cloneMap = new Map();
        simData.clones.forEach(clone => {
            cloneMap.set(clone.id, clone);
        });

        // Extract data points from sequencing samples
        const dataPoints = Object.entries(seqData).map(([seqId, data]) => {
            const mrcaClone = cloneMap.get(data.mrca);
            if (!mrcaClone) return null;

            return {
                x: mrcaClone.fitness,
                y: mrcaClone.tmb,
                label: `Sim ${id}, Seq #${seqId}`
            };
        }).filter(point => point !== null);

        allDataPoints.push(...dataPoints);

        return {
            label: `Simulation ${id}`,
            data: dataPoints,
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length].replace('0.6', '1'),
            borderWidth: 1,
            pointRadius: 6,
            pointHoverRadius: 8,
            order: 3
        };
    });

    // Calculate global regression across all simulations
    const regression = calculateLinearRegression(allDataPoints);
    const xMin = Math.min(...allDataPoints.map(p => p.x));
    const xMax = Math.max(...allDataPoints.map(p => p.x));

    // Generate regression line points
    const regressionLine = [
        { x: xMin, y: regression.slope * xMin + regression.intercept },
        { x: xMax, y: regression.slope * xMax + regression.intercept }
    ];

    // Generate confidence interval (95%)
    const tValue = 1.96;
    const confidenceUpper = [];
    const confidenceLower = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
        const x = xMin + (xMax - xMin) * i / steps;
        const yPred = regression.slope * x + regression.intercept;
        const margin = tValue * regression.se * Math.sqrt(
            1 / regression.n + Math.pow(x - regression.xMean, 2) / regression.sxx
        );
        confidenceUpper.push({ x, y: yPred + margin });
        confidenceLower.push({ x, y: yPred - margin });
    }

    // Add regression line and confidence interval to datasets
    datasets.push(
        {
            label: `Regression Line (R² = ${regression.r2.toFixed(3)})`,
            data: regressionLine,
            type: 'line',
            borderColor: 'rgba(0, 0, 0, 0.8)',
            borderWidth: 3,
            pointRadius: 0,
            fill: false,
            order: 2
        },
        {
            label: '95% Confidence Interval',
            data: confidenceUpper.concat(confidenceLower.reverse()),
            type: 'line',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderColor: 'rgba(0, 0, 0, 0.2)',
            borderWidth: 1,
            pointRadius: 0,
            fill: true,
            order: 1
        }
    );

    currentChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'MRCA Fitness'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'MRCA TMB (Tumor Mutational Burden)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            if (point.label) {
                                return [
                                    point.label,
                                    `Fitness: ${point.x.toFixed(3)}`,
                                    `TMB: ${point.y}`
                                ];
                            }
                            return `y = ${point.y.toFixed(2)}`;
                        }
                    }
                },
                legend: {
                    display: false  // Disable legend click to prevent toggling
                },
                subtitle: {
                    display: true,
                    text: `y = ${regression.slope.toFixed(3)}x + ${regression.intercept.toFixed(3)}`,
                    position: 'bottom',
                    font: {
                        size: 12,
                        style: 'italic'
                    }
                }
            },
            interaction: {
                mode: 'point'
            }
        }
    });
}

// Load simulations when page loads
document.addEventListener('DOMContentLoaded', loadSimulations);

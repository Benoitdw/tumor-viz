// Simulation detail page
const RESULTS_PATH = './results';

let simulationData = null;
let sequencingData = null;
let configData = null;
let showAllClones = false; // Filter state for phylogenetic tree
let currentSimulationId = null; // Store current simulation ID for sorting

// Get simulation ID from URL
function getSimulationId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Load simulation data
async function loadSimulationData(simulationId) {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');
    try {
        // Parse simulation ID to get configId and simNum
        // Expected format: configId_simNum
        const parts = simulationId.split('_');
        if (parts.length < 2) {
            throw new Error('Invalid simulation ID format. Expected: configId_simNum');
        }
        const configId = parts.slice(0, -1).join('_'); // Handle configIds that may contain underscores
        const simNum = parts[parts.length - 1];

        // Load simulation, sequencing, and config data
        const [simResponse, seqResponse, configResponse] = await Promise.all([
            fetch(`${RESULTS_PATH}/${configId}/${simNum}/simulation.json`),
            fetch(`${RESULTS_PATH}/${configId}/${simNum}/sequencing.json`),
            fetch(`${RESULTS_PATH}/${configId}/config.json`)
        ]);

        if (!simResponse.ok || !seqResponse.ok || !configResponse.ok) {
            throw new Error('Failed to load simulation data');
        }

        simulationData = await simResponse.json();
        sequencingData = await seqResponse.json();
        configData = await configResponse.json();

        // Update page title
        document.getElementById('simulationTitle').textContent = `Simulation: ${simulationId}`;
        currentSimulationId = simulationId;

        // Render all components
        renderConfig();
        renderCloneProportionChart();
        renderPhylogeneticTree();
        renderRegressionPlot();
        renderSequencingList(simulationId);

        // Setup toggle button for phylogenetic tree filter
        document.getElementById('toggleFilterBtn').addEventListener('click', () => {
            showAllClones = !showAllClones;
            const btn = document.getElementById('toggleFilterBtn');
            btn.textContent = showAllClones ? 'Hide Small Clones (<100 cells)' : 'Show All Clones';
            renderPhylogeneticTree();
        });

        // Setup sort buttons for sequencing samples
        document.getElementById('sortByNumber').addEventListener('click', () => {
            sortSequencingSamples('number');
        });
        document.getElementById('sortByClones').addEventListener('click', () => {
            sortSequencingSamples('clones');
        });
        document.getElementById('sortBySize').addEventListener('click', () => {
            sortSequencingSamples('size');
        });

        loading.classList.add('d-none');
        content.classList.remove('d-none');

    } catch (err) {
        console.error('Error loading simulation:', err);
        loading.classList.add('d-none');
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('d-none');
    }
}

// Render configuration info
function renderConfig() {
    const configInfo = document.getElementById('configInfo');

    configInfo.innerHTML = `
        <div class="col-md-3">
            <strong>N Events:</strong><br>${simulationData.n_event?.toLocaleString() || 'N/A'}
        </div>
        <div class="col-md-3">
            <strong>N Max:</strong><br>${configData.N_max?.toLocaleString() || 'N/A'}
        </div>
        <div class="col-md-3">
            <strong>Total Clones:</strong><br>${simulationData.clones?.length || 'N/A'}
        </div>
        <div class="col-md-3">
            <strong>Mutation Rate:</strong><br>${configData.mutation_rate || 'N/A'}
        </div>
        <div class="col-md-3 mt-3">
            <strong>P Death:</strong><br>${configData.P_death || 'N/A'}
        </div>
        <div class="col-md-3 mt-3">
            <strong>Sequencing Depth:</strong><br>${configData.depth_sequencing || 'N/A'}
        </div>
        <div class="col-md-3 mt-3">
            <strong>N Sequencing:</strong><br>${configData.n_sequencing || 'N/A'}
        </div>
        <div class="col-md-3 mt-3">
            <strong>Picking Strategy:</strong><br>${configData.picking || 'N/A'}
        </div>
    `;
}

// Render clone proportion chart (top 10)
function renderCloneProportionChart() {
    const ctx = document.getElementById('cloneProportionChart');
    const cloneProp = simulationData.clone_proportion;

    // Sort by proportion and get top 10
    const sortedClones = Object.entries(cloneProp)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sortedClones.map(([id, _]) => `Clone ${id}`);
    const data = sortedClones.map(([_, prop]) => (prop * 100).toFixed(2));

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Proportion (%)',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Proportion (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Render phylogenetic tree using D3.js
function renderPhylogeneticTree() {
    const container = document.getElementById('phylogeneticTree');
    const allClones = simulationData.clones;

    // Filter clones based on toggle state
    const clones = showAllClones ? allClones : allClones.filter(c => c.size >= 100);

    // Build tree structure with filtered clones
    const treeData = buildTreeStructure(clones);

    if (!treeData) {
        container.innerHTML = '<p class="text-muted">No clones with 100+ cells found</p>';
        return;
    }

    // Set dimensions
    const width = container.clientWidth || 1000;
    const height = Math.max(600, clones.length * 10);

    // Create SVG
    const svg = d3.select('#phylogeneticTree')
        .html('') // Clear any existing content
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', 'translate(40,20)');

    // Create tree layout
    const treeLayout = d3.tree()
        .size([height - 40, width - 200]);

    const root = d3.hierarchy(treeData);
    treeLayout(root);

    // Calculate node sizes based on clone size
    const maxSize = d3.max(clones, d => d.size);
    const radiusScale = d3.scaleSqrt()
        .domain([100, maxSize])
        .range([3, 20]);

    // Create tooltip div
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '10px')
        .style('border-radius', '5px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '1000');

    // Draw links
    g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));

    // Draw nodes
    const nodes = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`);

    nodes.append('circle')
        .attr('r', d => radiusScale(d.data.size))
        .style('fill', d => d.data.dead_lineage ? '#ff6b6b' : '#4ecdc4')
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .style('stroke', '#333')
                .style('stroke-width', '3px');

            tooltip.html(`
                <strong>Clone ${d.data.id}</strong><br/>
                <strong>Size:</strong> ${d.data.size.toLocaleString()} cells<br/>
                <strong>Fitness:</strong> ${d.data.fitness.toFixed(3)}<br/>
                <strong>TMB:</strong> ${d.data.tmb}<br/>
                <strong>Ancestor:</strong> ${d.data.ancestor !== null ? d.data.ancestor : 'None (root)'}<br/>
                <strong>Status:</strong> ${d.data.dead_lineage ? 'Dead lineage' : 'Active'}
            `)
            .style('visibility', 'visible');
        })
        .on('mousemove', function(event) {
            tooltip
                .style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .style('stroke', null)
                .style('stroke-width', null);
            tooltip.style('visibility', 'hidden');
        });

    nodes.append('text')
        .attr('dx', d => radiusScale(d.data.size) + 5)
        .attr('dy', 4)
        .text(d => `Clone ${d.data.id} (${d.data.size.toLocaleString()})`);

    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 150}, 20)`);

    legend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .style('font-weight', 'bold')
        .text('Legend:');

    legend.append('circle')
        .attr('cx', 10)
        .attr('cy', 20)
        .attr('r', 6)
        .style('fill', '#4ecdc4');
    legend.append('text')
        .attr('x', 20)
        .attr('y', 25)
        .text('Active lineage');

    legend.append('circle')
        .attr('cx', 10)
        .attr('cy', 40)
        .attr('r', 6)
        .style('fill', '#ff6b6b');
    legend.append('text')
        .attr('x', 20)
        .attr('y', 45)
        .text('Dead lineage');

    if (!showAllClones) {
        legend.append('text')
            .attr('x', 0)
            .attr('y', 70)
            .style('font-size', '11px')
            .style('font-style', 'italic')
            .text('(Clones < 100 cells hidden)');
    }
}

// Build tree structure from clones array
function buildTreeStructure(clones) {
    // Create a map of clones by id
    const cloneMap = new Map();
    clones.forEach(clone => {
        cloneMap.set(clone.id, { ...clone, children: [] });
    });

    // Find root (clone with ancestor === null)
    let root = null;

    // Build parent-child relationships
    clones.forEach(clone => {
        const node = cloneMap.get(clone.id);
        if (clone.ancestor === null) {
            root = node;
        } else {
            const parent = cloneMap.get(clone.ancestor);
            if (parent) {
                parent.children.push(node);
            }
        }
    });

    return root;
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

// Render regression plot: MRCA TMB vs MRCA Fitness
function renderRegressionPlot() {
    const ctx = document.getElementById('regressionPlot');
    const clones = simulationData.clones;

    // Create a map of clones by ID for quick lookup
    const cloneMap = new Map();
    clones.forEach(clone => {
        cloneMap.set(clone.id, clone);
    });

    // Extract data points from sequencing samples
    const dataPoints = Object.entries(sequencingData).map(([seqId, data]) => {
        const mrcaClone = cloneMap.get(data.mrca);
        if (!mrcaClone) return null;

        return {
            x: mrcaClone.fitness,
            y: mrcaClone.tmb,
            label: `Seq #${seqId}`
        };
    }).filter(point => point !== null);

    if (dataPoints.length === 0) {
        document.getElementById('regressionPlot').parentElement.innerHTML =
            '<p class="text-muted">No data available for regression plot</p>';
        return;
    }

    // Calculate regression
    const regression = calculateLinearRegression(dataPoints);
    const xMin = Math.min(...dataPoints.map(p => p.x));
    const xMax = Math.max(...dataPoints.map(p => p.x));

    // Generate regression line points
    const regressionLine = [
        { x: xMin, y: regression.slope * xMin + regression.intercept },
        { x: xMax, y: regression.slope * xMax + regression.intercept }
    ];

    // Generate confidence interval (95%)
    const tValue = 1.96; // Approximation for large samples
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

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Sequencing Samples',
                    data: dataPoints,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    order: 3
                },
                {
                    label: `Regression Line (R² = ${regression.r2.toFixed(3)})`,
                    data: regressionLine,
                    type: 'line',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    order: 2
                },
                {
                    label: '95% Confidence Interval',
                    data: confidenceUpper.concat(confidenceLower.reverse()),
                    type: 'line',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderColor: 'rgba(255, 99, 132, 0.3)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: true,
                    order: 1
                }
            ]
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
                    display: true
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
            }
        }
    });
}

// Render sequencing list
function renderSequencingList(simulationId, sortedSamples = null) {
    const sequencingList = document.getElementById('sequencingList');
    const samples = sortedSamples || Object.entries(sequencingData);

    sequencingList.innerHTML = samples.map(([id, data]) => `
        <div class="col-md-4 mb-3">
            <div class="card sequencing-card h-100" onclick="window.location.href='sequencing.html?simId=${simulationId}&seqId=${id}'">
                <div class="card-body">
                    <h5 class="card-title">Sequencing #${id}</h5>
                    <p class="card-text">
                        <strong>MRCA:</strong> Clone ${data.mrca}<br>
                        <strong>Size:</strong> ${data.size.toLocaleString()}<br>
                        <strong>Clones:</strong> ${Object.keys(data.clone_proportion).length}
                    </p>
                </div>
            </div>
        </div>
    `).join('');
}

// Sort sequencing samples
function sortSequencingSamples(sortBy) {
    const samples = Object.entries(sequencingData);

    let sortedSamples;
    switch(sortBy) {
        case 'number':
            // Sort by sequencing ID (number)
            sortedSamples = samples.sort((a, b) => {
                const numA = parseInt(a[0]);
                const numB = parseInt(b[0]);
                return numA - numB;
            });
            break;
        case 'clones':
            // Sort by number of clones (descending)
            sortedSamples = samples.sort((a, b) => {
                const clonesA = Object.keys(a[1].clone_proportion).length;
                const clonesB = Object.keys(b[1].clone_proportion).length;
                return clonesB - clonesA;
            });
            break;
        case 'size':
            // Sort by size (descending)
            sortedSamples = samples.sort((a, b) => {
                return b[1].size - a[1].size;
            });
            break;
        default:
            sortedSamples = samples;
    }

    // Update button states
    document.querySelectorAll('#sortByNumber, #sortByClones, #sortBySize').forEach(btn => {
        btn.classList.remove('active');
    });

    if (sortBy === 'number') {
        document.getElementById('sortByNumber').classList.add('active');
    } else if (sortBy === 'clones') {
        document.getElementById('sortByClones').classList.add('active');
    } else if (sortBy === 'size') {
        document.getElementById('sortBySize').classList.add('active');
    }

    renderSequencingList(currentSimulationId, sortedSamples);
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
    const simulationId = getSimulationId();
    if (!simulationId) {
        document.getElementById('error').textContent = 'No simulation ID provided';
        document.getElementById('error').classList.remove('d-none');
        document.getElementById('loading').classList.add('d-none');
        return;
    }
    loadSimulationData(simulationId);
});

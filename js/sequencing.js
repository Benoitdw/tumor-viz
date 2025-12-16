// Sequencing detail page
const RESULTS_PATH = './results';

let sequencingData = null;
let simulationData = null;

// Get parameters from URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        simId: params.get('simId'),
        seqId: params.get('seqId')
    };
}

// Load sequencing data
async function loadSequencingData(simId, seqId) {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');

    try {
        // Parse simulation ID to get configId and simNum
        // Expected format: configId_simNum
        const parts = simId.split('_');
        if (parts.length < 2) {
            throw new Error('Invalid simulation ID format. Expected: configId_simNum');
        }
        const configId = parts.slice(0, -1).join('_'); // Handle configIds that may contain underscores
        const simNum = parts[parts.length - 1];

        // Load both sequencing and simulation data
        const [seqResponse, simResponse] = await Promise.all([
            fetch(`${RESULTS_PATH}/${configId}/${simNum}/sequencing.json`),
            fetch(`${RESULTS_PATH}/${configId}/${simNum}/simulation.json`)
        ]);

        if (!seqResponse.ok || !simResponse.ok) {
            throw new Error('Failed to load data');
        }

        const allSequencing = await seqResponse.json();
        simulationData = await simResponse.json();
        sequencingData = allSequencing[seqId];

        if (!sequencingData) {
            throw new Error(`Sequencing sample ${seqId} not found`);
        }

        // Update page title
        document.getElementById('sequencingTitle').textContent = `Sequencing #${seqId} - Simulation ${simId}`;

        // Update back link
        document.getElementById('backLink').href = `simulation.html?id=${simId}`;

        // Render all components
        renderSequencingInfo(seqId);
        renderLineageTree();
        renderCloneProportionChart();
        renderCloneDetailsTable();

        loading.classList.add('d-none');
        content.classList.remove('d-none');

    } catch (err) {
        console.error('Error loading sequencing data:', err);
        loading.classList.add('d-none');
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('d-none');
    }
}

// Render sequencing info
function renderSequencingInfo(seqId) {
    const sequencingInfo = document.getElementById('sequencingInfo');
    const cloneCount = Object.keys(sequencingData.clone_proportion).length;

    sequencingInfo.innerHTML = `
        <div class="col-md-4">
            <strong>Sequencing ID:</strong><br>${seqId}
        </div>
        <div class="col-md-4">
            <strong>MRCA (Most Recent Common Ancestor):</strong><br>Clone ${sequencingData.mrca}
        </div>
        <div class="col-md-4">
            <strong>Sample Size:</strong><br>${sequencingData.size.toLocaleString()}
        </div>
        <div class="col-md-4 mt-3">
            <strong>Number of Clones Detected:</strong><br>${cloneCount}
        </div>
    `;
}

// Render filtered lineage tree showing only MRCA, present clones, and intermediates
function renderLineageTree() {
    const container = document.getElementById('lineageTree');
    const clones = simulationData.clones;
    const presentCloneIds = Object.keys(sequencingData.clone_proportion).map(id => parseInt(id));
    const mrcaId = sequencingData.mrca;

    // Build clone map
    const cloneMap = new Map();
    clones.forEach(clone => {
        cloneMap.set(clone.id, clone);
    });

    // Find all ancestors for each present clone up to MRCA
    const relevantCloneIds = new Set([mrcaId]);
    presentCloneIds.forEach(cloneId => {
        let currentId = cloneId;
        relevantCloneIds.add(currentId);

        // Trace back to MRCA
        while (currentId !== null && currentId !== mrcaId) {
            const clone = cloneMap.get(currentId);
            if (!clone) break;
            currentId = clone.ancestor;
            if (currentId !== null) {
                relevantCloneIds.add(currentId);
            }
        }
    });

    // Build filtered tree structure
    const filteredTreeData = buildFilteredTree([...relevantCloneIds], cloneMap, mrcaId);

    if (!filteredTreeData) {
        container.innerHTML = '<p class="text-muted">Unable to build lineage tree</p>';
        return;
    }

    // Set dimensions
    const width = container.clientWidth || 800;
    const height = Math.max(300, relevantCloneIds.size * 40);

    // Create SVG
    const svg = d3.select('#lineageTree')
        .html('') // Clear any existing content
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', 'translate(40,20)');

    // Create tree layout
    const treeLayout = d3.tree()
        .size([height - 40, width - 200]);

    const root = d3.hierarchy(filteredTreeData);
    treeLayout(root);

    // Calculate node sizes based on clone size
    const sizes = [...relevantCloneIds].map(id => cloneMap.get(id)?.size || 1);
    const maxSize = Math.max(...sizes);
    const radiusScale = d3.scaleSqrt()
        .domain([1, maxSize])
        .range([4, 15]);

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
        .style('fill', d => {
            if (d.data.id === mrcaId) return '#ffd700'; // Gold for MRCA
            if (presentCloneIds.includes(d.data.id)) return '#4ecdc4'; // Teal for present
            return '#95a5a6'; // Gray for intermediates
        })
        .style('stroke', d => d.data.id === mrcaId ? '#ff9800' : '#333')
        .style('stroke-width', d => d.data.id === mrcaId ? 3 : 2);

    nodes.append('text')
        .attr('dx', d => radiusScale(d.data.size) + 5)
        .attr('dy', 4)
        .style('font-size', '11px')
        .text(d => {
            let label = `Clone ${d.data.id}`;
            if (d.data.id === mrcaId) label += ' (MRCA)';
            return label;
        });

    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 150}, 20)`);

    legend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .style('font-weight', 'bold')
        .style('font-size', '12px')
        .text('Legend:');

    const legendItems = [
        { color: '#ffd700', stroke: '#ff9800', label: 'MRCA', y: 20 },
        { color: '#4ecdc4', stroke: '#333', label: 'Present', y: 40 },
        { color: '#95a5a6', stroke: '#333', label: 'Intermediate', y: 60 }
    ];

    legendItems.forEach(item => {
        legend.append('circle')
            .attr('cx', 10)
            .attr('cy', item.y)
            .attr('r', 6)
            .style('fill', item.color)
            .style('stroke', item.stroke)
            .style('stroke-width', 2);
        legend.append('text')
            .attr('x', 20)
            .attr('y', item.y + 4)
            .style('font-size', '11px')
            .text(item.label);
    });
}

// Build filtered tree from relevant clone IDs
function buildFilteredTree(relevantIds, cloneMap, rootId) {
    const filteredCloneMap = new Map();

    relevantIds.forEach(id => {
        const clone = cloneMap.get(id);
        if (clone) {
            filteredCloneMap.set(id, { ...clone, children: [] });
        }
    });

    let root = null;

    relevantIds.forEach(id => {
        const node = filteredCloneMap.get(id);
        const clone = cloneMap.get(id);

        if (id === rootId) {
            root = node;
        } else if (clone && clone.ancestor !== null && filteredCloneMap.has(clone.ancestor)) {
            const parent = filteredCloneMap.get(clone.ancestor);
            parent.children.push(node);
        }
    });

    return root;
}

// Render clone proportion chart
function renderCloneProportionChart() {
    const ctx = document.getElementById('cloneProportionChart');
    const cloneProp = sequencingData.clone_proportion;

    // Sort by proportion (descending)
    const sortedClones = Object.entries(cloneProp)
        .sort((a, b) => b[1] - a[1]);

    const labels = sortedClones.map(([id, _]) => `Clone ${id}`);
    const data = sortedClones.map(([_, prop]) => (prop * 100).toFixed(2));

    // Generate colors
    const colors = sortedClones.map((_, i) => {
        const hue = (i * 360 / sortedClones.length) % 360;
        return `hsla(${hue}, 70%, 60%, 0.6)`;
    });

    const borderColors = sortedClones.map((_, i) => {
        const hue = (i * 360 / sortedClones.length) % 360;
        return `hsla(${hue}, 70%, 50%, 1)`;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Proportion (%)',
                data: data,
                backgroundColor: colors,
                borderColor: borderColors,
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

// Render clone details table
function renderCloneDetailsTable() {
    const tbody = document.getElementById('cloneDetailsTable');
    const cloneProp = sequencingData.clone_proportion;

    // Sort by proportion (descending)
    const sortedClones = Object.entries(cloneProp)
        .sort((a, b) => b[1] - a[1]);

    tbody.innerHTML = sortedClones.map(([id, prop]) => `
        <tr>
            <td><strong>Clone ${id}</strong></td>
            <td>${prop.toFixed(6)}</td>
            <td>${(prop * 100).toFixed(2)}%</td>
        </tr>
    `).join('');
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
    const { simId, seqId } = getUrlParams();

    if (!simId || !seqId) {
        document.getElementById('error').textContent = 'Missing simulation or sequencing ID';
        document.getElementById('error').classList.remove('d-none');
        document.getElementById('loading').classList.add('d-none');
        return;
    }

    loadSequencingData(simId, seqId);
});

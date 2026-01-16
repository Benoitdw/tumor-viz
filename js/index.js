// Main orchestration for index page
let globalData = null;

/**
 * Initialize the index page
 */
document.addEventListener('DOMContentLoaded', async () => {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');

    try {
        // Load resume data
        globalData = await loadResumeData();

        // Initialize filter UI
        setupFilterUI();

        // Render all visualizations
        renderParameterEvolution(globalData);
        renderHeatmaps(globalData);

        // Hide loading, show content
        loading.classList.add('d-none');
        content.classList.remove('d-none');

    } catch (err) {
        console.error('Error initializing index page:', err);
        loading.classList.add('d-none');
        error.textContent = `Error loading data: ${err.message}. Please ensure results/resume.tsv exists.`;
        error.classList.remove('d-none');
    }
});

/**
 * Reload plots (called when filters change)
 */
function reloadIndexPlots() {
    if (!globalData) return;

    // Destroy existing charts
    destroyParameterCharts();
    destroyHeatmaps();

    // Re-render with current filters
    renderParameterEvolution(globalData);
    renderHeatmaps(globalData);
}
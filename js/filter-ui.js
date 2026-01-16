// UI components for filter display and management

/**
 * Render active filters in a container
 * @param {string} containerId - ID of container element
 */
function renderActiveFilters(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const filters = getActiveFilters();
    const hasFilters = Object.keys(filters).length > 0;

    if (!hasFilters) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    // Build filter badges HTML
    let badgesHtml = '';
    for (const [param, values] of Object.entries(filters)) {
        for (const value of values) {
            badgesHtml += `
                <span class="filter-badge" data-param="${param}" data-value="${value}">
                    ${param} = ${value}
                    <span class="remove-filter" onclick="handleRemoveFilter('${param}', ${value})">×</span>
                </span>
            `;
        }
    }

    // Update filters list
    const filtersList = container.querySelector('#filtersList');
    if (filtersList) {
        filtersList.innerHTML = badgesHtml;
    }

    // Show/hide apply button
    const applyBtn = document.getElementById('applyFiltersBtn');
    if (applyBtn) {
        applyBtn.style.display = hasFilters ? 'inline-block' : 'none';
    }
}

/**
 * Handle removal of a single filter
 * @param {string} parameter - Parameter name
 * @param {number} value - Value to remove
 */
function handleRemoveFilter(parameter, value) {
    removeFilter(parameter, parseFloat(value));
    renderActiveFilters('activeFilters');

    // Trigger refresh if on index page
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        refreshPlots();
    }
}

/**
 * Handle clear all filters
 */
function handleClearFilters() {
    clearFilters();
    renderActiveFilters('activeFilters');

    // Trigger refresh if on index page
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        refreshPlots();
    }

    // If on main.html, reload to show all simulations
    if (window.location.pathname.includes('main.html')) {
        window.location.reload();
    }
}

/**
 * Update filter display (call after filter changes)
 */
function updateFilterDisplay() {
    renderActiveFilters('activeFilters');
}

/**
 * Refresh plots on index page (to be defined in index.js)
 */
function refreshPlots() {
    if (typeof reloadIndexPlots === 'function') {
        reloadIndexPlots();
    }
}

/**
 * Setup filter UI event listeners
 */
function setupFilterUI() {
    // Clear filters button
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearFilters);
    }

    // Apply filters button (navigate to main.html)
    const applyBtn = document.getElementById('applyFiltersBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            window.location.href = 'main.html';
        });
    }

    // Initial render
    renderActiveFilters('activeFilters');
}

/**
 * Create filter info text
 * @returns {string} Human-readable filter description
 */
function getFilterDescription() {
    const filters = getActiveFilters();
    if (Object.keys(filters).length === 0) {
        return 'No filters active';
    }

    const parts = [];
    for (const [param, values] of Object.entries(filters)) {
        parts.push(`${param}: ${values.join(', ')}`);
    }
    return parts.join(' | ');
}
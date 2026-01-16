// Filter manager using sessionStorage
const STORAGE_KEY = 'tumorEvolution_filters';

/**
 * Add a filter value for a parameter
 * @param {string} parameter - Parameter name (e.g., 'p_death')
 * @param {number} value - Parameter value to filter
 */
function addFilter(parameter, value) {
    const filters = getActiveFilters();

    if (!filters[parameter]) {
        filters[parameter] = [];
    }

    // Add value if not already present (avoid duplicates)
    if (!filters[parameter].includes(value)) {
        filters[parameter].push(value);
    }

    saveFilters(filters);
}

/**
 * Remove a specific filter value
 * @param {string} parameter - Parameter name
 * @param {number} value - Value to remove
 */
function removeFilter(parameter, value) {
    const filters = getActiveFilters();

    if (filters[parameter]) {
        filters[parameter] = filters[parameter].filter(v => v !== value);

        // Remove parameter key if no values left
        if (filters[parameter].length === 0) {
            delete filters[parameter];
        }
    }

    saveFilters(filters);
}

/**
 * Get active filters from sessionStorage
 * @returns {Object} Filters object { parameter: [values] }
 */
function getActiveFilters() {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error reading filters from sessionStorage:', error);
        return {};
    }
}

/**
 * Save filters to sessionStorage
 * @param {Object} filters - Filters object
 */
function saveFilters(filters) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
        console.error('Error saving filters to sessionStorage:', error);
    }
}

/**
 * Clear all filters
 */
function clearFilters() {
    sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if any filters are active
 * @returns {boolean} True if filters exist
 */
function hasActiveFilters() {
    const filters = getActiveFilters();
    return Object.keys(filters).length > 0;
}

/**
 * Get count of active filter values
 * @returns {number} Total number of filter values
 */
function getFilterCount() {
    const filters = getActiveFilters();
    return Object.values(filters).reduce((sum, values) => sum + values.length, 0);
}

/**
 * Check if a specific parameter-value combination is filtered
 * @param {string} parameter - Parameter name
 * @param {number} value - Parameter value
 * @returns {boolean} True if this combination is in filters
 */
function isFiltered(parameter, value) {
    const filters = getActiveFilters();
    return filters[parameter] && filters[parameter].includes(value);
}
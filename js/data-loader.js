// Data loader for resume.tsv
const RESUME_PATH = './results/resume.tsv';

/**
 * Load and parse resume.tsv file
 * @returns {Promise<Array>} Array of data objects
 */
async function loadResumeData() {
    try {
        const response = await fetch(RESUME_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load ${RESUME_PATH}: ${response.statusText}`);
        }

        const text = await response.text();
        return parseResumeData(text);
    } catch (error) {
        console.error('Error loading resume data:', error);
        throw error;
    }
}

/**
 * Parse TSV text into array of objects
 * @param {string} tsvText - Raw TSV content
 * @returns {Array} Parsed data
 */
function parseResumeData(tsvText) {
    const lines = tsvText.trim().split('\n');
    const headers = lines[0].split('\t');

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        const row = {};

        headers.forEach((header, index) => {
            const value = values[index];

            // Convert to appropriate type
            if (header === 'simulation_id' || header === 'sample_id') {
                row[header] = value;
            } else if (header === 'neutral') {
                row[header] = value === 'true';
            } else {
                // Convert to number
                row[header] = parseFloat(value);
            }
        });

        data.push(row);
    }

    return data;
}

/**
 * Filter data based on filters object
 * @param {Array} data - Resume data
 * @param {Object} filters - Filters object { parameter: [values] }
 * @returns {Array} Filtered data
 */
function filterData(data, filters) {
    if (!filters || Object.keys(filters).length === 0) {
        return data;
    }

    return data.filter(row => {
        // Check each filter
        for (const [param, values] of Object.entries(filters)) {
            if (!values || values.length === 0) continue;

            // Row must match at least one value for this parameter
            if (!values.includes(row[param])) {
                return false;
            }
        }
        return true;
    });
}

/**
 * Get unique values for a parameter
 * @param {Array} data - Resume data
 * @param {string} parameterName - Parameter name
 * @returns {Array} Sorted unique values
 */
function getUniqueValues(data, parameterName) {
    const values = [...new Set(data.map(row => row[parameterName]))];
    return values.sort((a, b) => a - b);
}

/**
 * Get unique simulation IDs from data
 * @param {Array} data - Resume data
 * @returns {Array} Unique simulation IDs
 */
function getUniqueSimulationIds(data) {
    return [...new Set(data.map(row => row.simulation_id))];
}

/**
 * Build a map of config IDs to their available sample IDs
 * @param {Array} data - Resume data
 * @returns {Object} Map of configId -> Set of sample IDs
 */
function buildConfigSamplesMap(data) {
    const map = {};
    data.forEach(row => {
        if (!map[row.simulation_id]) {
            map[row.simulation_id] = new Set();
        }
        map[row.simulation_id].add(row.sample_id);
    });
    return map;
}

/**
 * Filter data by neutral/not neutral
 * @param {Array} data - Resume data
 * @param {boolean} neutral - True for neutral, false for not neutral
 * @returns {Array} Filtered data
 */
function filterByNeutral(data, neutral) {
    return data.filter(row => row.neutral === neutral);
}
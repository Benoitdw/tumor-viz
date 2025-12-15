# Tumor Evolution Visualization

A static web application for visualizing tumor evolution simulations with interactive charts and phylogenetic trees.

## Features

### Overview Page
- Combined regression plot (MRCA TMB vs Fitness) for all simulations
- Interactive table with eye icon to show/hide simulations from the plot
- Simulations list with key metrics

### Simulation Detail Page
- Configuration parameters
- Top 10 clone proportions bar chart
- Interactive phylogenetic tree with filtering (toggle to show/hide clones <100 cells)
- Hover tooltips showing clone details (fitness, TMB, size, ancestor)
- Regression plot with R², regression line, and 95% confidence interval
- Sortable sequencing samples grid

### Sequencing Detail Page
- Filtered lineage tree (MRCA, present clones, and intermediates)
- Clone proportion bar chart
- Detailed clone table

## Technologies

- Bootstrap 5 - UI framework
- Chart.js - Bar charts and scatter plots with regression
- D3.js v7 - Phylogenetic tree visualization
- Vanilla JavaScript - No build process required

## GitHub Pages Deployment

This repository is configured for GitHub Pages deployment.

### Setup

1. Push this repository to GitHub
2. Go to repository Settings > Pages
3. Under "Source", select "Deploy from a branch"
4. Select branch "main" (or "master") and folder "/ (root)"
5. Click Save

Your site will be available at: `https://[username].github.io/[repository-name]/`

### Data Structure

The app expects data in the following structure relative to the web root:

```
results/
├── simulations.json          # List of simulation folder names
├── [simulation_id]/
│   ├── simulation.json      # Simulation data
│   └── sequencing.json      # Sequencing samples
└── ...
```

### Adding Data to GitHub Pages

You have two options:

#### Option 1: Include results in the repository
- Add your `results/` folder to the repository
- Commit and push
- GitHub Pages will serve the data files

#### Option 2: Host data separately
- Upload `results/` to a different location with CORS enabled
- Update `RESULTS_PATH` in JS files to point to the new location

## Local Development

```bash
cd tumor-viz
python3 -m http.server 8000
```

Open http://localhost:8000

## File Structure

```
tumor-viz/
├── index.html              # Overview page
├── simulation.html         # Simulation detail page
├── sequencing.html         # Sequencing detail page
├── css/
│   └── style.css
├── js/
│   ├── main.js            # Overview page logic
│   ├── simulation.js      # Simulation page logic
│   └── sequencing.js      # Sequencing page logic
└── README.md
```

## License

MIT

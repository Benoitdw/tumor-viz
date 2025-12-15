# GitHub Pages Deployment Guide

## Prerequisites

- GitHub account
- Git installed locally
- Simulation results data ready

## Step 1: Prepare Data

You need to add your simulation results to this repository. The app expects:

```
tumor-viz/
├── results/
│   ├── simulations.json          # Array of simulation folder names, e.g., ["sim_0", "sim_1"]
│   ├── sim_0/
│   │   ├── simulation.json
│   │   └── sequencing.json
│   ├── sim_1/
│   │   ├── simulation.json
│   │   └── sequencing.json
│   └── ...
```

### Create simulations.json

Generate a list of all your simulation folders:

```bash
cd tumor-viz
ls -1 results/ | grep -v simulations.json | jq -R -s -c 'split("\n")[:-1]' > results/simulations.json
```

Or manually create `results/simulations.json`:
```json
["sim_0", "sim_1", "sim_2", ...]
```

## Step 2: Create GitHub Repository

```bash
cd tumor-viz
git add .
git commit -m "Initial commit: Tumor evolution visualization web app"
```

Create a new repository on GitHub (e.g., `tumor-evolution-viz`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/tumor-evolution-viz.git
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click **Pages**
4. Under **Source**:
   - Select branch: `main`
   - Select folder: `/ (root)`
5. Click **Save**

## Step 4: Wait for Deployment

- GitHub will build and deploy your site (usually takes 1-2 minutes)
- Once ready, you'll see: "Your site is live at https://YOUR_USERNAME.github.io/tumor-evolution-viz/"
- Click the link to view your visualization

## Step 5: Update Data

To add new simulations:

1. Add new simulation folders to `results/`
2. Update `results/simulations.json`
3. Commit and push:

```bash
git add results/
git commit -m "Add new simulation results"
git push
```

GitHub Pages will automatically redeploy (1-2 minutes).

## Troubleshooting

### Site shows blank page
- Check browser console for errors
- Verify `results/simulations.json` exists and is valid JSON
- Ensure all paths in JS files are correct

### Data not loading
- Check that CORS is not an issue
- Verify JSON files are properly formatted
- Check that `RESULTS_PATH` in JS files is correct (should be `./results` for GitHub Pages)

### Need to change data path
Edit these files and update `RESULTS_PATH`:
- `js/main.js`
- `js/simulation.js`
- `js/sequencing.js`

## Custom Domain (Optional)

To use a custom domain:

1. Create a file named `CNAME` (no extension) in the root
2. Add your domain: `yourdomain.com`
3. Configure DNS records as per [GitHub's instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

## Notes

- The `.nojekyll` file disables Jekyll processing (important for static sites)
- All data is loaded client-side via fetch API
- No server-side code or build process required
- Results data can be large - consider GitHub's 1GB repository size limit

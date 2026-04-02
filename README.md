# sword-of-justice-pvp-calculator
A pvp damage calculator for the online game "Sword of justice"

## Live Demo
This site is automatically deployed to GitHub Pages. Visit: https://tommylui.github.io/sword-of-justice-pvp-calculator/

## Deployment
This project uses GitHub Pages for hosting. The site is automatically deployed when changes are pushed to the main/master branch via GitHub Actions.

### Setup Instructions
To enable GitHub Pages deployment:
1. Go to your repository Settings
2. Navigate to Pages section (under Code and automation)
3. Under "Build and deployment", select "GitHub Actions" as the source
4. The workflow will automatically deploy your site on the next push

## Local Development

### Option 1: VS Code Live Server (Recommended)
1. Install the **Live Server** extension (`ritwickdey.LiveServer`) in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. Changes to HTML/CSS/JS auto-reload in the browser on save

### Option 2: npx serve
```bash
npx serve .
```
Then open `http://localhost:3000`. Manual refresh required after changes.

### Option 3: Python
```bash
python -m http.server 8000
```
Then open `http://localhost:8000`. Manual refresh required after changes.

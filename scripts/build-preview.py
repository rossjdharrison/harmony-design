#!/usr/bin/env python3
"""
Build script for preview deployments.

This script creates a production-ready bundle for preview environments
including all necessary static assets, WASM modules, and HTML pages.

Usage:
    python scripts/build-preview.py [--output dist]
"""

import os
import shutil
import json
from pathlib import Path
from datetime import datetime


class PreviewBuilder:
    """Builds preview deployment bundles."""
    
    def __init__(self, output_dir="dist"):
        """
        Initialize builder.
        
        Args:
            output_dir: Output directory for built files
        """
        self.output_dir = Path(output_dir)
        self.root_dir = Path(__file__).parent.parent
        
    def build(self):
        """Execute full build pipeline."""
        print("🏗️  Building preview deployment...")
        
        self._clean_output()
        self._copy_static_assets()
        self._copy_components()
        self._copy_core_modules()
        self._generate_index()
        self._generate_manifest()
        self._generate_performance_page()
        self._generate_storybook_index()
        
        print("✅ Preview build complete!")
        print(f"📦 Output: {self.output_dir}")
        
    def _clean_output(self):
        """Clean output directory."""
        if self.output_dir.exists():
            shutil.rmtree(self.output_dir)
        self.output_dir.mkdir(parents=True)
        
    def _copy_static_assets(self):
        """Copy static HTML, CSS, and demo files."""
        print("📄 Copying static assets...")
        
        # Copy demo HTML files
        for html_file in self.root_dir.glob("demo-*.html"):
            shutil.copy(html_file, self.output_dir / html_file.name)
        
        # Copy styles
        styles_dir = self.root_dir / "styles"
        if styles_dir.exists():
            shutil.copytree(styles_dir, self.output_dir / "styles")
        
        # Copy tokens
        tokens_dir = self.root_dir / "tokens"
        if tokens_dir.exists():
            shutil.copytree(tokens_dir, self.output_dir / "tokens")
            
    def _copy_components(self):
        """Copy all component JavaScript files."""
        print("🧩 Copying components...")
        
        components_src = self.root_dir / "components"
        components_dst = self.output_dir / "components"
        
        if components_src.exists():
            shutil.copytree(
                components_src,
                components_dst,
                ignore=shutil.ignore_patterns("*.test.html", "*.test.js")
            )
            
        # Copy controls
        controls_src = self.root_dir / "controls"
        controls_dst = self.output_dir / "controls"
        
        if controls_src.exists():
            shutil.copytree(
                controls_src,
                controls_dst,
                ignore=shutil.ignore_patterns("*.test.html", "*.test.js")
            )
            
    def _copy_core_modules(self):
        """Copy core system modules."""
        print("⚙️  Copying core modules...")
        
        core_src = self.root_dir / "core"
        core_dst = self.output_dir / "core"
        
        if core_src.exists():
            shutil.copytree(
                core_src,
                core_dst,
                ignore=shutil.ignore_patterns("*.test.js", "*.test.html")
            )
            
    def _generate_index(self):
        """Generate main index.html for preview."""
        print("📝 Generating index.html...")
        
        index_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Harmony Design System - Preview</title>
    <link rel="stylesheet" href="styles/tokens.css">
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 2rem;
            background: var(--color-background-primary, #ffffff);
            color: var(--color-text-primary, #000000);
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        .demo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .demo-card {
            border: 1px solid var(--color-border-primary, #e0e0e0);
            border-radius: 8px;
            padding: 1.5rem;
            text-decoration: none;
            color: inherit;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .demo-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .demo-card h2 {
            margin: 0 0 0.5rem 0;
            font-size: 1.25rem;
        }
        .demo-card p {
            margin: 0;
            opacity: 0.7;
        }
        .meta {
            margin-top: 2rem;
            padding: 1rem;
            background: var(--color-background-secondary, #f5f5f5);
            border-radius: 4px;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Harmony Design System</h1>
        <p>Preview deployment - Component library and design tokens</p>
        
        <div class="demo-grid">
            <a href="demo-components.html" class="demo-card">
                <h2>Component Demo</h2>
                <p>Interactive showcase of all UI components</p>
            </a>
            
            <a href="demo-cascade.html" class="demo-card">
                <h2>Token Cascade</h2>
                <p>CSS custom properties and token inheritance</p>
            </a>
            
            <a href="demo-advanced.html" class="demo-card">
                <h2>Advanced Features</h2>
                <p>EventBus, validation, and reactive patterns</p>
            </a>
            
            <a href="_performance" class="demo-card">
                <h2>📊 Performance Report</h2>
                <p>Bundle size, load time, and runtime metrics</p>
            </a>
            
            <a href="_storybook" class="demo-card">
                <h2>🧪 Component Storybook</h2>
                <p>Interactive component documentation</p>
            </a>
        </div>
        
        <div class="meta">
            <strong>Build Info:</strong><br>
            Built: """ + datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC') + """<br>
            Environment: Preview Deployment
        </div>
    </div>
</body>
</html>
"""
        
        (self.output_dir / "index.html").write_text(index_html)
        
    def _generate_manifest(self):
        """Generate deployment manifest."""
        print("📋 Generating manifest...")
        
        manifest = {
            "name": "Harmony Design System",
            "version": "preview",
            "buildTime": datetime.utcnow().isoformat() + "Z",
            "components": self._list_components(),
            "performance": {
                "loadBudget": "200ms",
                "renderBudget": "16ms",
                "memoryBudget": "50MB"
            }
        }
        
        (self.output_dir / "manifest.json").write_text(
            json.dumps(manifest, indent=2)
        )
        
    def _list_components(self):
        """List all available components."""
        components = []
        
        components_dir = self.output_dir / "components"
        if components_dir.exists():
            for js_file in components_dir.rglob("*.js"):
                rel_path = js_file.relative_to(self.output_dir)
                components.append(str(rel_path))
                
        return components
        
    def _generate_performance_page(self):
        """Generate performance monitoring page."""
        print("⚡ Generating performance page...")
        
        perf_dir = self.output_dir / "_performance"
        perf_dir.mkdir(exist_ok=True)
        
        perf_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report - Harmony Design System</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 2rem;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { margin-top: 0; }
        .metric {
            display: flex;
            justify-content: space-between;
            padding: 1rem;
            border-bottom: 1px solid #e0e0e0;
        }
        .metric:last-child { border-bottom: none; }
        .metric-name { font-weight: 600; }
        .metric-value { font-family: monospace; }
        .pass { color: green; }
        .fail { color: red; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Performance Report</h1>
        <p>Real-time performance metrics for this preview deployment</p>
        
        <h2>Performance Budgets</h2>
        <div class="metric">
            <span class="metric-name">Load Time Budget</span>
            <span class="metric-value">200ms</span>
        </div>
        <div class="metric">
            <span class="metric-name">Render Budget</span>
            <span class="metric-value">16ms (60fps)</span>
        </div>
        <div class="metric">
            <span class="metric-name">Memory Budget</span>
            <span class="metric-value">50MB</span>
        </div>
        
        <h2>Current Metrics</h2>
        <div id="metrics">
            <p>Loading metrics...</p>
        </div>
        
        <script>
            // Measure actual performance
            window.addEventListener('load', () => {
                const perf = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                
                const metrics = {
                    'Load Time': Math.round(perf.loadEventEnd - perf.fetchStart),
                    'DOM Content Loaded': Math.round(perf.domContentLoadedEventEnd - perf.fetchStart),
                    'First Paint': paint[0] ? Math.round(paint[0].startTime) : 'N/A',
                    'Memory Used': performance.memory ? 
                        Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'
                };
                
                const metricsDiv = document.getElementById('metrics');
                metricsDiv.innerHTML = Object.entries(metrics)
                    .map(([name, value]) => {
                        const pass = name === 'Load Time' && value < 200;
                        const className = pass ? 'pass' : '';
                        return `
                            <div class="metric">
                                <span class="metric-name">${name}</span>
                                <span class="metric-value ${className}">${value}${typeof value === 'number' ? 'ms' : ''}</span>
                            </div>
                        `;
                    })
                    .join('');
            });
        </script>
    </div>
</body>
</html>
"""
        
        (perf_dir / "index.html").write_text(perf_html)
        
    def _generate_storybook_index(self):
        """Generate component storybook index."""
        print("🧪 Generating storybook...")
        
        storybook_dir = self.output_dir / "_storybook"
        storybook_dir.mkdir(exist_ok=True)
        
        storybook_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Component Storybook - Harmony Design System</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            display: flex;
            height: 100vh;
        }
        .sidebar {
            width: 250px;
            background: #f5f5f5;
            padding: 1rem;
            overflow-y: auto;
        }
        .content {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
        }
        .component-link {
            display: block;
            padding: 0.5rem;
            margin-bottom: 0.25rem;
            text-decoration: none;
            color: inherit;
            border-radius: 4px;
        }
        .component-link:hover {
            background: #e0e0e0;
        }
        h1 { margin-top: 0; }
    </style>
</head>
<body>
    <div class="sidebar">
        <h3>Components</h3>
        <a href="#" class="component-link" data-component="harmony-fader">Harmony Fader</a>
        <a href="#" class="component-link" data-component="harmony-toggle">Harmony Toggle</a>
        <a href="#" class="component-link" data-component="transport-bar">Transport Bar</a>
        <a href="#" class="component-link" data-component="clip">Clip</a>
        <a href="#" class="component-link" data-component="theme-switcher">Theme Switcher</a>
    </div>
    <div class="content">
        <h1>Component Storybook</h1>
        <p>Interactive component documentation and testing</p>
        <div id="component-viewer">
            <p>Select a component from the sidebar</p>
        </div>
    </div>
    
    <script>
        document.querySelectorAll('.component-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const component = e.target.dataset.component;
                loadComponent(component);
            });
        });
        
        function loadComponent(name) {
            const viewer = document.getElementById('component-viewer');
            viewer.innerHTML = `
                <h2>${name}</h2>
                <p>Component documentation and interactive examples would be loaded here.</p>
                <iframe src="/demo-components.html" style="width: 100%; height: 600px; border: 1px solid #ccc;"></iframe>
            `;
        }
    </script>
</body>
</html>
"""
        
        (storybook_dir / "index.html").write_text(storybook_html)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Build preview deployment bundle"
    )
    parser.add_argument(
        "--output",
        default="dist",
        help="Output directory (default: dist)"
    )
    
    args = parser.parse_args()
    
    builder = PreviewBuilder(output_dir=args.output)
    builder.build()


if __name__ == "__main__":
    main()
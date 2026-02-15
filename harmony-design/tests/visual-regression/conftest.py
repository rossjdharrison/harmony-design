"""
Visual regression test configuration and fixtures.

Provides browser setup, screenshot utilities, and comparison logic
for visual regression testing of Harmony Design System components.
"""

import pytest
import os
import json
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import Page, Browser, sync_playwright


# Test configuration
VIEWPORT_WIDTH = 1280
VIEWPORT_HEIGHT = 720
THRESHOLD = 0.01  # 1% difference threshold
BASELINE_DIR = Path(__file__).parent / "snapshots" / "baseline"
DIFF_DIR = Path(__file__).parent / "snapshots" / "diffs"
RESULTS_DIR = Path(__file__).parent / "results"


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Configure browser context for consistent rendering."""
    return {
        **browser_context_args,
        "viewport": {
            "width": VIEWPORT_WIDTH,
            "height": VIEWPORT_HEIGHT,
        },
        "device_scale_factor": 1,
        "has_touch": False,
        "is_mobile": False,
    }


@pytest.fixture(scope="session")
def playwright_instance():
    """Provide Playwright instance for the test session."""
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright_instance):
    """Launch Chrome browser for testing (policy requirement)."""
    browser = playwright_instance.chromium.launch(
        headless=True,
        args=[
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
        ]
    )
    yield browser
    browser.close()


@pytest.fixture
def page(browser: Browser):
    """Create a new page for each test."""
    context = browser.new_context(
        viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT},
        device_scale_factor=1,
    )
    page = context.new_page()
    yield page
    context.close()


@pytest.fixture
def test_server_url():
    """Base URL for test server serving component demos."""
    # Test server should be started separately
    return os.getenv("TEST_SERVER_URL", "http://localhost:8000")


def pytest_configure(config):
    """Create necessary directories for test artifacts."""
    BASELINE_DIR.mkdir(parents=True, exist_ok=True)
    DIFF_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def pytest_addoption(parser):
    """Add custom command-line options."""
    parser.addoption(
        "--update-baselines",
        action="store_true",
        default=False,
        help="Update baseline screenshots instead of comparing"
    )


class VisualTestHelper:
    """Helper class for visual regression testing operations."""
    
    def __init__(self, page: Page, update_baselines: bool = False):
        self.page = page
        self.update_baselines = update_baselines
        
    def capture_component(
        self,
        component_name: str,
        state: str = "default",
        selector: str = None,
        setup_fn=None
    ) -> bool:
        """
        Capture component screenshot and compare with baseline.
        
        Args:
            component_name: Component identifier (e.g., "button-primary")
            state: Component state (e.g., "hover", "focus", "disabled")
            selector: CSS selector for component (defaults to component_name)
            setup_fn: Optional function to setup component state
            
        Returns:
            True if visual test passed (or baseline updated), False otherwise
        """
        if selector is None:
            selector = f"#{component_name}"
            
        # Wait for component to be ready
        self.page.wait_for_selector(selector, state="attached")
        
        # Execute setup function if provided (e.g., hover, focus)
        if setup_fn:
            setup_fn(self.page, selector)
            
        # Wait for animations to settle
        self.page.wait_for_timeout(500)
        
        # Capture screenshot
        element = self.page.locator(selector)
        screenshot_name = f"{component_name}--{state}.png"
        screenshot_path = BASELINE_DIR / screenshot_name
        
        screenshot_bytes = element.screenshot()
        
        if self.update_baselines:
            # Update baseline
            with open(screenshot_path, "wb") as f:
                f.write(screenshot_bytes)
            return True
        else:
            # Compare with baseline
            if not screenshot_path.exists():
                # No baseline exists, save current as baseline
                with open(screenshot_path, "wb") as f:
                    f.write(screenshot_bytes)
                return True
                
            return self._compare_screenshots(
                screenshot_bytes,
                screenshot_path,
                screenshot_name
            )
    
    def _compare_screenshots(
        self,
        current_bytes: bytes,
        baseline_path: Path,
        name: str
    ) -> bool:
        """
        Compare current screenshot with baseline.
        
        Returns True if images match within threshold.
        """
        from io import BytesIO
        
        # Load images
        current_img = Image.open(BytesIO(current_bytes))
        baseline_img = Image.open(baseline_path)
        
        # Ensure same size
        if current_img.size != baseline_img.size:
            self._save_diff(current_img, baseline_img, name, "size_mismatch")
            return False
            
        # Calculate difference
        diff = ImageChops.difference(current_img, baseline_img)
        
        # Calculate percentage difference
        histogram = diff.histogram()
        total_pixels = current_img.size[0] * current_img.size[1]
        non_zero_pixels = sum(histogram[1:])  # Skip zero bucket
        difference_pct = non_zero_pixels / (total_pixels * 3)  # 3 channels
        
        if difference_pct > THRESHOLD:
            self._save_diff(current_img, baseline_img, name, "visual_diff")
            return False
            
        return True
    
    def _save_diff(
        self,
        current: Image,
        baseline: Image,
        name: str,
        reason: str
    ):
        """Save diff images for debugging."""
        diff_path = DIFF_DIR / name.replace(".png", f"--{reason}.png")
        current.save(diff_path)
        
        # Also save side-by-side comparison
        comparison = Image.new(
            "RGB",
            (current.width + baseline.width, max(current.height, baseline.height))
        )
        comparison.paste(baseline, (0, 0))
        comparison.paste(current, (baseline.width, 0))
        
        comparison_path = DIFF_DIR / name.replace(".png", f"--comparison.png")
        comparison.save(comparison_path)
    
    def measure_performance(self, selector: str, interaction_fn=None) -> dict:
        """
        Measure component rendering performance.
        
        Args:
            selector: CSS selector for component
            interaction_fn: Optional function to trigger animation/interaction
            
        Returns:
            Performance metrics dict
        """
        # Start performance measurement
        self.page.evaluate("""
            window.perfMarks = [];
            window.perfObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    window.perfMarks.push({
                        name: entry.name,
                        duration: entry.duration,
                        startTime: entry.startTime
                    });
                }
            });
            window.perfObserver.observe({ entryTypes: ['measure', 'paint'] });
        """)
        
        # Execute interaction if provided
        if interaction_fn:
            interaction_fn(self.page, selector)
            
        # Wait for frame
        self.page.wait_for_timeout(100)
        
        # Collect metrics
        metrics = self.page.evaluate("""
            () => {
                const entries = performance.getEntriesByType('paint');
                const memory = performance.memory || {};
                
                return {
                    firstPaint: entries.find(e => e.name === 'first-paint')?.startTime || 0,
                    firstContentfulPaint: entries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
                    usedJSHeapSize: memory.usedJSHeapSize || 0,
                    totalJSHeapSize: memory.totalJSHeapSize || 0,
                    marks: window.perfMarks || []
                };
            }
        """)
        
        return metrics
    
    def validate_performance_budget(self, metrics: dict) -> tuple[bool, list]:
        """
        Validate performance against budgets.
        
        Returns:
            (passed, violations) tuple
        """
        violations = []
        
        # Check render budget (16ms for 60fps)
        for mark in metrics.get("marks", []):
            if mark.get("duration", 0) > 16:
                violations.append(
                    f"Render exceeded 16ms budget: {mark['duration']:.2f}ms"
                )
        
        # Check memory budget (50MB WASM heap)
        # Note: usedJSHeapSize includes all JS, not just WASM
        # This is a rough check - actual WASM heap needs separate measurement
        heap_mb = metrics.get("usedJSHeapSize", 0) / (1024 * 1024)
        if heap_mb > 50:
            violations.append(
                f"Memory exceeded 50MB budget: {heap_mb:.2f}MB"
            )
        
        return len(violations) == 0, violations


@pytest.fixture
def visual_test(page: Page, request):
    """Provide visual test helper instance."""
    update_baselines = request.config.getoption("--update-baselines")
    return VisualTestHelper(page, update_baselines)


@pytest.fixture
def component_url(test_server_url):
    """Helper to construct component demo URLs."""
    def _url(component_path: str) -> str:
        return f"{test_server_url}/tests/visual-regression/demos/{component_path}"
    return _url
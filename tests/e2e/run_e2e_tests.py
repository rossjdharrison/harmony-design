#!/usr/bin/env python3
"""
E2E Test Runner for Harmony Design System
Orchestrates end-to-end testing of critical user workflows.
"""

import argparse
import json
import sys
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class E2ETestRunner:
    """Runs E2E tests with performance monitoring and validation."""
    
    def __init__(self, headless=False, profile=False):
        self.headless = headless
        self.profile = profile
        self.driver = None
        self.results = []
        
    def setup_driver(self):
        """Initialize Chrome WebDriver with appropriate options."""
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        
        # Enable performance logging
        chrome_options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.set_window_size(1920, 1080)
        
    def teardown_driver(self):
        """Clean up WebDriver."""
        if self.driver:
            self.driver.quit()
            
    def measure_performance(self, metric_name):
        """Measure performance metrics from Chrome DevTools."""
        if not self.profile:
            return None
            
        # Get performance timing
        timing = self.driver.execute_script("""
            const timing = window.performance.timing;
            const paint = performance.getEntriesByType('paint');
            return {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
                firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
            };
        """)
        
        return {
            'metric': metric_name,
            'timing': timing,
            'timestamp': time.time()
        }
        
    def validate_performance_budget(self, metrics):
        """Validate against performance budgets."""
        if not metrics or not metrics.get('timing'):
            return True
            
        timing = metrics['timing']
        violations = []
        
        # 200ms initial load budget
        if timing['loadTime'] > 200:
            violations.append(f"Load time {timing['loadTime']}ms exceeds 200ms budget")
            
        # First contentful paint should be under 100ms
        if timing['firstContentfulPaint'] > 100:
            violations.append(f"FCP {timing['firstContentfulPaint']}ms exceeds 100ms target")
            
        return len(violations) == 0, violations
        
    def wait_for_element(self, selector, timeout=10):
        """Wait for element to be present and visible."""
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
        
    def wait_for_event_bus_event(self, event_type, timeout=5):
        """Wait for specific EventBus event to be published."""
        script = f"""
            return new Promise((resolve) => {{
                const timeout = setTimeout(() => resolve(null), {timeout * 1000});
                window.addEventListener('eventbus:message', (e) => {{
                    if (e.detail.type === '{event_type}') {{
                        clearTimeout(timeout);
                        resolve(e.detail);
                    }}
                }});
            }});
        """
        return self.driver.execute_async_script(script)
        
    def run_workflow(self, workflow_name):
        """Run a specific workflow test."""
        print(f"\n▶ Running workflow: {workflow_name}")
        
        workflow_method = getattr(self, f"test_{workflow_name}", None)
        if not workflow_method:
            print(f"✗ Workflow '{workflow_name}' not found")
            return False
            
        try:
            start_time = time.time()
            workflow_method()
            duration = time.time() - start_time
            
            result = {
                'workflow': workflow_name,
                'status': 'PASS',
                'duration': duration
            }
            self.results.append(result)
            print(f"✓ {workflow_name} passed ({duration:.2f}s)")
            return True
            
        except Exception as e:
            result = {
                'workflow': workflow_name,
                'status': 'FAIL',
                'error': str(e)
            }
            self.results.append(result)
            print(f"✗ {workflow_name} failed: {e}")
            return False
            
    def test_component_interaction_flow(self):
        """Test complete component interaction workflow."""
        # Load test page
        self.driver.get('file://' + str(Path(__file__).parent / 'fixtures' / 'component-interaction.html'))
        
        # Measure initial load
        metrics = self.measure_performance('component_interaction_load')
        passed, violations = self.validate_performance_budget(metrics)
        if not passed:
            raise AssertionError(f"Performance budget violations: {violations}")
        
        # Wait for button component
        button = self.wait_for_element('harmony-button')
        assert button is not None, "Button component not found"
        
        # Click button and wait for event
        button.click()
        event = self.wait_for_event_bus_event('button:clicked')
        assert event is not None, "Button click event not received"
        
        # Verify state update
        state_display = self.wait_for_element('#state-display')
        assert 'clicked' in state_display.text.lower(), "State not updated after click"
        
    def test_keyboard_navigation_flow(self):
        """Test keyboard navigation accessibility workflow."""
        from selenium.webdriver.common.keys import Keys
        
        self.driver.get('file://' + str(Path(__file__).parent / 'fixtures' / 'keyboard-navigation.html'))
        
        # Tab through focusable elements
        body = self.driver.find_element(By.TAG_NAME, 'body')
        
        focusable_elements = []
        for _ in range(5):
            body.send_keys(Keys.TAB)
            time.sleep(0.1)
            active = self.driver.switch_to.active_element
            focusable_elements.append(active.tag_name)
            
        # Verify focus indicators visible
        focused_element = self.driver.switch_to.active_element
        outline = focused_element.value_of_css_property('outline')
        assert outline != 'none', "Focus indicator not visible"
        
        # Test keyboard activation (Space/Enter)
        focused_element.send_keys(Keys.ENTER)
        event = self.wait_for_event_bus_event('button:activated')
        assert event is not None, "Keyboard activation event not received"
        
    def test_form_submission_flow(self):
        """Test form validation and submission workflow."""
        self.driver.get('file://' + str(Path(__file__).parent / 'fixtures' / 'form-submission.html'))
        
        # Find form inputs
        name_input = self.wait_for_element('harmony-input[name="name"]')
        email_input = self.wait_for_element('harmony-input[name="email"]')
        submit_button = self.wait_for_element('harmony-button[type="submit"]')
        
        # Test validation - submit empty form
        submit_button.click()
        time.sleep(0.2)
        
        # Verify validation errors shown
        error_message = self.wait_for_element('.error-message')
        assert error_message.is_displayed(), "Validation error not shown"
        
        # Fill form with valid data
        name_input.send_keys('Test User')
        email_input.send_keys('test@example.com')
        
        # Submit form
        submit_button.click()
        event = self.wait_for_event_bus_event('form:submitted')
        assert event is not None, "Form submission event not received"
        assert event['payload']['name'] == 'Test User', "Form data incorrect"
        
    def test_animation_performance_flow(self):
        """Test animation performance under 16ms frame budget."""
        self.driver.get('file://' + str(Path(__file__).parent / 'fixtures' / 'animation-performance.html'))
        
        # Start performance recording
        self.driver.execute_script("performance.mark('animation-start');")
        
        # Trigger animation
        trigger = self.wait_for_element('#animation-trigger')
        trigger.click()
        
        # Wait for animation to complete
        time.sleep(1)
        
        # Measure frame performance
        frame_times = self.driver.execute_script("""
            const entries = performance.getEntriesByType('measure');
            const frames = performance.getEntriesByType('frame') || [];
            return frames.map(f => f.duration);
        """)
        
        # Verify 60fps (16ms per frame)
        if frame_times and len(frame_times) > 0:
            max_frame_time = max(frame_times)
            assert max_frame_time <= 16, f"Frame time {max_frame_time}ms exceeds 16ms budget"
            
    def test_error_recovery_flow(self):
        """Test error handling and recovery workflow."""
        self.driver.get('file://' + str(Path(__file__).parent / 'fixtures' / 'error-recovery.html'))
        
        # Trigger error condition
        error_trigger = self.wait_for_element('#error-trigger')
        error_trigger.click()
        
        # Verify error event published
        event = self.wait_for_event_bus_event('error:occurred')
        assert event is not None, "Error event not received"
        
        # Verify error UI shown
        error_display = self.wait_for_element('.error-display')
        assert error_display.is_displayed(), "Error UI not shown"
        
        # Test recovery action
        retry_button = self.wait_for_element('#retry-button')
        retry_button.click()
        
        # Verify recovery event
        recovery_event = self.wait_for_event_bus_event('error:recovered')
        assert recovery_event is not None, "Recovery event not received"
        
        # Verify error UI hidden
        time.sleep(0.2)
        assert not error_display.is_displayed(), "Error UI still visible after recovery"
        
    def test_reduced_motion_flow(self):
        """Test reduced motion preference support."""
        # Set reduced motion preference
        self.driver.execute_cdp_cmd('Emulation.setEmulatedMedia', {
            'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]
        })
        
        self.driver.get('file://' + str(Path(__file__).parent / 'fixtures' / 'reduced-motion.html'))
        
        # Trigger animation
        trigger = self.wait_for_element('#animation-trigger')
        trigger.click()
        
        # Verify animation duration is reduced/instant
        animated_element = self.wait_for_element('.animated-element')
        transition_duration = animated_element.value_of_css_property('transition-duration')
        
        # Should be 0s or very short
        duration_ms = float(transition_duration.replace('s', '')) * 1000
        assert duration_ms < 100, f"Animation not reduced: {duration_ms}ms"
        
    def generate_report(self):
        """Generate test report."""
        total = len(self.results)
        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        failed = total - passed
        
        print("\n" + "="*60)
        print("E2E TEST RESULTS")
        print("="*60)
        print(f"Total: {total} | Passed: {passed} | Failed: {failed}")
        print("="*60)
        
        for result in self.results:
            status_icon = "✓" if result['status'] == 'PASS' else "✗"
            print(f"{status_icon} {result['workflow']}")
            if result['status'] == 'FAIL':
                print(f"  Error: {result['error']}")
                
        # Save JSON report
        report_path = Path(__file__).parent / 'reports' / 'e2e-results.json'
        report_path.parent.mkdir(exist_ok=True)
        with open(report_path, 'w') as f:
            json.dump({
                'summary': {'total': total, 'passed': passed, 'failed': failed},
                'results': self.results
            }, f, indent=2)
            
        print(f"\nReport saved to: {report_path}")
        
        return failed == 0


def main():
    parser = argparse.ArgumentParser(description='Run E2E tests for Harmony Design System')
    parser.add_argument('--workflow', help='Run specific workflow test')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--profile', action='store_true', help='Enable performance profiling')
    args = parser.parse_args()
    
    runner = E2ETestRunner(headless=args.headless, profile=args.profile)
    
    try:
        runner.setup_driver()
        
        workflows = [
            'component_interaction_flow',
            'keyboard_navigation_flow',
            'form_submission_flow',
            'animation_performance_flow',
            'error_recovery_flow',
            'reduced_motion_flow'
        ]
        
        if args.workflow:
            workflows = [args.workflow]
            
        for workflow in workflows:
            runner.run_workflow(workflow)
            
        success = runner.generate_report()
        sys.exit(0 if success else 1)
        
    finally:
        runner.teardown_driver()


if __name__ == '__main__':
    main()
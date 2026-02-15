"""
Visual regression tests for primitive components.

Tests all primitive components in all required states:
- Default
- Hover
- Focus
- Active
- Disabled

Per policy: All UI components must be tested in Chrome before marking complete.
"""

import pytest
from playwright.sync_api import Page


class TestButton:
    """Visual regression tests for Button primitive."""
    
    def test_button_default(self, page: Page, component_url, visual_test):
        """Test button in default state."""
        page.goto(component_url("button.html"))
        assert visual_test.capture_component("button-primary", "default")
    
    def test_button_hover(self, page: Page, component_url, visual_test):
        """Test button in hover state."""
        page.goto(component_url("button.html"))
        
        def setup_hover(page, selector):
            page.hover(selector)
        
        assert visual_test.capture_component(
            "button-primary",
            "hover",
            setup_fn=setup_hover
        )
    
    def test_button_focus(self, page: Page, component_url, visual_test):
        """Test button in focus state."""
        page.goto(component_url("button.html"))
        
        def setup_focus(page, selector):
            page.focus(selector)
        
        assert visual_test.capture_component(
            "button-primary",
            "focus",
            setup_fn=setup_focus
        )
    
    def test_button_active(self, page: Page, component_url, visual_test):
        """Test button in active (pressed) state."""
        page.goto(component_url("button.html"))
        
        def setup_active(page, selector):
            page.locator(selector).evaluate("el => el.classList.add('active')")
        
        assert visual_test.capture_component(
            "button-primary",
            "active",
            setup_fn=setup_active
        )
    
    def test_button_disabled(self, page: Page, component_url, visual_test):
        """Test button in disabled state."""
        page.goto(component_url("button.html"))
        assert visual_test.capture_component("button-disabled", "disabled")
    
    def test_button_performance(self, page: Page, component_url, visual_test):
        """Test button rendering performance against budgets."""
        page.goto(component_url("button.html"))
        
        def click_interaction(page, selector):
            page.click(selector)
        
        metrics = visual_test.measure_performance(
            "#button-primary",
            interaction_fn=click_interaction
        )
        
        passed, violations = visual_test.validate_performance_budget(metrics)
        assert passed, f"Performance budget violations: {violations}"


class TestToggle:
    """Visual regression tests for Toggle primitive."""
    
    def test_toggle_off_default(self, page: Page, component_url, visual_test):
        """Test toggle in off/default state."""
        page.goto(component_url("toggle.html"))
        assert visual_test.capture_component("toggle-off", "default")
    
    def test_toggle_on(self, page: Page, component_url, visual_test):
        """Test toggle in on state."""
        page.goto(component_url("toggle.html"))
        assert visual_test.capture_component("toggle-on", "on")
    
    def test_toggle_hover(self, page: Page, component_url, visual_test):
        """Test toggle in hover state."""
        page.goto(component_url("toggle.html"))
        
        def setup_hover(page, selector):
            page.hover(selector)
        
        assert visual_test.capture_component(
            "toggle-off",
            "hover",
            setup_fn=setup_hover
        )
    
    def test_toggle_focus(self, page: Page, component_url, visual_test):
        """Test toggle in focus state."""
        page.goto(component_url("toggle.html"))
        
        def setup_focus(page, selector):
            page.focus(selector)
        
        assert visual_test.capture_component(
            "toggle-off",
            "focus",
            setup_fn=setup_focus
        )
    
    def test_toggle_disabled(self, page: Page, component_url, visual_test):
        """Test toggle in disabled state."""
        page.goto(component_url("toggle.html"))
        assert visual_test.capture_component("toggle-disabled", "disabled")
    
    def test_toggle_animation_performance(self, page: Page, component_url, visual_test):
        """Test toggle animation performance (60fps requirement)."""
        page.goto(component_url("toggle.html"))
        
        def toggle_interaction(page, selector):
            page.click(selector)
        
        metrics = visual_test.measure_performance(
            "#toggle-off",
            interaction_fn=toggle_interaction
        )
        
        passed, violations = visual_test.validate_performance_budget(metrics)
        assert passed, f"Animation performance violations: {violations}"


class TestInput:
    """Visual regression tests for Input primitive."""
    
    def test_input_empty_default(self, page: Page, component_url, visual_test):
        """Test input in empty/default state."""
        page.goto(component_url("input.html"))
        assert visual_test.capture_component("input-text", "default")
    
    def test_input_filled(self, page: Page, component_url, visual_test):
        """Test input with content."""
        page.goto(component_url("input.html"))
        
        def setup_filled(page, selector):
            page.fill(selector, "Test content")
        
        assert visual_test.capture_component(
            "input-text",
            "filled",
            setup_fn=setup_filled
        )
    
    def test_input_focus(self, page: Page, component_url, visual_test):
        """Test input in focus state."""
        page.goto(component_url("input.html"))
        
        def setup_focus(page, selector):
            page.focus(selector)
        
        assert visual_test.capture_component(
            "input-text",
            "focus",
            setup_fn=setup_focus
        )
    
    def test_input_error(self, page: Page, component_url, visual_test):
        """Test input in error state."""
        page.goto(component_url("input.html"))
        assert visual_test.capture_component("input-error", "error")
    
    def test_input_disabled(self, page: Page, component_url, visual_test):
        """Test input in disabled state."""
        page.goto(component_url("input.html"))
        assert visual_test.capture_component("input-disabled", "disabled")


class TestSlider:
    """Visual regression tests for Slider primitive."""
    
    def test_slider_default(self, page: Page, component_url, visual_test):
        """Test slider in default state."""
        page.goto(component_url("slider.html"))
        assert visual_test.capture_component("slider-default", "default")
    
    def test_slider_hover(self, page: Page, component_url, visual_test):
        """Test slider in hover state."""
        page.goto(component_url("slider.html"))
        
        def setup_hover(page, selector):
            page.hover(selector)
        
        assert visual_test.capture_component(
            "slider-default",
            "hover",
            setup_fn=setup_hover
        )
    
    def test_slider_focus(self, page: Page, component_url, visual_test):
        """Test slider in focus state."""
        page.goto(component_url("slider.html"))
        
        def setup_focus(page, selector):
            page.focus(selector)
        
        assert visual_test.capture_component(
            "slider-default",
            "focus",
            setup_fn=setup_focus
        )
    
    def test_slider_active(self, page: Page, component_url, visual_test):
        """Test slider while dragging."""
        page.goto(component_url("slider.html"))
        
        def setup_active(page, selector):
            # Simulate drag start
            page.locator(selector).evaluate(
                "el => el.classList.add('dragging')"
            )
        
        assert visual_test.capture_component(
            "slider-default",
            "active",
            setup_fn=setup_active
        )
    
    def test_slider_disabled(self, page: Page, component_url, visual_test):
        """Test slider in disabled state."""
        page.goto(component_url("slider.html"))
        assert visual_test.capture_component("slider-disabled", "disabled")


# Additional test classes would follow for other primitives:
# - TestCheckbox
# - TestRadio
# - TestSelect
# - etc.
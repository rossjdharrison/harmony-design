"""
Visual regression tests for molecule components.

Tests molecule-level components that compose multiple primitives.
"""

import pytest
from playwright.sync_api import Page


class TestFormField:
    """Visual regression tests for FormField molecule."""
    
    def test_form_field_default(self, page: Page, component_url, visual_test):
        """Test form field in default state."""
        page.goto(component_url("form-field.html"))
        assert visual_test.capture_component("form-field-text", "default")
    
    def test_form_field_filled(self, page: Page, component_url, visual_test):
        """Test form field with content."""
        page.goto(component_url("form-field.html"))
        
        def setup_filled(page, selector):
            input_selector = f"{selector} input"
            page.fill(input_selector, "Test value")
        
        assert visual_test.capture_component(
            "form-field-text",
            "filled",
            setup_fn=setup_filled
        )
    
    def test_form_field_error(self, page: Page, component_url, visual_test):
        """Test form field in error state with message."""
        page.goto(component_url("form-field.html"))
        assert visual_test.capture_component("form-field-error", "error")
    
    def test_form_field_disabled(self, page: Page, component_url, visual_test):
        """Test form field in disabled state."""
        page.goto(component_url("form-field.html"))
        assert visual_test.capture_component("form-field-disabled", "disabled")


class TestCard:
    """Visual regression tests for Card molecule."""
    
    def test_card_default(self, page: Page, component_url, visual_test):
        """Test card in default state."""
        page.goto(component_url("card.html"))
        assert visual_test.capture_component("card-default", "default")
    
    def test_card_hover(self, page: Page, component_url, visual_test):
        """Test card in hover state."""
        page.goto(component_url("card.html"))
        
        def setup_hover(page, selector):
            page.hover(selector)
        
        assert visual_test.capture_component(
            "card-interactive",
            "hover",
            setup_fn=setup_hover
        )
    
    def test_card_loading(self, page: Page, component_url, visual_test):
        """Test card in loading state."""
        page.goto(component_url("card.html"))
        assert visual_test.capture_component("card-loading", "loading")
    
    def test_card_empty(self, page: Page, component_url, visual_test):
        """Test card in empty state."""
        page.goto(component_url("card.html"))
        assert visual_test.capture_component("card-empty", "empty")


# Additional molecule tests would follow
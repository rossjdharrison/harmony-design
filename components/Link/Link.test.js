/**
 * @fileoverview Tests for Polymorphic Link Component
 * @module components/Link/Link.test
 */

import { HarmonyLink } from './Link.js';

describe('HarmonyLink', () => {
  let link;

  beforeEach(() => {
    link = document.createElement('harmony-link');
    document.body.appendChild(link);
  });

  afterEach(() => {
    document.body.removeChild(link);
  });

  describe('Basic Rendering', () => {
    it('should render as anchor element by default', () => {
      link.href = '/test';
      link.textContent = 'Test Link';
      
      const anchor = link.shadowRoot.querySelector('a');
      expect(anchor).toBeTruthy();
      expect(anchor.getAttribute('href')).toBe('/test');
    });

    it('should render as router link when as="router-link"', () => {
      link.href = '/test';
      link.as = 'router-link';
      link.textContent = 'Test Link';
      
      const routerLink = link.shadowRoot.querySelector('.link');
      expect(routerLink).toBeTruthy();
      expect(routerLink.getAttribute('data-href')).toBe('/test');
      expect(routerLink.getAttribute('role')).toBe('link');
    });
  });

  describe('Attributes', () => {
    it('should update href via property', () => {
      link.href = '/new-path';
      expect(link.getAttribute('href')).toBe('/new-path');
    });

    it('should update href via attribute', () => {
      link.setAttribute('href', '/attr-path');
      expect(link.href).toBe('/attr-path');
    });

    it('should handle disabled state', () => {
      link.disabled = true;
      expect(link.hasAttribute('disabled')).toBe(true);
      
      const anchor = link.shadowRoot.querySelector('a');
      expect(anchor.hasAttribute('disabled')).toBe(true);
    });

    it('should handle external flag', () => {
      link.external = true;
      expect(link.hasAttribute('external')).toBe(true);
    });
  });

  describe('External Link Detection', () => {
    it('should detect external URLs', () => {
      link.href = 'https://example.com';
      expect(link._isExternalUrl(link.href)).toBe(true);
    });

    it('should detect protocol-relative URLs as external', () => {
      link.href = '//example.com';
      expect(link._isExternalUrl(link.href)).toBe(true);
    });

    it('should not detect internal paths as external', () => {
      link.href = '/internal/path';
      expect(link._isExternalUrl(link.href)).toBe(false);
    });
  });

  describe('Security', () => {
    it('should add noopener noreferrer for external links', () => {
      link.href = 'https://example.com';
      link.external = true;
      
      const anchor = link.shadowRoot.querySelector('a');
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('should add noopener noreferrer for target="_blank"', () => {
      link.href = '/internal';
      link.setAttribute('target', '_blank');
      
      const anchor = link.shadowRoot.querySelector('a');
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('should allow custom rel attribute', () => {
      link.href = '/test';
      link.setAttribute('rel', 'custom');
      
      const anchor = link.shadowRoot.querySelector('a');
      expect(anchor.getAttribute('rel')).toBe('custom');
    });
  });

  describe('Events', () => {
    it('should publish navigation event on click', (done) => {
      link.href = '/test';
      link.textContent = 'Test';
      
      link.addEventListener('harmony:navigation', (e) => {
        expect(e.detail.href).toBe('/test');
        expect(e.detail.type).toBe('a');
        expect(e.detail.external).toBe(false);
        done();
      });
      
      const anchor = link.shadowRoot.querySelector('a');
      anchor.click();
    });

    it('should publish router navigation event for router links', (done) => {
      link.href = '/test';
      link.as = 'router-link';
      link.textContent = 'Test';
      
      link.addEventListener('harmony:router:navigate', (e) => {
        expect(e.detail.href).toBe('/test');
        done();
      });
      
      const routerLink = link.shadowRoot.querySelector('.link');
      routerLink.click();
    });

    it('should not trigger events when disabled', () => {
      link.href = '/test';
      link.disabled = true;
      
      let eventFired = false;
      link.addEventListener('harmony:navigation', () => {
        eventFired = true;
      });
      
      const anchor = link.shadowRoot.querySelector('a');
      anchor.click();
      
      expect(eventFired).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for router links', () => {
      link.as = 'router-link';
      link.href = '/test';
      
      const routerLink = link.shadowRoot.querySelector('.link');
      expect(routerLink.getAttribute('role')).toBe('link');
      expect(routerLink.getAttribute('tabindex')).toBe('0');
    });

    it('should set tabindex to -1 when disabled', () => {
      link.as = 'router-link';
      link.disabled = true;
      
      const routerLink = link.shadowRoot.querySelector('.link');
      expect(routerLink.getAttribute('tabindex')).toBe('-1');
    });

    it('should support custom aria-label', () => {
      link.setAttribute('aria-label', 'Custom Label');
      
      const anchor = link.shadowRoot.querySelector('a');
      expect(anchor.getAttribute('aria-label')).toBe('Custom Label');
    });

    it('should handle keyboard navigation for router links', () => {
      link.as = 'router-link';
      link.href = '/test';
      
      const routerLink = link.shadowRoot.querySelector('.link');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      
      let clicked = false;
      link.addEventListener('harmony:router:navigate', () => {
        clicked = true;
      });
      
      routerLink.dispatchEvent(enterEvent);
      expect(clicked).toBe(true);
    });
  });

  describe('Polymorphic Behavior', () => {
    it('should switch from anchor to router link', () => {
      link.href = '/test';
      expect(link.shadowRoot.querySelector('a')).toBeTruthy();
      
      link.as = 'router-link';
      expect(link.shadowRoot.querySelector('.link')).toBeTruthy();
      expect(link.shadowRoot.querySelector('a')).toBeFalsy();
    });

    it('should switch from router link to anchor', () => {
      link.href = '/test';
      link.as = 'router-link';
      expect(link.shadowRoot.querySelector('.link')).toBeTruthy();
      
      link.as = 'a';
      expect(link.shadowRoot.querySelector('a')).toBeTruthy();
      expect(link.shadowRoot.querySelector('.link[role="link"]')).toBeFalsy();
    });
  });
});
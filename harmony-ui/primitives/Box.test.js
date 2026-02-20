/**
 * @fileoverview Tests for Polymorphic Box Component
 * @module harmony-ui/primitives/Box.test
 */

import PolymorphicBox from './Box.js';

/**
 * Test suite for PolymorphicBox component
 */
describe('PolymorphicBox', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Basic Rendering', () => {
    it('should render as div by default', () => {
      const box = document.createElement('harmony-box');
      container.appendChild(box);
      
      const renderedElement = box.shadowRoot.querySelector('.box');
      expect(renderedElement.tagName.toLowerCase()).toBe('div');
    });

    it('should render as specified element via "as" prop', () => {
      const box = document.createElement('harmony-box');
      box.setAttribute('as', 'section');
      container.appendChild(box);
      
      const renderedElement = box.shadowRoot.querySelector('.box');
      expect(renderedElement.tagName.toLowerCase()).toBe('section');
    });

    it('should change element type when "as" attribute changes', async () => {
      const box = document.createElement('harmony-box');
      box.setAttribute('as', 'div');
      container.appendChild(box);
      
      let renderedElement = box.shadowRoot.querySelector('.box');
      expect(renderedElement.tagName.toLowerCase()).toBe('div');
      
      box.setAttribute('as', 'article');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      renderedElement = box.shadowRoot.querySelector('.box');
      expect(renderedElement.tagName.toLowerCase()).toBe('article');
    });

    it('should project content via slot', () => {
      const box = document.createElement('harmony-box');
      const content = document.createElement('p');
      content.textContent = 'Test content';
      box.appendChild(content);
      container.appendChild(box);
      
      const slot = box.shadowRoot.querySelector('slot');
      expect(slot).toBeTruthy();
      expect(box.textContent).toBe('Test content');
    });
  });

  describe('Style Attributes', () => {
    it('should apply padding attribute', () => {
      const box = document.createElement('harmony-box');
      box.setAttribute('padding', 'space-4');
      container.appendChild(box);
      
      const element = box.shadowRoot.querySelector('.box');
      expect(element.style.padding).toContain('space-4');
    });

    it('should apply margin attribute', () => {
      const box = document.createElement('harmony-box');
      box.setAttribute('margin', 'space-2');
      container.appendChild(box);
      
      const element = box.shadowRoot.querySelector('.box');
      expect(element.style.margin).toContain('space-2');
    });

    it('should apply display attribute', () => {
      const box = document.createElement('harmony-box');
      box.setAttribute('display', 'flex');
      container.appendChild(box);
      
      const element = box.shadowRoot.querySelector('.box');
      expect(element.style.display).toBe('flex');
    });

    it('should apply flex properties', () => {
      const box = document.createElement('harmony-box');
      box.setAttribute('display', 'flex');
      box.setAttribute('flex-direction', 'column');
      box.setAttribute('align-items', 'center');
      box.setAttribute('justify-content', 'space-between');
      box.setAttribute('gap', 'space-3');
      container.appendChild(box);
      
      const element = box.shadowRoot.querySelector('.box');
      expect(element.style.display).toBe('flex');
      expect(element.style.flexDirection).toBe('column');
      expect(element.style.alignItems).toBe('center');
      expect(element.style.justifyContent).toBe('space-between');
      expect(element.style.gap).toContain('space-3');
    });

    it('should apply dimensions', () => {
      const box = document.createElement('harmony-box');
      box.setAttribute('width', '100px');
      box.setAttribute('height', '50px');
      container.appendChild(box);
      
      const element = box.shadowRoot.querySelector('.box');
      expect(element.style.width).toBe('100px');
      expect(element.style.height).toBe('50px');
    });

    it('should apply background and border', () => {
      const box = document.createElement('harmony-box');
      box.setAttribute('background', 'color-primary');
      box.setAttribute('border', '1px solid black');
      box.setAttribute('border-radius', 'radius-md');
      container.appendChild(box);
      
      const element = box.shadowRoot.querySelector('.box');
      expect(element.style.background).toContain('color-primary');
      expect(element.style.border).toContain('1px solid black');
      expect(element.style.borderRadius).toContain('radius-md');
    });
  });

  describe('Performance', () => {
    it('should render within 16ms budget', () => {
      const startTime = performance.now();
      
      const box = document.createElement('harmony-box');
      box.setAttribute('as', 'section');
      box.setAttribute('padding', 'space-4');
      box.setAttribute('display', 'flex');
      container.appendChild(box);
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(16);
    });

    it('should handle multiple style updates efficiently', () => {
      const box = document.createElement('harmony-box');
      container.appendChild(box);
      
      const startTime = performance.now();
      
      box.setAttribute('padding', 'space-1');
      box.setAttribute('margin', 'space-2');
      box.setAttribute('display', 'flex');
      box.setAttribute('gap', 'space-3');
      
      const updateTime = performance.now() - startTime;
      expect(updateTime).toBeLessThan(16);
    });
  });

  describe('API Methods', () => {
    it('should expose getElement() method', () => {
      const box = document.createElement('harmony-box');
      box.setAttribute('as', 'article');
      container.appendChild(box);
      
      const element = box.getElement();
      expect(element).toBeTruthy();
      expect(element.tagName.toLowerCase()).toBe('article');
    });

    it('should support setStyles() method', () => {
      const box = document.createElement('harmony-box');
      container.appendChild(box);
      
      box.setStyles({
        padding: 'space-4',
        display: 'flex',
        flexDirection: 'column'
      });
      
      expect(box.getAttribute('padding')).toBe('space-4');
      expect(box.getAttribute('display')).toBe('flex');
      expect(box.getAttribute('flex-direction')).toBe('column');
    });
  });

  describe('Shadow DOM', () => {
    it('should use shadow DOM for encapsulation', () => {
      const box = document.createElement('harmony-box');
      container.appendChild(box);
      
      expect(box.shadowRoot).toBeTruthy();
      expect(box.shadowRoot.mode).toBe('open');
    });

    it('should include styles in shadow root', () => {
      const box = document.createElement('harmony-box');
      container.appendChild(box);
      
      const style = box.shadowRoot.querySelector('style');
      expect(style).toBeTruthy();
      expect(style.textContent).toContain('.box');
    });
  });

  describe('Semantic HTML', () => {
    const semanticElements = ['header', 'footer', 'nav', 'aside', 'section', 'article', 'main'];
    
    semanticElements.forEach(tag => {
      it(`should render as ${tag}`, () => {
        const box = document.createElement('harmony-box');
        box.setAttribute('as', tag);
        container.appendChild(box);
        
        const element = box.shadowRoot.querySelector('.box');
        expect(element.tagName.toLowerCase()).toBe(tag);
      });
    });
  });
});
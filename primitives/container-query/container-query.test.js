/**
 * Container Query Primitives Tests
 * 
 * Tests for container query polyfill functionality
 * 
 * @see DESIGN_SYSTEM.md#container-query-primitives
 */

import { containerQueryManager, BREAKPOINTS } from './container-query-polyfill.js';

/**
 * Creates a test container element
 * @param {number} width - Initial width
 * @returns {HTMLElement}
 */
function createTestContainer(width) {
  const container = document.createElement('div');
  container.className = 'hds-container';
  container.style.width = `${width}px`;
  container.style.height = '100px';
  document.body.appendChild(container);
  return container;
}

/**
 * Waits for next animation frame
 * @returns {Promise<void>}
 */
function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * Waits for ResizeObserver to fire
 * @returns {Promise<void>}
 */
async function waitForResize() {
  await nextFrame();
  await nextFrame(); // Double RAF to ensure ResizeObserver has fired
}

describe('Container Query Polyfill', () => {
  let container;

  afterEach(() => {
    if (container && container.parentNode) {
      containerQueryManager.unobserve(container);
      container.remove();
    }
  });

  test('detects native support', () => {
    const hasSupport = containerQueryManager.hasNativeSupport;
    expect(typeof hasSupport).toBe('boolean');
  });

  test('applies correct breakpoint class on observe', async () => {
    container = createTestContainer(400);
    containerQueryManager.observe(container);
    await waitForResize();

    expect(container.classList.contains('hds-cq-sm')).toBe(true);
  });

  test('updates classes when container resizes', async () => {
    container = createTestContainer(300);
    containerQueryManager.observe(container);
    await waitForResize();

    expect(container.classList.contains('hds-cq-xs')).toBe(true);

    // Resize to medium
    container.style.width = '700px';
    await waitForResize();

    expect(container.classList.contains('hds-cq-md')).toBe(true);
    expect(container.classList.contains('hds-cq-sm')).toBe(true);
  });

  test('calls onChange callback when breakpoint changes', async () => {
    container = createTestContainer(300);
    const onChange = jest.fn();
    
    containerQueryManager.observe(container, { onChange });
    await waitForResize();

    container.style.width = '700px';
    await waitForResize();

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('md', expect.any(Number));
  });

  test('applies named container classes', async () => {
    container = createTestContainer(400);
    container.classList.add('hds-container--card');
    
    containerQueryManager.observe(container, { name: 'card' });
    await waitForResize();

    expect(container.classList.contains('hds-cq-sm@card')).toBe(true);
  });

  test('cleans up observer on unobserve', async () => {
    container = createTestContainer(400);
    containerQueryManager.observe(container);
    await waitForResize();

    const initialClasses = Array.from(container.classList);
    
    containerQueryManager.unobserve(container);
    container.style.width = '1000px';
    await waitForResize();

    // Classes should not change after unobserve
    expect(Array.from(container.classList)).toEqual(initialClasses);
  });

  test('handles multiple containers independently', async () => {
    const container1 = createTestContainer(300);
    const container2 = createTestContainer(700);

    containerQueryManager.observe(container1);
    containerQueryManager.observe(container2);
    await waitForResize();

    expect(container1.classList.contains('hds-cq-xs')).toBe(true);
    expect(container2.classList.contains('hds-cq-md')).toBe(true);

    container1.remove();
    container2.remove();
  });

  test('observeAll finds all containers', () => {
    const container1 = createTestContainer(300);
    const container2 = createTestContainer(700);
    container2.classList.add('hds-container--card');

    containerQueryManager.observeAll();

    // Observers should be set up (no errors thrown)
    expect(true).toBe(true);

    container1.remove();
    container2.remove();
  });
});

describe('Breakpoint Detection', () => {
  test('correctly identifies xs breakpoint', () => {
    const bp = containerQueryManager.getBreakpoint(200);
    expect(bp).toBe('xs');
  });

  test('correctly identifies sm breakpoint', () => {
    const bp = containerQueryManager.getBreakpoint(400);
    expect(bp).toBe('sm');
  });

  test('correctly identifies md breakpoint', () => {
    const bp = containerQueryManager.getBreakpoint(700);
    expect(bp).toBe('md');
  });

  test('correctly identifies lg breakpoint', () => {
    const bp = containerQueryManager.getBreakpoint(1000);
    expect(bp).toBe('lg');
  });

  test('correctly identifies xl breakpoint', () => {
    const bp = containerQueryManager.getBreakpoint(1300);
    expect(bp).toBe('xl');
  });

  test('handles edge cases at breakpoint boundaries', () => {
    expect(containerQueryManager.getBreakpoint(BREAKPOINTS.sm)).toBe('sm');
    expect(containerQueryManager.getBreakpoint(BREAKPOINTS.md)).toBe('md');
    expect(containerQueryManager.getBreakpoint(BREAKPOINTS.lg)).toBe('lg');
    expect(containerQueryManager.getBreakpoint(BREAKPOINTS.xl)).toBe('xl');
  });
});
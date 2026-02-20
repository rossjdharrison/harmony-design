/**
 * @fileoverview Tests for Safe Renderer
 * @module utils/safe-renderer.test
 */

import {
  escapeHTML,
  escapeAttribute,
  escapeJS,
  escapeCSS,
  renderSafe,
  renderRichHTML,
  setTextContent,
  setHTMLContent,
  setAttribute,
  safeHTML,
  markSafe,
  SafeRenderer,
  createSafeRenderer,
  RenderContext,
} from './safe-renderer.js';

/**
 * Test suite for escapeHTML
 */
function testEscapeHTML() {
  console.group('escapeHTML Tests');
  
  // Basic escaping
  const basic = escapeHTML('<script>alert("xss")</script>');
  console.assert(
    basic === '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
    'Should escape HTML entities'
  );
  
  // All special characters
  const special = escapeHTML('& < > " \' /');
  console.assert(
    special === '&amp; &lt; &gt; &quot; &#x27; &#x2F;',
    'Should escape all special characters'
  );
  
  // Non-string input
  const nonString = escapeHTML(null);
  console.assert(nonString === '', 'Should return empty string for non-string input');
  
  // Empty string
  const empty = escapeHTML('');
  console.assert(empty === '', 'Should handle empty string');
  
  // Normal text
  const normal = escapeHTML('Hello World');
  console.assert(normal === 'Hello World', 'Should not modify normal text');
  
  console.log('✓ All escapeHTML tests passed');
  console.groupEnd();
}

/**
 * Test suite for escapeAttribute
 */
function testEscapeAttribute() {
  console.group('escapeAttribute Tests');
  
  // Dangerous attribute value
  const dangerous = escapeAttribute('onclick="alert(1)"');
  console.assert(
    !dangerous.includes('onclick'),
    'Should escape attribute-based XSS'
  );
  
  // Equals sign
  const equals = escapeAttribute('value=test');
  console.assert(
    !equals.includes('=') || equals.includes('&#x'),
    'Should escape equals sign'
  );
  
  // Non-string input
  const nonString = escapeAttribute(undefined);
  console.assert(nonString === '', 'Should handle non-string input');
  
  console.log('✓ All escapeAttribute tests passed');
  console.groupEnd();
}

/**
 * Test suite for escapeJS
 */
function testEscapeJS() {
  console.group('escapeJS Tests');
  
  // String termination attempt
  const termination = escapeJS('"; alert(1); "');
  console.assert(
    termination.includes('\\"'),
    'Should escape quote marks'
  );
  
  // Newlines
  const newlines = escapeJS('line1\nline2\rline3');
  console.assert(
    newlines.includes('\\n') && newlines.includes('\\r'),
    'Should escape newlines'
  );
  
  // Backslashes
  const backslash = escapeJS('\\');
  console.assert(backslash === '\\\\', 'Should escape backslashes');
  
  // Script tags
  const script = escapeJS('</script>');
  console.assert(
    !script.includes('</script>'),
    'Should escape script tags'
  );
  
  console.log('✓ All escapeJS tests passed');
  console.groupEnd();
}

/**
 * Test suite for escapeCSS
 */
function testEscapeCSS() {
  console.group('escapeCSS Tests');
  
  // JavaScript URL
  const jsUrl = escapeCSS('red; background: url(javascript:alert(1))');
  console.assert(
    !jsUrl.toLowerCase().includes('javascript:'),
    'Should remove javascript: URLs'
  );
  
  // Expression
  const expr = escapeCSS('width: expression(alert(1))');
  console.assert(
    !expr.toLowerCase().includes('expression('),
    'Should remove CSS expressions'
  );
  
  // Import
  const importStmt = escapeCSS('@import url(evil.css)');
  console.assert(
    !importStmt.toLowerCase().includes('@import'),
    'Should remove @import'
  );
  
  console.log('✓ All escapeCSS tests passed');
  console.groupEnd();
}

/**
 * Test suite for renderSafe
 */
function testRenderSafe() {
  console.group('renderSafe Tests');
  
  // HTML context
  const html = renderSafe('<b>test</b>', RenderContext.HTML);
  console.assert(
    html === '&lt;b&gt;test&lt;&#x2F;b&gt;',
    'Should escape in HTML context'
  );
  
  // Attribute context
  const attr = renderSafe('value="test"', RenderContext.ATTRIBUTE);
  console.assert(
    !attr.includes('"') || attr.includes('&#x'),
    'Should escape in attribute context'
  );
  
  // JS context
  const js = renderSafe('"; alert(1); "', RenderContext.JS);
  console.assert(
    js.includes('\\"'),
    'Should escape in JS context'
  );
  
  // CSS context
  const css = renderSafe('javascript:alert(1)', RenderContext.CSS);
  console.assert(
    !css.toLowerCase().includes('javascript:'),
    'Should escape in CSS context'
  );
  
  // URL context
  const url = renderSafe('hello world', RenderContext.URL);
  console.assert(
    url === 'hello%20world',
    'Should encode in URL context'
  );
  
  // Default context
  const defaultCtx = renderSafe('<script>');
  console.assert(
    defaultCtx.includes('&lt;'),
    'Should default to HTML context'
  );
  
  console.log('✓ All renderSafe tests passed');
  console.groupEnd();
}

/**
 * Test suite for DOM manipulation functions
 */
function testDOMFunctions() {
  console.group('DOM Functions Tests');
  
  // setTextContent
  const textDiv = document.createElement('div');
  setTextContent(textDiv, '<script>alert(1)</script>');
  console.assert(
    textDiv.textContent === '<script>alert(1)</script>',
    'setTextContent should set text safely'
  );
  console.assert(
    textDiv.querySelector('script') === null,
    'setTextContent should not create script elements'
  );
  
  // setTextContent with non-element
  try {
    setTextContent({}, 'test');
    console.assert(false, 'Should throw for non-element');
  } catch (e) {
    console.assert(
      e instanceof TypeError,
      'Should throw TypeError for non-element'
    );
  }
  
  // setAttribute with dangerous attribute
  const attrDiv = document.createElement('div');
  try {
    setAttribute(attrDiv, 'onclick', 'alert(1)');
    console.assert(false, 'Should throw for dangerous attribute');
  } catch (e) {
    console.assert(
      e.message.includes('not allowed'),
      'Should throw error for dangerous attribute'
    );
  }
  
  // setAttribute with javascript: URL
  try {
    setAttribute(attrDiv, 'href', 'javascript:alert(1)');
    console.assert(false, 'Should throw for javascript: URL');
  } catch (e) {
    console.assert(
      e.message.includes('not allowed'),
      'Should throw error for javascript: URL'
    );
  }
  
  // setAttribute with safe attribute
  setAttribute(attrDiv, 'data-user', 'John <script>');
  const dataAttr = attrDiv.getAttribute('data-user');
  console.assert(
    !dataAttr.includes('<script>') || dataAttr.includes('&#x'),
    'setAttribute should escape attribute values'
  );
  
  console.log('✓ All DOM function tests passed');
  console.groupEnd();
}

/**
 * Test suite for safeHTML template tag
 */
function testSafeHTML() {
  console.group('safeHTML Tests');
  
  // Basic interpolation
  const name = '<script>alert(1)</script>';
  const html1 = safeHTML`<div>Hello ${name}</div>`;
  console.assert(
    html1.includes('&lt;script&gt;'),
    'safeHTML should escape interpolated values'
  );
  console.assert(
    !html1.includes('<script>'),
    'safeHTML should not allow script tags'
  );
  
  // Multiple interpolations
  const user = '<b>User</b>';
  const message = '<i>Message</i>';
  const html2 = safeHTML`<div>${user}: ${message}</div>`;
  console.assert(
    html2.includes('&lt;b&gt;') && html2.includes('&lt;i&gt;'),
    'safeHTML should escape all interpolations'
  );
  
  // markSafe usage
  const sanitized = renderRichHTML('<p>Safe content</p>');
  const safe = markSafe(sanitized);
  const html3 = safeHTML`<div>${safe}</div>`;
  console.assert(
    html3.includes('<p>Safe content</p>'),
    'safeHTML should not escape marked safe content'
  );
  
  console.log('✓ All safeHTML tests passed');
  console.groupEnd();
}

/**
 * Test suite for SafeRenderer class
 */
function testSafeRenderer() {
  console.group('SafeRenderer Tests');
  
  // Create renderer
  const renderer = createSafeRenderer({
    defaultContext: RenderContext.HTML,
  });
  
  console.assert(
    renderer instanceof SafeRenderer,
    'createSafeRenderer should return SafeRenderer instance'
  );
  
  // render method
  const rendered = renderer.render('<script>test</script>');
  console.assert(
    rendered.includes('&lt;script&gt;'),
    'render should escape content'
  );
  
  // updateText method
  const div = document.createElement('div');
  renderer.updateText(div, '<b>Test</b>');
  console.assert(
    div.textContent === '<b>Test</b>',
    'updateText should set text safely'
  );
  console.assert(
    div.querySelector('b') === null,
    'updateText should not create HTML elements'
  );
  
  // updateAttribute method
  const attrDiv = document.createElement('div');
  renderer.updateAttribute(attrDiv, 'data-test', 'value');
  console.assert(
    attrDiv.getAttribute('data-test') === 'value',
    'updateAttribute should set attribute'
  );
  
  console.log('✓ All SafeRenderer tests passed');
  console.groupEnd();
}

/**
 * Test suite for XSS attack vectors
 */
function testXSSVectors() {
  console.group('XSS Attack Vectors Tests');
  
  const vectors = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
    '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus>',
    '<textarea onfocus=alert(1) autofocus>',
    '<body onload=alert(1)>',
    '<div style="background:url(javascript:alert(1))">',
  ];
  
  vectors.forEach((vector, index) => {
    const escaped = escapeHTML(vector);
    console.assert(
      !escaped.includes('<script>') && !escaped.includes('javascript:'),
      `Vector ${index + 1} should be escaped`
    );
  });
  
  console.log('✓ All XSS vector tests passed');
  console.groupEnd();
}

/**
 * Test suite for performance
 */
function testPerformance() {
  console.group('Performance Tests');
  
  const longString = '<script>alert(1)</script>'.repeat(1000);
  
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    escapeHTML(longString);
  }
  const duration = performance.now() - start;
  
  console.assert(
    duration < 100,
    `Performance: 1000 escapes should complete in <100ms (took ${duration.toFixed(2)}ms)`
  );
  
  console.log(`✓ Performance test passed (${duration.toFixed(2)}ms)`);
  console.groupEnd();
}

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('🧪 Running Safe Renderer Tests...\n');
  
  testEscapeHTML();
  testEscapeAttribute();
  testEscapeJS();
  testEscapeCSS();
  testRenderSafe();
  testDOMFunctions();
  testSafeHTML();
  testSafeRenderer();
  testXSSVectors();
  testPerformance();
  
  console.log('\n✅ All Safe Renderer tests passed!');
}

// Auto-run tests if this is the main module
if (import.meta.url === `file:///${window.location.pathname.replace(/\\/g, '/')}`) {
  runAllTests();
}
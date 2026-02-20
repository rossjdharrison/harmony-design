/**
 * Sortable List Component
 * 
 * A high-performance drag-to-reorder list component with smooth animations.
 * Uses GPU-accelerated transforms for 60fps performance.
 * 
 * @see {@link file://../../DESIGN_SYSTEM.md#sortable-list}
 * 
 * Features:
 * - Mouse and touch support
 * - GPU-accelerated animations
 * - Customizable animation duration
 * - Event-driven architecture
 * - Accessible (keyboard support via native drag-and-drop)
 * 
 * Usage:
 * ```html
 * <sortable-list animation-duration="200">
 *   <div data-id="1">Item 1</div>
 *   <div data-id="2">Item 2</div>
 *   <div data-id="3">Item 3</div>
 * </sortable-list>
 * ```
 * 
 * Events:
 * - sortable-list:drag-start - Fired when drag begins
 * - sortable-list:reorder - Fired when items are reordered
 * - sortable-list:drag-end - Fired when drag ends
 * 
 * Performance:
 * - Uses transform: translateY() for GPU acceleration
 * - No layout thrashing
 * - Minimal DOM manipulation
 * - Target: 60fps during drag operations
 */
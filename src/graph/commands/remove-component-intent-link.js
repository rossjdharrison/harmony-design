/**
 * @fileoverview Command: Remove Component Intent Link
 * 
 * Removes a link between a component and an intent.
 * 
 * Related docs: See DESIGN_SYSTEM.md § Graph Commands → Remove Component Intent Link
 * 
 * @module harmony-design/graph/commands/remove-component-intent-link
 */

/**
 * Removes a component-intent link from the graph.
 * 
 * @param {Object} graphState - Current graph state
 * @param {Object} payload - Command payload
 * @param {string} payload.linkId - ID of the link to remove
 * @returns {{success: boolean, graphState?: Object, error?: string}} Result
 */
export function removeComponentIntentLink(graphState, payload) {
  if (!payload.linkId) {
    return { success: false, error: 'linkId is required' };
  }
  
  const existingLinks = graphState.componentIntentLinks || [];
  const linkIndex = existingLinks.findIndex(link => link.id === payload.linkId);
  
  if (linkIndex === -1) {
    return { success: false, error: `Link ${payload.linkId} not found` };
  }
  
  const newLinks = [
    ...existingLinks.slice(0, linkIndex),
    ...existingLinks.slice(linkIndex + 1)
  ];
  
  const newGraphState = {
    ...graphState,
    componentIntentLinks: newLinks
  };
  
  return { success: true, graphState: newGraphState };
}
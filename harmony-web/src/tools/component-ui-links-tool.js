/**
 * Component UI Links Tool
 * 
 * Queries and displays Component → UI links showing where components
 * are used in the application.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#component-ui-links
 */

import { TypeNavigator } from '../core/type-navigator.js';

/**
 * Tool for querying Component → UI links
 */
export class ComponentUILinksTool {
  /**
   * @param {TypeNavigator} typeNavigator - The type navigator instance
   */
  constructor(typeNavigator) {
    this.typeNavigator = typeNavigator;
  }

  /**
   * Get all UI locations where a component is used
   * 
   * @param {string} componentId - The component ID to query
   * @returns {Promise<Array<{uiLocation: string, filePath: string, lineNumber: number|null, usageContext: string}>>}
   */
  async getUILocations(componentId) {
    const query = {
      type: 'component_ui_links',
      operation: 'get_ui_locations',
      component_id: componentId
    };

    const result = await this.typeNavigator.query(query);
    return result.locations || [];
  }

  /**
   * Get all components used in a specific UI location
   * 
   * @param {string} uiLocation - The UI location to query (e.g., "app-shell")
   * @returns {Promise<Array<{componentId: string, filePath: string, lineNumber: number|null, usageContext: string}>>}
   */
  async getComponentsInUI(uiLocation) {
    const query = {
      type: 'component_ui_links',
      operation: 'get_components_in_ui',
      ui_location: uiLocation
    };

    const result = await this.typeNavigator.query(query);
    return result.components || [];
  }

  /**
   * Get usage count for a component
   * 
   * @param {string} componentId - The component ID to query
   * @returns {Promise<number>}
   */
  async getUsageCount(componentId) {
    const query = {
      type: 'component_ui_links',
      operation: 'get_usage_count',
      component_id: componentId
    };

    const result = await this.typeNavigator.query(query);
    return result.count || 0;
  }

  /**
   * Add a new Component → UI link
   * 
   * @param {string} componentId - The component ID
   * @param {string} uiLocation - The UI location
   * @param {string} filePath - The file path
   * @param {string} usageContext - The usage context (template, dynamic-import, etc.)
   * @param {number|null} lineNumber - Optional line number
   * @returns {Promise<boolean>}
   */
  async addLink(componentId, uiLocation, filePath, usageContext, lineNumber = null) {
    const query = {
      type: 'component_ui_links',
      operation: 'add_link',
      component_id: componentId,
      ui_location: uiLocation,
      file_path: filePath,
      usage_context: usageContext,
      line_number: lineNumber
    };

    const result = await this.typeNavigator.query(query);
    return result.success || false;
  }
}
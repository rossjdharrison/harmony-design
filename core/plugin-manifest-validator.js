/**
 * @fileoverview Plugin Manifest Validator
 * Validates plugin.json manifest files against the JSON Schema.
 * See: harmony-schemas/plugin-manifest.schema.json
 * @module core/plugin-manifest-validator
 */

/**
 * Validates a plugin manifest object against the schema.
 * Uses a lightweight JSON Schema validator implementation.
 * 
 * @param {Object} manifest - The plugin manifest to validate
 * @returns {{valid: boolean, errors: Array<string>}} Validation result
 */
export function validatePluginManifest(manifest) {
  const errors = [];

  // Required fields
  if (!manifest.id) {
    errors.push('Missing required field: id');
  } else if (!/^[a-z0-9-]+$/.test(manifest.id)) {
    errors.push('id must contain only lowercase letters, numbers, and hyphens');
  } else if (manifest.id.length < 3 || manifest.id.length > 64) {
    errors.push('id must be between 3 and 64 characters');
  }

  if (!manifest.name) {
    errors.push('Missing required field: name');
  } else if (manifest.name.length > 128) {
    errors.push('name must not exceed 128 characters');
  }

  if (!manifest.version) {
    errors.push('Missing required field: version');
  } else if (!/^\d+\.\d+\.\d+(-[a-z0-9.-]+)?(\+[a-z0-9.-]+)?$/.test(manifest.version)) {
    errors.push('version must follow semantic versioning (e.g., 1.0.0)');
  }

  if (!manifest.entry) {
    errors.push('Missing required field: entry');
  } else if (!/^[^/].*\.js$/.test(manifest.entry)) {
    errors.push('entry must be a relative path to a .js file');
  }

  // Optional fields validation
  if (manifest.description && manifest.description.length > 500) {
    errors.push('description must not exceed 500 characters');
  }

  if (manifest.author) {
    if (!manifest.author.name) {
      errors.push('author.name is required when author is specified');
    }
    if (manifest.author.email && !isValidEmail(manifest.author.email)) {
      errors.push('author.email must be a valid email address');
    }
    if (manifest.author.url && !isValidUrl(manifest.author.url)) {
      errors.push('author.url must be a valid URL');
    }
  }

  if (manifest.icon && !/^[^/].*\.(svg|png|jpg|jpeg)$/.test(manifest.icon)) {
    errors.push('icon must be a relative path to an image file (.svg, .png, .jpg, .jpeg)');
  }

  if (manifest.category) {
    const validCategories = [
      'audio-effect', 'audio-generator', 'audio-analyzer',
      'ui-component', 'workflow-tool', 'visualization',
      'utility', 'integration'
    ];
    if (!validCategories.includes(manifest.category)) {
      errors.push(`category must be one of: ${validCategories.join(', ')}`);
    }
  }

  if (manifest.tags) {
    if (!Array.isArray(manifest.tags)) {
      errors.push('tags must be an array');
    } else {
      if (manifest.tags.length > 10) {
        errors.push('tags must not exceed 10 items');
      }
      manifest.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push(`tags[${index}] must be a string`);
        } else if (!/^[a-z0-9-]+$/.test(tag)) {
          errors.push(`tags[${index}] must contain only lowercase letters, numbers, and hyphens`);
        } else if (tag.length < 2 || tag.length > 32) {
          errors.push(`tags[${index}] must be between 2 and 32 characters`);
        }
      });
    }
  }

  if (manifest.permissions) {
    const validPermissions = [
      'audio.read', 'audio.write', 'audio.process',
      'storage.read', 'storage.write',
      'network.fetch', 'network.websocket',
      'ui.render', 'ui.overlay',
      'events.subscribe', 'events.publish',
      'gpu.compute', 'midi.input', 'midi.output'
    ];
    if (!Array.isArray(manifest.permissions)) {
      errors.push('permissions must be an array');
    } else {
      manifest.permissions.forEach((perm, index) => {
        if (!validPermissions.includes(perm)) {
          errors.push(`permissions[${index}] is not a valid permission: ${perm}`);
        }
      });
    }
  }

  if (manifest.capabilities) {
    if (manifest.capabilities.audioProcessing) {
      const ap = manifest.capabilities.audioProcessing;
      if (ap.inputChannels !== undefined && (ap.inputChannels < 0 || ap.inputChannels > 32)) {
        errors.push('capabilities.audioProcessing.inputChannels must be between 0 and 32');
      }
      if (ap.outputChannels !== undefined && (ap.outputChannels < 0 || ap.outputChannels > 32)) {
        errors.push('capabilities.audioProcessing.outputChannels must be between 0 and 32');
      }
      if (ap.latency !== undefined && (ap.latency < 0 || ap.latency > 1000)) {
        errors.push('capabilities.audioProcessing.latency must be between 0 and 1000ms');
      }
    }
    if (manifest.capabilities.ui) {
      const ui = manifest.capabilities.ui;
      if (ui.width !== undefined && (ui.width < 100 || ui.width > 4096)) {
        errors.push('capabilities.ui.width must be between 100 and 4096 pixels');
      }
      if (ui.height !== undefined && (ui.height < 100 || ui.height > 4096)) {
        errors.push('capabilities.ui.height must be between 100 and 4096 pixels');
      }
    }
  }

  if (manifest.configuration?.parameters) {
    if (!Array.isArray(manifest.configuration.parameters)) {
      errors.push('configuration.parameters must be an array');
    } else {
      manifest.configuration.parameters.forEach((param, index) => {
        if (!param.id) {
          errors.push(`configuration.parameters[${index}].id is required`);
        } else if (!/^[a-zA-Z0-9_]+$/.test(param.id)) {
          errors.push(`configuration.parameters[${index}].id must contain only letters, numbers, and underscores`);
        }
        if (!param.name) {
          errors.push(`configuration.parameters[${index}].name is required`);
        }
        if (!param.type) {
          errors.push(`configuration.parameters[${index}].type is required`);
        } else {
          const validTypes = ['number', 'boolean', 'string', 'enum', 'color'];
          if (!validTypes.includes(param.type)) {
            errors.push(`configuration.parameters[${index}].type must be one of: ${validTypes.join(', ')}`);
          }
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an email address format.
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates a URL format.
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads and validates a plugin manifest from a URL.
 * 
 * @param {string} manifestUrl - URL to plugin.json
 * @returns {Promise<{manifest: Object|null, errors: Array<string>}>} Loaded manifest or errors
 */
export async function loadAndValidateManifest(manifestUrl) {
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      return {
        manifest: null,
        errors: [`Failed to load manifest: ${response.status} ${response.statusText}`]
      };
    }

    const manifest = await response.json();
    const validation = validatePluginManifest(manifest);

    if (!validation.valid) {
      return {
        manifest: null,
        errors: validation.errors
      };
    }

    return {
      manifest,
      errors: []
    };
  } catch (error) {
    return {
      manifest: null,
      errors: [`Failed to parse manifest: ${error.message}`]
    };
  }
}
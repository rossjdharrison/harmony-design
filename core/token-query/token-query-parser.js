/**
 * @fileoverview Token Query Parser
 * Parses GraphQL-like query strings into executable query objects
 * @module core/token-query/token-query-parser
 */

/**
 * Parse a query string into an AST-like structure
 * @param {string} queryString - GraphQL-like query string
 * @returns {Object} Parsed query object
 * @throws {Error} If query syntax is invalid
 */
export function parseQuery(queryString) {
  const trimmed = queryString.trim();
  
  // Extract query name and arguments
  const queryMatch = trimmed.match(/^(\w+)\s*(?:\((.*?)\))?\s*\{([\s\S]*)\}$/);
  if (!queryMatch) {
    throw new Error('Invalid query syntax. Expected: queryName(args) { fields }');
  }
  
  const [, queryName, argsString, fieldsString] = queryMatch;
  
  return {
    type: 'query',
    name: queryName,
    arguments: parseArguments(argsString || ''),
    fields: parseFields(fieldsString)
  };
}

/**
 * Parse query arguments
 * @param {string} argsString - Arguments string
 * @returns {Object} Parsed arguments
 */
function parseArguments(argsString) {
  if (!argsString.trim()) return {};
  
  const args = {};
  const argPattern = /(\w+)\s*:\s*([^,]+)/g;
  let match;
  
  while ((match = argPattern.exec(argsString)) !== null) {
    const [, key, value] = match;
    args[key] = parseValue(value.trim());
  }
  
  return args;
}

/**
 * Parse field selections
 * @param {string} fieldsString - Fields string
 * @returns {Array<Object>} Parsed fields
 */
function parseFields(fieldsString) {
  const fields = [];
  const lines = fieldsString.split('\n').map(l => l.trim()).filter(Boolean);
  
  for (const line of lines) {
    // Check for nested fields
    const nestedMatch = line.match(/^(\w+)\s*\{([\s\S]*)\}$/);
    if (nestedMatch) {
      const [, fieldName, nestedFields] = nestedMatch;
      fields.push({
        name: fieldName,
        fields: parseFields(nestedFields)
      });
    } else {
      // Simple field
      const fieldName = line.replace(/,$/, '').trim();
      if (fieldName) {
        fields.push({ name: fieldName });
      }
    }
  }
  
  return fields;
}

/**
 * Parse a value string into appropriate type
 * @param {string} valueString - Value string
 * @returns {any} Parsed value
 */
function parseValue(valueString) {
  // String literal
  if (valueString.startsWith('"') && valueString.endsWith('"')) {
    return valueString.slice(1, -1);
  }
  
  // Array literal
  if (valueString.startsWith('[') && valueString.endsWith(']')) {
    const items = valueString.slice(1, -1).split(',').map(v => parseValue(v.trim()));
    return items;
  }
  
  // Boolean
  if (valueString === 'true') return true;
  if (valueString === 'false') return false;
  
  // Null
  if (valueString === 'null') return null;
  
  // Number
  if (/^-?\d+\.?\d*$/.test(valueString)) {
    return parseFloat(valueString);
  }
  
  // Enum or variable (return as string)
  return valueString;
}

/**
 * Validate query against schema
 * @param {Object} parsedQuery - Parsed query object
 * @param {Object} schema - Token query schema
 * @throws {Error} If query is invalid
 */
export function validateQuery(parsedQuery, schema) {
  const queryDef = schema.queries[parsedQuery.name];
  
  if (!queryDef) {
    throw new Error(`Unknown query: ${parsedQuery.name}`);
  }
  
  // Validate arguments
  for (const [argName, argValue] of Object.entries(parsedQuery.arguments)) {
    if (!queryDef.args[argName]) {
      throw new Error(`Unknown argument: ${argName} for query ${parsedQuery.name}`);
    }
  }
  
  // Check required arguments
  for (const [argName, argType] of Object.entries(queryDef.args)) {
    if (argType.endsWith('!') && !(argName in parsedQuery.arguments)) {
      throw new Error(`Required argument missing: ${argName} for query ${parsedQuery.name}`);
    }
  }
}
/**
 * GraphQL Query Executor for Harmony Graph
 * 
 * Lightweight GraphQL execution engine that processes queries against the graph.
 * No external dependencies - implements core GraphQL execution spec.
 * 
 * Related: harmony-graph/graphql/schema.graphql, harmony-graph/graphql/resolvers.js
 * Documentation: See DESIGN_SYSTEM.md § Graph Query Interface
 * 
 * @module harmony-graph/graphql/executor
 */

/**
 * Parse a GraphQL query string into an AST
 * Simplified parser for basic query operations
 * 
 * @param {string} query - GraphQL query string
 * @returns {Object} Query AST
 */
export function parseQuery(query) {
  const trimmed = query.trim();
  
  // Extract operation type and name
  const operationMatch = trimmed.match(/^(query|mutation|subscription)\s+(\w+)?\s*(\([^)]*\))?\s*\{/);
  const operationType = operationMatch ? operationMatch[1] : 'query';
  const operationName = operationMatch ? operationMatch[2] : null;
  
  // Extract variable definitions
  const variableDefsMatch = operationMatch ? operationMatch[3] : null;
  const variables = variableDefsMatch ? parseVariableDefinitions(variableDefsMatch) : {};
  
  // Extract selection set
  const selectionSetMatch = trimmed.match(/\{([^}]+)\}/s);
  const selectionSet = selectionSetMatch ? parseSelectionSet(selectionSetMatch[1]) : [];
  
  return {
    operationType,
    operationName,
    variables,
    selectionSet
  };
}

/**
 * Parse variable definitions from query
 * @param {string} defs - Variable definitions string
 * @returns {Object} Variable map
 */
function parseVariableDefinitions(defs) {
  const variables = {};
  const varMatches = defs.matchAll(/\$(\w+):\s*(\w+!?)/g);
  
  for (const match of varMatches) {
    variables[match[1]] = {
      type: match[2],
      required: match[2].endsWith('!')
    };
  }
  
  return variables;
}

/**
 * Parse selection set (fields and arguments)
 * @param {string} selectionStr - Selection set string
 * @returns {Array} Selection array
 */
function parseSelectionSet(selectionStr) {
  const selections = [];
  const lines = selectionStr.split('\n').map(l => l.trim()).filter(Boolean);
  
  for (const line of lines) {
    // Parse field with arguments
    const fieldMatch = line.match(/^(\w+)(\([^)]*\))?(\s*\{)?/);
    if (!fieldMatch) continue;
    
    const field = {
      name: fieldMatch[1],
      arguments: fieldMatch[2] ? parseArguments(fieldMatch[2]) : {},
      selectionSet: []
    };
    
    // If field has nested selection set, parse it recursively
    if (fieldMatch[3]) {
      const nestedMatch = line.match(/\{([^}]+)\}/s);
      if (nestedMatch) {
        field.selectionSet = parseSelectionSet(nestedMatch[1]);
      }
    }
    
    selections.push(field);
  }
  
  return selections;
}

/**
 * Parse field arguments
 * @param {string} argsStr - Arguments string
 * @returns {Object} Arguments map
 */
function parseArguments(argsStr) {
  const args = {};
  const cleaned = argsStr.slice(1, -1); // Remove parentheses
  const argMatches = cleaned.matchAll(/(\w+):\s*([^,]+)/g);
  
  for (const match of argMatches) {
    const value = match[2].trim();
    
    // Parse value type
    if (value.startsWith('"')) {
      args[match[1]] = value.slice(1, -1);
    } else if (value === 'true' || value === 'false') {
      args[match[1]] = value === 'true';
    } else if (value.startsWith('$')) {
      args[match[1]] = { variable: value.slice(1) };
    } else if (!isNaN(value)) {
      args[match[1]] = parseFloat(value);
    } else {
      args[match[1]] = value;
    }
  }
  
  return args;
}

/**
 * Execute a GraphQL query against resolvers
 * 
 * @param {Object} ast - Query AST from parseQuery
 * @param {Object} resolvers - Resolver map
 * @param {Object} variables - Variable values
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Query result
 */
export async function executeQuery(ast, resolvers, variables = {}, context = {}) {
  const { operationType, selectionSet } = ast;
  
  // Get root resolver
  const rootResolver = resolvers[operationType.charAt(0).toUpperCase() + operationType.slice(1)];
  
  if (!rootResolver) {
    throw new Error(`No resolver for operation type: ${operationType}`);
  }
  
  // Execute selection set
  const result = {};
  
  for (const selection of selectionSet) {
    const resolver = rootResolver[selection.name];
    
    if (!resolver) {
      throw new Error(`No resolver for field: ${selection.name}`);
    }
    
    // Resolve arguments with variables
    const args = resolveArguments(selection.arguments, variables);
    
    // Execute resolver
    const value = await resolver(null, args, context);
    
    // If field has nested selections, resolve them
    if (selection.selectionSet.length > 0 && value) {
      if (Array.isArray(value)) {
        result[selection.name] = await Promise.all(
          value.map(item => resolveSelectionSet(item, selection.selectionSet, resolvers, context))
        );
      } else {
        result[selection.name] = await resolveSelectionSet(value, selection.selectionSet, resolvers, context);
      }
    } else {
      result[selection.name] = value;
    }
  }
  
  return { data: result };
}

/**
 * Resolve arguments with variable substitution
 * @param {Object} args - Argument definitions
 * @param {Object} variables - Variable values
 * @returns {Object} Resolved arguments
 */
function resolveArguments(args, variables) {
  const resolved = {};
  
  for (const [key, value] of Object.entries(args)) {
    if (value && typeof value === 'object' && value.variable) {
      resolved[key] = variables[value.variable];
    } else {
      resolved[key] = value;
    }
  }
  
  return resolved;
}

/**
 * Resolve nested selection set on an object
 * @param {Object} obj - Object to resolve fields on
 * @param {Array} selectionSet - Selection set to resolve
 * @param {Object} resolvers - Resolver map
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Resolved object
 */
async function resolveSelectionSet(obj, selectionSet, resolvers, context) {
  const result = {};
  
  for (const selection of selectionSet) {
    // First check if value exists directly on object
    if (obj[selection.name] !== undefined) {
      result[selection.name] = obj[selection.name];
      continue;
    }
    
    // Look for field resolver
    const typename = obj.__typename || obj.type;
    const typeResolver = resolvers[typename];
    
    if (typeResolver && typeResolver[selection.name]) {
      const args = resolveArguments(selection.arguments, {});
      const value = await typeResolver[selection.name](obj, args, context);
      
      // Recursively resolve nested selections
      if (selection.selectionSet.length > 0 && value) {
        if (Array.isArray(value)) {
          result[selection.name] = await Promise.all(
            value.map(item => resolveSelectionSet(item, selection.selectionSet, resolvers, context))
          );
        } else {
          result[selection.name] = await resolveSelectionSet(value, selection.selectionSet, resolvers, context);
        }
      } else {
        result[selection.name] = value;
      }
    }
  }
  
  return result;
}

/**
 * GraphQL executor class
 * Provides convenience methods for executing queries
 */
export class GraphQLExecutor {
  /**
   * @param {Object} resolvers - Resolver map
   */
  constructor(resolvers) {
    this.resolvers = resolvers;
  }
  
  /**
   * Execute a query string
   * @param {string} query - GraphQL query
   * @param {Object} variables - Query variables
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Query result
   */
  async execute(query, variables = {}, context = {}) {
    try {
      const ast = parseQuery(query);
      return await executeQuery(ast, this.resolvers, variables, context);
    } catch (error) {
      return {
        data: null,
        errors: [{
          message: error.message,
          stack: error.stack
        }]
      };
    }
  }
  
  /**
   * Execute a parsed query AST
   * @param {Object} ast - Query AST
   * @param {Object} variables - Query variables
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Query result
   */
  async executeAST(ast, variables = {}, context = {}) {
    try {
      return await executeQuery(ast, this.resolvers, variables, context);
    } catch (error) {
      return {
        data: null,
        errors: [{
          message: error.message,
          stack: error.stack
        }]
      };
    }
  }
}
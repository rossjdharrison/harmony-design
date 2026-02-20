/**
 * @fileoverview Design Token Query Schema
 * GraphQL-like schema definition for querying design tokens and relationships
 * @module core/token-query/token-query-schema
 */

/**
 * Schema definition for token queries
 * Defines available query types, fields, and relationships
 */
export const TokenQuerySchema = {
  types: {
    Token: {
      fields: {
        id: { type: 'ID', description: 'Unique token identifier' },
        name: { type: 'String', description: 'Token name' },
        value: { type: 'Any', description: 'Token value (can be string, number, object)' },
        type: { type: 'TokenType', description: 'Token category (color, spacing, typography, etc.)' },
        category: { type: 'String', description: 'Token subcategory' },
        path: { type: 'String', description: 'Dot-notation path to token' },
        metadata: { type: 'TokenMetadata', description: 'Additional token metadata' },
        relationships: { type: '[Relationship]', description: 'Related tokens' },
        usedBy: { type: '[String]', description: 'Components using this token' },
        derivedFrom: { type: 'Token', description: 'Parent token if derived' },
        derivatives: { type: '[Token]', description: 'Tokens derived from this one' }
      }
    },
    
    TokenMetadata: {
      fields: {
        description: { type: 'String', description: 'Human-readable description' },
        tags: { type: '[String]', description: 'Searchable tags' },
        deprecated: { type: 'Boolean', description: 'Whether token is deprecated' },
        replacedBy: { type: 'String', description: 'Replacement token ID if deprecated' },
        platform: { type: '[String]', description: 'Target platforms (web, mobile, desktop)' },
        theme: { type: 'String', description: 'Theme context (light, dark, auto)' }
      }
    },
    
    Relationship: {
      fields: {
        type: { type: 'RelationType', description: 'Type of relationship' },
        target: { type: 'Token', description: 'Related token' },
        strength: { type: 'Float', description: 'Relationship strength (0-1)' },
        metadata: { type: 'Any', description: 'Additional relationship data' }
      }
    },
    
    TokenType: {
      enum: ['color', 'spacing', 'typography', 'shadow', 'border', 'radius', 'timing', 'opacity', 'zIndex']
    },
    
    RelationType: {
      enum: ['derives', 'complements', 'contrasts', 'references', 'composes', 'overrides']
    }
  },
  
  queries: {
    token: {
      args: { id: 'ID!' },
      returns: 'Token',
      description: 'Get a single token by ID'
    },
    
    tokens: {
      args: {
        type: 'TokenType',
        category: 'String',
        tags: '[String]',
        search: 'String',
        limit: 'Int',
        offset: 'Int'
      },
      returns: '[Token]',
      description: 'Query tokens with filters'
    },
    
    tokensByPath: {
      args: { path: 'String!' },
      returns: '[Token]',
      description: 'Get tokens matching a path pattern'
    },
    
    relatedTokens: {
      args: {
        id: 'ID!',
        relationshipType: 'RelationType',
        depth: 'Int'
      },
      returns: '[Token]',
      description: 'Get tokens related to a given token'
    },
    
    tokenUsage: {
      args: { id: 'ID!' },
      returns: '[String]',
      description: 'Get components using a token'
    },
    
    tokenDerivatives: {
      args: { id: 'ID!', recursive: 'Boolean' },
      returns: '[Token]',
      description: 'Get all tokens derived from a given token'
    }
  }
};
/**
 * @fileoverview Zod schemas for design tokens
 * @module core/validation/token-schemas
 * 
 * Defines validation schemas for design tokens in the Harmony Design System.
 * Ensures token values are valid and type-safe.
 * 
 * Related: See DESIGN_SYSTEM.md § Design Tokens
 */

import { z } from './zod-lite.js';

/**
 * Color token schema
 * Validates hex colors, rgb/rgba, hsl/hsla
 */
export const ColorTokenSchema = z.object({
  type: z.literal('color'),
  value: z.string().regex(/^(#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\()/),
  description: z.string().optional(),
});

/**
 * Spacing token schema
 * Validates CSS length values
 */
export const SpacingTokenSchema = z.object({
  type: z.literal('spacing'),
  value: z.string().regex(/^\d+(\.\d+)?(px|rem|em|%)$/),
  description: z.string().optional(),
});

/**
 * Typography token schema
 */
export const TypographyTokenSchema = z.object({
  type: z.literal('typography'),
  value: z.object({
    fontFamily: z.string(),
    fontSize: z.string().regex(/^\d+(\.\d+)?(px|rem|em)$/),
    fontWeight: z.union([
      z.number().min(100).max(900),
      z.enum(['normal', 'bold', 'lighter', 'bolder'])
    ]),
    lineHeight: z.union([
      z.string().regex(/^\d+(\.\d+)?(px|rem|em|%)$/),
      z.number()
    ]),
    letterSpacing: z.string().regex(/^-?\d+(\.\d+)?(px|rem|em)$/).optional(),
  }),
  description: z.string().optional(),
});

/**
 * Border radius token schema
 */
export const BorderRadiusTokenSchema = z.object({
  type: z.literal('borderRadius'),
  value: z.string().regex(/^\d+(\.\d+)?(px|rem|em|%)$/),
  description: z.string().optional(),
});

/**
 * Shadow token schema
 */
export const ShadowTokenSchema = z.object({
  type: z.literal('shadow'),
  value: z.string(), // CSS box-shadow value
  description: z.string().optional(),
});

/**
 * Duration token schema (for animations)
 */
export const DurationTokenSchema = z.object({
  type: z.literal('duration'),
  value: z.string().regex(/^\d+(\.\d+)?(ms|s)$/),
  description: z.string().optional(),
});

/**
 * Easing token schema (for animations)
 */
export const EasingTokenSchema = z.object({
  type: z.literal('easing'),
  value: z.string(), // CSS easing function
  description: z.string().optional(),
});

/**
 * Union of all token types
 */
export const TokenSchema = z.union([
  ColorTokenSchema,
  SpacingTokenSchema,
  TypographyTokenSchema,
  BorderRadiusTokenSchema,
  ShadowTokenSchema,
  DurationTokenSchema,
  EasingTokenSchema,
]);

/**
 * Token collection schema
 */
export const TokenCollectionSchema = z.object({
  version: z.string(),
  tokens: z.object({}), // Dynamic keys with TokenSchema values
  metadata: z.object({
    name: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }).optional(),
});

/**
 * Validate a token
 * @param {Object} token - Token to validate
 * @returns {{success: boolean, data?: Object, error?: Object}}
 */
export function validateToken(token) {
  return TokenSchema.safeParse(token);
}

/**
 * Validate a token collection
 * @param {Object} collection - Token collection to validate
 * @returns {{success: boolean, data?: Object, error?: Object}}
 */
export function validateTokenCollection(collection) {
  return TokenCollectionSchema.safeParse(collection);
}
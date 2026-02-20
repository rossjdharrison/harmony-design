/**
 * Type definitions for responsive token system
 */

export interface ResponsiveToken {
  /** Token name (e.g., 'spacing-page-margin') */
  name: string;
  /** Values per breakpoint */
  values: Record<string, string | number>;
  /** CSS unit to append (e.g., 'px', 'rem') */
  unit?: string;
  /** Fallback value for unsupported browsers */
  fallback?: string;
}

export interface ResponsiveTokenOptions {
  /** CSS selector for custom properties */
  selector?: string;
  /** Automatically inject CSS */
  autoInject?: boolean;
}

export type BreakpointName = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type BreakpointListener = (
  newBreakpoint: string,
  oldBreakpoint: string
) => void;

export const DEFAULT_BREAKPOINTS: Record<BreakpointName, number>;

export function registerResponsiveToken(token: ResponsiveToken): void;

export function registerResponsiveTokens(tokens: ResponsiveToken[]): void;

export function getResponsiveTokenValue(
  tokenName: string,
  breakpoint?: string
): string | null;

export function generateCSSCustomProperties(breakpoint?: string): string;

export function generateResponsiveCSS(selector?: string): string;

export function detectCurrentBreakpoint(): string;

export function onBreakpointChange(
  listener: BreakpointListener
): () => void;

export function initResponsiveTokens(options?: ResponsiveTokenOptions): void;

export function injectResponsiveCSS(selector?: string): HTMLStyleElement;

export function getRegisteredTokenNames(): string[];

export function getTokenDefinition(tokenName: string): ResponsiveToken | null;

export function clearTokenRegistry(): void;

export function getCurrentBreakpoint(): string;
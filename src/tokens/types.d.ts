/**
 * @fileoverview TypeScript type declarations for Harmony Design System tokens.
 *
 * These are ambient declarations only — no runtime code, no imports, no npm.
 * They enable type-safe token access in any TypeScript or @ts-check JS file
 * that references the token modules.
 *
 * Usage in a .ts or @ts-check .js file:
 *   /// <reference path="../../src/tokens/types.d.ts" />
 *   import { colors } from '../../tokens/colors.js';
 *   const v: ColorScale = colors.primary; // typed
 */

// ── Color Types ────────────────────────────────────────────────────────────

/** A CSS color string: hex, rgb, rgba, hsl, or named color. */
export type ColorValue = string;

/** A numeric color scale from 50–900 (or 0/1000 for neutral). */
export interface ColorScale {
  50: ColorValue;
  100: ColorValue;
  200: ColorValue;
  300: ColorValue;
  400: ColorValue;
  500: ColorValue;
  600: ColorValue;
  700: ColorValue;
  800: ColorValue;
  900: ColorValue;
}

/** Neutral scale extends with 0 and 1000. */
export interface NeutralColorScale extends ColorScale {
  0: ColorValue;
  1000: ColorValue;
}

/** Semantic color group with light/main/dark/contrast variants. */
export interface SemanticColorGroup {
  light: ColorValue;
  main: ColorValue;
  dark: ColorValue;
  contrast: ColorValue;
}

export interface SemanticColors {
  success: SemanticColorGroup;
  warning: SemanticColorGroup;
  error: SemanticColorGroup;
  info: SemanticColorGroup;
}

export interface UIColors {
  background: {
    primary: ColorValue;
    secondary: ColorValue;
    tertiary: ColorValue;
    inverse: ColorValue;
  };
  text: {
    primary: ColorValue;
    secondary: ColorValue;
    disabled: ColorValue;
    inverse: ColorValue;
  };
  border: {
    light: ColorValue;
    main: ColorValue;
    dark: ColorValue;
  };
  focus: {
    ring: ColorValue;
    ringAlpha: ColorValue;
  };
  overlay: {
    light: ColorValue;
    main: ColorValue;
    dark: ColorValue;
    darker: ColorValue;
  };
}

export interface Colors {
  primary: ColorScale;
  secondary: ColorScale;
  neutral: NeutralColorScale;
  semantic: SemanticColors;
  ui: UIColors;
}

// ── Spacing Types ──────────────────────────────────────────────────────────

/** A CSS dimension string, e.g. '16px', '1rem', '0'. */
export type SpacingValue = string;

export interface SpacingScale {
  none: SpacingValue;
  xxxs: SpacingValue;
  xxs: SpacingValue;
  xs: SpacingValue;
  sm: SpacingValue;
  md: SpacingValue;
  lg: SpacingValue;
  xl: SpacingValue;
  xxl: SpacingValue;
  xxxl: SpacingValue;
}

export interface ComponentSpacing {
  paddingTight: SpacingValue;
  paddingDefault: SpacingValue;
  paddingLoose: SpacingValue;
  marginTight: SpacingValue;
  marginDefault: SpacingValue;
  marginLoose: SpacingValue;
  gapTight: SpacingValue;
  gapDefault: SpacingValue;
  gapLoose: SpacingValue;
  insetTight: SpacingValue;
  insetDefault: SpacingValue;
  insetLoose: SpacingValue;
}

// ── Typography Types ───────────────────────────────────────────────────────

export interface FontFamilies {
  sans: string;
  mono: string;
  display: string;
}

export interface FontSizes {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  xxxl: string;
  display1: string;
  display2: string;
  display3: string;
}

export interface FontWeights {
  light: number;
  regular: number;
  medium: number;
  semibold: number;
  bold: number;
}

export interface LineHeights {
  tight: number;
  normal: number;
  relaxed: number;
  loose: number;
}

export interface LetterSpacing {
  tight: string;
  normal: string;
  wide: string;
  wider: string;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
}

export interface TextStyles {
  displayLarge: TextStyle;
  displayMedium: TextStyle;
  displaySmall: TextStyle;
  headingLarge: TextStyle;
  headingMedium: TextStyle;
  headingSmall: TextStyle;
  bodyLarge: TextStyle;
  bodyMedium: TextStyle;
  bodySmall: TextStyle;
  caption: TextStyle;
  code: TextStyle;
}

// ── Animation Types ────────────────────────────────────────────────────────

export interface DurationTokens {
  instant: string;
  fast: string;
  normal: string;
  slow: string;
  slower: string;
}

export interface EasingTokens {
  linear: string;
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  bounce: string;
  sharp: string;
}

export interface TransitionTokens {
  all: string;
  color: string;
  background: string;
  border: string;
  opacity: string;
  transform: string;
  shadow: string;
  colorAndBackground: string;
  transformAndOpacity: string;
}

export interface AnimationPreset {
  keyframes: string;
  duration: string;
  easing: string;
  fillMode?: string;
  iterationCount?: string;
}

export interface AnimationPresets {
  fadeIn: AnimationPreset;
  fadeOut: AnimationPreset;
  slideInUp: AnimationPreset;
  slideInDown: AnimationPreset;
  scaleIn: AnimationPreset;
  spin: AnimationPreset;
}

// ── Elevation Types ────────────────────────────────────────────────────────

export interface ShadowScale {
  none: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  inner: string;
}

export interface ZIndexScale {
  base: number;
  dropdown: number;
  sticky: number;
  fixed: number;
  modalBackdrop: number;
  modal: number;
  popover: number;
  tooltip: number;
  notification: number;
}

// ── Border Types ───────────────────────────────────────────────────────────

export interface BorderWidthTokens {
  none: string;
  thin: string;
  medium: string;
  thick: string;
}

export interface BorderRadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  full: string;
}

export interface BorderStyleTokens {
  solid: string;
  dashed: string;
  dotted: string;
  none: string;
}

// ── Token Accessor Types ───────────────────────────────────────────────────

/** All design tokens in a single typed record. */
export interface DesignTokens {
  colors: Colors;
  spacing: SpacingScale;
  componentSpacing: ComponentSpacing;
  fontFamilies: FontFamilies;
  fontSizes: FontSizes;
  fontWeights: FontWeights;
  lineHeights: LineHeights;
  letterSpacing: LetterSpacing;
  textStyles: TextStyles;
  duration: DurationTokens;
  easing: EasingTokens;
  transitions: TransitionTokens;
  animations: AnimationPresets;
  lightShadows: ShadowScale;
  darkShadows: ShadowScale;
  zIndex: ZIndexScale;
  borderWidth: BorderWidthTokens;
  borderRadius: BorderRadiusTokens;
  borderStyle: BorderStyleTokens;
}

/** Dot-separated path into DesignTokens, e.g. 'colors.primary.500'. */
export type TokenPath = string;

/** Resolved token value — string for most tokens, number for weights/z-index. */
export type TokenValue = string | number;

/** Result of a token lookup. */
export interface TokenResult {
  path: TokenPath;
  value: TokenValue;
  found: boolean;
}

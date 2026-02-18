# Design Tokens Documentation

This directory contains visual documentation for all design tokens in the Harmony Design System.

## Available Token Documentation

### Color Tokens
- [Primary Colors](primary-colors.html) - Primary scale (50-950) for brand colors
- [Neutral Colors](neutral-colors.html) - Gray scale (50-950) for surfaces and text
- [Accent Colors](accent-colors.html) - Blue, Green, Red, Yellow accent scales
- [Alpha Transparency](alpha-transparency.html) - Opacity variants (10%-50%)

### Typography Tokens
- [Font Size Scale](font-size-scale.html) - 8 steps from xs(10px) to 3xl(32px)
- [Font Weight](font-weight.html) - regular(400), medium(500), semibold(600)
- [Line Height](line-height.html) - tight(1.2), normal(1.5), relaxed(1.8)
- [Letter Spacing](letter-spacing.html) - tight(-0.02em), normal(0), relaxed(0.05em)

### Layout Tokens
- [Spacing Scale](spacing-scale.html) - 4px base unit with 13 steps (0-12)
- [Border Radius](border-radius.html) - 7 steps from none(0) to full(9999)

## Usage

Open any HTML file in a browser to see interactive documentation and examples.

## Implementation

All tokens are implemented as JavaScript modules in the `/tokens` directory:
- `tokens/colors.js` - All color tokens
- `tokens/spacing.js` - Spacing scale
- `tokens/typography.js` - Typography tokens
- `tokens/border-radius.js` - Border radius scale

Each token module includes:
- Token object with all values
- CSS custom property variants
- Helper functions for accessing values
- JSDoc documentation
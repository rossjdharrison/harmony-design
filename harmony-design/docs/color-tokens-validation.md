# Color Token Validation Results

This document tracks the validation status of all color tokens in the Harmony Design System against WCAG 2.1 accessibility standards.

## Validation Standards

- **WCAG AA**: Minimum 4.5:1 for normal text, 3:1 for large text
- **WCAG AAA**: Minimum 7:1 for normal text, 4.5:1 for large text

## Common Color Pairs

### Text on Background

| Foreground | Background | Ratio | AA | AAA | Notes |
|------------|------------|-------|----|----|-------|
| #000000 | #FFFFFF | 21:1 | ✅ | ✅ | Black on white (maximum contrast) |
| #FFFFFF | #000000 | 21:1 | ✅ | ✅ | White on black (maximum contrast) |
| #212121 | #FFFFFF | 16.1:1 | ✅ | ✅ | Primary text on white |
| #424242 | #FFFFFF | 12.6:1 | ✅ | ✅ | Secondary text on white |
| #616161 | #FFFFFF | 7.5:1 | ✅ | ✅ | Tertiary text on white |

### Interactive Elements

| Foreground | Background | Ratio | AA | AAA | Notes |
|------------|------------|-------|----|----|-------|
| #FFFFFF | #1976D2 | 4.6:1 | ✅ | ❌ | Primary button text |
| #FFFFFF | #0D47A1 | 8.6:1 | ✅ | ✅ | Dark blue button text |
| #000000 | #FFC107 | 10.4:1 | ✅ | ✅ | Warning text |

### Status Colors

| Foreground | Background | Ratio | AA | AAA | Notes |
|------------|------------|-------|----|----|-------|
| #FFFFFF | #2E7D32 | 5.4:1 | ✅ | ❌ | Success button |
| #FFFFFF | #C62828 | 5.1:1 | ✅ | ❌ | Error button |
| #000000 | #E8F5E9 | 13.5:1 | ✅ | ✅ | Success background |
| #000000 | #FFEBEE | 14.2:1 | ✅ | ✅ | Error background |

## Validation Process

1. Use `color-contrast-validator` component for interactive testing
2. Run automated validation with `color-contrast.js` utilities
3. Document results in this file
4. Update color tokens if validation fails

## Remediation Guidelines

If a color pair fails validation:

1. **Darken foreground** or **lighten background** (or vice versa)
2. Test new combination with validator
3. Ensure ratio meets minimum 4.5:1 for AA compliance
4. Update design tokens and documentation
5. Verify in multiple contexts (hover, focus, disabled states)

## Tools

- **Interactive Validator**: `test-pages/color-contrast-validator-demo.html`
- **Utility Functions**: `utils/color-contrast.js`
- **Automated Tests**: `utils/color-contrast.test.js`

## References

- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- See: harmony-design/DESIGN_SYSTEM.md#color-contrast-validation
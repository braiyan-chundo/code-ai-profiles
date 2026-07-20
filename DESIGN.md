---
name: Lumina Desktop
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#20201f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#dbc1b9'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#a38c85'
  outline-variant: '#55433d'
  surface-tint: '#ffb59e'
  primary: '#ffb59e'
  on-primary: '#5c1902'
  primary-container: '#d97757'
  on-primary-container: '#541400'
  inverse-primary: '#99462a'
  secondary: '#c8c6c4'
  on-secondary: '#30302f'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b3'
  tertiary: '#cdc6b9'
  on-tertiary: '#343027'
  tertiary-container: '#979186'
  on-tertiary-container: '#2e2a22'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59e'
  on-primary-fixed: '#390b00'
  on-primary-fixed-variant: '#7a2f15'
  secondary-fixed: '#e4e2e0'
  secondary-fixed-dim: '#c8c6c4'
  on-secondary-fixed: '#1b1c1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#eae1d4'
  tertiary-fixed-dim: '#cdc6b9'
  on-tertiary-fixed: '#1e1b13'
  on-tertiary-fixed-variant: '#4b463d'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 260px
  gutter: 24px
  margin-page: 40px
  unit-xs: 4px
  unit-sm: 8px
  unit-md: 16px
  unit-lg: 24px
  unit-xl: 32px
---

## Brand & Style
The design system is engineered for a premium desktop experience, drawing inspiration from high-end hardware and modern operating systems. The brand personality is **sophisticated, precise, and effortless**. It targets power users who value clarity and a focused workspace.

The style is a refined **Glassmorphism** mixed with **Minimalism**. It emphasizes the physical properties of light and material: surfaces use varying levels of translucency (acrylic effects), vibrant background blurs, and thin, high-contrast "inner strokes" that simulate the edge of a glass pane. The emotional response should be one of calm control and premium craftsmanship.

## Colors
The palette is rooted in a "Studio" aesthetic, moving away from pure digital blues toward warmer, more organic tones.

- **Primary:** A warm, muted terracotta/clay used sparingly for call-to-actions and active states.
- **Anthracite & Grays:** The foundation of the dark mode. We use a deep black for the lowest layer and varied "Anthracite" shades for floating panels.
- **Accents:** High-quality whites and "Paper" grays are used for primary text to ensure maximum legibility against dark glass backgrounds.
- **Translucency:** Backgrounds should utilize 60-80% opacity with a 30px background blur (Gaussian) to allow desktop wallpapers or underlying content to bleed through subtly.

## Typography
This design system uses **Inter** for its clean, Swiss-inspired readability and high x-height, which performs exceptionally well on high-DPI desktop displays. For technical labels and instance management, we use **Geist** to provide a precise, developer-tool aesthetic.

- **Headlines:** Use tight letter-spacing and semi-bold weights to create a "locked-in" professional look.
- **Body:** Standardized at 14px for density without sacrificing legibility.
- **Labels:** Always uppercase with slight tracking for secondary metadata and sidebar headers.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid** model common in desktop apps.
- **Sidebar:** Fixed width (260px) with a semi-transparent acrylic background.
- **Main Content:** Fluid width with a maximum container of 1200px to maintain readability.
- **Margins:** Large 40px outer margins provide "breathing room" that signifies a premium application.
- **Grid:** A 12-column grid is used for dashboard views, while single-column layouts are preferred for focused session management.

## Elevation & Depth
Depth is achieved through **material layering** rather than traditional drop shadows.

1.  **Level 0 (Background):** Solid deep anthracite or the desktop wallpaper.
2.  **Level 1 (Sidebar/Base):** 70% opacity with 40px blur. 1px solid border at 10% white (inner glow).
3.  **Level 2 (Cards/Modals):** 85% opacity with 30px blur. Subtle 0.5px white border and a 20px "Ambient Shadow" (Black, 20% opacity).
4.  **Level 3 (Popovers/Tooltips):** Near-opaque (95%) with a crisp 1px border.

Shadows should be "long and soft," simulating a large, overhead light source. Avoid "fuzzy" dark halos.

## Shapes
We use a **highly rounded** geometric language.
- **Standard UI (Buttons/Inputs):** 8px (0.5rem) radius.
- **Large Containers (Cards/Modals):** 16px (1rem) radius.
- **Sidebar Active States:** Use "Squircle" (continuous curvature) shapes where possible for a more organic, Apple-like feel.

## Components
- **Sidebar Navigation:** Use SF-style iconography (thin stroke) with a 24px box. Active states should use a subtle background tint (Anthracite + 5% white) rather than a heavy color block.
- **Session Cards:** These are "glass bricks." Use a subtle gradient (top-left to bottom-right) from 10% white to 5% white. Include a "status dot" using the Primary color.
- **Instance Management Toggles:** A custom pill-shaped track. When "On," the track should use the Primary color; when "Off," it should blend into the glass background with only a stroke visible.
- **"Add Session" Modal:** Should appear as a centered floating pane. Use a heavy backdrop blur (20px) on the content behind it to pull focus. The primary action button should be the only element using a solid, non-transparent color.
- **Iconography:** Use line-based icons with a consistent 1.5pt stroke weight. Rounded ends on all paths.

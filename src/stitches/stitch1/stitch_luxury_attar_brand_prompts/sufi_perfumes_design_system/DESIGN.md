---
name: Sufi Perfumes Design System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d0c5b4'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#999080'
  outline-variant: '#4d4639'
  surface-tint: '#e4c278'
  primary: '#e6c479'
  on-primary: '#3f2e00'
  primary-container: '#c9a961'
  on-primary-container: '#533d00'
  inverse-primary: '#745b1b'
  secondary: '#ecc165'
  on-secondary: '#402d00'
  secondary-container: '#795900'
  on-secondary-container: '#ffd375'
  tertiary: '#f1bf8c'
  on-tertiary: '#472a03'
  tertiary-container: '#d3a473'
  on-tertiary-container: '#5a3a12'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf9b'
  primary-fixed-dim: '#e4c278'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5a4302'
  secondary-fixed: '#ffdfa0'
  secondary-fixed-dim: '#ecc165'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#ffdcbc'
  tertiary-fixed-dim: '#efbd8a'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#614018'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Bodoni Moda
    fontSize: 72px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Bodoni Moda
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Bodoni Moda
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.3'
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Bodoni Moda
    fontSize: 28px
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '300'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.2em
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 80px
  margin-mobile: 20px
  section-gap: 120px
---

## Brand & Style
The design system is engineered to evoke the atmosphere of a high-end atelier at midnight. It leans heavily into a **Minimalist-Cinematic** style, prioritizing negative space and dramatic lighting to treat each product as a piece of sacred art. 

The brand personality is intellectual, mysterious, and unapologetically opulent. It avoids the clutter of traditional e-commerce, opting instead for a "museum-gallery" approach where the interface recedes to allow the liquid gold of the fragrances and the texture of the glass bottles to command attention. Every interaction must feel intentional and weighted, mimicking the physical act of opening a velvet-lined box or uncapping a heavy crystal flacon.

## Colors
The palette is built on a foundation of "absolute blacks" to create infinite depth. 

- **Primary Backgrounds:** Use `#0d0d0d` for the main canvas to ensure images with dark backgrounds bleed seamlessly into the UI. Use `#1a1a1a` for elevated surfaces like cards or navigation bars.
- **Metallics:** `#c9a961` (Premium Gold) is the primary interactive color. It should be used for call-to-action buttons and critical highlights. `#d4a574` (Rose Gold) acts as a softer secondary accent for decorative elements.
- **Warmth:** `#8b6914` (Amber) provides the "glow" for hover states and rim-lighting effects.
- **Structure:** `#3d3d2d` (Woody Brown) is used for subtle borders and secondary text to maintain a low-contrast, moody atmosphere.

## Typography
The typography system relies on the tension between the romantic, high-contrast strokes of **Bodoni Moda** and the surgical precision of **Hanken Grotesk**.

- **Headlines:** Use Bodoni Moda for all editorial headings. The high-contrast serifs convey a heritage of luxury. Keep tracking tight for large display sizes and slightly open for smaller headlines.
- **Body:** Hanken Grotesk should be used at a light weight (300) for long-form descriptions to ensure a modern, clean feel that doesn't compete with the headlines.
- **Metadata:** All labels, price points, and navigation items should use `label-caps` to provide a rhythmic, structured feel to the interface.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to maintain "editorial control" over white space. 

- **Desktop:** A 12-column grid with a maximum container width of 1440px. Margins are intentionally wide (80px) to frame the content like a photograph.
- **Section Gaps:** Use generous vertical spacing (120px+) between sections to allow the brand to "breathe" and prevent a cluttered e-commerce appearance.
- **Rhythm:** All spacing should be multiples of 8px. Use larger padding inside containers than the gutters between them to reinforce grouping and "preciousness."

## Elevation & Depth
This design system rejects traditional drop shadows in favor of **Tonal Layering** and **Rim Lighting**.

1.  **Surfaces:** Depth is created by moving from `#0d0d0d` (Level 0) to `#1a1a1a` (Level 1).
2.  **Rim Lighting:** Instead of shadows, apply a 1px inner border or a very soft outer "glow" using a low-opacity Amber (#8b6914) to the top and left edges of cards. This mimics the way a spotlight catches the edge of a perfume bottle.
3.  **Backdrop Blur:** For overlays (navigation menus, carts), use a heavy background blur (20px+) combined with a 70% opacity charcoal fill to create a "smoked glass" effect.

## Shapes
The shape language is strictly **Sharp (0)**. 

To maintain the architectural and timeless feel of luxury perfume packaging, rounded corners are avoided. Everything from buttons to image containers and input fields should utilize 90-degree angles. This crispness reflects the precision of glass-cutting and high-end fragrance flacons.

## Components

- **Primary Buttons:** Solid `#c9a961` (Gold) background with `#0d0d0d` text. On hover, the background transitions to a gradient of Amber (`#8b6914`) and the button gains a subtle 4px outer glow.
- **Secondary Buttons:** Ghost style with a 1px border in `#3d3d2d`. On hover, the border brightens to Gold and the text takes on a slight golden shimmer.
- **Product Cards:** Minimalist frames. Image occupies 80% of the card area. The "rim lighting" effect is applied only on hover to signify interactivity.
- **Input Fields:** Bottom-border only (1px `#3d3d2d`). When focused, the border expands to 2px and transitions to Gold. Labels use the `label-caps` style and sit above the line.
- **Progressive Disclosure:** Use "The scent profile" accordions with extremely thin dividers and smooth vertical expansion to hide technical details until the user requests them.
- **Scent Notes (Chips):** Small, sharp-edged boxes with a `#1a1a1a` background and Rose Gold (#d4a574) text, indicating the ingredients (e.g., "Oud", "Sandalwood").
# Design System Specification: High-End Editorial Liquid Interface

## 1. Overview & Creative North Star: "The Obsidian Fluidity"
The Creative North Star for this system is **The Obsidian Fluidity**. We are moving away from the rigid, "boxy" layout of traditional SaaS dashboards toward a digital environment that feels like polished volcanic glass submerged in a kinetic, neon-lit tide. 

This system rejects the "standard" web grid in favor of **Intentional Asymmetry**. We achieve a premium feel by layering translucent glass surfaces over deep, fluid backgrounds. The interface should feel like it is floating; elements are never "locked" into a flat plane but exist in a 3D space defined by light, blur, and refractive depth.

## 2. Colors & Surface Philosophy

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined through **Tonal Transitions** or **Refractive Glass**. Instead of a line, use a shift from `surface` (#0e0e0e) to `surface_container_low` (#131313) to denote a new section.

### The Obsidian Palette
- **Primary Glow:** `primary` (#cc97ff) - Used for high-action states and "AI Analysis" highlights.
- **Secondary Neon:** `secondary` (#53ddfc) - Used for technical data and secondary "Liquid" accents.
- **Surface Hierarchy:** 
    - Base Layer: `surface` (#0e0e0e)
    - Nested Containers: `surface_container` (#191919) up to `surface_container_highest` (#262626).
- **The Obsidian Terminal:** Use `surface_container_lowest` (#000000) exclusively for code execution blocks and terminal environments to create a "void" effect that recedes into the screen.

### Glass & Gradient Rule
All floating panels must use a custom Glassmorphism stack:
- **Background:** `surface_variant` (#262626) at 40% - 60% opacity.
- **Backdrop Blur:** 20px - 40px.
- **Inner Glow:** A 1px inside stroke using `outline_variant` (#484848) at 20% opacity to mimic the "catch-light" on the edge of a glass pane.

## 3. Typography: Technical Elegance
We contrast the organic "Liquid" feel of the background with highly structured, geometric typography.

- **Display (Space Grotesk):** Use for "Hero" moments and GitHub star counts. The wide apertures of Space Grotesk feel engineered and futuristic.
- **Body & Titles (Manrope):** A balanced, modern sans-serif that ensures readability against complex glass backgrounds.
- **The Terminal (JetBrains Mono):** For all code blocks, metadata, and AI logs. This conveys a "developer-first" precision.

| Role | Token | Font | Size | Weight |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | display-lg | Space Grotesk | 3.5rem | 700 |
| **Section Header** | headline-md | Space Grotesk | 1.75rem | 500 |
| **Code/Data** | N/A | JetBrains Mono| 0.875rem | 400 |
| **Main Body** | body-lg | Manrope | 1rem | 400 |

## 4. Elevation & Depth: The Layering Principle

Depth is not achieved through shadows alone, but through **Luminance Stacking**.

1.  **Level 0 (The Liquid):** Animated gradients moving between `primary_dim` (#9c48ea) and `secondary_container` (#00687a).
2.  **Level 1 (The Canvas):** `surface` (#0e0e0e) with a subtle grain texture.
3.  **Level 2 (The Obsidian Void):** `surface_container_lowest` (#000000) for terminals—feels "cut out" of the screen.
4.  **Level 3 (Floating Glass):** `surface_container_high` (#1f1f1f) with 20px blur. This is for main interaction cards.

**The Ghost Border Fallback:** If high-contrast accessibility is required, use a `primary` (#cc97ff) border at 10% opacity. Never use pure white or solid grey borders.

## 5. Signature Components

### The Obsidian Terminal
- **Background:** #000000.
- **Font:** JetBrains Mono.
- **AI Analysis State:** When active, the terminal should have a `primary` (#cc97ff) outer glow (blur: 30px, opacity: 0.15) and a `secondary` (#53ddfc) "scanning" line that moves vertically across the block.
- **Corner Radius:** `md` (1.5rem).

### GitHub Star Indicator
- **Style:** A floating glass pill (pill shape: `full`).
- **Background:** `surface_container_highest` at 50% opacity.
- **Icon:** A solid `tertiary` (#ff6daf) star with a `tertiary_dim` drop-shadow glow.
- **Placement:** Top-right of the Hero section, overlapping the header boundary to break the grid.

### Glass Action Buttons
- **Primary:** Gradient fill from `primary` to `primary_dim`. Roundness: `md` (1.5rem).
- **Secondary:** Transparent fill, `outline_variant` ghost border, `on_surface` text.
- **Hover State:** Increase backdrop blur of the button itself and add a subtle 2px `primary` inner-glow.

### The Fluid List
- **Rule:** No dividers. 
- **Structure:** List items sit on the base `surface`. On hover, a `surface_container` (#191919) glass "blob" appears behind the item using the `lg` (2rem) corner radius.

## 6. Do’s and Don’ts

### Do:
- **Use Intentional Overlap:** Let a glass card partially cover a background "liquid" swirl to show off the refractive blur.
- **Embrace Wide Tracking:** Increase letter-spacing on `label-sm` text for a premium, editorial feel.
- **Nesting:** Place `surface_container_lowest` blocks inside `surface_container_high` glass panels to create "recessed" technical areas.

### Don't:
- **Don't use 100% Opacity Borders:** It breaks the "Liquid Glass" illusion.
- **Don't use Pure White Text for Everything:** Use `on_surface_variant` (#ababab) for secondary metadata to keep the focus on primary actions.
- **Don't use Sharp Corners:** Even the smallest "Obsidian" block must use at least the `sm` (0.5rem) roundness token to maintain the fluid visual language.
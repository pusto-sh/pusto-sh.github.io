---
name: pusto.sh
description: A viewport filled by the supplied landscape artwork.
colors:
  sage-background: "#b4b9ab"
---

# Design System: pusto.sh

## Overview

**Creative North Star: "The supplied landscape"**

The original artwork is the visual authority: sage hills, a warm sky, fine texture, and a terracotta brushstroke circle. Preserve its composition and detail through the image itself.

**Key Characteristics:**
- Artwork fills the viewport.
- The brushstroke circle remains visible in portrait crops.
- No visible interface or motion.

## Colors

### Neutral

The sage background token supplies the page background and browser theme color. All other colors belong to the artwork; they are not separate CSS tokens.

## Typography

There is no visible typography and no font dependency. The document title and image alternative text provide identity and description outside the visual composition.

## Layout

The body has no margin. The main area uses `100vh`, enhanced by `100dvh`; the picture and image are block elements at full width and height. `object-fit: cover` fills the viewport, with `object-position: 82% 50%` preserving the circle as the aspect ratio changes. There are no breakpoints, gutters, or additional sections.

## Components

The artwork is one semantic image inside a `picture` element. Lossless WebP is the primary source; the original 1536 × 1024 PNG is the fallback. The image has descriptive alternative text and high fetch priority. No controls, overlays, shadows, animation, or JavaScript are present.

## Do's and Don'ts

- **Do** preserve the original image and lossless delivery.
- **Do** verify that the circle remains visible and the page does not scroll at target viewport sizes.
- **Don't** redraw, filter, or overlay the supplied artwork.
- **Don't** add interface elements to this image-only composition without a new brief.

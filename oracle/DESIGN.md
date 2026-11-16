---
name: Oracle · pusto.sh
description: A quiet olive surface for a personal reading.
colors:
  paper: "#e8e9de"
  ink: "#303b31"
  muted: "#596251"
  line: "#a5ac9b"
  accent: "#4c6047"
  error: "#8c392c"
  field-surface: "#f4f4eb"
  hover-surface: "#d6dccb"
  primary-hover: "#384d34"
  primary-text: "#fffef5"
  place-surface: "#f0f1e6"
typography:
  display:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "clamp(60px, 7vw, 96px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "36px"
    fontWeight: 400
    letterSpacing: "-0.02em"
  invitation:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "clamp(22px, 2.4vw, 30px)"
    lineHeight: 1.45
  section-title:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "24px"
  reading:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: "19px"
    lineHeight: 1.85
  control:
    fontFamily: "system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.45
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.45
  hint:
    fontFamily: "system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.55
rounded:
  control: "3px"
spacing:
  tight: "8px"
  row-gap: "10px"
  field-gap: "16px"
  paragraph: "24px"
  introduction: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.control}"
    padding: "16px 20px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-search:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-search-hover:
    backgroundColor: "{colors.hover-surface}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "12px 0"
  button-place:
    backgroundColor: "{colors.place-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px"
  button-place-hover:
    backgroundColor: "{colors.hover-surface}"
  text-field:
    backgroundColor: "{colors.field-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "12px 13px"
    width: "100%"
---

# Design System: Oracle · pusto.sh

## Overview

**Creative North Star: "A Moment to Listen"**

Oracle carries pusto.sh's quiet olive identity into a form and an uninterrupted reading. Pale paper, dark olive ink, generous space, and the existing brush circle give it a restrained, personal character. The serif voice welcomes and reads; familiar native controls make the task clear.

This document describes only the `oracle/` surface, as implemented in `index.html`, `oracle.css`, and `oracle.js`. It records the existing design, not a deployment status or a site-wide redesign.

**Key Characteristics:**
- A flat, muted olive palette with fine rules.
- Serif introduction and prose; system sans-serif controls and guidance.
- The existing `assets/circle.svg` brush as the shared identity asset.
- Plain reading text with visible qualifications and a return to the form.

## Colors

### Primary

Olive **accent** marks the main action, native selections, input caret, and keyboard focus. **Primary hover** darkens the action; **primary text** supplies its warm light lettering. **Hover surface** lightly fills secondary actions.

### Neutral

**Paper** covers the page; **ink** carries the reading and main labels. **Muted** supports secondary guidance, the question, and qualifications. **Line** separates form groups and reading sections. **Field surface** and **place surface** distinguish editable controls and search results without creating cards.

The rust **error** color is reserved for the alert and its rule. Error text states the problem; color alone does not carry the message.

## Typography

Georgia, with Times New Roman and serif fallbacks, carries the title, invitation, form legends, and reading. System sans-serif carries controls, navigation, help, errors, and qualifications. The hierarchy above records the desktop values; the reading has no imposed character-count width beyond its layout column.

On narrow screens the title becomes (64px), the invitation (23px), and form legends (23px). Reading paragraphs become (18px) with a line height of (1.8). The question is italic and muted; the qualification returns to smaller sans-serif text.

## Layout

The desktop main area is centered at a maximum width of (1240px), with horizontal padding of (6vw). Its introduction and workspace use columns of (1fr / 1.22fr), separated by `clamp(50px, 8vw, 140px)`. The introduction stays sticky (72px from the top). The reading state gives prose more room with columns of (0.8fr / 1.4fr).

At (760px) and below, the main area becomes a single column with (7vw) side padding. The introduction is no longer sticky; its brush sits beside the title and invitation. In the reading state, the invitation and aside are hidden to bring the prose forward. Paired date and time fields retain their two-column arrangement, while choice rows wrap.

Header and footer use a wider centered boundary (1440px). Form groups and the reading are divided by fine horizontal rules. Paragraphs have generous separation; there are no nested cards or fixed overlays.

## Elevation & Depth

The surface has no box shadows. Pale control fills and thin rules provide separation. The brush remains an image with its original irregular edge. While waiting, its opacity breathes over (3s), using `ease-in-out`; reduced-motion preference removes that animation and smooth scrolling.

## Shapes

Inputs and bordered buttons have barely rounded corners using the control radius. Text actions have square edges and a single lower rule. Radio buttons, checkboxes, date fields, and time fields keep browser-native affordances. The decorative brush is reused from `/assets/circle.svg`, with empty alternative text.

## Components

- **Primary action:** full-width olive fill, warm light text, and a darker hover. It anchors the end of the form.
- **Search action and place results:** restrained bordered buttons. Place choices align left and carry their full readable labels; selecting one exposes the chosen place and time zone.
- **Text action:** a quiet underlined return to existing details, used in waiting and reading states.
- **Fields and choices:** visible labels, pale fills, thin borders, and native selections. Text controls are at least (48px) high; buttons at least (44px). Choices expose exact, ranged, and unknown time without disguising them as decorative chips. Conditional controls are hidden and disabled together.
- **Keyboard and busy states:** a (2px) olive focus outline with (5px) offset; focused fields also gain an olive border. Disabled buttons use opacity (0.6) and a wait cursor.
- **Navigation:** a small system-font home link and serif italic phrase in the header; a quiet return link in the footer. Navigation stays in normal document flow.
- **Reading:** plain text paragraphs, a muted italic question when present, and a separated qualification when supplied. Focus moves to the reading heading on completion. Uncertainty remains legible ordinary text.
- **Errors:** rust text and a matching upper rule. The alert receives focus, keeping recovery visible with the preserved form.

## Do's and Don'ts

### Do:
- **Do** preserve the quiet olive palette and the existing brush asset.
- **Do** keep serif reading text distinct from sans-serif controls and guidance.
- **Do** retain visible labels, native control behavior, keyboard focus, and reduced-motion support.
- **Do** present uncertainty beside the reading in plain language.

### Don't:
- **Don't** add shadows, gradients, or card framing to this flat form and reading surface.
- **Don't** turn the reading into a dashboard of charts, badges, or decorative widgets.
- **Don't** hide qualifications in hover-only content or replace unknown birth time with a precise-looking value.

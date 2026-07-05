---
name: ZamZam Auto Parts — Web Inventory
description: Staff-only inventory tool for a vehicle salvage yard, styled like a precise, trustworthy ledger.
colors:
  ledger-navy: "#1d3a5f"
  ledger-navy-hover: "#14293f"
  concrete-bg: "#f6f6f8"
  paper-surface: "#ffffff"
  paper-surface-alt: "#f0f0f3"
  hairline-border: "#e3e3e8"
  ink: "#17181c"
  ink-muted: "#66666f"
  ink-faint: "#93939c"
  signal-danger: "#dc2626"
  signal-success: "#16a34a"
  signal-warning: "#d97706"
  signal-info: "#2563eb"
typography:
  headline:
    fontFamily: "'Segoe UI', system-ui, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Segoe UI', system-ui, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Segoe UI', system-ui, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  label:
    fontFamily: "'Segoe UI', system-ui, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-navy}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "11px 16px"
  button-primary-hover:
    backgroundColor: "{colors.ledger-navy-hover}"
  card:
    backgroundColor: "{colors.paper-surface}"
    rounded: "{rounded.md}"
    padding: "12px 14px 14px"
  badge-neutral:
    backgroundColor: "{colors.paper-surface-alt}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  tab-active:
    backgroundColor: "{colors.ledger-navy}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "9px 20px"
---

# Design System: ZamZam Auto Parts — Web Inventory

## 1. Overview

**Creative North Star: "The Salvage Ledger"**

This is the tool a yard clerk trusts to be right, not the tool that tries to impress them. Every screen reads like a well-kept ledger for a working scrapyard: precise records of parts and donor vehicles, dense but never cluttered, calm enough to use standing at a counter and specific enough to trust at a desk. Personality is clean, modern, and trustworthy — restraint and clarity carry the design, not decoration.

The system explicitly rejects the generic SaaS-dashboard look: no purple-gradient hero cards, no stock-icon card grids, no boilerplate admin-template chrome. The existing wordmark (black type, red/orange car swoosh) is treated as the one piece of expressive color the brand already owns; the UI around it stays quiet so the logo and the product photos do the visual work.

**Key Characteristics:**
- Flat surfaces at rest; depth appears only as feedback (hover, focus, overlay), never as ambient decoration.
- One accent color, used sparingly, for anything interactive or "the primary action."
- Dense information laid out with generous internal padding, not visual noise.
- Identical component vocabulary whether the screen is used one-handed on a phone at the yard or with a mouse at a desk.

## 2. Colors

A near-monochrome ledger (ink on paper, concrete neutrals) with one deliberate accent and four narrowly-scoped signal colors that never do double duty as decoration.

### Primary
- **Ledger Navy** (`#1d3a5f`, dark-mode `#3a6ea5`): the one accent. Primary buttons, active tab/segment state, focus rings, links, and any "this is the interactive thing" signal. Rare enough that when it appears, it means something.

### Neutral
- **Concrete** (`#f6f6f8`): page background.
- **Paper** (`#ffffff`): card/panel/modal surfaces.
- **Paper Alt** (`#f0f0f3`): nested surfaces — chip backgrounds, secondary buttons, the close button on a modal.
- **Hairline** (`#e3e3e8`): all borders. Always 1px, never a color statement.
- **Ink** (`#17181c`): primary text and headings.
- **Ink Muted** (`#66666f`): secondary text, meta rows, labels.
- **Ink Faint** (`#93939c`): placeholder text, disabled/untested states, icon-only affordances.

### Signal colors (status only, never decorative)
- **Danger** (`#dc2626`): destructive actions, delete confirmations, blocked-delete errors.
- **Success** (`#16a34a`): "tested" state, positive confirmations.
- **Warning** (`#d97706`): caution states (e.g. items needing attention).
- **Info** (`#2563eb`): informational badges only.

Dark mode lightens ink→paper roles and brightens the accent/signal hues just enough to keep the same contrast relationships; it does not invert the palette's personality.

### Named Rules
**The One Accent Rule.** Ledger Navy is the only color used to mean "interactive" or "primary." It never appears as pure decoration (no navy section backgrounds, no navy illustrations). If a second saturated color is needed on screen, it must be one of the four named signal colors, and it must map to that exact status.

## 3. Typography

**Body/UI Font:** 'Segoe UI', system-ui, Roboto, Helvetica, Arial, sans-serif (with system fallbacks)
**Mono/Tabular Font:** ui-monospace, Consolas, 'SFMono-Regular', monospace — used only for tabular numerals (prices, odometer, SKUs), via the `.tabular-nums` utility.

**Character:** One sans family carrying every role via weight and size, not a display/body pairing — deliberately restrained for a dense utility tool. No serif, no display face; nothing here is trying to be a magazine headline.

### Hierarchy
- **Headline** (600, 18px, 1.3 line-height, -0.02em): modal/page titles — the biggest text in the app.
- **Title** (600, 14px, 1.3 line-height, -0.01em): card titles (part name, vehicle make/model), section headings inside detail views.
- **Body** (400, 15px, 1.5 line-height, -0.01em): running text, form inputs, base document size.
- **Label** (600, 12px, 1.4 line-height, 0.01em): meta rows, badges, vehicle-line eyebrows, filter chips — small, bold, never uppercase by default (one exception below).

### Named Rules
**The No-Display-Size Rule.** Nothing in this system exceeds 18px. This is a tool, not a marketing page; hierarchy comes from weight and color (ink vs. ink-muted), not from scale jumps.

## 4. Elevation

Flat by default; shadows are a response to state, never ambient decoration. Most surfaces (cards, inputs, the sticky navbar) sit on a 1px hairline border with no shadow at rest. Depth appears only when something lifts off the page: a card on hover, a menu popover, a modal overlay.

### Shadow Vocabulary
- **sm** (`0 1px 2px rgba(15,15,20,0.06)`): barely-there separation, reserved for small floating controls (the 3-dot card menu trigger).
- **md** (`0 6px 16px -4px rgba(15,15,20,0.12), 0 2px 6px -2px rgba(15,15,20,0.08)`): hover-lifted cards, open dropdowns/menus, the floating Cars/Parts tab island.
- **lg** (`0 20px 40px -12px rgba(15,15,20,0.28)`): modals only — the one surface that's meant to feel like it's floating above everything else.

Dark mode uses the same shadow shapes with pure-black shadow color at slightly higher opacity, since ambient light is already low.

### Named Rules
**The Flat-By-Default Rule.** A card, input, or panel with no active interaction has no shadow — only a 1px hairline border. If you're adding `box-shadow` to something at rest, that's the tell you should use a border instead.

## 5. Components

### Buttons
- **Shape:** 8px radius (`{rounded.sm}`), never pill except for icon-only circular buttons.
- **Primary:** Ledger Navy background (`#1d3a5f`), white text, `11px 16px` padding, 600 weight. Used for exactly one action per view (Sign in, Share PDF is secondary — see below).
- **Secondary/Ghost:** Paper Alt background, Ink text, same radius/padding — used for "Share PDF" and other non-destructive secondary actions.
- **Destructive:** Danger-tinted background (`--danger-bg`) with Danger text and a 1px Danger border — reserved for Delete only, never for anything else.
- **Hover/Focus:** hover darkens the fill by one step (`ledger-navy-hover`); focus-visible gets a 2px solid Ledger Navy outline with 2px offset, no glow.

### Cards
- **Corner Style:** 14px radius (`{rounded.md}`).
- **Background:** Paper on Concrete page background.
- **Border:** 1px Hairline at rest.
- **Shadow Strategy:** none at rest; `shadow-md` + accent-tinted border + `translateY(-2px)` on hover only (see Elevation).
- **Internal Padding:** `12px 14px 14px` below a 4:3 thumbnail.
- **Signature detail:** a floating 3-dot menu (Share PDF / Delete) sits top-right over the thumbnail on a translucent dark pill, and a status badge overlays the bottom-left corner of the same thumbnail.

### Chips / Badges
- **Style:** pill radius, `3px 9px` padding, 12px/600 label type. Background+text pair always comes from one semantic role (success/danger/warning/info/neutral) — never a custom one-off color.
- **Filter chips:** same pill shape, Hairline border at rest, Ledger-Navy-tinted background + text + border when active.

### Inputs / Search
- **Style:** 14px radius (`{rounded.md}`), 1px Hairline border, Paper background, leading icon inset at 13px.
- **Focus:** border shifts to accent-tinted, plus a 3px soft accent-tinted glow (`box-shadow: 0 0 0 3px var(--accent-bg)`) — no color change on the border alone, always paired with the glow.

### Navigation
- Sticky top navbar: translucent Paper (88% opacity) with backdrop blur, 1px Hairline bottom border, logo image at 40px height. Desktop shows inline links + sign-out; mobile collapses behind a hamburger into a full-width dropdown nav — the "collapsible navbar" is a state toggle, not a separate design.
- The Cars/Parts switch is a separate floating pill "island" (sticky, centered, `shadow-md`, `radius-pill`) — segmented-control styling, active segment gets a solid Ledger Navy fill with white text.

### Modal / Detail Sheet
- **Corner Style:** bottom sheet on mobile (top corners only, `radius-lg`), centered dialog with all four corners rounded at ≥720px.
- **Background:** Paper, `shadow-lg`, dark scrim behind it (`rgba(10,10,12,0.55)` + 3px blur).
- **Header:** 1px Hairline bottom border, close button in a Paper-Alt circle.

## 6. Do's and Don'ts

### Do:
- **Do** use Ledger Navy (`#1d3a5f` / dark `#3a6ea5`) as the only accent — buttons, active states, focus rings, links.
- **Do** keep cards and inputs flat (border only) at rest; add `shadow-md` only on hover/open/active states.
- **Do** pair every signal color (danger/success/warning/info) with its one fixed meaning — never repurpose one for decoration.
- **Do** keep type hierarchy to weight and color, capping size at 18px (Headline) since this is a dense utility tool, not a marketing page.
- **Do** make every interactive control work identically at phone-in-hand and desk-with-mouse sizes.

### Don't:
- **Don't** reintroduce a generic SaaS-dashboard look: no purple/blue gradient hero cards, no stock-icon card grids, no boilerplate admin-template chrome.
- **Don't** add a colored `border-left`/`border-right` stripe as a decorative accent on any card or list row.
- **Don't** use `background-clip: text` gradient headings — emphasis comes from weight/size/color only.
- **Don't** let a card or button carry both a soft wide drop shadow *and* a full 1px border as decoration — pick flat-with-border at rest, or lifted-with-shadow on hover, never both as a static combo.
- **Don't** use border-radius above 20px on cards, panels, or inputs — pill radius is reserved for tags, chips, buttons, and the tab island.
- **Don't** repurpose Danger red, Success green, Warning amber, or Info blue as a general accent color; Ledger Navy is the only color allowed to mean "interactive."

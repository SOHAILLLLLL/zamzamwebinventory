---
name: ZamZam Auto Parts — Web Inventory
description: Staff-only inventory tool for a vehicle salvage yard, styled like a precise, trustworthy ledger.
colors:
  ledger-teal: "#0c7770"
  ledger-teal-hover: "#095a54"
  accent-on-panel: "#2dd4c9"
  panel-charcoal: "#1c2128"
  panel-charcoal-elevated: "#262c35"
  panel-text: "#f4f5f6"
  panel-text-muted: "#9aa0a8"
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
    backgroundColor: "{colors.ledger-teal}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "11px 16px"
  button-primary-hover:
    backgroundColor: "{colors.ledger-teal-hover}"
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
    backgroundColor: "{colors.ledger-teal}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "9px 20px"
  panel-nav-link-active:
    backgroundColor: "rgba(45, 212, 201, 0.14)"
    textColor: "{colors.accent-on-panel}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
---

# Design System: ZamZam Auto Parts — Web Inventory

## 1. Overview

**Creative North Star: "The Salvage Ledger"**

This is the tool a yard clerk trusts to be right, not the tool that tries to impress them. Every screen reads like a well-kept ledger for a working scrapyard: precise records of parts and donor vehicles, dense but never cluttered, calm enough to use standing at a counter and specific enough to trust at a desk. Personality is clean, modern, and trustworthy — restraint and clarity carry the design, not decoration.

The system explicitly rejects the generic SaaS-dashboard look: no purple-gradient hero cards, no stock-icon card grids, no boilerplate admin-template chrome. The wordmark sits in a small light chip on the dark navbar; the UI around it otherwise stays quiet so the logo and the product photos do the visual work.

**Key Characteristics:**
- Two structural "chrome" surfaces — the top navbar and the floating Cars/Parts tab island — are a fixed charcoal panel, always dark regardless of light/dark OS preference, like a tool's control deck.
- All content surfaces (cards, modals, inputs) stay light/paper for legibility of dense text and part photos; only the chrome goes dark.
- One accent color (teal), used sparingly, for anything interactive or "the primary action" — with a brighter tint reserved specifically for text sitting on the dark chrome, where the base teal alone wouldn't hit contrast.
- Dense information laid out with generous internal padding, not visual noise.
- Identical component vocabulary whether the screen is used one-handed on a phone at the yard or with a mouse at a desk.

## 2. Colors

A near-monochrome ledger (ink on paper, concrete neutrals) with one deliberate teal accent, a fixed dark "control deck" layer for chrome, and four narrowly-scoped signal colors that never do double duty as decoration.

### Primary
- **Ledger Teal** (`#0c7770`, dark-mode content `#14847a`): the one accent. Primary buttons, active tab/segment fill, focus rings, links, and any "this is the interactive thing" signal. Rare enough that when it appears, it means something.
- **Accent-on-Panel** (`#2dd4c9`): a brighter cyan tint of the same hue, used only for accent-colored *text* sitting directly on the charcoal panel (e.g. the active nav-link label). The base Ledger Teal is too dark to hit 3:1 as text-on-charcoal; this tint exists specifically to solve that, not as a second accent.

### Chrome (Panel)
- **Panel Charcoal** (`#1c2128`): background for the top navbar and the floating Cars/Parts tab island only. Fixed — does not follow the OS light/dark preference. Never used for cards, modals, or page background.
- **Panel Charcoal Elevated** (`#262c35`): hover/active state background for controls sitting on the panel (nav links, the mobile menu button).
- **Panel Text** (`#f4f5f6`) / **Panel Text Muted** (`#9aa0a8`): label colors for anything on the panel — muted by default, full panel-text on hover/active.

### Neutral (content surfaces)
- **Concrete** (`#f6f6f8`): page background.
- **Paper** (`#ffffff`): card/modal surfaces.
- **Paper Alt** (`#f0f0f3`): nested surfaces — chip backgrounds, secondary buttons, the close button on a modal.
- **Hairline** (`#e3e3e8`): all borders on content surfaces. Always 1px, never a color statement.
- **Ink** (`#17181c`): primary text and headings.
- **Ink Muted** (`#66666f`): secondary text, meta rows, labels.
- **Ink Faint** (`#93939c`): placeholder text, disabled/untested states, icon-only affordances.

### Signal colors (status only, never decorative)
- **Danger** (`#dc2626`): destructive actions, delete confirmations, blocked-delete errors.
- **Success** (`#16a34a`): "tested" state, positive confirmations.
- **Warning** (`#d97706`): caution states (e.g. items needing attention).
- **Info** (`#2563eb`): informational badges only.

Content-surface dark mode (OS `prefers-color-scheme: dark`) lightens ink→paper roles and brightens the accent hue just enough to keep the same contrast relationships on a dark content background. The Panel colors are unaffected by this — the chrome is always the same charcoal whether the rest of the app is in light or dark mode.

### Named Rules
**The One Accent Rule.** Ledger Teal (or its Accent-on-Panel tint, on chrome only) is the only color used to mean "interactive" or "primary." It never appears as pure decoration. If a second saturated color is needed on screen, it must be one of the four named signal colors, mapped to that exact status.

**The Fixed Chrome Rule.** Panel Charcoal is structural, not thematic — it marks "this is the control deck" (navbar, tab switcher) the same way regardless of the user's OS theme. If a surface holds content (a card, a modal, a form), it never gets Panel Charcoal; it uses the content-surface neutrals instead.

## 3. Typography

**Body/UI Font:** 'Segoe UI', system-ui, Roboto, Helvetica, Arial, sans-serif (with system fallbacks)
**Mono/Tabular Font:** ui-monospace, Consolas, 'SFMono-Regular', monospace — used only for tabular numerals (prices, odometer, SKUs, tag codes), via the `.tabular-nums` utility.

**Character:** One sans family carrying every role via weight and size, not a display/body pairing — deliberately restrained for a dense utility tool. No serif, no display face; nothing here is trying to be a magazine headline.

### Hierarchy
- **Headline** (600, 18px, 1.3 line-height, -0.02em): modal/page titles — the biggest text in the app.
- **Title** (600, 14px, 1.3 line-height, -0.01em): card titles (part name, vehicle make/model), section headings inside detail views.
- **Body** (400, 15px, 1.5 line-height, -0.01em): running text, form inputs, base document size.
- **Label** (600, 12px, 1.4 line-height, 0.01em): meta rows, badges, vehicle-line eyebrows, filter chips — small, bold, never uppercase by default (one exception below).

### Named Rules
**The No-Display-Size Rule.** Nothing in this system exceeds 18px. This is a tool, not a marketing page; hierarchy comes from weight and color, not from scale jumps.

## 4. Elevation

Flat by default on content surfaces; shadows are a response to state, never ambient decoration. Cards, inputs, and modals sit on a 1px hairline border with no shadow at rest. Depth appears only when something lifts off the page: a card on hover, a menu popover, a modal overlay. The two panel surfaces (navbar, tab island) are the exception — they carry a permanent `shadow-md` (tab island) or a hairline-on-charcoal edge (navbar), since they're meant to read as a fixed control deck floating above the content, not as flat page furniture.

### Shadow Vocabulary
- **sm** (`0 1px 2px rgba(15,15,20,0.06)`): barely-there separation, reserved for small floating controls (the 3-dot card menu trigger).
- **md** (`0 6px 16px -4px rgba(15,15,20,0.12), 0 2px 6px -2px rgba(15,15,20,0.08)`): hover-lifted cards, open dropdowns/menus, the floating Cars/Parts tab island (permanent, not hover-only).
- **lg** (`0 20px 40px -12px rgba(15,15,20,0.28)`): modals only — the one surface that's meant to feel like it's floating above everything else.

### Named Rules
**The Flat-By-Default Rule.** A card, input, or panel with no active interaction has no shadow — only a 1px hairline border. If you're adding `box-shadow` to something at rest on a *content* surface, that's the tell you should use a border instead. The chrome surfaces are the named exception.

## 5. Components

### Buttons
- **Shape:** 8px radius (`{rounded.sm}`), never pill except for icon-only circular buttons.
- **Primary:** Ledger Teal background, white text, `11px 16px` padding, 600 weight. Used for exactly one action per view (Sign in; Share PDF is secondary — see below).
- **Secondary/Ghost:** Paper Alt background, Ink text, same radius/padding — used for "Share PDF" and other non-destructive secondary actions.
- **Destructive:** Danger-tinted background (`--danger-bg`) with Danger text and a 1px Danger border — reserved for Delete only, never for anything else.
- **Hover/Focus:** hover darkens the fill by one step (`ledger-teal-hover`); focus-visible gets a 2px solid Ledger Teal outline with 2px offset, no glow.
- **Press feedback:** every pressable control (buttons, chips, tabs, the card menu trigger, the cards themselves) scales down slightly on `:active` (0.94–0.98 depending on size) using `var(--ease-out)` — confirms the interface heard the tap. Respects `prefers-reduced-motion`.

### Cards
- **Corner Style:** 14px radius (`{rounded.md}`).
- **Background:** Paper on Concrete page background — cards never take the panel charcoal treatment, even though the chrome around them does.
- **Border:** 1px Hairline at rest.
- **Shadow Strategy:** none at rest; `shadow-md` + accent-tinted border + `translateY(-2px)` on hover, plus a subtle `scale(0.985)` on `:active` for tap feedback (see Elevation).
- **Internal Padding:** `12px 14px 14px` below a photo thumbnail.
- **Signature detail:** a floating 3-dot menu (Share PDF / Delete) sits top-right over the thumbnail on a translucent charcoal pill (echoes the panel color), and a status badge overlays the bottom-left corner of the same thumbnail.

### Chips / Badges
- **Style:** pill radius, `3px 9px` padding, 12px/600 label type. Background+text pair always comes from one semantic role (success/danger/warning/info/neutral) — never a custom one-off color.
- **Filter chips:** same pill shape, Hairline border at rest, Ledger-Teal-tinted background + text + border when active; scales down on press.

### Inputs / Search
- **Style:** 14px radius (`{rounded.md}`), 1px Hairline border, Paper background, leading icon inset at 13px.
- **Focus:** border shifts to accent-tinted, plus a 3px soft accent-tinted glow (`box-shadow: 0 0 0 3px var(--accent-bg)`) — no color change on the border alone, always paired with the glow.

### Navigation (Panel Chrome)
- Sticky top navbar: **Panel Charcoal** background (92% opacity + blur), 1px `panel-border` bottom edge, logo in a small white chip (the wordmark's own white background reads as an intentional badge against the dark bar, not a stray rectangle). Desktop shows inline links + sign-out; mobile collapses behind a hamburger into a full-width dropdown that's the same charcoal panel — the "collapsible navbar" is a state toggle, not a separate design.
- Nav links: `panel-text-muted` at rest, `panel-text` on hover, `accent-on-panel` on/over an `rgba(45,212,201,0.14)` fill when active — never the base Ledger Teal as text color here (fails contrast on charcoal).
- The Cars/Parts switch is a separate floating pill "island" — also **Panel Charcoal**, sticky, centered, permanent `shadow-md`, `radius-pill`. Active segment gets a solid Ledger Teal fill with white text; inactive segments use `panel-text-muted`.

### Modal / Detail Sheet
- **Corner Style:** bottom sheet on mobile (top corners only, `radius-lg`), centered dialog with all four corners rounded at ≥720px.
- **Background:** Paper (never charcoal — modals are content, not chrome), `shadow-lg`, dark scrim behind it (`rgba(10,10,12,0.55)` + 3px blur).
- **Header:** 1px Hairline bottom border, close button in a Paper-Alt circle.

## 6. Do's and Don'ts

### Do:
- **Do** use Ledger Teal (`#0c7770` / dark-content `#14847a`) as the only accent on content surfaces — buttons, active states, focus rings, links.
- **Do** use `accent-on-panel` (`#2dd4c9`), not the base teal, for any accent-colored text sitting directly on Panel Charcoal.
- **Do** keep Panel Charcoal scoped to the navbar and the floating tab island only — never apply it to cards, modals, or the page background.
- **Do** keep cards and inputs flat (border only) at rest; add `shadow-md` only on hover/open/active states.
- **Do** give every pressable control a subtle `:active` scale-down, gated behind `prefers-reduced-motion`.
- **Do** pair every signal color (danger/success/warning/info) with its one fixed meaning — never repurpose one for decoration.
- **Do** keep type hierarchy to weight and color, capping size at 18px (Headline) since this is a dense utility tool, not a marketing page.
- **Do** make every interactive control work identically at phone-in-hand and desk-with-mouse sizes.

### Don't:
- **Don't** reintroduce a generic SaaS-dashboard look: no purple/blue gradient hero cards, no stock-icon card grids, no boilerplate admin-template chrome.
- **Don't** extend Panel Charcoal beyond the navbar and tab island — it is chrome, not a dark-mode theme for content.
- **Don't** use the base Ledger Teal as text color on Panel Charcoal — it falls short of 3:1; use `accent-on-panel` instead.
- **Don't** add a colored `border-left`/`border-right` stripe as a decorative accent on any card or list row.
- **Don't** use `background-clip: text` gradient headings — emphasis comes from weight/size/color only.
- **Don't** let a card or button carry both a soft wide drop shadow *and* a full 1px border as decoration — pick flat-with-border at rest, or lifted-with-shadow on hover, never both as a static combo.
- **Don't** use border-radius above 20px on cards, panels, or inputs — pill radius is reserved for tags, chips, buttons, and the tab island.
- **Don't** repurpose Danger red, Success green, Warning amber, or Info blue as a general accent color; Ledger Teal is the only color allowed to mean "interactive."

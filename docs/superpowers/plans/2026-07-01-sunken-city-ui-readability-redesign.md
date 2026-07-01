# Sunken City UI/UX Redesign Plan

> **Companion document.** The authoritative plan is the Chinese version: `2026-07-01-sunken-city-ui-readability-redesign.zh-CN.md`. This English file mirrors the strategy for tools or collaborators that need English context.

**Date:** 2026-07-01  
**Project:** Sunken City  
**Status:** Frontend UI/UX v2 redesign planning  
**Goal:** Replace the current global-dark-veil dependency with a full readability system that supports user-selectable bright and dark backgrounds while preserving all data, uploads, room logic, character cards, dice records, and deployment safety rules.

## Method Sources

This plan applies four requested design/tooling sources:

| Source | Role | Output |
| --- | --- | --- |
| `product-design` | Product brief, user journeys, acceptance framing | Separate PC/KP and mobile/PL priorities; make room chat and dice records the mobile core |
| `creative-production` | Visual identity direction | Luminous occult archive: deep-sea mist, readable smoked glass, restrained gold ritual accents, non-black Cthulhu atmosphere |
| `superpowers` | Engineering execution structure | Phased implementation, independent commits, rollback points, screenshot-based checks, no deep tests unless requested |
| `ui-ux-pro-max` | UI/UX system constraints | Background profiles, surface tokens, responsive layouts, drawer behavior, dense PC controls, readable mobile gameplay |

## Core Decision

Do not continue fixing readability page by page with darker overlays.

The recent background work revealed the real problem: the interface relied on a single dark veil to make inconsistent panels readable. Once users can choose bright backgrounds, that approach breaks. The correct fix is a system-level redesign:

- Backgrounds provide atmosphere only.
- Surfaces provide readability.
- Page shells provide information structure.
- Shared components provide consistent interaction states.

## Product Priorities

PC should become a more cinematic and powerful console for KP, administrators, and heavy users.

Mobile should not be treated as a shrunken PC interface. It should optimize the PL path:

1. Enter a room quickly.
2. Read chat and dice records comfortably.
3. See essential character/room state.
4. Open tools through drawers only when needed.
5. Hide decorative or administrative surfaces during active play.

## Non-Negotiables

- Do not alter database schema, uploads, user data, room messages, dice records, character data, or attachments.
- Do not modify socket event names, dice algorithms, combat turn logic, private chat payloads, or room message contracts.
- Do not run deep tests unless the user explicitly asks for them.
- Every deploy must back up `/opt/coc-platform-data/dev.db`.
- Every deploy must back up `/opt/coc-platform/apps/server/public/uploads/`.
- Implement and deploy in small, independently reviewable commits.
- Keep bright backgrounds visibly bright and dark backgrounds atmospheric.

## Visual Direction

Target language: **luminous occult archive**.

Use:

- deep-sea cold mist
- readable smoked glass
- polished obsidian panels
- parchment-compatible surfaces
- restrained gold highlights
- crisp icon-first controls
- compact mobile drawers

Avoid:

- global black veil as a readability crutch
- gray text on gray translucent panels
- low-opacity gold body copy
- page-specific overlay patches
- mobile toolbars that take space from chat
- decorative headers that compete with gameplay

## Background System

Each background should expose a `readabilityProfile`:

| Profile | Background type | Design behavior |
| --- | --- | --- |
| `luminous` | parchment, beige ruins, bright city | Keep brightness; strengthen surfaces and text contrast |
| `balanced` | default city, blue city | Use moderate atmospheric treatment and standard surfaces |
| `dark` | deep sea, void rune | Keep atmosphere; surfaces may be lighter and more defined |

`AppBackground` should own only:

- selected image
- mild tone tuning
- subtle vignette
- loading and fallback behavior
- current readability profile

It must not be responsible for making every page readable.

## Surface System

All meaningful content must sit on a named surface:

| Surface | Usage |
| --- | --- |
| `page` | page headers and major page regions |
| `panel` | lists, sidebars, metadata blocks, grouped controls |
| `solid` | long text, forms, forum posts, item descriptions |
| `glass` | short decorative previews only |
| `elevated` | drawers, popovers, modals, command surfaces |
| `danger` | destructive confirmation |

Each surface needs stable:

- background and opacity
- border
- shadow/elevation
- primary/secondary text colors
- hover/active/disabled states
- mobile density variant

## Component Targets

Create or refine:

- `Surface`
- `PageShell`
- `ReadablePanel`
- `ActionCard`
- `MobileDrawer`
- compact icon toolbar buttons
- background profile tokens
- text-on-surface semantic tokens

Use these components to stop repeated per-page styling decisions.

## Information Architecture

Navigation should reflect the latest product direction:

- Keep `首页`.
- Keep `调查员`.
- Keep `故事书`.
- Keep room/gameplay routes.
- Merge shop, backpack, and market into `无名集市`.
- Move global background selection into personal settings.
- Treat `幻影脚本 / 单人模式` as out of scope because it moved to Project Lunar.

## Phase Plan

### Phase 1: Foundation

Build the background profile and surface system before further page redesign.

- [ ] Add `readabilityProfile` to background options.
- [ ] Replace the one-size-fits-all veil with profile-aware atmosphere CSS.
- [ ] Add surface and text semantic tokens.
- [ ] Add `PageShell`, `ReadablePanel`, and `ActionCard`.
- [ ] Run lint, typecheck, and build.
- [ ] Capture light screenshots only for `/`, `/rooms`, and `/shop`.
- [ ] Commit as `feat: add readable ui surface system`.

### Phase 2: Gateway and Economy

Address the currently visible readability failures first.

- [ ] Migrate `RoomListPage` header, filters, room cards, and quick-entry panel.
- [ ] Migrate `EconomyPageShell`.
- [ ] Migrate shop/backpack/market surfaces under `无名集市`.
- [ ] Move long descriptions to `ReadablePanel`.
- [ ] Make item cards readable on bright backgrounds.
- [ ] Run lint, typecheck, and build.
- [ ] Capture screenshots for `/rooms`, `/shop`, `/inventory`, and `/market`.
- [ ] Commit as `feat: migrate gateway and economy surfaces`.

### Phase 3: Dashboard and Characters

Keep the existing “我的调查员” card effect if it remains readable.

- [ ] Rebuild the home layout with `PageShell` and `ActionCard`.
- [ ] Preserve the current investigator card presentation where possible.
- [ ] Migrate character list, detail, creation, and growth surfaces.
- [ ] Run lint, typecheck, and build.
- [ ] Capture screenshots for home and character pages.
- [ ] Commit as `feat: migrate dashboard and character surfaces`.

### Phase 4: Forum and Secondary Pages

Remove old surface debt from long-text and community screens.

- [ ] Migrate forum list, board, post, and editor surfaces.
- [ ] Migrate ranks, titles, profile, and background picker surfaces.
- [ ] Improve background picker labels and previews.
- [ ] Run lint, typecheck, and build.
- [ ] Commit as `feat: migrate forum and profile surfaces`.

### Phase 5: Room Gameplay

Migrate the core room UI last because it has the highest behavioral risk.

- [ ] Identify visual-only blocks before editing `RoomPage`.
- [ ] Preserve socket hooks, dice logic, combat logic, private chat logic, and message payloads.
- [ ] Make PC room layout a stable immersive console.
- [ ] Make mobile room layout PL-first: chat/log first, drawers collapsed by default.
- [ ] Ensure messages and dice records use readable surfaces.
- [ ] Run lint, typecheck, and build.
- [ ] Capture desktop and mobile room screenshots only.
- [ ] Commit as `feat: migrate room gameplay shell`.

### Phase 6: Legacy CSS Removal

Remove old overrides only after pages have migrated.

- [ ] Search for `card-layer-2`, `coc-glass-v2`, `coc-card-v2`, and broad `!important` usage.
- [ ] Replace remaining usage only when covered by new components.
- [ ] Remove dead overrides in small chunks.
- [ ] Run lint, typecheck, and build.
- [ ] Commit as `refactor: remove legacy surface overrides`.

## Acceptance Criteria

- Bright backgrounds remain bright.
- Dark backgrounds remain atmospheric.
- Core text does not depend on a global dark overlay.
- Dashboard, story gateway, economy pages, character pages, forum pages, and room gameplay are readable on `羊皮纸`, `沉没之城`, and `虚空符文`.
- Mobile room view prioritizes chat and dice records.
- Existing data, uploads, sockets, dice, combat, and character contracts are untouched.
- Each phase can be rolled back independently.

## Deployment Rule

Until the server branch divergence is intentionally resolved, use the proven frontend-only static deployment path:

1. Run local lint, typecheck, and build.
2. Commit and push the current branch.
3. Back up server database.
4. Back up server uploads.
5. Upload `apps/web/dist`.
6. Replace server static frontend files.
7. Check `http://localhost:3001/health`.

Do not use the existing server `deploy.sh` for this redesign while its branch assumptions remain mismatched.

## Immediate Recommendation

Implement Phase 1 and Phase 2 as the next focused iteration. They solve the background/readability issue directly and prevent further page-by-page overlay fixes.

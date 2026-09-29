# Design

The UI is a dark investigation console with a light theme. Do not introduce a new visual language. Tokens live in `frontend/src/index.css` (`--cw-*`) and `frontend/src/theme/tokens.ts`.

## Color

Dark is the default.

| Role | Dark | Light |
| --- | --- | --- |
| Background | `#000000` | `#FFFFFF` |
| Text | `#F5F5F5` | `#0A0A0A` |
| Muted text | `#A8A8A8` | `#575757` |
| Panel | `#141414` | `#FFFFFF` |
| Raised | `#262626` | `#F0F0F0` |
| Border | `#8A8A8A` | `#767676` |
| Primary button | `#E8E8E8` on `#000000` | `#0A0A0A` on `#FFFFFF` |
| Danger | `#FFB4B4` | `#7F1D1D` |
| Warning | `#F5D98A` | `#713F12` |
| OK | `#A8E6C5` | `#14532D` |

Use the CSS variables. Do not add a new accent palette.

## Type

Inter, loaded locally from `@fontsource/inter` (400, 500, 600, 700). Page titles use the existing `serif` class on `PageHeader`. Labels use the `label` class (small, uppercase, tracked). Numbers use `tabular`.

## Components already in the app

- `PageHeader` for the page title and one-line description
- `panel` for grouped content
- `btn-pill` / `btn-pill-primary` / `btn-pill-ghost` for actions
- `filter-pill` for toggles
- `control` for inputs and selects
- `RiskChip` and `ConfidenceBar` for risk
- `list-row` for compact rows
- Graph toolbar and legend stay as they are in `GraphView`

## Spacing and layout

Page content sits in `max-w-[1400px]` with the existing page padding. Sections stack with `gap-4` or `mt-4` / `mt-6`. Two-column layouts use the existing `xl:grid-cols-*` pattern. Do not add a sidebar or a new navigation item unless a task says so.

## Copy

Short sentences. Say "lead", not "proof". Country filters show full English names. The word Offline stays in the header.

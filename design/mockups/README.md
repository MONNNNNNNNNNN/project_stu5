# GrowTH — screen assets

23 screens × 2 viewports (desktop 1440px, mobile 390px) = 46 of each.

Everything here is generated from the **running application**, not drawn by hand: each screen
is loaded in a headless browser and its real rendered geometry, colours, type and icons are
read out of the DOM. So these track the app rather than an idealised version of it — and they
go stale the moment the UI changes.

| Folder | Fidelity | Format | What it is |
| --- | --- | --- | --- |
| `png/` | **Low-fidelity** | PNG @2× | **Sketch of every page.** Greyscale wireframes — boxes, placeholder text bars, no brand colour. For presentation and design review. |
| `svg/` | **High-fidelity** | SVG | **The real web, every page.** Actual palette and copy, editable text layers, vector icons, nested layer tree. For Figma import. |

## Importing `svg/` into Figma

Drag the files onto a Figma canvas, or **File → Import**. Notes:

- Text imports as **editable text layers** (1,394 across the set), not outlines. Each line
  carries `textLength` so it lands at the width the browser measured — if you retype a line,
  clear `textLength` in Figma to let it reflow naturally.
- Fonts are referenced by name (**Inter**, **Manrope**, **JetBrains Mono**). All three are on
  Google Fonts, so Figma resolves them; otherwise it substitutes and warns.
- Icons are **real vector paths** (298 of them), not images — recolour and resize freely.
- Photographs and logos are embedded as base64 PNG at 2× their displayed size, so the files
  are self-contained with no external asset dependencies.
- Layers are named from the source component/class (`data-name`), so the Figma layer tree
  mirrors the React tree.
- No `foreignObject` anywhere — that is the usual reason a DOM-derived SVG imports blank.

## Screen list

`01-home` · `02-about` · `03-contact` · `04-login` · `05-register` · `06-forgot-password` ·
`07-reset-password` · `08-privacy` · `09-not-found` · `10-learn-public` · `11-article-public` ·
`12-dashboard` · `13-growth` · `14-puberty` · `15-bone-age` · `16-children` · `17-add-child` ·
`18-profile` · `19-settings` · `20-notifications` · `21-learn-auth` · `22-article-auth` ·
`23-contact-auth`

Each exists as `<name>-desktop` and `<name>-mobile`.

## What the data shows

Screens were captured against a stub API seeded from the **real** backend logic — the growth
percentiles, SDS values and reference curves are genuine LMS output for a fictional
10-year-old, not invented numbers. The child ("Nong Mint") and account are fabricated; no real
patient data appears anywhere in these assets.

---
timestamp: 2026-08-12T04-55-11Z
slug: src-app-duty-page-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Active shift indicators and copy-to-clipboard status are clear, but loading indicators for auto-assign and save operations are subtle. |
| 2 | Match System / Real World | 3/4 | Shift names (ผลัด 1-6) and location labels match military terminology well. |
| 3 | User Control and Freedom | 2/4 | Auto-assign generates schedules immediately without preview/undo dialog; manual override requires editing dropdowns. |
| 4 | Consistency and Standards | 2/4 | Uses hardcoded colored side-tab borders (`borderLeft: 3px solid`) in multiple places, creating inconsistent visual hierarchy with global CSS. |
| 5 | Error Prevention | 2/4 | Personnel selection lets users pick invalid choices without early inline warning until save or conflict rule fires. |
| 6 | Recognition Rather Than Recall | 3/4 | Good use of status badges and icons, though personnel status legend requires extra scrolling. |
| 7 | Flexibility and Efficiency | 2/4 | Quick auto-assign and copy text exist, but no keyboard shortcuts for shift slot navigation. |
| 8 | Aesthetic and Minimalist Design | 2/4 | High visual noise with dense cards, colored left borders, heavy MUI icons, and competing badge colors. |
| 9 | Error Recovery | 2/4 | Error toasts report failures, but form state retains conflicting assignments without direct auto-resolution suggestions. |
| 10 | Help and Documentation | 1/4 | Missing inline tooltips or help guides explaining punishment/exception priority rules for auto-assign. |
| **Total** | | **22/40** | **Acceptable** |

#### Design Specificity Verdict

**LLM assessment**: The duty schedule interface (`src/app/duty/page.tsx`) features solid domain logic tailored for military guard duty management (6 time shifts, exceptions, punishment duty, copyable LINE message format). However, visually it relies heavily on generic AI-generated slop patterns—specifically `borderLeft: 3px solid` side-tabs, standard Inter typography, and uncalibrated MUI icon accents that dilute its operational authority.

**Deterministic scan**: Detector scan flagged **9 violations** across the project (7 warning side-tab accent borders, 1 overused Google Font "Inter"). Specifically, `src/app/duty/page.tsx` contains 3 hardcoded `borderLeft` side-tabs (lines 263, 426, 584).

**Visual overlays**: Browser automation not active in headless mode; fallback deterministic scan results used.

#### Overall Impression
The application has strong functional depth for military guard assignment, but the UI is cluttered with heavy card borders, side-tab stripes, and inconsistent color badges. Removing the side-tab slop and organizing the view into a cleaner operational dashboard will elevate it from an AI prototype look to a polished, professional tool.

#### What's Working
1. **Domain-Tailored Formatting**: Direct "Copy for LINE" button formatted exactly for military report standards saves significant daily operational time.
2. **Current Shift Highlighting**: Active shift indicator (`getCurrentShift()`) gives immediate real-time context to duty officers.
3. **Personnel Integration**: Searchable personnel dropdown (`SearchablePersonnelSelect`) reduces selection friction.

#### Priority Issues

- **[P1] Visual Slop: AI Side-Tab Accent Borders**: `borderLeft: 3px solid` on card containers creates visual noise and feels like generic AI code.
  - *Why it matters*: Cheapens visual presentation and distorts hierarchy.
  - *Fix*: Remove `borderLeft` stripes; use subtle background tinting, soft borders, or clean status pills instead.
  - *Suggested command*: `$impeccable distill src/app/duty/page.tsx`

- **[P1] Density & Cognitive Load in Shift Slots**: 6 shift cards stacked densely with multiple action buttons (edit, punishment, copy, delete) overload the view.
  - *Why it matters*: Users struggle to quickly scan who is on duty vs who is on exception.
  - *Fix*: Standardize card layout into a clean structured table or timeline grid with consistent spacing and typography.
  - *Suggested command*: `$impeccable layout src/app/duty/page.tsx`

- **[P2] Overused Inter Typography**: Uses generic default Inter font without tuned line-heights or numerical tabular figures (`font-variant-numeric: tabular-nums`).
  - *Why it matters*: Time ranges (18:00 - 20:00) and dates look unpolished and misaligned.
  - *Fix*: Apply clean typography hierarchy with tabular figures for times and dates.
  - *Suggested command*: `$impeccable typeset src/app/duty/page.tsx`

- **[P2] Lack of Inline Exception Warnings**: When assigning someone who is on leave or sick, feedback only happens during validation rather than disabling invalid dropdown options inline.
  - *Why it matters*: Forces trial-and-error selection for duty officers.
  - *Fix*: Disable or tag unavailable personnel directly inside the dropdown with status chips.
  - *Suggested command*: `$impeccable harden src/app/duty/page.tsx`

#### Persona Red Flags

- **Alex (Power User / Duty Officer)**: No keyboard shortcuts to quickly jump between shifts (e.g. Tab / Arrow keys). Auto-assign overwrites without confirmation.
- **Jordan (First-Timer / NCO)**: Confused by what "Punishment Entry" or "Exception Priority" does during auto-assignment because there are no inline tooltips.
- **Sam (Accessibility)**: Low color contrast on some shift badges (`#0ea5e9`, `#f59e0b` text on light backgrounds) and lack of explicit ARIA landmark labels on shift cards.

#### Minor Observations
- Copy button toast message could show a preview of what was copied.
- Location string ("หน้าคลังอาวุธกองร้อยกองบังคับการ") is hardcoded in constant instead of configurable settings.

#### Questions to Consider
- What if the duty schedule used a clean timeline grid instead of 6 separate heavy cards?
- Could auto-assign highlight proposed changes before committing to the schedule?

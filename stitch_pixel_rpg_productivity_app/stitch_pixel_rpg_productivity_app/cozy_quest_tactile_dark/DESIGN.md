---
name: Cozy Quest Tactile Dark
colors:
  surface: '#12121e'
  surface-dim: '#12121e'
  surface-bright: '#383845'
  surface-container-lowest: '#0d0d19'
  surface-container-low: '#1a1a27'
  surface-container: '#1f1e2b'
  surface-container-high: '#292935'
  surface-container-highest: '#343441'
  on-surface: '#e3e0f2'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#e3e0f2'
  inverse-on-surface: '#2f2f3c'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#ffe9b9'
  on-secondary: '#3e2e00'
  secondary-container: '#ffc703'
  on-secondary-container: '#6e5400'
  tertiary: '#52e87c'
  on-tertiary: '#003915'
  tertiary-container: '#2ccb63'
  on-tertiary-container: '#004f20'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#ffdf94'
  secondary-fixed-dim: '#f5bf00'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#594400'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#12121e'
  on-background: '#e3e0f2'
  surface-variant: '#343441'
typography:
  display:
    fontFamily: Rubik
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Rubik
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Rubik
    fontSize: 1.5rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Rubik
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: 0em
  headline-sm:
    fontFamily: Rubik
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: 0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '700'
    lineHeight: 1.5rem
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  label-lg:
    fontFamily: Rubik
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.04em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '700'
    lineHeight: 1rem
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 0.875rem
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

The design system merges the comforting, rewarding charm of 16-bit pastoral adventure RPGs with the precision, ergonomics, and clarity of a modern dark-mode mobile productivity suite. Designed primarily for students managing academic sprints, study habits, and everyday quests, the aesthetic balances playful gamification with calm, distraction-free utility.

The core style draws from **Tactile Skeuomorphic Retro** and **Micro-Polished Modern UI**:
- **Cozy RPG Nostalgia**: Chunky, physical buttons with satisfying mechanical press-down states, inventory-style item slots, and segmented quest meters that provide unmistakable tactile feedback.
- **Micro-Bevel Precision**: Rather than jagged unaliased pixel edges that fatigue the eye over sustained reading sessions, the system pairs crisp micro-radii (`0.25rem`) with 3D drop-shadow lips and dual-tone beveled borders.
- **Focused Dark Canvas**: Atmospheric midnight-slate surfaces preserve battery life and eliminate eye strain during late-night study sessions, allowing vibrant mana blues and quest golds to shine as intentional focal beacons.

## Colors

The palette is engineered for visual hierarchy, semantic clarity, and the evocative glow of an arcade or handheld console in the dark.

### Roles & Semantic Application
- **Primary (`#38BDF8` - Mana Blue)**: The lead interaction driver. Applied to active tabs, primary navigation highlights, focus states, interactive chips, and study session progress meters.
- **Secondary (`#FFC700` - Quest Gold)**: The achievement and prestige accent. Reserved for completion callouts, level-up banners, coin counters, daily streak badges, and priority quest highlights.
- **Tertiary (`#22C55E` - Stamina Green)**: Vitality, confirmed completions, submitted assignments, and healthy habit milestones.
- **Danger (`#EF4444` - Boss / Exam Red)**: Imminent deadlines (under 24 hours), overdue quests, high-stakes exams, and destructive actions.
- **Neutral Canvas (`#181824` - Midnight Slate)**: Deep, warm purple-tinted night base for the entire canvas.
- **Surface Elevation (`#222236` - Quest Slate Container)**: Elevated card backgrounds, modal shells, and modular widget plates.
- **Border Trim (`#383854`)**: Soft highlight rim on elevated surfaces.
- **Tactile Base/Trench (`#0F0F17`)**: Deep underside extrusion shadow providing physical depth under interactive components.
- **Text Palette**: Primary typography sits at `#F8FAFC` for pristine legibility; secondary supporting metadata uses `#94A3B8`. Special retro level milestones utilize `#FDE047`.

## Typography

The typography strategy harmonizes gaming character with rigorous academic readability:
- **Headlines & Badges (`Rubik`)**: Its soft geometric construction echoes vintage arcade blockiness without suffering from the low legibility of raw bitmap fonts on high-density mobile screens. Heavy weights (`600` and `700`) provide authoritative, punchy quest banners and level summaries.
- **Body & Controls (`Plus Jakarta Sans`)**: Delivers friendly, open counters and supreme readability for course syllabi, assignment descriptions, task sub-items, and time-stamped logs.
- **Letter Spacing**: Labels and quest tag chips utilize deliberate letter spacing (`0.04em` to `0.08em`) with uppercase styling to emulate RPG attribute panels (e.g., `LVL 4`, `+50 XP`, `DUE 2H`).

## Layout & Spacing

The layout is built upon an 8pt modular grid with a strict 4pt half-step sub-grid for tight tactical HUD elements and retro framing:
- **Mobile Handheld Frame (Default)**: A fluid single-column stack constrained to safe zones with `1rem` outer margins. Content groups (Daily Quests, Boss Timers, Inventory Badges) are stacked with `space-md` gaps.
- **Tablet / Split Screen**: Expands into a 4-to-8 column layout with `1.5rem` margins, separating the active quest board from the player stats/inventory panel.
- **Density Rhythms**:
  - `space-2xs` (2px) and `space-xs` (4px) control internal component offsets: the thickness of bottom bevels, segmented progress ticks, and item badge frames.
  - `space-sm` (8px) and `space-md` (12px) govern badge padding, sub-task lists, and inline chip spacing.
  - `space-xl` (24px) establishes structural breathing room between distinct HUD sections.

## Elevation & Depth

Visual hierarchy does not use diffuse, floating blur shadows. Instead, it relies on **Layered Bas-Relief (Tactile Chiseled Depth)** inspired by cartridge-era cartridges and inventory boxes:

1. **Recessed Wells (Troughs & Trackers)**:
   - Used for unfulfilled progress meters, item slot sockets, and unchecked task boxes.
   - Background: `#0F0F17`.
   - Inner Border / Shadow: `inset 0 2px 0 0 #08080C`.
2. **Surface Ground (Base Canvas)**:
   - Canvas tone `#181824`. Completely matte, zero shadow.
3. **Tactile Plate (Cards, Slots, Dialogs)**:
   - Background: `#222236`.
   - Top Highlight Lip: `inset 0 1px 0 0 #4A4A6E` (simulates top lighting).
   - Crisp Outline: `1px solid #383854`.
   - Physical Drop Offset: `0 4px 0 0 #0F0F17`.
4. **Interactive Raised State (Buttons, Selectable Tiles)**:
   - Floating interactives feature a bold, solid 4px tactile drop lip.
   - On `:active` or pressed states, the drop lip reduces to `0 1px 0 0`, translating the button downward by `3px` for immediate, mechanical tactile confirmation.

## Shapes

The design system adopts **Roundedness Level 1 (Soft)**:
- Base elements receive a consistent micro-radius of `0.25rem` (`4px`).
- Medium containers and cards adopt `0.375rem` (`6px`).
- Larger modals and character sheets max out at `0.5rem` (`8px`).

This deliberate micro-corner approach evokes the aesthetic of 16-bit rounded pixel tiles while avoiding the ergonomic friction and anti-aliasing artifacts of pure `0px` harsh square geometry on modern OLED mobile displays. Pill shapes are forbidden except for live status pips (`2px` round indicators).

## Components

### 1. Tactile Push Buttons
- **Structure**: Rounded `4px` corner, outer border `1px solid #0F0F17`.
- **Primary (Mana Blue)**: Background `#38BDF8`, text `#0F172A`, top highlight `inset 0 1px 0 rgba(255, 255, 255, 0.4)`, bottom drop shelf `box-shadow: 0 4px 0 0 #0284C7`.
- **Secondary (Quest Gold)**: Background `#FFC700`, text `#181824`, bottom drop shelf `box-shadow: 0 4px 0 0 #B45309`.
- **Pressed Interaction**: `transform: translateY(3px); box-shadow: 0 1px 0 0 [Darker Tint];`.

### 2. Segmented Retro XP & HP Progress Bars
- **Frame**: Deep trench `#0F0F17` container with `2px` internal padding and `3px` corner radius.
- **Fill**: Solid block color (`#22C55E` for XP/Health, `#38BDF8` for Mana/Study sprint) with vertical `2px` gap notched dividers spaced every `10%` to emulate segmented retro cartridges.
- **Label**: Embedded tiny uppercase badge (`label-sm`, e.g., `450 / 500 XP`) aligned right.

### 3. Quest Cards
- **Plate**: Background `#222236`, border `1px solid #383854`, drop shadow `0 4px 0 0 #0F0F17`.
- **Header Slot**: Left-aligned difficulty/quest icon in a `32x32px` recessed tile (`#181824`), quest title in `headline-sm`, and right-aligned reward chip (`+50 XP`).
- **Urgent Modifiers**: Exam / Boss quests swap the card's left border accent to a `3px solid #EF4444` strip.

### 4. RPG Tag Chips & Badges
- **Style**: Compact height (`22px`), background `#181824`, border `1px solid #383854`, micro-radius `3px`.
- **Typography**: `label-sm` in bold uppercase.
- **Accents**: Gold XP reward (`color: #FDE047`), Study Quest (`color: #38BDF8`), Boss Quest (`color: #F87171`, background `#2A151B`).

### 5. Checkboxes (Quest Slayers)
- **Geometry**: `20x20px` square with `3px` micro-radius.
- **Unchecked**: Background `#0F0F17`, border `2px solid #383854`.
- **Checked**: Background `#22C55E`, border `2px solid #15803D`, displaying an iconic pixelated checkmark glyph in `#0F0F17`. Card title simultaneously transitions to strikethrough with opacity `0.5`.

### 6. Inputs & Quest Creation Fields
- **Trough**: Background `#14141F`, border `1px solid #2E2E44`, inset shadow `inset 0 2px 2px #09090E`.
- **Focus State**: Border shifts to `1px solid #38BDF8`, outer glow `0 0 0 2px rgba(56, 189, 248, 0.2)`. Placeholder text in `#64748B`.

### 7. Item Frame Slot (Inventory & Streaks)
- **Dimensions**: `44x44px` square tile.
- **Frame**: Dual border with an outer `#383854` and an inner `#0F0F17` socket.
- **Corner Pip**: Shows daily streak count or consumable multiplier (e.g., `x3`) pinned to the bottom-right corner in a raised gold pill.
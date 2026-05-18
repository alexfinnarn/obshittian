---
name: Obsidian Twilight
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#31353c'
  on-surface: '#e0e2eb'
  on-surface-variant: '#c0c6d5'
  inverse-surface: '#e0e2eb'
  inverse-on-surface: '#2d3037'
  outline: '#8a919f'
  outline-variant: '#414753'
  surface-tint: '#a6c8ff'
  primary: '#a6c8ff'
  on-primary: '#003060'
  primary-container: '#3794ff'
  on-primary-container: '#002c58'
  inverse-primary: '#005eb1'
  secondary: '#4de082'
  on-secondary: '#003919'
  secondary-container: '#00b55d'
  on-secondary-container: '#003e1c'
  tertiary: '#ffb77f'
  on-tertiary: '#4e2600'
  tertiary-container: '#e07800'
  on-tertiary-container: '#482200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a6c8ff'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#004787'
  secondary-fixed: '#6dfe9c'
  secondary-fixed-dim: '#4de082'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005227'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ffb77f'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6f3800'
  background: '#10131a'
  on-background: '#e0e2eb'
  surface-variant: '#31353c'
  bg-primary: '#1e1e1e'
  bg-secondary: '#252525'
  bg-hover: '#3a3a3a'
  border-default: '#333333'
  text-primary: '#e0e0e0'
  text-muted: '#888888'
  status-pending-bg: '#3a3a3a'
  status-pending-border: '#555555'
  status-complete-bg: '#1a4d1a'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.2'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 280px
  touch-target-min: 44px
  gutter-md: 16px
  margin-edge: 24px
  nav-height-mobile: 56px
---

## Brand & Style

The design system is engineered for the "high-focus" developer and power user. It prioritizes information density and functional clarity over decorative flair, evoking the atmosphere of a sophisticated Integrated Development Environment (IDE).

The brand personality is **technical, utilitarian, and dependable**. It targets users who manage complex information architectures and requires a UI that recedes into the background to let the content lead. 

The aesthetic is **Corporate Modern with Minimalist influences**, utilizing a "Flat Layered" approach. Depth is communicated through subtle shifts in monochromatic values rather than physical metaphors like shadows. The emotional response should be one of "calm productivity" and "uninterrupted flow."

## Colors

This design system uses a strictly dark-themed palette. The color strategy relies on low-light backgrounds to reduce eye strain during extended sessions.

- **Primary & Actions**: A vibrant "IDE Blue" (`#3794ff`) is used for primary actions, active navigation states, and focus indicators.
- **Success & Completion**: A lush "Terminal Green" (`#4ade80`) signifies completed tasks and positive system states.
- **Surface Hierarchy**:
    - **Level 0**: `#1e1e1e` (Main workspace and editor)
    - **Level 1**: `#252525` (Sidebars and navigation bars)
    - **Interactive**: `#3a3a3a` (Hover states and secondary buttons)
- **Typography**: Primary content uses a high-contrast off-white (`#e0e0e0`) to ensure readability without the harshness of pure white.

## Typography

The system utilizes two distinct font families to separate UI concerns from content concerns.

- **UI & Interface**: **Hanken Grotesk** provides a sharp, contemporary feel that remains legible at small sizes. Headings use `text-wrap: balance` to ensure clean rags in multi-column layouts.
- **The Editor & Metadata**: **JetBrains Mono** is used for the markdown editor, code snippets, and metadata labels (like tag counts or timestamps). This reinforces the technical nature of the application.

All text blocks must implement `overflow-wrap: break-word` to prevent layout breaking in the narrow side-pane system.

## Layout & Spacing

The design system employs a **three-pane fixed/fluid hybrid grid**:
1. **Left Pane (Fixed)**: 280px. Contains global navigation, calendar, and file explorer.
2. **Center Pane (Fluid)**: Main content/editor.
3. **Right Pane (Fluid/Optional)**: Contextual notes or preview.

**Breakpoints**:
- **Desktop (>= 1024px)**: Full three-pane visibility.
- **Tablet (768px - 1023px)**: Two-pane layout (Sidebar collapses into an overlay or narrow icon bar).
- **Mobile (< 768px)**: Single pane layout with a fixed bottom navigation bar (`56px`).

Spacing is "compact" to maximize information density. Internal component padding should follow a 4px/8px scale.

## Elevation & Depth

Depth is achieved through **Tonal Layering** rather than shadows. 

- **The Base**: The darkest color (`#1e1e1e`) is the most distant layer, used for the primary workspace.
- **Overlays & Sidebars**: Higher hierarchy elements like sidebars use a lighter tint (`#252525`).
- **Dividers**: 1px solid borders (`#333333`) are used to define boundaries between panes and logic blocks.
- **Active States**: Use a "Left-accent" or "Bottom-accent" 2px border in the primary accent color rather than elevation to denote selection.

## Shapes

The system uses a **Soft** shape language to provide a slight modern touch to an otherwise rigid, technical layout. 

- **Components**: Buttons, input fields, and cards use a `0.25rem` (4px) radius.
- **Selection States**: Active states in the sidebar (file list) should use a subtle background highlight with the same soft radius.
- **Interactive Areas**: All interactive elements must maintain a minimum touch target of `44px` even if their visual size is smaller.

## Components

- **Buttons**:
    - **Primary**: Solid blue background (`#3794ff`) with white text. 
    - **Ghost**: Transparent background with `#333` border; transitions to `#3a3a3a` on hover.
- **Chips & Tags**: Rounded pills with a `#3a3a3a` background. For active or highlighted tags, use a subtle colored border or the primary blue text.
- **File Explorer**: A tree-view structure with 16px indentation per level. Icons (folder/file) should be muted (`#888`) and turn white on active state.
- **Markdown Editor**: Dual-pane support (Edit/Preview). The editor must use a monospaced font with syntax highlighting colors that contrast against the `#1e1e1e` background.
- **Calendar Widget**: A high-density grid. The "Current Day" is indicated by a primary blue circle; "Entries Present" are indicated by a small dot below the date number.
- **Inputs**: Dark background (`#252525`), 1px border (`#333`), and a blue `1px` outline on focus.
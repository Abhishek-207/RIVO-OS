# Task Breakdown: App Shell

## Overview
Total Tasks: 8 Task Groups

## Task List

### Foundation Layer

#### Task Group 1: Design Tokens and CSS Variables
**Dependencies:** None

- [x] 1.0 Complete design tokens and CSS foundation
  - [x] 1.1 Create design tokens in Tailwind config
    - Colors: primary (blue), accent (orange/coral), active-bg (light blue), gray-100
    - Spacing: sidebar-expanded (240px), sidebar-collapsed (64px), header-height (56px), page-header-height (64px), side-panel-width (420px)
    - Breakpoints: mobile (<768px), tablet (768-1023px), desktop (>=1024px)
  - [x] 1.2 Set up CSS variables in global styles
    - Define CSS custom properties for dynamic values (sidebar width transitions)
    - Create utility classes for layout dimensions

**Acceptance Criteria:**
- Design tokens accessible via Tailwind classes
- CSS variables defined for dynamic layout properties

---

### Layout Components

#### Task Group 2: Base Layout Structure
**Dependencies:** Task Group 1

- [x] 2.0 Complete base layout component
  - [x] 2.1 Create AppLayout component
    - Props: children, sidebarCollapsed, onSidebarToggle
    - Structure: header (fixed top), sidebar (fixed left), main content (scrollable)
    - Use CSS Grid or Flexbox for layout
  - [x] 2.2 Implement layout context for shared state
    - Create LayoutContext for sidebar state, side panel state
    - Provide toggle functions for sidebar and side panel
  - [x] 2.3 Add gray-100 background to content area
    - Scrollable content container
    - Proper padding/margins per breakpoint

**Acceptance Criteria:**
- Layout renders three-zone structure (header, sidebar, content)
- Sidebar toggle works
- Content area scrolls independently

---

#### Task Group 3: Header Component
**Dependencies:** Task Group 2

- [x] 3.0 Complete header component
  - [x] 3.1 Create Header component
    - Fixed height: 56px
    - White background
    - Left: Rivo logo (house/R icon + "Rivo" wordmark)
    - Right: User menu with avatar/initials dropdown
  - [x] 3.2 Add Rivo logo asset
    - Import logo from `planning/visuals/`
    - Logo links to dashboard/home route
    - Match visual: house/R icon + "Rivo" text
  - [x] 3.3 Implement user menu dropdown
    - Display user initials or avatar
    - Dropdown with profile, logout options
    - Use shadcn/ui DropdownMenu component
  - [x] 3.4 Add hamburger menu for mobile
    - Hidden on desktop (>=1024px)
    - Visible on mobile/tablet (<1024px)
    - Triggers sidebar overlay

**Acceptance Criteria:**
- Header renders at correct height
- Logo visible and links to home
- User menu functional
- Hamburger menu appears on smaller screens
- Matches mockup: `planning/visuals/Screenshot 2026-01-13 at 1.01.52 AM.png`

---

#### Task Group 4: Sidebar Navigation
**Dependencies:** Task Group 2

- [x] 4.0 Complete sidebar navigation component
  - [x] 4.1 Create Sidebar component
    - Width: 240px expanded, 64px collapsed
    - Light/white background
    - Sections: WORKSPACE, TOOLBOX, Settings (at bottom)
  - [x] 4.2 Create NavItem component
    - Props: icon, label, href, isActive
    - Orange/coral icon color
    - Light blue background when active
    - Hover state for feedback
    - Show only icon when sidebar collapsed
  - [x] 4.3 Implement navigation structure
    - WORKSPACE section: Leads, Clients, Cases
    - TOOLBOX section: WhatsApp, Bank Products
    - Settings section: positioned at bottom, separated
  - [x] 4.4 Add collapse/expand toggle button
    - Toggle button in sidebar
    - Animate width transition smoothly
    - Store preference (optional: localStorage)

**Acceptance Criteria:**
- Sidebar renders with correct dimensions
- Navigation items display with orange icons
- Active state shows light blue background
- Collapse/expand works smoothly
- Matches mockup visual structure

---

#### Task Group 5: Role-Based Navigation
**Dependencies:** Task Group 4

- [x] 5.0 Complete role-based navigation filtering
  - [x] 5.1 Create navigation permissions config
    - Define nav items with role access arrays
    - Admin: Settings sub-items only (Users & Roles, Channels, Bank Products, Templates, SLA Config)
    - Manager: Dashboard, Clients, Cases, Analytics
    - Mortgage Specialist: Dashboard, Clients, Cases, Toolbox items
    - Process Owner: Dashboard, Cases, Toolbox items
  - [x] 5.2 Create useNavigationItems hook
    - Accept user role from auth context
    - Filter navigation items based on role permissions
    - Return filtered navigation structure
  - [x] 5.3 Integrate with Sidebar component
    - Use useNavigationItems hook
    - Render only permitted items per role

**Acceptance Criteria:**
- Navigation items filtered by user role
- Admin sees only Settings
- Other roles see appropriate sections

---

#### Task Group 6: Page Header Pattern
**Dependencies:** Task Group 2

- [x] 6.0 Complete page header component
  - [x] 6.1 Create PageHeader component
    - Props: title, subtitle, showSearch, filterTabs, filters, actionButton
    - Height: 64px
    - Layout: title/subtitle left, search + filters + action right
  - [x] 6.2 Implement search input slot
    - Optional search bar (page-level, not global)
    - Use shadcn/ui Input component
    - Placeholder text configurable
  - [x] 6.3 Implement filter tabs slot
    - Tab buttons (e.g., "New", "All")
    - Active tab styling
    - onChange callback
  - [x] 6.4 Implement dropdown filters slot
    - Dropdown filter(s) (e.g., "Source")
    - Use shadcn/ui Select component
  - [x] 6.5 Implement action button slot
    - Optional primary action button
    - Right-aligned

**Acceptance Criteria:**
- Page header renders with configurable slots
- Search, filters, and action button work
- Matches mockup page header pattern
- Flexible for different page needs

---

#### Task Group 7: Side Panel Component
**Dependencies:** Task Group 2

- [x] 7.0 Complete side panel component
  - [x] 7.1 Create SidePanel component
    - Props: isOpen, onClose, title, children
    - Width: 420px
    - Slide-in animation from right
    - Push content layout (adjust main content width)
  - [x] 7.2 Implement close behaviors
    - Close button in header
    - Close on Escape key press
    - Close on click outside panel
  - [x] 7.3 Add focus trapping for accessibility
    - Trap focus within panel when open
    - Return focus to trigger element on close
    - Use proper ARIA attributes (role="dialog", aria-modal)
  - [x] 7.4 Integrate with layout context
    - Side panel state in LayoutContext
    - Content area adjusts when panel open

**Acceptance Criteria:**
- Panel slides in at 420px
- Content pushes (not overlay) on desktop
- Keyboard and click-outside close work
- Focus trapped for accessibility

---

### Responsive Behavior

#### Task Group 8: Responsive Layout
**Dependencies:** Task Groups 3, 4, 7

- [x] 8.0 Complete responsive layout behavior
  - [x] 8.1 Implement desktop layout (>=1024px)
    - Sidebar expanded by default
    - All layout components visible
    - Side panel pushes content
  - [x] 8.2 Implement tablet layout (768-1023px)
    - Sidebar collapsed by default (icons only)
    - Can expand on click
    - Side panel may overlay
  - [x] 8.3 Implement mobile layout (<768px)
    - Sidebar hidden by default
    - Hamburger menu in header toggles sidebar overlay
    - Sidebar overlays content when open
    - Side panel takes full width
  - [x] 8.4 Add mobile sidebar overlay
    - Backdrop when sidebar open on mobile
    - Close on backdrop click
    - Smooth animation

**Acceptance Criteria:**
- Layout adapts correctly at each breakpoint
- Sidebar behavior matches spec per breakpoint
- Side panel responsive behavior works

---

## Execution Order

Recommended implementation sequence:

1. **Foundation** (Task Group 1) - Design tokens and CSS variables
2. **Base Layout** (Task Group 2) - AppLayout component structure
3. **Header** (Task Group 3) - Header with logo and user menu
4. **Sidebar** (Task Group 4) - Sidebar navigation component
5. **Role-Based Nav** (Task Group 5) - Permission-based filtering
6. **Page Header** (Task Group 6) - Page header pattern component
7. **Side Panel** (Task Group 7) - Slide-in side panel
8. **Responsive** (Task Group 8) - Breakpoint behaviors

## Technical Notes

- **Tech Stack:** React + TypeScript, Tailwind CSS, shadcn/ui
- **Routing:** React Router for navigation
- **State:** React Context for layout state (sidebar, side panel)
- **Auth Integration:** Supabase Auth for user session and role
- **Accessibility:** WCAG compliant, focus management, ARIA labels
- **Reference Mockup:** `planning/visuals/Screenshot 2026-01-13 at 1.01.52 AM.png`
- **Logo Asset:** `planning/visuals/WhatsApp Image 2026-01-01 at 21.26.06 (1) (2).png`

## MVP Exclusions (Out of Scope)

- Dark mode (light theme only)
- Notification system (placeholder icon only)
- Global search functionality (page-level search only)
- Keyboard shortcuts

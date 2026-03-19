# Spec Requirements: App Shell

## Initial Description

App Shell feature for Rivo OS - a Lead Operating System for mortgage businesses. The app shell is the foundational UI structure/layout of the application, including the header, sidebar navigation, page layout structure, and common components that will be used across all features.

## Requirements Discussion

### First Round Questions

**Q1:** What are the core layout components needed for the app shell?
**Answer:** Based on visual analysis and user specifications:
- Header: 56px height, white background, Rivo logo on left, user menu on right
- Sidebar: 240px expanded, 64px collapsed, light/white background with light blue active state
- Page Header: 64px height with title, subtitle, search bar, filter tabs, dropdown filters
- Side Panel: 420px width, slides in from right, pushes content
- Content Area: Scrollable with gray-100 background

**Q2:** What navigation sections and items are needed?
**Answer:** Per v1.0 role requirements:
- WORKSPACE section: Leads, Clients, Cases
- TOOLBOX section: WhatsApp, Bank Products
- Settings at bottom (separate section)
- Navigation varies by role (see role-based navigation below)

**Q3:** What are the role-based navigation requirements?
**Answer:** v1.0 Roles with specific navigation access:
- Admin: Settings only (Users & Roles, Channels, Bank Products, Templates, SLA Config)
- Manager: Dashboard, Clients, Cases + Analytics
- Mortgage Specialist: Dashboard, Clients, Cases + Toolbox
- Process Owner: Dashboard, Cases + Toolbox

**Q4:** What responsive breakpoints should be supported?
**Answer:** Three breakpoints defined:
- Desktop: >= 1024px (full layout)
- Tablet: 768-1023px (collapsed sidebar)
- Mobile: < 768px (hidden sidebar with hamburger menu)

**Q5:** What common components should be included in the app shell?
**Answer:**
- Tables (clean layout as shown in mockup)
- Badges (status indicators)
- Buttons (primary, secondary, destructive)
- Forms (inputs, dropdowns, checkboxes)
- Loading states (skeleton screens)
- Empty states

**Q6:** What features are explicitly excluded from MVP?
**Answer:** MVP Exclusions:
- Dark mode (light only)
- Notifications (placeholder icon only)
- Global search (page-level only)
- Keyboard shortcuts

### Existing Code to Reference

No similar existing features identified for reference - this is the foundational shell that other features will build upon.

### Follow-up Questions

No follow-up questions needed - comprehensive requirements provided.

## Visual Assets

### Files Provided:

- `Screenshot 2026-01-13 at 1.01.52 AM.png`: Full application mockup showing the Leads page with complete app shell layout. Shows header with Rivo logo and user menu, sidebar with WORKSPACE (Leads, Clients, Cases) and TOOLBOX (WhatsApp, Bank Products) sections, Settings at bottom. Page content shows a data table with search, filter tabs (New, All), and source dropdown. Orange/coral nav icons visible with light blue active state on Leads.

- `WhatsApp Image 2026-01-01 at 21.26.06 (1) (2).png`: Rivo logo asset showing the house/R icon combination with "Rivo" wordmark in black and trademark symbol. Clean, minimal design.

### Visual Insights:

- Header: White background, Rivo logo (house/R icon + "Rivo" text) positioned on left, user avatar/menu on right with "refresh" and user profile elements
- Sidebar: Light/white background, light blue highlight for active navigation item
- Navigation icons: Orange/coral colored icons for each nav item
- Section grouping: Clear visual separation between WORKSPACE and TOOLBOX sections
- Typography: Clean sans-serif font, hierarchical sizing
- Content area: Clean table layout with proper spacing
- Page header pattern: Title + subtitle on left, search bar, filter tabs, dropdown filters
- Fidelity level: High-fidelity mockup - represents intended final design

## Requirements Summary

### Functional Requirements

**Header (56px height)**
- Rivo logo (house/R icon + "Rivo" wordmark) positioned on left
- Logo links to dashboard/home
- User menu on right with avatar/initials dropdown
- Notification icon (placeholder only for MVP)
- White background

**Sidebar Navigation (240px expanded / 64px collapsed)**
- Light/white background
- Collapsible (toggle button)
- Light blue active state for selected item
- Orange/coral colored navigation icons
- Sections:
  - WORKSPACE: Leads, Clients, Cases
  - TOOLBOX: WhatsApp, Bank Products
  - Settings (bottom, separated)
- Role-based visibility (items hidden based on user role)
- Hover states for interactive feedback

**Page Header (64px height)**
- Page title (bold, larger)
- Page subtitle/description (smaller, muted)
- Search bar (page-level, not global)
- Filter tabs (e.g., New, All)
- Dropdown filters (e.g., Source)
- Action buttons when applicable

**Side Panel (420px width)**
- Slides in from right side
- Pushes content (does not overlay)
- Close on Escape key press
- Close on outside click
- Proper focus trapping for accessibility

**Content Area**
- Scrollable (independent of sidebar/header)
- Gray-100 background color
- Responsive padding/margins

**Login Page**
- Split screen layout
- Left half: Login form (email + password fields)
- Right half: Dark color panel (navy/dark blue) with branding

### Role-Based Navigation

| Role | Dashboard | Clients | Cases | Toolbox | Analytics | Settings |
|------|-----------|---------|-------|---------|-----------|----------|
| Admin | - | - | - | - | - | Full Access |
| Manager | Yes | Yes | Yes | - | Yes | - |
| Mortgage Specialist | Yes | Yes | Yes | Yes | - | - |
| Process Owner | Yes | - | Yes | Yes | - | - |

**Settings Sub-Items (Admin only):**
- Users & Roles
- Channels
- Bank Products
- Templates
- SLA Config

### Layout Dimensions

| Component | Dimension |
|-----------|-----------|
| Header Height | 56px |
| Sidebar Expanded | 240px |
| Sidebar Collapsed | 64px |
| Page Header Height | 64px |
| Side Panel Width | 420px |

### Responsive Behavior

**Desktop (>= 1024px)**
- Full sidebar visible (expanded by default)
- All layout components visible
- Side panel pushes content

**Tablet (768-1023px)**
- Sidebar collapsed by default (64px - icons only)
- Can expand on click
- Side panel may overlay on smaller tablets

**Mobile (< 768px)**
- Sidebar hidden by default
- Hamburger menu in header to toggle sidebar
- Sidebar overlays content when open
- Side panel takes full width

### Common Components (to be included)

**Tables**
- Clean layout with proper column spacing
- Row hover states
- Selection capability
- Pagination

**Badges**
- Status indicators (success, warning, error, info)
- SLA timer badges (overdue states)

**Buttons**
- Primary (filled)
- Secondary (outlined)
- Destructive (red)
- Ghost (text only)
- Icon buttons

**Forms**
- Text inputs
- Dropdowns/selects
- Checkboxes
- Radio buttons
- Date pickers

**Loading States**
- Skeleton screens for content areas
- Spinner for actions

**Empty States**
- Illustration + message pattern
- Call-to-action when applicable

### Color Tokens

Based on visual analysis:
- Background: White (header, sidebar), Gray-100 (content area)
- Primary: Blue (links, primary buttons)
- Active State: Light blue (navigation)
- Icons: Orange/coral (navigation icons)
- Text: Black/gray hierarchy
- Login panel: Navy/dark blue

### Scope Boundaries

**In Scope:**
- Header component with logo and user menu
- Sidebar navigation with role-based visibility
- Page header pattern component
- Side panel component with slide-in behavior
- Content area layout
- Login page layout
- Responsive behavior for all breakpoints
- Common reusable components (tables, badges, buttons, forms)
- Loading states (skeleton screens)
- Empty states
- Light theme only

**Out of Scope:**
- Dark mode (future consideration)
- Notification system (placeholder icon only)
- Global search functionality (page-level search only)
- Keyboard shortcuts
- Actual page content implementation
- Backend API integration
- Real authentication logic (just UI structure)

### Technical Considerations

- Built with React + TypeScript
- Styled with Tailwind CSS
- Uses shadcn/ui component library as base
- React Router for navigation
- Role-based rendering using context/permissions
- Supabase Auth integration for user session
- Responsive design using Tailwind breakpoints
- Accessible (WCAG compliant) - proper focus management, ARIA labels
- Side panel focus trapping for accessibility

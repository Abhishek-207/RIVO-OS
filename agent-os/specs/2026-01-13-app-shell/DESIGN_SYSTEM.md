# Rivo Design System

## Color Palette

### Primary Colors
- **Navy Primary**: `#1e3a5f` - Main brand color, used for primary buttons, active states, avatars
- **Navy Light**: `#2d4a6f` - Lighter variant for hover states
- **Navy Dark**: `#0f2744` - Darker variant for pressed states

### Neutral Colors
- **Gray 50**: `#f8f9fb` - Page background
- **Gray 100**: `#f5f8fa` - Active nav item background
- **Gray 200**: `#e5e7eb` - Borders
- **Gray 400**: `#9ca3af` - Muted text, icons
- **Gray 500**: `#6b7280` - Secondary text
- **Gray 600**: `#4b5563` - Body text
- **Gray 900**: `#111827` - Headings

### Semantic Colors
- **Green 600**: `#16a34a` - Active status, success
- **Red 500**: `#ef4444` - Error, destructive actions
- **Purple 700**: `#6b4c8a` - Process Owner role

### Role Badge Colors
All roles use light background colors for visual consistency:

| Role | Background | Text |
|------|------------|------|
| Admin | `#e8f0f5` | `#1e3a5f` |
| Manager | `#e8f0f5` | `#1e3a5f` |
| Mortgage Specialist | `#e8f5f0` | `#2d6a4f` |
| Process Owner | `#f0e8f5` | `#6b4c8a` |

### Avatar Colors (by user)
- Admin User: `#e07a5f` (coral)
- Manager: `#4a9079` (teal green)
- Specialist: `#7c7c8a` (gray)
- Executive: `#3d8b8b` (dark teal)

## Logo Sizes

- **Sidebar**: `h-12` (48px) - cropped logo next to hamburger menu
- **Login Page**: `h-16` (64px) - cropped logo for branding
- **Chrome Tab Favicon**: `rivo-icon.png` - icon only (no text)
- **Logo File**: `rivo-logo.png` - cropped version with minimal whitespace

## Typography

### Font Stack
- System font stack (default Tailwind)
- Monospace for usernames/passwords: `font-mono`

### Font Sizes
- Page title: `text-lg` (18px) `font-semibold`
- Section labels: `text-[10px]` uppercase tracking-wider
- Body text: `text-sm` (14px)
- Table headers: `text-xs` (12px) uppercase
- Small/helper text: `text-xs` (12px)

## Spacing

### Layout
- Sidebar width: `220px` (expanded), `64px` (collapsed)
- Header height: `h-14` (56px)
- Page padding: `px-6 py-5`
- Table cell padding: `py-4 px-6`

### Component Spacing
- Button padding: `px-4 py-2` or `px-4 py-2.5`
- Form field height: `h-11` (44px)
- Icon size in nav: `h-[18px] w-[18px]`
- Avatar size: `w-9 h-9` (36px)

## Components

### Buttons

#### Primary Button
```css
bg-[#1e3a5f] text-white rounded-lg hover:bg-[#0f2744] transition-colors text-sm
```

#### Secondary Button
```css
border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm
```

### Form Inputs
```css
w-full h-11 px-4 border border-gray-200 rounded-lg
focus:outline-none
/* No focus ring or border change - clean minimal style */
```

### Navigation Item (Active)
```css
bg-[#f5f8fa] text-[#1e3a5f] font-medium
/* With left border indicator */
absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#1e3a5f] rounded-r
```

### Navigation Item (Inactive)
```css
hover:bg-gray-50 text-gray-600
```

### Side Panel
- Width: `50%` of viewport, minimum `400px`
- Header height: `h-14` (matches main header)
- Shadow: `shadow-xl`
- Backdrop: `bg-black/20`

### Status Dropdown
- Active: Green text `text-green-600 font-medium` with "Active" label
- Inactive: Gray text `text-gray-400` with "Inactive" label
- Dropdown with ChevronDown icon

### Table
- Header: `text-xs font-medium text-gray-400 uppercase tracking-wider`
- Row border: `border-b border-gray-50`
- Hover: `hover:bg-gray-50/50`

### Tab-Based Filtering Pattern
Used across all list pages (Users, Channels, Clients, Leads, Cases):

```css
/* Tab container - inline with search */
flex items-center gap-1 border-b border-gray-200

/* Individual tab */
px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors

/* Active tab */
border-[#1e3a5f] text-[#1e3a5f]

/* Inactive tab */
border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300
```

**Key Pattern:** Status filtering is handled by tabs, NOT by a column in the table. This keeps tables cleaner and provides a better UX.

### Prominent Create Buttons
All "New X" buttons use filled primary style:

```css
flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors
```

With Plus icon: `<Plus className="h-3.5 w-3.5" />`

### Input Validation for Numbers
SLA and amount fields use JavaScript validation to prevent negative values:

```typescript
const handleSlaChange = (value: string) => {
  const num = parseInt(value)
  if (value === '' || (num >= 0 && !isNaN(num))) {
    setSla(value)
  }
}
```

Plus HTML attribute: `min="0"`

## Layout Structure

### App Shell
```
┌──────────┬──────────────────────────────────────┐
│ [≡] Logo │         Header (h-14)                │
│──────────│╭─────────────────────────────────────│
│          ││                                     │
│ Sidebar  ││    Main Content (bg-white)          │
│ (220px)  ││    rounded-tl-2xl                   │
│          ││                                     │
│ - Nav    ││                                     │
│          ││                                     │
└──────────┴┴─────────────────────────────────────┘
```

- Sidebar extends full height from top (top-0 to bottom-0)
- Hamburger menu at top-left next to logo
- Main content has `rounded-tl-2xl` and `bg-white`
- Page background is `bg-[#f8f9fb]` (light gray)

### Sidebar Structure
1. Top row: Hamburger menu + Logo (h-14)
2. Navigation sections with labels
3. Full height, fixed position

### Page Structure
1. Page header with title + actions
2. Content area (table, form, etc.)

## Animation & Transitions

- Sidebar collapse: `transition-all duration-200 ease-out`
- Hover states: `transition-colors`
- Side panel: slide from right

## User Identification

- Users are identified by **username only** (no email, no full name)
- User type: `{ id: string, username: string, role: UserRole }`
- Avatar initials: First 2 characters of username, uppercase
- Display username everywhere (header, dropdowns, tables)

## System Password
- Default: `rivo26`
- Storage key: `rivo-system-password`
- Stored in localStorage
- All mock users use this password

## Shared Utilities and Components

### Formatting Utilities (`/lib/formatters.ts`)
Centralized formatting functions used across all pages:

```typescript
formatTimeAgo(dateString)    // "2d ago", "5h ago", "Just now"
formatDate(dateString)       // "15 Jan 2024" (en-GB)
formatDateAE(dateString)     // "Jan 15, 2024" (en-AE)
formatCurrencyAED(value)     // "AED 150,000"
formatDbr(dbrString)         // "AED 5,000" or "-"
getDbrColorClass(dbrString)  // "text-green-600" / "text-amber-600" / "text-red-600"
```

### Debounced Search Hook (`/hooks/useDebouncedSearch.ts`)
Reusable hook for search inputs with debouncing:

```typescript
const { inputValue, setInputValue, debouncedValue, clear } = useDebouncedSearch({
  initialValue: '',
  delay: 300,
  onSearch: (value) => setFilters({ search: value, page: '1' })
})
```

### Table Page Components (`/components/ui/TablePageLayout.tsx`)

#### PageHeader
Consistent page header with title, subtitle, and optional action button:
```tsx
<PageHeader
  title="Clients"
  subtitle="Manage mortgage applicants"
  actionLabel="New Client"
  onAction={() => setSelectedId('new')}
  hideAction={isReadOnly}
/>
```

#### StatusTabs
Generic status filter tabs with TypeScript generics:
```tsx
<StatusTabs
  tabs={[
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'declined', label: 'Declined' },
  ]}
  value={statusFilter}
  onChange={(value) => setStatusFilter(value)}
/>
```

#### SearchInput
Consistent search input with icon:
```tsx
<SearchInput
  value={inputValue}
  onChange={setInputValue}
  placeholder="Search..."
/>
```

### SLA Filter Dropdown
Standard SLA filter used on Leads, Clients, and Cases pages (always first dropdown after search):

```typescript
const SLA_OPTIONS = [
  { value: '', label: 'All SLA' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'remaining', label: 'Remaining' },
]
```

### Filter Order Convention
Standard filter order on table pages:
1. Search input
2. SLA dropdown (first)
3. Status tabs or other filters
4. Source/Bank dropdowns (last)

### Side Panel Close/Stay Open Behavior
Standard behavior for when side panels close vs stay open:

**Close panel after:**
| Action | Reason |
|--------|--------|
| Create new entity | Task complete, show in list |
| Status/Stage change | Context changed |
| Convert Lead to Client | New entity created |
| Delete | Entity removed |

**Stay open after:**
| Action | Reason |
|--------|--------|
| Save/Update existing | User may continue editing |
| Upload document | User may upload more |
| Add note | User may add more |

**Principle:** Create = task complete (close), Edit = ongoing work (stay open)

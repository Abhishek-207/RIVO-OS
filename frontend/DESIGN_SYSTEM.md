# Rivo OS Design System

Comprehensive design specifications for building consistent UI across all pages.

---

## Colors

### Primary Palette

```
Navy (Primary):     #1e3a5f
Navy Hover:         #0f2744
Navy Light BG:      #f5f8fa (active states)
```

### Background Colors

```
Page Background:    #f8f9fb
Card/Content:       #ffffff (white)
Sidebar/Header:     #ffffff (white)
```

### Status Colors

```
Active:             #1e3a5f (navy) - toggle bg
Active Text:        #1e3a5f (navy)
Inactive:           gray-300 (#d1d5db) - toggle bg
Inactive Text:      gray-400 (#9ca3af)
Error BG:           red-50
Error Border:       red-100
Error Text:         red-600
```

### Gray Scale

```
Text Primary:       gray-900
Text Secondary:     gray-600
Text Muted:         gray-500
Text Disabled:      gray-400
Border Light:       gray-100
Border Default:     gray-200
Hover BG:           gray-50
```

---

## Typography

### Font Sizes

```
Page Title:         text-sm (14px), font-semibold
Page Subtitle:      text-xs (12px), text-gray-500
Table Headers:      text-xs (12px), font-medium, uppercase, tracking-wider, text-gray-400
Table Content:      text-xs (12px), text-gray-900
Form Labels:        text-xs (12px), font-medium, text-gray-700
Form Inputs:        text-sm (14px), text-gray-900
Buttons:            text-xs (12px)
Status Tags:        text-[10px] (10px), font-medium
Section Labels:     text-[10px] (10px), font-semibold, uppercase, tracking-wider, text-gray-400
```

---

## Logo

### Logo Sizes

```
Sidebar/Navbar:     h-6 (24px)
Login Page:         h-10 (40px)
```

### Usage

```tsx
// Navbar
<img src="/rivo-logo.png" alt="Rivo" className="h-6" />

// Login Page
<img src="/rivo-logo.png" alt="Rivo" className="h-10" />
```

---

## App Shell

### Header

```tsx
<header className="h-14 bg-white flex items-center justify-between px-4">
```

- Height: `h-14` (56px)
- Background: white
- No border/separator

### Sidebar

```tsx
<aside className="fixed left-0 top-0 bottom-0 z-40 bg-white flex flex-col">
```

- Width collapsed: `w-[64px]`
- Width expanded: `w-[220px]`
- Background: white
- No right border
- Logo header: `h-14` (matches page header)

### Main Content Area

```tsx
<main className="flex-1 overflow-auto bg-[#f8f9fb] rounded-tl-xl">
```

- Background: `#f8f9fb`
- Top-left rounded corner: `rounded-tl-xl`

---

## Page Layout

### Page Header

```tsx
<div className="px-6 py-4">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-sm font-semibold text-gray-900">Page Title</h1>
      <p className="text-xs text-gray-500 mt-0.5">Page description</p>
    </div>
    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#0f2744] transition-colors text-xs">
      <Plus className="h-3.5 w-3.5" />
      Action
    </button>
  </div>
</div>
```

### Content Card

```tsx
<div className="mx-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
  <div className="px-4 pt-4">{/* Content */}</div>
</div>
```

- Margin: `mx-6`
- Background: white
- Border radius: `rounded-xl`
- Shadow: `shadow-sm`
- Border: `border border-gray-100`

---

## Status Toggle

Interactive toggle switch for active/inactive states.

```tsx
function StatusToggle({ isActive, isLoading, onChange }) {
  return (
    <button
      onClick={() => onChange(!isActive)}
      disabled={isLoading}
      className="flex items-center gap-2 disabled:opacity-50"
    >
      {/* Toggle Switch */}
      <div
        className={`relative w-8 h-[18px] rounded-full transition-colors ${
          isActive ? "bg-[#1e3a5f]" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
            isActive ? "translate-x-[16px]" : "translate-x-[2px]"
          }`}
        />
      </div>
      <span
        className={`text-[11px] font-medium ${isActive ? "text-[#1e3a5f]" : "text-gray-400"}`}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    </button>
  );
}
```

### Specs

- Track width: `w-8` (32px)
- Track height: `h-[18px]` (18px)
- Knob size: `w-[14px] h-[14px]` (14px)
- Active color: `bg-[#1e3a5f]` (navy)
- Inactive color: `bg-gray-300`
- Label: `text-[11px] font-medium`

---

## Role Badges

Color-coded badges for user roles.

```tsx
const roleLabels = {
  admin: 'Admin',
  manager: 'Manager',
  mortgage_specialist: 'Mortgage Specialist',
  process_owner: 'Process Owner',
}

const roleColors = {
  admin: 'bg-[#1e3a5f] text-white',
  manager: 'bg-[#e8f0f5] text-[#1e3a5f]',
  mortgage_specialist: 'bg-[#e8f5f0] text-[#2d6a4f]',
  process_owner: 'bg-[#f0e8f5] text-[#6b4c8a]',
}

// Usage
<span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${roleColors[role]}`}>
  {roleLabels[role]}
</span>
```

### Role Color Specs

| Role                | Background               | Text      |
| ------------------- | ------------------------ | --------- |
| Admin               | `#1e3a5f` (navy)         | white     |
| Manager             | `#e8f0f5` (light blue)   | `#1e3a5f` |
| Mortgage Specialist | `#e8f5f0` (light green)  | `#2d6a4f` |
| Process Owner       | `#f0e8f5` (light purple) | `#6b4c8a` |

---

## Avatar

User avatar with consistent colors based on ID.

```tsx
const avatarColors = [
  "bg-[#e07a5f]", // coral
  "bg-[#4a9079]", // teal
  "bg-[#7c7c8a]", // gray
  "bg-[#3d8b8b]", // cyan
  "bg-[#6b4c8a]", // purple
  "bg-[#c17f59]", // orange
];

function getAvatarColor(id: string): string {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}

// Usage
<div
  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white ${getAvatarColor(id)}`}
>
  {name.slice(0, 2).toUpperCase()}
</div>;
```

### Specs

- Size: `w-7 h-7` (28px)
- Border radius: `rounded-full`
- Text: `text-[10px] font-medium text-white`
- Initials: First 2 characters, uppercase

---

## Buttons

### Primary Button

```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#0f2744] transition-colors text-xs">
  <Icon className="h-3.5 w-3.5" />
  Label
</button>
```

### Full-width Form Button

```tsx
<button className="w-full px-4 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#0f2744] transition-colors font-medium disabled:opacity-50">
  Submit
</button>
```

### Icon Button (Actions)

```tsx
<button className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors">
  <Icon className="h-3.5 w-3.5" />
</button>
```

### Destructive Icon Button

```tsx
<button className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
  <Trash2 className="h-3.5 w-3.5" />
</button>
```

---

## Form Elements

### Text Input

```tsx
<input
  type="text"
  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none"
  placeholder="Placeholder text"
/>
```

### Select Dropdown

```tsx
<select className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none">
  <option value="value">Label</option>
</select>
```

### Search Input

```tsx
<div className="relative flex-1 max-w-xs">
  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
  <input
    type="text"
    placeholder="Search..."
    className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:outline-none"
  />
</div>
```

### Form Label

```tsx
<label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
```

### Form Specs

- Input height: `h-9` (36px)
- Search height: `h-8` (32px)
- Border: `border border-gray-200`
- Border radius: `rounded-lg`
- Label spacing: `mb-1`

---

## Filter Tabs

Segmented control for filtering.

```tsx
<div className="flex items-center bg-gray-100 rounded-lg p-0.5">
  {(["all", "active", "inactive"] as const).map((status) => (
    <button
      key={status}
      onClick={() => setFilter(status)}
      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
        currentFilter === status
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {status}
    </button>
  ))}
</div>
```

### Specs

- Container: `bg-gray-100 rounded-lg p-0.5`
- Tab padding: `px-3 py-1`
- Active tab: `bg-white text-gray-900 shadow-sm rounded-md`
- Inactive tab: `text-gray-500 hover:text-gray-700`

---

## Tables

### Table Structure

```tsx
<table className="w-full">
  <thead>
    <tr className="border-b border-gray-100">
      <th className="text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
        Column
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="py-3">Content</td>
    </tr>
  </tbody>
</table>
```

### Specs

- Header border: `border-b border-gray-100`
- Row border: `border-b border-gray-50`
- Row hover: `hover:bg-gray-50/50`
- Cell padding: `py-3`
- Header text: `text-xs font-medium text-gray-400 uppercase tracking-wider`

---

## Pagination

```tsx
<div className="flex items-center justify-between py-3 px-4 text-xs text-gray-500 border-t border-gray-100">
  <span>{totalItems} items</span>
  {totalPages > 1 && (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="px-2">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )}
</div>
```

### Specs

- Border: `border-t border-gray-100`
- Padding: `py-3 px-4`
- Text: `text-xs text-gray-500`
- Nav button: `p-1 rounded hover:bg-gray-100`
- Disabled state: `disabled:opacity-40 disabled:cursor-not-allowed`
- Items per page: 10 (constant)

---

## Side Panel

Slide-in panel from right for forms/details.

```tsx
function SidePanel({ children, title, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-white z-50 shadow-xl">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto h-[calc(100%-48px)]">
          {children}
        </div>
      </div>
    </>
  );
}
```

### Specs

- Width: `w-[400px]`
- Header height: `h-14` (56px) - matches page header
- Content height: `h-[calc(100%-56px)]`
- Header padding: `px-5`
- Content padding: `p-5`
- Backdrop: `bg-black/20`
- Shadow: `shadow-xl`

---

## Error States

### Error Toast

```tsx
<div className="mx-6 mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
  {errorMessage}
  <button onClick={dismiss} className="ml-auto text-red-400 hover:text-red-600">
    <X className="h-3.5 w-3.5" />
  </button>
</div>
```

### Form Error

```tsx
<div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs">
  {error}
</div>
```

---

## Loading States

### Page Loading

```tsx
<div className="h-full bg-white flex items-center justify-center">
  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
</div>
```

### Button Loading

```tsx
<span className="flex items-center justify-center gap-2">
  <Loader2 className="h-3.5 w-3.5 animate-spin" />
  Loading...
</span>
```

---

## Navigation Items

### Active Nav Item

```tsx
<Link className="flex items-center gap-3 px-3 py-2 text-sm rounded bg-[#f5f8fa] text-[#1e3a5f] font-medium relative">
  {/* Active indicator */}
  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#1e3a5f] rounded-r" />
  <Icon className="h-[18px] w-[18px] text-[#1e3a5f]" />
  <span>Label</span>
</Link>
```

### Inactive Nav Item

```tsx
<Link className="flex items-center gap-3 px-3 py-2 text-sm rounded hover:bg-gray-50 text-gray-600">
  <Icon className="h-[18px] w-[18px] text-gray-400" />
  <span>Label</span>
</Link>
```

### Specs

- Icon size: `h-[18px] w-[18px]`
- Padding: `px-3 py-2`
- Active indicator: `w-[3px] bg-[#1e3a5f] rounded-r`
- Active bg: `bg-[#f5f8fa]`

---

## Icon Sizes

```
Nav icons:          h-[18px] w-[18px]
Button icons:       h-3.5 w-3.5 (14px)
Action icons:       h-3.5 w-3.5 (14px)
Menu icon:          h-5 w-5 (20px)
Page loader:        h-8 w-8 (32px)
Pagination arrows:  h-4 w-4 (16px)
```

---

## Spacing Reference

```
Page padding:       px-6 py-4
Card margin:        mx-6
Card padding:       px-4 pt-4
Side panel padding: p-5
Table cell padding: py-3
Form spacing:       space-y-4
Button gap:         gap-1.5
```

---

## Z-Index Layers

```
Sidebar:            z-40
Mobile backdrop:    z-40
Side panel:         z-50
Side panel backdrop: z-50
Dropdown menu:      z-20
Dropdown backdrop:  z-10
```

---

## API Integration

### API Client

Located at `/src/lib/api.ts`.

```tsx
import { api, ApiError } from "@/lib/api";

// GET request with params
const data = await api.get<ResponseType>("/endpoint/", {
  page: 1,
  search: "query",
});

// POST request
const result = await api.post<ResponseType>("/endpoint/", { name: "value" });

// PATCH request
const updated = await api.patch<ResponseType>("/endpoint/id/", {
  name: "new value",
});

// DELETE request
await api.delete("/endpoint/id/");
```

### Configuration

```
API Base URL:       VITE_API_URL || 'http://localhost:8000/api'
Auth Token Storage: localStorage 'rivo-auth' -> { access_token }
Mock Mode:          VITE_USE_MOCK === 'true'
```

---

## Paginated Data Pattern

### API Response Format

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

### Query Params

```
page:       Current page number (1-indexed)
page_size:  Items per page (default: 10)
search:     Search query string
status:     Filter by status (all/active/inactive)
```

### React Query Hook Pattern

```tsx
export function useItems(params: QueryParams = {}) {
  const { page = 1, page_size = 10, search = "", status = "all" } = params;

  return useQuery({
    queryKey: ["items", { page, page_size, search, status }],
    queryFn: async (): Promise<PaginatedResponse<ItemType>> => {
      return await api.get<PaginatedResponse<ItemType>>("/items/", {
        page,
        page_size,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
      });
    },
  });
}
```

### Debounced Search Pattern

```tsx
const [searchInput, setSearchInput] = useState("");
const [searchQuery, setSearchQuery] = useState("");
const [currentPage, setCurrentPage] = useState(1);

// Debounce search input (300ms)
useEffect(() => {
  const timer = setTimeout(() => {
    setSearchQuery(searchInput);
    setCurrentPage(1); // Reset to page 1 on search
  }, 300);
  return () => clearTimeout(timer);
}, [searchInput]);

// Use in query
const { data, isLoading } = useItems({
  page: currentPage,
  page_size: 10,
  search: searchQuery,
  status: statusFilter,
});
```

### Page Component Pattern

```tsx
// Data from server-side pagination
const items = data?.items || [];
const totalItems = data?.total || 0;
const totalPages = data?.total_pages || 1;
```

---

## Backend API Endpoints

### Users API

```
GET    /api/users/                   List users (paginated)
POST   /api/users/                   Create user
GET    /api/users/{id}/              Get user details
PATCH  /api/users/{id}/              Update user
DELETE /api/users/{id}/              Permanently delete user
POST   /api/users/{id}/deactivate/   Deactivate user
POST   /api/users/{id}/reactivate/   Reactivate user
```

### Auth API

```
POST   /api/auth/login               Login with email/password
POST   /api/auth/logout              Logout (authenticated)
GET    /api/auth/me                  Get current user profile
POST   /api/auth/change-password     Change password
```

### Query Parameters (List endpoints)

```
page:       Page number (default: 1)
page_size:  Items per page (default: 10, max: 100)
search:     Search by name or email
status:     Filter: 'active' | 'inactive' | 'all'
```

### Response Format

```json
{
  "items": [...],
  "total": 25,
  "page": 1,
  "page_size": 10,
  "total_pages": 3
}
```

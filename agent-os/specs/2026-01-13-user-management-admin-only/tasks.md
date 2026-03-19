# Task Breakdown: User Management (Admin Only)

## Overview
Total Tasks: 4 Task Groups

This spec implements Identity & Access Management for Rivo OS v1.0, including:
- User authentication (login/logout) with Supabase Auth
- User management (Admin-only CRUD operations)
- Role assignment (4 fixed roles: Admin, Manager, MS, PE)
- Users & Roles settings page

## Task List

### Backend Layer

#### Task Group 1: Database Models and Supabase Auth Integration
**Dependencies:** None

- [x] 1.0 Complete database layer and Supabase Auth setup
  - [x] 1.1 Configure Supabase Auth integration
    - Set up Supabase project connection
    - Configure JWT token validation in Django
    - Set up refresh token flow
  - [x] 1.2 Create User model with validations
    - Fields: id (UUID), email (unique), name, role (enum), is_active (default True), created_at, updated_at
    - Role choices: ADMIN, MANAGER, MS, PE
    - Email format validation
    - Integrate with Supabase Auth user ID
  - [x] 1.3 Create migration for users table
    - Add unique index on email
    - Add index on role for filtering
    - Add index on is_active for status filtering
  - [x] 1.4 Implement last admin protection utility
    - Helper function to check if user is last active admin
    - Prevent deactivation when count of active admins equals 1

**Acceptance Criteria:**
- User model validates email uniqueness
- Role assignment restricted to 4 allowed values
- Last admin protection prevents deactivation of sole admin
- Supabase Auth connection established

---

#### Task Group 2: API Endpoints
**Dependencies:** Task Group 1

- [x] 2.0 Complete API layer
  - [x] 2.1 Create authentication endpoints
    - POST /auth/login - Authenticate with Supabase, return JWT
    - POST /auth/logout - Invalidate session
    - POST /auth/change-password - Update own password via Supabase
  - [x] 2.2 Create UserViewSet with CRUD operations
    - GET /users - List all users with status indicator
    - POST /users - Create user (email, name, role, initial password)
    - GET /users/{id} - Retrieve single user
    - PATCH /users/{id} - Update name and role only (email read-only)
  - [x] 2.3 Create deactivate/reactivate endpoints
    - POST /users/{id}/deactivate - Set is_active=False
    - POST /users/{id}/reactivate - Set is_active=True
    - Enforce last admin protection on deactivate
  - [x] 2.4 Implement Admin-only permission class
    - Custom DRF permission: IsAdminRole
    - Apply to all user management endpoints
    - Return 403 with clear error message for non-admins
  - [x] 2.5 Add serializers with validation
    - UserListSerializer: id, email, name, role, is_active
    - UserCreateSerializer: email, name, role, password
    - UserUpdateSerializer: name, role (email excluded)

**Acceptance Criteria:**
- Authentication flow works with Supabase Auth
- All CRUD operations function correctly
- Admin-only authorization enforced on user management
- Consistent JSON response format across endpoints

---

### Frontend Layer

#### Task Group 3: Login Page and Auth Flow
**Dependencies:** Task Group 2

- [x] 3.0 Complete login page and authentication UI
  - [x] 3.1 Create split-screen login page layout
    - Left panel: Login form (white background)
    - Right panel: Dark branded panel with Rivo logo
    - Responsive: Stack vertically on mobile (form only)
  - [x] 3.2 Implement login form component
    - Email input field with validation
    - Password input field with show/hide toggle
    - Submit button with loading state
    - Error message display area
    - Use React Hook Form for form handling
  - [x] 3.3 Create Supabase auth client integration
    - Initialize Supabase client with credentials
    - Implement signInWithPassword function
    - Implement signOut function
    - Store JWT in secure cookie/localStorage
  - [x] 3.4 Set up protected route wrapper
    - AuthProvider context for auth state
    - ProtectedRoute component for guarded pages
    - Redirect unauthenticated users to login
  - [x] 3.5 Implement auth state management
    - useAuth hook for accessing auth state
    - React Query for user session management
    - Auto-refresh token handling

**Acceptance Criteria:**
- Split-screen login page matches design (left form, right dark panel)
- Login form validates and submits correctly
- Protected routes redirect unauthorized users
- Auth state persists across page refreshes

---

#### Task Group 4: Users & Roles Settings Page
**Dependencies:** Task Groups 2, 3

- [x] 4.0 Complete Users & Roles admin page
  - [x] 4.1 Create Users & Roles page layout
    - Page header: "Users & Roles" title
    - Add User button (top right)
    - User list table below
    - Follow existing app shell pattern from visual reference
  - [x] 4.2 Build user list table component
    - Columns: Name, Email, Role, Status, Actions
    - Status badge: Active (green) / Inactive (gray)
    - Role displayed as human-readable text
    - Action buttons: Edit, Deactivate/Reactivate
    - Use shadcn/ui Table component
  - [x] 4.3 Implement Add User modal
    - Modal trigger from "Add User" button
    - Form fields: Email, Name, Role (dropdown), Password
    - Role dropdown options: Admin, Manager, MS, PE
    - Submit creates user via POST /users
    - Close modal and refresh list on success
  - [x] 4.4 Implement Edit User modal
    - Modal opens from Edit action button
    - Pre-populate: Name, Role (Email shown but disabled)
    - Submit updates via PATCH /users/{id}
    - Close modal and refresh list on success
  - [x] 4.5 Implement Deactivate/Reactivate actions
    - Confirmation dialog before deactivation
    - Call POST /users/{id}/deactivate or /reactivate
    - Handle last admin error with user-friendly message
    - Update list status immediately on success
  - [x] 4.6 Add React Query data fetching
    - useUsers hook for fetching user list
    - useCreateUser mutation
    - useUpdateUser mutation
    - useDeactivateUser / useReactivateUser mutations
    - Optimistic updates for better UX

**Acceptance Criteria:**
- User list displays all users with correct data
- Add/Edit modals function correctly
- Deactivate/Reactivate updates user status
- Last admin protection shows appropriate error

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1: Database Models and Supabase Auth Integration**
   - Establishes data foundation and auth infrastructure
   - No dependencies, can start immediately

2. **Task Group 2: API Endpoints**
   - Depends on Task Group 1 for models and auth
   - Provides backend functionality for frontend

3. **Task Group 3: Login Page and Auth Flow**
   - Depends on Task Group 2 for auth endpoints
   - Critical path for all subsequent UI work

4. **Task Group 4: Users & Roles Settings Page**
   - Depends on Task Groups 2 and 3
   - Requires auth flow and user API endpoints

---

## Visual Reference

Available mockups in `planning/visuals/`:
- `Screenshot 2026-01-13 at 1.01.52 AM.png` - App shell with sidebar navigation
- Rivo logo for login page branding

**Login Page Design Notes:**
- Split screen layout: left form panel, right dark branded panel
- Right panel should feature Rivo logo centered
- Clean, minimal form design with clear input labels

---

## Technical Notes

**Tech Stack:**
- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Django + Django REST Framework
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth with JWT tokens
- State Management: React Query
- Forms: React Hook Form

**API Endpoint Summary:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/login | User login | Public |
| POST | /auth/logout | User logout | Authenticated |
| POST | /auth/change-password | Change own password | Authenticated |
| GET | /users | List all users | Admin only |
| POST | /users | Create user | Admin only |
| GET | /users/{id} | Get user details | Admin only |
| PATCH | /users/{id} | Update user | Admin only |
| POST | /users/{id}/deactivate | Deactivate user | Admin only |
| POST | /users/{id}/reactivate | Reactivate user | Admin only |

**Role Definitions (v1.0):**
| Role | Code | Description |
|------|------|-------------|
| Admin | ADMIN | System configuration. Manages users, channels, bank products, templates. |
| Manager | MANAGER | Operations oversight. Sees all clients/cases. Can reassign work. |
| Mortgage Specialist | MS | Works clients to cases. Collects data/docs, creates cases. |
| Process Owner | PO | Works cases to disbursement. Verifies docs, submits to bank. |

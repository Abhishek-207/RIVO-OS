# Spec Requirements: User Management (Admin Only)

## Initial Description

Identity & Access Management for Rivo OS v1.0. This spec covers:
- User authentication (login/logout)
- User management (Admin-only CRUD operations)
- Role assignment
- Users & Roles settings page

From the raw idea document:
> Users log in with username + password. Each user gets exactly one role. Admin manages users through Add, Edit, and Deactivate operations.

## Requirements Discussion

### First Round Questions

**Q1:** What roles should be included in v1.0?
**Answer:** Four roles only for MVP:
- Admin
- Manager
- Mortgage Specialist (MS)
- Process Owner (PO)

The following roles are deferred to v2.0: Channel Owner, Marketing Owner, Relationship Manager.

**Q2:** What should "Process Owner" be called?
**Answer:** Standardize on "Process Owner (PO)" naming throughout the system.

**Q3:** How should authentication work?
**Answer:**
- Username + password login (username auto-generated from first name)
- Local SQLite authentication with JWT tokens
- New users automatically get the system password
- Admin can reset system password for all users at once
- Users can change their own password

**Q4:** What fields are needed when adding a user?
**Answer:**
- Name (single field, not split into first/last)
- Username (auto-generated from first name, editable)
- Role (dropdown selection)
- Email is auto-generated as username@rivo.ae

**Q5:** What can be edited on an existing user?
**Answer:** Name and Role only. Email cannot be changed after creation.

**Q6:** How should user deactivation work?
**Answer:**
- Deactivated users cannot log in
- All data is preserved (not deleted)
- Users can be reactivated at any time
- System prevents deactivating the last Admin (must always have at least one active Admin)

**Q7:** How should the user list be displayed?
**Answer:** Simple user list with status indicator (Active/Inactive). No separate tabs for active vs inactive users.

**Q8:** What should be explicitly excluded from this spec?
**Answer:**
- Custom roles (beyond the 4 fixed roles)
- Permission overrides per individual user
- Team/hierarchy structures
- Other settings modules (Bank Products, Templates, SLA Config - these will be separate specs)

### Existing Code to Reference

No similar existing features identified for reference. This is a new project.

### Follow-up Questions

No follow-up questions were needed. All requirements were clarified in the initial discussion.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A - No mockups or wireframes available.

## Requirements Summary

### Functional Requirements

**Authentication:**
- Users log in with username and password
- Local SQLite authentication with JWT tokens
- Username auto-generated from first name (editable)
- System password shared by all users (Admin can reset for everyone)
- Users can change their own password

**User Management (Admin Only):**
- Add User:
  - Click "New User" button (prominent, filled background `bg-[#1e3a5f]`) to open side panel
  - Enter: Full Name, Username (auto-generated from first name), Role dropdown
  - Email auto-generated as username@rivo.ae
  - New user gets the system password automatically
  - Status defaults to Active
- Edit User:
  - Click pencil icon to open side panel
  - Editable fields: Name, Role, Status (Active/Inactive toggle buttons)
  - Username cannot be changed after creation
- Delete User:
  - Click trash icon with confirmation dialog
  - Permanent deletion (not soft delete)
  - System prevents deleting the last active Admin
- User List:
  - Display all users in a table with columns: Name, Username, Role, Actions
  - **No Status column** - status filtering handled by tabs
  - Status Tabs: All | Active | Inactive (inline with search bar)
  - Pagination support with prev/next controls
- System Password:
  - Admin can reset password for ALL users at once via modal
  - New users automatically inherit the system password

**UI Design:**
- Role badges use light background colors for ALL roles (including Admin):
  - Admin: `bg-[#e8f0f5] text-[#1e3a5f]`
  - Manager: `bg-[#e8f0f5] text-[#1e3a5f]`
  - Mortgage Specialist: `bg-[#e8f5f0] text-[#2d6a4f]`
  - Process Owner: `bg-[#f0e8f5] text-[#6b4c8a]`
- Tabs styled with border-b-2 indicator on active tab
- Search bar and status tabs on same row

**Roles (v1.0):**

| Role | Description |
|------|-------------|
| Admin | System configuration. Manages users, channels, bank products, templates. No operational access. |
| Manager | Operations oversight. Read-only on operational data. |
| Mortgage Specialist (MS) | Full access on leads and clients. Can create cases (convert client to case). |
| Process Owner (PO) | Full access on clients and cases. View-only on leads. |

**IAM Permission Matrix:**

| Resource | Admin | Manager | MS | PE |
|----------|-------|---------|----|----|
| Leads | - | View | Full | View |
| Clients | - | View | Full | Full |
| Cases | - | View | View + Create | Full |
| Users | Full | - | - | - |
| Channels | Full | - | - | - |
| Templates | Full | View | View | View |
| Bank Products | Full | - | - | - |
| SLA Config | Full | - | - | - |
| Audit Logs | View | View | - | - |

**Full** = View, Create, Update, Delete
**View + Create** = Can view and create, but not update or delete

**See `agent-os/specs/iam-config.md` for complete IAM documentation.**

**Implementation Notes:**
- Permission matrix is defined centrally in `backend/users/iam.py`
- Frontend receives permissions on login and stores in AuthContext
- Use `can(action, resource)` helper in frontend to check permissions
- Use `HasResourcePermission` DRF class in backend for API protection

### Scope Boundaries

**In Scope (v1.0):**
- Login page with email/password authentication
- Supabase Auth integration
- User CRUD operations (Add, Edit, Deactivate)
- Role assignment from 4 fixed roles
- Users & Roles settings page (Admin access only)
- User list with status indicator
- Password change (self-service)
- Protection against deactivating last Admin

**Out of Scope (v1.0):**
- Channel Owner, Marketing Owner, Relationship Manager roles (v2.0)
- Custom roles beyond the 4 fixed roles
- Permission overrides per individual user
- Team/hierarchy structures
- Password reset flow (forgot password)
- Social login / SSO
- Multi-factor authentication
- Other settings modules:
  - Channels (separate spec)
  - Bank Products (separate spec)
  - Templates (separate spec)
  - SLA Config (separate spec)

### Technical Considerations

**Authentication Layer:**
- Local SQLite authentication (development mode)
- JWT tokens generated by Django backend
- Password hashing using SHA256

**Backend:**
- Django REST Framework for API endpoints
- Django permissions for role-based access control
- User model with password_hash field for local auth

**Frontend:**
- React with TypeScript
- Tailwind CSS for styling
- React Query for API state management
- Custom form components

**API Endpoints:**
- POST /auth/login - User login (username + password)
- POST /auth/logout - User logout
- GET /auth/me - Get current user
- POST /auth/change-password - Change own password
- POST /auth/reset-all-passwords - Reset password for all users (Admin only)
- GET /users - List all users with pagination (Admin only)
- POST /users - Create user (Admin only)
- GET /users/{id} - Get user details (Admin only)
- PATCH /users/{id} - Update user (Admin only)
- POST /users/{id}/deactivate - Deactivate user (Admin only)
- POST /users/{id}/reactivate - Reactivate user (Admin only)
- DELETE /users/{id} - Permanently delete user (Admin only)

**Database Considerations:**
- Users table with: id, username, email, name, password_hash, role, is_active, created_at, updated_at
- Role stored as CharField with choices
- Soft delete via is_active flag (no hard deletes)

### Reusability Opportunities

This is a greenfield project. However, this spec establishes foundational patterns that will be reused:
- User authentication flow (reused across all features)
- Admin-only settings page pattern (template for Channels, Bank Products, etc.)
- CRUD list/form patterns (template for other entity management)
- Role-based UI rendering (determining what users see based on role)

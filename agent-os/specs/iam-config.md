# IAM Configuration

## Roles

| Role                | Code                  | Description                             |
| ------------------- | --------------------- | --------------------------------------- |
| Admin               | `admin`               | System configuration only               |
| Manager             | `manager`             | Read-only oversight                     |
| Mortgage Specialist | `mortgage_specialist` | Works on leads & clients, creates cases |
| Process Owner       | `process_owner`       | Works on clients & cases                |

## Permission Matrix

| Resource      | Admin | Manager | MS   | PE   |
| ------------- | ----- | ------- | ---- | ---- |
| Leads         | -     | View    | Full | View |
| Clients       | -     | View    | Full | Full |
| Cases         | -     | View    | View | Full |
| Users         | Full  | -       | -    | -    |
| Channels      | Full  | -       | -    | -    |
| Templates     | Full  | View    | View | View |
| Bank Products | Full  | -       | -    | -    |
| SLA Config    | Full  | -       | -    | -    |
| Audit Logs    | View  | View    | -    | -    |

**Full** = View, Create, Update, Delete
**View** = View only
**-** = No access

## Navigation

### MS Navigation

- WORKSPACE: Dashboard, Leads, Clients, Cases
- TOOLBOX: WhatsApp, Bank Products, Templates
- PAYOUTS: My Commissions

### PE Navigation

- WORKSPACE: Dashboard, Leads, Clients, Cases
- TOOLBOX: WhatsApp, Bank Products, Templates
- PAYOUTS: My Commissions

## UI Rules

### MS Restrictions (Cases = View Only)

| Element             | Location             | Rule                             |
| ------------------- | -------------------- | -------------------------------- |
| New Case button     | CasesPage header     | Hidden                           |
| Create Case button  | ClientSidePanel      | Visible (client workflow action) |
| Save Changes button | CaseSidePanel        | Hidden                           |
| Stage dropdown      | CaseSidePanel header | Badge                            |

### PE Restrictions (Leads = View)

| Element             | Location             | Rule                            |
| ------------------- | -------------------- | ------------------------------- |
| Save Changes button | LeadSidePanel        | Hidden                          |
| Status dropdown     | LeadSidePanel header | Badge                           |
| Convert to Client   | LeadSidePanel        | Visible (PE can create clients) |

## Implementation

### Backend

- `backend/users/iam.py` - Permission matrix and `can()` function
- `backend/users/permissions.py` - DRF permission classes

### Frontend

- `frontend/src/contexts/AuthContext.tsx` - `can()` helper
- `frontend/src/config/permissions.ts` - UI permission rules documentation
- `frontend/src/config/navigation.ts` - Role-based navigation

### Pattern

```tsx
// In component:
const { can } = useAuth();

// Hide button if no permission
{
  can("create", "cases") && <Button>Create Case</Button>;
}

// Show badge instead of dropdown
{
  can("update", "leads") ? <Dropdown /> : <Badge />;
}
```

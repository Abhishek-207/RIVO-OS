/**
 * Centralized Permission Configuration
 *
 * Single source of truth for UI permission rules.
 * Components use can() from AuthContext which reads from backend IAM.
 *
 * This file documents what each UI element checks.
 */

/**
 * Permission Rules Summary:
 *
 * LEADS PAGE
 * - Delete button: can('delete', 'leads')
 *
 * CLIENTS PAGE
 * - New Client button: can('create', 'clients')
 * - Delete button: can('delete', 'clients')
 *
 * CASES PAGE
 * - New Case button: can('update', 'cases') - only full case workers
 * - Delete button: can('delete', 'cases')
 *
 * LEAD SIDE PANEL
 * - Save button: can('update', 'leads')
 * - Status dropdown: can('update', 'leads') - else badge
 * - Convert to Client: can('create', 'clients')
 *
 * CLIENT SIDE PANEL
 * - Save button: can('update', 'clients')
 * - Create Case: can('create', 'cases')
 *
 * CASE SIDE PANEL
 * - Save button: can('update', 'cases')
 * - Stage dropdown: can('update', 'cases') - else badge
 *
 * DOCUMENT TABS
 * - Upload/Delete: can('update', parent_resource)
 *
 * ACTIVITY TIMELINE
 * - Add Note: can('update', parent_resource)
 */

export {}

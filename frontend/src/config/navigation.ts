import type { UserRole } from '@/types/auth'
import {
  Users,
  Briefcase,
  MessageCircle,
  Building2,
  LayoutDashboard,
  UserCog,
  Radio,
  FileText,
  UserCheck,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  roles: UserRole[]
  section?: string
  children?: NavItem[]
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

// ── Admin navigation ───────────────────────────────────────
const adminWorkspace: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'], section: 'workspace' },
  { id: 'users-roles', label: 'Users', href: '/users', icon: UserCog, roles: ['admin'], section: 'workspace' },
  { id: 'channels', label: 'Channels', href: '/channels', icon: Radio, roles: ['admin'], section: 'workspace' },
  { id: 'audit-log', label: 'Audit Log', href: '/audit-log', icon: ScrollText, roles: ['admin'], section: 'workspace' },
]

// ── Channel Owner navigation ───────────────────────────────
const channelOwnerWorkspace: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['channel_owner'], section: 'workspace' },
  { id: 'users-view', label: 'Users', href: '/users', icon: UserCog, roles: ['channel_owner'], section: 'workspace' },
  { id: 'channels', label: 'Channels', href: '/channels', icon: Radio, roles: ['channel_owner'], section: 'workspace' },
  { id: 'audit-log', label: 'Audit Log', href: '/audit-log', icon: ScrollText, roles: ['channel_owner'], section: 'workspace' },
]

// ── Team Leader navigation ─────────────────────────────────
const teamLeaderWorkspace: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['team_leader'], section: 'workspace' },
  { id: 'leads', label: 'Leads', href: '/leads', icon: Users, roles: ['team_leader'], section: 'workspace' },
  { id: 'clients', label: 'Clients', href: '/clients', icon: UserCheck, roles: ['team_leader'], section: 'workspace' },
  { id: 'cases', label: 'Cases', href: '/cases', icon: Briefcase, roles: ['team_leader'], section: 'workspace' },
]

const teamLeaderToolbox: NavItem[] = [
  { id: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, roles: ['team_leader'], section: 'toolbox' },
  { id: 'bank-products', label: 'Bank Products', href: '/bank-products', icon: Building2, roles: ['team_leader'], section: 'toolbox' },
  { id: 'templates-toolbox', label: 'Templates', href: '/templates', icon: FileText, roles: ['team_leader'], section: 'toolbox' },
]

// ── Mortgage Specialist navigation ─────────────────────────
const mortgageSpecialistWorkspace: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['mortgage_specialist'], section: 'workspace' },
  { id: 'leads', label: 'Leads', href: '/leads', icon: Users, roles: ['mortgage_specialist'], section: 'workspace' },
  { id: 'clients', label: 'Clients', href: '/clients', icon: UserCheck, roles: ['mortgage_specialist'], section: 'workspace' },
  { id: 'cases', label: 'Cases', href: '/cases', icon: Briefcase, roles: ['mortgage_specialist'], section: 'workspace' },
]

const mortgageSpecialistToolbox: NavItem[] = [
  { id: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, roles: ['mortgage_specialist'], section: 'toolbox' },
  { id: 'bank-products', label: 'Bank Products', href: '/bank-products', icon: Building2, roles: ['mortgage_specialist'], section: 'toolbox' },
  { id: 'templates-toolbox', label: 'Templates', href: '/templates', icon: FileText, roles: ['mortgage_specialist'], section: 'toolbox' },
]

// ── Process Owner navigation ────────────────────────────────
const processOfficerWorkspace: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['process_owner'], section: 'workspace' },
  { id: 'leads', label: 'Leads', href: '/leads', icon: Users, roles: ['process_owner'], section: 'workspace' },
  { id: 'clients', label: 'Clients', href: '/clients', icon: UserCheck, roles: ['process_owner'], section: 'workspace' },
  { id: 'cases', label: 'Cases', href: '/cases', icon: Briefcase, roles: ['process_owner'], section: 'workspace' },
]

const processOfficerToolbox: NavItem[] = [
  { id: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, roles: ['process_owner'], section: 'toolbox' },
  { id: 'bank-products', label: 'Bank Products', href: '/bank-products', icon: Building2, roles: ['process_owner'], section: 'toolbox' },
  { id: 'templates-toolbox', label: 'Templates', href: '/templates', icon: FileText, roles: ['process_owner'], section: 'toolbox' },
]

export function getNavigationSections(role: UserRole): NavSection[] {
  const sections: NavSection[] = []

  switch (role) {
    case 'admin':
      sections.push({
        id: 'workspace',
        label: 'WORKSPACE',
        items: adminWorkspace,
      })
      break

    case 'channel_owner':
      sections.push({
        id: 'workspace',
        label: 'WORKSPACE',
        items: channelOwnerWorkspace,
      })
      break

    case 'team_leader':
      sections.push({
        id: 'workspace',
        label: 'WORKSPACE',
        items: teamLeaderWorkspace,
      })
      sections.push({
        id: 'toolbox',
        label: 'TOOLBOX',
        items: teamLeaderToolbox,
      })
      break

    case 'mortgage_specialist':
      sections.push({
        id: 'workspace',
        label: 'WORKSPACE',
        items: mortgageSpecialistWorkspace,
      })
      sections.push({
        id: 'toolbox',
        label: 'TOOLBOX',
        items: mortgageSpecialistToolbox,
      })
      break

    case 'process_owner':
      sections.push({
        id: 'workspace',
        label: 'WORKSPACE',
        items: processOfficerWorkspace,
      })
      sections.push({
        id: 'toolbox',
        label: 'TOOLBOX',
        items: processOfficerToolbox,
      })
      break
  }

  return sections
}

export function getSettingsItems(_role: UserRole): NavItem[] {
  return []
}

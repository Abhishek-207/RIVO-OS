# Product Mission

## Pitch

Rivo OS is a Lead Operating System that helps mortgage businesses convert leads into funded deals by providing end-to-end funnel management from lead ingestion to bank disbursement, with complete visibility into drop-offs and automated nurturing at every stage.

## Users

### Primary Customers

- **Mortgage Brokerages:** Companies that connect borrowers with lenders and need to manage high-volume lead pipelines efficiently
- **Direct Lenders:** Financial institutions with in-house sales teams requiring structured lead-to-case conversion workflows
- **Mortgage Aggregators:** Platforms that source leads from multiple channels and distribute to processing teams

### User Personas

**System Administrator (Admin)** — The Architect
- **Role:** IT/Operations lead responsible for system configuration
- **Context:** Manages user access, configures channels, maintains audit compliance
- **Pain Points:** Lack of centralized control, manual permission management, audit gaps
- **Goals:** Secure, compliant system with clear role boundaries and full traceability

**Manager** — The Overseer
- **Role:** Team lead overseeing Mortgage Specialists and Process Owners
- **Context:** Responsible for team performance, SLA compliance, workload distribution
- **Pain Points:** No visibility into team workload, manual case reassignment, missed SLAs
- **Goals:** Real-time team performance visibility, balanced workloads, SLA adherence

**Mortgage Specialist (MS)** — The Closer
- **Role:** Sales professional converting leads into qualified clients
- **Context:** Works directly with potential borrowers to collect documents and assess eligibility
- **Pain Points:** Scattered client information, manual eligibility calculations, missed follow-ups
- **Goals:** Close more deals faster with clear next actions and automated eligibility assessment

**Process Owner (PO)** — The Controller
- **Role:** Operations professional managing bank submissions and case progression
- **Context:** Handles case documentation, bank communication, stage tracking
- **Pain Points:** Manual stage tracking, unclear case status, document management chaos
- **Goals:** Streamlined case progression with clear visibility and minimal manual overhead

## The Problem

### Mortgage Conversion Funnel Blindness

Mortgage businesses lose significant revenue due to invisible drop-offs across the lead-to-disbursement funnel. Without a unified system, leads fall through cracks, eligibility assessments are inconsistent, and case progress stalls without visibility.

**Quantifiable Impact:** Industry averages show 60-70% of mortgage leads never convert, with most drop-offs occurring at undocumented stages.

**Our Solution:** A unified operating system that tracks every lead, client, and case through defined stages with clear ownership, SLA timers, and actionable dashboards for each role.

### Fragmented Entity Lifecycle

Most CRMs treat leads, clients, and deals as the same entity or lack clear conversion points. This creates confusion about ownership, status, and next actions.

**Our Solution:** Three distinct entities (Lead, Client, Case) with explicit conversion triggers, dedicated owners, and lifecycle-appropriate workflows.

## Core Entities

### Lead
- **Definition:** Raw signal from a marketing channel (form fill, ad click, referral)
- **Lifecycle:** Temporary — converts to Client or is dropped
- **Owner:** Campaign Owner
- **Key Actions:** Validate, qualify, convert or discard

### Client
- **Definition:** Verified person with mortgage intent; identity collected, eligibility calculated
- **Lifecycle:** Permanent — never deleted; "not ready" clients enter nurture
- **Owner:** Mortgage Specialist
- **Key Actions:** Collect identity, calculate eligibility, gather documents, qualify for case

### Case
- **Definition:** Active bank application for a specific property
- **Lifecycle:** Per transaction — ends in terminal state (approved, declined, withdrawn)
- **Owner:** Process Owner
- **Key Actions:** Lock deal details, submit to bank, track stages, close

## Differentiators

### Entity-First Architecture
Unlike generic CRMs that blur the line between leads and opportunities, Rivo OS enforces a clear Lead > Client > Case progression with distinct owners and workflows at each stage. This results in zero ambiguity about status, ownership, and next actions.

### Role-Specific Dashboards
Unlike one-size-fits-all dashboards, each persona (MS, PE, Manager) sees exactly what they need with relevant SLA timers, filters, and quick actions. This results in faster decision-making and reduced cognitive load.

### Built-In Eligibility Engine
Unlike systems requiring external calculators, Rivo OS includes native DBR/LTV calculations based on salary and liabilities. This results in instant eligibility assessment without spreadsheet workarounds.

### Immutable Audit Trail
Unlike systems with editable histories, every state change is logged immutably with actor, timestamp, and context. This results in complete compliance readiness and dispute resolution capability.

## Key Features

### Core Features
- **Identity & Access Management:** Role-based permissions ensuring each persona accesses only what they need
- **Entity Model:** Clear Lead > Client > Case progression with defined conversion points
- **Eligibility Calculator:** Instant DBR, LTV, and max loan calculation from salary and liability inputs
- **Document Collection:** Structured upload and tracking for all required document types

### Workflow Features
- **MS Dashboard:** Assigned clients with SLA timers, filters, and quick actions for closers
- **Process Owner Dashboard:** Kanban board with case stages, SLA health, and progression controls
- **Manager Dashboard:** Team workload visibility, SLA monitoring, and case reassignment
- **Notes & Activity:** Unified timeline with general notes and quick actions per entity

### Administrative Features
- **User & Role Management:** Create users, assign roles, configure permissions
- **Channel Configuration:** Define and manage lead sources and attribution
- **Audit Logs:** Immutable record of all state changes for compliance and traceability

## Success Metrics

- **Lead-to-Client Conversion Rate:** Percentage of leads successfully converted to verified clients
- **Client-to-Case Conversion Rate:** Percentage of clients progressing to active bank applications
- **SLA Compliance Rate:** Percentage of actions completed within defined time thresholds
- **Case Cycle Time:** Average duration from case creation to terminal state
- **Drop-off Visibility:** Percentage of lost leads/clients with documented closure reasons
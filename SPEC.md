# IaC Automation Platform - Product Specification

## 1. Product Overview

**Product Name:** Infrastructure Composer (placeholder)

**Problem Statement:** Companies adopting DevOps struggle with infrastructure consistency, environment drift, and manual configuration errors.

**Solution:** A visual platform that generates, manages, and validates infrastructure-as-code (Terraform, Kubernetes manifests)

**Target Users:** DevOps teams, platform engineers, organizations new to IaC

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Canvas | React Flow |
| State Management | Zustand |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Authentication | JWT |
| Code Generation | Custom parsers + Terraform CDK |

---

## 3. Feature Specification

### 3.1 Visual Infrastructure Designer

**Description:** Drag-and-drop canvas for designing cloud infrastructure

**Components:**
- **Canvas Area:** Infinite pan/zoom canvas using React Flow
- **Component Palette:** Sidebar with draggable cloud resources
- **Properties Panel:** Right panel for configuring selected resource
- **Connection Lines:** Visual connections between resources showing dependencies

**Resource Types (Phase 1):**
- AWS: EC2, S3, RDS, VPC, Subnet, Security Group, IAM Role, Lambda
- Kubernetes: Deployment, Service, ConfigMap, Secret, Ingress, Namespace, Pod

**Interactions:**
- Drag components from palette to canvas
- Connect components by dragging from output to input ports
- Click component to select and show properties
- Multi-select with Shift+Click or box select
- Undo/Redo support (Ctrl+Z / Ctrl+Shift+Z)

### 3.2 IaC Code Generation

**Description:** Generate valid Terraform HCL and Kubernetes YAML from visual designs

**Terraform Generation:**
- Parse visual graph into dependency order
- Generate resource blocks with proper references
- Handle variable outputs between resources
- Support for modules and workspaces

**Kubernetes Generation:**
- Generate manifests for K8s resources
- Handle service discovery via labels/selectors
- ConfigMap/Secret generation from key-value pairs

**Output Options:**
- Copy to clipboard
- Download as .tf/.yaml files
- Push to Git repository

### 3.3 Policy-as-Code Integration

**Description:** Security compliance checks before deployment

**Implementation:**
- Integrate Open Policy Agent (OPA) / Conftest
- Pre-built policy library for common compliance rules
- Custom policy upload support

**Policies (Initial):**
- S3 bucket should have encryption enabled
- RDS should have backup enabled
- Security groups should not allow 0.0.0.0/0 for sensitive ports
- Kubernetes pods should not run as root

### 3.4 Drift Detection

**Description:** Compare actual infrastructure against stored state

**Features:**
- Import current state from Terraform state file
- Connect to cloud APIs for live state
- Visual diff highlighting changes
- Remediation suggestions

### 3.5 Collaboration Features

**Description:** Team collaboration with approval workflows

**Features:**
- Project-based organization
- Invite team members with roles (Admin, Editor, Viewer)
- Change requests with comments
- Approval workflow for deployments
- Basic version history

### 3.6 Template Marketplace

**Description:** Pre-built, compliant infrastructure templates

**Features:**
- Browse templates by category (Web App, Data Pipeline, ML Infrastructure)
- One-click deployment
- Template customization
- Community contributions

### 3.7 CI/CD Integration

**Description:** Connect with existing CI/CD pipelines

**Features:**
- Generate GitHub Actions / GitLab CI workflows
- Webhook triggers for automated runs
- Pipeline status monitoring
- Deployment history

---

## 4. Data Models

### 4.1 User
```
id: UUID
email: string
name: string
password_hash: string
created_at: timestamp
updated_at: timestamp
```

### 4.2 Organization
```
id: UUID
name: string
owner_id: UUID (FK User)
plan: enum (free, pro, enterprise)
created_at: timestamp
```

### 4.3 Project
```
id: UUID
org_id: UUID (FK Organization)
name: string
description: text
ia_type: enum (terraform, kubernetes)
created_at: timestamp
updated_at: timestamp
```

### 4.4 InfrastructureGraph
```
id: UUID
project_id: UUID (FK Project)
nodes: jsonb (array of node data)
edges: jsonb (array of edge data)
version: integer
created_by: UUID (FK User)
created_at: timestamp
updated_at: timestamp
```

### 4.5 Template
```
id: UUID
name: string
description: text
category: string
ia_type: enum (terraform, kubernetes)
graph_data: jsonb
author_id: UUID
is_public: boolean
downloads: integer
created_at: timestamp
```

### 4.6 ChangeRequest
```
id: UUID
project_id: UUID (FK Project)
title: string
description: text
status: enum (pending, approved, rejected)
requested_by: UUID (FK User)
approved_by: UUID (FK User, nullable)
created_at: timestamp
decided_at: timestamp
```

---

## 5. API Endpoints

### 5.1 Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me
```

### 5.2 Organizations
```
GET    /api/organizations
POST   /api/organizations
GET    /api/organizations/:id
PATCH  /api/organizations/:id
DELETE /api/organizations/:id
POST   /api/organizations/:id/invite
```

### 5.3 Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

### 5.4 Graphs (Infrastructure)
```
GET    /api/projects/:id/graph
POST   /api/projects/:id/graph
GET    /api/projects/:id/graph/versions
POST   /api/projects/:id/graph/validate
```

### 5.5 Code Generation
```
POST   /api/generate/terraform
POST   /api/generate/kubernetes
POST   /api/generate/validate
```

### 5.6 Templates
```
GET    /api/templates
GET    /api/templates/:id
POST   /api/templates
PATCH  /api/templates/:id
DELETE /api/templates/:id
POST   /api/templates/:id/deploy
```

### 5.7 Change Requests
```
GET    /api/projects/:id/changes
POST   /api/projects/:id/changes
GET    /api/changes/:id
PATCH  /api/changes/:id/approve
PATCH  /api/changes/:id/reject
```

### 5.8 Policy
```
POST   /api/policy/check
GET    /api/policy/rules
POST   /api/policy/rules
```

---

## 6. UI/UX Specification

### 6.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Project Selector | User Menu                │
├──────────┬──────────────────────────────┬───────────────────┤
│          │                              │                   │
│  Left    │      Main Canvas             │  Right            │
│  Sidebar │      (React Flow)            │  Sidebar          │
│          │                              │                   │
│  Resource│                              │  Properties       │
│  Palette │                              │  Panel            │
│          │                              │                   │
├──────────┴──────────────────────────────┴───────────────────┤
│  Bottom: Output Console / Validation Results                │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Visual Design

**Color Palette:**
- Primary: #2563EB (Blue)
- Secondary: #64748B (Slate)
- Accent: #10B981 (Emerald - for success/valid)
- Error: #EF4444 (Red)
- Warning: #F59E0B (Amber)
- Background: #F8FAFC (Light gray)
- Surface: #FFFFFF (White)
- Canvas Background: #1E293B (Dark slate)

**Typography:**
- Font Family: Inter, system-ui
- Headings: 600 weight
- Body: 400 weight
- Code: JetBrains Mono, monospace

**Spacing:**
- Base unit: 4px
- Small: 8px
- Medium: 16px
- Large: 24px
- XL: 32px

### 6.3 Component States

**Buttons:**
- Default: bg-primary, text-white
- Hover: bg-primary/90
- Active: bg-primary/80
- Disabled: bg-gray-300, cursor-not-allowed

**Resource Nodes:**
- Default: bg-white, border-gray-300
- Hover: border-primary, shadow-md
- Selected: border-primary, ring-2 ring-primary/20
- Error: border-red-500

---

## 7. Implementation Phases

### Phase 1: Core MVP (Weeks 1-6)

| Week | Deliverable |
|------|-------------|
| 1-2 | Project setup, Auth, Basic layout, React Flow integration |
| 3-4 | Component palette, Properties panel, Node configuration |
| 5-6 | Code generation (Terraform + K8s), Project management |

### Phase 2: Enhanced Features (Weeks 7-10)

| Week | Deliverable |
|------|-------------|
| 7-8 | Policy-as-Code, Validation engine |
| 9-10 | Drift detection, Collaboration features |

### Phase 3: Platform (Weeks 11-12)

| Week | Deliverable |
|------|-------------|
| 11 | Template marketplace, CI/CD integration |
| 12 | Enterprise features, Polish, Launch prep |

---

## 8. Acceptance Criteria

### Visual Designer
- [ ] User can drag components from palette to canvas
- [ ] User can connect components showing dependencies
- [ ] User can configure component properties in right panel
- [ ] Canvas supports pan, zoom, and multi-select

### Code Generation
- [ ] Terraform code generates valid HCL
- [ ] Kubernetes generates valid YAML manifests
- [ ] Code reflects all visual configurations
- [ ] Generated code can be copied or downloaded

### Policy & Validation
- [ ] Pre-deployment validation runs automatically
- [ ] Policy violations show clear error messages
- [ ] User can see which resources fail compliance

### Collaboration
- [ ] Multiple users can work on same project
- [ ] Change requests require approval
- [ ] Version history tracks all changes

### Templates
- [ ] Users can browse and search templates
- [ ] One-click template deployment works
- [ ] Users can create and share templates

---

## 9. Monetization

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 projects, 1 user, basic features |
| Pro | $15/user/mo | Unlimited projects, 5 users, policy checks, drift detection |
| Enterprise | Custom | SSO, compliance reports, dedicated support, unlimited users |

---

## 10. Future Considerations

- Multi-cloud support (Azure ARM, GCP Deployment Manager)
- AI-assisted infrastructure recommendations
- Cost estimation for designed infrastructure
- Real-time collaboration (multiple cursors)
- Mobile app for monitoring

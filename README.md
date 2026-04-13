# IaC Automation Platform

Visual Infrastructure-as-Code Automation Platform for designing, generating, and deploying cloud infrastructure.

## Prerequisites

- Node.js v20+ (v22 recommended)
- npm or yarn
- Azure SQL Database (or SQL Server)
- Supabase account (optional, for auth)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TypeScript, TailwindCSS, React Flow |
| Backend | Express, TypeScript, Azure SQL |
| Database | Azure SQL Database (mssql driver) |
| Auth | JWT + bcrypt |
| Code Gen | Custom Terraform/Kubernetes generators |

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/taswarshah/iac-automation-platform.git
cd iac-automation-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

The `.env` file is already configured with Azure SQL. Update if needed:

```env
# Server
PORT=3001

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Azure SQL Database
DB_SERVER=iac-dev.database.windows.net
DB_NAME=iac
DB_USER=iac
DB_PASSWORD=your-password
DB_PORT=1433

# Supabase (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 4. Database Setup

#### Option A: Run SQL Script (Recommended)

1. Open Azure Data Studio or SSMS
2. Connect to: `iac-dev.database.windows.net,1433`
3. Run `database/database.sql`

#### Option B: Reset Existing Database

If tables already exist, run `database/reset.sql` first, then `database/database.sql`.

### 5. Run the Project

```bash
npm run dev
```

This starts:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

### Run separately

**Terminal 1 - Client:**
```bash
cd client && npm run dev
```

**Terminal 2 - Server:**
```bash
cd server && npm run dev
```

## Database Schema

The platform uses Azure SQL with 30 enterprise-level tables:

| Category | Tables |
|----------|--------|
| Multi-Tenancy | organizations, users, teams, organization_members, team_members |
| Cloud Credentials | cloud_credentials, discovered_resources |
| Templates | templates, template_versions |
| Visual Designs | visual_designs, design_versions, design_members |
| Code Generation | generated_code |
| Deployments | deployments, deployment_steps, deployment_approvals |
| Policies | policies, policy_violations |
| Drift Detection | drift_detection_runs, drifts |
| CI/CD | cicd_integrations, cicd_pipelines |
| Collaboration | comments, change_requests, notifications |
| Audit | audit_logs, api_keys, webhooks |

## Azure SQL Connection

```powershell
# Using sqlcmd
sqlcmd -S iac-dev.database.windows.net,1433 -d iac -U iac -P "your-password" -i database/database.sql

# Using Azure Data Studio
Server: iac-dev.database.windows.net,1433
Database: iac
Authentication: Active Directory or SQL Login
```

## Project Structure

```
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── stores/      # Zustand state
│   │   ├── types/       # TypeScript types
│   │   └── utils/      # API & code generators
│   └── package.json
│
├── server/                # Express backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── config/     # Database config
│   │   └── index.ts   # Entry point
│   └── package.json
│
├── database/              # SQL schemas
│   ├── database.sql     # Complete schema
│   ├── reset.sql       # Drop all tables
│   └── schema.sql     # Original PostgreSQL
│
├── microservices/         # Microservices (future)
│   └── ...
│
└── package.json         # Root workspace
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization

### Projects/Designs
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id/full` - Get full project
- `POST /api/projects/:id/save` - Save design

### Templates
- `GET /api/templates` - List templates

### Code Generation
- `POST /api/generate/terraform` - Generate Terraform
- `POST /api/generate/kubernetes` - Generate Kubernetes

### Provisioning
- `POST /api/provision/provision` - Deploy resources
- `POST /api/provision/destroy` - Destroy resources

### Policy
- `POST /api/policy/check` - Check policies

## Default Credentials

After running the database seed:
- **Email**: admin@iacplatform.com
- **Password**: admin123

## License

MIT
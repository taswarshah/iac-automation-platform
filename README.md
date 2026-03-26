# IAC Automation Platform

Visual Infrastructure-as-Code Automation Platform for designing, generating, and deploying cloud infrastructure.

## Prerequisites

- Node.js v20+ (v22 recommended)
- npm or yarn
- PostgreSQL database
- Supabase account (optional, for cloud storage)

## Tech Stack

- **Frontend**: React, Vite, TypeScript, TailwindCSS, React Flow
- **Backend**: Express, TypeScript, PostgreSQL, Prisma
- **Infrastructure**: AWS SDK, Terraform generation

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd iac-automation-platform
```

### 2. Install dependencies

```bash
npm install
```

Or if you encounter issues with npm, use yarn:

```bash
rm -rf node_modules package-lock.json
yarn install
```

### 3. Environment Setup

Copy the example environment file for the server:

```bash
cp server/.env.example server/.env
```

Update `server/.env` with your database credentials:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/iac_db
JWT_SECRET=your-secret-key-change-in-production
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
PORT=3001
```

### 4. Database Setup

Run the SQL schema to create tables:

```bash
psql -U postgres -d iac_db -f server/supabase-setup.sql
```

Or use Prisma to push the schema:

```bash
cd server && npx prisma db push
```

### 5. Run the Project

From the root directory:

```bash
npm run dev
```

This starts:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

### Alternative: Run separately

**Terminal 1 - Client:**
```bash
cd client && npm run dev
```

**Terminal 2 - Server:**
```bash
cd server && npm run dev
```

## Common Issues

### Node.js version issues
If you encounter `Invalid Version` errors, use Node.js v20 or v22:

```bash
nvm use 20
```

### tsx not found
If you get "tsx: not found" error, the project is configured to use Node's built-in loader:

```bash
node --import tsx src/index.ts
```

### npm install fails
Try using yarn instead:

```bash
rm -rf node_modules package-lock.json
yarn install
```

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   └── stores/      # Zustand stores
│   └── package.json
│
├── server/              # Express backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── config/     # Database config
│   │   └── index.ts     # Entry point
│   ├── prisma/         # Prisma schema
│   └── package.json
│
├── microservices/       # Microservices (future)
│
└── package.json        # Root workspace config
```

## API Endpoints

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/templates` - List templates
- `POST /api/generate` - Generate Terraform
- `POST /api/provision` - Deploy infrastructure

## License

MIT
-- =====================================================
-- ENTERPRISE IaC AUTOMATION PLATFORM
-- Database Schema - Version 2.0
-- =====================================================

-- =====================================================
-- 1. ORGANIZATION & MULTI-TENANCY
-- =====================================================

-- Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tier VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (tier IN ('enterprise', 'pro', 'team', 'free')),
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Teams/Departments within Organizations
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Users (Cross-tenant with proper isolation)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash TEXT,
    avatar_url TEXT,
    auth_provider VARCHAR(50) DEFAULT 'local',
    auth_provider_id VARCHAR(255),
    settings JSONB DEFAULT '{"notifications": true, "theme": "light"}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Organization Memberships with Roles
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '[]',
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Team Memberships
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- =====================================================
-- 2. CLOUD CONNECTIONS
-- =====================================================

-- Cloud Provider Credentials
CREATE TABLE IF NOT EXISTS cloud_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('aws', 'azure', 'gcp', 'kubernetes')),
    credentials_encrypted TEXT NOT NULL,
    credentials_hash VARCHAR(64),
    regions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

-- Resource Discovery
CREATE TABLE IF NOT EXISTS discovered_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES cloud_credentials(id) ON DELETE CASCADE,
    resource_id VARCHAR(512) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_name VARCHAR(512),
    region VARCHAR(100),
    properties JSONB NOT NULL,
    tags JSONB DEFAULT '{}',
    first_discovered_at TIMESTAMPTZ DEFAULT NOW(),
    last_discovered_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false,
    UNIQUE(credential_id, resource_id)
);

-- Resource Relationships
CREATE TABLE IF NOT EXISTS resource_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_resource_id UUID NOT NULL REFERENCES discovered_resources(id) ON DELETE CASCADE,
    target_resource_id UUID NOT NULL REFERENCES discovered_resources(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('depends_on', 'contains', 'uses')),
    properties JSONB DEFAULT '{}',
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_resource_id, target_resource_id, relationship_type)
);

-- =====================================================
-- 3. TEMPLATES (Marketplace)
-- =====================================================

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    provider VARCHAR(50) CHECK (provider IN ('aws', 'azure', 'gcp', 'kubernetes', 'multi')),
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    is_public BOOLEAN DEFAULT false,
    is_official BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    popularity_score INTEGER DEFAULT 0,
    usage_count BIGINT DEFAULT 0,
    config_schema JSONB NOT NULL DEFAULT '{}',
    resources JSONB NOT NULL DEFAULT '[]',
    outputs JSONB DEFAULT '[]',
    estimated_cost JSONB,
    tags TEXT[] DEFAULT '{}',
    icon_url TEXT,
    documentation TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, slug)
);

-- Template Versions
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    resources JSONB NOT NULL,
    changes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, version)
);

-- Template Ratings
CREATE TABLE IF NOT EXISTS template_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    UNIQUE(template_id, user_id)
);

-- =====================================================
-- 4. VISUAL DESIGNS (IaC Projects)
-- =====================================================

CREATE TABLE IF NOT EXISTS visual_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ia_type VARCHAR(50) NOT NULL CHECK (ia_type IN ('terraform', 'kubernetes', 'azure')),
    environment VARCHAR(50) DEFAULT 'development' CHECK (environment IN ('development', 'staging', 'production')),
    version INT NOT NULL DEFAULT 1,
    canvas_state JSONB NOT NULL DEFAULT '{}',
    resources JSONB NOT NULL DEFAULT '[]',
    connections JSONB DEFAULT '[]',
    variables JSONB DEFAULT '{}',
    template_id UUID REFERENCES templates(id),
    thumbnail_url TEXT,
    is_locked BOOLEAN DEFAULT false,
    locked_by UUID REFERENCES users(id),
    locked_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'locked')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name, version)
);

-- Design Versions (Audit trail)
CREATE TABLE IF NOT EXISTS design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES visual_designs(id) ON DELETE CASCADE,
    version INT NOT NULL,
    snapshot JSONB NOT NULL,
    change_description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(design_id, version)
);

-- Design Members (Access Control)
CREATE TABLE IF NOT EXISTS design_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES visual_designs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(design_id, user_id)
);

-- =====================================================
-- 5. CODE GENERATION
-- =====================================================

CREATE TABLE IF NOT EXISTS generated_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES visual_designs(id) ON DELETE CASCADE,
    version INT NOT NULL,
    framework VARCHAR(50) NOT NULL CHECK (framework IN ('terraform', 'cloudformation', 'pulumi', 'kubernetes')),
    provider VARCHAR(50),
    code_content TEXT NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    variables JSONB DEFAULT '{}',
    outputs JSONB DEFAULT '{}',
    modules JSONB DEFAULT '[]',
    validation_status VARCHAR(50) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
    validation_errors JSONB,
    estimated_cost JSONB,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Code Versions
CREATE TABLE IF NOT EXISTS code_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES visual_designs(id) ON DELETE CASCADE,
    version INT NOT NULL,
    generated_code_id UUID NOT NULL REFERENCES generated_code(id),
    commit_message TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(design_id, version)
);

-- =====================================================
-- 6. DEPLOYMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    design_id UUID REFERENCES visual_designs(id),
    generated_code_id UUID REFERENCES generated_code(id),
    credential_id UUID REFERENCES cloud_credentials(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'planning', 'planning_failed', 'approved', 'applying', 'applying_failed', 'completed', 'cancelled', 'rollback_pending', 'rolled_back')),
    deployment_type VARCHAR(50) NOT NULL CHECK (deployment_type IN ('plan', 'apply', 'destroy', 'refresh')),
    plan_output TEXT,
    plan_summary JSONB DEFAULT '{}',
    variables JSONB DEFAULT '{}',
    provider_config JSONB DEFAULT '{}',
    changes JSONB DEFAULT '[]',
    cost_estimate JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployment Steps
CREATE TABLE IF NOT EXISTS deployment_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    resource_type VARCHAR(255),
    resource_address VARCHAR(512),
    action VARCHAR(50) CHECK (action IN ('create', 'update', 'delete', 'read')),
    status VARCHAR(50) NOT NULL,
    status_message TEXT,
    duration_ms INT,
    logs TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deployment Approvals
CREATE TABLE IF NOT EXISTS deployment_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    approver_user_id UUID REFERENCES users(id),
    approver_role VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    approval_token VARCHAR(255),
    expires_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deployment_id)
);

-- =====================================================
-- 7. POLICY-AS-CODE
-- =====================================================

CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('security', 'cost', 'compliance', 'operational')),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    framework VARCHAR(100),
    provider VARCHAR(50),
    resource_types TEXT[] DEFAULT '{}',
    rego_code TEXT,
    sql_condition TEXT,
    parameters_schema JSONB,
    remediation_documentation TEXT,
    enabled BOOLEAN DEFAULT true,
    auto_remediate BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

-- Policy Violations
CREATE TABLE IF NOT EXISTS policy_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    deployment_id UUID REFERENCES deployments(id),
    design_id UUID REFERENCES visual_designs(id),
    generated_code_id UUID REFERENCES generated_code(id),
    resource_address VARCHAR(512),
    resource_type VARCHAR(255),
    violation_message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'false_positive')),
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy Exceptions
CREATE TABLE IF NOT EXISTS policy_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    resource_pattern VARCHAR(512),
    reason TEXT NOT NULL,
    expiration_date DATE,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. DRIFT DETECTION
-- =====================================================

CREATE TABLE IF NOT EXISTS drift_detection_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    deployment_id UUID REFERENCES deployments(id),
    design_id UUID REFERENCES visual_designs(id),
    credential_id UUID REFERENCES cloud_credentials(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    resources_scanned INT DEFAULT 0,
    drifts_found INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES drift_detection_runs(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES discovered_resources(id),
    resource_address VARCHAR(512) NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    expected_state JSONB NOT NULL,
    actual_state JSONB NOT NULL,
    diff JSONB NOT NULL,
    drift_type VARCHAR(50) NOT NULL CHECK (drift_type IN ('missing', 'changed', 'extra')),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id)
);

-- =====================================================
-- 9. CI/CD INTEGRATION
-- =====================================================

CREATE TABLE IF NOT EXISTS cicd_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('github_actions', 'gitlab_ci', 'jenkins', 'circleci')),
    repository_url TEXT,
    repository_name VARCHAR(255),
    branch_patterns TEXT[] DEFAULT '{"main", "master", "develop"}',
    webhook_secret VARCHAR(255),
    credentials_encrypted TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS cicd_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES cicd_integrations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    design_id UUID REFERENCES visual_designs(id),
    pipeline_file TEXT,
    trigger_events TEXT[] DEFAULT '{"push", "pull_request"}',
    environment_mappings JSONB DEFAULT '{}',
    approval_required BOOLEAN DEFAULT false,
    approval_groups TEXT[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cicd_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES cicd_pipelines(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    trigger_event VARCHAR(50),
    branch VARCHAR(255),
    commit_sha VARCHAR(64),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
    deployment_id UUID REFERENCES deployments(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    logs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. COLLABORATION
-- =====================================================

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    design_id UUID NOT NULL REFERENCES visual_designs(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    design_id UUID NOT NULL REFERENCES visual_designs(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    changes JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deployment_complete', 'drift_detected', 'policy_violation', 'comment', 'approval_required', 'mention')),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. AUDIT & OBSERVABILITY
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('user', 'system', 'api_key')),
    actor_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    resource_name VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(64) NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    permissions JSONB DEFAULT '["read"]',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT '{}',
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- Cloud resources
CREATE INDEX IF NOT EXISTS idx_creds_provider ON cloud_credentials(provider);
CREATE INDEX IF NOT EXISTS idx_creds_active ON cloud_credentials(is_active);
CREATE INDEX IF NOT EXISTS idx_resources_type ON discovered_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_region ON discovered_resources(region);
CREATE INDEX IF NOT EXISTS idx_resources_gin ON discovered_resources USING GIN (tags);

-- Templates
CREATE INDEX IF NOT EXISTS idx_templates_org ON templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_public ON templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_provider ON templates(provider);
CREATE INDEX IF NOT EXISTS idx_templates_tags_gin ON templates USING GIN (tags);

-- Visual Designs
CREATE INDEX IF NOT EXISTS idx_designs_org ON visual_designs(organization_id);
CREATE INDEX IF NOT EXISTS idx_designs_team ON visual_designs(team_id);
CREATE INDEX IF NOT EXISTS idx_designs_status ON visual_designs(status);
CREATE INDEX IF NOT EXISTS idx_designs_created_by ON visual_designs(created_by);
CREATE INDEX IF NOT EXISTS idx_design_versions ON design_versions(design_id, version);

-- Deployments
CREATE INDEX IF NOT EXISTS idx_deployments_org ON deployments(organization_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_design ON deployments(design_id);
CREATE INDEX IF NOT EXISTS idx_deployments_created ON deployments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_steps ON deployment_steps(deployment_id, step_order);

-- Policy
CREATE INDEX IF NOT EXISTS idx_policies_org ON policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled);
CREATE INDEX IF NOT EXISTS idx_violations_org_status ON policy_violations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_violations_policy ON policy_violations(policy_id);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON policy_violations(severity);

-- Drift
CREATE INDEX IF NOT EXISTS idx_drifts_run ON drifts(run_id);
CREATE INDEX IF NOT EXISTS idx_drifts_status ON drifts(status);
CREATE INDEX IF NOT EXISTS idx_drifts_severity ON drifts(severity);

-- CI/CD
CREATE INDEX IF NOT EXISTS idx_cicd_integrations_org ON cicd_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_cicd_pipelines_org ON cicd_pipelines(organization_id);
CREATE INDEX IF NOT EXISTS idx_cicd_executions_status ON cicd_executions(status);

-- Collaboration
CREATE INDEX IF NOT EXISTS idx_comments_design ON comments(design_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_design ON change_requests(design_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_detection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cicd_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cicd_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cicd_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (Allow all for development)
-- =====================================================

DO $$ 
BEGIN
    -- Organizations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'organizations_select' AND tablename = 'organizations') THEN
        CREATE POLICY organizations_select ON organizations FOR SELECT USING (true);
        CREATE POLICY organizations_insert ON organizations FOR INSERT WITH CHECK (true);
        CREATE POLICY organizations_update ON organizations FOR UPDATE USING (true);
        CREATE POLICY organizations_delete ON organizations FOR DELETE USING (true);
    END IF;

    -- Users
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_select' AND tablename = 'users') THEN
        CREATE POLICY users_select ON users FOR SELECT USING (true);
        CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (true);
        CREATE POLICY users_update ON users FOR UPDATE USING (true);
    END IF;

    -- Teams
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teams_select' AND tablename = 'teams') THEN
        CREATE POLICY teams_select ON teams FOR SELECT USING (true);
        CREATE POLICY teams_insert ON teams FOR INSERT WITH CHECK (true);
        CREATE POLICY teams_update ON teams FOR UPDATE USING (true);
        CREATE POLICY teams_delete ON teams FOR DELETE USING (true);
    END IF;

    -- Organization Members
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'org_members_select' AND tablename = 'organization_members') THEN
        CREATE POLICY org_members_select ON organization_members FOR SELECT USING (true);
        CREATE POLICY org_members_insert ON organization_members FOR INSERT WITH CHECK (true);
        CREATE POLICY org_members_update ON organization_members FOR UPDATE USING (true);
        CREATE POLICY org_members_delete ON organization_members FOR DELETE USING (true);
    END IF;

    -- Visual Designs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'designs_select' AND tablename = 'visual_designs') THEN
        CREATE POLICY designs_select ON visual_designs FOR SELECT USING (true);
        CREATE POLICY designs_insert ON visual_designs FOR INSERT WITH CHECK (true);
        CREATE POLICY designs_update ON visual_designs FOR UPDATE USING (true);
        CREATE POLICY designs_delete ON visual_designs FOR DELETE USING (true);
    END IF;

    -- Templates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'templates_select' AND tablename = 'templates') THEN
        CREATE POLICY templates_select ON templates FOR SELECT USING (true);
        CREATE POLICY templates_insert ON templates FOR INSERT WITH CHECK (true);
        CREATE POLICY templates_update ON templates FOR UPDATE USING (true);
        CREATE POLICY templates_delete ON templates FOR DELETE USING (true);
    END IF;

    -- Deployments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deployments_select' AND tablename = 'deployments') THEN
        CREATE POLICY deployments_select ON deployments FOR SELECT USING (true);
        CREATE POLICY deployments_insert ON deployments FOR INSERT WITH CHECK (true);
        CREATE POLICY deployments_update ON deployments FOR UPDATE USING (true);
        CREATE POLICY deployments_delete ON deployments FOR DELETE USING (true);
    END IF;

    -- Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'policies_select' AND tablename = 'policies') THEN
        CREATE POLICY policies_select ON policies FOR SELECT USING (true);
        CREATE POLICY policies_insert ON policies FOR INSERT WITH CHECK (true);
        CREATE POLICY policies_update ON policies FOR UPDATE USING (true);
        CREATE POLICY policies_delete ON policies FOR DELETE USING (true);
    END IF;

    -- Comments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_select' AND tablename = 'comments') THEN
        CREATE POLICY comments_select ON comments FOR SELECT USING (true);
        CREATE POLICY comments_insert ON comments FOR INSERT WITH CHECK (true);
        CREATE POLICY comments_update ON comments FOR UPDATE USING (true);
        CREATE POLICY comments_delete ON comments FOR DELETE USING (true);
    END IF;

    -- Audit Logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_select' AND tablename = 'audit_logs') THEN
        CREATE POLICY audit_logs_select ON audit_logs FOR SELECT USING (true);
        CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (true);
    END IF;

    -- Notifications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select' AND tablename = 'notifications') THEN
        CREATE POLICY notifications_select ON notifications FOR SELECT USING (true);
        CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (true);
        CREATE POLICY notifications_update ON notifications FOR UPDATE USING (true);
        CREATE POLICY notifications_delete ON notifications FOR DELETE USING (true);
    END IF;
END $$;

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_visual_designs_updated_at ON visual_designs;
CREATE TRIGGER update_visual_designs_updated_at BEFORE UPDATE ON visual_designs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_deployments_updated_at ON deployments;
CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON deployments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_policies_updated_at ON policies;
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_change_requests_updated_at ON change_requests;
CREATE TRIGGER update_change_requests_updated_at BEFORE UPDATE ON change_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_cicd_integrations_updated_at ON cicd_integrations;
CREATE TRIGGER update_cicd_integrations_updated_at BEFORE UPDATE ON cicd_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_cicd_pipelines_updated_at ON cicd_pipelines;
CREATE TRIGGER update_cicd_pipelines_updated_at BEFORE UPDATE ON cicd_pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Template rating calculation
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    rating_cnt INTEGER;
BEGIN
    SELECT AVG(rating), COUNT(*) INTO avg_rating, rating_cnt
    FROM template_ratings WHERE template_id = COALESCE(NEW.template_id, OLD.template_id);
    
    UPDATE templates SET rating = COALESCE(avg_rating, 0), rating_count = rating_cnt
    WHERE id = COALESCE(NEW.template_id, OLD.template_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS template_rating_update ON template_ratings;
CREATE TRIGGER template_rating_update
AFTER INSERT OR UPDATE OR DELETE ON template_ratings
FOR EACH ROW EXECUTE FUNCTION update_template_rating();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default organization
INSERT INTO organizations (name, slug, tier, settings) VALUES
    ('Default Organization', 'default-org', 'free', '{"allow_public_templates": true}')
ON CONFLICT (slug) DO NOTHING;

-- Get default organization ID
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM organizations WHERE slug = 'default-org' LIMIT 1;
    
    IF default_org_id IS NULL THEN
        INSERT INTO organizations (name, slug, tier)
        VALUES ('Default Organization', 'default-org', 'free')
        RETURNING id INTO default_org_id;
    END IF;

    -- Insert default policy rules with organization_id
    INSERT INTO policies (organization_id, name, description, policy_type, severity, provider, enabled) VALUES
        (default_org_id, 'S3 Bucket Encryption', 'S3 buckets must have server-side encryption enabled', 'security', 'critical', 'aws', true),
        (default_org_id, 'RDS Backup Retention', 'RDS instances should have backup retention enabled', 'compliance', 'high', 'aws', true),
        (default_org_id, 'Security Group Open Port', 'Security groups should not allow unrestricted access to sensitive ports', 'security', 'high', 'aws', true),
        (default_org_id, 'Lambda Timeout', 'Lambda functions should have reasonable timeout values', 'operational', 'low', 'aws', true),
        (default_org_id, 'Kubernetes Root Container', 'Kubernetes pods should not run as root', 'security', 'high', 'kubernetes', true),
        (default_org_id, 'IAM Password Policy', 'IAM users must have strong password policy', 'compliance', 'critical', 'aws', true),
        (default_org_id, 'VPC Flow Logs', 'VPC should have flow logs enabled', 'operational', 'medium', 'aws', true),
        (default_org_id, 'Azure Storage Encryption', 'Azure storage accounts must have encryption enabled', 'security', 'critical', 'azure', true),
        (default_org_id, 'GCP Firewall Rules', 'GCP firewall rules should not allow unrestricted ingress', 'security', 'high', 'gcp', true)
    ON CONFLICT DO NOTHING;
END $$;

-- Insert sample templates
INSERT INTO templates (name, slug, description, category, provider, resources, tags, is_public, is_featured, usage_count) VALUES
    ('Web Application Stack', 'web-app-stack', 'Complete web app with load balancer, auto-scaling group, and RDS', 'web-app', 'aws', '[]', ARRAY['aws', 'web', 'production', 'ec2', 'rds'], true, true, 1250),
    ('Kubernetes Cluster', 'k8s-cluster', 'Production-ready K8s cluster with ingress, monitoring, and secrets', 'container', 'kubernetes', '[]', ARRAY['kubernetes', 'k8s', 'eks', 'monitoring'], true, true, 890),
    ('Serverless API', 'serverless-api', 'API Gateway with Lambda functions and DynamoDB', 'serverless', 'aws', '[]', ARRAY['aws', 'lambda', 'serverless', 'dynamodb'], true, false, 720),
    ('Azure VM Scale Set', 'azure-vmss', 'Azure virtual machine scale set with load balancer', 'azure', 'azure', '[]', ARRAY['azure', 'vm', 'scale-set'], true, false, 340),
    ('Microservices on EKS', 'eks-microservices', 'EKS cluster with microservices architecture', 'container', 'kubernetes', '[]', ARRAY['eks', 'microservices', 'helm'], true, false, 560),
    ('Multi-Tier VPC', 'multi-tier-vpc', 'VPC with public/private subnets, NAT gateways', 'network', 'aws', '[]', ARRAY['aws', 'vpc', 'network'], true, false, 680),
    ('Data Lake Architecture', 'data-lake', 'S3 data lake with Athena and Glue', 'data', 'aws', '[]', ARRAY['aws', 's3', 'athena', 'glue'], true, false, 290),
    ('Azure Kubernetes Service', 'aks-cluster', 'Azure Kubernetes Service with ingress controller', 'container', 'azure', '[]', ARRAY['azure', 'aks', 'kubernetes'], true, false, 410);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Enterprise IaC Platform Database Schema v2.0 created successfully!' AS message;
SELECT COUNT(*) AS total_tables FROM information_schema.tables WHERE table_schema = 'public';

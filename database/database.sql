-- =====================================================
-- IaC AUTOMATION PLATFORM
-- Enterprise Azure SQL Database
-- =====================================================

-- 1. MULTI-TENANCY
CREATE TABLE organizations (
    organization_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(100) UNIQUE NOT NULL,
    tier NVARCHAR(50) NOT NULL DEFAULT 'free',
    settings NVARCHAR(MAX) DEFAULT '{}',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE users (
    user_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) UNIQUE NOT NULL,
    username NVARCHAR(100) UNIQUE NOT NULL,
    full_name NVARCHAR(255),
    password_hash NVARCHAR(255),
    auth_provider NVARCHAR(50) DEFAULT 'local',
    settings NVARCHAR(MAX) DEFAULT '{"notifications": true, "theme": "light"}',
    is_active BIT DEFAULT 1,
    last_login_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE teams (
    team_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_teams_org_name UNIQUE (organization_id, name)
);

CREATE TABLE organization_members (
    member_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at DATETIME2 DEFAULT GETDATE(),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_org_members UNIQUE (organization_id, user_id)
);

CREATE TABLE team_members (
    team_member_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    team_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'member',
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_team_members UNIQUE (team_id, user_id)
);

-- 2. CLOUD CREDENTIALS
CREATE TABLE cloud_credentials (
    credential_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    provider NVARCHAR(50) NOT NULL,
    credentials_encrypted NVARCHAR(MAX) NOT NULL,
    credentials_hash NVARCHAR(64),
    regions NVARCHAR(MAX) DEFAULT '[]',
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_credentials_org_name UNIQUE (organization_id, name)
);

CREATE TABLE discovered_resources (
    discovered_resource_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    credential_id UNIQUEIDENTIFIER NOT NULL,
    resource_id NVARCHAR(512) NOT NULL,
    resource_type NVARCHAR(100) NOT NULL,
    resource_name NVARCHAR(512),
    region NVARCHAR(100),
    properties NVARCHAR(MAX) NOT NULL,
    tags NVARCHAR(MAX) DEFAULT '{}',
    first_discovered_at DATETIME2 DEFAULT GETDATE(),
    last_discovered_at DATETIME2 DEFAULT GETDATE(),
    is_deleted BIT DEFAULT 0,
    CONSTRAINT UQ_discovered_resources UNIQUE (credential_id, resource_id)
);

-- 3. TEMPLATES
CREATE TABLE templates (
    template_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER,
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(255),
    description NVARCHAR(MAX),
    category NVARCHAR(100),
    provider NVARCHAR(50),
    version NVARCHAR(50) NOT NULL DEFAULT '1.0.0',
    is_public BIT DEFAULT 0,
    is_official BIT DEFAULT 0,
    is_featured BIT DEFAULT 0,
    popularity_score INT DEFAULT 0,
    usage_count BIGINT DEFAULT 0,
    config_schema NVARCHAR(MAX) DEFAULT '{}',
    resources NVARCHAR(MAX) DEFAULT '[]',
    outputs NVARCHAR(MAX) DEFAULT '[]',
    tags NVARCHAR(MAX) DEFAULT '[]',
    icon_url NVARCHAR(MAX),
    rating DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE template_versions (
    template_version_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    template_id UNIQUEIDENTIFIER NOT NULL,
    version NVARCHAR(50) NOT NULL,
    resources NVARCHAR(MAX) NOT NULL,
    changes NVARCHAR(MAX),
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_template_version UNIQUE (template_id, version)
);

-- 4. VISUAL DESIGNS
CREATE TABLE visual_designs (
    design_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    team_id UNIQUEIDENTIFIER,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    ia_type NVARCHAR(50) NOT NULL,
    environment NVARCHAR(50) DEFAULT 'development',
    version INT DEFAULT 1,
    canvas_state NVARCHAR(MAX) DEFAULT '{}',
    resources NVARCHAR(MAX) DEFAULT '[]',
    connections NVARCHAR(MAX) DEFAULT '[]',
    variables NVARCHAR(MAX) DEFAULT '{}',
    thumbnail_url NVARCHAR(MAX),
    is_locked BIT DEFAULT 0,
    locked_by UNIQUEIDENTIFIER,
    locked_at DATETIME2,
    tags NVARCHAR(MAX) DEFAULT '[]',
    metadata NVARCHAR(MAX) DEFAULT '{}',
    status NVARCHAR(50) DEFAULT 'draft',
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_by UNIQUEIDENTIFIER,
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_designs_org_name_ver UNIQUE (organization_id, name, version)
);

CREATE TABLE design_versions (
    design_version_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    design_id UNIQUEIDENTIFIER NOT NULL,
    version INT NOT NULL,
    snapshot NVARCHAR(MAX) NOT NULL,
    change_description NVARCHAR(MAX),
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_design_version UNIQUE (design_id, version)
);

CREATE TABLE design_members (
    design_member_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    design_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(50) DEFAULT 'editor',
    granted_by UNIQUEIDENTIFIER,
    granted_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_design_member UNIQUE (design_id, user_id)
);

-- 5. CODE GENERATION
CREATE TABLE generated_code (
    generated_code_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    design_id UNIQUEIDENTIFIER NOT NULL,
    version INT NOT NULL,
    framework NVARCHAR(50) NOT NULL,
    provider NVARCHAR(50),
    code_content NVARCHAR(MAX) NOT NULL,
    code_hash NVARCHAR(64) NOT NULL,
    variables NVARCHAR(MAX) DEFAULT '{}',
    outputs NVARCHAR(MAX) DEFAULT '{}',
    validation_status NVARCHAR(50) DEFAULT 'pending',
    validation_errors NVARCHAR(MAX),
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- 6. DEPLOYMENTS
CREATE TABLE deployments (
    deployment_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    design_id UNIQUEIDENTIFIER,
    generated_code_id UNIQUEIDENTIFIER,
    credential_id UNIQUEIDENTIFIER,
    name NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    deployment_type NVARCHAR(50) NOT NULL,
    plan_output NVARCHAR(MAX),
    plan_summary NVARCHAR(MAX) DEFAULT '{}',
    variables NVARCHAR(MAX) DEFAULT '{}',
    provider_config NVARCHAR(MAX) DEFAULT '{}',
    changes NVARCHAR(MAX) DEFAULT '[]',
    started_at DATETIME2,
    completed_at DATETIME2,
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE deployment_steps (
    deployment_step_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    deployment_id UNIQUEIDENTIFIER NOT NULL,
    step_order INT NOT NULL,
    resource_type NVARCHAR(255),
    resource_address NVARCHAR(512),
    action NVARCHAR(50),
    status NVARCHAR(50) NOT NULL,
    status_message NVARCHAR(MAX),
    duration_ms INT,
    logs NVARCHAR(MAX),
    started_at DATETIME2,
    completed_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE deployment_approvals (
    approval_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    deployment_id UNIQUEIDENTIFIER NOT NULL,
    approver_user_id UNIQUEIDENTIFIER,
    approver_role NVARCHAR(50),
    status NVARCHAR(50) DEFAULT 'pending',
    comments NVARCHAR(MAX),
    approval_token NVARCHAR(255),
    expires_at DATETIME2,
    approved_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- 7. POLICIES
CREATE TABLE policies (
    policy_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    policy_type NVARCHAR(50) NOT NULL,
    severity NVARCHAR(50) NOT NULL,
    framework NVARCHAR(100),
    provider NVARCHAR(50),
    resource_types NVARCHAR(MAX) DEFAULT '[]',
    rego_code NVARCHAR(MAX),
    parameters_schema NVARCHAR(MAX),
    remediation NVARCHAR(MAX),
    enabled BIT DEFAULT 1,
    auto_remediate BIT DEFAULT 0,
    is_custom BIT DEFAULT 0,
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE policy_violations (
    violation_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    policy_id UNIQUEIDENTIFIER,
    deployment_id UNIQUEIDENTIFIER,
    design_id UNIQUEIDENTIFIER,
    resource_address NVARCHAR(512),
    resource_type NVARCHAR(255),
    violation_message NVARCHAR(MAX) NOT NULL,
    severity NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) DEFAULT 'open',
    metadata NVARCHAR(MAX) DEFAULT '{}',
    detected_at DATETIME2 DEFAULT GETDATE(),
    resolved_at DATETIME2,
    resolved_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- 8. DRIFT DETECTION
CREATE TABLE drift_detection_runs (
    run_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    deployment_id UNIQUEIDENTIFIER,
    design_id UNIQUEIDENTIFIER,
    credential_id UNIQUEIDENTIFIER,
    status NVARCHAR(50) NOT NULL,
    resources_scanned INT DEFAULT 0,
    drifts_found INT DEFAULT 0,
    started_at DATETIME2 DEFAULT GETDATE(),
    completed_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE drifts (
    drift_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    run_id UNIQUEIDENTIFIER NOT NULL,
    resource_id UNIQUEIDENTIFIER,
    resource_address NVARCHAR(512) NOT NULL,
    resource_type NVARCHAR(255) NOT NULL,
    expected_state NVARCHAR(MAX) NOT NULL,
    actual_state NVARCHAR(MAX) NOT NULL,
    diff NVARCHAR(MAX) NOT NULL,
    drift_type NVARCHAR(50) NOT NULL,
    severity NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) DEFAULT 'active',
    detected_at DATETIME2 DEFAULT GETDATE(),
    resolved_at DATETIME2,
    resolved_by UNIQUEIDENTIFIER
);

-- 9. CI/CD
CREATE TABLE cicd_integrations (
    integration_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    provider NVARCHAR(50) NOT NULL,
    repository_url NVARCHAR(MAX),
    repository_name NVARCHAR(255),
    branch_patterns NVARCHAR(MAX) DEFAULT '["main", "master"]',
    webhook_secret NVARCHAR(255),
    credentials_encrypted NVARCHAR(MAX),
    settings NVARCHAR(MAX) DEFAULT '{}',
    is_active BIT DEFAULT 1,
    last_sync_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE cicd_pipelines (
    pipeline_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    integration_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    design_id UNIQUEIDENTIFIER,
    pipeline_file NVARCHAR(MAX),
    trigger_events NVARCHAR(MAX) DEFAULT '["push"]',
    environment_mappings NVARCHAR(MAX) DEFAULT '{}',
    approval_required BIT DEFAULT 0,
    settings NVARCHAR(MAX) DEFAULT '{}',
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- 10. COLLABORATION
CREATE TABLE comments (
    comment_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    design_id UNIQUEIDENTIFIER NOT NULL,
    parent_comment_id UNIQUEIDENTIFIER,
    user_id UNIQUEIDENTIFIER NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    metadata NVARCHAR(MAX) DEFAULT '{}',
    is_edited BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE change_requests (
    change_request_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    design_id UNIQUEIDENTIFIER NOT NULL,
    requested_by UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    changes NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    approved_by UNIQUEIDENTIFIER,
    approved_at DATETIME2,
    rejection_reason NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE notifications (
    notification_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    type NVARCHAR(50) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    content NVARCHAR(MAX),
    data NVARCHAR(MAX) DEFAULT '{}',
    is_read BIT DEFAULT 0,
    is_archived BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- 11. AUDIT
CREATE TABLE audit_logs (
    audit_log_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER,
    user_id UNIQUEIDENTIFIER,
    actor_type NVARCHAR(50) NOT NULL,
    actor_id NVARCHAR(255),
    action NVARCHAR(100) NOT NULL,
    resource_type NVARCHAR(100) NOT NULL,
    resource_id UNIQUEIDENTIFIER,
    resource_name NVARCHAR(255),
    old_value NVARCHAR(MAX),
    new_value NVARCHAR(MAX),
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(MAX),
    request_id NVARCHAR(255),
    session_id NVARCHAR(255),
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE api_keys (
    api_key_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    key_hash NVARCHAR(64) NOT NULL,
    prefix NVARCHAR(20) NOT NULL,
    permissions NVARCHAR(MAX) DEFAULT '["read"]',
    expires_at DATETIME2,
    last_used_at DATETIME2,
    is_active BIT DEFAULT 1,
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE webhooks (
    webhook_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    organization_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    url NVARCHAR(MAX) NOT NULL,
    events NVARCHAR(MAX) DEFAULT '[]',
    secret NVARCHAR(255),
    is_active BIT DEFAULT 1,
    created_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- INDEXES
CREATE INDEX IX_org_members_org ON organization_members(organization_id);
CREATE INDEX IX_org_members_user ON organization_members(user_id);
CREATE INDEX IX_team_members_team ON team_members(team_id);
CREATE INDEX IX_team_members_user ON team_members(user_id);
CREATE INDEX IX_creds_provider ON cloud_credentials(provider);
CREATE INDEX IX_creds_active ON cloud_credentials(is_active);
CREATE INDEX IX_discovered_type ON discovered_resources(resource_type);
CREATE INDEX IX_templates_org ON templates(organization_id);
CREATE INDEX IX_templates_public ON templates(is_public);
CREATE INDEX IX_templates_category ON templates(category);
CREATE INDEX IX_designs_org ON visual_designs(organization_id);
CREATE INDEX IX_designs_status ON visual_designs(status);
CREATE INDEX IX_deployments_org ON deployments(organization_id);
CREATE INDEX IX_deployments_status ON deployments(status);
CREATE INDEX IX_deployments_design ON deployments(design_id);
CREATE INDEX IX_deployment_steps ON deployment_steps(deployment_id, step_order);
CREATE INDEX IX_policies_org ON policies(organization_id);
CREATE INDEX IX_policies_enabled ON policies(enabled);
CREATE INDEX IX_violations_org ON policy_violations(organization_id, status);
CREATE INDEX IX_violations_policy ON policy_violations(policy_id);
CREATE INDEX IX_drifts_run ON drifts(run_id);
CREATE INDEX IX_cicd_org ON cicd_integrations(organization_id);
CREATE INDEX IX_comments_design ON comments(design_id);
CREATE INDEX IX_change_requests_design ON change_requests(design_id);
CREATE INDEX IX_notifications_user ON notifications(user_id, is_read, created_at);
CREATE INDEX IX_audit_org ON audit_logs(organization_id, created_at);
CREATE INDEX IX_audit_user ON audit_logs(user_id);
GO

PRINT 'Tables and indexes created successfully!';
GO

-- SEED DATA (Skip if already exists)
IF NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'iac-platform')
BEGIN
    INSERT INTO organizations (name, slug, tier, settings) 
    VALUES ('IaC Platform Inc.', 'iac-platform', 'enterprise', '{"allow_public_templates": true}');
END
GO

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@iacplatform.com')
BEGIN
    INSERT INTO users (email, username, full_name, password_hash, auth_provider, is_active)
    VALUES ('admin@iacplatform.com', 'admin', 'System Admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/N3fraJG8hKpX.uB3C8YQHW', 'local', 1);
END
GO

DECLARE @OrgId UNIQUEIDENTIFIER, @UserId UNIQUEIDENTIFIER;
SELECT @OrgId = organization_id FROM organizations WHERE slug = 'iac-platform';
SELECT @UserId = user_id FROM users WHERE email = 'admin@iacplatform.com';

IF @OrgId IS NOT NULL AND @UserId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organization_members WHERE organization_id = @OrgId AND user_id = @UserId)
BEGIN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (@OrgId, @UserId, 'owner');
END
GO

IF NOT EXISTS (SELECT 1 FROM policies WHERE name = 'S3 Bucket Encryption')
BEGIN
    INSERT INTO policies (name, description, policy_type, severity, provider, enabled) VALUES
    ('S3 Bucket Encryption', 'S3 buckets must have server-side encryption enabled', 'security', 'critical', 'aws', 1),
    ('RDS Backup Retention', 'RDS instances should have backup retention enabled', 'compliance', 'high', 'aws', 1),
    ('Security Group Open Port', 'Security groups should not allow unrestricted access', 'security', 'high', 'aws', 1),
    ('Lambda Timeout', 'Lambda functions should have reasonable timeout values', 'operational', 'low', 'aws', 1),
    ('Kubernetes Root Container', 'Kubernetes pods should not run as root', 'security', 'high', 'kubernetes', 1),
    ('IAM Password Policy', 'IAM users must have strong password policy', 'compliance', 'critical', 'aws', 1),
    ('VPC Flow Logs', 'VPC should have flow logs enabled', 'operational', 'medium', 'aws', 1),
    ('Azure Storage Encryption', 'Azure storage accounts must have encryption enabled', 'security', 'critical', 'azure', 1),
    ('GCP Firewall Rules', 'GCP firewall rules should not allow unrestricted ingress', 'security', 'high', 'gcp', 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM templates WHERE slug = 'web-app-stack')
BEGIN
    INSERT INTO templates (name, slug, description, category, provider, is_public, is_featured, usage_count) VALUES
    ('Web Application Stack', 'web-app-stack', 'Complete web app with load balancer and database', 'web-app', 'aws', 1, 1, 1250),
    ('Kubernetes Cluster', 'k8s-cluster', 'Production-ready K8s cluster', 'container', 'kubernetes', 1, 1, 890),
    ('Serverless API', 'serverless-api', 'API Gateway with Lambda', 'serverless', 'aws', 1, 0, 720),
    ('Azure VM Scale Set', 'azure-vmss', 'Azure virtual machine scale set', 'azure', 'azure', 1, 0, 340),
    ('Microservices on EKS', 'eks-microservices', 'EKS cluster with microservices', 'container', 'kubernetes', 1, 0, 560),
    ('Multi-Tier VPC', 'multi-tier-vpc', 'VPC with public/private subnets', 'network', 'aws', 1, 0, 680),
    ('Data Lake Architecture', 'data-lake', 'S3 data lake with analytics', 'data', 'aws', 1, 0, 290),
    ('Azure Kubernetes Service', 'aks-cluster', 'Azure Kubernetes Service', 'container', 'azure', 1, 0, 410);
END
GO

PRINT 'Database initialized!';
GO
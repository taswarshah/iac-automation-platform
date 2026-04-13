-- Drop all tables (run this first if tables exist)
IF OBJECT_ID('webhooks', 'U') IS NOT NULL DROP TABLE webhooks;
IF OBJECT_ID('api_keys', 'U') IS NOT NULL DROP TABLE api_keys;
IF OBJECT_ID('audit_logs', 'U') IS NOT NULL DROP TABLE audit_logs;
IF OBJECT_ID('notifications', 'U') IS NOT NULL DROP TABLE notifications;
IF OBJECT_ID('change_requests', 'U') IS NOT NULL DROP TABLE change_requests;
IF OBJECT_ID('comments', 'U') IS NOT NULL DROP TABLE comments;
IF OBJECT_ID('cicd_pipelines', 'U') IS NOT NULL DROP TABLE cicd_pipelines;
IF OBJECT_ID('cicd_integrations', 'U') IS NOT NULL DROP TABLE cicd_integrations;
IF OBJECT_ID('drifts', 'U') IS NOT NULL DROP TABLE drifts;
IF OBJECT_ID('drift_detection_runs', 'U') IS NOT NULL DROP TABLE drift_detection_runs;
IF OBJECT_ID('policy_violations', 'U') IS NOT NULL DROP TABLE policy_violations;
IF OBJECT_ID('policies', 'U') IS NOT NULL DROP TABLE policies;
IF OBJECT_ID('deployment_approvals', 'U') IS NOT NULL DROP TABLE deployment_approvals;
IF OBJECT_ID('deployment_steps', 'U') IS NOT NULL DROP TABLE deployment_steps;
IF OBJECT_ID('deployments', 'U') IS NOT NULL DROP TABLE deployments;
IF OBJECT_ID('generated_code', 'U') IS NOT NULL DROP TABLE generated_code;
IF OBJECT_ID('design_members', 'U') IS NOT NULL DROP TABLE design_members;
IF OBJECT_ID('design_versions', 'U') IS NOT NULL DROP TABLE design_versions;
IF OBJECT_ID('visual_designs', 'U') IS NOT NULL DROP TABLE visual_designs;
IF OBJECT_ID('template_versions', 'U') IS NOT NULL DROP TABLE template_versions;
IF OBJECT_ID('templates', 'U') IS NOT NULL DROP TABLE templates;
IF OBJECT_ID('discovered_resources', 'U') IS NOT NULL DROP TABLE discovered_resources;
IF OBJECT_ID('cloud_credentials', 'U') IS NOT NULL DROP TABLE cloud_credentials;
IF OBJECT_ID('team_members', 'U') IS NOT NULL DROP TABLE team_members;
IF OBJECT_ID('organization_members', 'U') IS NOT NULL DROP TABLE organization_members;
IF OBJECT_ID('teams', 'U') IS NOT NULL DROP TABLE teams;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
IF OBJECT_ID('organizations', 'U') IS NOT NULL DROP TABLE organizations;

PRINT 'All tables dropped!';
GO
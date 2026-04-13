-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- Run AFTER schema.sql tables are created
-- =====================================================

-- Teams FK
ALTER TABLE teams ADD CONSTRAINT FK_teams_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;

-- Organization Members FK
ALTER TABLE organization_members ADD CONSTRAINT FK_org_members_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE organization_members ADD CONSTRAINT FK_org_members_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Team Members FK
ALTER TABLE team_members ADD CONSTRAINT FK_team_members_team 
FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE team_members ADD CONSTRAINT FK_team_members_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Cloud Credentials FK
ALTER TABLE cloud_credentials ADD CONSTRAINT FK_creds_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE cloud_credentials ADD CONSTRAINT FK_creds_user 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Discovered Resources FK
ALTER TABLE discovered_resources ADD CONSTRAINT FK_discovered_cred 
FOREIGN KEY (credential_id) REFERENCES cloud_credentials(credential_id) ON DELETE CASCADE;

-- Templates FK
ALTER TABLE templates ADD CONSTRAINT FK_templates_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE templates ADD CONSTRAINT FK_templates_team 
FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE;
ALTER TABLE templates ADD CONSTRAINT FK_templates_user 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Template Versions FK
ALTER TABLE template_versions ADD CONSTRAINT FK_template_ver_template 
FOREIGN KEY (template_id) REFERENCES templates(template_id) ON DELETE CASCADE;
ALTER TABLE template_versions ADD CONSTRAINT FK_template_ver_user 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Visual Designs FK
ALTER TABLE visual_designs ADD CONSTRAINT FK_designs_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE visual_designs ADD CONSTRAINT FK_designs_team 
FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE;

ALTER TABLE visual_designs ADD CONSTRAINT FK_designs_created_by 
FOREIGN KEY (created_by) REFERENCES users(user_id);
ALTER TABLE visual_designs ADD CONSTRAINT FK_designs_updated_by 
FOREIGN KEY (updated_by) REFERENCES users(user_id);
ALTER TABLE visual_designs ADD CONSTRAINT FK_designs_locked_by 
FOREIGN KEY (locked_by) REFERENCES users(user_id);

-- Design Versions FK
ALTER TABLE design_versions ADD CONSTRAINT FK_design_ver_design 
FOREIGN KEY (design_id) REFERENCES visual_designs(design_id) ON DELETE CASCADE;
ALTER TABLE design_versions ADD CONSTRAINT FK_design_ver_user 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Design Members FK
ALTER TABLE design_members ADD CONSTRAINT FK_design_mem_design 
FOREIGN KEY (design_id) REFERENCES visual_designs(design_id) ON DELETE CASCADE;
ALTER TABLE design_members ADD CONSTRAINT FK_design_mem_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE design_members ADD CONSTRAINT FK_design_mem_granted_by 
FOREIGN KEY (granted_by) REFERENCES users(user_id);

-- Generated Code FK
ALTER TABLE generated_code ADD CONSTRAINT FK_gen_code_design 
FOREIGN KEY (design_id) REFERENCES visual_designs(design_id) ON DELETE CASCADE;
ALTER TABLE generated_code ADD CONSTRAINT FK_gen_code_user 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Deployments FK
ALTER TABLE deployments ADD CONSTRAINT FK_deployments_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE deployments ADD CONSTRAINT FK_deployments_design 
FOREIGN KEY (design_id) REFERENCES visual_designs(design_id);
ALTER TABLE deployments ADD CONSTRAINT FK_deployments_code 
FOREIGN KEY (generated_code_id) REFERENCES generated_code(generated_code_id);
ALTER TABLE deployments ADD CONSTRAINT FK_deployments_cred 
FOREIGN KEY (credential_id) REFERENCES cloud_credentials(credential_id);
ALTER TABLE deployments ADD CONSTRAINT FK_deployments_user 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Deployment Steps FK
ALTER TABLE deployment_steps ADD CONSTRAINT FK_deploy_steps_deploy 
FOREIGN KEY (deployment_id) REFERENCES deployments(deployment_id) ON DELETE CASCADE;

-- Deployment Approvals FK
ALTER TABLE deployment_approvals ADD CONSTRAINT FK_approval_deploy 
FOREIGN KEY (deployment_id) REFERENCES deployments(deployment_id) ON DELETE CASCADE;
ALTER TABLE deployment_approvals ADD CONSTRAINT FK_approval_user 
FOREIGN KEY (approver_user_id) REFERENCES users(user_id);

-- Policies FK
ALTER TABLE policies ADD CONSTRAINT FK_policies_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE policies ADD CONSTRAINT FK_policies_user 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Policy Violations FK
ALTER TABLE policy_violations ADD CONSTRAINT FK_violations_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE policy_violations ADD CONSTRAINT FK_violations_policy 
FOREIGN KEY (policy_id) REFERENCES policies(policy_id);
ALTER TABLE policy_violations ADD CONSTRAINT FK_violations_deploy 
FOREIGN KEY (deployment_id) REFERENCES deployments(deployment_id);
ALTER TABLE policy_violations ADD CONSTRAINT FK_violations_design 
FOREIGN KEY (design_id) REFERENCES visual_designs(design_id);
ALTER TABLE policy_violations ADD CONSTRAINT FK_violations_resolved_by 
FOREIGN KEY (resolved_by) REFERENCES users(user_id);

-- Drift Detection Runs FK
ALTER TABLE drift_detection_runs ADD CONSTRAINT FK_runs_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE drift_detection_runs ADD CONSTRAINT FK_runs_deploy 
FOREIGN KEY (deployment_id) REFERENCES deployments(deployment_id);
ALTER TABLE drift_detection_runs ADD CONSTRAINT FK_runs_design 
FOREIGN KEY (design_id) REFERENCES visual_designs(design_id);
ALTER TABLE drift_detection_runs ADD CONSTRAINT FK_runs_cred 
FOREIGN KEY (credential_id) REFERENCES cloud_credentials(credential_id);

-- Drifts FK
ALTER TABLE drifts ADD CONSTRAINT FK_drifts_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE drifts ADD CONSTRAINT FK_drifts_run 
FOREIGN KEY (run_id) REFERENCES drift_detection_runs(run_id) ON DELETE CASCADE;
ALTER TABLE drifts ADD CONSTRAINT FK_drifts_resource 
FOREIGN KEY (resource_id) REFERENCES discovered_resources(discovered_resource_id);
ALTER TABLE drifts ADD CONSTRAINT FK_drifts_resolved_by 
FOREIGN KEY (resolved_by) REFERENCES users(user_id);

-- CI/CD Integrations FK
ALTER TABLE cicd_integrations ADD CONSTRAINT FK_cicd_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;

-- CI/CD Pipelines FK
ALTER TABLE cicd_pipelines ADD CONSTRAINT FK_pipeline_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE cicd_pipelines ADD CONSTRAINT FK_pipeline_integration 
FOREIGN KEY (integration_id) REFERENCES cicd_integrations(integration_id) ON DELETE CASCADE;
ALTER TABLE cicd_pipelines ADD CONSTRAINT FK_pipeline_design 
FOREIGN KEY (design_id) REFERENCES visual_designs(design_id);

-- Comments FK
ALTER TABLE comments ADD CONSTRAINT FK_comments_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT FK_comments_design 
FOREIGN KEY (design_id) REFERENCES visual_designs(design_id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT FK_comments_parent 
FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT FK_comments_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Change Requests FK
ALTER TABLE change_requests ADD CONSTRAINT FK_changes_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE change_requests ADD CONSTRAINT FK_changes_design 
FOREIGN KEY (design_id) REFERENCES visual_designs(design_id) ON DELETE CASCADE;
ALTER TABLE change_requests ADD CONSTRAINT FK_changes_requested_by 
FOREIGN KEY (requested_by) REFERENCES users(user_id);
ALTER TABLE change_requests ADD CONSTRAINT FK_changes_approved_by 
FOREIGN KEY (approved_by) REFERENCES users(user_id);

-- Notifications FK
ALTER TABLE notifications ADD CONSTRAINT FK_notifications_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Audit Logs FK
ALTER TABLE audit_logs ADD CONSTRAINT FK_audit_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD CONSTRAINT FK_audit_user 
FOREIGN KEY (user_id) REFERENCES users(user_id);

-- API Keys FK
ALTER TABLE api_keys ADD CONSTRAINT FK_apikeys_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD CONSTRAINT FK_apikeys_user 
FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Webhooks FK
ALTER TABLE webhooks ADD CONSTRAINT FK_webhooks_org 
FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;
ALTER TABLE webhooks ADD CONSTRAINT FK_webhooks_user 
FOREIGN KEY (created_by) REFERENCES users(user_id);

PRINT 'Foreign keys created successfully!';
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  tier: 'enterprise' | 'pro' | 'team' | 'free';
  settings: Record<string, any>;
  features: Record<string, any>;
}

export interface User extends BaseEntity {
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  auth_provider: string;
  settings: Record<string, any>;
  is_active: boolean;
  last_login_at?: string;
}

export interface OrganizationMember extends BaseEntity {
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  invited_by?: string;
  joined_at: string;
  last_active_at?: string;
}

export interface VisualDesign extends BaseEntity {
  organization_id?: string;
  team_id?: string;
  name: string;
  description?: string;
  ia_type: 'terraform' | 'kubernetes' | 'azure';
  environment: 'development' | 'staging' | 'production';
  version: number;
  canvas_state: Record<string, any>;
  resources: any[];
  connections: any[];
  variables: Record<string, any>;
  template_id?: string;
  is_locked: boolean;
  locked_by?: string;
  locked_at?: string;
  tags: string[];
  metadata: Record<string, any>;
  status: 'draft' | 'active' | 'archived' | 'locked';
  created_by: string;
  updated_by?: string;
}

export interface Template extends BaseEntity {
  organization_id?: string;
  team_id?: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  provider?: string;
  version: string;
  is_public: boolean;
  is_official: boolean;
  is_featured: boolean;
  popularity_score: number;
  usage_count: number;
  config_schema: Record<string, any>;
  resources: any[];
  outputs: any[];
  estimated_cost?: Record<string, any>;
  tags: string[];
  icon_url?: string;
  documentation?: string;
  created_by?: string;
}

export interface Deployment extends BaseEntity {
  organization_id: string;
  design_id?: string;
  generated_code_id?: string;
  credential_id?: string;
  name: string;
  status: 'pending' | 'planning' | 'planning_failed' | 'approved' | 'applying' | 'applying_failed' | 'completed' | 'cancelled' | 'rollback_pending' | 'rolled_back';
  deployment_type: 'plan' | 'apply' | 'destroy' | 'refresh';
  plan_output?: string;
  plan_summary: Record<string, any>;
  variables: Record<string, any>;
  provider_config: Record<string, any>;
  changes: any[];
  cost_estimate?: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  created_by: string;
}

export interface Policy extends BaseEntity {
  organization_id: string;
  name: string;
  description?: string;
  policy_type: 'security' | 'cost' | 'compliance' | 'operational';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  framework?: string;
  provider?: string;
  resource_types: string[];
  rego_code?: string;
  sql_condition?: string;
  parameters_schema?: Record<string, any>;
  remediation_documentation?: string;
  enabled: boolean;
  auto_remediate: boolean;
  created_by?: string;
}

export interface PolicyViolation extends BaseEntity {
  organization_id: string;
  policy_id: string;
  deployment_id?: string;
  design_id?: string;
  generated_code_id?: string;
  resource_address?: string;
  resource_type?: string;
  violation_message: string;
  severity: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
  metadata: Record<string, any>;
  detected_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

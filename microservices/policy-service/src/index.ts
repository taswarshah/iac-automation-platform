import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const app = express();
const PORT = process.env.PORT || 3005;

const supabaseUrl = process.env.SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(helmet());
app.use(cors());
app.use(express.json());

interface PolicyViolation {
  id: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  resourceId: string;
  resourceType: string;
}

const defaultPolicies = [
  {
    id: 's3-encryption',
    name: 'S3 Bucket Encryption',
    description: 'S3 buckets must have server-side encryption enabled',
    severity: 'error' as const,
    check: (node: any) => {
      if (node.data?.type === 'aws_s3_bucket') {
        if (!node.data.inputs?.server_side_encryption) {
          return {
            id: 's3-encryption',
            severity: 'error' as const,
            rule: 'S3 Bucket Encryption',
            message: 'S3 bucket should have server_side_encryption enabled',
            resourceId: node.data.type,
            resourceType: node.data.type
          };
        }
      }
      return null;
    }
  },
  {
    id: 'rds-backup',
    name: 'RDS Backup Retention',
    description: 'RDS instances should have backup retention enabled',
    severity: 'error' as const,
    check: (node: any) => {
      if (node.data?.type === 'aws_rds_instance') {
        const backupRetention = node.data.inputs?.backup_retention_period;
        if (!backupRetention || backupRetention < 1) {
          return {
            id: 'rds-backup',
            severity: 'error' as const,
            rule: 'RDS Backup Retention',
            message: 'RDS instance should have backup_retention_period set to at least 1 day',
            resourceId: node.data.type,
            resourceType: node.data.type
          };
        }
      }
      return null;
    }
  },
  {
    id: 'sg-open-port',
    name: 'Security Group Open Port',
    description: 'Security groups should not allow unrestricted access',
    severity: 'warning' as const,
    check: (node: any) => {
      if (node.data?.type === 'aws_security_group') {
        const ingress = node.data.inputs?.ingress;
        if (ingress) {
          for (const rule of ingress) {
            if (rule.cidr_blocks?.includes('0.0.0.0/0') && rule.from_port && rule.from_port < 1024) {
              return {
                id: 'sg-open-port',
                severity: 'warning' as const,
                rule: 'Security Group Open Port',
                message: `Security group allows unrestricted access to port ${rule.from_port}`,
                resourceId: node.data.type,
                resourceType: node.data.type
              };
            }
          }
        }
      }
      return null;
    }
  },
  {
    id: 'lambda-timeout',
    name: 'Lambda Timeout',
    description: 'Lambda functions should have reasonable timeout values',
    severity: 'info' as const,
    check: (node: any) => {
      if (node.data?.type === 'aws_lambda_function') {
        const timeout = node.data.inputs?.timeout;
        if (!timeout || timeout > 900) {
          return {
            id: 'lambda-timeout',
            severity: 'info' as const,
            rule: 'Lambda Timeout',
            message: 'Lambda timeout should be set to a reasonable value (max 900 seconds)',
            resourceId: node.data.type,
            resourceType: node.data.type
          };
        }
      }
      return null;
    }
  },
  {
    id: 'k8s-root-container',
    name: 'Kubernetes Root Container',
    description: 'Kubernetes pods should not run as root',
    severity: 'warning' as const,
    check: (node: any) => {
      if (node.data?.type === 'kubernetes_deployment') {
        return {
          id: 'k8s-root-container',
          severity: 'warning' as const,
          rule: 'Kubernetes Root Container',
          message: 'Consider adding securityContext.runAsNonRoot: true to container spec',
          resourceId: node.data.type,
          resourceType: node.data.type
        };
      }
      return null;
    }
  }
];

app.post('/api/policy/check', async (req: Request, res: Response) => {
  try {
    const { nodes, design_id, organization_id } = req.body;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ error: 'Invalid nodes' });
    }

    const { data: dbPolicies } = await supabase
      .from('policies')
      .select('*')
      .eq('enabled', true);

    const policies = dbPolicies?.length ? dbPolicies : defaultPolicies;
    const violations: PolicyViolation[] = [];

    for (const node of nodes) {
      for (const policy of defaultPolicies) {
        const violation = policy.check(node);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    if (design_id && organization_id && violations.length > 0) {
      for (const violation of violations) {
        const { data: policy } = await supabase
          .from('policies')
          .select('id')
          .eq('name', violation.rule)
          .single();

        if (policy) {
          await supabase.from('policy_violations').insert({
            organization_id,
            policy_id: policy.id,
            design_id,
            resource_type: violation.resourceType,
            violation_message: violation.message,
            severity: violation.severity,
            status: 'open'
          });
        }
      }
    }

    const errors = violations.filter(v => v.severity === 'error');
    const warnings = violations.filter(v => v.severity === 'warning');
    const info = violations.filter(v => v.severity === 'info');

    res.json({
      valid: errors.length === 0,
      errors,
      warnings,
      info,
      summary: {
        total: violations.length,
        errors: errors.length,
        warnings: warnings.length,
        info: info.length
      }
    });
  } catch (err) {
    logger.error('Policy check error', err);
    res.status(500).json({ error: 'Failed to check policies' });
  }
});

app.get('/api/policy/rules', async (req: Request, res: Response) => {
  try {
    const { data: dbRules, error } = await supabase
      .from('policies')
      .select('*')
      .eq('enabled', true)
      .order('severity', { ascending: false });

    if (error) throw error;

    if (dbRules?.length) {
      return res.json(dbRules.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        severity: p.severity,
        provider: p.provider,
        policyType: p.policy_type,
        enabled: p.enabled
      })));
    }

    res.json(defaultPolicies.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      severity: p.severity,
      enabled: true
    })));
  } catch (err) {
    res.json(defaultPolicies.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      severity: p.severity,
      enabled: true
    })));
  }
});

app.post('/api/policy/rules', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      policy_type,
      severity,
      provider,
      resource_types,
      rego_code,
      enabled = true,
      organization_id,
      created_by
    } = req.body;

    if (!name || !policy_type || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: policy, error } = await supabase
      .from('policies')
      .insert({
        name,
        description,
        policy_type,
        severity,
        provider,
        resource_types: resource_types || [],
        rego_code,
        enabled,
        organization_id,
        created_by,
        is_custom: true
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

app.patch('/api/policy/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, enabled, severity } = req.body;

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (severity) updateData.severity = severity;
    updateData.updated_at = new Date().toISOString();

    const { data: policy, error } = await supabase
      .from('policies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

app.get('/api/policy/violations', async (req: Request, res: Response) => {
  try {
    const { organization_id, status } = req.query;

    let query = supabase
      .from('policy_violations')
      .select(`
        *,
        policies:policies(name, description, severity)
      `)
      .order('created_at', { ascending: false });

    if (organization_id) {
      query = query.eq('organization_id', organization_id as string);
    }
    if (status) {
      query = query.eq('status', status as string);
    }

    const { data: violations, error } = await query;

    if (error) throw error;
    res.json(violations || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

app.patch('/api/policy/violations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolved_by } = req.body;

    const updateData: Record<string, any> = { status };
    if (resolved_by) {
      updateData.resolved_by = resolved_by;
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: violation, error } = await supabase
      .from('policy_violations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(violation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update violation' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'policy' });
});

app.listen(PORT, () => {
  logger.info(`Policy Service running on port ${PORT}`);
});

export default app;

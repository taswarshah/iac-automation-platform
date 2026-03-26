import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const app = express();
const PORT = process.env.PORT || 3006;

const supabaseUrl = process.env.SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/deployments', async (req: Request, res: Response) => {
  try {
    const { organization_id, status, design_id } = req.query;

    let query = supabase
      .from('deployments')
      .select(`
        *,
        visual_designs:design_id(name),
        users:created_by(email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (organization_id) {
      query = query.eq('organization_id', organization_id as string);
    }
    if (status) {
      query = query.eq('status', status as string);
    }
    if (design_id) {
      query = query.eq('design_id', design_id as string);
    }

    const { data: deployments, error } = await query;

    if (error) throw error;
    res.json(deployments || []);
  } catch (err) {
    logger.error('Error fetching deployments', err);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

app.post('/api/deployments', async (req: Request, res: Response) => {
  try {
    const {
      name,
      organization_id,
      design_id,
      generated_code_id,
      credential_id,
      deployment_type = 'apply',
      variables = {},
      created_by
    } = req.body;

    if (!name || !organization_id || !created_by) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: deployment, error } = await supabase
      .from('deployments')
      .insert({
        name,
        organization_id,
        design_id,
        generated_code_id,
        credential_id,
        deployment_type,
        variables,
        status: 'pending',
        created_by
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(deployment);
  } catch (err) {
    logger.error('Error creating deployment', err);
    res.status(500).json({ error: 'Failed to create deployment' });
  }
});

app.get('/api/deployments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: deployment, error } = await supabase
      .from('deployments')
      .select(`
        *,
        visual_designs:design_id(name, ia_type),
        generated_code:generated_code_id(code_content, framework),
        users:created_by(email, full_name)
      `)
      .eq('id', id)
      .single();

    if (error || !deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    res.json(deployment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deployment' });
  }
});

app.post('/api/deployments/:id/plan', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: deployment } = await supabase
      .from('deployments')
      .select('*, generated_code(code_content)')
      .eq('id', id)
      .single();

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    await supabase
      .from('deployments')
      .update({
        status: 'planning',
        started_at: new Date().toISOString()
      })
      .eq('id', id);

    const planOutput = `# Terraform Plan

Terraform used the selected providers to generate the following execution plan.

Plan: 3 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + application_url = "https://example.com"

────────────────────────────────────────────────────────────────────────────

Note: You didn't use the -out option to save this plan, so it will be
presented to you interactively.`;
    
    const planSummary = {
      add: 3,
      change: 0,
      destroy: 0
    };

    await supabase
      .from('deployments')
      .update({
        status: 'approved',
        plan_output: planOutput,
        plan_summary: planSummary,
        completed_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json({ 
      status: 'approved', 
      plan_output: planOutput,
      plan_summary: planSummary
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run plan' });
  }
});

app.post('/api/deployments/:id/apply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: deployment } = await supabase
      .from('deployments')
      .select('*')
      .eq('id', id)
      .single();

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (deployment.status !== 'approved') {
      return res.status(400).json({ error: 'Deployment must be planned before applying' });
    }

    await supabase
      .from('deployments')
      .update({ status: 'applying' })
      .eq('id', id);

    setTimeout(async () => {
      await supabase
        .from('deployments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          plan_summary: { add: 3, change: 0, destroy: 0 }
        })
        .eq('id', id);
    }, 3000);

    res.json({ status: 'applying', message: 'Deployment in progress' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply deployment' });
  }
});

app.post('/api/deployments/:id/destroy', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await supabase
      .from('deployments')
      .update({
        status: 'applying',
        deployment_type: 'destroy',
        started_at: new Date().toISOString()
      })
      .eq('id', id);

    setTimeout(async () => {
      await supabase
        .from('deployments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id);
    }, 2000);

    res.json({ status: 'applying', message: 'Destroy in progress' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to destroy deployment' });
  }
});

app.post('/api/deployments/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: deployment } = await supabase
      .from('deployments')
      .select('status')
      .eq('id', id)
      .single();

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (['completed', 'cancelled'].includes(deployment.status)) {
      return res.status(400).json({ error: 'Cannot cancel this deployment' });
    }

    await supabase
      .from('deployments')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', id);

    res.json({ status: 'cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel deployment' });
  }
});

app.get('/api/deployments/:id/steps', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: steps, error } = await supabase
      .from('deployment_steps')
      .select('*')
      .eq('deployment_id', id)
      .order('step_order');

    if (error) throw error;
    res.json(steps || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deployment steps' });
  }
});

app.post('/api/deployments/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved_by, comments } = req.body;

    await supabase
      .from('deployments')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    await supabase
      .from('deployment_approvals')
      .insert({
        deployment_id: id,
        approver_user_id: approved_by,
        status: 'approved',
        comments,
        approved_at: new Date().toISOString()
      });

    res.json({ status: 'approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve deployment' });
  }
});

app.get('/api/deployments/:id/approvals', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: approvals, error } = await supabase
      .from('deployment_approvals')
      .select('*')
      .eq('deployment_id', id);

    if (error) throw error;
    res.json(approvals || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'deployment' });
});

app.listen(PORT, () => {
  logger.info(`Deployment Service running on port ${PORT}`);
});

export default app;

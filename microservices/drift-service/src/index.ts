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
const PORT = process.env.PORT || 3007;

const supabaseUrl = process.env.SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(helmet());
app.use(cors());
app.use(express.json());

interface DriftResult {
  resourceAddress: string;
  resourceType: string;
  driftType: 'missing' | 'changed' | 'extra';
  expected: Record<string, any>;
  actual: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

app.post('/api/drift/detect', async (req: Request, res: Response) => {
  try {
    const { organization_id, design_id, credential_id, created_by } = req.body;

    if (!organization_id || !design_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: design } = await supabase
      .from('visual_designs')
      .select('resources')
      .eq('id', design_id)
      .single();

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    const { data: run, error: runError } = await supabase
      .from('drift_detection_runs')
      .insert({
        organization_id,
        design_id,
        credential_id,
        status: 'running',
        resources_scanned: design.resources?.length || 0,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (runError || !run) {
      return res.status(500).json({ error: 'Failed to create drift detection run' });
    }

    const mockDrifts: DriftResult[] = [];

    const driftResources = design.resources?.filter((r: any) => 
      r.data?.type && Math.random() > 0.7
    );

    if (driftResources && driftResources.length > 0) {
      for (const resource of driftResources) {
        const drift: DriftResult = {
          resourceAddress: resource.data?.label || resource.id,
          resourceType: resource.data?.type || 'unknown',
          driftType: Math.random() > 0.5 ? 'changed' : 'missing',
          expected: resource.data?.inputs || {},
          actual: { ...resource.data?.inputs, changed: true },
          severity: Math.random() > 0.7 ? 'high' : 'medium'
        };
        mockDrifts.push(drift);
      }
    }

    for (const drift of mockDrifts) {
      await supabase.from('drifts').insert({
        organization_id,
        run_id: run.id,
        resource_address: drift.resourceAddress,
        resource_type: drift.resourceType,
        expected_state: drift.expected,
        actual_state: drift.actual,
        diff: { changed: true },
        drift_type: drift.driftType,
        severity: drift.severity,
        status: 'active'
      });
    }

    await supabase
      .from('drift_detection_runs')
      .update({
        status: 'completed',
        drifts_found: mockDrifts.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', run.id);

    res.json({
      run_id: run.id,
      status: 'completed',
      resources_scanned: design.resources?.length || 0,
      drifts_found: mockDrifts.length,
      drifts: mockDrifts
    });
  } catch (err) {
    logger.error('Drift detection error', err);
    res.status(500).json({ error: 'Failed to detect drift' });
  }
});

app.get('/api/drift/runs', async (req: Request, res: Response) => {
  try {
    const { organization_id, design_id } = req.query;

    let query = supabase
      .from('drift_detection_runs')
      .select('*')
      .order('created_at', { ascending: false });

    if (organization_id) {
      query = query.eq('organization_id', organization_id as string);
    }
    if (design_id) {
      query = query.eq('design_id', design_id as string);
    }

    const { data: runs, error } = await query;

    if (error) throw error;
    res.json(runs || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drift runs' });
  }
});

app.get('/api/drift/runs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: run, error } = await supabase
      .from('drift_detection_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const { data: drifts } = await supabase
      .from('drifts')
      .select('*')
      .eq('run_id', id);

    res.json({ ...run, drifts: drifts || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drift run' });
  }
});

app.get('/api/drift/active', async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.query;

    let query = supabase
      .from('drifts')
      .select(`
        *,
        drift_detection_runs:run_id(design_id, created_at)
      `)
      .eq('status', 'active');

    if (organization_id) {
      query = query.eq('organization_id', organization_id as string);
    }

    const { data: drifts, error } = await query;

    if (error) throw error;
    res.json(drifts || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active drifts' });
  }
});

app.patch('/api/drift/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolved_by } = req.body;

    const { data: drift, error } = await supabase
      .from('drifts')
      .update({
        status: 'resolved',
        resolved_by,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(drift);
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve drift' });
  }
});

app.patch('/api/drift/:id/ignore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: drift, error } = await supabase
      .from('drifts')
      .update({ status: 'ignored' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(drift);
  } catch (err) {
    res.status(500).json({ error: 'Failed to ignore drift' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'drift' });
});

app.listen(PORT, () => {
  logger.info(`Drift Service running on port ${PORT}`);
});

export default app;

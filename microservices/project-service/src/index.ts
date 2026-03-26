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
const PORT = process.env.PORT || 3002;

const supabaseUrl = process.env.SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/projects', async (req: Request, res: Response) => {
  try {
    const orgId = req.query.organization_id as string;
    
    let query = supabase
      .from('visual_designs')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data: projects, error } = await query;

    if (error) throw error;
    res.json(projects || []);
  } catch (err) {
    logger.error('Error fetching projects', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      description, 
      organization_id, 
      team_id, 
      ia_type = 'terraform',
      environment = 'development',
      created_by 
    } = req.body;

    if (!name || !organization_id || !created_by) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: project, error } = await supabase
      .from('visual_designs')
      .insert({
        organization_id,
        team_id,
        name,
        description,
        ia_type,
        environment,
        version: 1,
        canvas_state: {},
        resources: [],
        connections: [],
        variables: {},
        status: 'draft',
        created_by
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('design_versions')
      .insert({
        design_id: project.id,
        version: 1,
        snapshot: { resources: [], connections: [] },
        change_description: 'Initial version',
        created_by
      });

    res.status(201).json(project);
  } catch (err) {
    logger.error('Error creating project', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.get('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: project, error } = await supabase
      .from('visual_designs')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.patch('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status, environment, tags, metadata } = req.body;

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (environment) updateData.environment = environment;
    if (tags) updateData.tags = tags;
    if (metadata) updateData.metadata = metadata;
    updateData.updated_at = new Date().toISOString();

    const { data: project, error } = await supabase
      .from('visual_designs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('visual_designs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

app.get('/api/projects/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: versions, error } = await supabase
      .from('design_versions')
      .select('*')
      .eq('design_id', id)
      .order('version', { ascending: false });

    if (error) throw error;
    res.json(versions || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

app.post('/api/projects/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resources, connections, change_description, created_by } = req.body;

    const { data: currentVersion } = await supabase
      .from('visual_designs')
      .select('version')
      .eq('id', id)
      .single();

    const newVersion = (currentVersion?.version || 0) + 1;

    await supabase
      .from('design_versions')
      .insert({
        design_id: id,
        version: newVersion,
        snapshot: { resources, connections },
        change_description,
        created_by
      });

    await supabase
      .from('visual_designs')
      .update({ 
        version: newVersion,
        resources,
        connections,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    res.status(201).json({ version: newVersion });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create version' });
  }
});

app.get('/api/projects/:id/graph', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: project, error } = await supabase
      .from('visual_designs')
      .select('resources, connections, canvas_state, variables')
      .eq('id', id)
      .single();

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      resources: project.resources,
      connections: project.connections,
      canvasState: project.canvas_state,
      variables: project.variables
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

app.post('/api/projects/:id/graph', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resources, connections, canvas_state, variables } = req.body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    if (resources) updateData.resources = resources;
    if (connections) updateData.connections = connections;
    if (canvas_state) updateData.canvas_state = canvas_state;
    if (variables) updateData.variables = variables;

    const { data: project, error } = await supabase
      .from('visual_designs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save graph' });
  }
});

app.post('/api/projects/:id/lock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { locked_by } = req.body;

    const { data: project, error } = await supabase
      .from('visual_designs')
      .update({
        is_locked: true,
        locked_by,
        locked_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to lock project' });
  }
});

app.post('/api/projects/:id/unlock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: project, error } = await supabase
      .from('visual_designs')
      .update({
        is_locked: false,
        locked_by: null,
        locked_at: null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlock project' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'project' });
});

app.listen(PORT, () => {
  logger.info(`Project Service running on port ${PORT}`);
});

export default app;

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
const PORT = process.env.PORT || 3003;

const supabaseUrl = process.env.SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/templates', async (req: Request, res: Response) => {
  try {
    const { category, provider, search, sort = 'popularity' } = req.query;

    let query = supabase
      .from('templates')
      .select('*')
      .eq('is_public', true)
      .is('deleted_at', null);

    if (category) {
      query = query.eq('category', category as string);
    }
    if (provider) {
      query = query.eq('provider', provider as string);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    switch (sort) {
      case 'popularity':
        query = query.order('usage_count', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      default:
        query = query.order('popularity_score', { ascending: false });
    }

    const { data: templates, error } = await query;

    if (error) throw error;
    res.json(templates || []);
  } catch (err) {
    logger.error('Error fetching templates', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.get('/api/templates/featured', async (req: Request, res: Response) => {
  try {
    const { data: templates } = await supabase
      .from('templates')
      .select('*')
      .eq('is_public', true)
      .eq('is_featured', true)
      .order('usage_count', { ascending: false })
      .limit(6);

    res.json(templates || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured templates' });
  }
});

app.get('/api/templates/categories', async (req: Request, res: Response) => {
  try {
    const { data: categories } = await supabase
      .from('templates')
      .select('category')
      .eq('is_public', true)
      .not('category', 'is', null);

    const uniqueCategories = [...new Set(categories?.map(c => c.category))];
    res.json(uniqueCategories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

app.post('/api/templates', async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      category,
      provider,
      organization_id,
      team_id,
      resources,
      config_schema,
      tags,
      is_public = false,
      created_by
    } = req.body;

    if (!name || !created_by) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const templateSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        organization_id,
        team_id,
        name,
        slug: templateSlug,
        description,
        category,
        provider,
        version: '1.0.0',
        resources: resources || [],
        config_schema: config_schema || {},
        tags: tags || [],
        is_public,
        is_featured: false,
        is_official: false,
        created_by
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(template);
  } catch (err) {
    logger.error('Error creating template', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

app.patch('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, tags, is_public } = req.body;

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;
    if (tags) updateData.tags = tags;
    if (is_public !== undefined) updateData.is_public = is_public;
    updateData.updated_at = new Date().toISOString();

    const { data: template, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

app.delete('/api/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

app.post('/api/templates/:id/use', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { project_id, created_by } = req.body;

    const { data: template } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await supabase
      .from('templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', id);

    if (project_id) {
      await supabase
        .from('visual_designs')
        .update({
          resources: template.resources,
          template_id: id,
          updated_at: new Date().toISOString()
        })
        .eq('id', project_id);
    }

    res.json({ success: true, resources: template.resources });
  } catch (err) {
    res.status(500).json({ error: 'Failed to use template' });
  }
});

app.post('/api/templates/:id/rate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, user_id } = req.body;

    if (!rating || !user_id || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    const { error } = await supabase
      .from('template_ratings')
      .upsert({
        template_id: id,
        user_id,
        rating
      }, { onConflict: 'template_id,user_id' });

    if (error) throw error;

    const { data: ratings } = await supabase
      .from('template_ratings')
      .select('rating')
      .eq('template_id', id);

    const avgRating = ratings?.length 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0;

    await supabase
      .from('templates')
      .update({ rating: avgRating, rating_count: ratings?.length || 0 })
      .eq('id', id);

    res.json({ success: true, rating: avgRating });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rate template' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'template' });
});

app.listen(PORT, () => {
  logger.info(`Template Service running on port ${PORT}`);
});

export default app;

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
const PORT = process.env.PORT || 3008;

const supabaseUrl = process.env.SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/notifications', async (req: Request, res: Response) => {
  try {
    const { user_id, is_read, limit = 50 } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user_id as string)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }

    const { data: notifications, error } = await query;

    if (error) throw error;
    res.json(notifications || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.get('/api/notifications/unread', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user_id as string)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(notifications || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
});

app.get('/api/notifications/unread/count', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id as string)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

app.post('/api/notifications', async (req: Request, res: Response) => {
  try {
    const { user_id, type, title, content, data = {} } = req.body;

    if (!user_id || !type || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        content,
        data,
        is_read: false,
        is_archived: false
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(notification);
  } catch (err) {
    logger.error('Error creating notification', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

app.post('/api/notifications/batch', async (req: Request, res: Response) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ error: 'Notifications array required' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notifications' });
  }
});

app.patch('/api/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

app.patch('/api/notifications/read/all', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user_id)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

app.patch('/api/notifications/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_archived: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive notification' });
  }
});

app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

app.delete('/api/notifications/clear/archived', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user_id)
      .eq('is_archived', true);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear archived notifications' });
  }
});

app.post('/api/notifications/email', async (req: Request, res: Response) => {
  try {
    const { user_id, subject, body, type } = req.body;

    logger.info('Email notification', { user_id, subject, type });

    res.json({ success: true, message: 'Email queued' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email notification' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'notification' });
});

app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});

export default app;

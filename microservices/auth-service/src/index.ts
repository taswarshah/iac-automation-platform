import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
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
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

const supabaseUrl = process.env.SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(helmet());
app.use(cors());
app.use(express.json());

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  password_hash: string;
  organization_id?: string;
  role: string;
  created_at: string;
}

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

const generateToken = (user: Partial<User>): string => {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organization_id || '',
      role: user.role || 'member'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, username, fullName, password, organizationName } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let organizationId = '';
    if (organizationName) {
      const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const { data: org } = await supabase
        .from('organizations')
        .insert({ name: organizationName, slug, tier: 'free' })
        .select()
        .single();
      
      if (org) {
        organizationId = org.id;
      }
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        username,
        full_name: fullName || username,
        password_hash: passwordHash,
        auth_provider: 'local'
      })
      .select()
      .single();

    if (error || !user) {
      logger.error('User creation failed', error);
      return res.status(500).json({ error: 'Failed to create user' });
    }

    if (organizationId) {
      await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          role: 'owner'
        });
    }

    const token = generateToken({ ...user, organization_id: organizationId });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        organizationId
      }
    });
  } catch (err) {
    logger.error('Registration error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    const token = generateToken({
      ...user,
      organization_id: orgMember?.organization_id || '',
      role: orgMember?.role || 'member'
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        organizationId: orgMember?.organization_id || '',
        role: orgMember?.role || 'member'
      }
    });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const { data: user } = await supabase
      .from('users')
      .select('id, email, username, full_name, avatar_url, settings, created_at')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      settings: user.settings,
      organizationId: orgMember?.organization_id || '',
      role: orgMember?.role || 'member',
      createdAt: user.created_at
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/auth/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as any;
    const newToken = jwt.sign(
      { userId: decoded.userId, organizationId: decoded.organizationId, role: decoded.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/users', async (req: AuthRequest, res: Response) => {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id, email, username, full_name, avatar_url, created_at');

    res.json(users || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/organizations', async (req: AuthRequest, res: Response) => {
  try {
    const { data: organizations } = await supabase
      .from('organizations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    res.json(organizations || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

app.post('/api/organizations', async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, tier = 'free' } = req.body;

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name, slug, tier })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(org);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'auth' });
});

app.listen(PORT, () => {
  logger.info(`Auth Service running on port ${PORT}`);
});

export default app;

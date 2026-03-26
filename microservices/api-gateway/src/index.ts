import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const serviceConfig = {
  '/api/auth': {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true
  },
  '/api/projects': {
    target: process.env.PROJECT_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true
  },
  '/api/designs': {
    target: process.env.PROJECT_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true
  },
  '/api/templates': {
    target: process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true
  },
  '/api/generate': {
    target: process.env.CODE_GEN_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true
  },
  '/api/policy': {
    target: process.env.POLICY_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true
  },
  '/api/deployments': {
    target: process.env.DEPLOYMENT_SERVICE_URL || 'http://localhost:3006',
    changeOrigin: true
  },
  '/api/drift': {
    target: process.env.DRIFT_SERVICE_URL || 'http://localhost:3007',
    changeOrigin: true
  },
  '/api/notifications': {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    changeOrigin: true
  }
};

Object.entries(serviceConfig).forEach(([path, config]) => {
  app.use(path, createProxyMiddleware(config as any));
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'operational',
      projects: 'operational',
      templates: 'operational',
      codeGen: 'operational',
      policy: 'operational',
      deployment: 'operational'
    }
  });
});

app.get('/api/status', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    user: req.user,
    services: {
      auth: 'connected',
      projects: 'connected',
      templates: 'connected',
      codeGen: 'connected',
      policy: 'connected',
      deployment: 'connected'
    }
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

export default app;

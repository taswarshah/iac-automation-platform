import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const app = express();
const PORT = process.env.PORT || 3004;

const supabaseUrl = process.env.SUPABASE_URL || 'https://hgtmnmyiafflmpthcfkl.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(helmet());
app.use(cors());
app.use(express.json());

interface ResourceNode {
  id: string;
  data?: {
    type?: string;
    label?: string;
    inputs?: Record<string, any>;
  };
}

function topologicalSort(nodes: ResourceNode[], edges: any[]): ResourceNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  });

  edges.forEach(e => {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    adjacency.get(e.source)?.push(e.target);
  });

  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  const result: ResourceNode[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) result.push(node);

    adjacency.get(nodeId)?.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    });
  }

  return result;
}

function generateTerraform(nodes: ResourceNode[], edges: any[]): string {
  const sortedNodes = topologicalSort(nodes, edges);
  const resourceBlocks: string[] = [];

  for (const node of sortedNodes) {
    const resourceType = node.data?.type;
    if (!resourceType) continue;

    const resourceName = (node.data?.label || node.id).toLowerCase().replace(/\s+/g, '_');
    const inputs = node.data?.inputs || {};

    let block = `resource "${resourceType}" "${resourceName}" {\n`;

    for (const [key, value] of Object.entries(inputs)) {
      if (value === undefined || value === '') continue;

      if (typeof value === 'boolean') {
        block += `  ${key} = ${value}\n`;
      } else if (typeof value === 'number') {
        block += `  ${key} = ${value}\n`;
      } else if (typeof value === 'object') {
        block += `  ${key} = ${JSON.stringify(value)}\n`;
      } else {
        block += `  ${key} = "${value}"\n`;
      }
    }

    block += '}\n';
    resourceBlocks.push(block);
  }

  return `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

${resourceBlocks.join('\n\n')}`;
}

function generateKubernetes(nodes: ResourceNode[], edges: any[]): string {
  const kindMap: Record<string, string> = {
    kubernetes_deployment: 'Deployment',
    kubernetes_service: 'Service',
    kubernetes_configmap: 'ConfigMap',
    kubernetes_secret: 'Secret',
    kubernetes_ingress: 'Ingress',
    kubernetes_namespace: 'Namespace',
    kubernetes_persistentvolumeclaim: 'PersistentVolumeClaim',
  };

  const manifests: string[] = [];

  for (const node of nodes) {
    const resourceType = node.data?.type;
    if (!resourceType) continue;

    const name = (node.data?.label || node.id).toLowerCase().replace(/\s+/g, '-');
    const inputs = node.data?.inputs || {};
    const namespace = inputs.namespace || 'default';

    const kind = kindMap[resourceType];
    if (!kind) continue;

    const manifest: Record<string, any> = {
      apiVersion: 'v1',
      kind,
      metadata: { name, namespace }
    };

    if (resourceType === 'kubernetes_deployment') {
      manifest.spec = {
        replicas: inputs.replicas || 3,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [{
              name,
              image: inputs.image || 'nginx:latest',
              ports: [{ containerPort: inputs.port || 80 }]
            }]
          }
        }
      };
    } else if (resourceType === 'kubernetes_service') {
      manifest.spec = {
        type: inputs.type || 'ClusterIP',
        selector: { app: name },
        ports: [{ port: inputs.port || 80, targetPort: inputs.port || 80 }]
      };
    } else if (resourceType === 'kubernetes_configmap') {
      manifest.data = inputs.data || {};
    } else if (resourceType === 'kubernetes_secret') {
      manifest.type = 'Opaque';
      manifest.data = inputs.data || {};
    }

    manifests.push(yamlStringify(manifest));
  }

  return manifests.join('\n---\n');
}

function yamlStringify(obj: any, indent = 0): string {
  const spaces = ' '.repeat(indent);

  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'boolean' || typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') return obj;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map((item) => {
      const itemYaml = yamlStringify(item, indent + 2);
      if (typeof item === 'object' && item !== null) {
        return `${spaces}- ${itemYaml.trimStart()}`;
      }
      return `${spaces}- ${itemYaml}`;
    }).join('\n');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    return entries.map(([key, value]) => {
      const valueYaml = yamlStringify(value, indent + 2);
      if (typeof value === 'object' && value !== null) {
        return `${spaces}${key}:${valueYaml ? '\n' + valueYaml : ''}`;
      }
      return `${spaces}${key}: ${valueYaml}`;
    }).join('\n');
  }

  return String(obj);
}

app.post('/api/generate/terraform', async (req: Request, res: Response) => {
  try {
    const { nodes = [], edges = [], design_id, created_by } = req.body;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ error: 'Invalid nodes' });
    }

    const code = generateTerraform(nodes, edges);
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    if (design_id) {
      await supabase.from('generated_code').insert({
        design_id,
        version: 1,
        framework: 'terraform',
        provider: 'aws',
        code_content: code,
        code_hash: codeHash,
        validation_status: 'pending',
        created_by
      });
    }

    res.json({ code, nodes: nodes.length, hash: codeHash });
  } catch (err) {
    logger.error('Terraform generation error', err);
    res.status(500).json({ error: 'Failed to generate Terraform code' });
  }
});

app.post('/api/generate/kubernetes', async (req: Request, res: Response) => {
  try {
    const { nodes = [], edges = [], design_id, created_by } = req.body;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ error: 'Invalid nodes' });
    }

    const code = generateKubernetes(nodes, edges);
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    if (design_id) {
      await supabase.from('generated_code').insert({
        design_id,
        version: 1,
        framework: 'kubernetes',
        code_content: code,
        code_hash: codeHash,
        validation_status: 'pending',
        created_by
      });
    }

    res.json({ code, count: nodes.length, hash: codeHash });
  } catch (err) {
    logger.error('Kubernetes generation error', err);
    res.status(500).json({ error: 'Failed to generate Kubernetes manifests' });
  }
});

app.post('/api/generate/azure', async (req: Request, res: Response) => {
  try {
    const { nodes = [], edges = [] } = req.body;

    let code = `# Azure Resource Manager Template\n`;
    code += `{\n  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",\n`;
    code += `  "contentVersion": "1.0.0.0",\n`;
    code += `  "parameters": {},\n`;
    code += `  "variables": {},\n`;
    code += `  "resources": [\n`;

    const resources = nodes.map(node => {
      const type = node.data?.type || '';
      const name = (node.data?.label || node.id).toLowerCase().replace(/\s+/g, '-');
      return `    {\n      "type": "${type}",\n      "apiVersion": "2021-01-01",\n      "name": "${name}"\n    }`;
    }).join(',\n');

    code += resources;
    code += `\n  ]\n}`;

    res.json({ code, nodes: nodes.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Azure template' });
  }
});

app.get('/api/generated/:designId', async (req: Request, res: Response) => {
  try {
    const { designId } = req.params;

    const { data: versions, error } = await supabase
      .from('generated_code')
      .select('*')
      .eq('design_id', designId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(versions || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch generated code' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'code-gen' });
});

app.listen(PORT, () => {
  logger.info(`Code Generation Service running on port ${PORT}`);
});

export default app;

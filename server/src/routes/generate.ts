import { Router } from 'express'

const router = Router()

router.post('/terraform', (req, res) => {
  const { nodes, edges } = req.body

  if (!nodes || !Array.isArray(nodes)) {
    return res.status(400).json({ error: 'Invalid nodes' })
  }

  const sortedNodes = topologicalSort(nodes, edges || [])
  const resourceBlocks: string[] = []

  for (const node of sortedNodes as Array<{ id: string; data: { type?: string; label?: string; inputs?: Record<string, unknown> } }>) {
    const resourceType = node.data?.type
    const resourceName = (node.data?.label || node.id).toLowerCase().replace(/\s+/g, '_')
    const inputs = node.data?.inputs || {}

    let block = `resource "${resourceType}" "${resourceName}" {\n`

    for (const [key, value] of Object.entries(inputs)) {
      if (value === undefined || value === '') continue

      if (typeof value === 'boolean') {
        block += `  ${key} = ${value}\n`
      } else if (typeof value === 'number') {
        block += `  ${key} = ${value}\n`
      } else if (typeof value === 'object') {
        block += `  ${key} = ${JSON.stringify(value)}\n`
      } else {
        block += `  ${key} = "${value}"\n`
      }
    }

    block += '}'
    resourceBlocks.push(block)
  }

  const terraform = `terraform {
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

${resourceBlocks.join('\n\n')}`

  res.json({ code: terraform, nodes: sortedNodes.length })
})

router.post('/kubernetes', (req, res) => {
  const { nodes, edges } = req.body

  if (!nodes || !Array.isArray(nodes)) {
    return res.status(400).json({ error: 'Invalid nodes' })
  }

  const manifests: string[] = []
  const kindMap: Record<string, string> = {
    kubernetes_deployment: 'Deployment',
    kubernetes_service: 'Service',
    kubernetes_configmap: 'ConfigMap',
    kubernetes_secret: 'Secret',
    kubernetes_ingress: 'Ingress',
    kubernetes_namespace: 'Namespace',
    kubernetes_persistentvolumeclaim: 'PersistentVolumeClaim',
  }

  for (const node of nodes) {
    const resourceType = node.data?.type
    const name = (node.data?.label || node.id).toLowerCase().replace(/\s+/g, '-')
    const inputs = node.data?.inputs || {}
    const namespace = inputs.namespace || 'default'

    const kind = kindMap[resourceType]
    if (!kind) continue

    const manifest: Record<string, unknown> = {
      apiVersion: 'v1',
      kind,
      metadata: { name, namespace },
    }

    if (resourceType === 'kubernetes_deployment') {
      manifest.spec = {
        replicas: inputs.replicas || 3,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [{ name, image: inputs.image, ports: [{ containerPort: inputs.port || 80 }] }],
          },
        },
      }
    } else if (resourceType === 'kubernetes_service') {
      manifest.spec = {
        type: inputs.type || 'ClusterIP',
        selector: { app: name },
        ports: [{ port: inputs.port || 80, targetPort: inputs.port || 80 }],
      }
    }

    manifests.push(yamlStringify(manifest))
  }

  res.json({ code: manifests.join('\n---\n'), count: manifests.length })
})

function topologicalSort(nodes: unknown[], edges: unknown[]): unknown[] {
  const nodeMap = new Map((nodes as Array<{ id: string }>).map((n) => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const node of nodes as Array<{ id: string }>) {
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  }

  for (const edge of edges as Array<{ source: string; target: string }>) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    adjacency.get(edge.source)?.push(edge.target)
  }

  const queue: string[] = []
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId)
  }

  const result: unknown[] = []
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const node = nodeMap.get(nodeId)
    if (node) result.push(node)

    for (const neighbor of adjacency.get(nodeId) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  return result
}

function yamlStringify(obj: unknown, indent = 0): string {
  const spaces = ' '.repeat(indent)

  if (obj === null || obj === undefined) return ''
  if (typeof obj === 'boolean' || typeof obj === 'number') return String(obj)
  if (typeof obj === 'string') return obj

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return obj
      .map((item) => {
        const itemYaml = yamlStringify(item, indent + 2)
        if (typeof item === 'object' && item !== null) {
          return `${spaces}- ${itemYaml.trimStart()}`
        }
        return `${spaces}- ${itemYaml}`
      })
      .join('\n')
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return entries
      .map(([key, value]) => {
        const valueYaml = yamlStringify(value, indent + 2)
        if (typeof value === 'object' && value !== null) {
          return `${spaces}${key}:${valueYaml ? '\n' + valueYaml : ''}`
        }
        return `${spaces}${key}: ${valueYaml}`
      })
      .join('\n')
  }

  return String(obj)
}

export default router

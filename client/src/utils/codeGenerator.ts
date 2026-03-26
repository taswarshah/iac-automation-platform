import type { Node, Edge } from '@xyflow/react'
import { getResourceByType } from './resources'

// Find parent Resource Group for a node
const findParentResourceGroup = (node: Node, allNodes: Node[]): Node | undefined => {
  // Check if node has resourceGroupId
  const rgId = node.data?.resourceGroupId as string
  if (rgId) {
    return allNodes.find(n => n.id === rgId && n.data?.type === 'azurerm_resource_group')
  }
  return undefined
}

export const generateTerraform = (nodes: Node[], edges: Edge[]): string => {
  const sortedNodes = topologicalSort(nodes, edges)
  const resourceBlocks: string[] = []
  const outputs: string[] = []
  const providerOutputs = new Map<string, Set<string>>() // provider -> outputs

  const providers = new Set<string>()

  for (const node of sortedNodes) {
    const resource = getResourceByType(node.data.type as string)
    if (!resource) continue

    providers.add(resource.provider)

    const resourceName = (node.data.label as string)?.toLowerCase().replace(/\s+/g, '_') || node.id
    const block = generateTerraformResource(resource, node, nodes, edges)
    resourceBlocks.push(block)

    // Add outputs for this resource
    if (!providerOutputs.has(resource.provider)) {
      providerOutputs.set(resource.provider, new Set())
    }
    const providerSet = providerOutputs.get(resource.provider)!
    
    for (const output of resource.outputs) {
      const outputName = `${resourceName}_${output}`
      if (!providerSet.has(outputName)) {
        providerSet.add(outputName)
        outputs.push(`output "${outputName}" {`)
        outputs.push(`  value = ${resource.type}.${resourceName}.${output}`)
        outputs.push(`}`)
      }
    }
  }

  let terraform = `terraform {\n  required_providers {\n`

  if (providers.has('aws')) {
    terraform += `    aws = {\n      source  = "hashicorp/aws"\n      version = "~> 5.0"\n    }\n`
  }
  if (providers.has('azure')) {
    terraform += `    azurerm = {\n      source  = "hashicorp/azurerm"\n      version = "~> 3.0"\n    }\n`
  }

  terraform += `  }\n}\n\n`

  if (providers.has('aws')) {
    terraform += `provider "aws" {\n  region = "us-east-1"\n}\n\n`
  }
  if (providers.has('azure')) {
    terraform += `provider "azurerm" {\n  features {}\n}\n\n`
  }

  terraform += resourceBlocks.join('\n\n')

  if (outputs.length > 0) {
    terraform += '\n\n' + outputs.join('\n')
  }

  return terraform
}

const generateTerraformResource = (
  resource: ReturnType<typeof getResourceByType>,
  node: Node,
  allNodes: Node[],
  edges: Edge[]
): string => {
  if (!resource) return ''
  const resourceName = (node.data.label as string)?.toLowerCase().replace(/\s+/g, '_') || node.id
  const inputs = (node.data.inputs as Record<string, unknown>) || {}

  let block = `resource "${resource.type}" "${resourceName}" {\n`

  // Azure-specific resource handling
  const azureResourcesWithRG = [
    'azurerm_resource_group',
    'azurerm_virtual_network',
    'azurerm_subnet',
    'azurerm_virtual_machine',
    'azurerm_linux_virtual_machine',
    'azurerm_windows_virtual_machine',
    'azurerm_virtual_machine_extension',
    'azurerm_managed_disk',
    'azurerm_availability_set',
    'azurerm_storage_account',
    'azurerm_network_security_group',
    'azurerm_sql_database',
    'azurerm_sql_server',
    'azurerm_mysql_flexible_server',
    'azurerm_postgresql_flexible_server',
    'azurerm_app_service',
    'azurerm_app_service_plan',
    'azurerm_function_app',
    'azurerm_api_management',
    'azurerm_kubernetes_cluster',
    'azurerm_container_registry',
    'azurerm_public_ip',
    'azurerm_lb',
    'azurerm_key_vault',
    'azurerm_application_gateway',
    'azurerm_network_interface',
    'azurerm_virtual_network_gateway',
    'azurerm_private_endpoint',
    'azurerm_cosmosdb_account',
    'azurerm_redis_cache',
    'azurerm_servicebus_namespace',
    'azurerm_log_analytics_workspace',
    'azurerm_app_configuration',
    'azurerm_signalr_service',
    'azurerm_eventhub_namespace',
    'azurerm_cdn_profile',
    'azurerm_private_dns_zone',
    'azurerm_spring_cloud_service',
    'azurerm_synapse_workspace',
    'azurerm_data_factory',
    'azurerm_user_assigned_identity',
    'azurerm_firewall',
    'azurerm_bastion_host',
  ]

  // If this is a Resource Group, add its properties
  if (resource.type === 'azurerm_resource_group') {
    const name = inputs.name || node.data?.label || 'rg-default'
    const location = inputs.location || 'eastus'
    const subscriptionId = inputs.subscription_id || 'your-subscription-id'
    
    block += `  name = "${name}"\n`
    block += `  location = "${location}"\n`
    block += `  subscription_id = "${subscriptionId}"\n`
  } 
  // If this is not a RG, check if it has a parent RG
  else if (azureResourcesWithRG.includes(resource.type)) {
    const parentRG = findParentResourceGroup(node, allNodes)
    const rgInputs = parentRG ? (parentRG.data.inputs as Record<string, unknown>) || {} : {}
    const rgName = rgInputs.name || parentRG?.data?.label || 'rg-default'
    const rgLocation = rgInputs.location || 'eastus'
    
    // Add properties from parent RG if exists
    if (parentRG) {
      if (resource.inputs?.some(i => i.name === 'resource_group') || resource.inputs?.some(i => i.name === 'resource_group_name')) {
        block += `  resource_group_name = "${rgName}"\n`
      }
      if (resource.inputs?.some(i => i.name === 'location')) {
        block += `  location = "${rgLocation}"\n`
      }
    }
    
    // Add other explicit inputs
    const rgKeys = ['resource_group', 'resource_group_name', 'location', 'subscription_id', 'name', 'type', 'label', 'resourceGroup']
    for (const [key, value] of Object.entries(inputs)) {
      if (rgKeys.includes(key)) continue // Skip RG-inherited keys if parent exists
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
  } else {
    // Add other explicit inputs
    const rgKeys = ['resource_group', 'resource_group_name', 'location', 'subscription_id', 'name', 'type', 'label', 'resourceGroup']
    for (const [key, value] of Object.entries(inputs)) {
      if (rgKeys.includes(key)) continue
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
  }

  const outgoingEdges = edges.filter((e) => e.source === node.id)
  for (const edge of outgoingEdges) {
    const targetNode = allNodes.find((n) => n.id === edge.target)
    if (targetNode) {
      const targetResource = getResourceByType(targetNode.data.type as string)
      if (targetResource && resource) {
        const targetInput = edge.data?.targetInput as string

        if (targetInput && targetResource.inputs.some((i) => i.name === targetInput)) {
          block += `  ${targetInput} = ${resource.type}.${resourceName}.${targetResource.outputs[0]}\n`
        }
      }
    }
  }

  block += '}'
  return block
}

export const generateKubernetes = (nodes: Node[], edges: Edge[]): string => {
  const sortedNodes = topologicalSort(nodes, edges)
  const manifests: string[] = []

  for (const node of sortedNodes) {
    const resource = getResourceByType(node.data.type as string)
    if (!resource) continue

    const manifest = generateK8sManifest(resource, node, nodes, edges)
    if (manifest) {
      manifests.push(manifest)
    }
  }

  return manifests.join('\n---\n')
}

const generateK8sManifest = (
  resource: ReturnType<typeof getResourceByType>,
  node: Node,
  _allNodes: Node[],
  _edges: Edge[]
): string | null => {
  if (!resource) return null
  const inputs = (node.data.inputs as Record<string, unknown>) || {}
  const name = (node.data.label as string)?.toLowerCase().replace(/\s+/g, '-') || node.id

  const kindMap: Record<string, string> = {
    kubernetes_deployment: 'Deployment',
    kubernetes_service: 'Service',
    kubernetes_configmap: 'ConfigMap',
    kubernetes_secret: 'Secret',
    kubernetes_ingress: 'Ingress',
    kubernetes_namespace: 'Namespace',
    kubernetes_persistentvolumeclaim: 'PersistentVolumeClaim',
  }

  const kind = kindMap[resource.type] || resource.type

  const manifest: Record<string, unknown> = {
    apiVersion: 'v1',
    kind,
    metadata: {
      name,
    },
  }

  if (inputs.namespace && inputs.namespace !== 'default') {
    const meta = manifest.metadata as Record<string, unknown>
    manifest.metadata = { ...meta, namespace: inputs.namespace }
  }

  switch (resource.type) {
    case 'kubernetes_deployment':
      manifest.spec = {
        replicas: inputs.replicas || 3,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [
              {
                name,
                image: inputs.image,
                ports: [{ containerPort: inputs.port || 80 }],
                env: ((inputs.env as Array<{ name: string; value: string }>) || []).map((e) => ({ name: e.name, value: e.value })),
              },
            ],
          },
        },
      }
      break

    case 'kubernetes_service':
      manifest.spec = {
        type: inputs.type || 'ClusterIP',
        selector: { app: name },
        ports: ((inputs.ports as Array<{ port: number; targetPort?: number }>) || [{ port: 80, targetPort: 80 }]).map((p) => ({
          port: p.port,
          targetPort: p.targetPort || p.port,
        })),
      }
      break

    case 'kubernetes_configmap':
      manifest.data = inputs.data || {}
      break

    case 'kubernetes_secret':
      manifest.type = inputs.type || 'Opaque'
      manifest.data = inputs.data || {}
      break

    case 'kubernetes_ingress':
      manifest.spec = {
        ingressClassName: inputs.ingress_class || 'nginx',
        rules: [
          {
            host: inputs.host || '*',
            http: {
              paths: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: inputs.service_name,
                      port: { number: inputs.service_port || 80 },
                    },
                  },
                },
              ],
            },
          },
        ],
      }
      break

    case 'kubernetes_namespace':
      break

    case 'kubernetes_persistentvolumeclaim':
      manifest.spec = {
        accessModes: inputs.access_modes || ['ReadWriteOnce'],
        resources: { requests: { storage: inputs.storage || '10Gi' } },
      }
      break

    default:
      return null
  }

  return yamlStringify(manifest)
}

const yamlStringify = (obj: unknown, indent = 0): string => {
  const spaces = ' '.repeat(indent)

  if (obj === null || obj === undefined) return ''
  if (typeof obj === 'boolean' || typeof obj === 'number') return String(obj)
  if (typeof obj === 'string') return obj.includes('\n') ? `|\n${obj.split('\n').map((l) => spaces + '  ' + l).join('\n')}` : obj

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

const topologicalSort = (nodes: Node[], edges: Edge[]): Node[] => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  }

  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    adjacency.get(edge.source)?.push(edge.target)
  }

  const queue: string[] = []
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId)
  }

  const result: Node[] = []
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

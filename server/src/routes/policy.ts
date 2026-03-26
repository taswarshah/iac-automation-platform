import { Router } from 'express'
import { query } from '../config/database.js'

const router = Router()

interface PolicyViolation {
  id: string
  severity: 'error' | 'warning' | 'info'
  rule: string
  message: string
  resourceId: string
  resourceType: string
}

const defaultPolicies: Array<{
  id: string
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  check: (node: { data: { type: string; inputs: Record<string, unknown> } }) => PolicyViolation | null
}> = [
  {
    id: 's3-encryption',
    name: 'S3 Bucket Encryption',
    description: 'S3 buckets must have server-side encryption enabled',
    severity: 'error',
    check: (node) => {
      if (node.data.type === 'aws_s3_bucket') {
        if (!node.data.inputs?.server_side_encryption) {
          return {
            id: 's3-encryption',
            severity: 'error' as const,
            rule: 'S3 Bucket Encryption',
            message: 'S3 bucket should have server_side_encryption enabled',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'rds-backup',
    name: 'RDS Backup Retention',
    description: 'RDS instances should have backup retention enabled',
    severity: 'error',
    check: (node) => {
      if (node.data.type === 'aws_rds_instance') {
        const backupRetention = node.data.inputs?.backup_retention_period as number | undefined
        if (!backupRetention || backupRetention < 1) {
          return {
            id: 'rds-backup',
            severity: 'error' as const,
            rule: 'RDS Backup Retention',
            message: 'RDS instance should have backup_retention_period set to at least 1 day',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'sg-open-port',
    name: 'Security Group Open Port',
    description: 'Security groups should not allow unrestricted access to sensitive ports',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'aws_security_group') {
        const ingress = node.data.inputs?.ingress as Array<{ cidr_blocks?: string[]; from_port?: number }> | undefined
        if (ingress) {
          for (const rule of ingress) {
            if (rule.cidr_blocks?.includes('0.0.0.0/0') && rule.from_port && rule.from_port < 1024) {
              return {
                id: 'sg-open-port',
                severity: 'warning' as const,
                rule: 'Security Group Open Port',
                message: `Security group allows unrestricted access to port ${rule.from_port}`,
                resourceId: node.data.type,
                resourceType: node.data.type,
              }
            }
          }
        }
      }
      return null
    },
  },
  {
    id: 'lambda-timeout',
    name: 'Lambda Timeout',
    description: 'Lambda functions should have reasonable timeout values',
    severity: 'info',
    check: (node) => {
      if (node.data.type === 'aws_lambda_function') {
        const timeout = node.data.inputs?.timeout as number | undefined
        if (!timeout || timeout > 900) {
          return {
            id: 'lambda-timeout',
            severity: 'info' as const,
            rule: 'Lambda Timeout',
            message: 'Lambda timeout should be set to a reasonable value (max 900 seconds)',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'k8s-root-container',
    name: 'Kubernetes Root Container',
    description: 'Kubernetes pods should not run as root',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'kubernetes_deployment') {
        return {
          id: 'k8s-root-container',
          severity: 'warning' as const,
          rule: 'Kubernetes Root Container',
          message: 'Consider adding securityContext.runAsNonRoot: true to container spec',
          resourceId: node.data.type,
          resourceType: node.data.type,
        }
      }
      return null
    },
  },
  // Azure Policies
  {
    id: 'azure-storage-https',
    name: 'Azure Storage HTTPS',
    description: 'Azure Storage accounts should enforce HTTPS traffic',
    severity: 'error',
    check: (node) => {
      if (node.data.type === 'azurerm_storage_account') {
        if (node.data.inputs?.enable_https_traffic_only === false) {
          return {
            id: 'azure-storage-https',
            severity: 'error' as const,
            rule: 'Azure Storage HTTPS',
            message: 'Storage account should have enable_https_traffic_only set to true',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-storage-public-blob',
    name: 'Azure Storage Public Blob',
    description: 'Azure Storage should not allow public blob access',
    severity: 'error',
    check: (node) => {
      if (node.data.type === 'azurerm_storage_account') {
        if (node.data.inputs?.allow_blob_public_access === true) {
          return {
            id: 'azure-storage-public-blob',
            severity: 'error' as const,
            rule: 'Azure Storage Public Blob',
            message: 'Storage account should have allow_blob_public_access set to false',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-key-vault-purge-protection',
    name: 'Azure Key Vault Purge Protection',
    description: 'Key Vault should have purge protection enabled',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_key_vault') {
        if (node.data.inputs?.purge_protection_enabled !== true) {
          return {
            id: 'azure-key-vault-purge-protection',
            severity: 'warning' as const,
            rule: 'Azure Key Vault Purge Protection',
            message: 'Key Vault should have purge_protection_enabled set to true',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-key-vault-public-access',
    name: 'Azure Key Vault Public Access',
    description: 'Key Vault should not allow public network access',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_key_vault') {
        if (node.data.inputs?.public_network_access_enabled === true) {
          return {
            id: 'azure-key-vault-public-access',
            severity: 'warning' as const,
            rule: 'Azure Key Vault Public Access',
            message: 'Key Vault should have public_network_access_enabled set to false',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-sql-tde',
    name: 'Azure SQL Transparent Data Encryption',
    description: 'SQL Database should have transparent data encryption enabled',
    severity: 'error',
    check: (node) => {
      if (node.data.type === 'azurerm_sql_database') {
        if (node.data.inputs?.transparent_data_encryption_enabled === false) {
          return {
            id: 'azure-sql-tde',
            severity: 'error' as const,
            rule: 'Azure SQL TDE',
            message: 'SQL Database should have transparent_data_encryption_enabled set to true',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-sql-public-access',
    name: 'Azure SQL Public Access',
    description: 'SQL Server should not allow public network access',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_sql_server') {
        if (node.data.inputs?.public_network_access_enabled === true) {
          return {
            id: 'azure-sql-public-access',
            severity: 'warning' as const,
            rule: 'Azure SQL Public Access',
            message: 'SQL Server should have public_network_access_enabled set to false',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-app-service-https',
    name: 'Azure App Service HTTPS',
    description: 'App Service should enforce HTTPS',
    severity: 'error',
    check: (node) => {
      if (node.data.type === 'azurerm_app_service') {
        if (node.data.inputs?.https_only !== true) {
          return {
            id: 'azure-app-service-https',
            severity: 'error' as const,
            rule: 'Azure App Service HTTPS',
            message: 'App Service should have https_only set to true',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-function-app-https',
    name: 'Azure Function App HTTPS',
    description: 'Function App should enforce HTTPS',
    severity: 'error',
    check: (node) => {
      if (node.data.type === 'azurerm_function_app') {
        if (node.data.inputs?.https_enabled !== true) {
          return {
            id: 'azure-function-app-https',
            severity: 'error' as const,
            rule: 'Azure Function App HTTPS',
            message: 'Function App should have https_enabled set to true',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-cosmosdb-geo-redundancy',
    name: 'Azure Cosmos DB Geo-Redundancy',
    description: 'Cosmos DB should have multiple geo-locations for redundancy',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_cosmosdb_account') {
        const geoLocations = node.data.inputs?.geo_rep_locations as unknown[]
        const autoFailover = node.data.inputs?.automatic_failover_enabled
        if ((!geoLocations || geoLocations.length === 0) && !autoFailover) {
          return {
            id: 'azure-cosmosdb-geo-redundancy',
            severity: 'warning' as const,
            rule: 'Azure Cosmos DB Geo-Redundancy',
            message: 'Cosmos DB should have geo_rep_locations configured or automatic_failover_enabled',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-redis-ssl',
    name: 'Azure Redis SSL',
    description: 'Redis Cache should disable non-SSL port',
    severity: 'error',
    check: (node) => {
      if (node.data.type === 'azurerm_redis_cache') {
        if (node.data.inputs?.enable_non_ssl_port === true) {
          return {
            id: 'azure-redis-ssl',
            severity: 'error' as const,
            rule: 'Azure Redis SSL',
            message: 'Redis Cache should have enable_non_ssl_port set to false',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-vm-encryption-at-host',
    name: 'Azure VM Encryption at Host',
    description: 'Virtual Machines should have encryption at host enabled',
    severity: 'info',
    check: (node) => {
      if (node.data.type === 'azurerm_virtual_machine' || node.data.type === 'azurerm_linux_virtual_machine' || node.data.type === 'azurerm_windows_virtual_machine') {
        if (node.data.inputs?.encryption_at_host_enabled !== true) {
          return {
            id: 'azure-vm-encryption-at-host',
            severity: 'info' as const,
            rule: 'Azure VM Encryption at Host',
            message: 'Consider enabling encryption_at_host for enhanced security',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-nsg-rule-open-port',
    name: 'Azure NSG Open Port',
    description: 'Network Security Groups should not allow unrestricted access to sensitive ports',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_network_security_group') {
        const rules = node.data.inputs?.security_rules as Array<{ source_address_prefix?: string; destination_port_range?: string }> | undefined
        if (rules) {
          for (const rule of rules) {
            if (rule.source_address_prefix === 'Internet' && rule.destination_port_range) {
              const port = parseInt(rule.destination_port_range, 10)
              if (!isNaN(port) && port < 1024) {
                return {
                  id: 'azure-nsg-rule-open-port',
                  severity: 'warning' as const,
                  rule: 'Azure NSG Open Port',
                  message: `NSG allows unrestricted access from Internet to port ${port}`,
                  resourceId: node.data.type,
                  resourceType: node.data.type,
                }
              }
            }
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-lb-sku',
    name: 'Azure Load Balancer SKU',
    description: 'Load Balancer should use Standard SKU for production',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_lb') {
        if (node.data.inputs?.sku === 'Basic') {
          return {
            id: 'azure-lb-sku',
            severity: 'warning' as const,
            rule: 'Azure LB SKU',
            message: 'Load Balancer should use Standard SKU for production workloads',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-pip-sku',
    name: 'Azure Public IP SKU',
    description: 'Public IP should use Standard SKU for production',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_public_ip') {
        if (node.data.inputs?.sku === 'Basic') {
          return {
            id: 'azure-pip-sku',
            severity: 'warning' as const,
            rule: 'Azure PIP SKU',
            message: 'Public IP should use Standard SKU for production workloads',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-container-registry-public',
    name: 'Azure Container Registry Public Access',
    description: 'Container Registry should not allow public network access',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_container_registry') {
        if (node.data.inputs?.public_network_access_enabled === true) {
          return {
            id: 'azure-container-registry-public',
            severity: 'warning' as const,
            rule: 'Azure Container Registry Public Access',
            message: 'Container Registry should have public_network_access_enabled set to false',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-eventhub-public-access',
    name: 'Azure Event Hub Public Access',
    description: 'Event Hub Namespace should not allow public network access',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_eventhub_namespace') {
        if (node.data.inputs?.public_network_access_enabled === true) {
          return {
            id: 'azure-eventhub-public-access',
            severity: 'warning' as const,
            rule: 'Azure Event Hub Public Access',
            message: 'Event Hub Namespace should have public_network_access_enabled set to false',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-servicebus-public-access',
    name: 'Azure Service Bus Public Access',
    description: 'Service Bus should not allow public network access',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_servicebus_namespace') {
        if (node.data.inputs?.public_network_access_enabled === true) {
          return {
            id: 'azure-servicebus-public-access',
            severity: 'warning' as const,
            rule: 'Azure Service Bus Public Access',
            message: 'Service Bus should have public_network_access_enabled set to false',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-firewall-sku',
    name: 'Azure Firewall SKU',
    description: 'Azure Firewall should use Premium SKU for production',
    severity: 'info',
    check: (node) => {
      if (node.data.type === 'azurerm_firewall') {
        if (node.data.inputs?.sku_tier !== 'Premium') {
          return {
            id: 'azure-firewall-sku',
            severity: 'info' as const,
            rule: 'Azure Firewall SKU',
            message: 'Consider using Premium SKU for production workloads with advanced threat protection',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
  {
    id: 'azure-aks-aad-rbac',
    name: 'Azure Kubernetes Service RBAC',
    description: 'AKS cluster should enable Azure AD RBAC',
    severity: 'warning',
    check: (node) => {
      if (node.data.type === 'azurerm_kubernetes_cluster') {
        if (node.data.inputs?.azure_active_directory_role_based_access_control_enabled !== true) {
          return {
            id: 'azure-aks-aad-rbac',
            severity: 'warning' as const,
            rule: 'Azure AKS RBAC',
            message: 'AKS cluster should have azure_active_directory_role_based_access_control_enabled set to true',
            resourceId: node.data.type,
            resourceType: node.data.type,
          }
        }
      }
      return null
    },
  },
]

router.post('/check', (req, res) => {
  const { nodes } = req.body

  if (!nodes || !Array.isArray(nodes)) {
    return res.status(400).json({ error: 'Invalid nodes' })
  }

  const violations: PolicyViolation[] = []

  for (const node of nodes) {
    for (const policy of defaultPolicies) {
      const violation = policy.check(node as { data: { type: string; inputs: Record<string, unknown> } })
      if (violation) {
        violations.push(violation)
      }
    }
  }

  const errors = violations.filter((v) => v.severity === 'error')
  const warnings = violations.filter((v) => v.severity === 'warning')
  const info = violations.filter((v) => v.severity === 'info')

  res.json({
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    summary: {
      total: violations.length,
      errors: errors.length,
      warnings: warnings.length,
      info: info.length,
    },
  })
})

router.get('/rules', async (req, res) => {
  try {
    const result = await query("SELECT * FROM policy_rules WHERE enabled = true")
    
    const dbRules = result.rows
    const rules = dbRules.length ? dbRules : defaultPolicies.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      severity: p.severity,
      enabled: true,
    }))

    res.json(rules)
  } catch {
    res.json(
      defaultPolicies.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        severity: p.severity,
        enabled: true,
      }))
    )
  }
})

export default router

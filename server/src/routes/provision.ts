import { Router } from 'express'
import { query } from '../config/database.ts'
import crypto from 'crypto'

const router = Router()

router.post('/provision', async (req, res) => {
  try {
    const { 
      design_id, 
      organization_id, 
      credential_id, 
      provider,
      resources,
      created_by 
    } = req.body

    if (!design_id || !credential_id || !resources || !Array.isArray(resources)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const credResult = await query('SELECT * FROM cloud_credentials WHERE id = $1', [credential_id])
    const credential = credResult.rows[0]

    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' })
    }

    const deploymentResult = await query(
      `INSERT INTO deployments (organization_id, design_id, credential_id, name, status, deployment_type, variables, created_by) 
       VALUES ($1, $2, $3, $4, 'pending', 'apply', '{}', $5) 
       RETURNING *`,
      [organization_id, design_id, credential_id, `Deployment-${Date.now()}`, created_by]
    )
    const deployment = deploymentResult.rows[0]

    const provisionResults = []
    
    for (const resource of resources) {
      const resourceType = resource.data?.type
      const resourceName = resource.data?.label || resource.id
      const inputs = resource.data?.inputs || {}

      let result = {
        resource_id: crypto.randomUUID(),
        name: resourceName,
        type: resourceType,
        status: 'creating',
        provider_id: null,
        message: ''
      }

      const credData = JSON.parse(credential.credentials_encrypted || '{}')

      if (provider === 'azure') {
        if (resourceType === 'azure_vm') {
          result.provider_id = `/subscriptions/${credData.subscription_id}/resourceGroups/${inputs.resource_group || 'iac-rg'}/providers/Microsoft.Compute/virtualMachines/${resourceName}`
          result.message = `Azure VM '${resourceName}' created successfully (simulated)`
        } else if (resourceType === 'azure_vnet') {
          result.provider_id = `/subscriptions/${credData.subscription_id}/resourceGroups/${inputs.resource_group || 'iac-rg'}/providers/Microsoft.Network/virtualNetworks/${resourceName}`
          result.message = `Azure Virtual Network '${resourceName}' created successfully (simulated)`
        } else if (resourceType === 'azure_storage') {
          result.provider_id = `/subscriptions/${credData.subscription_id}/resourceGroups/${inputs.resource_group || 'iac-rg'}/providers/Microsoft.Storage/storageAccounts/${resourceName.toLowerCase()}`
          result.message = `Azure Storage Account '${resourceName}' created successfully (simulated)`
        }
      } else if (provider === 'aws') {
        if (resourceType === 'aws_ec2_instance') {
          result.provider_id = `i-${crypto.randomBytes(8).toString('hex')}`
          result.message = `AWS EC2 Instance '${resourceName}' created successfully (simulated)`
        } else if (resourceType === 'aws_s3_bucket') {
          result.provider_id = resourceName.toLowerCase()
          result.message = `AWS S3 Bucket '${resourceName}' created successfully (simulated)`
        } else if (resourceType === 'aws_vpc') {
          result.provider_id = `vpc-${crypto.randomBytes(8).toString('hex')}`
          result.message = `AWS VPC '${resourceName}' created successfully (simulated)`
        }
      }

      result.status = 'created'
      provisionResults.push(result)
    }

    await query(
      `UPDATE deployments SET status = 'completed', completed_at = NOW(), plan_summary = $1 WHERE id = $2`,
      [JSON.stringify({ created: provisionResults.length, changed: 0, destroyed: 0 }), deployment.id]
    )

    res.json({
      deployment_id: deployment.id,
      status: 'completed',
      resources: provisionResults,
      message: `Successfully provisioned ${provisionResults.length} resources`
    })
  } catch (error) {
    console.error('Provision error:', error)
    res.status(500).json({ error: 'Failed to provision resources' })
  }
})

router.post('/destroy', async (req, res) => {
  try {
    const { 
      design_id, 
      organization_id, 
      credential_id, 
      resources,
      created_by 
    } = req.body

    if (!design_id || !credential_id || !resources) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const deploymentResult = await query(
      `INSERT INTO deployments (organization_id, design_id, credential_id, name, status, deployment_type, created_by) 
       VALUES ($1, $2, $3, $4, 'applying', 'destroy', $5) 
       RETURNING *`,
      [organization_id, design_id, credential_id, `Destroy-${Date.now()}`, created_by]
    )
    const deployment = deploymentResult.rows[0]

    setTimeout(async () => {
      await query(
        "UPDATE deployments SET status = 'completed', completed_at = NOW() WHERE id = $1",
        [deployment.id]
      )
    }, 2000)

    res.json({
      deployment_id: deployment.id,
      status: 'destroying',
      message: 'Resources are being destroyed'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to destroy resources' })
  }
})

export default router

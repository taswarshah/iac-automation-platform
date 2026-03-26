import { useState } from 'react'
import { Search, Server, GitBranch, Download, Star } from 'lucide-react'
import { useAppStore } from '@/stores'
import type { Template, IaCType } from '@/types'

const sampleTemplates: Template[] = [
  {
    id: '1',
    name: 'Web Application Stack',
    description: 'Complete web app with load balancer, auto-scaling group, and RDS',
    category: 'Web Application',
    iaType: 'terraform',
    nodes: [],
    edges: [],
    downloads: 1250,
    author: 'IaC Platform',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Kubernetes Cluster',
    description: 'Production-ready K8s cluster with ingress, monitoring, and secrets',
    category: 'Container',
    iaType: 'kubernetes',
    nodes: [],
    edges: [],
    downloads: 890,
    author: 'IaC Platform',
    createdAt: '2024-01-20',
  },
  {
    id: '3',
    name: 'Serverless API',
    description: 'API Gateway with Lambda functions and DynamoDB',
    category: 'Serverless',
    iaType: 'terraform',
    nodes: [],
    edges: [],
    downloads: 720,
    author: 'Community',
    createdAt: '2024-02-01',
  },
  {
    id: '4',
    name: 'Data Pipeline',
    description: 'ETL pipeline with S3, Lambda, and Redshift',
    category: 'Data',
    iaType: 'terraform',
    nodes: [],
    edges: [],
    downloads: 450,
    author: 'IaC Platform',
    createdAt: '2024-02-10',
  },
  {
    id: '5',
    name: 'Microservices on K8s',
    description: 'Multi-service deployment with service mesh',
    category: 'Container',
    iaType: 'kubernetes',
    nodes: [],
    edges: [],
    downloads: 680,
    author: 'Community',
    createdAt: '2024-02-15',
  },
  {
    id: '6',
    name: 'Static Website Hosting',
    description: 'S3 + CloudFront with CDN and custom domain',
    category: 'Web Application',
    iaType: 'terraform',
    nodes: [],
    edges: [],
    downloads: 1100,
    author: 'IaC Platform',
    createdAt: '2024-02-20',
  },
]

export default function Templates() {
  const { templates } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<IaCType | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const displayTemplates = templates.length > 0 ? templates : sampleTemplates

  const filteredTemplates = displayTemplates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || template.iaType === selectedType
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesType && matchesCategory
  })

  const categories = [...new Set(displayTemplates.map((t) => t.category))]

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Template Marketplace</h1>
          <p className="text-gray-500 mt-1">Pre-built infrastructure templates</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as IaCType | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="all">All Types</option>
            <option value="terraform">Terraform</option>
            <option value="kubernetes">Kubernetes</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  template.iaType === 'terraform' ? 'bg-purple-100' : 'bg-blue-100'
                }`}>
                  {template.iaType === 'terraform' ? (
                    <Server className="w-5 h-5 text-purple-600" />
                  ) : (
                    <GitBranch className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {template.category}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" />
                    {template.downloads}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" />
                    4.8
                  </span>
                </div>
                <button className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium">
                  Use Template
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No templates found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}

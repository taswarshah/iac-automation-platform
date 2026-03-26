import { useState, useEffect } from 'react'
import { User, Building, CreditCard, Key, Bell, Shield, Cloud, Plus, Trash2 } from 'lucide-react'
import api from '../utils/api'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'cloud', label: 'Cloud Credentials', icon: Cloud },
  { id: 'organization', label: 'Organization', icon: Building },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
        <div className="flex gap-6">
          <nav className="w-48 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'cloud' && <CloudCredentialsTab />}
            {activeTab === 'organization' && <OrganizationTab />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'api' && <ApiKeysTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-500" />
          </div>
          <button className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
            Change Avatar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" defaultValue="John Doe" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" defaultValue="john@example.com" className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
      </div>
      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
    </div>
  )
}

function CloudCredentialsTab() {
  const [credentials, setCredentials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', provider: 'aws', access_key: '', secret_key: '', subscription_id: '', tenant_id: '', client_id: '', client_secret: '' })

  useEffect(() => {
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    try {
      const data = await api.getCredentials()
      setCredentials(data)
    } catch (error) {
      console.error('Failed to load credentials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createCredential({ ...formData, organization_id: 'default' })
      setShowForm(false)
      setFormData({ name: '', provider: 'aws', access_key: '', secret_key: '', subscription_id: '', tenant_id: '', client_id: '', client_secret: '' })
      loadCredentials()
    } catch (error) {
      alert('Failed to create credential')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential?')) return
    await api.deleteCredential(id)
    loadCredentials()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Cloud Credentials</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Credential
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select value={formData.provider} onChange={(e) => setFormData({...formData, provider: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
            </select>
          </div>
          {formData.provider === 'aws' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Key</label>
                <input value={formData.access_key} onChange={(e) => setFormData({...formData, access_key: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                <input type="password" value={formData.secret_key} onChange={(e) => setFormData({...formData, secret_key: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </>
          )}
          {formData.provider === 'azure' && (
            <>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Subscription ID</label><input value={formData.subscription_id} onChange={(e) => setFormData({...formData, subscription_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label><input value={formData.tenant_id} onChange={(e) => setFormData({...formData, tenant_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label><input value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label><input type="password" value={formData.client_secret} onChange={(e) => setFormData({...formData, client_secret: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            </>
          )}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {credentials.length === 0 ? (
        <p className="text-gray-500">No credentials added yet.</p>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred) => (
            <div key={cred.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Cloud className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{cred.name}</p>
                  <p className="text-sm text-gray-500">{cred.provider}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(cred.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OrganizationTab() {
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => { loadOrgs() }, [])

  const loadOrgs = async () => {
    try {
      const data = await api.getOrganizations()
      setOrgs(data)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createOrganization({ name })
      setShowForm(false)
      setName('')
      loadOrgs()
    } catch (error) {
      alert('Failed to create organization')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Organizations</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Organization
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-4 p-4 border rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Company" className="w-full px-3 py-2 border rounded-lg" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {orgs.length === 0 ? (
        <p className="text-gray-500">No organizations yet.</p>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="p-4 border rounded-lg">
              <p className="font-medium">{org.name}</p>
              <p className="text-sm text-gray-500">Tier: {org.tier}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BillingTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Billing</h2>
      <p className="text-gray-500">Billing settings coming soon.</p>
    </div>
  )
}

function ApiKeysTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">API Keys</h2>
      <p className="text-gray-500">API key management coming soon.</p>
    </div>
  )
}

function NotificationsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
      <p className="text-gray-500">Notification preferences coming soon.</p>
    </div>
  )
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Security</h2>
      <p className="text-gray-500">Security settings coming soon.</p>
    </div>
  )
}

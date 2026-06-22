'use client'

import { useState } from 'react'
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Calendar } from 'lucide-react'

type APIKey = {
  id: string
  name: string
  key: string
  created_at: string
  last_used: string | null
}

export default function APIKeysPage() {
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'Production API Key',
      key: 'adpilot_' + 'live_' + '1234567890abcdefghijk',
      created_at: '2024-01-15',
      last_used: '2024-01-20'
    }
  ])

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId)
    } else {
      newVisible.add(keyId)
    }
    setVisibleKeys(newVisible)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('API key copied to clipboard!')
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // TODO: Call API to create key
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newKey: APIKey = {
        id: Date.now().toString(),
        name: newKeyName,
        key: `adpilot_live_${Math.random().toString(36).substring(2)}`,
        created_at: new Date().toISOString().split('T')[0],
        last_used: null
      }
      
      setApiKeys([...apiKeys, newKey])
      setNewKeyName('')
      setShowCreateModal(false)
      alert('API key created successfully! Make sure to copy it now.')
    } catch (error) {
      alert('Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      // TODO: Call API to delete key
      await new Promise(resolve => setTimeout(resolve, 1000))
      setApiKeys(apiKeys.filter(k => k.id !== keyId))
      alert('API key deleted successfully')
    } catch (error) {
      alert('Failed to delete API key')
    } finally {
      setLoading(false)
    }
  }

  const maskKey = (key: string) => {
    return key.substring(0, 12) + '•'.repeat(20)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
          <p className="text-slate-400 mt-1">
            Manage API keys for programmatic access to your data.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
            <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No API Keys</h3>
            <p className="text-slate-400 mb-4">Create your first API key to get started.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
            >
              Create API Key
            </button>
          </div>
        ) : (
          apiKeys.map((key) => (
            <div key={key.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">{key.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Created {key.created_at}
                    </span>
                    {key.last_used && (
                      <span>Last used {key.last_used}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  disabled={loading}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-lg font-mono text-sm">
                <span className="flex-1 text-slate-300">
                  {visibleKeys.has(key.id) ? key.key : maskKey(key.key)}
                </span>
                <button
                  onClick={() => toggleKeyVisibility(key.id)}
                  className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400"
                >
                  {visibleKeys.has(key.id) ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => copyToClipboard(key.key)}
                  className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Documentation */}
      <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-2">Using API Keys</h3>
        <p className="text-sm text-slate-300 mb-4">
          Include your API key in the Authorization header of your requests:
        </p>
        <div className="p-4 bg-slate-900 rounded-lg font-mono text-sm text-slate-300">
          curl -H "Authorization: Bearer YOUR_API_KEY" \<br />
          &nbsp;&nbsp;https://api.adpilot.ai/v1/campaigns
        </div>
        <p className="text-xs text-slate-400 mt-4">
          ⚠️ Keep your API keys secure and never share them publicly. Treat them like passwords.
        </p>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Create API Key</h2>
            <form onSubmit={handleCreateKey}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API Key"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Choose a descriptive name to identify this key
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

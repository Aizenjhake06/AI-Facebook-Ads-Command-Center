'use client'

import { useState } from 'react'
import { Shield, Lock, Smartphone, Key } from 'lucide-react'

export default function SecurityPage() {
  const [loading, setLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  })

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.new !== passwordForm.confirm) {
      alert('New passwords do not match')
      return
    }

    if (passwordForm.new.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      // TODO: Call API to change password
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Password changed successfully!')
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (error) {
      alert('Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle2FA = async () => {
    setLoading(true)
    try {
      // TODO: Call API to toggle 2FA
      await new Promise(resolve => setTimeout(resolve, 1000))
      setTwoFactorEnabled(!twoFactorEnabled)
      alert(twoFactorEnabled ? '2FA disabled' : '2FA enabled successfully!')
    } catch (error) {
      alert('Failed to toggle 2FA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Security</h1>
        <p className="text-slate-400 mt-1">
          Manage your password and two-factor authentication.
        </p>
      </div>

      <div className="space-y-6">
        {/* Change Password */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Lock className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Change Password</h2>
              <p className="text-sm text-slate-400">Update your password regularly for better security</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
              />
              <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Smartphone className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-medium text-white">Two-Factor Authentication</h2>
              <p className="text-sm text-slate-400">Add an extra layer of security to your account</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              twoFactorEnabled 
                ? 'bg-green-500/10 text-green-400' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          <div className="mt-6">
            {twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400">
                    Two-factor authentication is currently enabled. You'll be asked for a code when signing in.
                  </p>
                </div>
                <button
                  onClick={handleToggle2FA}
                  disabled={loading}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Disable 2FA'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-400">
                    Enable two-factor authentication to secure your account with an authenticator app.
                  </p>
                </div>
                <button
                  onClick={handleToggle2FA}
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Enable 2FA'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Key className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Active Sessions</h2>
              <p className="text-sm text-slate-400">Manage devices where you're currently signed in</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="p-4 bg-slate-900/50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Current Session</p>
                <p className="text-sm text-slate-400">Windows • Chrome • Manila, Philippines</p>
                <p className="text-xs text-slate-500 mt-1">Active now</p>
              </div>
              <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

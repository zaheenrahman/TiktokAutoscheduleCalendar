import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { getProfiles, createProfile, deleteProfile, updateProfile } from '../api/videos'

export default function ProfileManager() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProfile, setNewProfile] = useState({
    name: '',
    cookies_filename: '',
    proxy: '',
  })

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
  })

  const createMutation = useMutation({
    mutationFn: createProfile,
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles'])
      setShowAddForm(false)
      setNewProfile({ name: '', cookies_filename: '', proxy: '' })
    },
    onError: (error) => {
      alert(error.response?.data?.detail || 'Failed to create profile')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles'])
    },
    onError: (error) => {
      alert(error.response?.data?.detail || 'Failed to delete profile')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => updateProfile(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles'])
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(newProfile)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              <User className="w-6 h-6 text-purple-600" />
              TikTok Profiles
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage multiple TikTok accounts with different cookies and proxies
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Profile
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profile Name *
              </label>
              <input
                type="text"
                value={newProfile.name}
                onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                placeholder="Main Account"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cookies Filename *
              </label>
              <input
                type="text"
                value={newProfile.cookies_filename}
                onChange={(e) => setNewProfile({ ...newProfile, cookies_filename: e.target.value })}
                placeholder="account1.txt"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                File must exist in <code className="bg-gray-200 px-1 rounded">backend/cookies/</code> directory
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proxy (Optional)
              </label>
              <input
                type="text"
                value={newProfile.proxy}
                onChange={(e) => setNewProfile({ ...newProfile, proxy: e.target.value })}
                placeholder="http://user:pass@host:port"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: <code className="bg-gray-200 px-1 rounded">http://user:pass@host:port</code>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isLoading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {createMutation.isLoading ? 'Creating...' : 'Create Profile'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Profiles List */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            Loading profiles...
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p>No profiles yet. Add one to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !profile.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {profile.name}
                      </h3>
                      {profile.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Cookies:</span>
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {profile.cookies_filename}
                        </code>
                      </div>
                      {profile.proxy && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Proxy:</span>
                          <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {profile.proxy}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        toggleActiveMutation.mutate({
                          id: profile.id,
                          is_active: !profile.is_active,
                        })
                      }
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title={profile.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {profile.is_active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete profile "${profile.name}"?`)) {
                          deleteMutation.mutate(profile.id)
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          📝 How to add cookies:
        </h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Export your TikTok cookies from browser (use EditThisCookie or similar)</li>
          <li>Save as <code className="bg-blue-100 px-1 rounded">account1.txt</code> in <code className="bg-blue-100 px-1 rounded">backend/cookies/</code></li>
          <li>Create a profile above with that filename</li>
          <li>Select the profile when scheduling videos</li>
        </ol>
      </div>
    </div>
  )
}


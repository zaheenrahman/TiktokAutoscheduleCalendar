import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { createSchedule, getVideos, getProfiles } from '../api/videos'

export default function ScheduleModal({ isOpen, onClose, video, initialDate }) {
  const queryClient = useQueryClient()

  const getDefaultDateTime = () => {
    const futureTime = new Date(Date.now() + 60 * 60 * 1000)
    return {
      date: futureTime.toISOString().slice(0, 10),
      time: futureTime.toTimeString().slice(0, 5),
    }
  }

  const [selectedVideoId, setSelectedVideoId] = useState(video?.id || '')
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [description, setDescription] = useState(video?.description || '')
  const [scheduledDate, setScheduledDate] = useState(() => getDefaultDateTime().date)
  const [scheduledTime, setScheduledTime] = useState(() => getDefaultDateTime().time)

  // Fetch videos if no video was pre-selected
  const { data: videos = [] } = useQuery({
    queryKey: ['videos'],
    queryFn: getVideos,
    enabled: !video,
  })

  // Fetch profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: getProfiles,
  })

  // Set initial values when modal opens - recalculate EVERY time
  useEffect(() => {
    if (isOpen) {
      // Reset video selection
      if (video) {
        setSelectedVideoId(video.id)
        setDescription(video.description || '')
      }
      
      // Always recalculate time (even if modal was opened before)
      if (initialDate) {
        const date = new Date(initialDate)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        
        setScheduledDate(`${year}-${month}-${day}`)
        setScheduledTime(`${hours}:${minutes}`)
      } else {
        const defaults = getDefaultDateTime()
        setScheduledDate(defaults.date)
        setScheduledTime(defaults.time)
      }
    }
  }, [isOpen, video, initialDate])

  // Create schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules'])
      queryClient.invalidateQueries(['videos'])
      onClose()
    },
  })

  // Post now mutation
  const postNowMutation = useMutation({
    mutationFn: async (data) => {
      // Create a schedule for 1 minute from now
      const now = new Date(Date.now() + 60 * 1000)
      const localPayload = `${now.toISOString().slice(0, 10)}T${now
        .toTimeString()
        .slice(0, 5)}:00`
      return createSchedule({
        ...data,
        scheduled_time: localPayload,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules'])
      queryClient.invalidateQueries(['videos'])
      onClose()
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!selectedProfileId) {
      alert('Please select a TikTok profile')
      return
    }
    
    // Send as simple datetime string (no conversion)
    const scheduledTimeValue = `${scheduledDate}T${scheduledTime}:00`
    
    scheduleMutation.mutate({
      video_id: parseInt(selectedVideoId),
      profile_id: parseInt(selectedProfileId),
      scheduled_time: scheduledTimeValue,
      description: description,
    })
  }

  const handlePostNow = (e) => {
    e.preventDefault()
    
    if (!selectedProfileId) {
      alert('Please select a TikTok profile')
      return
    }
    
    postNowMutation.mutate({
      video_id: parseInt(selectedVideoId),
      profile_id: parseInt(selectedProfileId),
      description: description,
    })
  }
  
  // Get timezone name
  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone

  const handleVideoChange = (e) => {
    const videoId = e.target.value
    setSelectedVideoId(videoId)
    
    const selectedVideo = videos.find(v => v.id === parseInt(videoId))
    if (selectedVideo) {
      setDescription(selectedVideo.description || '')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Schedule Upload
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Video Selection */}
          {!video && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Video
              </label>
              <select
                value={selectedVideoId}
                onChange={handleVideoChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Choose a video...</option>
                {videos.filter(v => !v.is_scheduled).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.filename}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Profile Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              TikTok Profile *
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">Choose a profile...</option>
              {profiles.filter(p => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {profiles.length === 0 && (
              <p className="text-xs text-red-600 mt-1">
                No profiles configured. Add a profile first.
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time ({timezoneName})
            </label>
            <input
              type="time"
              name="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Your local time
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={150}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Add your TikTok caption with #hashtags"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/150 characters
            </p>
          </div>

          {/* Error */}
          {scheduleMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              Failed to schedule: {scheduleMutation.error.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePostNow}
              disabled={postNowMutation.isPending || !selectedVideoId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {postNowMutation.isPending ? 'Posting...' : 'Post Now'}
            </button>
            <button
              type="submit"
              disabled={scheduleMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


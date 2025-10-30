import { useCallback, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { Upload, Trash2, Calendar, Video, CheckCircle, Clock, XCircle, X, Play } from 'lucide-react'
import { uploadVideo, getVideos, deleteVideo, getSchedules, deleteSchedule, API_BASE_URL } from '../api/videos'
import { format } from 'date-fns'

export default function VideoLibrary({ onScheduleClick }) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('unscheduled') // 'unscheduled' | 'scheduled'
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)

  // Fetch videos
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: getVideos,
  })

  // Fetch schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: getSchedules,
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadVideo,
    onSuccess: () => {
      queryClient.invalidateQueries(['videos'])
      setUploading(false)
    },
    onError: () => {
      setUploading(false)
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries(['videos'])
    },
  })

  // Delete schedule mutation (unschedule)
  const deleteScheduleMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules'])
      queryClient.invalidateQueries(['videos'])
    },
  })

  // Dropzone
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setUploading(true)
      uploadMutation.mutate(acceptedFiles[0])
    }
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    multiple: false,
  })

  const unscheduledVideos = videos.filter(v => !v.is_scheduled)
  const scheduledVideos = schedules.filter(s => s.status !== 'cancelled')

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
          <Video className="w-6 h-6 text-purple-600" />
          Video Library
        </h2>

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive 
              ? 'border-purple-500 bg-purple-50 scale-[1.02]' 
              : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          {uploading ? (
            <p className="text-sm text-gray-600 font-medium">Uploading...</p>
          ) : isDragActive ? (
            <p className="text-sm text-purple-600 font-medium">Drop video here</p>
          ) : (
            <>
              <p className="text-base text-gray-700 font-medium mb-1">
                Drag & drop a video here
              </p>
              <p className="text-sm text-gray-500">
                or click to browse (MP4, MOV, AVI, MKV)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('unscheduled')}
            className={`flex-1 px-6 py-4 font-semibold text-sm transition-all ${
              activeTab === 'unscheduled'
                ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Unscheduled ({unscheduledVideos.length})
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 px-6 py-4 font-semibold text-sm transition-all ${
              activeTab === 'scheduled'
                ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Scheduled ({scheduledVideos.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'unscheduled' ? (
            <UnscheduledVideosSection
              videos={unscheduledVideos}
              isLoading={isLoading}
              onSchedule={onScheduleClick}
              onDelete={(id) => deleteMutation.mutate(id)}
              onPlayVideo={(videoUrl) => {
                setSelectedVideo(videoUrl)
                setVideoModalOpen(true)
              }}
            />
          ) : (
            <ScheduledVideosSection
              schedules={scheduledVideos}
              onUnschedule={(id) => deleteScheduleMutation.mutate(id)}
              onPlayVideo={(videoUrl) => {
                setSelectedVideo(videoUrl)
                setVideoModalOpen(true)
              }}
            />
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {videoModalOpen && selectedVideo && (
        <VideoPlayerModal
          videoUrl={selectedVideo}
          onClose={() => {
            setVideoModalOpen(false)
            setSelectedVideo(null)
          }}
        />
      )}
    </div>
  )
}

function UnscheduledVideosSection({ videos, isLoading, onSchedule, onDelete, onPlayVideo }) {
  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        Loading videos...
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No videos yet. Upload one to get started!
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onSchedule={() => onSchedule(video, new Date())}
          onDelete={() => onDelete(video.id)}
          onPlay={() => onPlayVideo(`${API_BASE_URL}/uploads/${video.stored_filename}`)}
        />
      ))}
    </div>
  )
}

function ScheduledVideosSection({ schedules, onUnschedule, onPlayVideo }) {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No scheduled videos yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {schedules.map((schedule) => (
        <ScheduledVideoCard
          key={schedule.id}
          schedule={schedule}
          onUnschedule={() => onUnschedule(schedule.id)}
          onPlay={() => onPlayVideo(`${API_BASE_URL}${schedule.video_file_url}`)}
        />
      ))}
    </div>
  )
}

function VideoCard({ video, onSchedule, onDelete, onPlay }) {
  return (
    <div className="group border border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 hover:shadow-lg transition-all">
      <div className="relative bg-gray-900 h-48 flex items-center justify-center cursor-pointer" onClick={onPlay}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Play className="w-12 h-12 text-white opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
        <p className="absolute bottom-2 left-2 right-2 text-xs text-white font-medium truncate">
          {video.filename}
        </p>
      </div>
      
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500 line-clamp-2">
          {video.description}
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={onSchedule}
            className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            title="Schedule"
          >
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ScheduledVideoCard({ schedule, onUnschedule, onPlay }) {
  const videoUrl = schedule.video_file_url ? `${API_BASE_URL}${schedule.video_file_url}` : null
  const scheduledAt = new Date(schedule.scheduled_time)
  
  const statusConfig = {
    pending: { icon: Clock, color: 'text-green-600 bg-green-50', label: 'Pending' },
    uploading: { icon: Clock, color: 'text-blue-600 bg-blue-50', label: 'Uploading' },
    completed: { icon: CheckCircle, color: 'text-gray-600 bg-gray-50', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Failed' },
  }
  
  const config = statusConfig[schedule.status] || statusConfig.pending
  const StatusIcon = config.icon

  return (
    <div className="group border border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 hover:shadow-lg transition-all">
      {videoUrl && (
        <div className="relative bg-gray-900 h-48 flex items-center justify-center cursor-pointer" onClick={onPlay}>
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            muted
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-12 h-12 text-white" />
          </div>
        </div>
      )}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {schedule.video_filename}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {format(scheduledAt, 'PPp')}
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </div>
          <button
            onClick={onUnschedule}
            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            title="Unschedule"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-600 line-clamp-2">
          {schedule.description}
        </p>
      </div>
    </div>
  )
}

function VideoPlayerModal({ videoUrl, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8" onClick={onClose}>
      <div className="relative bg-black rounded-2xl shadow-2xl overflow-hidden" style={{ width: '450px', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors shadow-lg"
        >
          <X className="w-6 h-6" />
        </button>
        <video
          src={videoUrl}
          controls
          autoPlay
          className="w-full h-auto"
          style={{ aspectRatio: '9/16' }}
        />
      </div>
    </div>
  )
}


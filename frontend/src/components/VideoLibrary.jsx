import { useCallback, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { Upload, Trash2, Calendar, Video } from 'lucide-react'
import { uploadVideo, getVideos, deleteVideo } from '../api/videos'

export default function VideoLibrary({ onScheduleClick }) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)

  // Fetch videos
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: getVideos,
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Video className="w-5 h-5" />
        Video Library
      </h2>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        {uploading ? (
          <p className="text-sm text-gray-600">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-sm text-blue-600">Drop video here</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-1">
              Drag & drop a video here
            </p>
            <p className="text-xs text-gray-500">
              or click to browse
            </p>
          </>
        )}
      </div>

      {/* Videos Grid */}
      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          Unscheduled Videos ({unscheduledVideos.length})
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading videos...
          </div>
        ) : unscheduledVideos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No videos yet. Upload one to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {unscheduledVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSchedule={() => onScheduleClick(video, new Date())}
                onDelete={() => deleteMutation.mutate(video.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VideoCard({ video, onSchedule, onDelete }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {video.filename}
          </p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {video.description}
          </p>
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={onSchedule}
            className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Schedule"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}


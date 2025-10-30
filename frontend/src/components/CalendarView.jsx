import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { getSchedules, API_BASE_URL } from '../api/videos'
import { X, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

const locales = {
  'en-US': enUS
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

function CalendarEvent({ event }) {
  const timeLabel = format(event.start, 'p')
  const schedule = event.resource
  const videoUrl = schedule.video_file_url ? `${API_BASE_URL}${schedule.video_file_url}` : null
  
  const statusIcons = {
    completed: <CheckCircle className="w-5 h-5" />,
    pending: <Clock className="w-5 h-5" />,
    uploading: <Clock className="w-5 h-5 animate-pulse" />,
    failed: <XCircle className="w-5 h-5" />,
    cancelled: <AlertCircle className="w-5 h-5" />,
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex items-center gap-2.5">
        {statusIcons[schedule.status]}
        <div className="font-bold text-base truncate">{timeLabel}</div>
      </div>
      {videoUrl && (
        <div className="mt-auto -mx-3 -mb-3 rounded-lg overflow-hidden shadow-md">
          <video
            src={videoUrl}
            className="w-full h-28 object-cover"
            muted
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.target.play()}
            onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
          />
        </div>
      )}
    </div>
  )
}

const StatusBadge = ({ status, large = false }) => {
  const configs = {
    pending: { bg: 'bg-green-100', text: 'text-green-700', icon: Clock },
    uploading: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
    completed: { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    cancelled: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle },
  }

  const config = configs[status] || configs.pending
  const Icon = config.icon
  const sizeClass = large ? 'px-4 py-2 text-sm' : 'px-2 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded ${config.bg} ${config.text} ${sizeClass}`}>
      <Icon className={large ? 'w-4 h-4' : 'w-3 h-3'} />
      {status.toUpperCase()}
    </span>
  )
}

const ScheduleDetailsModal = ({ schedule, onClose }) => {
  if (!schedule) return null

  const scheduledAt = new Date(schedule.scheduled_time)
  const uploadedAt = schedule.uploaded_at ? new Date(schedule.uploaded_at) : null
  const videoUrl = schedule.video_file_url ? `${API_BASE_URL}${schedule.video_file_url}` : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-2xl font-bold text-gray-900 truncate">
              {schedule.video_filename}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Scheduled for {format(scheduledAt, 'PPpp')}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={schedule.status} large />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Video Preview */}
          {videoUrl && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Video Preview</h3>
              <video
                src={videoUrl}
                controls
                className="w-full rounded-lg shadow-sm border border-gray-200"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {schedule.description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 mb-1">Scheduled Time</div>
              <div className="text-sm font-semibold text-gray-900">
                {format(scheduledAt, 'PPpp')}
              </div>
            </div>
            {uploadedAt && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs font-medium text-gray-500 mb-1">Uploaded At</div>
                <div className="text-sm font-semibold text-gray-900">
                  {format(uploadedAt, 'PPpp')}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {schedule.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900 mb-1">Error Details</h3>
                  <p className="text-sm text-red-700 font-mono break-all">
                    {schedule.error_message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CalendarView({ onDateSelect }) {
  const [selectedSchedule, setSelectedSchedule] = useState(null)

  // Fetch schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: getSchedules,
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  // Convert schedules to calendar events (convert UTC to local time)
  const events = useMemo(() => {
    return schedules.map((schedule) => {
      const scheduledTime = new Date(schedule.scheduled_time)
      return {
        id: schedule.id,
        title: schedule.video_filename,
        start: scheduledTime,
        end: scheduledTime,
        resource: schedule,
      }
    })
  }, [schedules])

  // Event style based on status
  const eventStyleGetter = (event) => {
    const status = event.resource.status
    const colors = {
      pending: { backgroundColor: '#10b981', borderColor: '#059669' },
      uploading: { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
      completed: { backgroundColor: '#6b7280', borderColor: '#4b5563' },
      failed: { backgroundColor: '#ef4444', borderColor: '#dc2626' },
      cancelled: { backgroundColor: '#9ca3af', borderColor: '#6b7280' },
    }

    return {
      style: {
        ...colors[status],
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact status legend header */}
      <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-white/20 p-4 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Your Schedule
          </h2>
          
          {/* Status Legend */}
          <div className="flex gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-green-700 font-medium">Pending</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-blue-700 font-medium">Uploading</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span className="text-gray-700 font-medium">Completed</span>
            </div>
            <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-red-700 font-medium">Failed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar - takes remaining space */}
      <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          eventPropGetter={eventStyleGetter}
          onSelectSlot={(slotInfo) => {
            setSelectedSchedule(null)
            onDateSelect(slotInfo.start)
          }}
          onSelectEvent={(event) => setSelectedSchedule(event.resource)}
          selectable
          views={['month', 'week', 'day']}
          defaultView="month"
          components={{
            event: CalendarEvent,
          }}
          style={{ height: '100%' }}
        />
      </div>

      <ScheduleDetailsModal
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
      />
    </div>
  )
}


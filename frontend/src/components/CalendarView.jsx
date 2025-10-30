import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { getSchedules, API_BASE_URL } from '../api/videos'

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
  return (
    <span>
      <strong>{timeLabel}</strong> — {event.title}
    </span>
  )
}

const StatusBadge = ({ status }) => {
  const map = {
    pending: 'bg-green-100 text-green-700',
    uploading: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.toUpperCase()}
    </span>
  )
}

const ScheduleDetails = ({ schedule, onClose }) => {
  if (!schedule) return null

  const scheduledAt = new Date(schedule.scheduled_time)
  const uploadedAt = schedule.uploaded_at ? new Date(schedule.uploaded_at) : null
  const videoUrl = schedule.video_file_url ? `${API_BASE_URL}${schedule.video_file_url}` : null

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {schedule.video_filename}
          </h3>
          <p className="text-sm text-gray-500">
            Scheduled for {format(scheduledAt, 'PPpp')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={schedule.status} />
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {videoUrl && (
          <div>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg border border-gray-200"
            />
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-gray-700">Description</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
            {schedule.description || '—'}
          </p>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          {uploadedAt && (
            <p>
              <span className="font-medium text-gray-700">Uploaded:</span>
              {' '}
              {format(uploadedAt, 'PPpp')}
            </p>
          )}
          {schedule.error_message && (
            <p className="text-red-600">
              <span className="font-medium">Last error:</span>
              {' '}
              {schedule.error_message}
            </p>
          )}
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          📅 Upload Schedule
        </h2>
        
        {/* Status Legend */}
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-gray-600">Uploading</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-500"></div>
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-gray-600">Failed</span>
          </div>
        </div>
      </div>

      <div style={{ height: 600 }}>
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
        />
      </div>

      <ScheduleDetails
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
      />
    </div>
  )
}


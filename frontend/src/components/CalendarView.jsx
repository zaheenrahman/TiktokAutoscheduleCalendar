import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { getSchedules } from '../api/videos'

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

export default function CalendarView({ onDateSelect }) {
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
          onSelectSlot={(slotInfo) => onDateSelect(slotInfo.start)}
          selectable
          views={['month', 'week', 'day']}
          defaultView="month"
          components={{
            event: CalendarEvent,
          }}
        />
      </div>
    </div>
  )
}


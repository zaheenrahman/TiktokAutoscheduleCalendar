import { useState } from 'react'
import VideoLibrary from './components/VideoLibrary'
import CalendarView from './components/CalendarView'
import ScheduleModal from './components/ScheduleModal'

function App() {
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleScheduleClick = (video, date) => {
    setSelectedVideo(video)
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">
            📱 TikTok Scheduler
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload videos, schedule posts, automate your content
          </p>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Library - Left side */}
          <div className="lg:col-span-1">
            <VideoLibrary onScheduleClick={handleScheduleClick} />
          </div>

          {/* Calendar - Right side */}
          <div className="lg:col-span-2">
            <CalendarView onDateSelect={(date) => handleScheduleClick(null, date)} />
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        video={selectedVideo}
        initialDate={selectedDate}
      />
    </div>
  )
}

export default App


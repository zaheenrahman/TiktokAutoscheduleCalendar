import { useState } from 'react'
import { Calendar, Upload } from 'lucide-react'
import VideoLibrary from './components/VideoLibrary'
import CalendarView from './components/CalendarView'
import ScheduleModal from './components/ScheduleModal'

function App() {
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('calendar') // 'calendar' | 'uploads'

  const handleScheduleClick = (video, date) => {
    setSelectedVideo(video)
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50 overflow-hidden">
      {/* Top Nav */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm z-10">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">📱</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                TikTok Scheduler
              </h1>
              <p className="text-sm text-gray-500">
                Automate your content
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('uploads')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all ${
                activeTab === 'uploads'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="w-5 h-5" />
              Uploads
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Fullscreen */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'calendar' ? (
          <div className="h-full p-8">
            <CalendarView onDateSelect={(date) => handleScheduleClick(null, date)} />
          </div>
        ) : (
          <div className="h-full p-8 overflow-auto">
            <div className="max-w-5xl mx-auto">
              <VideoLibrary onScheduleClick={handleScheduleClick} />
            </div>
          </div>
        )}
      </main>

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


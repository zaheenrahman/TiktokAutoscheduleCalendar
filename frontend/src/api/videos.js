import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Videos
export const uploadVideo = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await api.post('/videos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const getVideos = async () => {
  const response = await api.get('/videos')
  return response.data
}

export const getVideo = async (id) => {
  const response = await api.get(`/videos/${id}`)
  return response.data
}

export const deleteVideo = async (id) => {
  const response = await api.delete(`/videos/${id}`)
  return response.data
}

// Schedules
export const createSchedule = async (data) => {
  const response = await api.post('/schedules', data)
  return response.data
}

export const getSchedules = async () => {
  const response = await api.get('/schedules')
  return response.data
}

export const updateSchedule = async (id, data) => {
  const response = await api.patch(`/schedules/${id}`, data)
  return response.data
}

export const deleteSchedule = async (id) => {
  const response = await api.delete(`/schedules/${id}`)
  return response.data
}


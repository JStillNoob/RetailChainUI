import axios, { type AxiosInstance } from 'axios'
import router from '@/router'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api`
    : 'https://retailchain-api-2384.azurewebsites.net/api',
})

// Attach JWT token automatically to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global response error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      // Token expired or invalid — clear session and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    } else if (status === 402) {
      // Subscription required / expired
      router.push('/dashboard/billing')
    }
    // 400, 404, 500 — bubble up so each call site can handle with a toast
    return Promise.reject(error)
  },
)

export default api

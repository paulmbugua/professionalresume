import axios, { AxiosResponse } from 'axios'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import ShopContextProvider from '@mytutorapp/shared/context/ShopContext'
import { ChatProvider } from '@mytutorapp/shared/context/ChatContext'
import { ErrorBoundary } from 'react-error-boundary'

// ─── React Query Setup ───────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
// ────────────────────────────────────────────────────────────────────────────────

// ─── Silence browser alerts & swallow backend errors in production ──────────────
if (import.meta.env.PROD) {
  window.alert = () => {}
  axios.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: any) => {
      console.log('🔇 Suppressed backend error:', error)
      return Promise.reject(error)
    }
  )
}

function Fallback() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        color: '#333',
      }}
    >
      <h1>Something went wrong.</h1>
      <p>Please try refreshing the page.</p>
    </div>
  )
}

const backendUrl = import.meta.env.VITE_BACKEND_URL

const storage = {
  getItem: async (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: async (key: string, value: string) => {
    localStorage.setItem(key, value)
    return Promise.resolve()
  },
  removeItem: async (key: string) => {
    localStorage.removeItem(key)
    return Promise.resolve()
  },
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found')
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary FallbackComponent={Fallback}>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <ShopContextProvider backendUrl={backendUrl} storage={storage}>
              <ChatProvider>
                <App />
              </ChatProvider>
            </ShopContextProvider>

            {/* Devtools only in development */}
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </QueryClientProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  )
}

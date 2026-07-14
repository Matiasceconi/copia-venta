import React from 'react'
import ReactDOM from 'react-dom/client'
import moment from 'moment'
import 'moment/locale/es'
import App from '@/App.jsx'
import '@/index.css'

moment.locale('es')

const JSON_STORAGE_KEYS = [
  'admin_seasons',
  'admin_categories',
  'admin_positions',
  'catapult_matches',
  'schedule_events_v1',
  'gps_column_templates_v1',
]

for (const key of JSON_STORAGE_KEYS) {
  const value = localStorage.getItem(key)
  if (value) {
    try {
      JSON.parse(value)
    } catch {
      localStorage.removeItem(key)
    }
  }
}

function isEmptyJsonParseError(error) {
  return error instanceof SyntaxError && error.message === 'Unexpected end of input'
}

window.addEventListener('unhandledrejection', (event) => {
  if (isEmptyJsonParseError(event.reason)) {
    event.preventDefault()
  }
})

window.addEventListener('error', (event) => {
  if (isEmptyJsonParseError(event.error)) {
    event.preventDefault()
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
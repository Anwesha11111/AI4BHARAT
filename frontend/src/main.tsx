import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const App = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
        TenderMind
      </h1>
      <p className="text-xl text-gray-400 max-w-2xl text-center">
        AI-Powered Co-Pilot for Government Procurement Evaluation.
      </p>
      <div className="mt-8 p-6 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <p className="text-sm font-mono text-emerald-400">System Status: Online</p>
        <p className="text-sm font-mono text-blue-400 mt-2">Phase 1: Project Setup Complete</p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import { useState, useEffect, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import GeminiChat from './components/GeminiChat'
import CitizenPortal from './components/CitizenPortal'
import OfficerDashboard from './components/OfficerDashboard'
import ImpactCounter from './components/ImpactCounter'
import AlertPanel from './components/AlertPanel'
import MedicalWaste from './components/MedicalWaste'
import Analytics from './components/Analytics'
import Tooltip from './components/Tooltip'
import MapView from './components/MapView'
import LoginPage from './components/LoginPage'
import Predictions from './components/Predictions'
import CertificateGenerator from './components/CertificateGenerator'
import Leaderboard from './components/Leaderboard'

const NAV = [
  { id: 'overview',     icon: '🏠',  label: 'Overview'       },
  { id: 'inventory',    icon: '📦',  label: 'Inventory'      },
  { id: 'predictions',  icon: '🔮',  label: 'Predictions'    },
  { id: 'analytics',    icon: '📊',  label: 'Analytics'      },
  { id: 'map',          icon: '🗺️', label: 'Live Map'       },
  { id: 'chat',         icon: '🤖',  label: 'AI Assistant'   },
  { id: 'reports',      icon: '📱',  label: 'Citizen Reports'},
  { id: 'officer',      icon: '🏛️', label: 'Officer View'   },
  { id: 'medical',      icon: '🏥',  label: 'Medical Waste', divider: true },
]

// ── Push notification helper ──────────────────────────────────────────────────
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

function sendNotification(title, body, icon = '🌿') {
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.svg', tag: title })
}

function checkExpiryAlerts(stores) {
  stores.forEach(store => {
    store.items.forEach(item => {
      if (item.expiry_days <= 1) {
        sendNotification(
          `🔴 URGENT: ${item.name} expiring TODAY`,
          `${item.quantity_kg}kg at ${store.name} — immediate action needed`
        )
      } else if (item.expiry_days <= 3) {
        sendNotification(
          `⚠️ ${item.name} expiring in ${item.expiry_days} days`,
          `${item.quantity_kg}kg at ${store.name}`
        )
      }
    })
  })
}

// ── Dark mode persistence ─────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('wg_dark') === 'true')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('wg_dark', dark)
  }, [dark])

  const toggle = useCallback(() => setDark(d => !d), [])
  return [dark, toggle]
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [page, setPage]           = useState('overview')
  const [stores, setStores]       = useState([])
  const [ngos, setNgos]           = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifEnabled, setNotifEnabled] = useState(Notification?.permission === 'granted')
  const [dark, toggleDark]        = useDarkMode()

  // Check for existing auth on mount
  useEffect(() => {
    const auth = localStorage.getItem('wg_auth')
    if (auth) {
      try {
        const { username } = JSON.parse(auth)
        setIsAuthenticated(true)
        setCurrentUser(username)
      } catch {}
    }
  }, [])

  const handleLogin = (username) => {
    setIsAuthenticated(true)
    setCurrentUser(username)
  }

  const handleLogout = () => {
    localStorage.removeItem('wg_auth')
    setIsAuthenticated(false)
    setCurrentUser(null)
    setPage('overview')
  }

  useEffect(() => {
    fetch('/api/stores')
      .then(r => r.json())
      .then(data => {
        setStores(data.stores || [])
        setNgos(data.ngos || [])
      })
      .catch(() =>
        fetch('/mock_stores.json')
          .then(r => r.json())
          .then(data => { setStores(data.stores || []); setNgos(data.ngos || []) })
          .catch(() => {})
      )
  }, [])

  // Fire expiry alerts once stores load (only if permission granted)
  useEffect(() => {
    if (stores.length && notifEnabled) checkExpiryAlerts(stores)
  }, [stores, notifEnabled])

  const enableNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission()
    setNotifEnabled(granted)
    if (granted && stores.length) checkExpiryAlerts(stores)
  }, [stores])

  const renderPage = () => {
    switch (page) {
      case 'overview':    return (
        <div className="space-y-6">
          <ImpactCounter stores={stores} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CertificateGenerator stores={stores} username={currentUser} />
            <Leaderboard stores={stores} />
          </div>
          <AlertPanel stores={stores} />
        </div>
      )
      case 'inventory':   return <Dashboard stores={stores} ngos={ngos} />
      case 'predictions': return <Predictions stores={stores} />
      case 'analytics':   return <Analytics stores={stores} />
      case 'chat':      return <GeminiChat />
      case 'reports':   return <CitizenPortal stores={stores} />
      case 'officer':   return <OfficerDashboard stores={stores} />
      case 'map':       return <MapView stores={stores} />
      case 'medical':   return <MedicalWaste />
      default:          return null
    }
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      {/* ── Sidebar ── */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-green-900 dark:bg-gray-950 text-white flex flex-col transition-all duration-200 shrink-0`}>
        {/* Logo with tooltip */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-green-800 dark:border-gray-800">
          <Tooltip text="WasteGuard AI - PDS Intelligence System">
            <span className="text-2xl cursor-help">🌿</span>
          </Tooltip>
          {sidebarOpen && (
            <div>
              <p className="font-bold text-sm leading-tight">WasteGuard</p>
              <p className="text-green-400 dark:text-gray-400 text-xs">AI · PDS India</p>
            </div>
          )}
          <Tooltip text={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} position="right">
            <button onClick={() => setSidebarOpen(o => !o)}
              className="ml-auto text-green-400 hover:text-white text-lg leading-none">
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </Tooltip>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {NAV.map(({ id, icon, label, divider }) => (
            <div key={id}>
              {divider && sidebarOpen && (
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <div className="flex-1 h-px bg-green-800 dark:bg-gray-700" />
                  <span className="text-green-600 dark:text-gray-500 text-xs">Medical</span>
                  <div className="flex-1 h-px bg-green-800 dark:bg-gray-700" />
                </div>
              )}
              {divider && !sidebarOpen && <div className="h-px bg-green-800 dark:bg-gray-700 mx-2 my-2" />}
              <Tooltip text={label} position="right">
                <button onClick={() => setPage(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    page === id
                      ? id === 'medical' ? 'bg-blue-700 text-white' : 'bg-green-700 dark:bg-green-800 text-white'
                      : 'text-green-200 dark:text-gray-400 hover:bg-green-800 dark:hover:bg-gray-800 hover:text-white'
                  }`}>
                  <span className="text-base shrink-0">{icon}</span>
                  {sidebarOpen && <span>{label}</span>}
                </button>
              </Tooltip>
            </div>
          ))}
        </nav>

        {/* Sidebar footer — dark mode + notifications */}
        <div className={`border-t border-green-800 dark:border-gray-800 p-3 space-y-2 ${sidebarOpen ? '' : 'flex flex-col items-center'}`}>
          {/* Dark mode toggle */}
          <Tooltip text={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} position="right">
            <button onClick={toggleDark}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-green-300 dark:text-gray-400 hover:bg-green-800 dark:hover:bg-gray-800 hover:text-white transition-colors text-xs font-medium">
              <span className="text-base shrink-0">{dark ? '☀️' : '🌙'}</span>
              {sidebarOpen && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
          </Tooltip>

          {/* Notification toggle */}
          <Tooltip text={notifEnabled ? 'Alerts enabled' : 'Enable notifications'} position="right">
            <button onClick={enableNotifications}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-xs font-medium ${
                notifEnabled
                  ? 'text-green-300 dark:text-green-500 hover:bg-green-800 dark:hover:bg-gray-800'
                  : 'text-yellow-300 dark:text-yellow-500 hover:bg-green-800 dark:hover:bg-gray-800'
              } hover:text-white`}>
              <span className="text-base shrink-0">{notifEnabled ? '🔔' : '🔕'}</span>
              {sidebarOpen && <span>{notifEnabled ? 'Alerts On' : 'Enable Alerts'}</span>}
            </button>
          </Tooltip>

          {sidebarOpen && (
            <div className="pt-1">
              <p className="text-xs text-green-500 dark:text-gray-600">Bengaluru PDS Network</p>
              <p className="text-xs text-green-600 dark:text-gray-700">v2.0 · Hackathon Demo</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                WasteGuard AI – PDS Intelligence System
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {NAV.find(n => n.id === page)?.icon} {NAV.find(n => n.id === page)?.label} · Bengaluru PDS Network
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Live · {stores.length} stores</span>
              </div>
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">👤 {currentUser}</span>
                <button onClick={handleLogout}
                  className="text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold px-2.5 py-1 rounded-lg transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

import { Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { useAuth } from './hooks/useAuth'
import { InventoryPage } from './pages/InventoryPage'
import { LoginPage } from './pages/LoginPage'
import { SalesPage } from './pages/SalesPage'

function App() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <LoginPage />

  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<InventoryPage />} />
          <Route path="/sales" element={<SalesPage />} />
        </Routes>
      </main>
    </>
  )
}

export default App

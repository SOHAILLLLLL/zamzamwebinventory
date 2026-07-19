import { Route, Routes } from 'react-router-dom'
import { CarUploadStatusBar } from './components/CarUploadStatusBar'
import { Navbar } from './components/Navbar'
import { useAuth } from './hooks/useAuth'
import { CarDetailPage } from './pages/CarDetailPage'
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
          <Route path="/cars/:id" element={<CarDetailPage />} />
          <Route path="/sales" element={<SalesPage />} />
        </Routes>
      </main>
      <CarUploadStatusBar />
    </>
  )
}

export default App

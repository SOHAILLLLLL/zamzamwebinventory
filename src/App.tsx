import { Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { useAuth } from './hooks/useAuth'
import { InventoryPage } from './pages/InventoryPage'
import { ItemDetailPage } from './pages/ItemDetailPage'
import { LoginPage } from './pages/LoginPage'
import { ReplacementsPage } from './pages/ReplacementsPage'
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
          <Route path="/items/:sku" element={<ItemDetailPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/replacements" element={<ReplacementsPage />} />
        </Routes>
      </main>
    </>
  )
}

export default App

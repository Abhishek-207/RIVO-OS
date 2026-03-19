import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 10 * 60 * 1000,   // 10 min: keep unused data in cache longer
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: window.localStorage,
  key: 'rivo-query-cache',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // Discard persisted cache older than 24 hours
        buster: '', // Change this to bust cache on breaking API changes (if API Response Structure changes)
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)

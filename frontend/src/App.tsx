import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { AppStateProvider } from '@/context/AppState'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { AboutPage } from '@/pages/AboutPage'
import { AlertDetailPage } from '@/pages/AlertDetailPage'
import { AlertsPage } from '@/pages/AlertsPage'
import { EntityPage } from '@/pages/EntityPage'
import { GraphPage } from '@/pages/GraphPage'
import { IngestPage } from '@/pages/IngestPage'
import { OverviewPage } from '@/pages/OverviewPage'

export default function App() {
  return (
    <ThemeProvider>
      <AppStateProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/ingest" element={<IngestPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/alerts/:id" element={<AlertDetailPage />} />
                <Route path="/graph" element={<GraphPage />} />
                <Route path="/entities/:id" element={<EntityPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </AppStateProvider>
    </ThemeProvider>
  )
}

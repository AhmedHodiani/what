import { Route } from 'react-router-dom'

import { Router } from 'lib/electron-router-dom'

import { MainScreenWithTabs } from './screens/main-with-tabs'

export function AppRoutes() {
  return <Router main={<Route element={<MainScreenWithTabs />} path="/" />} />
}

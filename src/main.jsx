import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DashboardDataProvider } from './data/mockData.jsx'
import { FilterProvider } from './contexts/FilterContext.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <FilterProvider>
            <DashboardDataProvider>
                <App />
            </DashboardDataProvider>
        </FilterProvider>
    </StrictMode>,
)

// Real-time data context cho dashboard
// Data sẽ được fetch từ Supabase và auto-refresh mỗi 15s

import { createContext, useContext } from 'react'
import { useSupabaseView } from '../hooks/useSupabase'



const DashboardDataContext = createContext(null)

export const DashboardDataProvider = ({ children }) => {
    // Fetch all dashboard views
    // Fetch all dashboard views
    const pipelineStages = useSupabaseView('v_pipeline_stages')
    const topPerformersHeatmap = useSupabaseView('v_top_performers_heatmap')
    const topPerformersList = useSupabaseView('v_top_performers_list')
    const financialData = useSupabaseView('v_financial_data')
    const salesChannels = useSupabaseView('v_sales_channels')
    const productLines = useSupabaseView('v_product_lines')
    const productTypes = useSupabaseView('v_product_types')
    const salesQuantity = useSupabaseView('v_sales_quantity')

    // Transform financial data for PYP Performance (KPIs)
    const pypPerformance = {
        data: financialData.data?.map(item => ({
            month: item.month,
            actual: Number(item.revenue),
            target: Math.round(Number(item.revenue) * 1.2) // Fake target logic: 120% of actual
        })) || [],
        loading: financialData.loading,
        error: financialData.error
    }

    const value = {
        pypPerformance,
        pipelineStages,
        topPerformersHeatmap,
        topPerformersList,
        financialData,
        salesChannels,
        productLines,
        productTypes,
        salesQuantity
    }

    return (
        <DashboardDataContext.Provider value={value}>
            {children}
        </DashboardDataContext.Provider>
    )
}

export const useDashboardData = () => {
    const context = useContext(DashboardDataContext)
    if (!context) {
        throw new Error('useDashboardData must be used within DashboardDataProvider')
    }
    return context
}

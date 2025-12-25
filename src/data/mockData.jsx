// Real-time data context cho dashboard
// Data sẽ được fetch từ Supabase và auto-refresh mỗi 15s

import { createContext, useContext, useMemo } from 'react'
import { useSupabaseView } from '../hooks/useSupabase'
import { useFilter } from '../contexts/FilterContext'

const DashboardDataContext = createContext(null)

// Helper to aggregate data when showing full year
const aggregateData = (data, groupKey, sumKeys) => {
    if (!data) return [];
    const map = new Map();
    data.forEach(item => {
        const key = item[groupKey];
        if (!map.has(key)) {
            map.set(key, { ...item });
        } else {
            const entry = map.get(key);
            sumKeys.forEach(k => {
                entry[k] = (Number(entry[k]) || 0) + (Number(item[k]) || 0);
            });
        }
    });
    return Array.from(map.values());
};

export const DashboardDataProvider = ({ children }) => {
    const { filters } = useFilter();

    // Trend views: Always show all months for the selected year
    const trendFilters = { year: filters.year, month: 'all' };
    // Snapshot views: Show specific month OR aggregate all months
    const snapshotFilters = filters;

    const pipelineStagesRaw = useSupabaseView('v_pipeline_stages', snapshotFilters);
    const topPerformersHeatmapRaw = useSupabaseView('v_top_performers_heatmap', snapshotFilters);
    const topPerformersListRaw = useSupabaseView('v_top_performers_list', snapshotFilters);
    const financialData = useSupabaseView('v_financial_data', trendFilters);
    const salesChannelsRaw = useSupabaseView('v_sales_channels', snapshotFilters);
    const productLinesRaw = useSupabaseView('v_product_lines', snapshotFilters);
    const productTypesRaw = useSupabaseView('v_product_types', snapshotFilters);
    const salesQuantityRaw = useSupabaseView('v_sales_quantity', snapshotFilters);

    // Process Snapshot Data (Aggregate if month == 'all')
    const isFullYear = filters.month === 'all';

    // Helper to process data based on filters
    const processData = (rawData, groupKey, sumKeys) => {
        if (!rawData) return [];

        if (isFullYear) {
            return aggregateData(rawData, groupKey, sumKeys);
        }

        // Defensive filtering: Ensure we only have data for the selected month
        // This protects against race conditions where the API might return "All Year" data 
        // but the filter context has switched to a specific month.
        return rawData.filter(item => item.month === Number(filters.month));
    };

    const pipelineStages = {
        ...pipelineStagesRaw,
        data: isFullYear
            ? (() => {
                if (!pipelineStagesRaw.data || pipelineStagesRaw.data.length === 0) return [];
                const maxMonth = Math.max(...pipelineStagesRaw.data.map(d => d.month));
                return pipelineStagesRaw.data.filter(d => d.month === maxMonth);
            })()
            : (pipelineStagesRaw.data || []).filter(d => d.month === Number(filters.month))
    };

    const topPerformersHeatmap = {
        ...topPerformersHeatmapRaw,
        data: processData(topPerformersHeatmapRaw.data, 'name', ['revenue', 'activities_count', 'leads_count'])
    };

    const topPerformersList = {
        ...topPerformersListRaw,
        data: isFullYear
            ? aggregateData(topPerformersListRaw.data, 'name', ['revenue'])
                .sort((a, b) => b.revenue - a.revenue)
                .map((item, index) => ({ ...item, rank: index + 1 }))
            : (topPerformersListRaw.data || []).filter(d => d.month === Number(filters.month))
    };

    const salesChannels = {
        ...salesChannelsRaw,
        data: processData(salesChannelsRaw.data, 'channel', ['value'])
    };

    const productLines = {
        ...productLinesRaw,
        data: processData(productLinesRaw.data, 'name', ['revenue', 'target'])
    };

    const productTypes = {
        ...productTypesRaw,
        data: processData(productTypesRaw.data, 'name', ['revenue', 'target'])
    };

    const salesQuantity = {
        ...salesQuantityRaw,
        data: processData(salesQuantityRaw.data, 'type', ['sold', 'target'])
    };


    // Transform financial data for PYP Performance (KPIs)
    // We use trendFilters (all months) so we can show the chart
    const pypPerformance = {
        data: financialData.data
            ?.sort((a, b) => a.month - b.month)
            .map(item => ({
                month: item.month,
                actual: Number(item.revenue),
                target: Math.round(Number(item.revenue) * 1.2) // Fake target logic
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

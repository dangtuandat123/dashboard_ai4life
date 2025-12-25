import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Custom hook to fetch data from Supabase with auto-refresh and filtering
 * @param {string} viewName - Name of the Supabase view to query
 * @param {Object} filters - Filter object { year, month }
 * @param {number} refreshInterval - Refresh interval in milliseconds (default: 15000 = 15s)
 * @returns {Object} { data, loading, error, refetch }
 */
export const useSupabaseView = (viewName, filters = {}, refreshInterval = 15000) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = async () => {
        try {
            setLoading(true)
            let query = supabase.from(viewName).select('*')

            // Apply filters
            if (filters.year) {
                query = query.eq('year', filters.year)
            }
            if (filters.month && filters.month !== 'all') {
                query = query.eq('month', filters.month)
            }

            const { data: result, error: fetchError } = await query

            if (fetchError) throw fetchError

            setData(result)
            setError(null)
        } catch (err) {
            console.error(`Error fetching ${viewName}:`, err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let ignore = false;

        const fetchData = async () => {
            try {
                setLoading(true)
                let query = supabase.from(viewName).select('*')

                // Apply filters
                if (filters.year) {
                    query = query.eq('year', filters.year)
                }
                if (filters.month && filters.month !== 'all') {
                    query = query.eq('month', filters.month)
                }

                const { data: result, error: fetchError } = await query

                if (ignore) return; // Ignore if component unmounted or dependencies changed

                if (fetchError) throw fetchError

                setData(result)
                setError(null)
            } catch (err) {
                if (ignore) return;
                console.error(`Error fetching ${viewName}:`, err)
                setError(err.message)
            } finally {
                if (!ignore) {
                    setLoading(false)
                }
            }
        }

        // Initial fetch
        fetchData()

        // Set up auto-refresh
        const intervalId = setInterval(() => {
            fetchData()
        }, refreshInterval)

        // Cleanup
        return () => {
            ignore = true;
            clearInterval(intervalId)
        }
    }, [viewName, refreshInterval, JSON.stringify(filters)])

    return { data, loading, error, refetch: fetchData }
}

/**
 * Custom hook to fetch data with custom query
 * @param {Function} queryFn - Function that returns a Supabase query
 * @param {number} refreshInterval - Refresh interval in milliseconds
 * @returns {Object} { data, loading, error, refetch }
 */
export const useSupabaseQuery = (queryFn, refreshInterval = 15000) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = async () => {
        try {
            setLoading(true)
            const { data: result, error: fetchError } = await queryFn()

            if (fetchError) throw fetchError

            setData(result)
            setError(null)
        } catch (err) {
            console.error('Error fetching data:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()

        const intervalId = setInterval(() => {
            fetchData()
        }, refreshInterval)

        return () => clearInterval(intervalId)
    }, [refreshInterval])

    return { data, loading, error, refetch: fetchData }
}

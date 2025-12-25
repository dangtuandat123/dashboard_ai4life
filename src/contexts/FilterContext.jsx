import React, { createContext, useContext, useState } from 'react';

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
    const currentYear = new Date().getFullYear();
    const [filters, setFilters] = useState({
        year: currentYear,
        month: 'all' // 'all' or 1-12
    });

    const setYear = (year) => setFilters(prev => ({ ...prev, year: Number(year) }));
    const setMonth = (month) => setFilters(prev => ({ ...prev, month: month === 'all' ? 'all' : Number(month) }));

    return (
        <FilterContext.Provider value={{ filters, setYear, setMonth }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilter = () => {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useFilter must be used within a FilterProvider');
    }
    return context;
};

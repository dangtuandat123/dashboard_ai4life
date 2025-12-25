import React from 'react';
import { Calendar, Filter } from 'lucide-react';
import { useFilter } from '../contexts/FilterContext';

const DashboardFilter = () => {
    const { filters, setYear, setMonth } = useFilter();
    const currentYear = new Date().getFullYear();
    const years = [2023, 2024, 2025]; // Fixed range based on available data
    const months = [
        { value: 'all', label: 'Cả năm' },
        ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
    ];

    return (
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
            <div className="px-2 py-1 flex items-center gap-2 text-slate-400 border-r border-white/10">
                <Filter size={14} />
                <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline">Bộ lọc</span>
            </div>

            <div className="flex items-center gap-2">
                {/* Year Selector */}
                <div className="relative group">
                    <select
                        value={filters.year}
                        onChange={(e) => setYear(e.target.value)}
                        className="appearance-none bg-transparent text-white text-xs font-bold py-1 pl-2 pr-6 cursor-pointer focus:outline-none hover:text-cyan-400 transition-colors"
                    >
                        {years.map(y => (
                            <option key={y} value={y} className="bg-slate-800 text-white">{y}</option>
                        ))}
                    </select>
                    <Calendar size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-cyan-400" />
                </div>

                <div className="w-px h-4 bg-white/10" />

                {/* Month Selector */}
                <div className="relative group">
                    <select
                        value={filters.month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="appearance-none bg-transparent text-white text-xs font-bold py-1 pl-2 pr-6 cursor-pointer focus:outline-none hover:text-cyan-400 transition-colors"
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value} className="bg-slate-800 text-white">{m.label}</option>
                        ))}
                    </select>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-cyan-400">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardFilter;

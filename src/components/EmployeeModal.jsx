import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, ChevronLeft, ChevronRight, Mail, Building2, Search, Activity, UserCheck, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatVietnameseNumber } from '../utils/formatters';
import { useFilter } from '../contexts/FilterContext';

const ITEMS_PER_PAGE = 6;

const EmployeeModal = ({ isOpen, onClose }) => {
    const { filters } = useFilter();
    const [employees, setEmployees] = useState([]);
    const [performanceData, setPerformanceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Get current month filter - use dashboard filter or current month
    const currentYear = filters.year;
    const currentMonth = filters.month === 'all' ? new Date().getMonth() + 1 : Number(filters.month);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch employees from Supabase with pagination and search
    const fetchEmployees = async (page, search) => {
        setLoading(true);
        setError(null);

        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            // Base query for count
            let countQuery = supabase
                .from('employee')
                .select('*', { count: 'exact', head: true });

            // Base query for data
            let dataQuery = supabase
                .from('employee')
                .select(`
                    employee_id,
                    full_name,
                    email,
                    role,
                    department:department_id (department_name)
                `)
                .order('employee_id', { ascending: true });

            // Apply search filter
            if (search.trim()) {
                countQuery = countQuery.ilike('full_name', `%${search.trim()}%`);
                dataQuery = dataQuery.ilike('full_name', `%${search.trim()}%`);
            }

            // Get total count
            const { count } = await countQuery;
            setTotalCount(count || 0);

            // Get paginated data
            const { data, error: fetchError } = await dataQuery.range(from, to);

            if (fetchError) throw fetchError;
            setEmployees(data || []);

            // Fetch performance data from view - FILTER BY CURRENT YEAR AND MONTH
            const { data: perfData, error: perfError } = await supabase
                .from('v_top_performers_heatmap')
                .select('*')
                .eq('year', currentYear)
                .eq('month', currentMonth);

            if (perfError) {
                console.error('Error fetching performance data:', perfError);
            }

            console.log('Performance data for', currentYear, 'month', currentMonth, ':', perfData);
            setPerformanceData(perfData || []);

        } catch (err) {
            console.error('Error fetching employees:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchEmployees(currentPage, debouncedSearch);
        }
    }, [isOpen, currentPage, debouncedSearch, currentYear, currentMonth]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentPage(1);
            setSearchTerm('');
            setDebouncedSearch('');
        }
    }, [isOpen]);

    // Merge employee with performance data and sort by revenue (highest first)
    const employeesWithMetrics = useMemo(() => {
        const merged = employees.map(emp => {
            const perf = performanceData.find(p => p.name === emp.full_name);
            return {
                ...emp,
                revenue: perf?.revenue || 0,
                activities_count: perf?.activities_count || 0,
                leads_count: perf?.leads_count || 0
            };
        });
        // Sort by revenue descending (highest first)
        return merged.sort((a, b) => b.revenue - a.revenue);
    }, [employees, performanceData]);

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const getRoleBadge = (role) => {
        const roleStyles = {
            'Sales': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            'Sales_Manager': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            'Marketing_Staff': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
            'Finance_Controller': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            'Admin': 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        };
        return roleStyles[role] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    };

    const formatRole = (role) => {
        const roleNames = {
            'Sales': 'Nhân viên KD',
            'Sales_Manager': 'Quản lý KD',
            'Marketing_Staff': 'Marketing',
            'Finance_Controller': 'Tài chính',
            'Admin': 'Quản trị'
        };
        return roleNames[role] || role || 'Chưa phân vai';
    };

    // Generate unique color based on name
    const getAvatarColor = (name) => {
        const colors = [
            'from-cyan-500 to-blue-600',
            'from-purple-500 to-pink-600',
            'from-emerald-500 to-teal-600',
            'from-orange-500 to-red-600',
            'from-indigo-500 to-purple-600',
            'from-rose-500 to-pink-600',
            'from-amber-500 to-orange-600',
            'from-teal-500 to-cyan-600',
            'from-fuchsia-500 to-purple-600',
            'from-lime-500 to-green-600',
            'from-sky-500 to-indigo-600',
            'from-violet-500 to-purple-600'
        ];
        // Hash the name to get consistent color
        let hash = 0;
        for (let i = 0; i < (name?.length || 0); i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                            <Users className="w-5 h-5 text-cyan-300" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Quản lý nhân viên</h2>
                            <p className="text-xs text-slate-400">
                                Tổng: <span className="text-cyan-400 font-semibold">{totalCount}</span> nhân viên
                                <span className="mx-2">•</span>
                                <span className="text-amber-400">Tháng {currentMonth}/{currentYear}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-4 py-3 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên nhân viên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                            <span className="ml-3 text-slate-400">Đang tải...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-400">
                            <p>Lỗi: {error}</p>
                        </div>
                    ) : employeesWithMetrics.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>{searchTerm ? `Không tìm thấy nhân viên "${searchTerm}"` : 'Không có dữ liệu nhân viên'}</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {employeesWithMetrics.map((emp) => (
                                <div
                                    key={emp.employee_id}
                                    className="group p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 transition-all duration-300"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(emp.full_name)} flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg`}>
                                            {emp.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>

                                        {/* Main Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                                                    {emp.full_name}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getRoleBadge(emp.role)}`}>
                                                    {formatRole(emp.role)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                                                {emp.email && (
                                                    <div className="flex items-center gap-1">
                                                        <Mail size={12} />
                                                        <span className="truncate max-w-[200px]">{emp.email}</span>
                                                    </div>
                                                )}
                                                {emp.department?.department_name && (
                                                    <div className="flex items-center gap-1">
                                                        <Building2 size={12} />
                                                        <span>{emp.department.department_name}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metrics */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                    <DollarSign className="w-4 h-4 text-emerald-400" />
                                                    <div>
                                                        <p className="text-[10px] text-emerald-300/70 uppercase tracking-wider">Doanh thu</p>
                                                        <p className="text-sm font-bold text-emerald-400">
                                                            {formatVietnameseNumber(emp.revenue)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                                    <Activity className="w-4 h-4 text-purple-400" />
                                                    <div>
                                                        <p className="text-[10px] text-purple-300/70 uppercase tracking-wider">Hoạt động</p>
                                                        <p className="text-sm font-bold text-purple-400">
                                                            {emp.activities_count}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                                    <UserCheck className="w-4 h-4 text-amber-400" />
                                                    <div>
                                                        <p className="text-[10px] text-amber-300/70 uppercase tracking-wider">Leads</p>
                                                        <p className="text-sm font-bold text-amber-400">
                                                            {emp.leads_count}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-white/10 bg-slate-900/50">
                        <p className="text-xs text-slate-400">
                            Trang <span className="text-white font-semibold">{currentPage}</span> / {totalPages}
                            {searchTerm && <span className="ml-2 text-cyan-400">• Đang tìm: "{searchTerm}"</span>}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-white/10 text-xs font-medium text-slate-300"
                            >
                                <ChevronLeft size={14} />
                                Trước
                            </button>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-white/10 text-xs font-medium text-slate-300"
                            >
                                Sau
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeModal;

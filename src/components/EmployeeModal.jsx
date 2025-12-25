import React, { useState, useEffect } from 'react';
import { X, Users, ChevronLeft, ChevronRight, Mail, Building2, UserCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ITEMS_PER_PAGE = 8;

const EmployeeModal = ({ isOpen, onClose }) => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Fetch employees from Supabase with pagination
    const fetchEmployees = async (page) => {
        setLoading(true);
        setError(null);

        try {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            // Get total count
            const { count } = await supabase
                .from('employee')
                .select('*', { count: 'exact', head: true });

            setTotalCount(count || 0);

            // Get paginated data with department info
            const { data, error: fetchError } = await supabase
                .from('employee')
                .select(`
                    employee_id,
                    full_name,
                    email,
                    role,
                    department:department_id (department_name)
                `)
                .order('employee_id', { ascending: true })
                .range(from, to);

            if (fetchError) throw fetchError;
            setEmployees(data || []);
        } catch (err) {
            console.error('Error fetching employees:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchEmployees(currentPage);
        }
    }, [isOpen, currentPage]);

    // Reset page when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentPage(1);
        }
    }, [isOpen]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                            <Users className="w-5 h-5 text-cyan-300" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Danh sách nhân viên</h2>
                            <p className="text-xs text-slate-400">
                                Tổng cộng: <span className="text-cyan-400 font-semibold">{totalCount}</span> nhân viên
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
                    ) : employees.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Không có dữ liệu nhân viên</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {employees.map((emp) => (
                                <div
                                    key={emp.employee_id}
                                    className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 transition-all duration-300"
                                >
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                        {emp.full_name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                                            {emp.full_name}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            {emp.email && (
                                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Mail size={12} />
                                                    <span className="truncate max-w-[180px]">{emp.email}</span>
                                                </div>
                                            )}
                                            {emp.department?.department_name && (
                                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Building2 size={12} />
                                                    <span>{emp.department.department_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Role Badge */}
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadge(emp.role)}`}>
                                        {formatRole(emp.role)}
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

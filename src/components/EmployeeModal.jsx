import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Users, ChevronLeft, ChevronRight, Mail, Building2, Search, Activity, UserCheck, DollarSign, FileText, Check, Loader2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatVietnameseNumber } from '../utils/formatters';
import { useFilter } from '../contexts/FilterContext';
import html2pdf from 'html2pdf.js';

const ITEMS_PER_PAGE = 6;

// Webhook URL for AI analysis
const WEBHOOK_URL = 'https://chatgpt.id.vn/webhook/bb17371c-4e2f-4cdc-87f3-8f1ef8faece7';

// Report metrics options
const REPORT_METRICS = [
    { id: 'revenue', label: 'Doanh thu', description: 'Tổng doanh thu đạt được trong kỳ' },
    { id: 'activities', label: 'Hoạt động', description: 'Số cuộc gọi, email, cuộc hẹn' },
    { id: 'leads', label: 'Leads', description: 'Số lượng khách hàng tiềm năng' },
    { id: 'conversion', label: 'Tỷ lệ chuyển đổi', description: 'Tỷ lệ chốt deal thành công' },
    { id: 'target', label: 'So sánh mục tiêu', description: 'So sánh với KPI đã giao' },
    { id: 'trend', label: 'Xu hướng', description: 'Phân tích tăng/giảm so với kỳ trước' },
];

// Analysis steps for loading animation
const ANALYSIS_STEPS = [
    { id: 1, text: 'Đang thu thập dữ liệu nhân viên...' },
    { id: 2, text: 'Phân tích chỉ số hiệu suất...' },
    { id: 3, text: 'So sánh với mục tiêu KPI...' },
    { id: 4, text: 'Tạo báo cáo chi tiết...' },
];

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

    // Report modal state
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'activities', 'leads']);

    // Report result state
    const [reportResultOpen, setReportResultOpen] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportResult, setReportResult] = useState('');
    const [reportData, setReportData] = useState([]); // Array of {type, text/html/columns/rows}
    const [reportError, setReportError] = useState(null);
    const [analysisStep, setAnalysisStep] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const reportContentRef = useRef(null);

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

            // Filter only Sales employees (exclude managers and other roles)
            countQuery = countQuery.eq('role', 'Sales');
            dataQuery = dataQuery.eq('role', 'Sales');

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

    // Toggle metric selection
    const toggleMetric = (metricId) => {
        setSelectedMetrics(prev =>
            prev.includes(metricId)
                ? prev.filter(id => id !== metricId)
                : [...prev, metricId]
        );
    };

    // Open report modal for employee
    const openReportModal = (emp) => {
        setSelectedEmployee(emp);
        setSelectedMetrics(['revenue', 'activities', 'leads']); // Reset to defaults
        setReportModalOpen(true);
    };

    // Close report result modal
    const closeReportResult = () => {
        setReportResultOpen(false);
        setReportResult('');
        setReportData([]);
        setReportError(null);
    };

    // Download report as PDF - put chart HTML directly in print
    const downloadPdf = () => {
        if (!selectedEmployee) return;
        if (reportData.length === 0 && !reportResult) {
            alert('Không có dữ liệu báo cáo để xuất');
            return;
        }
        setIsDownloading(true);

        try {
            // Build content from reportData
            let htmlContent = '';
            let chartIndex = 0; // Counter for unique chart IDs

            if (reportData.length > 0) {
                for (const item of reportData) {
                    if (item.type === 'text' && item.text) {
                        const lines = item.text.split('\n');
                        for (const line of lines) {
                            const t = line.trim();
                            if (!t) continue;
                            if (t.match(/^#{1,3}\s/)) {
                                htmlContent += `<h3 style="color:#0891b2;font-size:16px;margin:18px 0 10px;font-weight:bold;">${t.replace(/^#+\s*/, '')}</h3>`;
                            } else if (t.match(/^[-*•]\s/)) {
                                htmlContent += `<p style="margin:5px 0 5px 25px;font-size:13px;">• ${t.replace(/^[-*•]\s*/, '')}</p>`;
                            } else if (t.match(/^\d+\.\s/)) {
                                htmlContent += `<p style="margin:5px 0 5px 25px;font-size:13px;">${t}</p>`;
                            } else if (t.match(/^\*\*.*\*\*$/)) {
                                htmlContent += `<p style="margin:10px 0;font-size:14px;font-weight:bold;">${t.replace(/\*\*/g, '')}</p>`;
                            } else {
                                htmlContent += `<p style="margin:8px 0;font-size:13px;">${t}</p>`;
                            }
                        }
                    } else if (item.type === 'chart' && item.html) {
                        chartIndex++;
                        console.log(`Chart ${chartIndex} HTML:`, item.html.substring(0, 200));

                        // Encode chart HTML for srcdoc attribute
                        const encodedHtml = item.html
                            .replace(/&/g, '&amp;')
                            .replace(/"/g, '&quot;');

                        // Each chart gets its own iframe (independent document)
                        htmlContent += `
                            <div style="margin:20px 0;padding:15px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;page-break-inside:avoid;">
                                <p style="margin:0 0 10px;font-size:14px;color:#0891b2;font-weight:bold;">📊 Biểu đồ ${chartIndex}</p>
                                <iframe 
                                    srcdoc="${encodedHtml}"
                                    style="width:100%;height:240px;border:none;overflow:hidden;"
                                    scrolling="no"
                                ></iframe>
                            </div>`;
                    } else if (item.type === 'table' && item.columns && item.rows) {
                        htmlContent += '<table style="width:100%;border-collapse:collapse;margin:15px 0;font-size:12px;">';
                        htmlContent += '<thead><tr>';
                        for (const col of item.columns) {
                            htmlContent += `<th style="background:#f1f5f9;border:1px solid #e2e8f0;padding:10px;text-align:left;font-weight:bold;color:#0f172a;">${col}</th>`;
                        }
                        htmlContent += '</tr></thead><tbody>';
                        for (const row of item.rows) {
                            htmlContent += '<tr>';
                            for (const cell of row) {
                                htmlContent += `<td style="border:1px solid #e2e8f0;padding:8px;color:#1e293b;">${cell}</td>`;
                            }
                            htmlContent += '</tr>';
                        }
                        htmlContent += '</tbody></table>';
                    }
                }
            } else if (reportResult) {
                const lines = reportResult.split('\n');
                for (const line of lines) {
                    const t = line.trim();
                    if (!t) continue;
                    htmlContent += `<p style="margin:8px 0;font-size:13px;">${t}</p>`;
                }
            }

            // Create printable HTML with chart
            const printHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Báo cáo - ${selectedEmployee.full_name}</title>
    <style>
        @page { margin: 15mm; }
        @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            .no-print { display: none; }
        }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 20px; background: white; }
        .header { text-align: center; border-bottom: 4px solid #0891b2; padding-bottom: 20px; margin-bottom: 25px; }
        .header h1 { color: #0891b2; font-size: 28px; margin: 0; }
        .header p { color: #64748b; font-size: 14px; margin: 10px 0 0; }
        .info { background: #f1f5f9; padding: 18px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid #0891b2; }
        .info .name { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0; }
        .info .meta { font-size: 13px; color: #64748b; margin: 8px 0 0; }
        .footer { margin-top: 35px; padding-top: 15px; border-top: 2px solid #e2e8f0; text-align: center; }
        .footer p { color: #64748b; font-size: 11px; margin: 0; }
        img, svg, canvas { max-width: 100%; height: auto; }
        .chart-container { max-height: 400px; overflow: hidden; }
        .chart-container iframe { max-height: 380px; width: 100%; border: none; }
        .chart-container > div { max-height: 380px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🐝 BeeBox Dashboard</h1>
        <p>Báo cáo hoạt động nhân viên</p>
    </div>
    <div class="info">
        <p class="name">${selectedEmployee.full_name}</p>
        <p class="meta">Mã NV: ${selectedEmployee.employee_id} | Kỳ: Tháng ${currentMonth}/${currentYear}</p>
    </div>
    <div class="content">
        ${htmlContent}
    </div>
    <div class="footer">
        <p>Xuất ngày ${new Date().toLocaleDateString('vi-VN')} - BeeBox AI Dashboard</p>
    </div>
</body>
</html>`;

            // Create print iframe with larger size for all charts
            const printFrame = document.createElement('iframe');
            printFrame.style.cssText = 'position:fixed;left:-9999px;width:1200px;height:2000px;border:0;background:white;';
            document.body.appendChild(printFrame);

            printFrame.contentWindow.document.open();
            printFrame.contentWindow.document.write(printHtml);
            printFrame.contentWindow.document.close();

            // Wait longer for ALL charts to render (4 seconds for 3 charts)
            setTimeout(() => {
                printFrame.contentWindow.focus();
                printFrame.contentWindow.print();
                setTimeout(() => {
                    document.body.removeChild(printFrame);
                    setIsDownloading(false);
                }, 1000);
            }, 4000);

        } catch (e) {
            console.error('PDF error:', e);
            alert('Lỗi: ' + e.message);
            setIsDownloading(false);
        }
    };

    // Generate and export report
    const handleExportReport = () => {
        if (!selectedEmployee || selectedMetrics.length === 0) return;
        const labels = selectedMetrics.map(id => REPORT_METRICS.find(m => m.id === id)?.label).filter(Boolean).join(', ');
        const prompt = `Phân tích chuyên sâu hiệu suất nhân viên:\n- ID: ${selectedEmployee.employee_id}\n- Tên: ${selectedEmployee.full_name}\n- Kỳ: Tháng ${currentMonth}/${currentYear}\n- Chỉ số: ${labels}\n\nYêu cầu:\n1. Tổng quan hiệu suất\n2. Phân tích từng chỉ số\n3. So sánh KPI\n4. Điểm mạnh/yếu\n5. Đề xuất cải thiện\n6. Dự báo xu hướng\n\nTrình bày markdown chuyên nghiệp, có biểu đồ nếu cần.`;
        setReportModalOpen(false);
        setReportResultOpen(true);
        setReportLoading(true);
        setReportError(null);
        setReportResult('');
        setAnalysisStep(0);
        setElapsedTime(0);
        const ti = setInterval(() => setElapsedTime(p => p + 1), 1000);
        const st = [0, 6000, 12000, 18000].map((d, i) => setTimeout(() => setAnalysisStep(i), d));
        const rid = `report-${selectedEmployee.employee_id}-${Date.now()}`;
        const hr = (e) => {
            if (e.detail?.requestId === rid) {
                clearInterval(ti); st.forEach(t => clearTimeout(t)); setReportLoading(false);
                if (e.detail.error) setReportError(e.detail.error);
                else { setReportResult(e.detail.result || 'Không có dữ liệu.'); setReportData(e.detail.data || []); }
                window.removeEventListener('bb-report-response', hr);
            }
        };
        window.addEventListener('bb-report-response', hr);
        setTimeout(() => { clearInterval(ti); st.forEach(t => clearTimeout(t)); window.removeEventListener('bb-report-response', hr); if (reportLoading) { setReportLoading(false); setReportError('Timeout'); } }, 120000);
        window.dispatchEvent(new CustomEvent('bb-report-request', { detail: { requestId: rid, prompt, employeeName: selectedEmployee.full_name } }));
    };

    // Render markdown to HTML (basic)
    const renderMarkdown = (text) => {
        if (!text) return '';
        return text
            .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 p-3 rounded-lg overflow-x-auto text-sm my-2">$1</pre>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-white mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-4 mb-2">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-4 mb-2">$1</h1>')
            .replace(/^\- (.*$)/gim, '<li class="ml-4 text-slate-300">$1</li>')
            .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 text-slate-300 list-decimal">$1</li>')
            .replace(/\|(.*)\|/g, (match) => {
                const cells = match.split('|').filter(c => c.trim());
                return '<tr>' + cells.map(c => `<td class="border border-slate-600 px-3 py-2 text-sm">${c.trim()}</td>`).join('') + '</tr>';
            })
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>');
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

                                            {/* Export Button */}
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <button
                                                    onClick={() => openReportModal(emp)}
                                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all hover:scale-[1.02]"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Xuất báo cáo hoạt động
                                                </button>
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

            {/* Report Metrics Selection Modal */}
            {reportModalOpen && selectedEmployee && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setReportModalOpen(false)}
                    />
                    <div className="relative w-full max-w-md bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div>
                                <h3 className="text-base font-bold text-white">Xuất báo cáo</h3>
                                <p className="text-xs text-slate-400">
                                    Nhân viên: <span className="text-cyan-400">{selectedEmployee.full_name}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setReportModalOpen(false)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        {/* Metrics Selection */}
                        <div className="p-4">
                            <p className="text-xs text-slate-400 mb-3">Chọn các chỉ số cần báo cáo:</p>
                            <div className="space-y-2">
                                {REPORT_METRICS.map((metric) => {
                                    const isSelected = selectedMetrics.includes(metric.id);
                                    return (
                                        <button
                                            key={metric.id}
                                            onClick={() => toggleMetric(metric.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected
                                                ? 'bg-cyan-500/20 border-cyan-500/50'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${isSelected
                                                ? 'bg-cyan-500 border-cyan-500'
                                                : 'border-slate-500'
                                                }`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                    {metric.label}
                                                </p>
                                                <p className="text-[10px] text-slate-500">{metric.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 p-4 border-t border-white/10 bg-slate-900/50">
                            <button
                                onClick={() => setReportModalOpen(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-slate-300 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleExportReport}
                                disabled={selectedMetrics.length === 0}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-all"
                            >
                                <FileText className="w-4 h-4" />
                                Xuất báo cáo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Result Modal */}
            {reportResultOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={!reportLoading ? closeReportResult : undefined}
                    />
                    <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-500/30">
                                    <span className="text-xl">🐝</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        {reportLoading ? 'BeeBox đang phân tích...' : 'Báo cáo hoạt động'}
                                    </h3>
                                    {selectedEmployee && (
                                        <p className="text-xs text-slate-400">
                                            Nhân viên: <span className="text-cyan-400">{selectedEmployee.full_name}</span>
                                            <span className="mx-2">•</span>
                                            <span className="text-amber-400">Tháng {currentMonth}/{currentYear}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            {!reportLoading && (
                                <button
                                    onClick={closeReportResult}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {reportLoading ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    {/* Enhanced BeeBox Animation */}
                                    <div className="relative mb-10">
                                        {/* Outer glow rings */}
                                        <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 animate-pulse" />
                                        <div className="absolute -inset-6 rounded-full border border-amber-500/20 animate-[spin_8s_linear_infinite]" />
                                        <div className="absolute -inset-4 rounded-full border border-yellow-500/30 animate-[spin_6s_linear_infinite_reverse]" />

                                        {/* Floating particles */}
                                        <div className="absolute -inset-12">
                                            <div className="absolute top-0 left-1/2 w-2 h-2 bg-amber-400/60 rounded-full animate-[bounce_2s_ease-in-out_infinite]" />
                                            <div className="absolute bottom-0 right-1/4 w-1.5 h-1.5 bg-yellow-400/60 rounded-full animate-[bounce_2.5s_ease-in-out_infinite_0.5s]" />
                                            <div className="absolute top-1/4 right-0 w-2 h-2 bg-orange-400/60 rounded-full animate-[bounce_3s_ease-in-out_infinite_1s]" />
                                            <div className="absolute bottom-1/4 left-0 w-1.5 h-1.5 bg-amber-300/60 rounded-full animate-[bounce_2.2s_ease-in-out_infinite_0.3s]" />
                                        </div>

                                        {/* Main bee container */}
                                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/40 via-yellow-500/30 to-orange-500/40 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                                            <span className="text-5xl animate-bounce drop-shadow-lg" style={{ animationDuration: '1s' }}>🐝</span>
                                        </div>
                                    </div>

                                    {/* Title with typing effect */}
                                    <h4 className="text-lg font-bold text-white mb-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                                        BeeBox đang phân tích
                                    </h4>

                                    {/* Elapsed time counter */}
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                            <span className="text-sm font-mono text-cyan-400">
                                                {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}
                                            </span>
                                            <span className="text-xs text-slate-500">thời gian suy luận</span>
                                        </div>
                                    </div>

                                    {/* Analysis Steps with enhanced styling */}
                                    <div className="space-y-3 w-full max-w-md">
                                        {ANALYSIS_STEPS.map((step, index) => (
                                            <div
                                                key={step.id}
                                                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-700 transform ${index <= analysisStep
                                                    ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-purple-500/10 border border-cyan-500/40 scale-100 opacity-100'
                                                    : 'bg-slate-800/50 border border-slate-700/50 scale-95 opacity-50'
                                                    }`}
                                            >
                                                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${index < analysisStep
                                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30'
                                                    : index === analysisStep
                                                        ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30'
                                                        : 'bg-slate-700'
                                                    }`}>
                                                    {index < analysisStep ? (
                                                        <Check className="w-5 h-5 text-white" />
                                                    ) : index === analysisStep ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                                                            <div className="absolute inset-0 rounded-xl animate-ping bg-cyan-500/30" />
                                                        </>
                                                    ) : (
                                                        <span className="text-sm font-bold text-slate-400">{index + 1}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <span className={`text-sm font-medium transition-colors duration-500 ${index <= analysisStep ? 'text-white' : 'text-slate-500'
                                                        }`}>
                                                        {step.text}
                                                    </span>
                                                    {index === analysisStep && (
                                                        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                                                                style={{ width: '60%', animationName: 'pulse' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : reportError ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                        <X className="w-8 h-8 text-red-400" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-white mb-2">Có lỗi xảy ra</h4>
                                    <p className="text-sm text-slate-400">{reportError}</p>
                                    <button
                                        onClick={closeReportResult}
                                        className="mt-6 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium text-white transition-all"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            ) : (
                                <div ref={reportContentRef} className="space-y-4">
                                    {reportData.length > 0 ? (
                                        reportData.map((item, idx) => {
                                            if (item.type === 'text') {
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="prose prose-invert max-w-none text-slate-300"
                                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(item.text) }}
                                                    />
                                                );
                                            }
                                            if (item.type === 'chart') {
                                                return (
                                                    <div key={idx} className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-800/50">
                                                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-slate-900/50">
                                                            <span className="text-xs text-slate-400">📊 Biểu đồ phân tích</span>
                                                        </div>
                                                        <iframe
                                                            srcDoc={item.html}
                                                            className="w-full border-0"
                                                            style={{ height: '400px', background: '#1e293b' }}
                                                            sandbox="allow-scripts allow-same-origin"
                                                            title={`Chart ${idx}`}
                                                        />
                                                    </div>
                                                );
                                            }
                                            if (item.type === 'table') {
                                                return (
                                                    <div key={idx} className="rounded-xl overflow-hidden border border-white/10">
                                                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-slate-900/50">
                                                            <span className="text-xs text-slate-400">📋 Bảng dữ liệu</span>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="bg-slate-800/50">
                                                                        {(item.columns || []).map((col, colIdx) => (
                                                                            <th key={colIdx} className="px-4 py-3 text-left text-xs font-semibold text-cyan-400 uppercase tracking-wider border-b border-white/5">
                                                                                {col}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(item.rows || []).map((row, rowIdx) => (
                                                                        <tr key={rowIdx} className="hover:bg-white/5 transition-colors">
                                                                            {row.map((cell, cellIdx) => (
                                                                                <td key={cellIdx} className="px-4 py-3 text-slate-300 border-b border-white/5">
                                                                                    {cell}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })
                                    ) : (
                                        <div
                                            className="prose prose-invert max-w-none text-slate-300"
                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(reportResult) }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {!reportLoading && !reportError && (
                            <div className="flex items-center justify-between gap-3 p-4 border-t border-white/10 bg-slate-900/50">
                                <div className="text-xs text-slate-500">
                                    Thời gian suy luận: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={downloadPdf}
                                        disabled={isDownloading}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-sm font-medium text-white transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDownloading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Đang tải...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4" />
                                                Tải PDF
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={closeReportResult}
                                        className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-slate-300 transition-all"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeModal;

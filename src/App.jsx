import React, { useEffect, useRef, useState } from 'react';
import { useDashboardData } from './data/mockData.jsx';
import PYPPerformance from './components/PYPPerformance';
import SalesPipeline from './components/SalesPipeline';
import TopPerformersHeatmap from './components/TopPerformersHeatmap';
import ChienBinhSales from './components/ChienBinhSales';
import HieuSuatTaiChinh from './components/HieuSuatTaiChinh';
import KenhBanHang from './components/KenhBanHang';
import DoanhThuSanPham from './components/DoanhThuSanPham';
import SoLuongBan from './components/SoLuongBan';
import LoiNhuanRong from './components/LoiNhuanRong';

function App() {
    const [activeSection, setActiveSection] = useState('perf');
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Format currency: >= 1 tỷ -> tỷ, else triệu
    const formatCurrency = (value) => {
        if (value >= 1000000000) {
            return { value: (value / 1000000000).toFixed(2), unit: 'tỷ' };
        }
        return { value: Math.round(value / 1000000), unit: 'triệu' };
    };

    // Get real-time data from Supabase (auto-refreshes every 15s)
    const { pypPerformance, pipelineStages } = useDashboardData();

    // Use real data or fallback to default values
    const pypData = pypPerformance.data || [];
    const pipelineData = pipelineStages.data || [];

    const currentMonth = pypData[pypData.length - 1] || { actual: 0, target: 0, month: 'T12' };
    const kpiCompletion = currentMonth.target > 0
        ? Math.round((currentMonth.actual / currentMonth.target) * 100)
        : 0;
    const totalPipeline = pipelineData.reduce((sum, stage) => sum + (stage.count || 0), 0);
    const hottestStage = pipelineData.length > 0
        ? pipelineData.reduce((max, stage) => ((stage.count || 0) > (max.count || 0) ? stage : max), pipelineData[0])
        : { label: 'N/A', count: 0, color: '#gray' };

    const perfRef = useRef(null);
    const productRef = useRef(null);
    const financeRef = useRef(null);

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scrollToSection = (ref, alignBottom = false, forceCenter = false) => {
        if (!ref?.current) return;
        const rect = ref.current.getBoundingClientRect();
        const offset = window.innerWidth < 768 ? 80 : 120;
        const centerOffset = Math.max((window.innerHeight - rect.height) / 2, 0);
        const top = alignBottom
            ? rect.bottom + window.scrollY - window.innerHeight + offset
            : forceCenter
                ? rect.top + window.scrollY - centerOffset
                : rect.top + window.scrollY - offset - centerOffset;
        window.scrollTo({ top: Math.max(top, 0), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    };

    // Detect section in viewport to highlight nav
    useEffect(() => {
        const sections = [
            { key: 'perf', ref: perfRef },
            { key: 'product', ref: productRef },
            { key: 'finance', ref: financeRef }
        ];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const found = sections.find((s) => s.ref.current === entry.target);
                        if (found) setActiveSection(found.key);
                    }
                });
            },
            { threshold: 0.5, rootMargin: '-10% 0px -10% 0px' }
        );
        sections.forEach((s) => s.ref.current && observer.observe(s.ref.current));
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="dashboard-container">
            {/* Side quick-nav */}
            <div className="fixed right-3 lg:right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
                {[
                    { key: 'perf', label: 'Hiệu suất', ref: perfRef, alignBottom: false, forceCenter: false },
                    { key: 'product', label: 'Sản phẩm', ref: productRef, alignBottom: false, forceCenter: true },
                    { key: 'finance', label: 'Tài chính', ref: financeRef, alignBottom: true, forceCenter: false }
                ].map((item) => (
                    <button
                        key={item.key}
                        onClick={() => scrollToSection(item.ref, item.alignBottom, item.forceCenter)}
                        aria-label={`Đi tới ${item.label}`}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold transition shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md ${activeSection === item.key
                            ? 'bg-cyan-500/30 border-cyan-300 text-white'
                            : 'bg-white/10 border-white/20 text-white hover:bg-cyan-500/20 hover:border-cyan-400/60'
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="relative max-w-6xl xl:max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -left-24 -top-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
                    <div className="absolute right-0 top-10 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.06),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.06),transparent_25%),radial-gradient(circle_at_60%_80%,rgba(59,130,246,0.06),transparent_25%)]" />
                </div>

                {/* Header */}
                <div className="relative flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 flex items-center justify-center shadow-[0_10px_30px_rgba(59,130,246,0.35)]">
                            <span className="text-white text-xl font-black tracking-tight">BB</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white leading-tight">BeeBox Intelligence</h1>
                            <p className="text-sm text-slate-400">Dashboard doanh thu & pipeline thời gian thực</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-xs text-slate-200 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                            Tháng {currentMonth.month}, {new Date().getFullYear()}
                        </div>
                        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-500 text-xs font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/40 transition">
                            Xuất báo cáo
                        </button>
                    </div>
                </div>

                <div className="relative space-y-8">
                    {/* Section: Hiệu suất & Pipeline */}
                    <div ref={perfRef} className="space-y-3 min-h-[70vh] md:min-h-[85vh] flex flex-col scroll-mt-[140px] md:scroll-mt-[160px]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-emerald-300 uppercase tracking-[0.14em]">Hiệu suất & pipeline</p>
                                <h2 className="text-lg font-semibold text-white">Theo dõi KPI và luồng bán hàng</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] text-emerald-400 uppercase tracking-[0.12em]">KPI tháng</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{formatCurrency(currentMonth.actual).value}</span>
                                    <span className="text-sm text-slate-300 ml-1">{formatCurrency(currentMonth.actual).unit}</span>
                                    <span className="text-xs text-emerald-300 font-semibold">{kpiCompletion}% KPI</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Mục tiêu: {formatCurrency(currentMonth.target).value} {formatCurrency(currentMonth.target).unit}</p>
                            </div>

                            <div className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] text-cyan-300 uppercase tracking-[0.12em]">Pipeline</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-white">{totalPipeline}</span>
                                    <span className="text-xs text-slate-300">lead/khách hàng</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Giai đoạn nóng: {hottestStage.label}</p>
                            </div>

                            <div className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] text-purple-300 uppercase tracking-[0.12em]">Giai đoạn đỉnh</p>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                            backgroundColor: hottestStage.color,
                                            boxShadow: `0 0 10px ${hottestStage.color}80`
                                        }}
                                    />
                                    <span className="text-sm font-semibold text-white">{hottestStage.label}</span>
                                    <span className="text-xs text-slate-400">({hottestStage.count} hồ sơ)</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Ưu tiên xử lý trước</p>
                            </div>

                            <div className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] text-emerald-300 uppercase tracking-[0.12em]">Trạng thái</p>
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                    <span className="text-sm font-semibold text-white">Sẵn sàng hành động</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Nguồn lực đầy đủ</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 auto-rows-[minmax(220px,auto)] gap-3 flex-1">
                            <div className="col-span-12 lg:col-span-4 min-w-0">
                                <PYPPerformance />
                            </div>
                            <div className="col-span-12 lg:col-span-8 min-w-0">
                                <SalesPipeline />
                            </div>
                        </div>
                    </div>

                    {/* Section: Sản phẩm & sản lượng */}
                    <div ref={productRef} className="space-y-3 min-h-[70vh] md:min-h-[85vh] flex flex-col scroll-mt-[140px] md:scroll-mt-[160px]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-emerald-300 uppercase tracking-[0.14em]">Sản phẩm & sản lượng</p>
                                <h2 className="text-lg font-semibold text-white">Doanh thu theo dòng và số lượng bán</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 auto-rows-[minmax(260px,auto)] gap-3 flex-1">
                            <div className="col-span-12 xl:col-span-8 min-w-0">
                                <DoanhThuSanPham />
                            </div>
                            <div className="col-span-12 xl:col-span-4 min-w-0 grid grid-rows-2 gap-3 auto-rows-[minmax(180px,auto)]">
                                <div className="min-h-[200px]">
                                    <SoLuongBan />
                                </div>
                                <div className="min-h-[180px]">
                                    <KenhBanHang />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Nhân sự & tài chính */}
                    <div ref={financeRef} className="space-y-3 min-h-[70vh] md:min-h-[85vh] flex flex-col scroll-mt-[140px] md:scroll-mt-[160px]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-emerald-300 uppercase tracking-[0.14em]">Nhân sự & tài chính</p>
                                <h2 className="text-lg font-semibold text-white">Chiến binh dẫn đầu, hiệu suất và tài chính</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 auto-rows-[minmax(240px,auto)] gap-3 flex-1">
                            <div className="col-span-12 md:col-span-6 xl:col-span-6 min-w-0">
                                <ChienBinhSales />
                            </div>
                            <div className="col-span-12 md:col-span-6 xl:col-span-6 min-w-0">
                                <TopPerformersHeatmap />
                            </div>
                            <div className="col-span-12 lg:col-span-6 min-w-0">
                                <HieuSuatTaiChinh />
                            </div>
                            <div className="col-span-12 lg:col-span-6 min-w-0">
                                <LoiNhuanRong />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })}
                    className="fixed right-3 bottom-4 lg:right-6 lg:bottom-6 px-3 py-2 rounded-full bg-white/15 border border-white/25 text-xs font-semibold text-white hover:bg-cyan-500/30 hover:border-cyan-300 transition shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-md z-30"
                    aria-label="Lên đầu trang"
                >
                    Lên đầu
                </button>
            )}
        </div>
    );
}

export default App;

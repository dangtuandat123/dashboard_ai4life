import React, { useRef } from 'react';
import { pipelineStages, pypPerformanceData } from './data/mockData';
import PYPPerformance from './components/PYPPerformance';
import SalesPipeline from './components/SalesPipeline';
import TopPerformersHeatmap from './components/TopPerformersHeatmap';
import ChienBinhSales from './components/ChienBinhSales';
import HieuSuatTaiChinh from './components/HieuSuatTaiChinh';
import KenhBanHang from './components/KenhBanHang';
import DoanhThuSanPham from './components/DoanhThuSanPham';
import SoLuongBan from './components/SoLuongBan';

function App() {
    const currentMonth = pypPerformanceData[pypPerformanceData.length - 1];
    const kpiCompletion = Math.round((currentMonth.actual / currentMonth.target) * 100);
    const totalPipeline = pipelineStages.reduce((sum, stage) => sum + stage.count, 0);
    const hottestStage = pipelineStages.reduce((max, stage) => (stage.count > max.count ? stage : max), pipelineStages[0]);

    const perfRef = useRef(null);
    const productRef = useRef(null);
    const financeRef = useRef(null);

    const scrollToSection = (ref) => {
        ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    };

    return (
        <div className="dashboard-container">
            {/* Side quick-nav */}
            <div className="fixed right-4 lg:right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
                {[
                    { label: 'Hiệu suất', ref: perfRef },
                    { label: 'Sản phẩm', ref: productRef },
                    { label: 'Tài chính', ref: financeRef }
                ].map((item) => (
                    <button
                        key={item.label}
                        onClick={() => scrollToSection(item.ref)}
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-xs font-semibold text-white hover:bg-cyan-500/20 hover:border-cyan-400/60 transition shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md"
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
                            Tháng {currentMonth.month}, 2024
                        </div>
                        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-500 text-xs font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/40 transition">
                            Xuất báo cáo
                        </button>
                    </div>
                </div>

                <div className="relative space-y-8">
                    {/* Section: Hiệu suất & Pipeline */}
                    <div ref={perfRef} className="space-y-3 min-h-screen flex flex-col scroll-mt-6">
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
                                    <span className="text-2xl font-bold text-white">{currentMonth.actual} tỷ</span>
                                    <span className="text-xs text-emerald-300 font-semibold">{kpiCompletion}% KPI</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Mục tiêu: {currentMonth.target} tỷ</p>
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

                        <div className="grid grid-cols-12 auto-rows-[minmax(260px,auto)] gap-3 flex-1">
                            <div className="col-span-12 lg:col-span-4 min-w-0">
                                <PYPPerformance />
                            </div>
                            <div className="col-span-12 lg:col-span-8 min-w-0">
                                <SalesPipeline />
                            </div>
                        </div>
                    </div>

                    {/* Section: Sản phẩm & sản lượng */}
                    <div ref={productRef} className="space-y-3 min-h-screen flex flex-col scroll-mt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-emerald-300 uppercase tracking-[0.14em]">Sản phẩm & sản lượng</p>
                                <h2 className="text-lg font-semibold text-white">Doanh thu theo dòng và số lượng bán</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 auto-rows-[minmax(280px,auto)] gap-3 flex-1">
                            <div className="col-span-12 xl:col-span-8 min-w-0">
                                <DoanhThuSanPham />
                            </div>
                            <div className="col-span-12 xl:col-span-4 min-w-0 grid grid-rows-2 gap-3 auto-rows-[minmax(200px,auto)]">
                                <div className="min-h-[240px]">
                                    <SoLuongBan />
                                </div>
                                <div className="min-h-[200px]">
                                    <KenhBanHang />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Nhân sự & tài chính */}
                    <div ref={financeRef} className="space-y-3 min-h-screen flex flex-col scroll-mt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-emerald-300 uppercase tracking-[0.14em]">Nhân sự & tài chính</p>
                                <h2 className="text-lg font-semibold text-white">Chiến binh dẫn đầu, hiệu suất và tài chính</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 auto-rows-[minmax(260px,auto)] gap-3 flex-1">
                            <div className="col-span-12 md:col-span-6 xl:col-span-6 min-w-0">
                                <ChienBinhSales />
                            </div>
                            <div className="col-span-12 md:col-span-6 xl:col-span-6 min-w-0">
                                <TopPerformersHeatmap />
                            </div>
                            <div className="col-span-12 min-w-0">
                                <HieuSuatTaiChinh />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;

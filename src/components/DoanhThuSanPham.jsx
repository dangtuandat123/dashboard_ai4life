import React, { useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp, Target, ArrowUpRight } from 'lucide-react';
import { useDashboardData } from '../data/mockData';
import { formatVietnameseNumber } from '../utils/formatters';

const DoanhThuSanPham = () => {
    const { productLines: linesData, productTypes: typesData } = useDashboardData();

    const firePrompt = (title, text) => {
        window.dispatchEvent(new CustomEvent('bb-insight', { detail: { title, text } }));
    };

    const productLines = useMemo(() => {
        const lines = linesData.data || [];
        const types = typesData.data || [];

        const merged = lines.map(line => {
            const lineTypes = types.filter(type => type.category === line.name);
            return {
                ...line,
                productTypes: lineTypes.map(type => ({
                    name: type.name,
                    revenue: type.revenue,
                    target: type.target
                }))
            };
        });

        return merged.sort((a, b) => {
            const percentA = a.revenue / a.target;
            const percentB = b.revenue / b.target;
            const groupA = percentA < 1 ? 0 : 1;
            const groupB = percentB < 1 ? 0 : 1;
            if (groupA !== groupB) return groupA - groupB;
            return b.revenue - a.revenue;
        });
    }, [linesData.data, typesData.data]);

    const [activeLineId, setActiveLineId] = useState(productLines[0]?.id || 1);
    const activeLine = useMemo(() => productLines.find((line) => line.id === activeLineId), [activeLineId, productLines]);

    const sortedProductTypes = useMemo(() => {
        const types = activeLine?.productTypes || [];
        return [...types].sort((a, b) => {
            const percentA = a.revenue / a.target;
            const percentB = b.revenue / b.target;
            const groupA = percentA < 1 ? 0 : 1;
            const groupB = percentB < 1 ? 0 : 1;
            if (groupA !== groupB) return groupA - groupB;
            return b.revenue - a.revenue;
        });
    }, [activeLine?.productTypes]);

    const { totalRevenue, totalTarget } = useMemo(
        () => ({
            totalRevenue: productLines.reduce((sum, line) => sum + (line.revenue || 0), 0),
            totalTarget: productLines.reduce((sum, line) => sum + (line.target || 0), 0)
        }),
        [productLines]
    );

    const overallPercent = Math.round((totalRevenue / totalTarget) * 100);
    const activePercent = activeLine ? Math.round((activeLine.revenue / activeLine.target) * 100) : 0;

    // Donut chart calculation
    const donutDegrees = Math.min(overallPercent, 100) * 3.6;
    const donutColor = overallPercent >= 100 ? '#34d399' : '#fbbf24'; // emerald-400 : amber-400

    return (
        <div className="glass rounded-xl p-2 h-full flex flex-col border border-white/10 backdrop-blur-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 px-1">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white leading-none">Doanh thu sản phẩm</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Hiệu suất so với mục tiêu KPI</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-2 flex-1 min-h-0">
                {/* Left Column: KPI Summary with Donut Chart */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-2">
                    <div className="flex-1 bg-gradient-to-b from-white/5 to-transparent rounded-lg border border-white/10 p-3 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-cyan-500/5 blur-xl group-hover:bg-cyan-500/10 transition-all duration-500" />

                        {/* Donut Chart */}
                        <div className="relative w-24 h-24 mb-3">
                            <div
                                className="w-full h-full rounded-full"
                                style={{
                                    background: `conic-gradient(${donutColor} ${donutDegrees}deg, rgba(255,255,255,0.1) ${donutDegrees}deg)`
                                }}
                            >
                                <div className="absolute inset-2 bg-[#0f172a] rounded-full flex flex-col items-center justify-center z-10">
                                    <span className={`text-lg font-bold ${overallPercent >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {overallPercent}%
                                    </span>
                                    <span className="text-[8px] text-slate-400 uppercase tracking-wider">Hoàn thành</span>
                                </div>
                            </div>
                            {/* Glow effect behind chart */}
                            <div className={`absolute inset-0 rounded-full blur-md opacity-40 ${overallPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        </div>

                        <div className="text-center z-10 w-full">
                            <div className="text-[10px] text-slate-400 mb-0.5">Tổng doanh thu</div>
                            <div className="text-lg font-bold text-white tracking-tight">{formatVietnameseNumber(totalRevenue)}</div>

                            <div className="mt-3 w-full flex justify-center">
                                <div className="bg-white/5 rounded p-1.5 text-center border border-white/5 w-3/4">
                                    <div className="text-[9px] text-slate-400 flex items-center justify-center gap-1">
                                        <Target size={10} /> Mục tiêu
                                    </div>
                                    <div className="text-[10px] font-semibold text-slate-200 mt-0.5">{formatVietnameseNumber(totalTarget)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Column: Product Lines */}
                <div className="col-span-12 lg:col-span-5 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dòng sản phẩm</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
                        {productLines.slice(0, 7).map((line) => {
                            const percentage = Math.round((line.revenue / line.target) * 100);
                            const isActive = line.id === activeLineId;
                            const isMetKPI = percentage >= 100;

                            return (
                                <button
                                    key={line.id}
                                    onClick={() => {
                                        setActiveLineId(line.id);
                                        firePrompt(
                                            'Doanh thu theo dòng sản phẩm',
                                            `${line.name}: đạt ${formatVietnameseNumber(line.revenue)} / mục tiêu ${formatVietnameseNumber(line.target)}, tiến độ ${Math.round((line.revenue / line.target) * 100)}%`
                                        );
                                    }}
                                    className={`w-full text-left rounded-lg p-2 transition-all duration-300 border relative overflow-hidden group ${isActive
                                        ? 'bg-cyan-500/10 border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400/30'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-400" />}

                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-medium text-xs text-white truncate pr-2 group-hover:text-cyan-200 transition-colors">
                                            {line.name}
                                        </div>
                                        {!isMetKPI && (
                                            <div className="flex items-center gap-1 text-[9px] text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                                <AlertTriangle size={8} />
                                                <span>Thiếu KPI</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-end justify-between mb-1.5">
                                        <div className="text-[10px] text-slate-400">
                                            <span className="text-slate-200 font-semibold">{formatVietnameseNumber(line.revenue)}</span>
                                            <span className="mx-1">/</span>
                                            {formatVietnameseNumber(line.target)}
                                        </div>
                                        <div className={`text-[10px] font-bold ${isMetKPI ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {percentage}%
                                        </div>
                                    </div>

                                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${isMetKPI ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column: Product Types */}
                <div className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Chi tiết loại</span>
                        {activeLine && (
                            <span className="text-[9px] text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded border border-cyan-500/20 truncate max-w-[100px]">
                                {activeLine.name}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
                        {sortedProductTypes.slice(0, 6).map((product, idx) => {
                            const percentage = Math.round((product.revenue / product.target) * 100);
                            const isMetKPI = percentage >= 100;

                            return (
                                <div
                                    key={idx}
                                    className="rounded-lg border border-white/5 bg-white/[0.02] p-2 hover:bg-white/5 transition-colors duration-200 cursor-pointer"
                                    onClick={() =>
                                        firePrompt(
                                            'Chi tiết loại sản phẩm',
                                            `${product.name}: doanh thu ${formatVietnameseNumber(product.revenue)} / mục tiêu ${formatVietnameseNumber(product.target)}, tiến độ ${percentage}%`
                                        )
                                    }
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-slate-200 font-medium truncate flex-1 pr-2">
                                            {product.name}
                                        </span>
                                        <div className={`text-[10px] font-bold px-1.5 rounded ${isMetKPI ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {percentage}%
                                        </div>
                                    </div>

                                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                        <span>{formatVietnameseNumber(product.revenue)}</span>
                                        <span>Mục tiêu: {formatVietnameseNumber(product.target)}</span>
                                    </div>

                                    <div className="h-0.5 bg-slate-800 w-full rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${isMetKPI ? 'bg-emerald-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoanhThuSanPham;

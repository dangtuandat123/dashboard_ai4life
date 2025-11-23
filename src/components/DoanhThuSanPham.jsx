import React, { useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { productLines } from '../data/mockData';

const DoanhThuSanPham = () => {
    const [activeLineId, setActiveLineId] = useState(productLines[0].id);
    const activeLine = useMemo(() => productLines.find((line) => line.id === activeLineId), [activeLineId]);

    const { totalRevenue, totalTarget } = useMemo(
        () => ({
            totalRevenue: productLines.reduce((sum, line) => sum + line.revenue, 0),
            totalTarget: productLines.reduce((sum, line) => sum + line.target, 0)
        }),
        []
    );

    const overallPercent = Math.round((totalRevenue / totalTarget) * 100);
    const activePercent = activeLine ? Math.round((activeLine.revenue / activeLine.target) * 100) : 0;

    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em]">Product revenue</p>
                    <h3 className="text-sm font-semibold text-white">Doanh thu theo dòng sản phẩm</h3>
                    <p className="text-[10px] text-slate-400">Tổng hợp và drill-down chi tiết</p>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 flex items-center justify-center border border-cyan-500/40">
                    <TrendingUp className="w-4 h-4 text-cyan-300" />
                </div>
            </div>

            <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
                <div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-indigo-500/10 rounded-xl border border-cyan-500/30 p-3 flex flex-col">
                    <div className="text-[10px] text-slate-300 mb-1">Tổng doanh thu</div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {totalRevenue} <span className="text-sm text-slate-300">tỷ</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className={`${overallPercent >= 100 ? 'text-emerald-400' : 'text-amber-300'} font-semibold`}>
                            {overallPercent}% mục tiêu
                        </span>
                        <span className="text-[11px] text-slate-400">/ {totalTarget} tỷ</span>
                    </div>
                    <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-300">
                            <span>Hoàn thành</span>
                            <span>{overallPercent}%</span>
                        </div>
                        <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-lime-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                                style={{ width: `${Math.min(overallPercent, 120)}%` }}
                            />
                        </div>
                        <div className="text-[11px] text-slate-400">Nổi bật: chọn dòng bên phải để xem chi tiết</div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 overflow-hidden">
                    <div className="text-[10px] text-slate-400 uppercase tracking-[0.08em]">Dòng sản phẩm</div>
                    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-1">
                        {productLines.map((line) => {
                            const percentage = Math.round((line.revenue / line.target) * 100);
                            const isActive = line.id === activeLineId;
                            const isUnderperforming = percentage < 80;

                            return (
                                <button
                                    key={line.id}
                                    onClick={() => setActiveLineId(line.id)}
                                    className={`w-full text-left rounded-lg border p-3 transition-all backdrop-blur-sm ${
                                        isActive
                                            ? 'bg-white/10 border-cyan-500/60 shadow-[0_10px_25px_rgba(34,211,238,0.15)]'
                                            : 'bg-white/5 border-white/10 hover:border-cyan-500/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-semibold text-white">{line.name}</div>
                                        <div className="flex items-center gap-2">
                                            {line.isHighlight && (
                                                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                                                    Mới
                                                </span>
                                            )}
                                            {isUnderperforming && (
                                                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-500/30 flex items-center gap-1">
                                                    <AlertTriangle size={10} />
                                                    KPI
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-xs text-slate-300">
                                        <span>{line.revenue} tỷ / {line.target} tỷ</span>
                                        <span className={percentage >= 100 ? 'text-emerald-400' : 'text-amber-300'}>
                                            {percentage}%
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className={`h-full ${percentage >= 100 ? 'bg-gradient-to-r from-emerald-400 to-lime-400' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                                            style={{ width: `${Math.min(percentage, 120)}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] text-slate-400 uppercase tracking-[0.08em]">Loại sản phẩm</div>
                        {activeLine && (
                            <div className="text-[10px] text-slate-300">
                                {activeLine.name} · {activePercent}% KPI
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-1">
                        {activeLine?.productTypes.map((product) => {
                            const percentage = Math.round((product.revenue / product.target) * 100);
                            const hasWarning = percentage < 70;

                            return (
                                <div
                                    key={product.name}
                                    className="rounded-lg border border-white/10 bg-white/5 p-3 hover:border-cyan-500/40 transition-all backdrop-blur-sm"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h4 className="font-semibold text-white text-sm">{product.name}</h4>
                                            <div className="text-[11px] text-slate-400">Mục tiêu: {product.target} tỷ</div>
                                        </div>
                                        {hasWarning && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/15 text-red-200 border border-red-500/30">
                                                <AlertTriangle size={10} />
                                                Cần đẩy
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative h-3.5 bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 flex items-center justify-end pr-2 text-[10px] font-semibold text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                                            style={{ width: `${Math.min(percentage, 120)}%` }}
                                        >
                                            {product.revenue} tỷ
                                        </div>
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

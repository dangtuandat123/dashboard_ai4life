import React, { useMemo } from 'react';
import { topPerformersHeatmap } from '../data/mockData';

const TopPerformersHeatmap = () => {
    const performers = useMemo(
        () => [...topPerformersHeatmap].sort((a, b) => b.doanhThu - a.doanhThu).slice(0, 5),
        []
    );

    const allValues = performers.flatMap((person) => [person.nhanVon, person.hoatDong, person.doanhThu]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    const getColorIntensity = (value, metric) => {
        const normalized = (value - minValue) / (maxValue - minValue);
        const opacity = 0.2 + normalized * 0.8;

        if (metric === 'nhanVon') return `rgba(34, 211, 238, ${opacity})`;
        if (metric === 'hoatDong') return `rgba(168, 85, 247, ${opacity})`;
        return `rgba(251, 191, 36, ${opacity})`;
    };

    const formatValue = (value, metric) => (metric === 'doanhThu' ? `${value.toFixed(2)} tỷ` : value);

    return (
        <div className="glass rounded-xl p-3 h-full w-full min-w-0 flex flex-col border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em]">Top performers</p>
                    <h3 className="text-sm font-semibold text-white">Heatmap hiệu suất</h3>
                    <p className="text-[10px] text-slate-400">Nhận vốn · Hoạt động · Doanh thu</p>
                </div>
                <div className="text-[9px] text-slate-400 text-right">
                    <div>Đậm màu = hiệu suất cao</div>
                    <div>Nhẹ màu = cần tập trung</div>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                <div className="grid grid-cols-4 gap-1 mb-1">
                    <div className="text-[9px] font-semibold text-slate-500"></div>
                    <div className="text-[9px] font-semibold text-center text-cyan-300">NHẬN VỐN</div>
                    <div className="text-[9px] font-semibold text-center text-purple-300">HOẠT ĐỘNG</div>
                    <div className="text-[9px] font-semibold text-center text-amber-300">DOANH THU</div>
                </div>

                {performers.map((performer) => (
                    <div key={performer.name} className="grid grid-cols-4 gap-1 flex-1">
                        <div className="text-[10px] font-medium text-slate-200 flex items-center truncate">
                            {performer.name}
                        </div>
                        <div
                            className="rounded flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105 cursor-pointer"
                            style={{ backgroundColor: getColorIntensity(performer.nhanVon, 'nhanVon') }}
                        >
                            {formatValue(performer.nhanVon, 'nhanVon')}
                        </div>
                        <div
                            className="rounded flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105 cursor-pointer"
                            style={{ backgroundColor: getColorIntensity(performer.hoatDong, 'hoatDong') }}
                        >
                            {formatValue(performer.hoatDong, 'hoatDong')}
                        </div>
                        <div
                            className="rounded flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105 cursor-pointer"
                            style={{ backgroundColor: getColorIntensity(performer.doanhThu, 'doanhThu') }}
                        >
                            {formatValue(performer.doanhThu, 'doanhThu')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopPerformersHeatmap;

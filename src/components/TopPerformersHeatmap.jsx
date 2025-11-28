import React, { useMemo } from 'react';
import { useDashboardData } from '../data/mockData.jsx';
import { formatVietnameseNumber } from '../utils/formatters';
import { Crown, Medal } from 'lucide-react';

const TopPerformersHeatmap = () => {
    const { topPerformersHeatmap: heatmapData } = useDashboardData();
    const performers = useMemo(
        () => [...(heatmapData.data || [])].sort((a, b) => b.hoatDong - a.hoatDong).slice(0, 4),
        [heatmapData.data]
    );
    const firePrompt = (title, text) => window.dispatchEvent(new CustomEvent('bb-insight', { detail: { title, text } }));

    const allValues = performers.flatMap((person) => [person.hoatDong, person.doanhThu]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    const getColorIntensity = (value, metric) => {
        const normalized = (value - minValue) / (maxValue - minValue);
        const opacity = 0.3 + normalized * 0.7; // Tăng độ đậm tối thiểu lên 0.3

        if (metric === 'hoatDong') return `rgba(168, 85, 247, ${opacity})`;
        return `rgba(251, 191, 36, ${opacity})`;
    };

    const formatValue = (value, metric) => (metric === 'doanhThu' ? formatVietnameseNumber(value) : value);

    const getRankStyle = (index) => {
        switch (index) {
            case 0: // Top 1
                return { color: 'text-yellow-300', icon: <Crown size={14} className="text-yellow-400 mr-1" /> };
            case 1: // Top 2
                return { color: 'text-slate-300', icon: <Medal size={14} className="text-slate-300 mr-1" /> };
            case 2: // Top 3
                return { color: 'text-amber-500', icon: <Medal size={14} className="text-amber-600 mr-1" /> };
            default:
                return { color: 'text-slate-200', icon: null };
        }
    };

    return (
        <div className="glass rounded-xl p-3 h-full w-full min-w-0 flex flex-col border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em]">Nhân viên nổi bật</p>
                    <h3 className="text-sm font-semibold text-white">Bản đồ nhiệt hiệu suất</h3>
                    <p className="text-[10px] text-slate-400">Nhân viên · Hoạt động · Doanh thu</p>
                </div>
                <div className="text-[9px] text-slate-400 text-right">
                    <div>Đậm màu = hiệu suất cao</div>
                    <div>Màu nhạt = cần tập trung</div>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                <div className="grid grid-cols-3 gap-2 mb-1 px-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Nhân viên</div>
                    <div className="text-[10px] font-bold text-center text-purple-300 uppercase">Hoạt động</div>
                    <div className="text-[10px] font-bold text-center text-amber-300 uppercase">Doanh thu</div>
                </div>

                {performers.map((performer, index) => {
                    const rankStyle = getRankStyle(index);
                    return (
                        <div key={performer.name} className="grid grid-cols-3 gap-2 flex-1 items-center">
                            <div className={`text-xs font-bold flex items-center truncate ${rankStyle.color}`}>
                                {rankStyle.icon}
                                {performer.name}
                            </div>
                            <div
                                className="rounded-lg flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105 cursor-pointer h-full shadow-sm"
                                style={{ backgroundColor: getColorIntensity(performer.hoatDong, 'hoatDong') }}
                                onClick={() =>
                                    firePrompt(
                                        'Bản đồ nhiệt hiệu suất',
                                        `${performer.name}: hoạt động ${formatValue(performer.hoatDong, 'hoatDong')}, doanh thu ${formatValue(performer.doanhThu, 'doanhThu')}`
                                    )
                                }
                            >
                                {formatValue(performer.hoatDong, 'hoatDong')}
                            </div>
                            <div
                                className="rounded-lg flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105 cursor-pointer h-full shadow-sm"
                                style={{ backgroundColor: getColorIntensity(performer.doanhThu, 'doanhThu') }}
                                onClick={() =>
                                    firePrompt(
                                        'Bản đồ nhiệt hiệu suất',
                                        `${performer.name}: hoạt động ${formatValue(performer.hoatDong, 'hoatDong')}, doanh thu ${formatValue(performer.doanhThu, 'doanhThu')}`
                                    )
                                }
                            >
                                {formatValue(performer.doanhThu, 'doanhThu')}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TopPerformersHeatmap;

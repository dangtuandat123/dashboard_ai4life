import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { pypPerformanceData } from '../data/mockData';

const PYPPerformance = () => {
    const currentMonth = pypPerformanceData[pypPerformanceData.length - 1];
    const percentageAchieved = Math.round((currentMonth.actual / currentMonth.target) * 100);

    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.08em]">PYP performance</p>
                    <h3 className="text-sm font-semibold text-white">Hiệu suất theo tháng</h3>
                    <p className="text-[10px] text-slate-400">Tháng {currentMonth.month}</p>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500/40 to-cyan-500/40 flex items-center justify-center border border-white/10">
                    <TrendingUp className="w-4 h-4 text-purple-100" />
                </div>
            </div>

            <div className="mb-2 flex items-center gap-2">
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{currentMonth.actual}</span>
                    <span className="text-xs text-slate-300">tỷ</span>
                </div>
                <span className={`text-[10px] font-semibold ${percentageAchieved >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {percentageAchieved}% KPI
                </span>
                <span className="text-[10px] text-slate-500">/ {currentMonth.target} tỷ</span>
            </div>

            <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3 border border-white/5">
                <div
                    className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                    style={{ width: `${Math.min(percentageAchieved, 120)}%` }}
                />
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pypPerformanceData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Bar dataKey="actual" radius={[4, 4, 0, 0]}>
                            {pypPerformanceData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.actual >= entry.target ? '#22d3ee' : '#a855f7'}
                                    opacity={0.9}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PYPPerformance;

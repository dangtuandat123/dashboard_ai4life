import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useDashboardData } from '../data/mockData.jsx';
import { formatVietnameseNumber } from '../utils/formatters';

const PYPPerformance = () => {
    const { pypPerformance } = useDashboardData();
    const pypPerformanceData = pypPerformance.data || [];

    // Lấy tháng hiện tại (tháng cuối cùng có dữ liệu)
    const currentMonth = pypPerformanceData.length > 0
        ? pypPerformanceData[pypPerformanceData.length - 1]
        : { actual: 0, target: 1, month: 'T12' };

    const percentageAchieved = currentMonth.target > 0
        ? Math.round((currentMonth.actual / currentMonth.target) * 100)
        : 0;

    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.08em]">PYP performance</p>
                    <h3 className="text-sm font-semibold text-white">Hiệu suất theo tháng</h3>
                    <p className="text-[10px] text-slate-400">Thực đạt vs Mục tiêu</p>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-white/10">
                    <TrendingUp className="w-4 h-4 text-cyan-300" />
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-white/5 rounded-lg p-2 mb-3 border border-white/5 flex items-center justify-between">
                <div>
                    <div className="text-[10px] text-slate-400 mb-0.5">Tháng {currentMonth.month}</div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-white">{formatVietnameseNumber(currentMonth.actual)}</span>
                        <span className="text-[10px] text-slate-400">/ {formatVietnameseNumber(currentMonth.target)}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-lg font-bold ${percentageAchieved >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {percentageAchieved}%
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Hoàn thành</div>
                </div>
            </div>

            {/* Progress Bar for Current Month */}
            <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4 border border-white/5">
                <div
                    className={`h-full shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-all duration-1000 ${percentageAchieved >= 100
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-amber-500 to-orange-400'
                        }`}
                    style={{ width: `${Math.min(percentageAchieved, 100)}%` }}
                />
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pypPerformanceData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="gradFail" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                                <stop offset="100%" stopColor="#9333ea" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            dy={5}
                        />
                        <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => formatVietnameseNumber(value)}
                            dx={-5}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const pct = data.target > 0 ? Math.round((data.actual / data.target) * 100) : 0;
                                    return (
                                        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-2 rounded-lg shadow-xl">
                                            <p className="text-xs font-bold text-white mb-1">Tháng {label}</p>
                                            <div className="space-y-0.5">
                                                <div className="flex justify-between gap-4 text-[10px]">
                                                    <span className="text-slate-400">Thực đạt:</span>
                                                    <span className="text-cyan-300 font-semibold">{formatVietnameseNumber(data.actual)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4 text-[10px]">
                                                    <span className="text-slate-400">Mục tiêu:</span>
                                                    <span className="text-slate-300 font-semibold">{formatVietnameseNumber(data.target)}</span>
                                                </div>
                                                <div className="pt-1 mt-1 border-t border-slate-800 flex justify-between gap-4 text-[10px]">
                                                    <span className="text-slate-400">Tiến độ:</span>
                                                    <span className={`${pct >= 100 ? 'text-emerald-400' : 'text-amber-400'} font-bold`}>{pct}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="actual" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {pypPerformanceData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.actual >= entry.target ? 'url(#gradSuccess)' : 'url(#gradFail)'}
                                    opacity={1}
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

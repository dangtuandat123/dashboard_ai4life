import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, LabelList } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import { useDashboardData } from '../data/mockData.jsx';
import { formatVietnameseNumber } from '../utils/formatters';

const LoiNhuanRong = () => {
    const { financialData: finData } = useDashboardData();
    const financialData = finData.data || [];

    // Tính toán lợi nhuận và tăng trưởng
    const data = financialData.map((item, index) => {
        const profit = item.revenue - item.cost;
        const prevProfit = index > 0 ? financialData[index - 1].revenue - financialData[index - 1].cost : profit;
        const growth = prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : 0;

        return {
            ...item,
            profit,
            growth: Math.round(growth)
        };
    });

    const currentMonth = data[data.length - 1] || { profit: 0, growth: 0 };

    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em]">Profitability</p>
                    <h3 className="text-sm font-semibold text-white">Lợi nhuận ròng</h3>
                    <p className="text-[10px] text-slate-400">Lợi nhuận & Tăng trưởng</p>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-white/10">
                    <DollarSign className="w-4 h-4 text-emerald-300" />
                </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-3 mb-4">
                <div>
                    <div className="text-2xl font-bold text-white">{formatVietnameseNumber(currentMonth.profit)}</div>
                    <div className={`text-[10px] font-bold flex items-center gap-1 ${currentMonth.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {currentMonth.growth >= 0 ? '+' : ''}{currentMonth.growth}%
                        <span className="text-slate-500 font-normal">so với tháng trước</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 0, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            dy={5}
                        />
                        <YAxis
                            yAxisId="left"
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => formatVietnameseNumber(value)}
                            dx={-5}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}%`}
                            dx={5}
                            hide={true}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-2 rounded-lg shadow-xl">
                                            <p className="text-xs font-bold text-white mb-1">Tháng {label}</p>
                                            <div className="space-y-0.5">
                                                <div className="flex justify-between gap-4 text-[10px]">
                                                    <span className="text-slate-400">Lợi nhuận:</span>
                                                    <span className="text-emerald-300 font-semibold">{formatVietnameseNumber(data.profit)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4 text-[10px]">
                                                    <span className="text-slate-400">Tăng trưởng:</span>
                                                    <span className={`${data.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-semibold`}>
                                                        {data.growth >= 0 ? '+' : ''}{data.growth}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar yAxisId="left" dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={30} fill="url(#gradProfit)">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? 'url(#gradProfit)' : '#f43f5e'} />
                            ))}
                            <LabelList
                                dataKey="profit"
                                position="top"
                                formatter={(value) => formatVietnameseNumber(value)}
                                style={{ fill: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            />
                        </Bar>
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="growth"
                            stroke="#fbbf24"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#1e293b', stroke: '#fbbf24', strokeWidth: 2 }}
                            activeDot={{ r: 7, fill: '#fbbf24' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LoiNhuanRong;

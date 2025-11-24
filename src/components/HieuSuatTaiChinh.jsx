import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useDashboardData } from '../data/mockData.jsx';
import { formatVietnameseNumber } from '../utils/formatters';

const HieuSuatTaiChinh = () => {
    const { financialData: finData } = useDashboardData();
    const financialData = finData.data || [];

    return (
        <div className="glass rounded-xl p-3 h-full min-h-[220px] flex flex-col border border-white/10 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em]">Financials</p>
                    <h3 className="text-sm font-semibold text-white">Hiệu suất tài chính</h3>
                    <p className="text-[10px] text-slate-400">Chi phí vs Doanh thu</p>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                    <TrendingUp className="w-4 h-4 text-emerald-300" />
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#f87171" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => formatVietnameseNumber(value)}
                            dx={-5}
                        />
                        <Tooltip
                            formatter={(value) => formatVietnameseNumber(value)}
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                fontSize: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ padding: '2px 0' }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            iconType="circle"
                            formatter={(value) => <span className="text-slate-300 text-xs font-medium ml-1">{value}</span>}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#34d399"
                            strokeWidth={3}
                            fill="url(#colorRevenue)"
                            name="Doanh thu"
                            dot={{ r: 4, strokeWidth: 2, fill: '#0f172a', stroke: '#34d399' }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                            label={({ x, y, value }) => (
                                <text x={x} y={y} dy={-10} fill="#34d399" fontSize={10} textAnchor="middle" fontWeight="bold">
                                    {formatVietnameseNumber(value)}
                                </text>
                            )}
                        />
                        <Area
                            type="monotone"
                            dataKey="cost"
                            stroke="#f87171"
                            strokeWidth={3}
                            fill="url(#colorCost)"
                            name="Chi phí"
                            dot={{ r: 4, strokeWidth: 2, fill: '#0f172a', stroke: '#f87171' }}
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                            label={({ x, y, value }) => (
                                <text x={x} y={y} dy={15} fill="#f87171" fontSize={10} textAnchor="middle" fontWeight="bold">
                                    {formatVietnameseNumber(value)}
                                </text>
                            )}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default HieuSuatTaiChinh;

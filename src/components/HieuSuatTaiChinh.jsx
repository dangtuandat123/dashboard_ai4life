import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { financialData } from '../data/mockData';

const HieuSuatTaiChinh = () => {
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
                    <AreaChart data={financialData} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0f172a',
                                border: '1px solid #1e293b',
                                borderRadius: '10px',
                                fontSize: '11px'
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} iconType="line" />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#colorRevenue)" name="Doanh thu" />
                        <Area type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} fill="url(#colorCost)" name="Chi phí" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default HieuSuatTaiChinh;

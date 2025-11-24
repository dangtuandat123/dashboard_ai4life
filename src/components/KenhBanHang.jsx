import React, { useMemo } from 'react';
import { Share2 } from 'lucide-react';
import { useDashboardData } from '../data/mockData.jsx';

const KenhBanHang = () => {
    const { salesChannels: channelsData } = useDashboardData();
    const salesChannels = channelsData.data || [];

    const totalValue = useMemo(() => {
        return salesChannels.reduce((sum, item) => sum + (item.value || 0), 0);
    }, [salesChannels]);

    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <Share2 className="w-3.5 h-3.5 text-indigo-300" />
                </div>
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.12em]">Channels</p>
                    <h3 className="text-sm font-semibold text-white">Số lượng theo kênh</h3>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-4">
                {salesChannels.map((channel) => {
                    const percentage = totalValue > 0 ? Math.round((channel.value / totalValue) * 100) : 0;

                    return (
                        <div key={channel.channel} className="space-y-1.5 group">
                            <div className="flex justify-between text-xs items-end">
                                <span className="text-slate-300 font-medium group-hover:text-white transition-colors">
                                    {channel.channel}
                                </span>
                                <div className="text-right">
                                    <span className="text-white font-bold mr-1.5">{channel.value}</span>
                                    <span className="text-[10px] text-slate-400">({percentage}%)</span>
                                </div>
                            </div>
                            <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: channel.color,
                                        boxShadow: `0 0 10px ${channel.color}60`
                                    }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KenhBanHang;

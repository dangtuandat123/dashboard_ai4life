import React from 'react';
import { salesChannels } from '../data/mockData';

const KenhBanHang = () => {
    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="mb-3">
                <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em]">Channels</p>
                <h3 className="text-sm font-semibold text-white">Số lượng theo kênh bán hàng</h3>
                <p className="text-[10px] text-slate-400">Phân bổ số lượng theo từng kênh</p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3">
                {salesChannels.map((channel) => (
                    <div key={channel.channel} className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-200 font-medium">{channel.channel}</span>
                            <span className="text-white font-bold">{channel.value}</span>
                        </div>
                        <div className="h-6 bg-slate-900/40 rounded-full overflow-hidden relative border border-white/5">
                            <div
                                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                style={{
                                    width: `${Math.min(channel.value, 100)}%`,
                                    backgroundColor: channel.color,
                                    boxShadow: `0 0 12px ${channel.color}70`
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KenhBanHang;

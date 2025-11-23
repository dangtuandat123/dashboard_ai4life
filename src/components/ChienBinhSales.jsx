import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { topPerformersList } from '../data/mockData';

const ChienBinhSales = () => {
    const topFive = useMemo(
        () => [...topPerformersList].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
        []
    );

    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                    <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                </div>
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.12em]">Top sales</p>
                    <h3 className="text-sm font-semibold text-white">Chiến binh dẫn đầu</h3>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                {topFive.map((performer) => (
                    <div
                        key={performer.rank}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] cursor-pointer border border-white/10 backdrop-blur-md"
                    >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-base font-bold text-white flex-shrink-0">
                            {performer.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{performer.name}</div>
                            <div className="text-[10px] text-slate-400">Top #{performer.rank}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-yellow-300">
                                {performer.revenue.toFixed(3)} tỷ
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChienBinhSales;

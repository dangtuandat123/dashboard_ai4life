import React from 'react';
import { Trophy, Crown, Medal } from 'lucide-react';
import { useDashboardData } from '../data/mockData.jsx';
import { formatVietnameseNumber } from '../utils/formatters';

const ChienBinhSales = () => {
    const { topPerformersList: performersData } = useDashboardData();
    const topPerformersList = performersData.data || [];

    const getRankStyle = (rank) => {
        switch (rank) {
            case 1:
                return {
                    bg: 'bg-gradient-to-br from-yellow-300 to-yellow-600',
                    border: 'border-yellow-500/50',
                    text: 'text-yellow-300',
                    shadow: 'shadow-yellow-500/20',
                    icon: <Crown size={12} className="text-white" />
                };
            case 2:
                return {
                    bg: 'bg-gradient-to-br from-slate-300 to-slate-500',
                    border: 'border-slate-400/50',
                    text: 'text-slate-300',
                    shadow: 'shadow-slate-500/20',
                    icon: <Medal size={12} className="text-white" />
                };
            case 3:
                return {
                    bg: 'bg-gradient-to-br from-amber-600 to-amber-800',
                    border: 'border-amber-600/50',
                    text: 'text-amber-400',
                    shadow: 'shadow-amber-600/20',
                    icon: <Medal size={12} className="text-white" />
                };
            default:
                return {
                    bg: 'bg-gradient-to-br from-purple-500 to-pink-500',
                    border: 'border-white/10',
                    text: 'text-slate-300',
                    shadow: '',
                    icon: null
                };
        }
    };

    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                    <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                </div>
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.12em]">Bảng xếp hạng doanh số</p>
                    <h3 className="text-sm font-semibold text-white">Bảng vàng vinh danh</h3>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                {topPerformersList.slice(0, 4).map((performer) => {
                    const style = getRankStyle(performer.rank);

                    return (
                        <div
                            key={performer.rank}
                            className={`flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] cursor-pointer border backdrop-blur-md ${style.border} ${performer.rank === 1 ? 'bg-yellow-500/5' : ''}`}
                        >
                            <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center text-base font-bold text-white flex-shrink-0 shadow-lg ${style.shadow} relative`}>
                                {performer.rank <= 3 && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[8px] font-bold border border-slate-200">
                                        {performer.rank}
                                    </div>
                                )}
                                {performer.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                                    {performer.name}
                                    {style.icon && <span className="opacity-80">{style.icon}</span>}
                                </div>
                                <div className={`text-[10px] ${style.text} font-medium`}>Hạng #{performer.rank}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className={`text-sm font-bold ${performer.rank === 1 ? 'text-yellow-300' : 'text-white'}`}>
                                    {formatVietnameseNumber(performer.revenue)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ChienBinhSales;

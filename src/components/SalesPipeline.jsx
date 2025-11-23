import React, { useMemo, useState } from 'react';
import { pipelineStages } from '../data/mockData';

const SalesPipeline = () => {
    const [activeIndex, setActiveIndex] = useState(null);

    const maxCount = Math.max(...pipelineStages.map((d) => d.count));
    const minHeight = 110;
    const maxHeight = 260;
    const svgWidth = 1200;
    const svgHeight = 500;
    const centerY = svgHeight / 2;
    const paddingX = 120;
    const usableWidth = svgWidth - paddingX * 2;
    const segmentWidth = pipelineStages.length > 1 ? usableWidth / (pipelineStages.length - 1) : usableWidth;

    const points = useMemo(
        () =>
            pipelineStages.map((item, index) => {
                const height = minHeight + (item.count / maxCount) * (maxHeight - minHeight);
                const x = paddingX + index * segmentWidth;
                return {
                    x,
                    yTop: centerY - height / 2,
                    yBottom: centerY + height / 2,
                    data: item,
                    height
                };
            }),
        [maxCount]
    );

    const pathD = useMemo(() => {
        if (!points.length) return '';
        let path = `M ${points[0].x} ${points[0].yTop}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const cp1x = p1.x + (p2.x - p1.x) * 0.5;
            const cp2x = p2.x - (p2.x - p1.x) * 0.5;
            path += ` C ${cp1x} ${p1.yTop}, ${cp2x} ${p2.yTop}, ${p2.x} ${p2.yTop}`;
        }

        const lastPt = points[points.length - 1];
        const lastRadius = lastPt.height / 2;
        path += ` A ${lastRadius} ${lastRadius} 0 0 1 ${lastPt.x} ${lastPt.yBottom}`;

        const reversed = [...points].reverse();
        for (let i = 0; i < reversed.length - 1; i++) {
            const p1 = reversed[i];
            const p2 = reversed[i + 1];
            const cp1x = p1.x + (p2.x - p1.x) * 0.5;
            const cp2x = p2.x - (p2.x - p1.x) * 0.5;
            path += ` C ${cp1x} ${p1.yBottom}, ${cp2x} ${p2.yBottom}, ${p2.x} ${p2.yBottom}`;
        }

        const firstPt = points[0];
        const firstRadius = firstPt.height / 2;
        path += ` A ${firstRadius} ${firstRadius} 0 0 1 ${firstPt.x} ${firstPt.yTop}`;
        return `${path} Z`;
    }, [points]);

    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em]">Pipeline</p>
                    <h3 className="text-sm font-semibold text-white">Sales Pipeline</h3>
                    <p className="text-[10px] text-slate-400">Luồng pipeline theo giai đoạn</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-slate-400">Độ phủ</div>
                    <div className="text-sm font-semibold text-white">{maxCount} hồ sơ đỉnh</div>
                </div>
            </div>

            <div className="relative flex-1 min-h-[320px] w-full">
                <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                />

                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full drop-shadow-2xl" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="pipelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            {points.map((pt, i) => (
                                <stop
                                    key={pt.data.id}
                                    offset={`${(i / (points.length - 1)) * 100}%`}
                                    stopColor={pt.data.color}
                                    stopOpacity="0.5"
                                />
                            ))}
                        </linearGradient>
                        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="12" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <path d={pathD} fill="none" stroke="url(#pipelineGradient)" strokeWidth="8" filter="url(#neonGlow)" opacity="0.6" />

                    <path
                        d={pathD}
                        fill="url(#pipelineGradient)"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeOpacity="0.2"
                        className="transition-all duration-500"
                    />

                    <path
                        d={`M ${points[0]?.x || 0} ${centerY} L ${points[points.length - 1]?.x || 0} ${centerY}`}
                        stroke="white"
                        strokeWidth="1"
                        strokeDasharray="6,6"
                        opacity="0.15"
                    />

                    {points.map((pt) => (
                        <line
                            key={`line-${pt.data.id}`}
                            x1={pt.x}
                            y1={centerY - pt.height / 2}
                            x2={pt.x}
                            y2={centerY + pt.height / 2}
                            stroke={pt.data.color}
                            strokeWidth="1"
                            opacity="0.3"
                        />
                    ))}
                </svg>

                <div className="absolute inset-0">
                    {points.map((pt, index) => {
                        const isActive = activeIndex === index;
                        const isDimmed = activeIndex !== null && activeIndex !== index;
                        return (
                            <div
                                key={pt.data.id}
                                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-500 ease-out ${
                                    isDimmed ? 'opacity-30 blur-[1px] scale-95' : 'opacity-100 scale-100'
                                }`}
                                style={{ left: `${(pt.x / svgWidth) * 100}%`, top: '50%' }}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                <div className="relative group cursor-pointer flex flex-col items-center">
                                    <div
                                        className={`absolute inset-0 rounded-full bg-white/30 blur-lg transform scale-150 transition-opacity duration-300 ${
                                            isActive ? 'opacity-100 animate-pulse' : 'opacity-0'
                                        }`}
                                    />

                                    <div
                                        className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center backdrop-blur-xl border-2 shadow-2xl transition-all duration-300 ease-out ${
                                            isActive ? 'scale-125 border-white' : 'hover:scale-110 border-white/20'
                                        }`}
                                        style={{
                                            backgroundColor: `${pt.data.color}20`,
                                            borderColor: isActive ? 'white' : `${pt.data.color}66`,
                                            boxShadow: isActive ? `0 0 40px ${pt.data.color}80` : `0 10px 20px -5px black`
                                        }}
                                    >
                                        <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                            {pt.data.count}
                                        </span>
                                    </div>

                                    <div className={`mt-5 text-center transition-all duration-300 w-32 ${isActive ? 'translate-y-1' : ''}`}>
                                        <p
                                            className={`text-xs md:text-sm font-bold uppercase tracking-widest text-slate-300 mb-2 drop-shadow-md ${
                                                isActive ? 'text-white' : ''
                                            }`}
                                        >
                                            {pt.data.label}
                                        </p>
                                        <div
                                            className={`w-2 h-2 rounded-full mx-auto transition-all duration-300 ${
                                                isActive ? 'w-8 h-1.5 rounded-lg brightness-150' : ''
                                            }`}
                                            style={{ backgroundColor: pt.data.color }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SalesPipeline;

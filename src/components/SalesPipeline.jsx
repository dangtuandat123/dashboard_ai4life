import React, { useMemo, useState } from 'react';
import { useDashboardData } from '../data/mockData.jsx';

const SalesPipeline = () => {
    const [activeIndex, setActiveIndex] = useState(null);
    const { pipelineStages: pipelineData } = useDashboardData();
    const pipelineStages = pipelineData.data || [];

    const maxCount = pipelineStages.length > 0 ? Math.max(...pipelineStages.map((d) => d.count)) : 1;
    const total = pipelineStages.reduce((sum, d) => sum + d.count, 0);
    const issued = pipelineStages[pipelineStages.length - 1]?.count || 0;
    const conversion = total ? Math.round((issued / total) * 100) : 0;

    // SVG Configuration
    const minHeight = 100;
    const maxHeight = 320;
    const svgWidth = 1200;
    const svgHeight = 450;
    const centerY = svgHeight / 2;
    const paddingX = 150;
    const usableWidth = svgWidth - paddingX * 2;
    const segmentWidth = pipelineStages.length > 1 ? usableWidth / (pipelineStages.length - 1) : usableWidth;

    // Calculate points for the pipeline
    const points = useMemo(
        () =>
            pipelineStages.map((item, index) => {
                const height = minHeight + (item.count / maxCount) * (maxHeight - minHeight);
                const x = paddingX + index * segmentWidth;

                // Assign specific neon colors based on stage index
                const colors = [
                    '#3b82f6', // Blue
                    '#8b5cf6', // Purple
                    '#ec4899', // Pink
                    '#f59e0b', // Amber
                    '#10b981'  // Emerald
                ];
                const color = colors[index % colors.length];

                return {
                    x,
                    yTop: centerY - height / 2,
                    yBottom: centerY + height / 2,
                    data: { ...item, color },
                    height
                };
            }),
        [maxCount, pipelineStages]
    );

    // Generate SVG Path
    const pathD = useMemo(() => {
        if (!points.length) return '';
        let path = `M ${points[0].x} ${points[0].yTop}`;

        // Top curve
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const cp1x = p1.x + (p2.x - p1.x) * 0.5;
            const cp2x = p2.x - (p2.x - p1.x) * 0.5;
            path += ` C ${cp1x} ${p1.yTop}, ${cp2x} ${p2.yTop}, ${p2.x} ${p2.yTop}`;
        }

        // Right cap
        const lastPt = points[points.length - 1];
        const lastRadius = lastPt.height / 2;
        path += ` A ${lastRadius} ${lastRadius} 0 0 1 ${lastPt.x} ${lastPt.yBottom}`;

        // Bottom curve (reversed)
        const reversed = [...points].reverse();
        for (let i = 0; i < reversed.length - 1; i++) {
            const p1 = reversed[i];
            const p2 = reversed[i + 1];
            const cp1x = p1.x + (p2.x - p1.x) * 0.5;
            const cp2x = p2.x - (p2.x - p1.x) * 0.5;
            path += ` C ${cp1x} ${p1.yBottom}, ${cp2x} ${p2.yBottom}, ${p2.x} ${p2.yBottom}`;
        }

        // Left cap
        const firstPt = points[0];
        const firstRadius = firstPt.height / 2;
        path += ` A ${firstRadius} ${firstRadius} 0 0 1 ${firstPt.x} ${firstPt.yTop}`;
        return `${path} Z`;
    }, [points]);

    const firePrompt = (title, text) => {
        window.dispatchEvent(new CustomEvent('bb-insight', { detail: { title, text } }));
    };

    return (
        <div className="glass rounded-xl p-5 h-full flex flex-col border border-white/10 backdrop-blur-md relative overflow-hidden">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between gap-2 relative z-10">
                <div>
                    <p className="text-xs text-emerald-400 uppercase tracking-[0.15em] font-bold">Phễu bán hàng</p>
                    <h3 className="text-lg font-bold text-white mt-1">Hành trình chuyển đổi</h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                        Tổng: <span className="text-white font-bold text-sm">{total}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        Chuyển đổi: <span className="font-bold text-sm">{conversion}%</span>
                    </div>
                </div>
            </div>

            {/* Visualization Area */}
            <div className="relative flex-1 w-full min-h-0 flex items-center justify-center py-4">

                {/* Background Grid */}
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />

                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full drop-shadow-2xl" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {/* Main Gradient for the Pipeline Body */}
                        <linearGradient id="pipelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            {points.map((pt, i) => (
                                <stop
                                    key={`stop-${i}`}
                                    offset={`${(i / (points.length - 1)) * 100}%`}
                                    stopColor={pt.data.color}
                                    stopOpacity="0.6"
                                />
                            ))}
                        </linearGradient>

                        {/* Glow Filter */}
                        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Outer Glow Layer */}
                    <path
                        d={pathD}
                        fill="none"
                        stroke="url(#pipelineGradient)"
                        strokeWidth="4"
                        filter="url(#neonGlow)"
                        opacity="0.5"
                    />

                    {/* Main Pipeline Body */}
                    <path
                        d={pathD}
                        fill="url(#pipelineGradient)"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="1"
                        className="transition-all duration-500"
                        style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}
                    />

                    {/* Center Dashed Line */}
                    <path
                        d={`M ${points[0]?.x || 0} ${centerY} L ${points[points.length - 1]?.x || 0} ${centerY}`}
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                    />

                    {/* Vertical Lines at Nodes */}
                    {points.map((pt) => (
                        <line
                            key={`line-${pt.data.id}`}
                            x1={pt.x}
                            y1={centerY - pt.height / 2}
                            x2={pt.x}
                            y2={centerY + pt.height / 2}
                            stroke={pt.data.color}
                            strokeWidth="1"
                            opacity="0.4"
                            strokeDasharray="2,2"
                        />
                    ))}
                </svg>

                {/* Interactive Nodes Overlay */}
                <div className="absolute inset-0">
                    {points.map((pt, index) => {
                        const isActive = activeIndex === index;
                        const isDimmed = activeIndex !== null && activeIndex !== index;

                        return (
                            <div
                                key={pt.data.id}
                                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-500 ${isDimmed ? 'opacity-30 blur-[1px]' : 'opacity-100'}`}
                                style={{ left: `${(pt.x / svgWidth) * 100}%`, top: '50%' }}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                                onClick={() =>
                                    firePrompt(
                                        'Sales Pipeline',
                                        `Giai đoạn ${pt.data.label || pt.data.name || pt.data.stage}: ${pt.data.count} hồ sơ (tổng ${total} lead)`
                                    )
                                }
                            >
                                {/* The Node Circle */}
                                <div className="relative group cursor-pointer">
                                    {/* Pulse Ring */}
                                    <div
                                        className={`absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 ${isActive ? 'opacity-100 animate-ping' : ''}`}
                                        style={{ backgroundColor: pt.data.color }}
                                    />

                                    {/* Main Circle */}
                                    <div
                                        className={`w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md border-2 transition-all duration-300 ${isActive ? 'scale-125 border-white' : 'hover:scale-110 border-white/30'}`}
                                        style={{
                                            backgroundColor: `${pt.data.color}33`,
                                            borderColor: isActive ? 'white' : `${pt.data.color}66`,
                                            boxShadow: isActive ? `0 0 30px ${pt.data.color}` : `0 4px 15px rgba(0,0,0,0.3)`
                                        }}
                                    >
                                        <span className="text-xl font-bold text-white drop-shadow-md">
                                            {pt.data.count}
                                        </span>
                                    </div>
                                </div>

                                {/* Info Label (Below) */}
                                <div
                                    className={`absolute top-20 text-center transition-all duration-300 w-40 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-[-5px] opacity-80'}`}
                                >
                                    <p
                                        className="text-xs font-bold uppercase tracking-widest mb-1"
                                        style={{ color: isActive ? pt.data.color : '#cbd5e1' }}
                                    >
                                        {pt.data.label}
                                    </p>
                                    {isActive && (
                                        <div className="text-[11px] text-white font-bold bg-slate-800/90 px-3 py-1 rounded-full inline-block backdrop-blur border border-white/10">
                                            {Math.round((pt.data.count / points[0].data.count) * 100)}% giữ lại
                                        </div>
                                    )}
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

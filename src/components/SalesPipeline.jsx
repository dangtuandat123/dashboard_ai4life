import React, { useMemo, useState } from 'react';
import { pipelineStages } from '../data/mockData';

const SalesPipeline = () => {
    const [hoveredStage, setHoveredStage] = useState(null);

    const width = 100;
    const height = 100;
    const maxCount = Math.max(...pipelineStages.map((stage) => stage.count));

    const stagePositions = useMemo(() => {
        const positions = [];
        const segmentWidth = pipelineStages.length > 1 ? width / (pipelineStages.length - 1) : width;

        pipelineStages.forEach((stage, index) => {
            const x = index * segmentWidth;
            const heightPercent = (stage.count / maxCount) * 50;
            positions.push({ x, y: 50, height: heightPercent, ...stage });
        });

        return positions;
    }, [maxCount]);

    const createPipelinePath = () => {
        if (stagePositions.length === 0) return '';

        let topPath = '';
        let bottomPath = '';

        stagePositions.forEach((pos, index) => {
            const topY = pos.y - pos.height / 2;
            const bottomY = pos.y + pos.height / 2;

            if (index === 0) {
                topPath = `M 0,${topY}`;
                bottomPath = `M 0,${bottomY}`;
            }

            if (index < stagePositions.length - 1) {
                const nextPos = stagePositions[index + 1];
                const nextTopY = nextPos.y - nextPos.height / 2;
                const nextBottomY = nextPos.y + nextPos.height / 2;
                const controlPointX = (pos.x + nextPos.x) / 2;

                topPath += ` C ${controlPointX},${topY} ${controlPointX},${nextTopY} ${nextPos.x},${nextTopY}`;
                bottomPath += ` C ${controlPointX},${bottomY} ${controlPointX},${nextBottomY} ${nextPos.x},${nextBottomY}`;
            }
        });

        const lastPos = stagePositions[stagePositions.length - 1];
        const lastTopY = lastPos.y - lastPos.height / 2;
        const lastBottomY = lastPos.y + lastPos.height / 2;
        topPath += ` L ${width},${lastTopY}`;
        bottomPath += ` L ${width},${lastBottomY}`;

        const reversedBottom = bottomPath.split(' ').reverse().join(' ');
        return `${topPath} ${reversedBottom} Z`;
    };

    const gradient = (
        <defs>
            <linearGradient id="pipelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {pipelineStages.map((stage, index) => (
                    <stop
                        key={stage.id}
                        offset={`${(index / (pipelineStages.length - 1 || 1)) * 100}%`}
                        stopColor={stage.color}
                        stopOpacity="0.6"
                    />
                ))}
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
    );

    return (
        <div className="glass rounded-xl p-3 h-full relative overflow-hidden border border-white/10 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em]">Pipeline</p>
                    <h3 className="text-sm font-semibold text-white">Sales Pipeline</h3>
                    <p className="text-[10px] text-slate-400">Biến động pipeline theo giai đoạn</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-slate-400">Độ phủ</div>
                    <div className="text-sm font-semibold text-white">{maxCount} hồ sơ đỉnh</div>
                </div>
            </div>

            <div className="relative h-[calc(100%-60px)]">
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox={`0 0 ${width} ${height}`}>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#475569" strokeWidth="0.5" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    {gradient}
                    <path d={createPipelinePath()} fill="url(#pipelineGradient)" filter="url(#glow)" opacity="0.35" />
                    <path d={createPipelinePath()} fill="url(#pipelineGradient)" opacity="0.55" stroke="url(#pipelineGradient)" strokeWidth="0.5" />
                </svg>

                <div className="absolute inset-0">
                    {stagePositions.map((pos) => (
                        <div
                            key={pos.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                            style={{
                                left: `${(pos.x / width) * 100}%`,
                                top: '50%',
                                opacity: hoveredStage === null || hoveredStage === pos.id ? 1 : 0.3,
                                transform:
                                    hoveredStage === pos.id
                                        ? 'translate(-50%, -50%) scale(1.12)'
                                        : 'translate(-50%, -50%) scale(1)'
                            }}
                            onMouseEnter={() => setHoveredStage(pos.id)}
                            onMouseLeave={() => setHoveredStage(null)}
                        >
                            <div className="flex flex-col items-center gap-1 cursor-pointer">
                                <div
                                    className="rounded-full px-3 py-1 font-bold text-sm shadow-lg transition-all text-slate-900"
                                    style={{
                                        backgroundColor: pos.color,
                                        boxShadow: hoveredStage === pos.id ? `0 0 20px ${pos.color}80` : 'none'
                                    }}
                                >
                                    {pos.count}
                                </div>
                                <div className="text-[10px] font-medium text-center text-white whitespace-nowrap px-2 py-0.5 rounded bg-slate-900/70 backdrop-blur-sm border border-white/5">
                                    {pos.label}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SalesPipeline;

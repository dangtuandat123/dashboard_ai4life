import React, { useMemo, useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { useDashboardData } from '../data/mockData.jsx';
import { formatVietnameseNumber } from '../utils/formatters';

const SoLuongBan = () => {
    const { salesQuantity: quantityData } = useDashboardData();
    const salesQuantityData = quantityData.data || [];
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const treemapData = useMemo(
        () =>
            salesQuantityData.map((item, index) => {
                const percentage = (item.sold / item.target) * 100;

                let gradientFrom;
                let gradientTo;
                let glowColor;

                // Color based on ranking (index 0 = best seller)
                if (index === 0) {
                    // #1 Best seller - Vibrant purple to pink gradient
                    gradientFrom = '#a855f7';
                    gradientTo = '#ec4899';
                    glowColor = 'rgba(168, 85, 247, 0.5)';
                } else if (index === 1) {
                    // #2 - Cyan to blue gradient
                    gradientFrom = '#06b6d4';
                    gradientTo = '#3b82f6';
                    glowColor = 'rgba(6, 182, 212, 0.4)';
                } else if (percentage >= 90) {
                    // High performance - Green gradient
                    gradientFrom = '#10b981';
                    gradientTo = '#059669';
                    glowColor = 'rgba(16, 185, 129, 0.4)';
                } else if (percentage >= 70) {
                    // Good performance - Orange gradient
                    gradientFrom = '#f59e0b';
                    gradientTo = '#d97706';
                    glowColor = 'rgba(245, 158, 11, 0.4)';
                } else {
                    // Low performance - Red gradient
                    gradientFrom = '#ef4444';
                    gradientTo = '#dc2626';
                    glowColor = 'rgba(239, 68, 68, 0.4)';
                }

                return {
                    name: item.type,
                    size: item.sold,
                    sold: item.sold,
                    target: item.target,
                    percentage: percentage.toFixed(1),
                    gradientFrom,
                    gradientTo,
                    glowColor,
                    index
                };
            }),
        [salesQuantityData]
    );

    const CustomContent = (props) => {
        const { x, y, width, height, name, sold, percentage, gradientFrom, gradientTo, glowColor, index } = props;

        if (width < 35 || height < 25) return null;

        const isHovered = hoveredIndex === index;
        const gradientId = `gradient-${index}`;

        return (
            <g onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} style={{ cursor: 'pointer' }}>
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={gradientFrom} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={gradientTo} stopOpacity={0.8} />
                    </linearGradient>
                    <filter id={`glow-${index}`}>
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {isHovered && <rect x={x - 2} y={y - 2} width={width + 4} height={height + 4} fill={glowColor} rx={6} filter={`url(#glow-${index})`} />}

                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={gradientFrom}
                    stroke={isHovered ? gradientTo : '#1e293b'}
                    strokeWidth={isHovered ? 3 : 1}
                    rx={4}
                    opacity={isHovered ? 1 : 0.95}
                    style={{
                        transition: 'all 0.3s ease',
                        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                        transformOrigin: `${x + width / 2}px ${y + height / 2}px`,
                        filter: 'brightness(1.1) saturate(1.2)'
                    }}
                />

                <text x={x + width / 2} y={y + height / 2 - 12} textAnchor="middle" fill="#fff" fontSize={width > 90 ? 11 : 9} fontWeight="600" style={{ pointerEvents: 'none' }}>
                    {name}
                </text>
                <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill="#fff" fontSize={width > 90 ? 18 : 14} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                    {formatVietnameseNumber(sold)}
                </text>
                <text x={x + width / 2} y={y + height / 2 + 20} textAnchor="middle" fill="#e2e8f0" fontSize={width > 90 ? 10 : 8} fontWeight="500" style={{ pointerEvents: 'none' }}>
                    {percentage}%
                </text>
            </g>
        );
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="tooltip-card rounded-lg p-3 shadow-xl">
                    <p className="text-sm font-bold text-white mb-2">{data.name}</p>
                    <div className="space-y-1">
                        <p className="text-xs text-slate-300">
                            Đã bán: <span className="font-bold text-cyan-400">{formatVietnameseNumber(data.sold)}</span>
                        </p>
                        <p className="text-xs text-slate-300">
                            Mục tiêu: <span className="font-bold text-slate-100">{formatVietnameseNumber(data.target)}</span>
                        </p>
                        <p className="text-xs text-slate-300">
                            Hoàn thành: <span className="font-bold text-yellow-400">{data.percentage}%</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass rounded-xl p-3 h-full flex flex-col border border-white/10 backdrop-blur-md">
            <div className="mb-2">
                <p className="text-[10px] text-emerald-400 uppercase tracking-[0.1em]">Số lượng</p>
                <h3 className="text-sm font-semibold text-white">Số lượng bán</h3>
                <p className="text-[10px] text-slate-400">5 dòng bán chạy nhất theo loại sản phẩm</p>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap data={treemapData} dataKey="size" stroke="transparent" content={<CustomContent />}>
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                    </Treemap>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SoLuongBan;

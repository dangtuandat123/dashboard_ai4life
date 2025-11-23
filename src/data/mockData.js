// Mock data cho dashboard

// PYP Performance Data - 6 months
export const pypPerformanceData = [
    { month: 'T7', actual: 65, target: 70 },
    { month: 'T8', actual: 75, target: 75 },
    { month: 'T9', actual: 85, target: 80 },
    { month: 'T10', actual: 72, target: 85 },
    { month: 'T11', actual: 90, target: 90 },
    { month: 'T12', actual: 58, target: 95 }
];

// Sales Pipeline Data
export const pipelineStages = [
    { id: 1, label: 'Leads mới', count: 20, color: '#3b82f6' },
    { id: 2, label: 'Đang tư vấn', count: 85, color: '#6366f1' },
    { id: 3, label: 'Đang chốt', count: 100, color: '#a855f7' },
    { id: 4, label: 'Thẩm định', count: 18, color: '#f97316' },
    { id: 5, label: 'Phát hành', count: 12, color: '#14b8a6' }
];

// Top Performers Heatmap Data
export const topPerformersHeatmap = [
    { name: 'Nguyễn Văn A', nhanVon: 140, hoatDong: 115, doanhThu: 1.2 },
    { name: 'Trần Thị B', nhanVon: 120, hoatDong: 112, doanhThu: 0.96 },
    { name: 'Lê Hoàng C', nhanVon: 90, hoatDong: 91, doanhThu: 0.835 },
    { name: 'Phạm Minh D', nhanVon: 80, hoatDong: 81, doanhThu: 0.72 },
    { name: 'Hoàng Yến E', nhanVon: 70, hoatDong: 72, doanhThu: 0.655 }
];

// Chiến Binh Sales - Top Performers List
export const topPerformersList = [
    { rank: 1, name: 'Nguyễn Văn A', revenue: 1.2, avatar: 'A' },
    { rank: 2, name: 'Trần Thị B', revenue: 0.96, avatar: 'B' },
    { rank: 3, name: 'Lê Văn C', revenue: 0.835, avatar: 'C' },
    { rank: 4, name: 'Phạm Thái D', revenue: 0.72, avatar: 'D' },
    { rank: 5, name: 'Hoàng Yến E', revenue: 0.655, avatar: 'E' }
];

// Financial Performance Data - Cost vs Revenue
export const financialData = [
    { month: 'T1', revenue: 450, cost: 280 },
    { month: 'T2', revenue: 520, cost: 310 },
    { month: 'T3', revenue: 480, cost: 295 },
    { month: 'T4', revenue: 610, cost: 340 },
    { month: 'T5', revenue: 680, cost: 380 },
    { month: 'T6', revenue: 720, cost: 400 },
    { month: 'T7', revenue: 650, cost: 365 },
    { month: 'T8', revenue: 590, cost: 350 }
];

// Sales Channels Data
export const salesChannels = [
    { channel: 'Hội thảo', value: 85, color: '#f97316' },
    { channel: 'Tư vấn 1-1', value: 55, color: '#8b5cf6' }
];

// Product Lines with Revenue
export const productLines = [
    {
        id: 1,
        name: 'Bảo vệ Gia Đình',
        revenue: 120,
        target: 150,
        isHighlight: false,
        productTypes: [
            { name: 'Tai nạn', revenue: 45, target: 50 },
            { name: '100 Bệnh hiểm nghèo', revenue: 50, target: 60 },
            { name: 'Giáo dục', revenue: 25, target: 40 }
        ]
    },
    {
        id: 2,
        name: 'Bảo vệ Hiệu quả',
        revenue: 85,
        target: 100,
        isHighlight: true,
        productTypes: [
            { name: 'Bảo vệ sức khỏe', revenue: 40, target: 50 },
            { name: 'Đầu tư dài hạn', revenue: 30, target: 30 },
            { name: 'Giáo dục đại học', revenue: 15, target: 20 }
        ]
    },
    {
        id: 3,
        name: 'Gói Hoàn tiền Linh hoạt',
        revenue: 95,
        target: 120,
        isHighlight: false,
        productTypes: [
            { name: 'Hoàn tiền hàng năm', revenue: 55, target: 70 },
            { name: 'Tích lũy dài hạn', revenue: 40, target: 50 }
        ]
    },
    {
        id: 4,
        name: 'Gói Hoàn tiền Tăng trưởng',
        revenue: 60,
        target: 80,
        isHighlight: true,
        productTypes: [
            { name: 'Hoàn tiền tức thì', revenue: 35, target: 45 },
            { name: 'Bảo vệ toàn diện', revenue: 25, target: 35 }
        ]
    },
    {
        id: 5,
        name: 'Gói Hoàn tiền Trước hạn',
        revenue: 72,
        target: 90,
        isHighlight: false,
        productTypes: [
            { name: 'Linh hoạt rút tiền', revenue: 42, target: 50 },
            { name: 'Thưởng sống', revenue: 30, target: 40 }
        ]
    }
];

// Sales Quantity Data by Product Type
export const salesQuantityData = [
    { type: 'Tai nạn', sold: 120, target: 150 },
    { type: 'Bệnh hiểm nghèo', sold: 95, target: 100 },
    { type: 'Giáo dục', sold: 80, target: 90 },
    { type: 'Sức khỏe', sold: 110, target: 130 },
    { type: 'Hoàn tiền', sold: 85, target: 100 }
];

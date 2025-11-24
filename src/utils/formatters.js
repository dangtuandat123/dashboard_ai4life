export const formatVietnameseNumber = (value) => {
    if (!value) return '0';

    const absValue = Math.abs(value);

    if (absValue >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)} tỷ`;
    }
    if (absValue >= 1000000) {
        return `${(value / 1000000).toFixed(1)} tr`;
    }
    if (absValue >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
    }

    return value.toString();
};

export const formatCurrency = (value) => {
    return formatVietnameseNumber(value);
};

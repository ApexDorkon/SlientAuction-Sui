const SUI_DECIMALS = 9;

export function formatBalance(rawAmount: string | number | undefined | null): string {
    if (rawAmount === undefined || rawAmount === null) return "0";
    
    const amount = typeof rawAmount === 'string' ? Number(rawAmount) : rawAmount;
    if (isNaN(amount)) return "0";

    // Convert from MIST to SUI (divide by 10^9)
    const val = amount / Math.pow(10, SUI_DECIMALS);

    // Format with commas and max 4 decimal places for readability
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 4,
        minimumFractionDigits: 0,
    }).format(val);
}

export function parseInputToMist(input: string): number {
    return Math.floor(Number(input) * Math.pow(10, SUI_DECIMALS));
}
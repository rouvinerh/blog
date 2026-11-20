export function byDate(left: { date?: string }, right: { date?: string }): number {
    return (right.date ?? '').localeCompare(left.date ?? '');
}

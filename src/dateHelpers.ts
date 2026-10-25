export function getWeekStart(): Date {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	today.setDate(today.getDate() - today.getDay());
	return today;
}

export function isToday(date: Date | null): boolean {
	if (!date) return false;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const target = new Date(date);
	target.setHours(0, 0, 0, 0);

	return target.getTime() === today.getTime();
}

export function isThisWeek(date: Date | null): boolean {
	if (!date) return false;

	return date >= getWeekStart() && date <= new Date();
}

export function parseDate(value: unknown): Date | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === 'string') {
		const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

		if (match) {
			const [, year, month, day] = match;
			return new Date(Number(year), Number(month) - 1, Number(day));
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	if (typeof value === 'number') {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	return null;
}

export function formatLastDone(daysAgo: number | null): string {
	if (daysAgo === null) return 'Never';
	if (daysAgo === 0) return 'Today';
	if (daysAgo === 1) return 'Yesterday';

	return `${daysAgo} days ago`;
}
export function formatLastDone(lastDone: string | null): string {
	if (!lastDone) return 'Never';

	const daysAgo = window
		.moment()
		.startOf('day')
		.diff(window.moment(lastDone).startOf('day'), 'days');

	if (daysAgo === 0) return 'Today';
	if (daysAgo === 1) return 'Yesterday';

	return `${daysAgo} days ago`;
}

export function formatDuration(minutes: number): string {
	if (minutes < 60) return `${minutes} min`;

	return `${minutes / 60} hr${minutes > 60 ? 's' : ''}`;
}

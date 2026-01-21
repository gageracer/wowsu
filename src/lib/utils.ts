import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function formatDate(dateString: string | number): string {
	return format(new Date(dateString), 'MMMM d, yyyy', { locale: tr });
}

export function formatDateTime(dateString: string | number): string {
	return format(new Date(dateString), 'MMM d, yyyy HH:mm');
}

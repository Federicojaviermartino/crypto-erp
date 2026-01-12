import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';

@Pipe({
  name: 'appDate',
  standalone: true
})
export class AppDatePipe implements PipeTransform {
  /**
   * Formats dates consistently across the application
   * @param value - Date to format
   * @param format - 'short' (01/12/2026), 'medium' (01 Dec 2026), 'long' (01 December 2026), 'time' (01/12/2026 14:30)
   */
  transform(
    value: Date | string | number | null | undefined,
    format: 'short' | 'medium' | 'long' | 'time' | 'relative' = 'short'
  ): string {
    if (!value) return '-';

    try {
      const date = new Date(value);

      if (isNaN(date.getTime())) return '-';

      const formats: Record<string, string> = {
        short: 'dd/MM/yyyy',
        medium: 'dd MMM yyyy',
        long: 'dd MMMM yyyy',
        time: 'dd/MM/yyyy HH:mm'
      };

      if (format === 'relative') {
        return this.getRelativeTime(date);
      }

      return formatDate(date, formats[format], 'en-GB');
    } catch {
      return '-';
    }
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(date, 'dd/MM/yyyy', 'en-GB');
  }
}

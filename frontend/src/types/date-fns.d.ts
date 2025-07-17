import { formatDistanceToNow } from 'date-fns';

declare module 'date-fns' {
  function formatDistanceToNow(
    date: Date | number | string,
    options?: {
      includeSeconds?: boolean;
      addSuffix?: boolean;
      locale?: Locale;
    }
  ): string;
}

import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Royal Fade` : 'Royal Fade | Premium Barber Studio';
  }, [title]);
}

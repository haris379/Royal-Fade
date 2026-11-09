import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../lib/api.js';

/** Runs an async loader on mount (and when deps change). Returns { data, loading, error, reload }. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    run().then((data) => alive && setState({ data, loading: false, error: '' }))
      .catch((e) => alive && setState({ data: null, loading: false, error: errorMessage(e) }));
    return () => { alive = false; };
  }, [run, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

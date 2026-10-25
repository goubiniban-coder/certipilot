"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

/** Re-renders whenever the IndexedDB data read by `query` changes. */
export function useLiveQuery<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({ next: setValue, error: console.error });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

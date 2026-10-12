"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Album } from "@/app/lib/albums";

const COLLECTION_STORAGE_KEY = "vinylwall-collection";
const EMPTY_COLLECTION = "[]";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps other open tabs in sync.
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStoredCollection() {
  try {
    return (
      window.localStorage.getItem(COLLECTION_STORAGE_KEY) ?? EMPTY_COLLECTION
    );
  } catch {
    return EMPTY_COLLECTION;
  }
}

function parseCollection(serialized: string): Album[] {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as Album[]) : [];
  } catch {
    return [];
  }
}

// The collection lives in localStorage; this hook reads it as an external
// store so the server render and first client render agree (both empty).
export function useCollection() {
  const serialized = useSyncExternalStore(
    subscribe,
    readStoredCollection,
    () => EMPTY_COLLECTION,
  );
  const collection = useMemo(() => parseCollection(serialized), [serialized]);

  const updateCollection = useCallback(
    (update: (currentAlbums: Album[]) => Album[]) => {
      const nextAlbums = update(parseCollection(readStoredCollection()));

      try {
        window.localStorage.setItem(
          COLLECTION_STORAGE_KEY,
          JSON.stringify(nextAlbums),
        );
      } catch {
        // Storage is full or blocked; the change can't be kept.
        return;
      }

      listeners.forEach((listener) => listener());
    },
    [],
  );

  return [collection, updateCollection] as const;
}

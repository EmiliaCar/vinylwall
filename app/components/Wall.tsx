"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { Record, Sleeve } from "@/app/components/Record";
import type { Album, WallTemplate } from "@/app/lib/albums";

type WallProps = {
  template: WallTemplate;
  albums: Album[];
  ref?: Ref<HTMLDivElement>;
};

// How far the disc pokes out of its sleeve, relative to the sleeve width.
const DISC_PEEK = 0.22;

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

// Renders at the template's exact CSS size so the preview and the exported
// PNG are the same image.
export function Wall({ template, albums, ref }: WallProps) {
  const { width, height, rows, perRow, layout } = template;
  const visibleAlbums = albums.slice(0, rows * perRow);

  return (
    <div ref={ref} className="wall" style={{ width, height }}>
      {visibleAlbums.length === 0 ? (
        <p className="wall-empty">Your records will appear here</p>
      ) : layout === "grid" ? (
        <GridLayout template={template} albums={visibleAlbums} />
      ) : (
        <ShelfLayout template={template} albums={visibleAlbums} />
      )}
    </div>
  );
}

function ShelfLayout({ template, albums }: Omit<WallProps, "ref">) {
  const { width, height, rows, perRow } = template;
  const isTall = height > width;

  // Leave room at the top of phone wallpapers for the lock screen clock.
  const paddingX = width * 0.07;
  const paddingTop = height * (isTall ? 0.26 : 0.1);
  const paddingBottom = height * (isTall ? 0.06 : 0.1);

  const innerWidth = width - paddingX * 2;
  const rowSpace = (height - paddingTop - paddingBottom) / rows;
  const gap = 0.36;

  const recordSize = Math.floor(
    Math.min(
      innerWidth / (perRow + (perRow - 1) * gap + DISC_PEEK),
      rowSpace / 1.32,
    ),
  );
  const shelfWidth =
    recordSize * (perRow + (perRow - 1) * gap + DISC_PEEK);
  const albumRows = chunk(albums, perRow);

  return (
    <div
      className="flex flex-col items-center justify-around"
      style={{ height: "100%", padding: `${paddingTop}px ${paddingX}px ${paddingBottom}px` }}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={{ width: shelfWidth }}>
          <div
            className="flex items-end"
            style={{ gap: recordSize * gap, height: recordSize }}
          >
            {(albumRows[rowIndex] ?? []).map((album) => (
              <div
                key={album.id}
                className="shrink-0"
                style={{ width: recordSize }}
              >
                <Record album={album} />
              </div>
            ))}
          </div>

          <div
            className="wall-ledge"
            style={{
              height: Math.max(6, recordSize * 0.08),
              margin: `0 -${recordSize * 0.12}px`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function GridLayout({ template, albums }: Omit<WallProps, "ref">) {
  const padding = template.width * 0.04;

  return (
    <div
      className="grid h-full"
      style={{
        padding,
        gap: padding * 0.35,
        gridTemplateColumns: `repeat(${template.perRow}, 1fr)`,
        gridTemplateRows: `repeat(${template.rows}, 1fr)`,
      }}
    >
      {albums.map((album) => (
        <div key={album.id} className="record-sleeve">
          <Sleeve album={album} />
        </div>
      ))}
    </div>
  );
}

// Scales a fixed-size child down to fit the available width (and maxHeight).
export function ScaledFrame({
  width,
  height,
  maxHeight,
  children,
}: {
  width: number;
  height: number;
  maxHeight: number;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const scale = availableWidth
    ? Math.min(availableWidth / width, maxHeight / height, 1)
    : 0;

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="mx-auto overflow-hidden rounded-2xl shadow-2xl shadow-black/50"
        style={{
          width: width * scale,
          height: height * scale,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        <div
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

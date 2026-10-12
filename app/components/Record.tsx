"use client";

import { useState, type CSSProperties } from "react";
import { albumHue, coverUrl, type Album } from "@/app/lib/albums";

type RecordProps = {
  album: Album;
  coverSize?: 250 | 500;
  showDisc?: boolean;
};

export function Sleeve({ album, coverSize = 500 }: Omit<RecordProps, "showDisc">) {
  const [hasCoverFailed, setHasCoverFailed] = useState(false);
  const hue = albumHue(album.id);

  if (hasCoverFailed) {
    // Not every release group has art on Cover Art Archive, so draw one.
    return (
      <div
        className="sleeve-fallback"
        style={{ "--hue": hue } as CSSProperties}
      >
        <span className="sleeve-fallback-title">{album.title}</span>
        <span className="sleeve-fallback-artist">{album.artist}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by our own cover proxy; next/image would re-encode it
    <img
      src={coverUrl(album.id, coverSize)}
      alt={`${album.title} by ${album.artist}`}
      className="h-full w-full object-cover"
      onError={() => setHasCoverFailed(true)}
    />
  );
}

export function Record({ album, coverSize = 500, showDisc = true }: RecordProps) {
  return (
    <div
      className="record"
      style={{ "--label-hue": albumHue(album.id) } as CSSProperties}
    >
      {showDisc && (
        <div className="record-disc" aria-hidden="true">
          <span className="record-label" />
        </div>
      )}

      <div className="record-sleeve">
        <Sleeve album={album} coverSize={coverSize} />
      </div>
    </div>
  );
}

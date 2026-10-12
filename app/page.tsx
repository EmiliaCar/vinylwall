"use client";

import { toPng } from "html-to-image";
import { useRef, useState, type FormEvent } from "react";
import { Record, Sleeve } from "@/app/components/Record";
import { ScaledFrame, Wall } from "@/app/components/Wall";
import {
  TEMPLATES,
  type Album,
  type TemplateId,
} from "@/app/lib/albums";
import { useCollection } from "@/app/lib/useCollection";

export default function Home() {
  const [albumQuery, setAlbumQuery] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [results, setResults] = useState<Album[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");

  const [collection, setCollection] = useCollection();

  const [templateId, setTemplateId] = useState<TemplateId>("desktop");
  const [isExporting, setIsExporting] = useState(false);
  const wallRef = useRef<HTMLDivElement>(null);

  const template = TEMPLATES[templateId];
  const capacity = template.rows * template.perRow;

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const album = albumQuery.trim();
    const artist = artistQuery.trim();

    if (!album && !artist) {
      setError("Enter an album, an artist, or both.");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setError("");

    try {
      const parameters = new URLSearchParams();

      if (album) {
        parameters.set("album", album);
      }

      if (artist) {
        parameters.set("artist", artist);
      }

      const response = await fetch(`/api/search?${parameters}`);

      if (!response.ok) {
        throw new Error("The album search could not be completed.");
      }

      const data: { albums: Album[] } = await response.json();
      setResults(data.albums);
    } catch {
      setResults([]);
      setError("Something went wrong while searching. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  function isInCollection(albumId: string) {
    return collection.some((album) => album.id === albumId);
  }

  function addAlbum(album: Album) {
    setCollection((currentAlbums) =>
      currentAlbums.some((currentAlbum) => currentAlbum.id === album.id)
        ? currentAlbums
        : [...currentAlbums, album],
    );
  }

  function removeAlbum(albumId: string) {
    setCollection((currentAlbums) =>
      currentAlbums.filter((album) => album.id !== albumId),
    );
  }

  function moveAlbum(index: number, direction: -1 | 1) {
    setCollection((currentAlbums) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= currentAlbums.length) {
        return currentAlbums;
      }

      const reordered = [...currentAlbums];
      [reordered[index], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[index],
      ];
      return reordered;
    });
  }

  async function downloadWallpaper() {
    const wall = wallRef.current;

    if (!wall) {
      return;
    }

    setIsExporting(true);
    setError("");

    try {
      await Promise.all(
        Array.from(wall.querySelectorAll("img")).map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                image.onload = image.onerror = resolve;
              }),
        ),
      );

      const dataUrl = await toPng(wall, {
        width: template.width,
        height: template.height,
        pixelRatio: template.pixelRatio,
        backgroundColor: "#1a1410",
      });

      const outputWidth = template.width * template.pixelRatio;
      const outputHeight = template.height * template.pixelRatio;
      const downloadLink = document.createElement("a");
      downloadLink.download = `vinylwall-${outputWidth}x${outputHeight}.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();
    } catch (exportError) {
      console.error(exportError);
      setError("The wallpaper could not be generated.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-12">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-amber">
          Your personal record shelf
        </p>

        <h1 className="font-display text-7xl leading-none sm:text-9xl">
          Vinylwall
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
          Find the albums that shaped you, line them up on a shelf, and take
          them with you as a wallpaper for your desktop, your phone, or your
          feed.
        </p>
      </section>

      <section
        aria-labelledby="search-heading"
        className="mx-auto max-w-6xl px-6"
      >
        <div className="rounded-3xl border border-line bg-panel p-6 sm:p-8">
          <h2 id="search-heading" className="font-display text-4xl">
            Find a record
          </h2>

          <p className="mt-2 text-muted">
            Search by album, artist, or both for better results.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <label htmlFor="album-title" className="sr-only">
              Album
            </label>
            <input
              id="album-title"
              type="search"
              value={albumQuery}
              onChange={(event) => setAlbumQuery(event.target.value)}
              placeholder="Album — optional"
              className="min-w-0 rounded-full border border-line bg-background px-5 py-3 outline-none transition placeholder:text-muted/60 focus:border-amber focus:ring-2 focus:ring-amber/20"
            />

            <label htmlFor="album-artist" className="sr-only">
              Artist
            </label>
            <input
              id="album-artist"
              type="search"
              value={artistQuery}
              onChange={(event) => setArtistQuery(event.target.value)}
              placeholder="Artist — optional"
              className="min-w-0 rounded-full border border-line bg-background px-5 py-3 outline-none transition placeholder:text-muted/60 focus:border-amber focus:ring-2 focus:ring-amber/20"
            />

            <button
              type="submit"
              disabled={isSearching}
              className="rounded-full bg-amber px-6 py-3 font-semibold text-background transition hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </form>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-red-950/60 p-4 text-red-200"
            >
              {error}
            </p>
          )}

          {hasSearched && !isSearching && !error && results.length === 0 && (
            <p className="mt-5 text-muted">No records were found.</p>
          )}

          {results.length > 0 && (
            <ul className="mt-8 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {results.map((album) => {
                const isAdded = isInCollection(album.id);

                return (
                  <li key={album.id} className="flex flex-col">
                    <div className="pr-[14%]">
                      <Record album={album} coverSize={250} />
                    </div>

                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber">
                      {album.year ?? "Year unknown"}
                    </p>
                    <h3 className="mt-1 font-semibold leading-snug">
                      {album.title}
                    </h3>
                    <p className="mt-1 mb-4 text-sm text-muted">{album.artist}</p>

                    <button
                      type="button"
                      onClick={() => addAlbum(album)}
                      disabled={isAdded}
                      className="mt-auto w-full rounded-full border border-amber px-4 py-2 text-sm font-semibold text-amber transition hover:bg-amber hover:text-background disabled:cursor-default disabled:border-line disabled:text-muted disabled:hover:bg-transparent"
                    >
                      {isAdded ? "On your wall" : "Add to wall"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section
        aria-labelledby="wall-heading"
        className="mx-auto max-w-6xl px-6 py-20"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber">
              Your collection
            </p>
            <h2 id="wall-heading" className="mt-2 font-display text-5xl">
              My wall
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="radiogroup"
              aria-label="Wallpaper format"
              className="flex rounded-full border border-line bg-panel p-1"
            >
              {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={templateId === id}
                  onClick={() => setTemplateId(id)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-muted transition hover:text-foreground aria-checked:bg-foreground aria-checked:text-background"
                >
                  {TEMPLATES[id].label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={downloadWallpaper}
              disabled={isExporting || collection.length === 0}
              className="rounded-full bg-amber px-6 py-3 font-semibold text-background transition hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? "Pressing your wallpaper..." : "Download wallpaper"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted">
          {template.description} PNG ·{" "}
          {Math.min(collection.length, capacity)} of {capacity} slots filled
          {collection.length > capacity &&
            ` · ${collection.length - capacity} more in your crate`}
        </p>

        <div className="mt-8">
          <ScaledFrame
            width={template.width}
            height={template.height}
            maxHeight={templateId === "desktop" ? 700 : 640}
          >
            <Wall ref={wallRef} template={template} albums={collection} />
          </ScaledFrame>
        </div>

        {collection.length > 0 && (
          <div className="mt-16">
            <h3 className="font-display text-3xl">The crate</h3>
            <p className="mt-1 text-sm text-muted">
              Reorder records to choose which ones make it onto the wall.
            </p>

            <ol className="mt-6 divide-y divide-line rounded-2xl border border-line bg-panel">
              {collection.map((album, index) => (
                <li key={album.id}>
                  {index === capacity && (
                    <p className="bg-background/60 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-amber">
                      Not on the {template.label.toLowerCase()} wall
                    </p>
                  )}

                  <div
                    className={`flex items-center gap-4 px-5 py-3 ${index >= capacity ? "opacity-50" : ""}`}
                  >
                    <span className="w-6 text-right text-sm tabular-nums text-muted">
                      {index + 1}
                    </span>

                    <div className="size-12 shrink-0">
                      <div className="record-sleeve">
                        <Sleeve album={album} coverSize={250} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{album.title}</p>
                      <p className="truncate text-sm text-muted">
                        {album.artist}
                        {album.year && ` · ${album.year}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => moveAlbum(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${album.title} up`}
                        className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-line hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAlbum(index, 1)}
                        disabled={index === collection.length - 1}
                        aria-label={`Move ${album.title} down`}
                        className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-line hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAlbum(album.id)}
                        aria-label={`Remove ${album.title}`}
                        className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-red-900 hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </main>
  );
}

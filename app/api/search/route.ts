import type { NextRequest } from "next/server";
import type { Album } from "@/app/lib/albums";

type MusicBrainzReleaseGroup = {
  id: string;
  title: string;
  "first-release-date"?: string;
  "artist-credit"?: { name: string; joinphrase?: string }[];
};

type MusicBrainzResponse = {
  "release-groups": MusicBrainzReleaseGroup[];
};

// MusicBrainz asks every client to identify itself.
// https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
const USER_AGENT = "Vinylwall/0.1 ( https://github.com/EmiliaCar/vinylwall )";

function escapeLucene(value: string) {
  return value.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, "\\$1");
}

export async function GET(request: NextRequest) {
  const album = request.nextUrl.searchParams.get("album")?.trim() ?? "";
  const artist = request.nextUrl.searchParams.get("artist")?.trim() ?? "";

  if (!album && !artist) {
    return Response.json(
      { error: "Enter an album, an artist, or both." },
      { status: 400 },
    );
  }

  const clauses = ["(primarytype:album OR primarytype:ep)"];

  if (album) {
    clauses.push(`releasegroup:"${escapeLucene(album)}"`);
  }

  if (artist) {
    clauses.push(`artist:"${escapeLucene(artist)}"`);
  }

  // Browsing an artist's catalogue: hide live albums, compilations and demos
  // so studio albums come first. A title search still finds everything.
  if (!album) {
    clauses.push("NOT secondarytype:*");
  }

  const parameters = new URLSearchParams({
    query: clauses.join(" AND "),
    fmt: "json",
    limit: "15",
  });

  const searchUrl = `https://musicbrainz.org/ws/2/release-group/?${parameters}`;
  const requestInit = {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  };
  let response = await fetch(searchUrl, requestInit);

  // 503 means we went over the one-request-per-second limit; wait and retry.
  if (response.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    response = await fetch(searchUrl, requestInit);
  }

  if (!response.ok) {
    return Response.json(
      { error: "The album search could not be completed." },
      { status: 502 },
    );
  }

  const data: MusicBrainzResponse = await response.json();

  const albums: Album[] = data["release-groups"].map((releaseGroup) => ({
    id: releaseGroup.id,
    title: releaseGroup.title,
    artist:
      releaseGroup["artist-credit"]
        ?.map((credit) => credit.name + (credit.joinphrase ?? ""))
        .join("") || "Unknown artist",
    year: releaseGroup["first-release-date"]?.slice(0, 4) || undefined,
  }));

  return Response.json({ albums });
}

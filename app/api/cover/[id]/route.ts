import type { NextRequest } from "next/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SIZES = new Set(["250", "500", "1200"]);

// Proxies Cover Art Archive so covers are served from our own origin.
// That keeps the wallpaper canvas untainted when html-to-image exports it.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/cover/[id]">,
) {
  const { id } = await context.params;
  const size = request.nextUrl.searchParams.get("size") ?? "500";

  if (!UUID_PATTERN.test(id) || !SIZES.has(size)) {
    return new Response("Invalid cover request", { status: 400 });
  }

  const coverArtUrl = `https://coverartarchive.org/release-group/${id}/front-${size}`;
  let response = await fetch(coverArtUrl);

  // archive.org sometimes fails under a burst of requests; one retry is
  // usually enough. A 404 means the album really has no cover.
  if (!response.ok && response.status !== 404) {
    response = await fetch(coverArtUrl);
  }

  if (!response.ok || !response.body) {
    return new Response("Cover not found", {
      status: response.status === 404 ? 404 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}

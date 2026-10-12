export type Album = {
  id: string;
  title: string;
  artist: string;
  year?: string;
};

export type TemplateId = "desktop" | "phone" | "square";

export type WallTemplate = {
  label: string;
  description: string;
  width: number;
  height: number;
  pixelRatio: number;
  rows: number;
  perRow: number;
  layout: "shelves" | "grid";
};

// Width and height are CSS pixels; multiplied by pixelRatio they give the
// exported PNG size.
export const TEMPLATES: Record<TemplateId, WallTemplate> = {
  desktop: {
    label: "Desktop",
    description: "3024 × 1964",
    width: 1512,
    height: 982,
    pixelRatio: 2,
    rows: 3,
    perRow: 7,
    layout: "shelves",
  },
  phone: {
    label: "Phone",
    description: "1170 × 2532",
    width: 390,
    height: 844,
    pixelRatio: 3,
    rows: 5,
    perRow: 3,
    layout: "shelves",
  },
  square: {
    label: "Square post",
    description: "1080 × 1080",
    width: 1080,
    height: 1080,
    pixelRatio: 1,
    rows: 3,
    perRow: 3,
    layout: "grid",
  },
};

export function coverUrl(albumId: string, size: 250 | 500 = 500) {
  return `/api/cover/${albumId}?size=${size}`;
}

// Stable hue per album, used for the record label and the fallback sleeve.
export function albumHue(albumId: string) {
  let hash = 0;

  for (const character of albumId) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360;
  }

  return hash;
}

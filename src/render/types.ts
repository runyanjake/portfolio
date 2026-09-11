/**
 * The view-model a display renders.
 *
 * This is the boundary that keeps displays independent of the schema:
 * Listing maps entries into these, and a display renders whichever
 * fields happen to be present. Adding a frontmatter field cannot break a
 * display, and a display can be swapped for another without touching
 * content.
 */
export interface Item {
  /** Where the card points — the entry's own page, or its `link:`. */
  url: string;
  /** True when `url` leaves the site, so the display can mark it. */
  external?: boolean;
  title: string;
  excerpt?: string;
  date?: Date;
  image?: ImageMetadata | string;
  imageAlt?: string;
}

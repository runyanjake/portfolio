/**
 * View-model passed from section index pages to display components.
 * Displays are collection-agnostic — they render whatever fields are
 * present. The mapping from CollectionEntry to IndexItem lives on each
 * section's index.astro page.
 */
export interface IndexItem {
  url: string;
  title: string;
  excerpt?: string;
  date?: Date;
  cover?: ImageMetadata;
  coverAlt?: string;
  image?: ImageMetadata | string;
  imageAlt?: string;
  website?: string;
}

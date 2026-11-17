export type CarouselItem = { src: string; alt: string };

export type Category = {
  id: string;
  label: string;
  /** Aspect ratio (width / height) the covers are cropped to inside the carousel. */
  aspect: number;
  items: CarouselItem[];
};

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

function toItems(files: Record<string, string>, label: string): CarouselItem[] {
  return Object.keys(files)
    .sort(natural)
    .map((key, i) => ({ src: files[key], alt: `${label} ${String(i + 1).padStart(2, "0")}` }));
}

// Editable: drop new files into src/assets with the same prefix and they appear automatically.
const banners = import.meta.glob<string>("./assets/banneranime*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});
const youtube = import.meta.glob<string>("./assets/youtube*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});
const music = import.meta.glob<string>("./assets/music*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});
const flyers = import.meta.glob<string>("./assets/flayers*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});

export const categories: Category[] = [
  { id: "banners", label: "BANNERS", aspect: 3, items: toItems(banners, "Banner anime") },
  { id: "youtube", label: "YOUTUBE", aspect: 16 / 9, items: toItems(youtube, "Thumbnail YouTube") },
  { id: "music", label: "MÚSICA", aspect: 3, items: toItems(music, "Banner de música") },
  { id: "flyers", label: "FLYERS", aspect: 0.72, items: toItems(flyers, "Flyer") },
];

export const contact = {
  instagram: "https://www.instagram.com/kajikobo/",
  instagramHandle: "@KAJIKOBO",
  email: "kajikobang2830@gmail.com",
  whatsappNumber: "51920083316",
  whatsappDisplay: "+51 920 083 316",
};

export const whatsappLink = (text?: string) =>
  `https://wa.me/${contact.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const mailLink = (subject?: string, body?: string) => {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString().replace(/\+/g, "%20");
  return `mailto:${contact.email}${qs ? `?${qs}` : ""}`;
};

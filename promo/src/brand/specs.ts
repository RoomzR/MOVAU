export type BrandVariant =
  | "avatar-ink"
  | "avatar-volt"
  | "avatar-shift"
  | "banner-hero"
  | "banner-cover"
  | "banner-og"
  | "ad-help"
  | "ad-shift"
  | "ad-map"
  | "story-help"
  | "story-shift"
  | "story-logo"
  | "wordmark-white"
  | "wordmark-black";

export type BrandSpec = {
  id: string;
  file: string;
  variant: BrandVariant;
  width: number;
  height: number;
  transparent?: boolean;
};

export const BRAND_SPECS: BrandSpec[] = [
  { id: "AvatarInk", file: "avatar-ink-800.png", variant: "avatar-ink", width: 800, height: 800 },
  { id: "AvatarVolt", file: "avatar-volt-800.png", variant: "avatar-volt", width: 800, height: 800 },
  { id: "AvatarShift", file: "avatar-shift-800.png", variant: "avatar-shift", width: 800, height: 800 },
  { id: "AvatarInk512", file: "avatar-ink-512.png", variant: "avatar-ink", width: 512, height: 512 },
  { id: "BannerTelegram", file: "banner-telegram-1280x720.png", variant: "banner-hero", width: 1280, height: 720 },
  { id: "BannerYoutube", file: "banner-youtube-2560x1440.png", variant: "banner-hero", width: 2560, height: 1440 },
  { id: "ShareOg", file: "share-og-1200x630.png", variant: "banner-og", width: 1200, height: 630 },
  { id: "CoverVk", file: "cover-vk-1590x400.png", variant: "banner-cover", width: 1590, height: 400 },
  { id: "CoverX", file: "cover-x-1500x500.png", variant: "banner-cover", width: 1500, height: 500 },
  { id: "AdHelpWide", file: "ad-help-1920x1080.png", variant: "ad-help", width: 1920, height: 1080 },
  { id: "AdHelpSquare", file: "ad-help-1080x1080.png", variant: "ad-help", width: 1080, height: 1080 },
  { id: "AdShiftSquare", file: "ad-shift-1080x1080.png", variant: "ad-shift", width: 1080, height: 1080 },
  { id: "AdMapSquare", file: "ad-map-1080x1080.png", variant: "ad-map", width: 1080, height: 1080 },
  { id: "StoryHelp", file: "story-help-1080x1920.png", variant: "story-help", width: 1080, height: 1920 },
  { id: "StoryShift", file: "story-shift-1080x1920.png", variant: "story-shift", width: 1080, height: 1920 },
  { id: "StoryLogo", file: "story-logo-1080x1920.png", variant: "story-logo", width: 1080, height: 1920 },
  {
    id: "WordmarkWhite",
    file: "wordmark-white.png",
    variant: "wordmark-white",
    width: 1786,
    height: 484,
    transparent: true,
  },
  {
    id: "WordmarkBlack",
    file: "wordmark-black.png",
    variant: "wordmark-black",
    width: 1786,
    height: 484,
    transparent: true,
  },
];

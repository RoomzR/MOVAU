import { loadFont as loadOnest } from "@remotion/google-fonts/Onest";
import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";

export const { fontFamily: unbounded } = loadUnbounded("normal", {
  weights: ["800"],
  subsets: ["cyrillic", "latin"],
});

export const { fontFamily: onest } = loadOnest("normal", {
  weights: ["400", "600", "700"],
  subsets: ["cyrillic", "latin"],
});

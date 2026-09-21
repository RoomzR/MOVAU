export const FPS = 30;
export const FADE = 12;

export const HOOK = 260;
export const PROBLEM = 293;
export const STEPS = 414;
export const COUNTRY = 219;
export const CTA = 237;

export const DURATION = HOOK + PROBLEM + STEPS + COUNTRY + CTA - FADE * 4;

export const VOICEOVER = [
  "voiceover/01-hook.mp3",
  "voiceover/02-problem.mp3",
  "voiceover/03-steps.mp3",
  "voiceover/04-country.mp3",
  "voiceover/05-cta.mp3",
] as const;

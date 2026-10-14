/**
 * Every cookie and browser-storage item Kollects uses, by consent category. Shown in the
 * cookie preferences dialog and on the Privacy page; update it whenever storage changes.
 */
export type CookieCategory = "necessary" | "analytics" | "marketing";

export interface CookieEntry {
  name: string;
  purpose: string;
  duration: string;
  kind: "Cookie" | "Local storage";
}

export const COOKIE_CATEGORIES: { id: CookieCategory; title: string; description: string; entries: CookieEntry[] }[] = [
  {
    id: "necessary",
    title: "Strictly necessary",
    description: "Needed for the site to work, so they can't be turned off.",
    entries: [
      { name: "accessToken", purpose: "Keeps you signed in (secure, httpOnly)", duration: "7 days (token valid 10 minutes)", kind: "Cookie" },
      { name: "refreshToken", purpose: "Renews your sign-in without asking again (secure, httpOnly)", duration: "7 days", kind: "Cookie" },
      { name: "kollects_consent", purpose: "Remembers your cookie choices", duration: "6 months", kind: "Cookie" },
      { name: "auth-storage", purpose: "Remembers who is signed in on this device", duration: "Until you sign out", kind: "Local storage" },
      { name: "kollects_session_*", purpose: "Stops the same browser answering a poll or form twice", duration: "Until cleared", kind: "Local storage" },
      { name: "kollects_pending_*", purpose: "Keeps your answers safe while you sign in to submit", duration: "Until submitted", kind: "Local storage" },
      { name: "theme, dismissed notices", purpose: "Your light/dark theme and banners you closed", duration: "Until cleared", kind: "Local storage" },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    description:
      "Helps us understand how Kollects is used: which pages people visit, which sites send them here, and what device they use. Never your name, email, or poll and form answers.",
    entries: [
      { name: "kl_vid", purpose: "Random, anonymous ID that recognises a returning browser", duration: "13 months", kind: "Cookie" },
      { name: "kl_sid", purpose: "Groups page views into one visit", duration: "30 minutes of inactivity", kind: "Cookie" },
    ],
  },
  {
    id: "marketing",
    title: "Campaign attribution",
    description:
      "Remembers which campaign, search engine or website first brought you to Kollects, so we can tell which channels lead to sign-ups. Only used when Analytics is also on. Not used for advertising and never shared.",
    entries: [
      { name: "kl_ft", purpose: "Where your first visit came from (campaign tags, referring site, landing page)", duration: "13 months", kind: "Cookie" },
      { name: "kl_lt", purpose: "The most recent campaign or site that brought you here", duration: "30 days", kind: "Cookie" },
    ],
  },
];

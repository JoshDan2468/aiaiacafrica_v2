export const navigation = [
  { label: "About", to: "/about" },
  { label: "Conferences", to: "/conferences" },
  { label: "Speakers", to: "/speakers" },
  { label: "Exhibition", to: "/exhibition" },
  { label: "Sponsorship", to: "/sponsorship" },
  { label: "Media", to: "/media" },
  { label: "Contact", to: "/contact" },
] as const;

export const footerNavigation = [
  ...navigation,
  { label: "Registration", to: "/registration" },
] as const;

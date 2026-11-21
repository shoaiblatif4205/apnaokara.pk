// Apna Okara brand. Used by website (Tailwind) and mobile app (theme).

export const brand = {
  name: { en: 'Apna Okara', ur: 'اپنا اوکاڑہ' },
  domain: 'apnaokara.pk',
  tagline: {
    en: 'The local marketplace of Okara, Sahiwal and Pakpattan',
    ur: 'اوکاڑہ، ساہیوال اور پاکپتن کا اپنا بازار',
  },
  colors: {
    primary: '#15803D', // green: buttons, links, logo
    primaryDark: '#166534',
    primaryLight: '#DCFCE7',
    accent: '#C2410C', // orange: Post Ad, Featured (passes contrast with white text)
    accentBright: '#F97316', // orange: icons, decorative only
    accentLight: '#FFEDD5',
    text: '#1F2937',
    textMuted: '#4B5563',
    border: '#E5E7EB',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    danger: '#B91C1C',
    warningBg: '#FEF3C7',
    warningText: '#92400E',
  },
} as const;

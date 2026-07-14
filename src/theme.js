// reunItD mobile design tokens — single source of truth.
// Minimal-modern: flat surfaces, one accent blue, soft shadows, no emojis.
export const colors = {
  primary:      '#2563eb',
  primaryDark:  '#1e40af',
  primaryFaint: '#eff6ff',

  ink:          '#0f172a', // headings
  text:         '#334155', // body
  muted:        '#64748b', // secondary
  faint:        '#94a3b8', // placeholders

  bg:           '#f8fafc', // app background
  card:         '#ffffff',
  border:       '#e2e8f0',
  inputBg:      '#f8fafc',

  danger:       '#dc2626',
  dangerFaint:  '#fef2f2',
  dangerBorder: '#fecaca',
  success:      '#16a34a',
  successFaint: '#f0fdf4',
  warning:      '#d97706',
  warningFaint: '#fffbeb',
};

export const radii = { sm: 10, md: 14, lg: 20, pill: 999 };

export const shadow = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
};

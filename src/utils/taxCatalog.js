export const COSTA_RICA_TAX_OPTIONS = [
  {
    code: 'tax-exempt',
    label: 'Exento',
    shortLabel: 'Exento',
    rate: 0,
    description: 'Productos o compras exentas de IVA.',
  },
  {
    code: 'iva-13',
    label: 'IVA 13%',
    shortLabel: 'IVA 13%',
    rate: 0.13,
    description: 'Tarifa general del impuesto al valor agregado.',
  },
  {
    code: 'iva-4',
    label: 'IVA 4%',
    shortLabel: 'IVA 4%',
    rate: 0.04,
    description: 'Tarifa reducida usada en casos específicos.',
  },
  {
    code: 'iva-2',
    label: 'IVA 2%',
    shortLabel: 'IVA 2%',
    rate: 0.02,
    description: 'Tarifa reducida para algunos bienes y servicios puntuales.',
  },
  {
    code: 'iva-1',
    label: 'IVA 1%',
    shortLabel: 'IVA 1%',
    rate: 0.01,
    description: 'Tarifa mínima aplicable a ciertos supuestos fiscales.',
  },
  {
    code: 'other',
    label: 'Otro impuesto',
    shortLabel: 'Otro',
    rate: 0,
    description: 'Permite registrar manualmente un monto distinto por línea.',
  },
];

export const DEFAULT_INGREDIENT_CATEGORIES = [
  'General',
  'Proteínas',
  'Lácteos',
  'Vegetales',
  'Frutas',
  'Secos y granos',
  'Salsas y condimentos',
  'Bebidas',
  'Desechables',
  'Limpieza',
];

export const getTaxOptionByCode = (code) =>
  COSTA_RICA_TAX_OPTIONS.find((option) => option.code === code) || COSTA_RICA_TAX_OPTIONS[0];

export const buildSlug = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * Formatea un número a colones costarricenses con símbolo ₡
 * @param {number} valor
 * @returns {string} Ejemplo: "₡1,500"
 */
export function formatCurrency(valor) {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0
    }).format(valor);
  }
  
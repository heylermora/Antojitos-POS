import { getOrderDisplayNumber, getOrderEventDate } from '../services/orderService';
import { formatCurrency } from './formatCurrency';

const escapeCsv = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const getPaymentLines = (order) => {
  const payments = Array.isArray(order?.paymentMethod) && order.paymentMethod.length
    ? order.paymentMethod
    : [{ paymentMethod: order?.paymentMethod || 'Otro', amount: Number(order?.total || 0) }];

  return payments.map((payment) => {
    const reference = payment.reference?.trim();
    const amount = Number(payment.amount || 0);
    return `${payment.paymentMethod || 'Otro'} · ${formatCurrency(amount)}${reference ? ` · Ref: ${reference}` : ''}`;
  });
};

export const buildSalesCsv = (orders = []) => {
  const headers = [
    'Ticket',
    'Fecha',
    'Cliente',
    'Telefono',
    'Servicio',
    'Total',
    'Recibido',
    'Vuelto',
    'MetodosPago',
    'Notas',
    'Items',
  ];

  const rows = orders.map((order) => {
    const eventDate = getOrderEventDate(order);
    const items = (order.items || []).map((item) => `${item.quantity}x ${item.name}`).join(' | ');
    const paymentSummary = order.paymentSummary || {};
    return [
      getOrderDisplayNumber(order),
      eventDate ? eventDate.toLocaleString('es-CR') : '',
      order.customerName || '',
      order.customerPhone || '',
      order.serviceType || 'Salón',
      Number(order.total || 0).toFixed(2),
      Number(paymentSummary.totalTendered ?? order.total ?? 0).toFixed(2),
      Number(paymentSummary.changeGiven || 0).toFixed(2),
      getPaymentLines(order).join(' | '),
      order.orderNotes || '',
      items,
    ].map(escapeCsv).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const computeCashClosure = (orders = []) => {
  const methods = {};
  const totals = orders.reduce((acc, order) => {
    const total = Number(order.total || 0);
    const tendered = Number(order.paymentSummary?.totalTendered ?? total);
    const change = Number(order.paymentSummary?.changeGiven || 0);

    const payments = Array.isArray(order?.paymentMethod) && order.paymentMethod.length
      ? order.paymentMethod
      : [{ paymentMethod: order?.paymentMethod || 'Otro', amount: total }];

    payments.forEach((payment) => {
      const method = payment.paymentMethod || 'Otro';
      methods[method] = (methods[method] || 0) + Number(payment.amount || 0);
    });

    acc.totalSales += total;
    acc.totalTendered += tendered;
    acc.totalChange += change;
    return acc;
  }, {
    totalSales: 0,
    totalTendered: 0,
    totalChange: 0,
  });

  return {
    count: orders.length,
    totalSales: totals.totalSales,
    totalTendered: totals.totalTendered,
    totalChange: totals.totalChange,
    netCollected: totals.totalTendered - totals.totalChange,
    methods: Object.entries(methods)
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value),
  };
};

export const buildPrintableTicketHtml = (order) => {
  const eventDate = getOrderEventDate(order);
  const payments = getPaymentLines(order)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');
  const items = (order.items || [])
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}</td>
        <td style="text-align:right;">${escapeHtml(formatCurrency(item.price * item.quantity))}</td>
      </tr>`)
    .join('');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(getOrderDisplayNumber(order))}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
      h1, h2, p { margin: 0 0 8px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      td { padding: 6px 0; border-bottom: 1px solid #ddd; vertical-align: top; }
      .muted { color: #666; }
      .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 12px; }
    </style>
  </head>
  <body>
    <h1>Ticket interno</h1>
    <p><strong>${escapeHtml(getOrderDisplayNumber(order))}</strong></p>
    <p class="muted">${escapeHtml(eventDate ? eventDate.toLocaleString('es-CR') : 'Sin fecha')}</p>
    <p>Cliente: ${escapeHtml(order.customerName || '—')}</p>
    <p>Teléfono: ${escapeHtml(order.customerPhone || '—')}</p>
    <p>Servicio: ${escapeHtml(order.serviceType || 'Salón')}</p>
    <p>Notas: ${escapeHtml(order.orderNotes || '—')}</p>
    <table>
      <tbody>
        ${items}
      </tbody>
    </table>
    <div class="total">Total: ${escapeHtml(formatCurrency(order.total || 0))}</div>
    <h2>Pagos</h2>
    <ul>${payments}</ul>
  </body>
</html>`;
};

import { buildPrintableTicketHtml, buildSalesCsv, computeCashClosure, getPaymentLines } from './salesReporting';

describe('salesReporting helpers', () => {
  const order = {
    id: 'abc123',
    orderNumber: 'TKT-20260319-ABC1',
    customerName: 'Ana',
    customerPhone: '8888-9999',
    serviceType: 'Para llevar',
    orderNotes: 'Sin cebolla',
    total: 2500,
    createdAt: '2026-03-19T12:00:00.000Z',
    paymentMethod: [
      { paymentMethod: 'Efectivo', amount: 2000 },
      { paymentMethod: 'Sinpe', amount: 500, reference: 'REF-77' },
    ],
    paymentSummary: {
      totalTendered: 2600,
      totalApplied: 2500,
      changeGiven: 100,
      paymentCount: 2,
    },
    items: [
      { name: 'Casado', quantity: 1, price: 2500 },
    ],
  };

  it('formats payment lines including references', () => {
    expect(getPaymentLines(order)).toEqual([
      'Efectivo · ₡2 000',
      'Sinpe · ₡500 · Ref: REF-77',
    ]);
  });

  it('builds a csv export with headers and order data', () => {
    const csv = buildSalesCsv([order]);

    expect(csv).toContain('Ticket,Fecha,Cliente,Telefono,Servicio,Total,Recibido,Vuelto,MetodosPago,Notas,Items');
    expect(csv).toContain('TKT-20260319-ABC1');
    expect(csv).toContain('Ana');
    expect(csv).toContain('Sinpe · ₡500 · Ref: REF-77');
  });

  it('computes cash closure totals from payments and summaries', () => {
    expect(computeCashClosure([order])).toEqual({
      count: 1,
      totalSales: 2500,
      totalTendered: 2600,
      totalChange: 100,
      netCollected: 2500,
      methods: [
        { name: 'Efectivo', value: 2000 },
        { name: 'Sinpe', value: 500 },
      ],
    });
  });

  it('builds printable ticket html with metadata and payments', () => {
    const html = buildPrintableTicketHtml(order);

    expect(html).toContain('Ticket interno');
    expect(html).toContain('TKT-20260319-ABC1');
    expect(html).toContain('Para llevar');
    expect(html).toContain('REF-77');
  });
});

/**
 * 📊 SalesHistoryPage – Historial de ventas por día
 *
 * Muestra las órdenes pagadas agrupadas por fecha, con totales por método
 * de pago y desglose de productos por orden. Incluye modal para detalle.
 *
 * Funcionalidades:
 * - Agrupación de órdenes por día
 * - Resumen por método de pago
 * - Tabla con hora, método, total y botón de detalle
 * - Modal con desglose de productos por venta
 */

import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, CircularProgress,
} from '@mui/material';
import {Visibility, ReceiptLong} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatCurrency';
import { getOrderDisplayNumber, getOrderEventDate, getPaidOrdersGroupedByDay } from '../services/orderService';
import PageTitle from '../components/Titles/PageTitle';

const getResumenPorMetodo = (orders = []) =>
  orders.reduce((acc, order) => {
    if (Array.isArray(order.paymentMethod)) {
      order.paymentMethod.forEach(p => {
        const metodo = p.paymentMethod || 'Otro';
        const monto = Number(p.amount || 0);
        acc[metodo] = (acc[metodo] || 0) + monto;
      });
    } else {
      const metodo = order.paymentMethod || 'Otro';
      acc[metodo] = (acc[metodo] || 0) + order.total;
    }
    return acc;
  }, {});

const formatTime = (value) => (value ? value.toLocaleString('es-CR', { hour: '2-digit', minute: '2-digit' }) : '—');

const formatDateTime = (order) => {
  const date = getOrderEventDate(order);
  return date ? date.toLocaleString('es-CR') : '—';
};

const formatPaymentDetails = (payments = []) => {
  if (!Array.isArray(payments) || !payments.length) return ['Otro'];

  return payments.map((payment) => {
    const reference = payment.reference?.trim();
    const amount = Number(payment.amount || 0);
    return `${payment.paymentMethod || 'Otro'} · ${formatCurrency(amount)}${reference ? ` · Ref: ${reference}` : ''}`;
  });
};

const SalesHistoryPage = () => {
  const [history, setHistory] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const grouped = await getPaidOrdersGroupedByDay();
      setHistory(grouped);
      setIsLoading(false);
      console.log('[SalesHistoryPage] history loaded:', grouped);
    })();
  }, []);

  const dates = Object.keys(history); // ya vienen ordenadas desde el servicio

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2}>      
      <PageTitle
        title="Historial de Ventas"
        subtitle="Registro diario de ventas"
        icon={ReceiptLong}
      />

      {dates.length === 0 ? (
        <Typography>No hay ventas registradas.</Typography>
      ) : (
        dates.map(date => {
          const orders = history[date] || [];
          const resumen = getResumenPorMetodo(orders);
          const totalDia = orders.reduce((acc, o) => acc + o.total, 0);

          return (
            <Card key={date} variant="outlined" sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {date}
                </Typography>

                <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                  {Object.entries(resumen).map(([metodo, total]) => (
                    <Chip
                      key={metodo}
                      label={`${metodo}: ${formatCurrency(total)}`}
                      color="primary"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                  ))}
                  <Chip
                    label={`Total: ${formatCurrency(totalDia)}`}
                    color="success"
                    sx={{ mb: 1 }}
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <TableContainer component={Paper} elevation={1}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Ticket</TableCell>
                        <TableCell>Hora</TableCell>
                        <TableCell>Método</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell align="center">Detalle</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order, index) => (
                        <TableRow key={order.id || index}>
                          <TableCell>{getOrderDisplayNumber(order)}</TableCell>
                          <TableCell>{formatTime(getOrderEventDate(order))}</TableCell>
                          <TableCell>
                            {Array.isArray(order.paymentMethod) && order.paymentMethod.length
                              ? order.paymentMethod.map(p => p.paymentMethod).join(', ')
                              : 'Otro'}
                          </TableCell>
                          <TableCell>{formatCurrency(order.total)}</TableCell>
                          <TableCell align="center">
                            <IconButton color="primary" onClick={() => { setSelectedOrder(order); setOpen(true); }}>
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={open} onClose={() => { setOpen(false); setSelectedOrder(null); }} fullWidth maxWidth="sm">
        <DialogTitle>Detalle de Venta</DialogTitle>
        <DialogContent dividers>
          {selectedOrder ? (
            <>
              <Stack spacing={0.5} mb={2}>
                <Typography variant="body2"><strong>Ticket:</strong> {getOrderDisplayNumber(selectedOrder)}</Typography>
                <Typography variant="body2"><strong>Fecha:</strong> {formatDateTime(selectedOrder)}</Typography>
                <Typography variant="body2"><strong>Cliente:</strong> {selectedOrder.customerName?.trim() || '—'}</Typography>
                <Typography variant="body2"><strong>Teléfono:</strong> {selectedOrder.customerPhone?.trim() || '—'}</Typography>
                <Typography variant="body2"><strong>Servicio:</strong> {selectedOrder.serviceType || 'Salón'}</Typography>
                <Typography variant="body2"><strong>Notas:</strong> {selectedOrder.orderNotes?.trim() || '—'}</Typography>
                <Typography variant="body2"><strong>Pagos:</strong></Typography>
                <Stack sx={{ pl: 2 }}>
                  {formatPaymentDetails(selectedOrder.paymentMethod).map((line) => (
                    <Typography key={line} variant="body2">• {line}</Typography>
                  ))}
                </Stack>
                {selectedOrder.paymentSummary && (
                  <Typography variant="body2">
                    <strong>Resumen de cobro:</strong> recibido {formatCurrency(selectedOrder.paymentSummary.totalTendered || 0)} · aplicado {formatCurrency(selectedOrder.paymentSummary.totalApplied || selectedOrder.total || 0)} · vuelto {formatCurrency(selectedOrder.paymentSummary.changeGiven || 0)}
                  </Typography>
                )}
              </Stack>
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Cant.</TableCell>
                      <TableCell align="right">Precio</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <strong>Total</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(selectedOrder.total)}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography>No se encontró la venta.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); setSelectedOrder(null); }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesHistoryPage;

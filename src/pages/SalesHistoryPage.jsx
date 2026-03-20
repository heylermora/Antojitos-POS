import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, CircularProgress,
} from '@mui/material';
import { Visibility, ReceiptLong } from '@mui/icons-material';
import { formatCurrency } from '../utils/formatCurrency';
import { getPaidOrdersGroupedByDay } from '../services/orderService';
import PageTitle from '../components/Titles/PageTitle';
import { getOrderTimestamp, getPaymentAppliedAmount } from '../utils/costing';

const getResumenPorMetodo = (orders = []) =>
  orders.reduce((acc, order) => {
    if (Array.isArray(order.paymentMethod)) {
      order.paymentMethod.forEach((payment) => {
        const metodo = payment.paymentMethod || 'Otro';
        const monto = getPaymentAppliedAmount(payment);
        acc[metodo] = (acc[metodo] || 0) + monto;
      });
    } else {
      const metodo = order.paymentMethod || 'Otro';
      acc[metodo] = (acc[metodo] || 0) + order.total;
    }
    return acc;
  }, {});

const formatTime = (order) => {
  const timestamp = getOrderTimestamp(order);
  return timestamp ? timestamp.toLocaleString('es-CR', { hour: '2-digit', minute: '2-digit' }) : '—';
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
    })();
  }, []);

  const dates = Object.keys(history);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2}>
      <PageTitle title="Historial de Ventas" subtitle="Registro diario de ventas" icon={ReceiptLong} />

      {dates.length === 0 ? (
        <Typography>No hay ventas registradas.</Typography>
      ) : (
        dates.map((date) => {
          const orders = history[date] || [];
          const resumen = getResumenPorMetodo(orders);
          const totalDia = orders.reduce((acc, order) => acc + order.total, 0);

          return (
            <Card key={date} variant="outlined" sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>{date}</Typography>

                <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                  {Object.entries(resumen).map(([metodo, total]) => (
                    <Chip key={metodo} label={`${metodo}: ${formatCurrency(total)}`} color="primary" variant="outlined" sx={{ mb: 1 }} />
                  ))}
                  <Chip label={`Total: ${formatCurrency(totalDia)}`} color="success" sx={{ mb: 1 }} />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <TableContainer component={Paper} elevation={1}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Hora</TableCell>
                        <TableCell>Método</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell align="center">Detalle</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order, index) => (
                        <TableRow key={order.id || index}>
                          <TableCell>{formatTime(order)}</TableCell>
                          <TableCell>
                            {Array.isArray(order.paymentMethod) && order.paymentMethod.length
                              ? order.paymentMethod.map((payment) => `${payment.paymentMethod}: ${formatCurrency(getPaymentAppliedAmount(payment))}`).join(', ')
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
                      <TableCell align="right">{formatCurrency(item.price * item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right"><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>{formatCurrency(selectedOrder.total)}</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
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

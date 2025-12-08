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
import VisibilityIcon from '@mui/icons-material/Visibility';
import { formatCurrency } from '../utils/formatCurrency';
import { getPaidOrdersGroupedByDay } from '../services/orderService';

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

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleString('es-CR', { hour: '2-digit', minute: '2-digit' });

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
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Historial de Ventas
      </Typography>

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
                        <TableCell>Hora</TableCell>
                        <TableCell>Método</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell align="center">Detalle</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order, index) => (
                        <TableRow key={order.id || index}>
                          <TableCell>{formatTime(order.createdAt)}</TableCell>
                          <TableCell>
                            {Array.isArray(order.paymentMethod) && order.paymentMethod.length
                              ? order.paymentMethod.map(p => p.paymentMethod).join(', ')
                              : 'Otro'}
                          </TableCell>
                          <TableCell>{formatCurrency(order.total)}</TableCell>
                          <TableCell align="center">
                            <IconButton color="primary" onClick={() => { setSelectedOrder(order); setOpen(true); }}>
                              <VisibilityIcon />
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
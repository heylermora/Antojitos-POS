import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Paper,
  Alert,
} from '@mui/material';

import { getOrders, updateOrderStatus, deleteOrder } from '../services/orderService';
import OrderColumn from '../components/OrderColumn';
import FormModal from '../components/Modals/FormModal';
import { formatCurrency } from '../utils/formatCurrency';
import PageTitle from '../components/Titles/PageTitle';
import { ListAlt } from '@mui/icons-material';

const paymentOptions = ['Efectivo', 'Sinpe', 'Tarjeta'];
const STATUSES = ['Por Hacer', 'Realizada', 'Pagada'];

const STATUS_COLORS = {
  'Por Hacer': { headerBg: '#FFEBEE', border: '#EF5350', cardBg: '#FFF3F3' },
  'Realizada': { headerBg: '#E8F5E9', border: '#66BB6A', cardBg: '#F3FFF3' },
  'Pagada': { headerBg: '#F5F5F5', border: '#BDBDBD', cardBg: '#FAFAFA' },
};

const parseAmount = (value) => {
  const raw = String(value || '').replace(/[^\d.]/g, '');
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

const toPaymentRow = (paymentMethod = 'Efectivo', amount = 0) => ({
  paymentMethod,
  amountDisplay: amount ? formatCurrency(amount) : '',
  tenderedAmount: Number(amount) || 0,
  appliedAmount: Number(amount) || 0,
});

const buildAppliedPayments = (payments, orderTotal) => {
  let remaining = Number(orderTotal) || 0;

  const appliedPayments = payments.map((payment) => {
    const tenderedAmount = Number(payment.tenderedAmount ?? parseAmount(payment.amountDisplay)) || 0;
    const appliedAmount = Math.max(0, Math.min(tenderedAmount, remaining));
    remaining = Math.max(0, remaining - appliedAmount);

    return {
      paymentMethod: payment.paymentMethod || 'Otro',
      tenderedAmount,
      appliedAmount,
      amount: appliedAmount,
      amountDisplay: formatCurrency(appliedAmount),
    };
  }).filter((payment) => payment.tenderedAmount > 0 || payment.appliedAmount > 0);

  return { payments: appliedPayments, remaining };
};

const KitchenOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentData, setPaymentData] = useState({ payments: [] });
  const [changeDue, setChangeDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      setLoading(true);
      setError(null);
      const fetched = await getOrders(startOfToday, endOfToday);
      setOrders(fetched || []);
    } catch (e) {
      setError('Error al cargar las órdenes');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      fetchOrders();
    } catch {
      setError('Error al actualizar estado');
    }
  };

  const onDelete = async (orderId) => {
    try {
      await deleteOrder(orderId);
      fetchOrders();
    } catch (e) {
      console.error('[OrderColumn] Error al eliminar:', e);
    }
  };

  const resetPaymentForm = () => {
    setPaymentData({ payments: [] });
    setChangeDue(0);
  };

  const handleConfirmPayment = async () => {
    try {
      if (!selectedOrder?.id) {
        throw new Error('Orden no seleccionada');
      }

      const orderTotal = Number(selectedOrder.total ?? 0);
      const built = buildAppliedPayments(paymentData.payments, orderTotal);
      if (built.remaining > 0) {
        throw new Error('El pago aplicado no cubre el total de la orden');
      }

      await updateOrderStatus(selectedOrder.id, 'Pagada', built.payments);
      await fetchOrders();
    } catch (e) {
      setError(`Error al registrar el pago: ${e.message || 'Desconocido'}`);
    } finally {
      setIsModalOpen(false);
      setSelectedOrder(null);
      resetPaymentForm();
    }
  };

  const ordersByStatus = useMemo(() => {
    const map = {};
    STATUSES.forEach((status) => { map[status] = []; });
    for (const order of orders) {
      if (STATUSES.includes(order.status)) {
        map[order.status].push(order);
      }
    }
    return map;
  }, [orders]);

  const totalTendered = useMemo(
    () => (paymentData.payments || []).reduce((acc, payment) => acc + (Number(payment.tenderedAmount) || 0), 0),
    [paymentData.payments]
  );

  const openPaymentModal = (order) => {
    if (!order) {
      setError('No se pudo abrir el pago: orden no encontrada.');
      return;
    }

    const total = Number(order?.total ?? 0);
    if (Number.isNaN(total) || total <= 0) {
      setError('La orden seleccionada no tiene un monto válido para pagar.');
      return;
    }

    setSelectedOrder(order);
    setPaymentData({ payments: [toPaymentRow('Efectivo', total)] });
    setChangeDue(0);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!selectedOrder) return;
    setChangeDue(totalTendered - (Number(selectedOrder.total) || 0));
  }, [paymentData.payments, selectedOrder, totalTendered]);

  const addPaymentRow = () => {
    setPaymentData((prev) => ({
      payments: [...(prev.payments || []), toPaymentRow()],
    }));
  };

  const removePaymentRow = (idx) => {
    setPaymentData((prev) => ({
      payments: prev.payments.filter((_, i) => i !== idx),
    }));
  };

  const changePaymentMethod = (idx, method) => {
    setPaymentData((prev) => {
      const copy = [...prev.payments];
      copy[idx] = { ...copy[idx], paymentMethod: method };
      return { payments: copy };
    });
  };

  const changePaymentAmount = (idx, display) => {
    const numeric = parseAmount(display);
    setPaymentData((prev) => {
      const copy = [...prev.payments];
      copy[idx] = {
        ...copy[idx],
        amountDisplay: display,
        tenderedAmount: numeric,
        appliedAmount: numeric,
      };
      return { payments: copy };
    });
  };

  const renderColumn = (status) => {
    const isToDo = status === 'Por Hacer';
    const totalOrders = ordersByStatus[status].length;

    return (
      <Box key={status} sx={{ height: { xs: 'auto', md: 'calc(100vh - 120px)' }, minHeight: '150px' }}>
        <Paper
          elevation={isToDo ? 4 : 2}
          sx={{
            border: `1px solid ${STATUS_COLORS[status].border}`,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: STATUS_COLORS[status].cardBg,
          }}
        >
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: STATUS_COLORS[status].headerBg,
              borderBottom: `1px solid ${STATUS_COLORS[status].border}`,
              p: 1.5,
              height: 72,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              color: isToDo ? STATUS_COLORS[status].border : 'text.primary',
            }}
          >
            <Typography variant="h6" fontWeight={700}>{status}</Typography>
            <Typography variant="body2" color="text.secondary">{totalOrders} orden(es)</Typography>
          </Box>

          <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
            <OrderColumn
              orders={ordersByStatus[status]}
              status={status}
              onStatusChange={handleStatusChange}
              onOpenPayment={openPaymentModal}
              onDelete={onDelete}
            />
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ px: { xs: 1, md: 4 }, py: 3, width: '100%', backgroundColor: '#f7f5f2' }}>
      <PageTitle title="Comandas" subtitle="Pedidos en tiempo real para preparación y cobro" icon={ListAlt} />

      {error && (
        <Box mb={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {renderColumn('Por Hacer')}
          {renderColumn('Realizada')}
          {renderColumn('Pagada')}
        </Box>
      )}

      {selectedOrder && (
        <FormModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
            resetPaymentForm();
          }}
          title={`Cobrar Orden #${selectedOrder.id}`}
          formData={paymentData}
          setFormData={setPaymentData}
          onSubmit={handleConfirmPayment}
          submitLabel="Confirmar Pago"
          submitDisabled={changeDue < 0}
          maxWidth="xs"
          fields={[
            {
              type: 'repeatable',
              key: 'payments',
              label: 'Métodos de pago',
              min: 1,
              max: 4,
              itemSchema: [
                { type: 'select', key: 'paymentMethod', label: 'Método', options: paymentOptions },
                { type: 'text', key: 'amountDisplay', label: 'Monto', inputProps: { inputMode: 'numeric', placeholder: '0.00' } },
              ],
              hooks: {
                onAdd: addPaymentRow,
                onRemove: removePaymentRow,
                onChangeMethod: changePaymentMethod,
                onChangeAmount: changePaymentAmount,
              },
            },
            { type: 'label', label: `Total: ${formatCurrency(selectedOrder.total)}` },
            {
              type: 'label',
              label: changeDue < 0 ? `Falta: ${formatCurrency(Math.abs(changeDue))}` : changeDue === 0 ? 'Pago exacto' : `Vuelto: ${formatCurrency(changeDue)}`,
              color: 'primary',
              variant: 'h6',
            },
          ]}
        />
      )}
    </Box>
  );
};

export default KitchenOrdersPage;

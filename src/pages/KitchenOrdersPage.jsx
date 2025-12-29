/**
 * 🍽️ KitchenOrdersPage – Gestión de comandas en cocina
 * 
 * Página para visualizar, actualizar y cobrar órdenes por estado.
 * Usa acordeones para agrupar por estado y un modal para gestionar pagos.
 *
 * Funcionalidades:
 * - Carga y actualización de órdenes desde el servicio
 * - Transiciones de estado: Por Hacer → Realizada → Pagada
 * - Modal de pago con cálculo de vuelto y selección de método
 */

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
import FormModal from '../modals/FormModal'; 
import { formatCurrency } from '../utils/formatCurrency';
import PageTitle from '../components/PageTitle';
import { ListAlt } from '@mui/icons-material';

const paymentOptions = ['Efectivo', 'Sinpe', 'Tarjeta'];
const STATUSES = ['Por Hacer', 'Realizada', 'Pagada'];

// === PALETA DE COLORES FUNCIONAL PARA UX ===
const STATUS_COLORS = {
  'Por Hacer': {
    headerBg: '#FFEBEE', 
    border: '#EF5350',
    cardBg: '#FFF3F3', 
  },
  'Realizada': {
    headerBg: '#E8F5E9', 
    border: '#66BB6A',
    cardBg: '#F3FFF3',
  },
  'Pagada': {
    headerBg: '#F5F5F5', 
    border: '#BDBDBD',
    cardBg: '#FAFAFA',
  }
};

const KitchenOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentData, setPaymentData] = useState({
    payments: []
  });
  const [changeDue, setChangeDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const endOfToday = new Date().setHours(23, 59, 59, 999);

      setLoading(true);
      setError(null);
      const fetched = await getOrders(new Date(startOfToday), new Date(endOfToday));
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

  const handleConfirmPayment = async () => {
    try {
      if (!selectedOrder || !selectedOrder.id) {
        throw new Error('Orden no seleccionada');
      }
      const orderTotal = Number(selectedOrder.total ?? 0);
      let remainingTotal = orderTotal;

      const finalPayments = paymentData.payments.map(p => {
        const paidAmount = p?.amount || parseAmount(p?.amountDisplay) || 0;
        
        let amountToRegister = 0;
        if (remainingTotal > 0) {
            amountToRegister = Math.min(paidAmount, remainingTotal);
        }
        
        remainingTotal -= amountToRegister;

        if (paidAmount > amountToRegister) {
             return { ...p, amount: orderTotal, amountDisplay: formatCurrency(orderTotal) };
        }
        
        return {
          ...p,
          amount: amountToRegister, 
          amountDisplay: formatCurrency(amountToRegister)
        };
      }).filter(p => p.amount > 0);

      await updateOrderStatus(
        selectedOrder.id,
        'Pagada',
        finalPayments
      );
      fetchOrders();
    } catch (e) {
      setError(`Error al registrar el pago: ${e.message || 'Desconocido'}`);
    } finally {
      setIsModalOpen(false);
      setSelectedOrder(null);
      resetPaymentForm();
    }
  };

  const resetPaymentForm = () => {
    setPaymentData({ payments: [] });
    setChangeDue(0);
  };

  // Pre-filtra por estado para optimizar el renderizado por columna
  const ordersByStatus = useMemo(() => {
    const map = {};
    STATUSES.forEach(status => map[status] = []);
    for (const o of orders) {
      if (STATUSES.includes(o.status)) {
        map[o.status].push(o);
      }
    }
    return map;
  }, [orders]);

  const parseAmount = (value) => {
    // Quita cualquier carácter que no sea dígito o punto decimal (incluye la moneda ₡)
    const raw = (value || '').replace(/[^\d.]/g, ''); 
    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  };

  const sumPayments = useCallback((payments) => {
    const list = Array.isArray(payments) ? payments : [];
    // Suma el 'amount' (numérico) si existe, o parsea 'amountDisplay'
    return list.reduce((acc, p) => acc + (p?.amount || parseAmount(p?.amountDisplay) || 0), 0);
  }, []);

  const openPaymentModal = (order) => {
    if (!order) {
      setError('No se pudo abrir el pago: orden no encontrada.');
      return;
    }
    
    const total = Number(order?.total ?? 0);
    if (isNaN(total) || total <= 0) {
      setError('La orden seleccionada no tiene un monto válido para pagar.');
      return;
    }
    setSelectedOrder(order);
    
    // Inicializa el formulario de pago con el total a pagar en efectivo
    setPaymentData({
      payments: [
        {
          paymentMethod: 'Efectivo',
          amountDisplay: formatCurrency(total), // Muestra el total formateado
          amount: total // Almacena el valor numérico
        }
      ]
    });
    setChangeDue(0);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!selectedOrder) return;
    const totalPaid = sumPayments(paymentData.payments);
    const change = totalPaid - (selectedOrder?.total ?? 0);
    setChangeDue(change);
  }, [paymentData.payments, selectedOrder, sumPayments]);

  // Handlers para la repetición de campos en el modal
  const addPaymentRow = () => {
    setPaymentData(prev => {
      const current = Array.isArray(prev.payments) ? prev.payments : [];
      return {
        payments: [
          ...current,
          { paymentMethod: 'Efectivo', amountDisplay: '', amount: 0 },
        ],
      };
    });
  };

  const removePaymentRow = (idx) => {
    setPaymentData(prev => ({
      payments: prev.payments.filter((_, i) => i !== idx)
    }));
  };

  const changePaymentMethod = (idx, method) => {
    setPaymentData(prev => {
      const copy = [...prev.payments];
      copy[idx] = { ...copy[idx], paymentMethod: method };
      return { payments: copy };
    });
  };

  const changePaymentAmount = (idx, display) => {
    const numeric = parseAmount(display);
    setPaymentData(prev => {
      const copy = [...prev.payments];
      // Actualiza display y el valor numérico (amount)
      copy[idx] = { ...copy[idx], amountDisplay: display, amount: numeric };
      return { payments: copy };
    });
  };

  // Componente auxiliar para renderizar una columna Kanban
  const renderColumn = (status) => {
    const isToDo = status === 'Por Hacer';
    const totalOrders = ordersByStatus[status].length;

    return (
      <Box 
        key={status}
        sx={{
          height: { xs: 'auto', md: 'calc(100vh - 120px)' }, 
          minHeight: '150px' 
        }}
      >
        <Paper
          elevation={isToDo ? 4 : 2} // Mayor elevación para la columna de prioridad
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
          {/* Encabezado Fijo de la Columna */}
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
              // Destacar el color del texto para 'Por Hacer'
              color: isToDo ? STATUS_COLORS[status].border : 'text.primary',
            }}
          >
            <Typography variant="h6" fontWeight={700}>
                {status}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalOrders} orden(es)
            </Typography>
          </Box>

          {/* Contenedor de Órdenes con Scroll */}
          <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
            <OrderColumn
              orders={ordersByStatus[status]}
              status={status}
              onStatusChange={handleStatusChange}
              onOpenPayment={(order) => {
                    setSelectedOrder(order);
                    setPaymentData({
                      paymentMethod: 'Efectivo',
                      amountDisplay: formatCurrency(order.total),
                      amount: order.total,
                    });
                    setChangeDue(0);
                    setIsModalOpen(true);
                  }}
              openPaymentModal={openPaymentModal}
              onDelete={onDelete}
            />
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <Box 
      // Permite que el contenido ocupe el ancho completo de la ventana
      sx={{ 
        px: { xs: 1, md: 4 }, 
        py: 3, 
        width: '100%',
        backgroundColor: '#f7f5f2' // Fondo ligeramente cálido
      }}
    >
      <PageTitle
        title="Comandas"
        subtitle="Pedidos en tiempo real para preparación y cobro"
        icon={ListAlt}
      />

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
        <Box
          // === LAYOUT KANBAN 1x3 ===
          sx={{
            display: 'grid',
            // En móvil (xs): 1 columna apilada
            // En escritorio (md+): 3 columnas de igual ancho (1fr)
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {renderColumn('Por Hacer')}
          {renderColumn('Realizada')}
          {renderColumn('Pagada')}
        </Box>
      )}

      {/* Modal de Pago - Mejorado */}
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
          // Botón de confirmar pago se deshabilita si aún falta dinero (changeDue < 0)
          submitDisabled={changeDue < 0} 
          maxWidth="xs"
          
          // UX MEJORADA: Resumen fijo en el pie del modal
          modalFooter={
            <Box sx={{ 
                p: 2, 
                borderTop: '1px solid #eee', 
                backgroundColor: 'background.paper' 
            }}>
                <Typography variant="h6" gutterBottom fontWeight={500}>
                    Total a Pagar: **{formatCurrency(selectedOrder.total)}**
                </Typography>
                <Typography
                    variant="h5"
                    fontWeight={700}
                    // Color de error si falta, color de éxito/neutral si sobra o es exacto
                    color={changeDue < 0 ? 'error.main' : 'success.main'}
                >
                    {changeDue < 0
                        ? `FALTA: ${formatCurrency(Math.abs(changeDue))}`
                        : changeDue === 0
                            ? `PAGO EXACTO`
                            : `VUELTO: ${formatCurrency(changeDue)}`}
                </Typography>
            </Box>
          }

          fields={[
            {
              type: 'repeatable',
              key: 'payments',
              label: 'Métodos de pago',
              min: 1,
              max: 4,
              itemSchema: [
                {
                  type: 'select',
                  key: 'paymentMethod',
                  label: 'Método',
                  options: paymentOptions,
                },
                {
                  type: 'text',
                  key: 'amountDisplay',
                  label: 'Monto',
                  inputProps: { inputMode: 'numeric', placeholder: '0.00' }
                }
              ],
              hooks: {
                onAdd: addPaymentRow,
                onRemove: removePaymentRow,
                onChangeMethod: changePaymentMethod,
                onChangeAmount: changePaymentAmount
              }
            },
            {
              type: 'label',
              label: `Total: ${formatCurrency(selectedOrder.total)}`
            },
            {
              type: 'label',
              label:
                changeDue < 0
                  ? `Falta: ${formatCurrency(Math.abs(changeDue))}`
                  : changeDue === 0
                  ? `Pago exacto`
                  : `Vuelto: ${formatCurrency(changeDue)}`,
              color: 'primary',
              variant: 'h6'
            }
          ]}
        />
      )}
    </Box>
  );
};

export default KitchenOrdersPage;
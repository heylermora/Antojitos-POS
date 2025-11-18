import React, { useState } from 'react';
import {
  Grid,
  Box,
} from '@mui/material';
import KitchenOrder from './KitchenOrder';
import ConfirmModal from '../modals/ConfirmModal';

const OrderColumn = ({ orders, status, onStatusChange, onOpenPayment, openPaymentModal, onDelete}) => {
  const [confirmData, setConfirmData] = useState(null);
  const [confirmDel, setConfirmDel] = useState({ open: false, order: null });

  const statuses = ['Por Hacer', 'Realizada', 'Pagada'];

  const handleStatusChange = (order, newStatus) => {
    if (newStatus === 'Pagada') {
      onOpenPayment(order);
      openPaymentModal();
      return;
    }

    const currentIndex = statuses.indexOf(order.status);
    const newIndex = statuses.indexOf(newStatus);

    if (newIndex < currentIndex) {
      setConfirmData({ order, newStatus });
    } else {
      onStatusChange(order.id, newStatus);
    }
  };

  const confirmBackwardChange = () => {
    if (!confirmData) return;
    const { order, newStatus } = confirmData;
    onStatusChange(order.id, newStatus);
    setConfirmData(null);
  };

  const confirmRemove = async () => {
    if (!confirmDel) return;
    onDelete(confirmDel.order.id);
    setConfirmDel({ open: false, order: null });
  };

  const askDelete = (order) => setConfirmDel({ open: true, order });

  return (
    <>
      <Grid container spacing={2}>
        {orders.length === 0 ? (
          <Grid item xs={12}>
            <Box
              sx={{
                minHeight: 50,
                p: 2,
                border: '2px dashed #ccc',
                borderRadius: 2,
                backgroundColor: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontStyle: 'italic',
                color: 'text.secondary'
              }}
            >
              No hay órdenes en estado "{status}"
            </Box>
          </Grid>
        ) : (
          orders
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((order) => (
              <KitchenOrder
                date={order.timestamp}
                items={order.items}
                currentStatus={order.status}
                customerName={order.customerName}
                total={order.total}
                onStatusChange={(newStatus) => handleStatusChange(order, newStatus)}
                onEdit={() => {}}
                onDelete={() => askDelete(order)}
              />
            ))
        )}
      </Grid>

      <ConfirmModal
        open={!!confirmData}
        title={`Cambiar estado a "${confirmData?.newStatus}"`}
        description={`Está a punto de cambiar el estado de la orden de "${confirmData?.order?.status}" a "${confirmData?.newStatus}". ¿Desea continuar?`}
        confirmText="Sí, cambiar"
        cancelText="Cancelar"
        confirmColor="warning"
        onClose={() => setConfirmData(null)}
        onConfirm={confirmBackwardChange}
      />

      <ConfirmModal
        open={confirmDel.open}
        title="Eliminar orden"
        description={`¿Eliminar la orden "${confirmDel.order?.folio || confirmDel.order?.id || ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmColor="error"
        onClose={() => setConfirmDel({ open: false, order: null })}
        onConfirm={confirmRemove}
      />
    </>
  );
};

export default OrderColumn;
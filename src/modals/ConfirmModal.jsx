/**
 * ⚠️ ConfirmModal – Modal de confirmación (MUI)
 *
 * Diálogo reutilizable para confirmar acciones, con textos y color personalizables.
 *
 * 🔧 Props:
 * ┌────────────────────┬──────────────────────────────────────┐
 * │ open               │ Mostrar/ocultar el modal             │
 * │ title              │ Título del diálogo                   │
 * │ description        │ Mensaje descriptivo                  │
 * │ confirmText        │ Texto del botón confirmar            │
 * │ cancelText         │ Texto del botón cancelar             │
 * │ confirmColor       │ Color del botón confirmar ('primary')│
 * │ onConfirm          │ Función al confirmar                 │
 * │ onClose            │ Función al cerrar                    │
 * └────────────────────┴──────────────────────────────────────┘
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';

const ConfirmModal = ({
  open,
  title = 'Confirmar acción',
  description = '¿Está seguro de que desea continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'primary',
  onConfirm,
  onClose
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{cancelText}</Button>
        <Button onClick={onConfirm} variant="contained" color={confirmColor}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmModal;

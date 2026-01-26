/**
 * ❌ ErrorModal – Modal de error reutilizable (MUI)
 *
 * Diálogo simple para mostrar errores o alertas críticas.
 *
 * 🔧 Props:
 * ┌────────────────────┬───────────────────────────────────────────────┐
 * │ open               │ Mostrar/ocultar el modal                      │
 * │ title              │ Título del diálogo (por defecto: "Error")     │
 * │ message            │ Texto o descripción del error                 │
 * │ onClose            │ Función para cerrar el modal                  │
 * │ retryText          │ Texto opcional para reintentar acción         │
 * │ onRetry             │ Función opcional que se ejecuta al reintentar │
 * └────────────────────┴───────────────────────────────────────────────┘
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Stack
} from '@mui/material';

const ErrorModal = ({
  open,
  title = 'Error',
  message = 'Ha ocurrido un error inesperado.',
  onClose,
  retryText,
  onRetry
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderTop: theme => `6px solid ${theme.palette.error.main}` }
      }}
    >
      <DialogTitle color="error.main" sx={{ fontWeight: 600 }}>
        {title}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="error" variant="outlined">
            <DialogContentText sx={{ whiteSpace: 'pre-wrap' }}>
              {message}
            </DialogContentText>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions>
        {onRetry && (
          <Button color="primary" variant="contained" onClick={onRetry}>
            {retryText || 'Reintentar'}
          </Button>
        )}
        <Button onClick={onClose} color="error" variant="outlined">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorModal;
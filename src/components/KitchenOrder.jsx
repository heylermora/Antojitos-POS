// src/components/KitchenOrder.jsx
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  IconButton,
  Paper,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaidIcon from '@mui/icons-material/Paid';
import { formatCurrency } from '../utils/formatCurrency';

const statusOptions = ['Por Hacer', 'Realizada', 'Pagada'];

const KitchenOrder = ({ date, items, currentStatus, customerName, total, onStatusChange, onEdit, onDelete, onOpenPayment }) => {
  const formattedDate = new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
  
  // Para el Tooltip del cliente
  const displayCustomerName = customerName?.trim() || '—';

  const STATUS_BORDER_COLORS = {
    'Por Hacer': '#E57373', // Rojo suave (Red 300)
    'Realizada': '#FFB74D', // Naranja/Ámbar suave (Amber 300)   
    'Pagada': '#BDBDBD', // Gris claro (Grey 400), menos intrusivo
  };

  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        borderLeft: `4px solid ${STATUS_BORDER_COLORS[currentStatus] || '#BDBDBD'}`
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" fontWeight="bold">
          👤 Cliente: {displayCustomerName}
        </Typography>
        <Box>
          <Tooltip title="Editar Comanda">
            <IconButton aria-label="Editar" size="small" onClick={onEdit}>
              <EditIcon fontSize="small" color="primary" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar Comanda">
            <IconButton aria-label="Eliminar" size="small" onClick={onDelete}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ mt: 0.5 }}>
        <Typography variant="body2" >
          Fecha y Hora: 
          {
              ' · ' +
              formattedDate.toLocaleDateString('es-CR', { 
                  day: '2-digit', month: '2-digit', year: 'numeric' 
              }) + 
              ' · ' + 
              formattedDate.toLocaleTimeString('es-CR', { 
                  hour: '2-digit', minute: '2-digit', hour12: true 
              })
          }
        </Typography>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Lista de productos mejorada */}
      <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
        {items.map((item, index) => (
          <Box key={`${item.name}-${index}`} sx={{ mb: 1 }}>
            
            {/* Ítem del menú con Tooltip (Requisito 1) */}
            <Box sx={{ display: 'flex' }}>
              <Typography variant="body2" fontWeight="bold" sx={{ mr: 1, color: 'primary.main', minWidth: '20px' }}>
                {item.quantity}×
              </Typography>
              <Tooltip title={item.name}>
                <Typography variant="body2" sx={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    flexGrow: 1,
                }}>
                  {item.name}
                </Typography>
              </Tooltip>
            </Box>

            {/* Notas */}
            {(item.notes || '').trim() !== '' && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  pl: 1,
                  mt: 0.25,
                  borderLeft: theme => `2px solid ${theme.palette.divider}`,
                  whiteSpace: 'pre-wrap',
                }}
              >
                📝 {item.notes.trim()}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1.5 }} />
      
      {/* Total Destacado y Acción de Pago (Mejora Visual) */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PaidIcon color="success" sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="bold" color="success.main">
                Total:
            </Typography>
        </Box>
        <Typography variant="h6" fontWeight="bold" color="success.main">
            {formatCurrency(total)}
        </Typography>
      </Box>

      {/* Selector de Estado */}
      <FormControl fullWidth size="small">
        <InputLabel id="status-label">Cambiar estado</InputLabel>
        <Select
          labelId="status-label"
          value={currentStatus}
          label="Cambiar estado"
          onChange={(e) => onStatusChange(e.target.value)}
          sx={{
            // Mejorar el contraste visual del selector
            backgroundColor: currentStatus === 'Realizada' ? '#E8F5E9' : 'white',
          }}
        >
          {statusOptions.map((status) => (
            <MenuItem
              key={status}
              value={status}
              disabled={status === currentStatus}
            >
              {status}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
};

export default KitchenOrder;
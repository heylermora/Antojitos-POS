import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TextField,
  IconButton,
  Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';

/**
 * SaleTable component with editable quantities and delete option
 * 
 * @param {Array} saleItems - List of added products
 * @param {Function} onQuantityChange - Function to update quantity
 * @param {Function} onRemove - Function to remove item from sale
 */
const SaleTable = ({ saleItems = [], onQuantityChange, onNotesChange, onRemove }) => {
  const handleChange = (e, name) => {
    const value = parseFloat(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      onQuantityChange(name, value);
    }
  };

  const handleQuantityChange = (itemName, currentQuantity, step) => {
    const newQuantity = Math.max(0.1, currentQuantity + step);
    const mockEvent = { target: { value: newQuantity } };
    handleChange(mockEvent, itemName); 
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>Comanda actual</Typography>
      <TableContainer component={Paper} sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Cant</TableCell>
              <TableCell>Precio</TableCell>
              <TableCell>Subtotal</TableCell>
              <TableCell align="center">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {saleItems.map((item, i) => (
              <TableRow key={i}>
                <TableCell>{item.name}
                  <TextField
                    label="Notas"
                    placeholder="Ej: sin cebolla, extra picante..."
                    value={item.notes || ''}
                    onChange={(e) => onNotesChange && onNotesChange(item.name, e.target.value)}
                    variant="outlined"
                    size="small"
                    multiline
                    maxRows={2}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={item.quantity}
                    onChange={(e) => handleChange(e, item.name)}
                    inputProps={{ min: 0.1, step: 0.1 }}
                    sx={{ width: 70 }}
                  />
                </TableCell>
                <TableCell>₡{item.price}</TableCell>
                <TableCell>₡{item.price * item.quantity}</TableCell>
                <TableCell align="center">
                  <IconButton
                    color="error"
                    onClick={() => onRemove(item.name)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        {saleItems.map((item, i) => (
            <Paper key={i} sx={{ p: 1.5, mb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                
                {/* Cabecera: Nombre y Botón de Eliminar */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" fontWeight="bold">{item.name}</Typography>
                    <IconButton color="error" onClick={() => onRemove(item.name)} size="small">
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
                
                {/* Contenido: Cantidad, Precio Unitario y Subtotal */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    
                    {/* Cantidad y Precio Unitario */}
                    <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>Cant</Typography>
                              
                        <Box sx={{ display: 'flex', alignItems: 'center', width: 'auto' }}>
                                  
                                  {/* Botón Disminuir (-) */}
                                  <IconButton
                                      size="small"
                                      onClick={() => handleQuantityChange(item.name, item.quantity, -1)}
                                      disabled={item.quantity <= 0.1} // Desactivar si la cantidad es mínima
                                      aria-label="Disminuir cantidad"
                                      sx={{ p: 0.5 }}
                                  >
                                      <RemoveIcon fontSize="small" />
                                  </IconButton>
                                  
                                  {/* Campo de Texto de la Cantidad */}
                                  <TextField
                                      type="number"
                                      size="small"
                                      value={item.quantity}
                                      onChange={(e) => handleChange(e, item.name)} // Permite la entrada manual
                                      inputProps={{ min: 0.1, step: 1, style: { textAlign: 'center' } }} // Centra el texto
                                      sx={{ width: 45, mx: 0.5 }} // Reducido el ancho a 45px
                                  />
                                  
                                  {/* Botón Aumentar (+) */}
                                  <IconButton
                                      size="small"
                                      onClick={() => handleQuantityChange(item.name, item.quantity, 1)}
                                      aria-label="Aumentar cantidad"
                                      sx={{ p: 0.5 }}
                                  >
                                      <AddIcon fontSize="small" />
                                  </IconButton>
                                   </Box>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Precio</Typography>
                            <Typography variant="body1">₡{item.price}</Typography>
                        </Box>
                    </Box>
                    
                    {/* Subtotal (Precio Final) */}
                    <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary.main">
                            ₡{(item.price * item.quantity).toFixed(2)}
                        </Typography>
                    </Box>
                </Box>
                
                {/* Notas */}
                <TextField
                    label="Notas"
                    placeholder="Ej: sin cebolla, extra picante..."
                    value={item.notes || ''}
                    onChange={(e) => onNotesChange && onNotesChange(item.name, e.target.value)}
                    variant="outlined"
                    size="small"
                    multiline
                    maxRows={1}
                    fullWidth
                    sx={{ mt: 0.5 }}
                />
            </Paper>
        ))}
    </Box>
    </>
  );
};

export default SaleTable;
/**
 * 🧾 OrderCreationPage – Creación de comandas
 *
 * Permite seleccionar productos por categoría, agregarlos a una venta,
 * ajustar cantidades y guardar la orden con estado "Por Hacer".
 *
 * Funcionalidades:
 * - Carga dinámica de categorías y productos
 * - Selección e incremento de productos
 * - Edición y eliminación en tabla de venta
 * - Cálculo y visualización del total
 * - Guardado de la comanda
 * - Agrega botón para productos fuera de menú
 * - Permite notas/comentarios por platillo
 * - Incluye el nombre del cliente en la comanda
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Typography,
  Stack,
  CircularProgress,
  TextField,
  Paper,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore, Save, Add } from '@mui/icons-material';

import CategorySelector from '../components/CategorySelector';
import ProductGrid from '../components/ProductGrid';
import SaleTable from '../components/SaleTable';
import { formatCurrency } from '../utils/formatCurrency';
import { getProducts } from '../services/productService';
import { saveOrder } from '../services/orderService';
import ErrorModal from '../modals/ErrorModal';

const OrderCreationPage = () => {
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [categories, setCategories] = useState([]);
  const [currentProducts, setCurrentProducts] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        const loaded = await getProducts();
        setCategories(Array.isArray(loaded) ? loaded : []);

        if (loaded?.length > 0) {
          const first = loaded[0];
          setActiveCategoryId(first.id);
          setCurrentProducts(first.products || []);
        }
      } catch (err) {
        console.error(err);
        showError('Error al cargar productos/categorías. Intenta nuevamente.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const selectedCategory = categories.find(cat => cat.id === activeCategoryId);
    setCurrentProducts(selectedCategory?.products || []);
  }, [activeCategoryId, categories]);

  const showError = (msg) => {
    console.log("ABRIR ERROR:", msg);
    setErrorMsg(msg || 'Ocurrió un error inesperado.');
    setErrorOpen(true);
  };

  const addCustomProduct = () => {
    const priceNumber = Number(customPrice);
    if (!customName.trim() || isNaN(priceNumber) || priceNumber <= 0) {
      showError('Revisa el nombre y el precio del producto personalizado.');
      return;
    }

    setSaleItems(prev => {
      const existing = prev.find(p => p.name === customName.trim());
      if (existing) {
        return prev.map(p =>
          p.name === customName.trim()
            ? { ...p, quantity: p.quantity + 1, price: priceNumber, notes: customNotes.trim() || p.notes || '' }
            : p
        );
      }
      return [
        ...prev,
        { name: customName.trim(), price: priceNumber, quantity: 1, notes: customNotes.trim() || '' }
      ];
    });

    setCustomName('');
    setCustomPrice('');
    setCustomNotes('');
    setSelectedProduct(customName.trim());
  };

  const handleSelectProduct = (name, price, notes) => {
    setSaleItems(prev => {
      const existing = prev.find(p => p.name === name);
      if (existing) {
        return prev.map(p =>
          p.name === name ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { name, price, quantity: 1}];
    });

    setSelectedProduct(name);
  };

  const handleQuantityChange = (name, quantity) => {
    setSaleItems(prev =>
      prev.map(p => (p.name === name ? { ...p, quantity } : p))
    );
  };

  const handleNotesChange = (name, notes) => {
    setSaleItems((prev) => prev.map((p) => (p.name === name ? { ...p, notes } : p)));
  };

  const handleRemoveProduct = (name) => {
    setSaleItems(prev => prev.filter(p => p.name !== name));
  };

  const handleSaveOrder = async () => {
    if (saleItems.length === 0) {
      showError('Agrega al menos un producto antes de guardar la comanda.');
      return;
    }

    const order = {
      customerName: customerName.trim() || '',
      timestamp: new Date(),
      status: 'Por Hacer',
      items: saleItems,
      total: saleItems.reduce((sum, p) => sum + p.price * p.quantity, 0),
    };

    try {
      await saveOrder(order);
      setSaleItems([]);
      setSelectedProduct(null);
      setCustomerName('');
    } catch (err) {
      console.error(err);
      showError('No se pudo guardar la comanda. Verifica tu conexión e inténtalo de nuevo. ' + err.message);
    }
  };

  const total = saleItems.reduce((sum, p) => sum + p.price * p.quantity, 0);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" mb={2}>
        Creación de Comanda
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Nombre del cliente (opcional)"
            placeholder="Ej: María Quesada"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            fullWidth
          />
        </Stack>
      </Paper>

      <CategorySelector
        categories={categories}
        active={activeCategoryId}
        setActiveCategoryId={setActiveCategoryId}
      />

      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1">Seleccionar productos</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {activeCategoryId === 'other' ? (
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Agrega un producto fuera del menú (nombre, precio y notas).
              </Typography>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!customName.trim() || Number(customPrice) <= 0) return;
                  addCustomProduct();
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Nombre del producto"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    fullWidth
                    required
                    size="small"
                    helperText={!customName.trim() ? 'Obligatorio' : ' '}
                    error={!customName.trim()}
                  />

                  <TextField
                    label="Precio"
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    required
                    inputMode="decimal"
                    size="small"
                    helperText={Number(customPrice) > 0 ? ' ' : 'Debe ser mayor a 0'}
                    error={!(Number(customPrice) > 0)}
                    sx={{ minWidth: { sm: 180 } }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₡</InputAdornment>,
                    }}
                  />

                  <IconButton
                    type="submit"
                    color="primary"
                    sx={{
                      display: { xs: 'inline-flex', sm: 'inline-flex' },
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                    disabled={!customName.trim() || Number(customPrice) <= 0}
                    aria-label="Agregar producto personalizado"
                  >
                    <Add fontSize="small" />
                  </IconButton>
                </Stack>
              </form>
            </Paper>
          ) : (
            <ProductGrid
              products={currentProducts}
              selected={selectedProduct}
              onSelect={handleSelectProduct}
            />
          )}
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      <SaleTable
        saleItems={saleItems}
        onQuantityChange={handleQuantityChange}
        onNotesChange={handleNotesChange}
        onRemove={handleRemoveProduct}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        mt={2}
        gap={2}
      >
        <Typography variant="h6">
          Total: {formatCurrency(total)}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveOrder}
          disabled={saleItems.length === 0}
          startIcon={<Save />}
        >
          Guardar Comanda
        </Button>
      </Stack>
     <ErrorModal
        open={errorOpen}
        title="Error"
        message={errorMsg}
        onClose={() => setErrorOpen(false)}
      />
    </Box>    
  );
};

export default OrderCreationPage;
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, ReceiptLong } from '@mui/icons-material';
import PageTitle from '../components/Titles/PageTitle';
import { createPurchaseInvoice, deletePurchaseInvoice, getPurchaseInvoices } from '../services/purchaseInvoiceService';
import { getIngredients } from '../services/ingredientService';
import { formatCurrency } from '../utils/formatCurrency';
import { toBaseQuantity, UNIT_OPTIONS } from '../utils/costing';

const emptyLine = {
  ingredientId: '',
  ingredientName: '',
  quantityPurchased: '',
  purchaseUnit: 'kg',
  lineCost: '',
};

const emptyForm = {
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  currency: 'CRC',
  tax: '',
  notes: '',
  lines: [{ ...emptyLine }],
};

const PurchaseInvoicesPage = () => {
  const [ingredients, setIngredients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [ingredientData, invoiceData] = await Promise.all([getIngredients(), getPurchaseInvoices()]);
    setIngredients(ingredientData);
    setInvoices(invoiceData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const computedLines = useMemo(
    () =>
      form.lines.map((line) => {
        const ingredient = ingredients.find((item) => item.id === line.ingredientId);
        const baseQuantity = toBaseQuantity(line.quantityPurchased, line.purchaseUnit);
        const lineCost = Number(line.lineCost) || 0;
        const unitCost = baseQuantity > 0 ? lineCost / baseQuantity : 0;
        return {
          ...line,
          ingredientName: ingredient?.name || line.ingredientName || '',
          baseQuantity,
          unitCost,
        };
      }),
    [form.lines, ingredients]
  );

  const subtotal = useMemo(
    () => computedLines.reduce((sum, line) => sum + (Number(line.lineCost) || 0), 0),
    [computedLines]
  );
  const tax = Number(form.tax) || 0;
  const total = subtotal + tax;

  const updateLine = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: value } : line)),
    }));
  };

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }));
  const removeLine = (index) => setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, lineIndex) => lineIndex !== index) }));

  const handleSave = async () => {
    setSaving(true);
    await createPurchaseInvoice({
      ...form,
      subtotal,
      tax,
      total,
      lines: computedLines,
    });
    setForm(emptyForm);
    setSaving(false);
    await loadData();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageTitle
        title="Facturas de compra"
        subtitle="Registra compras de insumos y actualiza automáticamente su costo unitario"
        icon={ReceiptLong}
      />

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Registrar factura</Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Proveedor" value={form.supplierName} onChange={(e) => setForm((prev) => ({ ...prev, supplierName: e.target.value }))} fullWidth />
              <TextField label="Factura" value={form.invoiceNumber} onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))} fullWidth />
              <TextField label="Fecha" type="date" value={form.invoiceDate} onChange={(e) => setForm((prev) => ({ ...prev, invoiceDate: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            </Stack>

            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Insumo</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Unidad compra</TableCell>
                    <TableCell>Costo línea</TableCell>
                    <TableCell>Cantidad base</TableCell>
                    <TableCell>Costo unitario</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {computedLines.map((line, index) => (
                    <TableRow key={`line-${index}`}>
                      <TableCell sx={{ minWidth: 220 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={line.ingredientId}
                          onChange={(e) => updateLine(index, 'ingredientId', e.target.value)}
                        >
                          {ingredients.map((ingredient) => (
                            <MenuItem key={ingredient.id} value={ingredient.id}>{ingredient.name}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={line.quantityPurchased} onChange={(e) => updateLine(index, 'quantityPurchased', e.target.value)} inputProps={{ min: 0, step: '0.01' }} />
                      </TableCell>
                      <TableCell>
                        <TextField select size="small" value={line.purchaseUnit} onChange={(e) => updateLine(index, 'purchaseUnit', e.target.value)}>
                          {UNIT_OPTIONS.map((unit) => (
                            <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={line.lineCost} onChange={(e) => updateLine(index, 'lineCost', e.target.value)} inputProps={{ min: 0, step: '0.01' }} />
                      </TableCell>
                      <TableCell>{line.baseQuantity || 0}</TableCell>
                      <TableCell>{formatCurrency(line.unitCost || 0)}</TableCell>
                      <TableCell align="right">
                        <IconButton color="error" disabled={form.lines.length === 1} onClick={() => removeLine(index)}>
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Button variant="outlined" startIcon={<Add />} onClick={addLine} sx={{ alignSelf: 'flex-start' }}>
              Agregar línea
            </Button>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Impuesto" type="number" value={form.tax} onChange={(e) => setForm((prev) => ({ ...prev, tax: e.target.value }))} inputProps={{ min: 0, step: '0.01' }} fullWidth />
              <TextField label="Notas" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} fullWidth multiline minRows={1} />
            </Stack>

            <Alert severity="info">
              Subtotal: <strong>{formatCurrency(subtotal)}</strong> · Impuesto: <strong>{formatCurrency(tax)}</strong> · Total: <strong>{formatCurrency(total)}</strong>
            </Alert>

            <Button variant="contained" onClick={handleSave} disabled={saving || computedLines.some((line) => !line.ingredientId || !line.baseQuantity)}>
              Guardar factura
            </Button>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Factura</TableCell>
                <TableCell>Líneas</TableCell>
                <TableCell>Total</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceDate}</TableCell>
                  <TableCell>{invoice.supplierName}</TableCell>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.lines.length}</TableCell>
                  <TableCell>{formatCurrency(invoice.total)}</TableCell>
                  <TableCell align="right">
                    <IconButton color="error" onClick={() => deletePurchaseInvoice(invoice.id).then(loadData)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No hay facturas registradas.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Stack>
    </Box>
  );
};

export default PurchaseInvoicesPage;

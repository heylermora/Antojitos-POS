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
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Delete, ReceiptLong } from '@mui/icons-material';
import PageTitle from '../components/Titles/PageTitle';
import { createPurchaseInvoice, deletePurchaseInvoice, getPurchaseInvoices } from '../services/purchaseInvoiceService';
import { getIngredients } from '../services/ingredientService';
import { getSuppliers } from '../services/supplierService';
import { formatCurrency } from '../utils/formatCurrency';
import { toBaseQuantity, UNIT_OPTIONS } from '../utils/costing';
import { COSTA_RICA_TAX_OPTIONS, getTaxOptionByCode } from '../utils/taxCatalog';

const emptyLine = {
  ingredientId: '',
  ingredientName: '',
  quantityPurchased: '',
  purchaseUnit: 'kg',
  lineCost: '',
  taxCode: 'tax-exempt',
  manualTaxAmount: '',
};

const buildEmptyForm = () => ({
  supplierName: '',
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  currency: 'CRC',
  notes: '',
  lines: [{ ...emptyLine }],
});

const roundMoney = (value) => Number((Number(value) || 0).toFixed(2));

const PurchaseInvoicesPage = () => {
  const [ingredients, setIngredients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState(buildEmptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [ingredientData, supplierData, invoiceData] = await Promise.all([
      getIngredients(),
      getSuppliers(),
      getPurchaseInvoices(),
    ]);
    setIngredients(ingredientData);
    setSuppliers(supplierData.filter((supplier) => supplier.active !== false));
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
        const taxOption = getTaxOptionByCode(line.taxCode);
        const baseQuantity = toBaseQuantity(line.quantityPurchased, line.purchaseUnit);
        const lineCost = Number(line.lineCost) || 0;
        const defaultTaxAmount = roundMoney(lineCost * (taxOption.rate || 0));
        const taxAmount = taxOption.code === 'other'
          ? roundMoney(line.manualTaxAmount)
          : defaultTaxAmount;
        const lineTotal = roundMoney(lineCost + taxAmount);
        const unitCost = baseQuantity > 0 ? lineCost / baseQuantity : 0;

        return {
          ...line,
          ingredientName: ingredient?.name || line.ingredientName || '',
          baseQuantity,
          lineCost,
          unitCost,
          taxCode: taxOption.code,
          taxLabel: taxOption.shortLabel,
          taxRate: taxOption.rate,
          taxAmount,
          lineTotal,
        };
      }),
    [form.lines, ingredients]
  );

  const subtotal = useMemo(
    () => roundMoney(computedLines.reduce((sum, line) => sum + (Number(line.lineCost) || 0), 0)),
    [computedLines]
  );
  const tax = useMemo(
    () => roundMoney(computedLines.reduce((sum, line) => sum + (Number(line.taxAmount) || 0), 0)),
    [computedLines]
  );
  const total = roundMoney(subtotal + tax);

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
    setForm(buildEmptyForm());
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
        subtitle="Registra compras con impuestos por línea para manejar productos con distintos impuestos en una misma factura"
        icon={ReceiptLong}
      />

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Registrar factura</Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label="Proveedor"
                value={form.supplierName}
                onChange={(e) => setForm((prev) => ({ ...prev, supplierName: e.target.value }))}
                fullWidth
                helperText={suppliers.length === 0 ? 'Primero registra proveedores en la página de Proveedores.' : 'El proveedor seleccionado se agregará automáticamente al historial del insumo.'}
              >
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier.id} value={supplier.name}>{supplier.name}</MenuItem>
                ))}
              </TextField>
              <TextField label="Factura" value={form.invoiceNumber} onChange={(e) => setForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))} fullWidth />
              <TextField label="Fecha" type="date" value={form.invoiceDate} onChange={(e) => setForm((prev) => ({ ...prev, invoiceDate: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            </Stack>

            <Alert severity="info">
              Usa el costo de línea <strong>sin impuesto</strong> para costeo. Luego selecciona el impuesto de Costa Rica que aplica a cada producto para registrar el total correctamente.
            </Alert>

            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Insumo</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Unidad compra</TableCell>
                    <TableCell>Costo sin impuesto</TableCell>
                    <TableCell>Impuesto CR</TableCell>
                    <TableCell>Monto impuesto</TableCell>
                    <TableCell>Total línea</TableCell>
                    <TableCell>Cantidad base</TableCell>
                    <TableCell>Costo unitario</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {computedLines.map((line, index) => {
                    const selectedTaxOption = getTaxOptionByCode(line.taxCode);
                    return (
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
                        <TableCell sx={{ minWidth: 240 }}>
                          <TextField
                            select
                            size="small"
                            fullWidth
                            value={line.taxCode}
                            onChange={(e) => updateLine(index, 'taxCode', e.target.value)}
                            helperText={selectedTaxOption.description}
                          >
                            {COSTA_RICA_TAX_OPTIONS.map((taxOption) => (
                              <MenuItem key={taxOption.code} value={taxOption.code}>{taxOption.label}</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell>
                          {line.taxCode === 'other' ? (
                            <TextField
                              size="small"
                              type="number"
                              value={line.manualTaxAmount}
                              onChange={(e) => updateLine(index, 'manualTaxAmount', e.target.value)}
                              inputProps={{ min: 0, step: '0.01' }}
                            />
                          ) : (
                            <Tooltip title={`Tarifa aplicada: ${(selectedTaxOption.rate * 100).toFixed(0)}%`}>
                              <Typography variant="body2">{formatCurrency(line.taxAmount || 0)}</Typography>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(line.lineTotal || 0)}</TableCell>
                        <TableCell>{line.baseQuantity || 0}</TableCell>
                        <TableCell>{formatCurrency(line.unitCost || 0)}</TableCell>
                        <TableCell align="right">
                          <IconButton color="error" disabled={form.lines.length === 1} onClick={() => removeLine(index)}>
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>

            <Button variant="outlined" startIcon={<Add />} onClick={addLine} sx={{ alignSelf: 'flex-start' }}>
              Agregar línea
            </Button>

            <TextField label="Notas" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} fullWidth multiline minRows={2} />

            <Alert severity="success">
              Subtotal sin impuesto: <strong>{formatCurrency(subtotal)}</strong> · Impuestos: <strong>{formatCurrency(tax)}</strong> · Total factura: <strong>{formatCurrency(total)}</strong>
            </Alert>

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={
                saving ||
                suppliers.length === 0 ||
                computedLines.some((line) => !line.ingredientId || !line.baseQuantity || line.lineCost <= 0) ||
                !form.supplierName.trim()
              }
            >
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
                <TableCell>Subtotal</TableCell>
                <TableCell>Impuestos</TableCell>
                <TableCell>Total</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceDate}</TableCell>
                  <TableCell>{invoice.supplierName || '—'}</TableCell>
                  <TableCell>{invoice.invoiceNumber || '—'}</TableCell>
                  <TableCell>{invoice.lines.length}</TableCell>
                  <TableCell>{formatCurrency(invoice.subtotal)}</TableCell>
                  <TableCell>{formatCurrency(invoice.tax)}</TableCell>
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
                  <TableCell colSpan={8} align="center">
                    No hay facturas registradas.
                  </TableCell>
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

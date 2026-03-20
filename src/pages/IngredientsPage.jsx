import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Add, Delete, Science } from '@mui/icons-material';
import PageTitle from '../components/Titles/PageTitle';
import FormModal from '../components/Modals/FormModal';
import { createIngredient, deleteIngredient, getIngredients, updateIngredient } from '../services/ingredientService';
import { formatCurrency } from '../utils/formatCurrency';
import { UNIT_OPTIONS } from '../utils/costing';

const emptyIngredient = {
  name: '',
  category: 'General',
  baseUnit: 'g',
  currentUnitCost: '',
  supplierName: '',
  onHandQuantity: '',
  reorderPoint: '',
  wastePercent: '',
  active: true,
};

const IngredientsPage = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(emptyIngredient);

  const loadData = async () => {
    setLoading(true);
    const data = await getIngredients();
    setIngredients(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClose = () => {
    setOpen(false);
    setFormData(emptyIngredient);
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      currentUnitCost: Number(formData.currentUnitCost) || 0,
      onHandQuantity: Number(formData.onHandQuantity) || 0,
      reorderPoint: Number(formData.reorderPoint) || 0,
      wastePercent: Number(formData.wastePercent) || 0,
      active: String(formData.active) !== 'false',
    };

    if (formData.id) {
      await updateIngredient(formData.id, payload);
    } else {
      await createIngredient(payload);
    }

    handleClose();
    await loadData();
  };

  const handleEdit = (ingredient) => {
    setFormData({ ...ingredient, active: ingredient.active !== false });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteIngredient(id);
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
        title="Insumos"
        subtitle="Administra materias primas, costo unitario, stock disponible y punto de reorden"
        icon={Science}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Nuevo insumo
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Unidad base</TableCell>
              <TableCell>Costo unitario</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Reorden</TableCell>
              <TableCell>Merma %</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredients.map((ingredient) => {
              const isLowStock = Number(ingredient.onHandQuantity) <= Number(ingredient.reorderPoint);
              return (
                <TableRow key={ingredient.id} hover onClick={() => handleEdit(ingredient)} sx={{ cursor: 'pointer' }}>
                  <TableCell>{ingredient.name}</TableCell>
                  <TableCell>{ingredient.category}</TableCell>
                  <TableCell>{ingredient.baseUnit}</TableCell>
                  <TableCell>{formatCurrency(ingredient.currentUnitCost)}</TableCell>
                  <TableCell>{ingredient.onHandQuantity} {ingredient.baseUnit}</TableCell>
                  <TableCell>{ingredient.reorderPoint} {ingredient.baseUnit}</TableCell>
                  <TableCell>{ingredient.wastePercent}%</TableCell>
                  <TableCell>{ingredient.supplierName || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={isLowStock ? 'Reponer' : ingredient.active ? 'Activo' : 'Inactivo'} color={isLowStock ? 'warning' : ingredient.active ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="error" onClick={(event) => { event.stopPropagation(); handleDelete(ingredient.id); }}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {ingredients.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  No hay insumos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <FormModal
        open={open}
        onClose={handleClose}
        title={formData.id ? 'Editar insumo' : 'Nuevo insumo'}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSave}
        submitLabel="Guardar"
        fields={[
          { type: 'text', key: 'name', label: 'Nombre' },
          { type: 'text', key: 'category', label: 'Categoría' },
          {
            type: 'select',
            key: 'baseUnit',
            label: 'Unidad base',
            options: UNIT_OPTIONS.map((unit) => ({ value: unit, label: unit })),
          },
          { type: 'text', key: 'currentUnitCost', label: 'Costo unitario actual', inputProps: { type: 'number', min: 0, step: '0.01' } },
          { type: 'text', key: 'onHandQuantity', label: 'Stock disponible', inputProps: { type: 'number', min: 0, step: '0.01' } },
          { type: 'text', key: 'reorderPoint', label: 'Punto de reorden', inputProps: { type: 'number', min: 0, step: '0.01' } },
          { type: 'text', key: 'wastePercent', label: 'Merma %', inputProps: { type: 'number', min: 0, step: '0.01' } },
          { type: 'text', key: 'supplierName', label: 'Proveedor principal' },
          {
            type: 'select',
            key: 'active',
            label: 'Estado',
            options: [
              { value: true, label: 'Activo' },
              { value: false, label: 'Inactivo' },
            ],
          },
        ]}
      />
    </Box>
  );
};

export default IngredientsPage;

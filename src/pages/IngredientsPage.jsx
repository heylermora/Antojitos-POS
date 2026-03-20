import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
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
import { Add, Delete, Science } from '@mui/icons-material';
import PageTitle from '../components/Titles/PageTitle';
import FormModal from '../components/Modals/FormModal';
import { createIngredient, deleteIngredient, getIngredients, updateIngredient } from '../services/ingredientService';
import { formatCurrency } from '../utils/formatCurrency';
import { UNIT_OPTIONS } from '../utils/costing';
import { DEFAULT_INGREDIENT_CATEGORIES } from '../utils/taxCatalog';

const emptyIngredient = {
  name: '',
  categories: ['General'],
  baseUnit: 'g',
  currentUnitCost: 0,
  supplierName: '',
  supplierNames: [],
  active: true,
};

const IngredientsPage = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(emptyIngredient);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState([]);

  const ingredientCategoryOptions = useMemo(() => {
    const discoveredCategories = ingredients.flatMap((ingredient) => ingredient.categories || []).filter(Boolean);
    return [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...customCategories, ...discoveredCategories])].sort((a, b) => a.localeCompare(b));
  }, [ingredients, customCategories]);

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
    setNewCategoryName('');
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      categories: (formData.categories || []).filter(Boolean),
      currentUnitCost: Number(formData.currentUnitCost) || 0,
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
    setFormData({
      ...ingredient,
      categories: ingredient.categories?.length ? ingredient.categories : [ingredient.category || 'General'],
      supplierNames: ingredient.supplierNames || [],
      active: ingredient.active !== false,
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteIngredient(id);
    await loadData();
  };

  const handleAddCustomCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    setCustomCategories((prev) => [...new Set([...prev, trimmedName])]);
    setFormData((prev) => ({
      ...prev,
      categories: [...new Set([...(prev.categories || []), trimmedName])],
    }));
    setNewCategoryName('');
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
        subtitle="Administra materias primas, categorías múltiples y costos actualizados automáticamente desde facturas"
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
              <TableCell>Categorías</TableCell>
              <TableCell>Unidad base</TableCell>
              <TableCell>Costo actual</TableCell>
              <TableCell>Proveedores detectados</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredients.map((ingredient) => (
              <TableRow key={ingredient.id} hover onClick={() => handleEdit(ingredient)} sx={{ cursor: 'pointer' }}>
                <TableCell>{ingredient.name}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {(ingredient.categories || [ingredient.category]).map((category) => (
                      <Chip key={`${ingredient.id}-${category}`} size="small" label={category} variant="outlined" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>{ingredient.baseUnit}</TableCell>
                <TableCell>{formatCurrency(ingredient.currentUnitCost)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {(ingredient.supplierNames || []).length > 0 ? (
                      ingredient.supplierNames.map((supplierName) => (
                        <Chip key={`${ingredient.id}-${supplierName}`} size="small" color="secondary" label={supplierName} />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={ingredient.active ? 'Activo' : 'Inactivo'} color={ingredient.active ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <IconButton color="error" onClick={(event) => { event.stopPropagation(); handleDelete(ingredient.id); }}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {ingredients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
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
        submitDisabled={!formData.name?.trim() || !(formData.categories || []).length}
        fields={[
          { type: 'text', key: 'name', label: 'Nombre' },
          {
            type: 'multiselect',
            key: 'categories',
            label: 'Categorías',
            options: ingredientCategoryOptions.map((category) => ({ value: category, label: category })),
          },
          {
            type: 'custom',
            key: 'category-builder',
            render: () => (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="Nueva categoría personalizada"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                />
                <Button variant="outlined" onClick={handleAddCustomCategory} sx={{ minWidth: 180, height: 56 }}>
                  Agregar categoría
                </Button>
              </Stack>
            ),
          },
          {
            type: 'select',
            key: 'baseUnit',
            label: 'Unidad base',
            options: UNIT_OPTIONS.map((unit) => ({ value: unit, label: unit })),
          },
          {
            type: 'text',
            key: 'currentUnitCost',
            label: 'Costo unitario actual',
            inputProps: { type: 'number', min: 0, step: '0.01' },
            readOnly: true,
          },
          {
            type: 'custom',
            key: 'suppliers-readonly',
            render: () => (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Proveedores detectados</Typography>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {(formData.supplierNames || []).length > 0 ? (
                    formData.supplierNames.map((supplierName) => (
                      <Chip key={supplierName} size="small" color="secondary" label={supplierName} />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Se llenará automáticamente cuando registres facturas de compra para este insumo.
                    </Typography>
                  )}
                </Stack>
              </Stack>
            ),
          },
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

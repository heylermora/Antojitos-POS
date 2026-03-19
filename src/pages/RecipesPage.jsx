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
import { Add, Delete, MenuBook } from '@mui/icons-material';
import PageTitle from '../components/Titles/PageTitle';
import { getIngredients } from '../services/ingredientService';
import { deleteRecipe, getRecipes, saveRecipe } from '../services/recipeService';
import { getProducts } from '../services/productService';
import { buildCostContext, calculateRecipeCost, UNIT_OPTIONS } from '../utils/costing';
import { formatCurrency } from '../utils/formatCurrency';

const emptyLine = {
  itemType: 'ingredient',
  itemId: '',
  quantity: '',
  unit: 'g',
};

const emptyRecipe = {
  id: '',
  name: '',
  type: 'subrecipe',
  productId: '',
  productName: '',
  yieldQuantity: 1,
  yieldUnit: 'portion',
  notes: '',
  lines: [{ ...emptyLine }],
};

const RecipesPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyRecipe);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [recipeData, ingredientData, categoryData] = await Promise.all([getRecipes(), getIngredients(), getProducts()]);
    setRecipes(recipeData);
    setIngredients(ingredientData);
    setCategories(categoryData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const products = useMemo(
    () => categories.flatMap((category) => (category.products || []).map((product) => ({ ...product, categoryName: category.name }))),
    [categories]
  );

  const context = useMemo(
    () => buildCostContext({ ingredients, recipes, categories }),
    [ingredients, recipes, categories]
  );

  const preview = useMemo(() => {
    if (!form.lines.some((line) => line.itemId && Number(line.quantity) > 0)) return null;
    return calculateRecipeCost('__preview__', {
      ...context,
      recipeMap: new Map([
        ...context.recipeMap.entries(),
        ['__preview__', { ...form, id: '__preview__' }],
      ]),
    });
  }, [context, form]);

  const itemOptions = useMemo(() => ({
    ingredient: ingredients.map((ingredient) => ({ value: ingredient.id, label: `${ingredient.name} (${ingredient.baseUnit})` })),
    subrecipe: recipes
      .filter((recipe) => recipe.type === 'subrecipe' && recipe.id !== form.id)
      .map((recipe) => ({ value: recipe.id, label: `${recipe.name} (${recipe.yieldUnit})` })),
  }), [ingredients, recipes, form.id]);

  const updateLine = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const updated = { ...line, [key]: value };
        if (key === 'itemType') {
          updated.itemId = '';
          updated.itemName = '';
          updated.unit = value === 'ingredient' ? 'g' : 'portion';
        }
        return updated;
      }),
    }));
  };

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }));
  const removeLine = (index) => setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, lineIndex) => lineIndex !== index) }));

  const resetForm = () => setForm(emptyRecipe);

  const handleSave = async () => {
    setSaving(true);
    const product = products.find((item) => item.id === form.productId);
    const lines = form.lines.map((line) => {
      const source = line.itemType === 'ingredient'
        ? ingredients.find((ingredient) => ingredient.id === line.itemId)
        : recipes.find((recipe) => recipe.id === line.itemId);
      return {
        ...line,
        itemName: source?.name || '',
        quantity: Number(line.quantity) || 0,
      };
    });

    await saveRecipe({
      ...form,
      name: form.type === 'product' ? product?.name || form.name : form.name,
      productName: product?.name || '',
      lines,
      yieldQuantity: Number(form.yieldQuantity) || 1,
    });

    resetForm();
    setSaving(false);
    await loadData();
  };

  const handleEdit = (recipe) => {
    setForm({
      ...recipe,
      lines: recipe.lines.length ? recipe.lines : [{ ...emptyLine }],
    });
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
        title="Recetas y subrecetas"
        subtitle="Construye preparaciones reutilizables y costea cada platillo del menú"
        icon={MenuBook}
      />

      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>{form.id ? 'Editar receta' : 'Nueva receta'}</Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField select label="Tipo" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value, productId: '', name: '' }))} fullWidth>
                <MenuItem value="subrecipe">Subreceta</MenuItem>
                <MenuItem value="product">Platillo final</MenuItem>
              </TextField>

              {form.type === 'product' ? (
                <TextField select label="Producto" value={form.productId} onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))} fullWidth>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>{product.name} · {product.categoryName}</MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField label="Nombre" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} fullWidth />
              )}

              <TextField label="Rendimiento" type="number" value={form.yieldQuantity} onChange={(e) => setForm((prev) => ({ ...prev, yieldQuantity: e.target.value }))} inputProps={{ min: 0.01, step: '0.01' }} fullWidth />
              <TextField select label="Unidad de rendimiento" value={form.yieldUnit} onChange={(e) => setForm((prev) => ({ ...prev, yieldUnit: e.target.value }))} fullWidth>
                {UNIT_OPTIONS.map((unit) => (
                  <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Componente</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Unidad</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.lines.map((line, index) => (
                    <TableRow key={`recipe-line-${index}`}>
                      <TableCell>
                        <TextField select size="small" value={line.itemType} onChange={(e) => updateLine(index, 'itemType', e.target.value)}>
                          <MenuItem value="ingredient">Insumo</MenuItem>
                          <MenuItem value="subrecipe">Subreceta</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ minWidth: 260 }}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={line.itemId}
                          onChange={(e) => updateLine(index, 'itemId', e.target.value)}
                        >
                          {(itemOptions[line.itemType] || []).map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} inputProps={{ min: 0, step: '0.01' }} />
                      </TableCell>
                      <TableCell>
                        <TextField select size="small" value={line.unit} onChange={(e) => updateLine(index, 'unit', e.target.value)}>
                          {UNIT_OPTIONS.map((unit) => (
                            <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
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
              Agregar componente
            </Button>

            <TextField label="Notas" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} multiline minRows={2} fullWidth />

            {preview && (
              <Alert severity={preview.missingItems.length ? 'warning' : 'success'}>
                Costo total: <strong>{formatCurrency(preview.totalCost)}</strong> · Costo por {form.yieldUnit}: <strong>{formatCurrency(preview.unitCost)}</strong>
                {preview.missingItems.length > 0 && ` · ${preview.missingItems.join(' | ')}`}
              </Alert>
            )}

            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleSave} disabled={saving || (!form.name && !form.productId)}>
                Guardar receta
              </Button>
              <Button variant="text" onClick={resetForm}>Limpiar</Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Rendimiento</TableCell>
                <TableCell>Componentes</TableCell>
                <TableCell>Costo unitario</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recipes.map((recipe) => {
                const computed = calculateRecipeCost(recipe.id, context);
                return (
                  <TableRow key={recipe.id} hover onClick={() => handleEdit(recipe)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{recipe.name}</TableCell>
                    <TableCell>{recipe.type === 'product' ? 'Platillo' : 'Subreceta'}</TableCell>
                    <TableCell>{recipe.yieldQuantity} {recipe.yieldUnit}</TableCell>
                    <TableCell>{recipe.lines.length}</TableCell>
                    <TableCell>{formatCurrency(computed.unitCost)}</TableCell>
                    <TableCell align="right">
                      <IconButton color="error" onClick={(event) => { event.stopPropagation(); deleteRecipe(recipe.id).then(loadData); }}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {recipes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No hay recetas registradas.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Stack>
    </Box>
  );
};

export default RecipesPage;

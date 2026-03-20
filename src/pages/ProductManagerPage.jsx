import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
  Paper,
  CircularProgress,
  Stack,
} from '@mui/material';
import { ExpandMore, Edit, Delete, Add, Inventory } from '@mui/icons-material';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import { getIngredients } from '../services/ingredientService';
import { getRecipes } from '../services/recipeService';
import { saveCategory } from '../services/categoryService';
import { buildCostContext, enrichCategoriesWithCosting } from '../utils/costing';
import { formatCurrency } from '../utils/formatCurrency';
import FormModal from '../components/Modals/FormModal';
import PageTitle from '../components/Titles/PageTitle';

const ProductManagerPage = () => {
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', categoryId: '', categoryName: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState({ categoryId: null, product: null });

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedProducts, fetchedIngredients, fetchedRecipes] = await Promise.all([
      getProducts(),
      getIngredients().catch(() => []),
      getRecipes().catch(() => []),
    ]);

    setCategories(fetchedProducts);
    setIngredients(fetchedIngredients);
    setRecipes(fetchedRecipes);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const enrichedCategories = useMemo(() => {
    const context = buildCostContext({ ingredients, recipes, categories });
    return enrichCategoriesWithCosting(categories, context);
  }, [categories, ingredients, recipes]);

  const handleAddProduct = (category) => {
    setNewProduct({ name: '', price: '', categoryName: category.name, categoryId: category.id });
    setEditing({ categoryId: category.id, product: null });
    setModalOpen(true);
  };

  const handleEditProduct = (product, categoryId) => {
    setNewProduct({ ...product, categoryId, categoryName: product.categoryName || categories.find((category) => category.id === categoryId)?.name || '' });
    setEditing({ categoryId, product });
    setModalOpen(true);
  };

  const handleDeleteProduct = async (productId) => {
    await deleteProduct(productId);
    await loadData();
  };

  const handleSaveProduct = async () => {
    const selectedCategory = categories.find((category) => category.id === (newProduct.categoryId || editing.categoryId));
    const payload = {
      ...newProduct,
      price: Number(newProduct.price) || 0,
      categoryId: newProduct.categoryId || editing.categoryId,
      categoryName: selectedCategory?.name || newProduct.categoryName || 'Sin categoría',
    };

    if (editing.product) {
      await updateProduct(newProduct.id, payload);
    } else {
      const id = `product_${Date.now()}`;
      await createProduct({ ...payload, id });
    }

    await loadData();
    setModalOpen(false);
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim() === '') return;
    await saveCategory({ name: newCategoryName.trim() });
    setNewCategoryName('');
    setCategoryModalOpen(false);
    await loadData();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1100px', mx: 'auto' }}>
      <PageTitle
        title="Gestión de Productos"
        subtitle="Administra el menú, precios y categorías persistentes con su costo y utilidad actual"
        icon={Inventory}
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        El costo y margen se calculan con la receta vigente y el último costo unitario de insumos cargado por factura.
      </Alert>

      {enrichedCategories.map((category) => (
        <Accordion key={category.id} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Typography sx={{ flexGrow: 1, fontWeight: 500 }}>{category.name}</Typography>
              <Fab
                color="primary"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddProduct(category);
                }}
                sx={{ ml: 1 }}
              >
                <Add fontSize="small" />
              </Fab>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Costo</TableCell>
                    <TableCell>Utilidad</TableCell>
                    <TableCell>Margen</TableCell>
                    <TableCell>Estado receta</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {category.products.map((prod) => (
                    <TableRow key={prod.id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography>{prod.name}</Typography>
                          {prod.missingItems?.length > 0 && (
                            <Typography variant="caption" color="warning.main">
                              {prod.missingItems.join(' · ')}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{formatCurrency(prod.price)}</TableCell>
                      <TableCell>{formatCurrency(prod.costCurrent)}</TableCell>
                      <TableCell>{formatCurrency(prod.profitCurrent)}</TableCell>
                      <TableCell>{prod.marginCurrent}%</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={prod.recipeStatus}
                          color={prod.recipeStatus === 'Costeado' ? 'success' : prod.recipeStatus === 'Receta incompleta' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="primary" onClick={() => handleEditProduct(prod, category.id)}><Edit /></IconButton>
                        <IconButton color="error" onClick={() => handleDeleteProduct(prod.id)}><Delete /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {category.products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">No hay productos en esta categoría</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </AccordionDetails>
        </Accordion>
      ))}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Agregar / Editar Producto"
        formData={newProduct}
        setFormData={setNewProduct}
        onSubmit={handleSaveProduct}
        submitLabel="Guardar"
        fields={[
          { type: 'text', key: 'name', label: 'Nombre' },
          { type: 'text', key: 'price', label: 'Precio', inputProps: { type: 'number', min: 0, step: '0.01' } },
          {
            type: 'select',
            key: 'categoryId',
            label: 'Categoría',
            options: categories.map((category) => ({ value: category.id, label: category.name })),
          },
        ]}
      />

      <Fab color="secondary" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={() => setCategoryModalOpen(true)}>
        <Add />
      </Fab>

      <FormModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Agregar nueva categoría"
        formData={{ name: newCategoryName }}
        setFormData={({ name }) => setNewCategoryName(name)}
        onSubmit={handleAddCategory}
        submitLabel="Agregar"
        fields={[{ type: 'text', key: 'name', label: 'Nombre de la categoría' }]}
        maxWidth="xs"
      />
    </Box>
  );
};

export default ProductManagerPage;

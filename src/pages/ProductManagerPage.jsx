/**
 * 📦 ProductManagerPage – Gestión de productos y categorías
 *
 * Página principal para visualizar, crear, editar y eliminar productos agrupados por categoría.
 * Utiliza MUI, acordeones para categorías y un modal reutilizable para productos.
 *
 * Funcionalidades:
 * - Listado por categoría con expansión
 * - Modal para agregar/editar productos
 * - Diálogo para agregar nuevas categorías
 * - CRUD con servicios externos (productService)
 */

import { useEffect, useState } from 'react';
import {
  Box,
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
  CircularProgress
} from '@mui/material';
import { ExpandMore, Edit, Delete, Add, Inventory } from '@mui/icons-material';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import FormModal from '../modals/FormModal';
import PageTitle from '../components/PageTitle';

const ProductManagerPage = () => {
  const [categories, setCategories] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', categoryName: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState({ categoryId: null, product: null });

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      const fetched = await getProducts();
      setCategories(fetched);
      setIsLoading(false);
    };
    loadProducts();
  }, []);

  const handleAddProduct = (category) => {
    setNewProduct({ name: '', price: '', categoryName: category.name });
    setEditing({ categoryId: category.id, product: null });
    setModalOpen(true);
  };

  const handleEditProduct = (product, categoryId) => {
    setNewProduct(product);
    setEditing({ categoryId, product });
    setModalOpen(true);
  };

  const handleDeleteProduct = async (productId) => {
    await deleteProduct(productId);
    const updated = await getProducts();
    setCategories(updated);
  };

  const handleSaveProduct = async () => {
    if (editing.product) {
      await updateProduct(newProduct.id, newProduct);
    } else {
      const id = Date.now().toString();
      const productWithId = { ...newProduct, id, categoryId: editing.categoryId };
      await createProduct(productWithId);
    }
    const updated = await getProducts();
    setCategories(updated);
    setModalOpen(false);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() === '') return;

    const categoryId = `cat-${newCategoryName.trim().toLowerCase().replace(/\s+/g, '-')}`;
    const newCat = {
      id: categoryId,
      name: newCategoryName.trim(),
      products: [],
    };

    setCategories(prev => [...prev, newCat]);
    setNewCategoryName('');
    setCategoryModalOpen(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '900px', mx: 'auto' }}>
      <PageTitle
        title="Gestión de Productos"
        subtitle="Administra el menú, precios y disponibilidad de productos"
        icon={Inventory}
      />

      {categories.map(category => (
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
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {category.products.map((prod) => (
                    <TableRow key={prod.id} hover>
                      <TableCell>{prod.name}</TableCell>
                      <TableCell>₡{prod.price}</TableCell>
                      <TableCell align="right">
                        <IconButton color="primary" onClick={() => handleEditProduct(prod, category.id)}><Edit /></IconButton>
                        <IconButton color="error" onClick={() => handleDeleteProduct(prod.id)}><Delete /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {category.products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">No hay productos en esta categoría</TableCell>
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
          { type: 'text', key: 'price', label: 'Precio', inputProps: { type: 'number' } },
          {
            type: 'select',
            key: 'categoryName',
            label: 'Categoría',
            options: categories.map(c => ({ value: c.name, label: c.name }))
          }
        ]}
      />

      <Fab
        color="secondary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setCategoryModalOpen(true)}
      >
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
        fields={[
          { type: 'text', key: 'name', label: 'Nombre de la categoría' }
        ]}
        maxWidth="xs"
      />
    </Box>
  );
};

export default ProductManagerPage;
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
import { Add, Delete, LocalShipping } from '@mui/icons-material';
import PageTitle from '../components/Titles/PageTitle';
import FormModal from '../components/Modals/FormModal';
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from '../services/supplierService';

const emptySupplier = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  notes: '',
  active: true,
};

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(emptySupplier);

  const loadData = async () => {
    setLoading(true);
    const data = await getSuppliers();
    setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClose = () => {
    setOpen(false);
    setFormData(emptySupplier);
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      active: String(formData.active) !== 'false',
    };

    if (formData.id) {
      await updateSupplier(formData.id, payload);
    } else {
      await createSupplier(payload);
    }

    handleClose();
    await loadData();
  };

  const handleEdit = (supplier) => {
    setFormData({ ...supplier, active: supplier.active !== false });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteSupplier(id);
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
        title="Proveedores"
        subtitle="Administra la información detallada de cada proveedor en una página exclusiva"
        icon={LocalShipping}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Nuevo proveedor
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Proveedor</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Notas</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id} hover onClick={() => handleEdit(supplier)} sx={{ cursor: 'pointer' }}>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.contactName || '—'}</TableCell>
                <TableCell>{supplier.phone || '—'}</TableCell>
                <TableCell>{supplier.email || '—'}</TableCell>
                <TableCell>{supplier.notes || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={supplier.active ? 'Activo' : 'Inactivo'} color={supplier.active ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <IconButton color="error" onClick={(event) => { event.stopPropagation(); handleDelete(supplier.id); }}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {suppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay proveedores registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <FormModal
        open={open}
        onClose={handleClose}
        title={formData.id ? 'Editar proveedor' : 'Nuevo proveedor'}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSave}
        submitLabel="Guardar"
        submitDisabled={!formData.name?.trim()}
        fields={[
          { type: 'text', key: 'name', label: 'Nombre del proveedor' },
          { type: 'text', key: 'contactName', label: 'Contacto' },
          { type: 'text', key: 'phone', label: 'Teléfono' },
          { type: 'text', key: 'email', label: 'Correo' },
          { type: 'text', key: 'notes', label: 'Notas', multiline: true },
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

export default SuppliersPage;

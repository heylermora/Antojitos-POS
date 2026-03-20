import { useEffect, useState } from 'react';
import {
  login,
  hydrateAuthOnBoot,
  setCurrentRole,
  setCurrentOperatorContext,
} from '../services/authService';
import { getEmployees } from '../services/worklogService';
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
  TextField,
  Button,
  Paper,
  InputAdornment,
  IconButton,
  MenuItem,
  Stack,
} from '@mui/material';
import { Visibility, VisibilityOff, LocalDining } from '@mui/icons-material';

const LoginPage = ({ onLoginSuccess }) => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'collaborator',
    employeeId: '',
    adminName: '',
  });
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const data = await getEmployees();
        setEmployees(data || []);
      } catch {
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

  const mapFirebaseError = (code) => {
    switch (code) {
      case 'auth/invalid-email': return 'El correo no es válido.';
      case 'auth/user-disabled': return 'La cuenta está deshabilitada.';
      case 'auth/user-not-found': return 'No existe una cuenta con ese correo.';
      case 'auth/wrong-password': return 'Contraseña incorrecta.';
      case 'auth/too-many-requests': return 'Demasiados intentos. Intenta más tarde.';
      case 'auth/network-request-failed': return 'Error de red. Revisa tu conexión.';
      default: return 'No se pudo iniciar sesión.';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resolveOperatorContext = () => {
    if (form.role === 'admin') {
      const adminName = form.adminName.trim();
      if (!adminName) {
        throw new Error('Indica el nombre del administrador para la auditoría automática.');
      }

      return {
        name: adminName,
        employeeId: '',
        source: 'manual',
      };
    }

    const employee = employees.find((item) => String(item.id) === String(form.employeeId));
    if (!employee) {
      throw new Error('Selecciona un colaborador del registro de horas antes de ingresar.');
    }

    return {
      name: employee.name || employee.id,
      employeeId: employee.id,
      source: 'employee',
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const email = form.email?.trim();
    const password = form.password ?? '';

    if (!email || !password) {
      setError('Por favor ingresa correo y contraseña.');
      return;
    }

    let operatorContext;
    try {
      operatorContext = resolveOperatorContext();
    } catch (validationError) {
      setError(validationError.message);
      return;
    }

    setLoading(true);
    try {
      const { user } = await login({ email, password });
      const role = setCurrentRole(form.role);
      const operator = setCurrentOperatorContext(operatorContext);
      await hydrateAuthOnBoot();

      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess({ ...user, role, operatorName: operator.name, operatorEmployeeId: operator.employeeId });
      }
    } catch (err) {
      const msg = mapFirebaseError(err?.code) || err?.message || 'Error de autenticación.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isCollaborator = form.role === 'collaborator';

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #d4972b, #904120)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={8} sx={{ p: 5, borderRadius: 4, width: 380, textAlign: 'center', backgroundColor: '#fff7f0' }}>
        <Box sx={{ mb: 3 }}>
          <LocalDining sx={{ fontSize: 40, color: '#d4972b' }} />
          <Typography variant="h5" fontWeight={700} color="#904120">
            Antojitos del Alma
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inicio de sesión para empleados
          </Typography>
        </Box>
        <form onSubmit={handleSubmit}>
          <Stack spacing={1.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              fullWidth
              name="role"
              select
              label="Perfil de acceso"
              value={form.role}
              onChange={handleChange}
              helperText="Colaborador se elige desde el registro de horas; Administrador escribe su nombre."
            >
              <MenuItem value="collaborator">Colaborador</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </TextField>

            {isCollaborator ? (
              <TextField
                fullWidth
                select
                name="employeeId"
                label="Colaborador"
                value={form.employeeId}
                onChange={handleChange}
                disabled={loadingEmployees}
                helperText={loadingEmployees ? 'Cargando colaboradores desde el registro de horas...' : 'Esta lista sale automáticamente del registro de horas.'}
              >
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={String(employee.id)}>{employee.name}</MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                fullWidth
                name="adminName"
                label="Nombre del administrador"
                value={form.adminName}
                onChange={handleChange}
                helperText="Se usará automáticamente para auditar todas las acciones de esta sesión."
              />
            )}

            {loadingEmployees && isCollaborator && <CircularProgress size={22} sx={{ alignSelf: 'center' }} />}

            <TextField
              fullWidth
              name="email"
              type="email"
              label="Correo electrónico"
              value={form.email}
              onChange={handleChange}
            />
            <TextField
              fullWidth
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              value={form.password}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || (isCollaborator && loadingEmployees)}
              sx={{ mt: 1, backgroundColor: '#904120', '&:hover': { backgroundColor: '#703119' } }}
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;

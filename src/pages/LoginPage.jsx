import { useState } from 'react';
import { login, hydrateAuthOnBoot } from '../services/authService';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, LocalDining } from '@mui/icons-material';

const LoginPage = ({ onLoginSuccess }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [/*loading*/, setLoading] = useState(false);
  const [/*error*/, setError] = useState('');

  const mapFirebaseError = (code) => {
    switch (code) {
      case 'auth/invalid-email':        return 'El correo no es válido.';
      case 'auth/user-disabled':        return 'La cuenta está deshabilitada.';
      case 'auth/user-not-found':       return 'No existe una cuenta con ese correo.';
      case 'auth/wrong-password':       return 'Contraseña incorrecta.';
      case 'auth/too-many-requests':    return 'Demasiados intentos. Intenta más tarde.';
      case 'auth/network-request-failed': return 'Error de red. Revisa tu conexión.';
      default:                          return 'No se pudo iniciar sesión.';
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validación mínima
    const email = form.email?.trim();
    const password = form.password ?? '';
    if (!email || !password) {
      setError('Por favor ingresa correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      // 1) Firebase sign-in (nuestro service devuelve { user })
      const { user } = await login({ email, password });

      // 2) Rehidrata sesión (opcional; mantiene store y listener en sync)
      await hydrateAuthOnBoot();

      // 3) (Opcional) Si vas a llamar tu API, toma el ID Token
      // const idToken = await getAccessToken();

      // 4) Notifica éxito (redirigir o levantar estado al padre)
      if (typeof onLoginSuccess === 'function') onLoginSuccess(user);
      // p.ej.: window.location.assign('/dashboard');

    } catch (err) {
      // err puede traer message o code de Firebase
      const msg = mapFirebaseError(err?.code) || err?.message || 'Error de autenticación.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #d4972b, #904120)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={8} sx={{ p: 5, borderRadius: 4, width: 350, textAlign: 'center', backgroundColor: '#fff7f0' }}>
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
          <TextField
            fullWidth
            margin="normal"
            name="email"
            type="email"
            label="Correo electrónico"
            value={form.email}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="normal"
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
            sx={{ mt: 3, backgroundColor: '#904120', '&:hover': { backgroundColor: '#703119' } }}
          >
            Iniciar sesión
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;

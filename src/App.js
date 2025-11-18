/**
 * 🧭 App – Navegación principal del sistema POS
 *
 * Controla la autenticación y muestra vistas según el menú seleccionado.
 * Incluye Drawer lateral con navegación a:
 * - Nueva Comanda
 * - Gestión de Productos
 * - Historial de Ventas
 * - Comandas en Cocina
 * - Dashboard de Ventas 📊
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  Box
} from '@mui/material';
import {
  RestaurantMenu,
  Inventory2,
  ReceiptLong,
  ListAlt,
  BarChart,
  WorkHistory,
  Menu as MenuIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

import OrderCreationPage from './pages/OrderCreationPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import ProductManagerPage from './pages/ProductManagerPage';
import KitchenOrdersPage from './pages/KitchenOrdersPage';
import SalesDashboardPage from './pages/SalesDashboardPage';
import WorkLogHistoryPage from './pages/WorkLogHistoryPage';
import LoginPage from './pages/LoginPage';

import * as authService from './services/authService';

const App = () => {

  const getInitialViewIndex = () => {
    const storedIndex = localStorage.getItem('app.viewIndex');
    return storedIndex !== null ? parseInt(storedIndex, 10) : 0;
  };

  const [viewIndex, setViewIndex] = useState(getInitialViewIndex);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  useEffect(() => {
    localStorage.setItem('app.viewIndex', viewIndex.toString());
  }, [viewIndex]);

  useEffect(() => {
    const unsubscribe = authService.subscribeAuth((user) => {
        setIsAuthenticated(!!user);
    });

    return () => unsubscribe(); 
  }, []);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    // El subscribeAuth lo debería manejar, pero forzamos el estado por si acaso
    setIsAuthenticated(false);
  }, []);

  const menuItems = [
    { label: 'Nueva Comanda', icon: <RestaurantMenu />, index: 0 },
    { label: 'Comandas', icon: <ListAlt />, index: 1 },
    { label: 'Historial de Ventas', icon: <ReceiptLong />, index: 2 },
    { label: 'Gestión de Productos', icon: <Inventory2 />, index: 3 },
    { label: 'Dashboard de Ventas', icon: <BarChart />, index: 4 },
    { label: 'Registro de horas', icon: <WorkHistory />, index: 5 }
  ];

  const renderCurrentView = () => {
    switch (viewIndex) {
      case 0: return <OrderCreationPage />;
      case 1: return <KitchenOrdersPage />;
      case 2: return <SalesHistoryPage />;
      case 3: return <ProductManagerPage />;
      case 4: return <SalesDashboardPage />;
      case 5: return <WorkLogHistoryPage />;
      default: return <Typography>Vista no encontrada.</Typography>;
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Box sx={{ backgroundColor: '#fffaf5', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ backgroundColor: '#d4972b' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
              Antojitos - POS
            </Typography>
          </Box>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box
          sx={{ width: 250, backgroundColor: '#fffaf5', height: '100%' }}
          role="presentation"
          onClick={() => setDrawerOpen(false)}
        >
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.index} disablePadding>
                <ListItemButton onClick={() => setViewIndex(item.index)}>
                  {item.icon}
                  <ListItemText primary={item.label} sx={{ ml: 2 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Container sx={{ py: 4 }}>
        {renderCurrentView()}
      </Container>
    </Box>
  );
};

export default App;
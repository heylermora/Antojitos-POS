import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Box,
  Collapse,
  ListItemIcon,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import {
  RestaurantMenu,
  Inventory2,
  ReceiptLong,
  ListAlt,
  BarChart,
  WorkHistory,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Science,
  MenuBook,
  ShoppingCart,
  LocalShipping,
  ExpandLess,
  ExpandMore,
  PointOfSale,
  Insights,
  Storefront,
  HistoryEdu,
} from '@mui/icons-material';

import OrderCreationPage from './pages/OrderCreationPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import ProductManagerPage from './pages/ProductManagerPage';
import KitchenOrdersPage from './pages/KitchenOrdersPage';
import SalesDashboardPage from './pages/SalesDashboardPage';
import WorkLogHistoryPage from './pages/WorkLogHistoryPage';
import LoginPage from './pages/LoginPage';
import IngredientsPage from './pages/IngredientsPage';
import RecipesPage from './pages/RecipesPage';
import PurchaseInvoicesPage from './pages/PurchaseInvoicesPage';
import SuppliersPage from './pages/SuppliersPage';
import AuditLogPage from './pages/AuditLogPage';
import OfflineBanner from './components/Banners/OfflineBanner';

import * as authService from './services/authService';

const menuSections = [
  {
    id: 'operacion',
    label: 'Operación diaria',
    description: 'Accesos rápidos para atención y cocina.',
    icon: <PointOfSale fontSize="small" />,
    items: [
      { label: 'Nueva Comanda', icon: <RestaurantMenu />, index: 0, roles: ['collaborator', 'admin'] },
      { label: 'Comandas', icon: <ListAlt />, index: 1, roles: ['collaborator', 'admin'] },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas y seguimiento',
    description: 'Históricos, métricas y control del personal.',
    icon: <Insights fontSize="small" />,
    items: [
      { label: 'Historial de Ventas', icon: <ReceiptLong />, index: 2, roles: ['admin'] },
      { label: 'Dashboard', icon: <BarChart />, index: 4, roles: ['admin'] },
      { label: 'Registro de horas', icon: <WorkHistory />, index: 5, roles: ['admin'] },
      { label: 'Auditoría', icon: <HistoryEdu />, index: 10, roles: ['admin'] },
    ],
  },
  {
    id: 'catalogo',
    label: 'Catálogo y abastecimiento',
    description: 'Productos, recetas e insumos del negocio.',
    icon: <Storefront fontSize="small" />,
    items: [
      { label: 'Gestión de Productos', icon: <Inventory2 />, index: 3, roles: ['admin'] },
      { label: 'Insumos', icon: <Science />, index: 6, roles: ['admin'] },
      { label: 'Recetas', icon: <MenuBook />, index: 7, roles: ['admin'] },
      { label: 'Proveedores', icon: <LocalShipping />, index: 8, roles: ['admin'] },
      { label: 'Facturas de compra', icon: <ShoppingCart />, index: 9, roles: ['admin'] },
    ],
  },
];

const getMenuSectionsForRole = (role) =>
  menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => (item.roles || ['admin']).includes(role)),
    }))
    .filter((section) => section.items.length > 0);

const getRoleLabel = (role) => (role === 'admin' ? 'Administrador' : 'Colaborador');

const App = () => {
  const getInitialViewIndex = () => {
    const storedIndex = localStorage.getItem('app.viewIndex');
    return storedIndex !== null ? parseInt(storedIndex, 10) : 0;
  };

  const [viewIndex, setViewIndex] = useState(getInitialViewIndex);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [currentRole, setCurrentRole] = useState(authService.getCurrentRole());
  const [currentOperatorName, setCurrentOperatorName] = useState(authService.getCurrentOperatorName());
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [expandedSections, setExpandedSections] = useState(() =>
    menuSections.reduce((accumulator, section) => {
      accumulator[section.id] = true;
      return accumulator;
    }, {})
  );

  const availableMenuSections = useMemo(() => getMenuSectionsForRole(currentRole), [currentRole]);
  const allowedViewIndexes = useMemo(
    () => availableMenuSections.flatMap((section) => section.items.map((item) => item.index)),
    [availableMenuSections]
  );

  useEffect(() => {
    localStorage.setItem('app.viewIndex', viewIndex.toString());
  }, [viewIndex]);

  useEffect(() => {
    if (!allowedViewIndexes.includes(viewIndex) && allowedViewIndexes.length > 0) {
      setViewIndex(allowedViewIndexes[0]);
    }
  }, [allowedViewIndexes, viewIndex]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = authService.subscribeAuth((user) => {
      setIsAuthenticated(!!user);
      if (user) {
        setCurrentRole(authService.getCurrentRole());
        setCurrentOperatorName(authService.getCurrentOperatorName());
      }
    });

    return () => unsubscribe();
  }, []);

  const activeMenuContext = useMemo(() => {
    for (const section of availableMenuSections) {
      const activeItem = section.items.find((item) => item.index === viewIndex);
      if (activeItem) {
        return { section, item: activeItem };
      }
    }

    return {
      section: availableMenuSections[0] || menuSections[0],
      item: availableMenuSections[0]?.items?.[0] || menuSections[0].items[0],
    };
  }, [availableMenuSections, viewIndex]);

  useEffect(() => {
    if (!activeMenuContext?.section?.id) return;

    setExpandedSections((currentSections) => ({
      ...currentSections,
      [activeMenuContext.section.id]: true,
    }));
  }, [activeMenuContext]);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setCurrentRole('collaborator');
    setCurrentOperatorName('');
  }, []);

  const handleViewChange = (nextViewIndex) => {
    setViewIndex(nextViewIndex);
    setDrawerOpen(false);
  };

  const handleSectionToggle = (sectionId) => {
    setExpandedSections((currentSections) => ({
      ...currentSections,
      [sectionId]: !currentSections[sectionId],
    }));
  };

  const renderCurrentView = () => {
    switch (viewIndex) {
      case 0: return <OrderCreationPage />;
      case 1: return <KitchenOrdersPage />;
      case 2: return <SalesHistoryPage />;
      case 3: return <ProductManagerPage />;
      case 4: return <SalesDashboardPage />;
      case 5: return <WorkLogHistoryPage />;
      case 6: return <IngredientsPage />;
      case 7: return <RecipesPage />;
      case 8: return <SuppliersPage />;
      case 9: return <PurchaseInvoicesPage />;
      case 10: return <AuditLogPage />;
      default: return <Typography>Vista no encontrada.</Typography>;
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ backgroundColor: '#fffaf5', minHeight: '100vh' }}>
        <OfflineBanner isOnline={isOnline} />
        <LoginPage onLoginSuccess={() => {
          setCurrentRole(authService.getCurrentRole());
          setCurrentOperatorName(authService.getCurrentOperatorName());
          setIsAuthenticated(true);
        }} />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#fffaf5', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ backgroundColor: '#d4972b' }}>
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                Antojitos - POS
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {activeMenuContext.section.label} · {activeMenuContext.item.label}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {currentOperatorName && (
              <Chip size="small" label={`Usuario: ${currentOperatorName}`} sx={{ backgroundColor: 'rgba(255,255,255,0.18)', color: 'white' }} />
            )}
            <Chip size="small" label={`Rol: ${getRoleLabel(currentRole)}`} sx={{ backgroundColor: 'rgba(255,255,255,0.18)', color: 'white' }} />
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <OfflineBanner isOnline={isOnline} />

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box
          sx={{ width: 320, backgroundColor: '#fffaf5', height: '100%' }}
          role="presentation"
        >
          <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'rgba(0, 0, 0, 0.08)' }}>
            <Typography variant="overline" sx={{ color: '#b36d00', fontWeight: 700, letterSpacing: 1.1 }}>
              Menú principal
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#4e342e' }}>
              Navegación jerárquica
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Organiza el trabajo por áreas para encontrar cada módulo más rápido.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              {currentOperatorName && <Chip size="small" label={`Usuario: ${currentOperatorName}`} />}
              <Chip size="small" label={`Acceso actual: ${getRoleLabel(currentRole)}`} />
            </Stack>
          </Box>

          <List sx={{ px: 1.5, py: 1.5 }}>
            {availableMenuSections.map((section, sectionIndex) => {
              const isExpanded = expandedSections[section.id];
              const isActiveSection = activeMenuContext.section.id === section.id;

              return (
                <Box key={section.id} sx={{ mb: 1.5 }}>
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => handleSectionToggle(section.id)}
                      sx={{
                        borderRadius: 2,
                        alignItems: 'flex-start',
                        py: 1.25,
                        backgroundColor: isActiveSection ? 'rgba(212, 151, 43, 0.12)' : 'transparent',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: isActiveSection ? '#b36d00' : '#6d4c41', mt: 0.25 }}>
                        {section.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={section.label}
                        secondary={section.description}
                        primaryTypographyProps={{ fontWeight: 600, color: '#4e342e' }}
                        secondaryTypographyProps={{ fontSize: '0.78rem' }}
                      />
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                  </ListItem>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List disablePadding sx={{ pl: 1.5 }}>
                      {section.items.map((item) => {
                        const isActive = item.index === viewIndex;
                        return (
                          <ListItem key={item.index} disablePadding>
                            <ListItemButton
                              onClick={() => handleViewChange(item.index)}
                              sx={{
                                borderRadius: 2,
                                pl: 2,
                                backgroundColor: isActive ? 'rgba(144, 65, 32, 0.1)' : 'transparent',
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 38, color: isActive ? '#904120' : '#8d6e63' }}>
                                {item.icon}
                              </ListItemIcon>
                              <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                  fontWeight: isActive ? 700 : 500,
                                  color: isActive ? '#904120' : '#5d4037',
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>

                  {sectionIndex < availableMenuSections.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                </Box>
              );
            })}
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {renderCurrentView()}
      </Container>
    </Box>
  );
};

export default App;

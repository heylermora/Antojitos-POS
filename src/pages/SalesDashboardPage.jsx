/**
 * 📈 SalesDashboardPage – Dashboard de ventas y utilidad
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { BarChart as Chart } from '@mui/icons-material';
import PageTitle from '../components/Titles/PageTitle';
import { getOrderEventDate, getPaidOrders } from '../services/orderService';
import { getProducts } from '../services/productService';
import { getIngredients } from '../services/ingredientService';
import { getRecipes } from '../services/recipeService';
import { buildCostContext, computeProfitabilityFromOrders } from '../utils/costing';
import { formatCurrency } from '../utils/formatCurrency';
import { computeCashClosure } from '../utils/salesReporting';

const COLORS = ['#42a5f5', '#ffb74d', '#66bb6a', '#ba68c8', '#ef5350'];

const SalesDashboardPage = () => {
  const theme = useTheme();
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilters, setGlobalFilters] = useState({ start: '', end: '' });
  const [dailyFilters, setDailyFilters] = useState({ start: '', end: '' });
  const [paymentFilters, setPaymentFilters] = useState({ start: '', end: '' });
  const [hourlyFilters, setHourlyFilters] = useState({ start: '', end: '' });

  useEffect(() => {
    const loadData = async () => {
      const [paidOrders, fetchedProducts, fetchedIngredients, fetchedRecipes] = await Promise.all([
        getPaidOrders(),
        getProducts(),
        getIngredients().catch(() => []),
        getRecipes().catch(() => []),
      ]);
      setOrders(paidOrders);
      setCategories(fetchedProducts);
      setIngredients(fetchedIngredients);
      setRecipes(fetchedRecipes);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const getOrderTimestamp = useCallback((order) => {
    return getOrderEventDate(order);
  }, []);

  const applyDateRange = useCallback((data, filters) => {
    if (!filters.start && !filters.end) return data;
    const start = filters.start ? new Date(filters.start) : null;
    const end = filters.end ? new Date(filters.end) : null;
    return data.filter((order) => {
      const ts = getOrderTimestamp(order);
      if (!ts) return false;
      if (start && ts < start) return false;
      if (end && ts > end) return false;
      return true;
    });
  }, [getOrderTimestamp]);

  const mergedFilters = useCallback((localFilters) => ({
    start: localFilters.start || globalFilters.start,
    end: localFilters.end || globalFilters.end,
  }), [globalFilters]);

  const computeDaily = useCallback((data) => {
    const totals = new Map();
    data.forEach((order) => {
      const ts = getOrderTimestamp(order);
      if (!ts) return;
      const dateKey = ts.toLocaleDateString('es-ES');
      const existing = totals.get(dateKey);
      const dateValue = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate());
      totals.set(dateKey, {
        total: (existing?.total || 0) + order.total,
        dateValue: existing?.dateValue || dateValue,
      });
    });
    return Array.from(totals.entries())
      .map(([date, value]) => ({ date, total: value.total, dateValue: value.dateValue }))
      .sort((a, b) => a.dateValue - b.dateValue)
      .map(({ date, total }) => ({ date, total }));
  }, [getOrderTimestamp]);

  const computePayment = useCallback((data) => {
    const summary = {};
    data.forEach((order) => {
      if (Array.isArray(order.paymentMethod)) {
        order.paymentMethod.forEach((payment) => {
          const method = payment.paymentMethod || 'Otro';
          summary[method] = (summary[method] || 0) + payment.amount;
        });
      } else {
        const method = order.paymentMethod || 'Otro';
        summary[method] = (summary[method] || 0) + order.total;
      }
    });
    return Object.entries(summary).map(([name, value]) => ({ name, value }));
  }, []);

  const computeHourly = useCallback((data) => {
    const hourly = new Array(24).fill(0);
    data.forEach((order) => {
      const ts = getOrderTimestamp(order);
      if (!ts) return;
      hourly[ts.getHours()] += order.total;
    });
    return hourly.map((value, hour) => ({ hour: `${hour}:00`, total: value }));
  }, [getOrderTimestamp]);

  const globalFilteredOrders = useMemo(() => applyDateRange(orders, globalFilters), [applyDateRange, orders, globalFilters]);
  const dailyOrders = useMemo(() => applyDateRange(globalFilteredOrders, mergedFilters(dailyFilters)), [applyDateRange, globalFilteredOrders, mergedFilters, dailyFilters]);
  const paymentOrders = useMemo(() => applyDateRange(globalFilteredOrders, mergedFilters(paymentFilters)), [applyDateRange, globalFilteredOrders, mergedFilters, paymentFilters]);
  const hourlyOrders = useMemo(() => applyDateRange(globalFilteredOrders, mergedFilters(hourlyFilters)), [applyDateRange, globalFilteredOrders, mergedFilters, hourlyFilters]);

  const dailyData = useMemo(() => computeDaily(dailyOrders), [computeDaily, dailyOrders]);
  const paymentData = useMemo(() => computePayment(paymentOrders), [computePayment, paymentOrders]);
  const hourlyData = useMemo(() => computeHourly(hourlyOrders), [computeHourly, hourlyOrders]);

  const summary = useMemo(() => {
    const total = dailyOrders.reduce((sum, order) => sum + order.total, 0);
    const count = dailyOrders.length;
    return { total, count, average: count ? total / count : 0 };
  }, [dailyOrders]);

  const profitability = useMemo(() => {
    const context = buildCostContext({ ingredients, recipes, categories });
    return computeProfitabilityFromOrders(globalFilteredOrders, context);
  }, [ingredients, recipes, categories, globalFilteredOrders]);
  const cashClosure = useMemo(() => computeCashClosure(globalFilteredOrders), [globalFilteredOrders]);

  const kpis = [
    { label: 'Ventas', value: formatCurrency(summary.total), color: COLORS[0] },
    { label: 'Nº de Órdenes', value: summary.count, color: COLORS[1] },
    { label: 'Ticket promedio', value: formatCurrency(summary.average), color: COLORS[2] },
    { label: 'Costo estimado', value: formatCurrency(profitability.totals.cost), color: COLORS[3] },
    { label: 'Utilidad estimada', value: formatCurrency(profitability.totals.profit), color: COLORS[4] },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageTitle
        title="Dashboard de Ventas y Utilidad"
        subtitle="Resumen comercial, costo estimado y rentabilidad por producto"
        icon={Chart}
      />

      <Box
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>Filtros generales</Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField label="Desde" type="datetime-local" value={globalFilters.start} onChange={(event) => setGlobalFilters((prev) => ({ ...prev, start: event.target.value }))} InputLabelProps={{ shrink: true }} sx={{ minWidth: 240 }} />
          <TextField label="Hasta" type="datetime-local" value={globalFilters.end} onChange={(event) => setGlobalFilters((prev) => ({ ...prev, end: event.target.value }))} InputLabelProps={{ shrink: true }} sx={{ minWidth: 240 }} />
          <Chip label={`Rango actual: ${globalFilters.start || 'Sin inicio'} → ${globalFilters.end || 'Sin fin'}`} color="primary" variant="outlined" />
        </Box>
      </Box>

      <Box display="flex" gap={3} mb={4} flexWrap="wrap">
        {kpis.map((kpi) => (
          <Box
            key={kpi.label}
            flex={1}
            sx={{
              p: 3,
              borderLeft: `6px solid ${kpi.color}`,
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              minWidth: 220,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">{kpi.label}</Typography>
            <Typography variant="h6" fontWeight={600}>{kpi.value}</Typography>
          </Box>
        ))}
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        La utilidad es estimada con la receta vigente y el costo unitario actual de insumos. Si un producto no tiene receta, su costo se toma como 0.
      </Alert>

      <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>Cierre de caja del rango actual</Typography>
        <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
          <Chip label={`Órdenes: ${cashClosure.count}`} color="primary" variant="outlined" />
          <Chip label={`Ventas: ${formatCurrency(cashClosure.totalSales)}`} color="success" variant="outlined" />
          <Chip label={`Recibido: ${formatCurrency(cashClosure.totalTendered)}`} variant="outlined" />
          <Chip label={`Vuelto: ${formatCurrency(cashClosure.totalChange)}`} variant="outlined" />
          <Chip label={`Neto cobrado: ${formatCurrency(cashClosure.netCollected)}`} color="secondary" />
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Método</TableCell>
              <TableCell align="right">Monto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cashClosure.methods.map((method) => (
              <TableRow key={method.name}>
                <TableCell>{method.name}</TableCell>
                <TableCell align="right">{formatCurrency(method.value)}</TableCell>
              </TableRow>
            ))}
            {cashClosure.methods.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center">No hay pagos en el rango seleccionado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Box display="flex" gap={3} mb={4} flexWrap="wrap">
        <Box flex={1} minWidth="300px" sx={{ p: 3, borderRadius: 2, backgroundColor: theme.palette.background.paper, height: 420, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Ventas por día</Typography>
          <Box display="flex" gap={2} mb={2} flexWrap="wrap">
            <TextField label="Desde" type="datetime-local" value={dailyFilters.start} onChange={(event) => setDailyFilters((prev) => ({ ...prev, start: event.target.value }))} InputLabelProps={{ shrink: true }} size="small" />
            <TextField label="Hasta" type="datetime-local" value={dailyFilters.end} onChange={(event) => setDailyFilters((prev) => ({ ...prev, end: event.target.value }))} InputLabelProps={{ shrink: true }} size="small" />
          </Box>
          <Box flex={1}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="total" stroke={COLORS[0]} strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Box flex={1} minWidth="300px" sx={{ p: 3, borderRadius: 2, backgroundColor: theme.palette.background.paper, height: 420, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Métodos de pago</Typography>
          <Box display="flex" gap={2} mb={2} flexWrap="wrap">
            <TextField label="Desde" type="datetime-local" value={paymentFilters.start} onChange={(event) => setPaymentFilters((prev) => ({ ...prev, start: event.target.value }))} InputLabelProps={{ shrink: true }} size="small" />
            <TextField label="Hasta" type="datetime-local" value={paymentFilters.end} onChange={(event) => setPaymentFilters((prev) => ({ ...prev, end: event.target.value }))} InputLabelProps={{ shrink: true }} size="small" />
          </Box>
          <Box flex={1}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" outerRadius={120} label>
                  {paymentData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>

      <Box display="flex" gap={3} mb={4} flexWrap="wrap">
        <Box flex={1} minWidth="300px" sx={{ p: 3, borderRadius: 2, backgroundColor: theme.palette.background.paper, height: 420, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Ventas por hora</Typography>
          <Box display="flex" gap={2} mb={2} flexWrap="wrap">
            <TextField label="Desde" type="datetime-local" value={hourlyFilters.start} onChange={(event) => setHourlyFilters((prev) => ({ ...prev, start: event.target.value }))} InputLabelProps={{ shrink: true }} size="small" />
            <TextField label="Hasta" type="datetime-local" value={hourlyFilters.end} onChange={(event) => setHourlyFilters((prev) => ({ ...prev, end: event.target.value }))} InputLabelProps={{ shrink: true }} size="small" />
          </Box>
          <Box flex={1}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="total" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Paper variant="outlined" sx={{ flex: 1, minWidth: '320px', p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Rentabilidad por producto</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Cant.</TableCell>
                <TableCell align="right">Ventas</TableCell>
                <TableCell align="right">Costo</TableCell>
                <TableCell align="right">Utilidad</TableCell>
                <TableCell align="right">Margen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profitability.items.slice(0, 8).map((item) => (
                <TableRow key={item.name}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(item.revenue)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.cost)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.profit)}</TableCell>
                  <TableCell align="right">{item.margin}%</TableCell>
                </TableRow>
              ))}
              {profitability.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No hay ventas pagadas en el rango seleccionado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  );
};

export default SalesDashboardPage;

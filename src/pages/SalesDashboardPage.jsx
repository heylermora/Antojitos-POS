/**
 * 📈 SalesDashboardPage – Dashboard de ventas
 *
 * Funcionalidades:
 * - Muestra un resumen visual interactivo de las ventas
 * - KPIs de resumen (Total, Nº de Órdenes, Promedio)
 * - Gráfica de líneas con ventas por día
 * - Gráfica de pastel con métodos de pago
 * - Gráfica de barras con ventas por hora
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  useTheme,
  CircularProgress,
  TextField,
  Chip
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { getPaidOrders } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { BarChart as Chart } from '@mui/icons-material';
import PageTitle from '../components/Titles/PageTitle';

const COLORS = ['#42a5f5', '#ffb74d', '#66bb6a', '#ba68c8', '#ef5350'];

const SalesDashboardPage = () => {
  const theme = useTheme();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilters, setGlobalFilters] = useState({
    start: '',
    end: '',
  });
  const [dailyFilters, setDailyFilters] = useState({
    start: '',
    end: '',
  });
  const [paymentFilters, setPaymentFilters] = useState({
    start: '',
    end: '',
  });
  const [hourlyFilters, setHourlyFilters] = useState({
    start: '',
    end: '',
  });

  useEffect(() => {
    const loadData = async () => {
      const paidOrders = await getPaidOrders();
      setOrders(paidOrders);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const getOrderTimestamp = useCallback((order) => {
    if (order?.timestamp?.seconds) {
      return new Date(order.timestamp.seconds * 1000 + order.timestamp.nanoseconds / 1e6);
    }
    if (order?.createdAt) {
      return new Date(order.createdAt);
    }
    return null;
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
    const resumen = {};
    data.forEach((order) => {
      if (Array.isArray(order.paymentMethod)) {
        order.paymentMethod.forEach((pago) => {
          const metodo = pago.paymentMethod || 'Otro';
          resumen[metodo] = (resumen[metodo] || 0) + pago.amount;
        });
      } else {
        const metodo = order.paymentMethod || 'Otro';
        resumen[metodo] = (resumen[metodo] || 0) + order.total;
      }
    });
    return Object.entries(resumen).map(([name, value]) => ({ name, value }));
  }, []);

  const computeHourly = useCallback((data) => {
    const hourly = new Array(24).fill(0);
    data.forEach((order) => {
      const ts = getOrderTimestamp(order);
      if (!ts) return;
      const hour = ts.getHours();
      hourly[hour] += order.total;
    });
    return hourly.map((v, h) => ({ hour: `${h}:00`, total: v }));
  }, [getOrderTimestamp]);

  const globalFilteredOrders = useMemo(
    () => applyDateRange(orders, globalFilters),
    [applyDateRange, orders, globalFilters]
  );
  const dailyOrders = useMemo(
    () => applyDateRange(globalFilteredOrders, mergedFilters(dailyFilters)),
    [applyDateRange, globalFilteredOrders, mergedFilters, dailyFilters]
  );
  const paymentOrders = useMemo(
    () => applyDateRange(globalFilteredOrders, mergedFilters(paymentFilters)),
    [applyDateRange, globalFilteredOrders, mergedFilters, paymentFilters]
  );
  const hourlyOrders = useMemo(
    () => applyDateRange(globalFilteredOrders, mergedFilters(hourlyFilters)),
    [applyDateRange, globalFilteredOrders, mergedFilters, hourlyFilters]
  );

  const dailyData = useMemo(() => computeDaily(dailyOrders), [computeDaily, dailyOrders]);
  const paymentData = useMemo(() => computePayment(paymentOrders), [computePayment, paymentOrders]);
  const hourlyData = useMemo(() => computeHourly(hourlyOrders), [computeHourly, hourlyOrders]);

  const summary = useMemo(() => {
    const total = dailyOrders.reduce((sum, order) => sum + order.total, 0);
    const count = dailyOrders.length;
    return { total, count, average: count ? total / count : 0 };
  }, [dailyOrders]);

  const kpis = [
    { label: 'Total', value: formatCurrency(summary.total), color: COLORS[0] },
    { label: 'Nº de Órdenes', value: summary.count, color: COLORS[1] },
    { label: 'Promedio', value: formatCurrency(summary.average), color: COLORS[2] },
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
        title="Dashboard de Ventas"
        subtitle="Resumen general de ventas y métricas"
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
        <Typography variant="subtitle1" fontWeight={600}>
          Filtros generales
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            label="Desde"
            type="datetime-local"
            value={globalFilters.start}
            onChange={(event) => setGlobalFilters((prev) => ({ ...prev, start: event.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 240 }}
          />
          <TextField
            label="Hasta"
            type="datetime-local"
            value={globalFilters.end}
            onChange={(event) => setGlobalFilters((prev) => ({ ...prev, end: event.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 240 }}
          />
          <Chip
            label={`Rango actual: ${globalFilters.start || 'Sin inicio'} → ${globalFilters.end || 'Sin fin'}`}
            color="primary"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* KPIs */}
      <Box display="flex" gap={3} mb={4} flexWrap="wrap">
        {kpis.map((kpi, i) => (
          <Box
            key={i}
            flex={1}
            sx={{
              p: 3,
              borderLeft: `6px solid ${kpi.color}`,
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {kpi.label}
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {kpi.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Gráficas */}
      <Box display="flex" gap={3} mb={4} flexWrap="wrap">
        <Box
          flex={1}
          minWidth="300px"
          sx={{
            p: 3,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            height: 420,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Ventas por Día 📈
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                label="Desde"
                type="datetime-local"
                value={dailyFilters.start}
                onChange={(event) => setDailyFilters((prev) => ({ ...prev, start: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="Hasta"
                type="datetime-local"
                value={dailyFilters.end}
                onChange={(event) => setDailyFilters((prev) => ({ ...prev, end: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
            </Box>
          </Box>
          <Box flex={1}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={value => formatCurrency(value)} />
                <Line type="monotone" dataKey="total" stroke={COLORS[0]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Box
          flex={1}
          minWidth="300px"
          sx={{
            p: 3,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            height: 420,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Métodos de Pago 💳
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                label="Desde"
                type="datetime-local"
                value={paymentFilters.start}
                onChange={(event) => setPaymentFilters((prev) => ({ ...prev, start: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="Hasta"
                type="datetime-local"
                value={paymentFilters.end}
                onChange={(event) => setPaymentFilters((prev) => ({ ...prev, end: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
            </Box>
          </Box>
          <Box flex={1}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" outerRadius={80}>
                  {paymentData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={value => formatCurrency(value)} />
                <Legend verticalAlign="bottom" layout="horizontal" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Box
          flex={1}
          minWidth="300px"
          sx={{
            p: 3,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            height: 420,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Ventas por Hora ⏰
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                label="Desde"
                type="datetime-local"
                value={hourlyFilters.start}
                onChange={(event) => setHourlyFilters((prev) => ({ ...prev, start: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="Hasta"
                type="datetime-local"
                value={hourlyFilters.end}
                onChange={(event) => setHourlyFilters((prev) => ({ ...prev, end: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
            </Box>
          </Box>
          <Box flex={1}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip formatter={value => formatCurrency(value)} />
                <Bar dataKey="total" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SalesDashboardPage;

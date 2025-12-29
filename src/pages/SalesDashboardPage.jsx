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

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  useTheme,
  CircularProgress
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { getPaidOrdersGroupedByDay } from '../services/orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { BarChart as Chart } from '@mui/icons-material';
import PageTitle from '../components/PageTitle';

const COLORS = ['#42a5f5', '#ffb74d', '#66bb6a', '#ba68c8', '#ef5350'];

const SalesDashboardPage = () => {
  const theme = useTheme();
  const [dailyData, setDailyData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, average: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const grouped = await getPaidOrdersGroupedByDay();
      let total = 0, count = 0;

      const daily = Object.entries(grouped).map(([date, orders]) => {
        const sum = orders.reduce((s, o) => s + o.total, 0);
        total += sum; 
        count += orders.length;
        return { date: date, total: sum };
      }).sort((a, b) => a.date - b.date);

      setDailyData(daily);
      setSummary({ total, count, average: count ? total / count : 0 });

      const resumen = {};
      
      Object.values(grouped).flat().forEach(order => {
        if (Array.isArray(order.paymentMethod)) {
          order.paymentMethod.forEach(pago => {
            const metodo = pago.paymentMethod || 'Otro';
            resumen[metodo] = (resumen[metodo] || 0) + pago.amount;
          });
        } else {
          const metodo = order.paymentMethod || 'Otro';
          resumen[metodo] = (resumen[metodo] || 0) + order.total;
        }
      });
      setPaymentData(Object.entries(resumen).map(([name, value]) => ({ name, value })));

      const hourly = new Array(24).fill(0);
      Object.values(grouped).flat().forEach(order => {
        const hour = new Date(order.createdAt).getHours();
        hourly[hour] += order.total;
      });
      setHourlyData(hourly.map((v, h) => ({ hour: `${h}:00`, total: v })));

      setIsLoading(false);
    };

    loadData();
  }, []);

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
        {[{
          title: 'Ventas por Día 📈',
          content: (
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={value => formatCurrency(value)} />
                <Line type="monotone" dataKey="total" stroke={COLORS[0]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )
        },
        {
          title: 'Métodos de Pago 💳',
          content: (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" outerRadius={80}>
                  {
                  paymentData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={value => formatCurrency(value)} />
                <Legend verticalAlign="bottom" layout="horizontal" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )
        },
        {
          title: 'Ventas por Hora ⏰',
          content: (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip formatter={value => formatCurrency(value)} />
                <Bar dataKey="total" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        }].map((chart, i) => (
          <Box
            key={i}
            flex={1}
            minWidth="300px"
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              height: 350,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              {chart.title}
            </Typography>
            <Box flex={1}>{chart.content}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SalesDashboardPage;
import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { HistoryEdu } from '@mui/icons-material';
import PageTitle from '../components/Titles/PageTitle';
import { getAuditLogs } from '../services/auditService';

const getActionLabel = (action) => {
  switch (action) {
    case 'create': return 'Creó';
    case 'update': return 'Actualizó';
    case 'delete': return 'Eliminó';
    case 'status_change': return 'Cambió estado';
    default: return action;
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-CR');
};

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      const data = await getAuditLogs();
      setLogs(data);
      setLoading(false);
    };

    loadLogs();
  }, []);

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
        title="Auditoría de acciones"
        subtitle="Registro automático de quién hizo cada acción operativa y administrativa en el sistema"
        icon={HistoryEdu}
      />

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Fecha</TableCell>
              <TableCell>Colaborador</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Acción</TableCell>
              <TableCell>Módulo</TableCell>
              <TableCell>Referencia</TableCell>
              <TableCell>Detalle</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{formatDateTime(log.createdAtIso)}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography>{log.actor?.operatorName || log.actor?.displayName || log.actor?.email || 'Sesión sin nombre'}</Typography>
                    <Typography variant="caption" color="text.secondary">{log.actor?.email || 'Sin correo visible'}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={log.actor?.roleLabel || 'Sin rol'} />
                </TableCell>
                <TableCell>{getActionLabel(log.action)}</TableCell>
                <TableCell>{log.entityType || '—'}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography>{log.entityLabel || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{log.entityId || 'Sin id'}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>{log.summary || '—'}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay eventos de auditoría registrados todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default AuditLogPage;

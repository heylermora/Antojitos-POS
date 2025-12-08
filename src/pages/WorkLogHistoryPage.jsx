/**
 * ⏱️ WorkLogHistoryPage – Historial semanal (filas=empleados, columnas=días)
 * - Agrupa registros por día/empleado
 * - Totales por día y total semanal
 * - Click en celda → crear/editar horas (modal)
 * - Validación HH:MM y fin > inicio (hora local)
 * - Navegación de semanas
 * - CRUD de empleados con confirmación
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Typography, Divider, Chip, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, CircularProgress, Tooltip, Link
} from '@mui/material';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FormModal from '../modals/FormModal';
import ConfirmModal from '../modals/ConfirmModal';
import {
  getWorkLogs, getEmployees,
  createEmployee, updateEmployee, deleteEmployee,
  createWorkLog, updateWorkLog
} from '../services/worklogService';
import * as timekit from '../utils/timekit';

// Convierte employeeId para la API (num si es dígitos, de lo contrario string)
const toApiEmployeeId = (id) => {
  if (id === 'all' || id == null) return undefined;
  return /^[0-9]+$/.test(String(id)) ? Number(id) : String(id);
};

// ---------- Component ----------
export default function WorkLogHistoryPage() {
  const [historyByDay, setHistoryByDay] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('all'); // siempre string en UI
  const [weekStart, setWeekStart] = useState(() => timekit.startOfWeek(new Date()));
  const weekEnd = useMemo(() => timekit.endOfWeek(weekStart), [weekStart]);

  // Modales
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({ id:null, name:'', phone:'' });
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logForm, setLogForm] = useState({ employeeId:'', date:'', start:'', end:'' });
  const [editingLogId, setEditingLogId] = useState(null);
  const [confirmDel, setConfirmDel] = useState({ open:false, emp:null });

  const weekKeys = useMemo(
    () => timekit.getWeekDateKeys(weekStart),
    [weekStart]
  );

const todayKey = timekit.getTodayKey();

  // Empleados
  useEffect(() => { (async () => {
    setIsLoading(true);
    const emps = await getEmployees().catch(()=>[]);
    setEmployees(emps);
    setIsLoading(false);
  })(); }, []);

  // Logs semana
  const fetchWeekLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const { from, to } = timekit.toIsoRange(weekStart, weekEnd);
      const filters = { from, to };

      const apiEmpId = toApiEmployeeId(employeeId);
      if (apiEmpId !== undefined) filters.employeeId = apiEmpId;

      const logs = await getWorkLogs(filters).catch(()=>[]);
      const map = {};
      logs.forEach(l => {
        const when = l.startAt || l.endAt;
        if (!when) return;
        const k = timekit.toLocalDateKey(when);          // clave por día en horario local
        (map[k] ??= []).push(l);
      });
      setHistoryByDay(map);
    } finally { setIsLoading(false); }
  }, [employeeId, weekStart, weekEnd]);

  useEffect(()=>{ fetchWeekLogs(); },[fetchWeekLogs]);

  // Índices derivados
  const hoursByEmpDay = useMemo(() => {
    const acc = {};
    weekKeys.forEach(k => (historyByDay[k] || []).forEach(l => {
      const empKey = String(l.employeeId ?? '—'); // clave normalizada
      (acc[empKey] ??= {});
      acc[empKey][k] = (acc[empKey][k] || 0) + timekit.calcHours(l);
    }));
    return acc;
  }, [historyByDay, weekKeys]);

  const totalByDay = useMemo(()=>Object.fromEntries(
    weekKeys.map(k=>[k,(historyByDay[k]||[]).reduce((a,l)=>a+timekit.calcHours(l),0)])
  ),[historyByDay, weekKeys]);

  const totalWeek = useMemo(()=>Object.values(totalByDay).reduce((a,b)=>a+b,0),[totalByDay]);

  const visibleEmployees = useMemo(()=>(
    employeeId!=='all'
      ? employees.filter(e => String(e.id) === String(employeeId))
      : [...employees].sort((a,b)=>a.name.localeCompare(b.name,'es'))
  ),[employees, employeeId]);

  const lastLogByEmpDay = useMemo(() => {
    const idx = {};
    // iteramos todos los logs cargados y construimos índice por (emp|fechaLocal)
    Object.keys(historyByDay).forEach(k => {
      (historyByDay[k] || []).forEach(l => {
        const dateKey = timekit.toLocalDateKey(l.startAt || l.endAt || k);
        const empKey  = String(l.employeeId ?? '—');
        const key     = `${empKey}|${dateKey}`;
        const ts      = new Date(l.endAt || l.startAt || 0).getTime();
        if (!idx[key] || ts > idx[key].__ts) idx[key] = { ...l, __ts: ts };
      });
    });
    return idx;
  }, [historyByDay]);

  // --- Acciones Empleado ---
  const openCreateEmp = () => { setEmpForm({id:null,name:'',phone:''}); setEmpModalOpen(true); };
  const openEditEmp   = (e) => { setEmpForm({id:e.id,name:e.name||'',phone:e.phone||''}); setEmpModalOpen(true); };
  const saveEmp = async () => {
    empForm.id ? await updateEmployee(empForm.id,{name:empForm.name,phone:empForm.phone})
               : await createEmployee({name:empForm.name,phone:empForm.phone});
    setEmpModalOpen(false);
    setEmployees(await getEmployees().catch(()=>employees));
  };
  const askRemoveEmp = (emp) => setConfirmDel({open:true, emp});
  const confirmRemoveEmp = async () => {
    const e=confirmDel.emp; if(!e) return;
    await deleteEmployee(e.id);
    const refreshed=await getEmployees().catch(()=>employees);
    setEmployees(refreshed);
    if (String(employeeId) === String(e.id)) setEmployeeId('all');
    setConfirmDel({open:false, emp:null});
  };

  // --- Acciones WorkLog ---
  const openNewEntry = (empId, dateKey) => {
    const resolvedEmp    = (employeeId!=='all' ? employeeId : empId) || '';
    const resolvedEmpStr = String(resolvedEmp);
    const resolvedDate   = String(dateKey || timekit.toIsoDateKey(new Date()));
    const existing       = lastLogByEmpDay[`${resolvedEmpStr}|${resolvedDate}`];

    if (existing) {
      const s = new Date(existing.startAt);
      const e = new Date(existing.endAt);
      setLogForm({
        employeeId: resolvedEmpStr,
        date: resolvedDate,
        start: timekit.toHHMM(s),
        end:   timekit.toHHMM(e),
      });
    } else {
      setLogForm({ employeeId:resolvedEmpStr, date:resolvedDate, start:'', end:'' });
      setEditingLogId(null);
    }
    setLogModalOpen(true);
  };

  const saveLog = async () => {
    const { employeeId:empId, date, start, end } = logForm;
    if (!empId || !date || !start || !end) return;
    if (!timekit.isValidTime(start) || !timekit.isValidTime(end)) { alert('Formato de hora inválido. Usa HH:MM'); return; }
    if (timekit.minutesOf(end) <= timekit.minutesOf(start)) { alert('La hora de fin debe ser mayor que la de inicio.'); return; }

    const startAt = timekit.buildLocalDateTime(date,start).toISOString();
    const endAt   = timekit.buildLocalDateTime(date,end).toISOString();

    if (editingLogId) {
      await updateWorkLog(editingLogId,{ employeeId: empId, startAt, endAt });
    } else {
      await createWorkLog({ employeeId: empId, startAt, endAt });
    }

    setLogModalOpen(false); setEditingLogId(null);
    await fetchWeekLogs();
  };

  // ---------- Render ----------
  return (
    <Box p={2}>
      <Stack spacing={1.5} sx={{ p:1.5, bgcolor:'background.paper', borderRadius:2, boxShadow:1, border: t=>`1px solid ${t.palette.divider}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center" minWidth={220}>
            <WorkHistoryIcon /><Typography variant="h5" fontWeight={700}>Historial de Horas</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Tooltip title="Nuevo empleado">
              <IconButton color="primary" onClick={openCreateEmp}><AddIcon /></IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Divider />
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Semana anterior">
              <IconButton onClick={()=>setWeekStart(p=>{ const d=new Date(p); d.setDate(p.getDate()-7); return timekit.startOfWeek(d); })}><ChevronLeftIcon/></IconButton>
            </Tooltip>
            <Typography variant="subtitle1" sx={{ minWidth:180, textAlign:'center', fontWeight:600 }}>
              {timekit.rangeLabel(weekStart, weekEnd)}
            </Typography>
            <Tooltip title="Siguiente semana">
              <IconButton onClick={()=>setWeekStart(p=>{ const d=new Date(p); d.setDate(p.getDate()+7); return timekit.startOfWeek(d); })}><ChevronRightIcon/></IconButton>
            </Tooltip>
          </Stack>
          <Chip label={`Total semana: ${timekit.fmtHours(Number(totalWeek.toFixed(2)))}`} color="success" sx={{ fontWeight:600 }} />
        </Stack>
      </Stack>

      <br/>

      {isLoading ? (
        <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'40vh' }}><CircularProgress/></Box>
      ) : visibleEmployees.length===0 ? (
        <Typography>No hay empleados registrados.</Typography>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell/>
                <TableCell>Empleado</TableCell>
                {weekKeys.map(k=>{
                  const d = timekit.fromDateKey(k);
                  const isToday = k === todayKey;

                  return (
                    <TableCell key={k} align="right" sx={{ p:1, bgcolor:isToday?'action.hover':undefined }}>
                      <Tooltip title={d.toLocaleDateString('es-CR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}>
                        <Stack alignItems="flex-end" spacing={0}>
                          <Typography variant="caption" sx={{ textTransform:'uppercase', letterSpacing:.5, opacity:.7 }}>
                            {d.toLocaleDateString('es-CR',{weekday:'short'})}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight:700, fontVariantNumeric:'tabular-nums' }}>
                            {d.toLocaleDateString('es-CR',{day:'2-digit',month:'2-digit'})}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                  );
                })}
                <TableCell align="right"><strong>Total</strong></TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleEmployees.map(emp=>{
                const empKey  = String(emp.id);
                const totalRow = weekKeys.reduce((a,k)=>a+(((hoursByEmpDay[empKey]||{})[k])||0),0);
                return (
                  <TableRow key={emp.id} hover>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                        <Tooltip title="Editar empleado"><IconButton size="small" onClick={()=>openEditEmp(emp)}><EditIcon fontSize="small"/></IconButton></Tooltip>
                        <Tooltip title="Eliminar empleado"><IconButton size="small" color="error" onClick={()=>askRemoveEmp(emp)}><DeleteOutlineIcon fontSize="small"/></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>{emp.name}</TableCell>
                    {weekKeys.map(k=>{
                      const v=((hoursByEmpDay[empKey]||{})[k])||0;
                      const label=v?timekit.fmtHours(Number(v.toFixed(2))):'—';
                      return (
                        <TableCell key={k} align="right" sx={{ whiteSpace:'nowrap' }}>
                          <Tooltip title={v?'Editar registro':'Agregar horas'}>
                            <Link
                              component="button" underline="hover"
                              onClick={()=>openNewEntry(emp.id,k)}
                              sx={{ fontVariantNumeric:'tabular-nums', fontWeight:v?600:400 }}
                              aria-label={`${v?'Editar':'Agregar'} horas de ${emp.name} para ${new Date(k).toLocaleDateString('es-CR')}`}
                              data-emp={emp.id} data-date={k}
                            >
                              {label}
                            </Link>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                    <TableCell align="right"><strong>{timekit.fmtHours(Number(totalRow.toFixed(2)))}</strong></TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={2}><strong>Total semana</strong></TableCell>
                {weekKeys.map(k=>(
                  <TableCell key={k} align="right"><strong>{totalByDay[k]?timekit.fmtHours(Number(totalByDay[k].toFixed(2))):'—'}</strong></TableCell>
                ))}
                <TableCell align="right"><strong>{timekit.fmtHours(Number(totalWeek.toFixed(2)))}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal Empleado */}
      <FormModal
        open={empModalOpen}
        title={empForm.id?'Editar empleado':'Nuevo empleado'}
        fields={[
          { type:'text', key:'name', label:'Nombre' },
          { type:'text', key:'phone', label:'Teléfono', inputProps:{ inputMode:'tel' } },
        ]}
        formData={empForm}
        setFormData={setEmpForm}
        onClose={()=>{ setEmpModalOpen(false); setEmpForm({id:null,name:'',phone:''}); }}
        onSubmit={saveEmp}
        submitDisabled={!empForm.name?.trim()}
        maxWidth="sm"
      />

      {/* Modal Horas */}
      <FormModal
        open={logModalOpen}
        title={editingLogId?'Editar horas':'Registrar horas'}
        fields={[
          { type:'select', key:'employeeId', label:'Empleado',
            options:[{label:'—',value:''}, ...employees.map(e=>({label:`${e.name}${e.phone?` (${e.phone})`:''}`, value:String(e.id)}))] },
          { type:'text', key:'date',  label:'Fecha', inputProps:{ type:'date' } },
          { type:'text', key:'start', label:'Inicio', inputProps:{ type:'time' } },
          { type:'text', key:'end',   label:'Fin',    inputProps:{ type:'time' } },
        ]}
        formData={logForm}
        setFormData={setLogForm}
        onClose={()=>{ setLogModalOpen(false); setEditingLogId(null); }}
        onSubmit={saveLog}
        submitDisabled={
          !logForm.employeeId || !logForm.date ||
          !timekit.isValidTime(logForm.start||'') || !timekit.isValidTime(logForm.end||'') ||
          (timekit.isValidTime(logForm.start||'') && timekit.isValidTime(logForm.end||'') && timekit.minutesOf(logForm.end)<=timekit.minutesOf(logForm.start))
        }
        maxWidth="sm"
      />

      {/* Confirmación eliminar */}
      <ConfirmModal
        open={confirmDel.open}
        title="Eliminar empleado"
        description={`¿Eliminar a "${confirmDel.emp?.name||''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar" cancelText="Cancelar" confirmColor="error"
        onConfirm={confirmRemoveEmp}
        onClose={()=>setConfirmDel({open:false, emp:null})}
      />
    </Box>
  );
}
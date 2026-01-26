import React from 'react';
import { Alert, Collapse } from '@mui/material';

const OfflineBanner = ({ isOnline }) => (
  <Collapse in={!isOnline}>
    <Alert severity="warning" sx={{ borderRadius: 0 }}>
      Estás sin conexión. Puedes seguir tomando comandas, pero los cambios no se
      sincronizarán hasta recuperar internet.
    </Alert>
  </Collapse>
);

export default OfflineBanner;

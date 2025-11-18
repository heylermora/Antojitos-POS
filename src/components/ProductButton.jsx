import React from 'react';
import { Button, Typography, Tooltip } from '@mui/material';

/**
 * Botón tipo toggle visual usando Button clásico
 */
const ProductButton = ({ name, price, onClick }) => (
  <Button
    variant="contained"
    size="small"
    onClick={onClick}
    fullWidth
    sx={{
      mb: 1,
      textTransform: 'none',
      height: 70,
      px: 1.5,
      py: 1.5,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <Tooltip title={name} placement="top">
      <Typography
        variant="body2"
        align="center"
        noWrap
        sx={{
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </Typography>
    </Tooltip>
    <Typography variant="body3" align="center">
      ₡{price}
    </Typography>
  </Button>
);

export default ProductButton;
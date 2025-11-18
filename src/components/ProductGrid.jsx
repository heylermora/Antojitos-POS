import React from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import ProductButton from './ProductButton';

const ProductGrid = ({ products, selected, onSelect }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 0.5,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',   // 2 columnas en móviles
          sm: 'repeat(3, 1fr)',   // 3 en tablets
          md: 'repeat(5, 1fr)',   // 5 en escritorio
        },
        maxHeight: isMobile ? 'none' : 300,
        overflowY: isMobile ? 'visible' : 'auto',
        pr: isMobile ? 0 : 1,
        borderRadius: 1,
        p: 1,
      }}
    >
      {products.length > 0 ? (
        products.map(prod => (
          <ProductButton
            key={prod.id}
            name={prod.name}
            price={prod.price}
            selected={selected === prod.name}
            onClick={() => onSelect(prod.name, prod.price)}
          />
        ))
      ) : (
        <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No hay productos disponibles.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ProductGrid;
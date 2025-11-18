import React from 'react';
import { Button, Box } from '@mui/material';

const CategorySelector = ({ categories = [], active, setActiveCategoryId }) => {
  return (
    <Box
      sx={{
        width: '100%',
        position: 'relative',
        boxSizing: 'border-box',
        display: 'grid',
        gap: 1,
        mb: 1,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(5, 1fr)',
          lg: 'repeat(5, 1fr)',
          xl: 'repeat(5, 1fr)',
        },
      }}
    >
      {categories.map(cat => (
        <Button
          key={cat.id}
          variant={cat.id === active ? 'contained' : 'outlined'}
          onClick={() => setActiveCategoryId(cat.id)}
          sx={{ width: '100%' }}
        >
          {cat.name}
        </Button>
      ))}
    </Box>
  );
};

export default CategorySelector;
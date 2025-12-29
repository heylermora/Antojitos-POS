import { Stack, Typography, Divider } from '@mui/material';

export default function PageTitle({
  title,
  subtitle,
  icon: Icon,
  divider = true,
}) {
  return (
    <Stack spacing={0.5} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        {Icon && <Icon sx={{ color: '#904120' }} />}
        <Typography variant="h5" fontWeight={700} color="#904120">
          {title}
        </Typography>
      </Stack>

      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}

      {divider && <Divider sx={{ mt: 0.5 }} />}
    </Stack>
  );
}
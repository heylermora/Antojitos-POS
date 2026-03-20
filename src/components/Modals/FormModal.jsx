/**
 * 📋 FormModal – Modal configurable con campos dinámicos (MUI)
 *
 * Soporta campos tipo 'text', 'select', 'multiselect', 'label', 'custom' y 'repeatable'.
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Select,
  InputLabel,
  FormControl,
  Stack,
  IconButton,
  Checkbox,
  ListItemText,
  Chip,
  Box,
} from '@mui/material';

import { Add, Delete } from '@mui/icons-material';

const FormModal = ({
  open,
  title,
  fields = [],
  formData,
  setFormData,
  onClose,
  onSubmit,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  submitDisabled = false,
  maxWidth = 'sm'
}) => {
  const handleChange = (fieldKey, value) => {
    setFormData({ ...formData, [fieldKey]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {fields.map((field, index) => {
            const {
              type,
              key,
              label,
              options = [],
              inputProps,
              multiline,
              readOnly,
              variant = 'outlined',
              custom,
              renderValue,
            } = field;
            const value = formData[key] ?? (type === 'multiselect' ? [] : '');

            if (type === 'select') {
              return (
                <FormControl key={key} fullWidth>
                  <InputLabel>{label}</InputLabel>
                  <Select
                    value={value}
                    label={label}
                    onChange={(e) => handleChange(key, e.target.value)}
                  >
                    {options.map((opt) => (
                      <MenuItem key={opt.value || opt} value={opt.value || opt}>
                        {opt.label || opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }

            if (type === 'multiselect') {
              const selectedValues = Array.isArray(value) ? value : [];
              return (
                <FormControl key={key} fullWidth>
                  <InputLabel>{label}</InputLabel>
                  <Select
                    multiple
                    value={selectedValues}
                    label={label}
                    onChange={(e) => handleChange(key, e.target.value)}
                    renderValue={(selected) => {
                      if (renderValue) return renderValue(selected);
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          {selected.map((item) => (
                            <Chip key={item} size="small" label={item} />
                          ))}
                        </Box>
                      );
                    }}
                  >
                    {options.map((opt) => {
                      const optionValue = opt.value || opt;
                      const optionLabel = opt.label || opt;
                      return (
                        <MenuItem key={optionValue} value={optionValue}>
                          <Checkbox checked={selectedValues.includes(optionValue)} />
                          <ListItemText primary={optionLabel} />
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              );
            }

            if (type === 'text') {
              return (
                <TextField
                  key={key}
                  label={label}
                  value={value}
                  onChange={(e) =>
                    custom?.onChange ? custom.onChange(e.target.value) : handleChange(key, e.target.value)
                  }
                  fullWidth
                  inputProps={inputProps}
                  InputLabelProps={{ shrink: true }}
                  multiline={multiline}
                  variant={variant}
                  slotProps={{
                    input: {
                      readOnly,
                    },
                  }}
                />
              );
            }

            if (type === 'label') {
              return (
                <Typography
                  key={index}
                  color={field.color || 'text.secondary'}
                  variant={field.variant || 'body2'}
                >
                  {label}
                </Typography>
              );
            }

            if (type === 'custom') {
              return (
                <Box key={key || index}>
                  {typeof field.render === 'function' ? field.render({ formData, setFormData, handleChange }) : null}
                </Box>
              );
            }

            if (type === 'repeatable') {
              const {
                itemSchema = [],
                min = 1,
                max = 5,
                hooks = {}
              } = field;
              const list = Array.isArray(value) ? value : [];

              const handleAdd = () => hooks.onAdd?.();
              const handleRemove = (i) => hooks.onRemove?.(i);
              const handleFieldChange = (i, fieldKey, nextValue) => hooks.onChangeField?.(i, fieldKey, nextValue);

              return (
                <Stack key={key} spacing={1}>
                  <Typography variant="subtitle2">{label}</Typography>

                  {list.map((row, i) => (
                    <Stack key={`${key}-${i}`} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                      {itemSchema.map((itemField) => {
                        if (itemField.type === 'select') {
                          return (
                            <FormControl key={`${key}-${i}-${itemField.key}`} fullWidth>
                              <InputLabel>{itemField.label}</InputLabel>
                              <Select
                                value={row[itemField.key] || ''}
                                label={itemField.label}
                                onChange={(e) => handleFieldChange(i, itemField.key, e.target.value)}
                              >
                                {(itemField.options || []).map((opt) => (
                                  <MenuItem key={opt.value || opt} value={opt.value || opt}>
                                    {opt.label || opt}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          );
                        }

                        return (
                          <TextField
                            key={`${key}-${i}-${itemField.key}`}
                            label={itemField.label}
                            value={row[itemField.key] || ''}
                            onChange={(e) => handleFieldChange(i, itemField.key, e.target.value)}
                            inputProps={itemField.inputProps}
                            helperText={itemField.helperText}
                            multiline={itemField.multiline}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        );
                      })}

                      <IconButton
                        aria-label="Eliminar"
                        onClick={() => handleRemove(i)}
                        disabled={list.length <= min}
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  ))}

                  <Button
                    startIcon={<Add />}
                    onClick={handleAdd}
                    disabled={list.length >= max}
                    variant="outlined"
                    size="small"
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Agregar método
                  </Button>
                </Stack>
              );
            }

            return null;
          })}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{cancelLabel}</Button>
        <Button onClick={onSubmit} disabled={submitDisabled} variant="contained">
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormModal;

import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectProps,
} from "@mui/material";

interface AppSelectOption {
  label: string;
  value: string | number;
}

interface AppSelectProps extends SelectProps {
  label?: string;
  options: AppSelectOption[];
}

const selectFocusSx = {
  "&.MuiInputBase-root": {
    minHeight: 48,
    borderRadius: "12px",
    backgroundColor: "background.paper",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "divider",
  },
  "&.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#B8975A",
  },
};

const formControlFocusSx = {
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#B8975A",
  },
};

const AppSelect = ({ label, options, sx, ...props }: AppSelectProps) => {
  const labelId = label ? `${props.name || "app-select"}-label` : undefined;
  return (
    <FormControl
      fullWidth
      size={props.size || "medium"}
      sx={formControlFocusSx}
    >
      {label && <InputLabel id={labelId}>{label}</InputLabel>}
      <Select
        labelId={labelId}
        label={label}
        sx={[selectFocusSx, ...(Array.isArray(sx) ? sx : [sx])]}
        {...props}
      >
        {options.map((option) => (
          <MenuItem key={`${option.value}`} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default AppSelect;

import { TextField, TextFieldProps } from "@mui/material";

const inputFocusSx = {
  "& .MuiInputBase-root": {
    minHeight: 48,
    borderRadius: "12px",
    backgroundColor: "background.paper",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "divider",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#B8975A",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#B8975A",
  },
};

const AppInput = ({ sx, ...props }: TextFieldProps) => {
  return (
    <TextField
      fullWidth
      size={props.size || "medium"}
      sx={[inputFocusSx, ...(Array.isArray(sx) ? sx : [sx])]}
      {...props}
    />
  );
};

export default AppInput;

// React Imports
import React from "react";
// Material UI Imports
import { InputAdornment, TextField } from "@mui/material";
// React Icon
import { IoIosSearch } from "react-icons/io";

interface searchBarProps {
  searchText?: any;
  placeholder?: any;
  handleSearch?: any;
  onChange?: any;
  value?: any;
  color?: any;
}

export default function SearchBar({
  handleSearch,
  placeholder,
  searchText,
  onChange,
  value,
  color,
}: searchBarProps) {
  const handleKeyDown = (event: any) => {
    if (event.key === "Enter") {
      handleSearch(event);
    }
  };

  React.useEffect(() => {
    if (searchText) {
      const input: any = document.getElementById("outlined-basic");
      if (input) {
        input.value = searchText;
      }
    }
  }, [searchText]);

  return (
    <TextField
      sx={{
        width: "100%",
        borderRadius: 999,
        "& .MuiOutlinedInput-root": {
          borderRadius: 999,
          background: color ? color : "var(--surface-card)",
          color: "var(--text-primary)",
          "& .MuiOutlinedInput-notchedOutline": {
            border: "1.5px solid var(--border-default)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#B8975A",
          },
        },
      }}
      fullWidth
      onKeyDown={handleKeyDown}
      onChange={onChange}
      value={value ?? searchText ?? ""}
      id="outlined-basic"
      variant="outlined"
      placeholder={
        placeholder
          ? placeholder
          : `Search Patient by Name, Mobile, MR No. or ID No.`
      }
      InputProps={{
        sx: {
          borderRadius: 999,
          background: color ? color : "var(--surface-card)",
          minHeight: "48px",
        },
        endAdornment: (
          <InputAdornment position="start">
            <IoIosSearch
              style={{
                color: "#B8975A",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            />
          </InputAdornment>
        ),
      }}
    />
  );
}

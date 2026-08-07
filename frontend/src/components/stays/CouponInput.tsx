import { useState } from "react";
import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { useValidateCouponMutation } from "../../redux/api/stayApiSlice";

interface CouponInputProps {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adultCount: number;
  childCount: number;
  onApply: (code: string) => void;
  onRemove: () => void;
  appliedCode?: string;
}

const getErrorMessage = (error: any) =>
  error?.data?.message || error?.error || "Coupon could not be applied.";

const CouponInput = ({
  roomId,
  checkIn,
  checkOut,
  adultCount,
  childCount,
  onApply,
  onRemove,
  appliedCode,
}: CouponInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [validateCoupon, { isLoading }] = useValidateCouponMutation();

  const handleApply = async () => {
    const couponCode = inputValue.trim().toUpperCase();
    setError("");
    setSuccessMessage("");

    if (!couponCode) {
      setError("Enter a coupon code.");
      return;
    }

    try {
      const result = await validateCoupon({
        roomId,
        couponCode,
        checkIn,
        checkOut,
        adultCount,
        childCount,
      }).unwrap();
      const label = result?.data?.discount?.label || "Coupon applied";

      onApply(couponCode);
      setSuccessMessage(label);
    } catch (couponError: any) {
      setError(getErrorMessage(couponError));
    }
  };

  if (appliedCode) {
    return (
      <Box>
        <Chip
          color="success"
          label={appliedCode}
          onDelete={() => {
            onRemove();
            setInputValue("");
            setError("");
            setSuccessMessage("");
          }}
          deleteIcon={<span>×</span>}
        />
      </Box>
    );
  }

  return (
    <Stack spacing={0.75}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          fullWidth
          size="small"
          label="Coupon code"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value.toUpperCase());
            setError("");
            setSuccessMessage("");
          }}
        />
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={isLoading || !roomId || !checkIn || !checkOut || !inputValue.trim()}
          sx={{ minWidth: 96 }}
        >
          Apply
        </Button>
      </Stack>
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
      {successMessage ? (
        <Typography variant="caption" color="success.main">
          {successMessage}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default CouponInput;

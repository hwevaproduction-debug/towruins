import { useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

interface PriceBreakdownProps {
  quote: any | null;
  isLoading?: boolean;
}

const formatMoney = (value: any, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));

const fallbackLineItems = (quote: any) => {
  const items = [];

  if (Number(quote?.accommodationSubtotal || 0) > 0) {
    items.push({
      label: `${quote.nights || 0} night${Number(quote.nights) === 1 ? "" : "s"}`,
      type: "accommodation",
      amount: Number(quote.accommodationSubtotal || 0),
      isDiscount: false,
    });
  }

  if (Number(quote?.occupancySurcharge || 0) > 0) {
    items.push({
      label: "Extra guest surcharge",
      type: "occupancy",
      amount: Number(quote.occupancySurcharge || 0),
      isDiscount: false,
    });
  }

  if (Number(quote?.cleaningFee || 0) > 0) {
    items.push({
      label: "Fees",
      type: "fees",
      amount: Number(quote.cleaningFee || 0),
      isDiscount: false,
    });
  }

  const discount = Number(quote?.promotionDiscount || 0) + Number(quote?.couponDiscount || 0);
  if (discount > 0) {
    items.push({
      label: quote?.appliedCoupon?.code ? `Coupon ${quote.appliedCoupon.code}` : "Discount",
      type: "discount",
      amount: -discount,
      isDiscount: true,
    });
  }

  if (Number(quote?.taxAmount || 0) > 0) {
    items.push({
      label: "Tax",
      type: "tax",
      amount: Number(quote.taxAmount || 0),
      isDiscount: false,
    });
  }

  return items;
};

const isSubtotalLine = (item: any) =>
  String(item?.type || "").toLowerCase() === "subtotal" ||
  String(item?.label || "").trim().toLowerCase() === "subtotal";

const isDiscountOrTaxLine = (item: any) => {
  const type = String(item?.type || "").toLowerCase();
  const amount = Number(item?.amount || 0);

  return (
    Boolean(item?.isDiscount) ||
    amount < 0 ||
    ["coupon", "discount", "promotion", "tax"].includes(type)
  );
};

const PriceBreakdown = ({ quote, isLoading = false }: PriceBreakdownProps) => {
  const [showNightly, setShowNightly] = useState(false);

  if (isLoading && !quote) {
    return (
      <Stack spacing={1}>
        {[0, 1, 2, 3].map((row) => (
          <Box key={row} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Skeleton width="45%" />
            <Skeleton width={88} />
          </Box>
        ))}
      </Stack>
    );
  }

  if (!quote) {
    return null;
  }

  const currency = quote.currency || "USD";
  const lineItems = Array.isArray(quote.lineItems) && quote.lineItems.length
    ? quote.lineItems
    : fallbackLineItems(quote);
  const visibleLineItems = lineItems.filter((item: any) => !isSubtotalLine(item));
  const feeLineItems = visibleLineItems.filter((item: any) => !isDiscountOrTaxLine(item));
  const adjustmentLineItems = visibleLineItems.filter((item: any) => isDiscountOrTaxLine(item));
  const nightlyBreakdown = Array.isArray(quote.nightlyBreakdown) ? quote.nightlyBreakdown : [];
  const renderLineItem = (item: any, index: number) => {
    const amount = Number(item.amount || 0);
    const isDiscount = Boolean(item.isDiscount) || amount < 0;

    return (
      <Box
        key={`${item.type || "line"}-${item.label || index}-${index}`}
        sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}
      >
        <Typography variant="body2" sx={{ color: isDiscount ? "success.main" : "#334155" }}>
          {item.label}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: isDiscount ? "success.main" : "#0f172a", fontWeight: 700 }}
        >
          {isDiscount ? "-" : ""}
          {formatMoney(Math.abs(amount), currency)}
        </Typography>
      </Box>
    );
  };

  return (
    <Stack spacing={1.25}>
      {feeLineItems.map(renderLineItem)}

      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
        <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 700 }}>
          Subtotal
        </Typography>
        <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 700 }}>
          {formatMoney(quote.subtotal, currency)}
        </Typography>
      </Box>

      {adjustmentLineItems.map((item: any, index: number) =>
        renderLineItem(item, feeLineItems.length + index)
      )}

      {nightlyBreakdown.length > 0 ? (
        <Box>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowNightly((value) => !value)}
            sx={{ px: 0, minWidth: 0, textTransform: "none", fontWeight: 700 }}
          >
            {showNightly ? "Hide nightly breakdown" : "Show nightly breakdown"}
          </Button>
          <Collapse in={showNightly}>
            <Stack spacing={0.75} sx={{ pt: 0.5 }}>
              {nightlyBreakdown.map((night: any) => (
                <Box
                  key={night.date}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 1.5,
                    color: "#64748b",
                  }}
                >
                  <Typography variant="caption">
                    {night.date} - {night.rateLabel || "Base Rate"}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {formatMoney(night.pricePerNight, currency)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Collapse>
        </Box>
      ) : null}

      <Divider />

      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
        <Typography sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>Grand total</Typography>
        <Typography sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
          {formatMoney(quote.grandTotal, currency)}
        </Typography>
      </Box>
    </Stack>
  );
};

export default PriceBreakdown;

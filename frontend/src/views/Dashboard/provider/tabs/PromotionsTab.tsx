import { useState } from "react";
import {
  Chip,
  Grid,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  toEntityObject,
  useCreatePromotionMutation,
  useDeactivatePromotionMutation,
  useGenerateCouponsMutation,
  useListPromotionCouponsQuery,
} from "../../../../redux/api/providerApiSlice";
import AppButton from "../../../../components/ui/AppButton";
import AppCard from "../../../../components/ui/AppCard";

type PromotionsTabProps = {
  accommodationId: string;
  rooms: any[];
};

type PromotionForm = {
  name: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minNights: string;
  startDate: string;
  endDate: string;
  scope: "accommodation" | "room";
  roomId: string;
};

const defaultPromotionForm: PromotionForm = {
  name: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minNights: "1",
  startDate: "",
  endDate: "",
  scope: "accommodation",
  roomId: "",
};

const defaultCouponForm = { count: "5", prefix: "" };

const getRoomId = (room: any) => room?._id || room?.id;

const PromotionsTab = ({ accommodationId, rooms }: PromotionsTabProps) => {
  const [promotionForm, setPromotionForm] = useState<PromotionForm>(defaultPromotionForm);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [expandedCouponPromotionId, setExpandedCouponPromotionId] = useState<string | null>(null);
  const [couponForm, setCouponForm] = useState(defaultCouponForm);

  const [createPromotion, { isLoading: creatingPromotion }] = useCreatePromotionMutation();
  const [deactivatePromotion, { isLoading: deactivatingPromotion }] = useDeactivatePromotionMutation();
  const { data: couponsResponse } = useListPromotionCouponsQuery(expandedCouponPromotionId, {
    skip: !expandedCouponPromotionId,
  });
  const [generateCoupons, { isLoading: generatingCoupons }] = useGenerateCouponsMutation();

  const coupons: any[] = couponsResponse?.data?.coupons || couponsResponse?.coupons || [];

  const handleCreatePromotion = async () => {
    const result = await createPromotion({
      name: promotionForm.name,
      discountType: promotionForm.discountType,
      discountValue: Number(promotionForm.discountValue),
      minNights: Number(promotionForm.minNights),
      startDate: promotionForm.startDate || undefined,
      endDate: promotionForm.endDate || undefined,
      accommodationId: promotionForm.scope === "accommodation" ? accommodationId : undefined,
      roomId: promotionForm.scope === "room" ? promotionForm.roomId : undefined,
    }).unwrap();
    const promotion = toEntityObject(result, ["promotion", "data"]);
    if (promotion) {
      setPromotions((prev) => [...prev, promotion]);
    }
    setPromotionForm(defaultPromotionForm);
  };

  const handleDeactivate = async (id: string) => {
    await deactivatePromotion(id).unwrap();
    setPromotions((prev) => prev.map((p) => (p._id === id ? { ...p, isActive: false } : p)));
  };

  return (
    <Stack spacing={3}>
      <AppCard elevation="flat" sx={{ p: 2, borderRadius: "16px" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Create Promotion</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Name"
              value={promotionForm.name}
              onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              select
              label="Discount Type"
              value={promotionForm.discountType}
              onChange={(e) => setPromotionForm({ ...promotionForm, discountType: e.target.value as "PERCENTAGE" | "FIXED" })}
            >
              <MenuItem value="PERCENTAGE">Percentage</MenuItem>
              <MenuItem value="FIXED">Fixed</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="number"
              label="Discount Value"
              value={promotionForm.discountValue}
              onChange={(e) => setPromotionForm({ ...promotionForm, discountValue: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="number"
              label="Min Nights"
              value={promotionForm.minNights}
              onChange={(e) => setPromotionForm({ ...promotionForm, minNights: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={promotionForm.startDate}
              onChange={(e) => setPromotionForm({ ...promotionForm, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={promotionForm.endDate}
              onChange={(e) => setPromotionForm({ ...promotionForm, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Select
              fullWidth
              value={promotionForm.scope}
              onChange={(e) => setPromotionForm({ ...promotionForm, scope: e.target.value as "accommodation" | "room" })}
              displayEmpty
            >
              <MenuItem value="accommodation">Accommodation</MenuItem>
              <MenuItem value="room">Room</MenuItem>
            </Select>
          </Grid>
          {promotionForm.scope === "room" && (
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Select Room"
                value={promotionForm.roomId}
                onChange={(e) => setPromotionForm({ ...promotionForm, roomId: e.target.value })}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">Select a room</MenuItem>
                {rooms.map((room) => (
                  <MenuItem key={getRoomId(room)} value={getRoomId(room)}>
                    {room?.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid item xs={12}>
            <AppButton
              variant="contained"
              loading={creatingPromotion}
              onClick={handleCreatePromotion}
              disabled={
                !promotionForm.name ||
                !promotionForm.discountValue ||
                (promotionForm.scope === "room" && !promotionForm.roomId)
              }
            >
              Create Promotion
            </AppButton>
          </Grid>
        </Grid>
      </AppCard>

      <AppCard elevation="flat" sx={{ p: 2, borderRadius: "16px" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Promotions</Typography>
        {promotions.length === 0 ? (
          <Typography>No promotions yet.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {promotions.map((promo) => {
                const promoId = promo.id || promo._id;
                return (
                <TableRow key={promoId}>
                  <TableCell>{promo.name}</TableCell>
                  <TableCell>{promo.discountType}</TableCell>
                  <TableCell>{promo.discountValue}{promo.discountType === "PERCENTAGE" ? "%" : "$"}</TableCell>
                  <TableCell>{String(promo.startDate || "").slice(0, 10)} — {String(promo.endDate || "").slice(0, 10)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={promo.isActive ? "Active" : "Inactive"}
                      sx={
                        promo.isActive
                          ? { background: "#D1EAE0", color: "#1F4D3A", fontWeight: 700 }
                          : { background: "#F1F5F9", color: "#64748B", fontWeight: 700 }
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <AppButton
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          setExpandedCouponPromotionId(
                            expandedCouponPromotionId === promoId ? null : promoId
                          )
                        }
                      >
                        {expandedCouponPromotionId === promoId ? "Hide" : "Coupons"}
                      </AppButton>
                      <AppButton
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeactivate(promoId)}
                        disabled={deactivatingPromotion}
                      >
                        Deactivate
                      </AppButton>
                    </Stack>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AppCard>

      {expandedCouponPromotionId && (
        <AppCard elevation="flat" sx={{ p: 2, borderRadius: "16px" }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Coupons</Typography>
          {coupons.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {coupons.map((coupon: any) => (
                <Chip
                  key={coupon._id || coupon.code}
                  label={coupon.code}
                  sx={{ fontFamily: "monospace", bgcolor: "#F7EDDA", border: "1px solid #B8975A" }}
                />
              ))}
            </Stack>
          )}
          {coupons.length === 0 && <Typography variant="body2" color="text.secondary">No coupons yet.</Typography>}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Prefix"
                value={couponForm.prefix}
                onChange={(e) => setCouponForm({ ...couponForm, prefix: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="number"
                label="Count"
                value={couponForm.count}
                onChange={(e) => setCouponForm({ ...couponForm, count: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <AppButton
                variant="contained"
                loading={generatingCoupons}
                onClick={() =>
                  generateCoupons({
                    promotionId: expandedCouponPromotionId,
                    payload: {
                      count: Number(couponForm.count),
                      prefix: couponForm.prefix,
                    },
                  })
                }
              >
                Generate Coupons
              </AppButton>
            </Grid>
          </Grid>
        </AppCard>
      )}
    </Stack>
  );
};

export default PromotionsTab;

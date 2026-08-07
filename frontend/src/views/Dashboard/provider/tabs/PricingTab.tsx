import { useEffect, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  toEntityArray,
  toEntityObject,
  useCreateRoomFeeMutation,
  useCreateSeasonalRateMutation,
  useDeleteRoomFeeMutation,
  useDeleteSeasonalRateMutation,
  useGetAccommodationTaxQuery,
  useGetOccupancyPricingRuleQuery,
  useListRoomFeesQuery,
  useListSeasonalRatesQuery,
  useUpsertAccommodationTaxMutation,
  useUpsertOccupancyPricingRuleMutation,
  useDeleteOccupancyPricingRuleMutation,
} from "../../../../redux/api/providerApiSlice";

type PricingTabProps = {
  rooms: any[];
  accommodationId: string;
  initialValues?: Record<string, any>;
  onDataChange?: (data: any) => void;
};

type RateForm = {
  label: string;
  rateType: string;
  pricePerNight: string;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  priority: string;
};

type FeeForm = {
  feeType: string;
  label: string;
  amount: string;
  isPerStay: boolean;
  isOptional: boolean;
};

type TaxForm = {
  label: string;
  percentage: string;
  isInclusive: boolean;
  appliesTo: string;
};

const getRoomId = (room: any) => room?._id || room?.id;
const getId = (item: any) => item?._id || item?.id;
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const defaultRateForm: RateForm = { label: "", rateType: "SEASONAL", pricePerNight: "", startDate: "", endDate: "", daysOfWeek: [], priority: "0" };
const defaultFeeForm: FeeForm = { feeType: "CLEANING", label: "", amount: "", isPerStay: true, isOptional: false };
const defaultTaxForm: TaxForm = { label: "Tax", percentage: "", isInclusive: false, appliesTo: "SUBTOTAL" };

const PricingTab = ({ rooms, accommodationId, initialValues = {}, onDataChange }: PricingTabProps) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialValues.selectedRoomId || "");
  const [rateForm, setRateForm] = useState<RateForm>(initialValues.rateForm || defaultRateForm);
  const [feeForm, setFeeForm] = useState<FeeForm>(initialValues.feeForm || defaultFeeForm);
  const [taxForm, setTaxForm] = useState<TaxForm>(initialValues.taxForm || defaultTaxForm);
  const [occupancyForm, setOccupancyForm] = useState({ baseGuestCount: "", extraGuestFeePerNight: "" });
  const hydratedInitialValues = useRef(false);
  const hasUserEdited = useRef(false);
  const hasUserEditedOccupancy = useRef(false);
  const { data: ratesResponse } = useListSeasonalRatesQuery(selectedRoomId, { skip: !selectedRoomId });
  const { data: feesResponse } = useListRoomFeesQuery(selectedRoomId, { skip: !selectedRoomId });
  const { data: taxResponse } = useGetAccommodationTaxQuery(accommodationId, { skip: !accommodationId });
  const { data: occupancyRuleResponse } = useGetOccupancyPricingRuleQuery(selectedRoomId, { skip: !selectedRoomId });
  const [upsertOccupancyPricingRule, { isLoading: savingOccupancyRule }] = useUpsertOccupancyPricingRuleMutation();
  const [deleteOccupancyPricingRule, { isLoading: deletingOccupancyRule }] = useDeleteOccupancyPricingRuleMutation();
  const [createRate] = useCreateSeasonalRateMutation();
  const [deleteRate] = useDeleteSeasonalRateMutation();
  const [createFee] = useCreateRoomFeeMutation();
  const [deleteFee] = useDeleteRoomFeeMutation();
  const [upsertTax] = useUpsertAccommodationTaxMutation();
  const rates: any[] = toEntityArray(ratesResponse, ["seasonalRates", "data"]);
  const fees: any[] = toEntityArray(feesResponse, ["roomFees", "data"]);
  const markUserEdited = () => {
    hasUserEdited.current = true;
  };

  useEffect(() => {
    if (hydratedInitialValues.current || hasUserEdited.current || !Object.keys(initialValues).length) {
      return;
    }
    hydratedInitialValues.current = true;
    if (initialValues.selectedRoomId) setSelectedRoomId(initialValues.selectedRoomId);
    if (initialValues.rateForm) setRateForm(initialValues.rateForm);
    if (initialValues.feeForm) setFeeForm(initialValues.feeForm);
    if (initialValues.taxForm) setTaxForm(initialValues.taxForm);
  }, [initialValues]);

  useEffect(() => {
    setSelectedRoomId((current) => current || getRoomId(rooms[0]) || "");
  }, [rooms]);

  useEffect(() => {
    onDataChange?.({ selectedRoomId, rateForm, feeForm, taxForm });
  }, [feeForm, onDataChange, rateForm, selectedRoomId, taxForm]);

  useEffect(() => {
    const taxRule = toEntityObject(taxResponse, ["taxRule"]);
    if (taxRule && !hasUserEdited.current && !initialValues.taxForm) {
      setTaxForm({
        label: taxRule.label || "Tax",
        percentage: String(taxRule.percentage || ""),
        isInclusive: Boolean(taxRule.isInclusive),
        appliesTo: taxRule.appliesTo || "SUBTOTAL",
      });
    }
  }, [taxResponse]);

  useEffect(() => {
    setOccupancyForm({ baseGuestCount: "", extraGuestFeePerNight: "" });
    hasUserEditedOccupancy.current = false;
  }, [selectedRoomId]);

  useEffect(() => {
    const occupancyRule = toEntityObject(occupancyRuleResponse, ["occupancyPricingRule", "data"]);
    if (occupancyRule && !hasUserEditedOccupancy.current) {
      setOccupancyForm({
        baseGuestCount: String(occupancyRule.baseGuestCount ?? ""),
        extraGuestFeePerNight: String(occupancyRule.extraGuestFeePerNight ?? ""),
      });
    }
  }, [occupancyRuleResponse]);

  return (
    <Stack spacing={3}>
      <TextField select label="Room" value={selectedRoomId} onChange={(event) => { markUserEdited(); setSelectedRoomId(event.target.value); }} sx={{ maxWidth: 360 }}>
        {rooms.map((room) => <MenuItem key={getRoomId(room)} value={getRoomId(room)}>{room?.name}</MenuItem>)}
      </TextField>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Seasonal Rates</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><TextField fullWidth label="Label" value={rateForm.label} onChange={(event) => { markUserEdited(); setRateForm({ ...rateForm, label: event.target.value }); }} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth select label="Type" value={rateForm.rateType} onChange={(event) => { markUserEdited(); setRateForm({ ...rateForm, rateType: event.target.value }); }}>{["SEASONAL", "WEEKEND", "WEEKDAY", "HOLIDAY", "LONG_STAY"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Price/Night" value={rateForm.pricePerNight} onChange={(event) => { markUserEdited(); setRateForm({ ...rateForm, pricePerNight: event.target.value }); }} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Start" value={rateForm.startDate} onChange={(event) => { markUserEdited(); setRateForm({ ...rateForm, startDate: event.target.value }); }} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth type="date" label="End" value={rateForm.endDate} onChange={(event) => { markUserEdited(); setRateForm({ ...rateForm, endDate: event.target.value }); }} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} md={1}><TextField fullWidth type="number" label="Priority" value={rateForm.priority} onChange={(event) => { markUserEdited(); setRateForm({ ...rateForm, priority: event.target.value }); }} /></Grid>
          <Grid item xs={12}>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <FormControlLabel
                key={day}
                control={<Checkbox checked={rateForm.daysOfWeek.includes(day)} onChange={(event) => { markUserEdited(); setRateForm({ ...rateForm, daysOfWeek: event.target.checked ? [...rateForm.daysOfWeek, day] : rateForm.daysOfWeek.filter((item) => item !== day) }); }} />}
                label={dayLabels[day]}
              />
            ))}
          </Grid>
        </Grid>
        <Button sx={{ mt: 2 }} variant="contained" disabled={!selectedRoomId || !rateForm.label || !rateForm.pricePerNight} onClick={() => createRate({ roomId: selectedRoomId, payload: { ...rateForm, pricePerNight: Number(rateForm.pricePerNight), priority: Number(rateForm.priority), startDate: rateForm.startDate || undefined, endDate: rateForm.endDate || undefined } })}>Add Rate</Button>
        <Table sx={{ mt: 2 }}>
          <TableHead><TableRow><TableCell>Label</TableCell><TableCell>Type</TableCell><TableCell>Price/Night</TableCell><TableCell>Start</TableCell><TableCell>End</TableCell><TableCell>Days</TableCell><TableCell>Priority</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>{rates.map((rate) => <TableRow key={getId(rate)}><TableCell>{rate.label}</TableCell><TableCell>{rate.rateType}</TableCell><TableCell>{String(rate.pricePerNight)}</TableCell><TableCell>{String(rate.startDate || "").slice(0, 10)}</TableCell><TableCell>{String(rate.endDate || "").slice(0, 10)}</TableCell><TableCell>{(rate.daysOfWeek || []).join(", ")}</TableCell><TableCell>{rate.priority}</TableCell><TableCell align="right"><Button color="error" onClick={() => deleteRate({ roomId: selectedRoomId, rateId: getId(rate) })}>Delete</Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Fees</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2}><TextField fullWidth select label="Type" value={feeForm.feeType} onChange={(event) => { markUserEdited(); setFeeForm({ ...feeForm, feeType: event.target.value }); }}>{["CLEANING", "LINEN", "PET", "OTHER"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Label" value={feeForm.label} onChange={(event) => { markUserEdited(); setFeeForm({ ...feeForm, label: event.target.value }); }} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Amount" value={feeForm.amount} onChange={(event) => { markUserEdited(); setFeeForm({ ...feeForm, amount: event.target.value }); }} /></Grid>
          <Grid item xs={12} md={2}><FormControlLabel control={<Switch checked={feeForm.isPerStay} onChange={(event) => { markUserEdited(); setFeeForm({ ...feeForm, isPerStay: event.target.checked }); }} />} label="Per stay" /></Grid>
          <Grid item xs={12} md={2}><FormControlLabel control={<Switch checked={feeForm.isOptional} onChange={(event) => { markUserEdited(); setFeeForm({ ...feeForm, isOptional: event.target.checked }); }} />} label="Optional" /></Grid>
        </Grid>
        <Button sx={{ mt: 2 }} variant="contained" disabled={!selectedRoomId || !feeForm.label || !feeForm.amount} onClick={() => createFee({ roomId: selectedRoomId, payload: { ...feeForm, amount: Number(feeForm.amount) } })}>Add Fee</Button>
        <Table sx={{ mt: 2 }}>
          <TableHead><TableRow><TableCell>Type</TableCell><TableCell>Label</TableCell><TableCell>Amount</TableCell><TableCell>Per Stay</TableCell><TableCell>Optional</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>{fees.map((fee) => <TableRow key={getId(fee)}><TableCell>{fee.feeType}</TableCell><TableCell>{fee.label}</TableCell><TableCell>{String(fee.amount)}</TableCell><TableCell>{fee.isPerStay ? "Yes" : "No"}</TableCell><TableCell>{fee.isOptional ? "Yes" : "No"}</TableCell><TableCell align="right"><Button color="error" onClick={() => deleteFee({ roomId: selectedRoomId, feeId: getId(fee) })}>Delete</Button></TableCell></TableRow>)}</TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Tax Rule</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><TextField fullWidth label="Label" value={taxForm.label} onChange={(event) => { markUserEdited(); setTaxForm({ ...taxForm, label: event.target.value }); }} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth type="number" label="Percentage" value={taxForm.percentage} onChange={(event) => { markUserEdited(); setTaxForm({ ...taxForm, percentage: event.target.value }); }} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth select label="Applies To" value={taxForm.appliesTo} onChange={(event) => { markUserEdited(); setTaxForm({ ...taxForm, appliesTo: event.target.value }); }}>{["SUBTOTAL", "CLEANING", "ALL"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} md={3}><FormControlLabel control={<Switch checked={taxForm.isInclusive} onChange={(event) => { markUserEdited(); setTaxForm({ ...taxForm, isInclusive: event.target.checked }); }} />} label="Inclusive" /></Grid>
        </Grid>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => upsertTax({ accommodationId, payload: { ...taxForm, percentage: Number(taxForm.percentage || 0) } })}>Save Tax Rule</Button>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Occupancy Pricing (Extra Guest Fee)</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Base Guest Count"
              value={occupancyForm.baseGuestCount}
              onChange={(event) => {
                hasUserEditedOccupancy.current = true;
                setOccupancyForm({ ...occupancyForm, baseGuestCount: event.target.value });
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Extra Guest Fee / Night ($)"
              value={occupancyForm.extraGuestFeePerNight}
              onChange={(event) => {
                hasUserEditedOccupancy.current = true;
                setOccupancyForm({ ...occupancyForm, extraGuestFeePerNight: event.target.value });
              }}
            />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            disabled={!selectedRoomId || savingOccupancyRule}
            onClick={() =>
              upsertOccupancyPricingRule({
                roomId: selectedRoomId,
                payload: {
                  baseGuestCount: Number(occupancyForm.baseGuestCount),
                  extraGuestFeePerNight: Number(occupancyForm.extraGuestFeePerNight),
                },
              })
            }
          >
            Save Rule
          </Button>
          {(occupancyRuleResponse?.data?.occupancyPricingRule || occupancyRuleResponse?.occupancyPricingRule) && (
            <Button
              color="error"
              disabled={deletingOccupancyRule}
              onClick={() => {
                deleteOccupancyPricingRule(selectedRoomId);
                setOccupancyForm({ baseGuestCount: "", extraGuestFeePerNight: "" });
              }}
            >
              Remove Rule
            </Button>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
};

export default PricingTab;

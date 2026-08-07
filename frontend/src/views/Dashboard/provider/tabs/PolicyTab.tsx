import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  FormControlLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  toEntityObject,
  useGetAccommodationTaxQuery,
  useGetMyAccommodationQuery,
  useUpsertAccommodationTaxMutation,
  useUpsertCancellationPolicyMutation,
  useUpsertCheckInRulesMutation,
} from "../../../../redux/api/providerApiSlice";

type PolicyTabProps = {
  accommodationId: string;
  initialValues?: Record<string, any>;
  onDataChange?: (data: any) => void;
};

const PolicyTab = ({ accommodationId, initialValues = {}, onDataChange }: PolicyTabProps) => {
  const { data } = useGetMyAccommodationQuery(undefined);
  const { data: taxResponse } = useGetAccommodationTaxQuery(accommodationId, { skip: !accommodationId });
  const accommodation = toEntityObject(data, ["accommodation"]);
  const [cancellation, setCancellation] = useState(initialValues.cancellation || { policyType: "FLEXIBLE", freeCancellationHours: "48", refundPercentage: "", customDescription: "" });
  const [rules, setRules] = useState(initialValues.rules || { checkInFrom: "14:00", checkInUntil: "22:00", checkOutBy: "11:00", selfCheckIn: false, selfCheckInMethod: "", lateCheckOutFee: "", instructions: "" });
  const [taxForm, setTaxForm] = useState(initialValues.taxForm || { label: "Tax", percentage: "", isInclusive: false, appliesTo: "SUBTOTAL" });
  const hydratedInitialValues = useRef(false);
  const hasUserEdited = useRef(false);
  const [upsertCancellationPolicy] = useUpsertCancellationPolicyMutation();
  const [upsertCheckInRules] = useUpsertCheckInRulesMutation();
  const [upsertTax] = useUpsertAccommodationTaxMutation();
  const markUserEdited = () => {
    hasUserEdited.current = true;
  };

  useEffect(() => {
    if (hydratedInitialValues.current || hasUserEdited.current || !Object.keys(initialValues).length) {
      return;
    }
    hydratedInitialValues.current = true;
    if (initialValues.cancellation) setCancellation(initialValues.cancellation);
    if (initialValues.rules) setRules(initialValues.rules);
    if (initialValues.taxForm) setTaxForm(initialValues.taxForm);
  }, [initialValues]);

  useEffect(() => {
    if (accommodation?.cancellationPolicy && !hasUserEdited.current && !initialValues.cancellation) {
      setCancellation({
        policyType: accommodation.cancellationPolicy.policyType || "FLEXIBLE",
        freeCancellationHours: String(accommodation.cancellationPolicy.freeCancellationHours || ""),
        refundPercentage: String(accommodation.cancellationPolicy.refundPercentage || ""),
        customDescription: accommodation.cancellationPolicy.customDescription || "",
      });
    }
    if (accommodation?.checkInOutRules && !hasUserEdited.current && !initialValues.rules) {
      setRules({
        checkInFrom: accommodation.checkInOutRules.checkInFrom || "14:00",
        checkInUntil: accommodation.checkInOutRules.checkInUntil || "22:00",
        checkOutBy: accommodation.checkInOutRules.checkOutBy || "11:00",
        selfCheckIn: Boolean(accommodation.checkInOutRules.selfCheckIn),
        selfCheckInMethod: accommodation.checkInOutRules.selfCheckInMethod || "",
        lateCheckOutFee: String(accommodation.checkInOutRules.lateCheckOutFee || ""),
        instructions: accommodation.checkInOutRules.instructions || "",
      });
    }
  }, [accommodation, initialValues.cancellation, initialValues.rules]);

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
  }, [initialValues.taxForm, taxResponse]);

  useEffect(() => {
    onDataChange?.({ cancellation, rules, taxForm });
  }, [cancellation, onDataChange, rules, taxForm]);

  return (
    <Stack spacing={2}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Cancellation Policy</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <RadioGroup row value={cancellation.policyType} onChange={(event) => { markUserEdited(); setCancellation({ ...cancellation, policyType: event.target.value }); }}>
              {["FLEXIBLE", "MODERATE", "STRICT", "NON_REFUNDABLE", "CUSTOM"].map((type) => <FormControlLabel key={type} value={type} control={<Radio />} label={type} />)}
            </RadioGroup>
            {cancellation.policyType !== "NON_REFUNDABLE" ? <TextField type="number" label="Free cancellation hours" value={cancellation.freeCancellationHours} onChange={(event) => { markUserEdited(); setCancellation({ ...cancellation, freeCancellationHours: event.target.value }); }} /> : null}
            {cancellation.policyType === "CUSTOM" ? <TextField type="number" label="Refund percentage" value={cancellation.refundPercentage} onChange={(event) => { markUserEdited(); setCancellation({ ...cancellation, refundPercentage: event.target.value }); }} /> : null}
            {cancellation.policyType === "CUSTOM" ? <TextField multiline minRows={3} label="Custom description" value={cancellation.customDescription} onChange={(event) => { markUserEdited(); setCancellation({ ...cancellation, customDescription: event.target.value }); }} /> : null}
            <Button variant="contained" onClick={() => upsertCancellationPolicy({ id: accommodationId, payload: { ...cancellation, freeCancellationHours: cancellation.freeCancellationHours ? Number(cancellation.freeCancellationHours) : null, refundPercentage: cancellation.refundPercentage ? Number(cancellation.refundPercentage) : null } })}>Save Policy</Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Check-in / Check-out Rules</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><TextField fullWidth label="Check-in from" placeholder="14:00" value={rules.checkInFrom} onChange={(event) => { markUserEdited(); setRules({ ...rules, checkInFrom: event.target.value }); }} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Check-in until" placeholder="22:00" value={rules.checkInUntil} onChange={(event) => { markUserEdited(); setRules({ ...rules, checkInUntil: event.target.value }); }} /></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Check-out by" placeholder="11:00" value={rules.checkOutBy} onChange={(event) => { markUserEdited(); setRules({ ...rules, checkOutBy: event.target.value }); }} /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Switch checked={rules.selfCheckIn} onChange={(event) => { markUserEdited(); setRules({ ...rules, selfCheckIn: event.target.checked }); }} />} label="Self check-in" /></Grid>
            {rules.selfCheckIn ? <Grid item xs={12}><TextField fullWidth label="Self check-in method" value={rules.selfCheckInMethod} onChange={(event) => { markUserEdited(); setRules({ ...rules, selfCheckInMethod: event.target.value }); }} /></Grid> : null}
            <Grid item xs={12} md={4}><TextField fullWidth type="number" label="Late check-out fee" value={rules.lateCheckOutFee} onChange={(event) => { markUserEdited(); setRules({ ...rules, lateCheckOutFee: event.target.value }); }} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Instructions" value={rules.instructions} onChange={(event) => { markUserEdited(); setRules({ ...rules, instructions: event.target.value }); }} /></Grid>
            <Grid item xs={12}><Button variant="contained" onClick={() => upsertCheckInRules({ id: accommodationId, payload: { ...rules, lateCheckOutFee: rules.lateCheckOutFee ? Number(rules.lateCheckOutFee) : null } })}>Save Rules</Button></Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Tax Rule</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><TextField fullWidth label="Label" value={taxForm.label} onChange={(event) => { markUserEdited(); setTaxForm({ ...taxForm, label: event.target.value }); }} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth type="number" label="Percentage" value={taxForm.percentage} onChange={(event) => { markUserEdited(); setTaxForm({ ...taxForm, percentage: event.target.value }); }} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth select label="Applies To" value={taxForm.appliesTo} onChange={(event) => { markUserEdited(); setTaxForm({ ...taxForm, appliesTo: event.target.value }); }}>{["SUBTOTAL", "CLEANING", "ALL"].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={3}><FormControlLabel control={<Switch checked={taxForm.isInclusive} onChange={(event) => { markUserEdited(); setTaxForm({ ...taxForm, isInclusive: event.target.checked }); }} />} label="Inclusive" /></Grid>
            <Grid item xs={12}><Button variant="contained" onClick={() => upsertTax({ accommodationId, payload: { ...taxForm, percentage: Number(taxForm.percentage || 0) } })}>Save Tax Rule</Button></Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
};

export default PolicyTab;

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Grid,
} from "@mui/material";
import { Bookmark, Lock } from "lucide-react";

import { Heading, SubHeading } from "../../components/Heading";
import useTypedSelector from "../../hooks/useTypedSelector";
import { selectedUserRole } from "../../redux/auth/authSlice";
import {
  useCreateSavedSearchMutation,
  useDeleteSavedSearchMutation,
  useGetMySavedSearchesQuery,
} from "../../redux/api/userApiSlice";
import AppContainer from "../../components/ui/AppContainer";
import AppCard from "../../components/ui/AppCard";
import AppButton from "../../components/ui/AppButton";
import AppInput from "../../components/ui/AppInput";

const SavedSearches = () => {
  const role = useTypedSelector(selectedUserRole);
  const navigate = useNavigate();
  const header = (
    <Box
      sx={{
        background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
        borderRadius: "20px",
        p: { xs: 3, md: 4 },
        mb: 4,
        color: "#fff",
      }}
    >
      <Box sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 800 }}>
        Saved Searches
      </Box>
      <Box sx={{ opacity: 0.75, mt: 0.5 }}>
        Save your search criteria and get notified of new matches
      </Box>
    </Box>
  );

  const { data: searchesData, refetch } = useGetMySavedSearchesQuery(undefined, {
    skip: role !== "tenant",
  });

  const [createSavedSearch, { isLoading: creating }] =
    useCreateSavedSearchMutation();
  const [deleteSavedSearch] = useDeleteSavedSearchMutation();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    searchId: string;
  }>({ open: false, searchId: "" });

  const searches = useMemo(() => searchesData?.data || [], [searchesData]);

  const [form, setForm] = useState<any>({
    name: "My Saved Search",
    location: "",
    minRent: "",
    maxRent: "",
    minBedrooms: "",
    amenities: {
      solar: false,
      borehole: false,
      security: false,
      parking: false,
      internet: false,
    },
  });

  const submit = async () => {
    const payload = {
      name: form.name,
      criteria: {
        location: form.location,
        minRent: Number(form.minRent || 0),
        maxRent: Number(form.maxRent || 0),
        minBedrooms: Number(form.minBedrooms || 0),
        amenities: form.amenities,
      },
    };

    await createSavedSearch(payload);
    await refetch();
  };

  if (role !== "tenant") {
    return (
      <Box sx={{ mt: { xs: 5, md: 6 } }}>
        <AppContainer>
          {header}
          <AppCard
            sx={{
              p: { xs: 3, md: 4 },
              display: "flex",
              alignItems: "center",
              gap: 2,
              color: "text.secondary",
            }}
          >
            <Lock size={34} color="#B8975A" />
            <Box>
              Saved searches are available to tenant accounts. Sign up as a
              tenant to get started.
            </Box>
          </AppCard>
        </AppContainer>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: { xs: 5, md: 6 } }}>
      <AppContainer>
        {header}

        <AppCard sx={{ marginTop: "20px", p: 2 }}>
          <SubHeading sx={{ marginBottom: "10px" }}>Create</SubHeading>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <AppInput
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <AppInput
                label="Location / Area"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <AppInput
                label="Min Rent"
                type="number"
                value={form.minRent}
                onChange={(e) => setForm({ ...form, minRent: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <AppInput
                label="Max Rent"
                type="number"
                value={form.maxRent}
                onChange={(e) => setForm({ ...form, maxRent: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <AppInput
                label="Min Beds"
                type="number"
                value={form.minBedrooms}
                onChange={(e) => setForm({ ...form, minBedrooms: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={10}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                <FormControlLabel
                  control={<Checkbox checked={form.amenities.solar} />}
                  label="Solar"
                  onChange={(e: any) =>
                    setForm({
                      ...form,
                      amenities: { ...form.amenities, solar: e.target.checked },
                    })
                  }
                />
                <FormControlLabel
                  control={<Checkbox checked={form.amenities.borehole} />}
                  label="Borehole"
                  onChange={(e: any) =>
                    setForm({
                      ...form,
                      amenities: { ...form.amenities, borehole: e.target.checked },
                    })
                  }
                />
                <FormControlLabel
                  control={<Checkbox checked={form.amenities.security} />}
                  label="Security"
                  onChange={(e: any) =>
                    setForm({
                      ...form,
                      amenities: { ...form.amenities, security: e.target.checked },
                    })
                  }
                />
                <FormControlLabel
                  control={<Checkbox checked={form.amenities.parking} />}
                  label="Parking"
                  onChange={(e: any) =>
                    setForm({
                      ...form,
                      amenities: { ...form.amenities, parking: e.target.checked },
                    })
                  }
                />
                <FormControlLabel
                  control={<Checkbox checked={form.amenities.internet} />}
                  label="Internet"
                  onChange={(e: any) =>
                    setForm({
                      ...form,
                      amenities: { ...form.amenities, internet: e.target.checked },
                    })
                  }
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <AppButton onClick={submit} disabled={creating}>
                Save Search
              </AppButton>
            </Grid>
          </Grid>
        </AppCard>

        <AppCard sx={{ marginTop: "20px", p: 2 }}>
          <SubHeading sx={{ marginBottom: "10px" }}>Your Saved Searches</SubHeading>
          {searches.length === 0 ? (
            <Box
              sx={{
                minHeight: 240,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                px: 2,
              }}
            >
              <Box>
                <Bookmark size={42} color="#B8975A" />
                <Heading sx={{ fontSize: "22px", mt: 1.5 }}>
                  No saved searches yet
                </Heading>
                <SubHeading sx={{ color: "text.secondary", mt: 0.5, mb: 2 }}>
                  Use the search page to save searches and get notified about new
                  listings.
                </SubHeading>
                <AppButton onClick={() => navigate("/search")}>
                  Start Searching
                </AppButton>
              </Box>
            </Box>
          ) : (
            searches.map((s: any) => (
              <Box
                key={s._id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid #f1f5f9",
                  "&:last-child": {
                    borderBottom: "none",
                  },
                }}
              >
                <Box>
                  <Box sx={{ fontWeight: 600 }}>{s.name}</Box>
                  <Box sx={{ fontSize: "13px", color: "#475569" }}>
                    {s.criteria?.location ? `Loc: ${s.criteria.location} · ` : ""}
                    {s.criteria?.minRent ? `Min: ${s.criteria.minRent} · ` : ""}
                    {s.criteria?.maxRent ? `Max: ${s.criteria.maxRent} · ` : ""}
                    {s.criteria?.minBedrooms ? `Beds: ${s.criteria.minBedrooms}` : ""}
                  </Box>
                </Box>
                <AppButton
                  variant="outlined"
                  onClick={() =>
                    setConfirmDialog({ open: true, searchId: s._id })
                  }
                >
                  Delete
                </AppButton>
              </Box>
            ))
          )}
        </AppCard>
      </AppContainer>
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, searchId: "" })}
      >
        <DialogTitle>Remove Saved Search</DialogTitle>
        <DialogContent>
          <DialogContentText>Remove this saved search?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton
            variant="outlined"
            onClick={() => setConfirmDialog({ open: false, searchId: "" })}
          >
            Cancel
          </AppButton>
          <AppButton
            color="error"
            onClick={async () => {
              await deleteSavedSearch(confirmDialog.searchId);
              await refetch();
              setConfirmDialog({ open: false, searchId: "" });
            }}
          >
            Remove
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavedSearches;

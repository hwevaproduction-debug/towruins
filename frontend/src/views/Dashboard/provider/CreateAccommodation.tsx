import React from "react";
import { Box, Typography, Paper, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AccommodationStep from "./wizard/steps/AccommodationStep";

const CreateAccommodation = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Create an accommodation</Typography>
        <Box sx={{ mt: 2 }}>
          <AccommodationStep accommodationId={""} onNext={() => navigate('/dashboard/provider')} />
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateAccommodation;

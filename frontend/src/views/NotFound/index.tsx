import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import AppButton from "../../components/ui/AppButton";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0F141E 0%, #1F2937 100%)",
        px: 2,
        textAlign: "center",
      }}
    >
      <Box>
        <Box
          sx={{
            color: "#B8975A",
            fontSize: { xs: "6rem", md: "9rem" },
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          404
        </Box>
        <Box
          sx={{
            color: "#fff",
            fontSize: { xs: "1.5rem", md: "2rem" },
            fontWeight: 700,
            mt: 2,
          }}
        >
          Page not found
        </Box>
        <Box
          sx={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "1rem",
            mt: 1,
            mb: 4,
          }}
        >
          This page doesn't exist or has moved.
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            justifyContent: "center",
          }}
        >
          <AppButton onClick={() => navigate("/")}>Go Home</AppButton>
          <AppButton
            variant="outlined"
            onClick={() => navigate("/search")}
            sx={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.7)",
              "&:hover": {
                borderColor: "#fff",
                background: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Browse Listings
          </AppButton>
        </Box>
      </Box>
    </Box>
  );
};

export default NotFound;

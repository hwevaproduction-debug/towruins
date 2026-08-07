import { Box } from "@mui/material";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useTypedSelector from "../../../hooks/useTypedSelector";
import { selectedIsEmailVerified } from "../../../redux/auth/authSlice";
import AppCard from "../../../components/ui/AppCard";
import { FEATURE_FLAGS } from "../../../config/featureFlags";

const VerificationStatusCard = () => {
  const navigate = useNavigate();
  const isEmailVerified = useTypedSelector(selectedIsEmailVerified);
  const items = [
    { label: "Email", complete: isEmailVerified },
    ...(FEATURE_FLAGS.PHONE_VERIFICATION ? [{ label: "Phone", complete: false }] : []),
    ...(FEATURE_FLAGS.ID_VERIFICATION ? [{ label: "ID", complete: false }] : []),
  ];

  return (
    <AppCard sx={{ p: 2, borderLeft: "3px solid #B8975A" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800, mb: 1.5 }}>
        <Lock size={18} color="#B8975A" />
        Account Verification
      </Box>
      <Box sx={{ display: "grid", gap: 1 }}>
        {items.map((item) => (
          <Box
            key={item.label}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              color: item.complete ? "#B8975A" : "text.secondary",
              fontSize: "14px",
              fontWeight: item.complete ? 800 : 500,
            }}
          >
            <span>{item.label}</span>
            <span>{item.complete ? "\u2713" : "\u25CB"}</span>
          </Box>
        ))}
      </Box>
      <Box
        onClick={() => navigate("/profile")}
        sx={{ mt: 1.5, color: "#B8975A", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}
      >
        Complete verification {"\u2192"}
      </Box>
    </AppCard>
  );
};

export default VerificationStatusCard;

import { useState } from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AppButton from "../../../components/ui/AppButton";
import TokenPurchaseModal from "../../../components/wallet/TokenPurchaseModal";

type QuickActionsBarProps = {
  role: string;
};

const QuickActionsBar = ({ role }: QuickActionsBarProps) => {
  const navigate = useNavigate();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const tenantActions = [
    { label: "Browse Properties", path: "/search" },
    { label: "My Engagements", path: "/dashboard/tenant" },
    { label: "Saved Searches", path: "/saved-searches" },
  ];
  const landlordActions = [
    { label: "Create Listing", path: "/create-listing" },
    { label: "View Requests", path: "/dashboard/landlord" },
    { label: "Payment History", path: "/dashboard/landlord" },
  ];
  const actions = role === "landlord" ? landlordActions : tenantActions;

  return (
    <>
      <Box
        sx={{
          overflowX: "auto",
          display: "flex",
          gap: 1.5,
          pb: 1,
          mb: 2,
        }}
      >
        {actions.map((action) => (
          <AppButton
            key={action.label}
            variant="outlined"
            size="small"
            onClick={() => navigate(action.path)}
            sx={{
              borderRadius: "999px",
              whiteSpace: "nowrap",
              borderColor: "rgba(255,255,255,0.25)",
              color: "#fff",
            }}
          >
            {action.label}
          </AppButton>
        ))}
        <AppButton
          variant="outlined"
          size="small"
          onClick={() => setPurchaseOpen(true)}
          sx={{
            borderRadius: "999px",
            whiteSpace: "nowrap",
            borderColor: "rgba(255,255,255,0.25)",
            color: "#fff",
          }}
        >
          Buy Tokens
        </AppButton>
      </Box>
      <TokenPurchaseModal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
      />
    </>
  );
};

export default QuickActionsBar;

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Chip,
  ClickAwayListener,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import { keyframes } from "@mui/system";
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAllAsReadMutation,
  unreadCountPollingOptions,
} from "../../redux/api/notificationApiSlice";

const pulse = keyframes`
  0%, 100% {
    box-shadow: 0 4px 20px rgba(31,77,58,0.4);
  }
  50% {
    box-shadow: 0 4px 28px rgba(31,77,58,0.7), 0 0 0 6px rgba(31,77,58,0.15);
  }
`;

const filterLabels = ["all", "tokens", "listings", "engagements"] as const;

const FloatingNotificationBubble = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<(typeof filterLabels)[number]>("all");

  const { data: unreadData } = useGetUnreadCountQuery(undefined, unreadCountPollingOptions);
  const unreadCount = unreadData?.data?.count || 0;
  const { data } = useGetNotificationsQuery(
    { page: 1, limit: 10 },
    { skip: !panelOpen }
  );
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const notifications = data?.data || [];
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (activeFilter === "tokens") {
        return notification.event.startsWith("wallet.") || notification.event === "engagement.approved";
      }
      if (activeFilter === "listings") {
        return notification.event.startsWith("listing.");
      }
      if (activeFilter === "engagements") {
        return notification.event.startsWith("engagement.");
      }
      return true;
    });
  }, [activeFilter, notifications]);

  const handleClose = () => setPanelOpen(false);

  const panelContent = (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label="Notification center"
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        borderRadius: 2,
        width: isMobile ? "100%" : 340,
        maxWidth: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography sx={{ fontWeight: 800 }}>Notifications</Typography>
          <Box
            component="button"
            onClick={() => markAllAsRead()}
            sx={{
              border: 0,
              background: "transparent",
              color: "#B8975A",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Mark all read
          </Box>
        </Stack>

        <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
          {filterLabels.map((filter) => (
            <Chip
              key={filter}
              label={filter.charAt(0).toUpperCase() + filter.slice(1)}
              size="small"
              onClick={() => setActiveFilter(filter)}
              sx={{
                fontWeight: 700,
                background: activeFilter === filter ? "#1F4D3A" : "transparent",
                color: activeFilter === filter ? "#fff" : "text.secondary",
                borderColor: activeFilter === filter ? "#1F4D3A" : "divider",
                "& .MuiChip-label": { px: 0.5 },
              }}
              variant={activeFilter === filter ? "filled" : "outlined"}
            />
          ))}
        </Box>
      </Box>

      <Divider />

      <List sx={{ maxHeight: 320, overflowY: "auto", py: 0 }}>
        {filteredNotifications.length === 0 ? (
          <Box sx={{ p: 2, color: "text.secondary", fontSize: 13 }}>No notifications found.</Box>
        ) : (
          filteredNotifications.map((notification) => {
            const isUnread = !notification.isRead;
            const showRenewLink =
              notification.event === "listing.expiry_24h" ||
              notification.event === "listing.expiry_6h" ||
              notification.event === "listing.expired";

            return (
              <ListItemButton
                key={notification.id}
                sx={{
                  alignItems: "flex-start",
                  gap: 1.25,
                  px: 2,
                  py: 1.5,
                  opacity: isUnread ? 1 : 0.72,
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    mt: 0.8,
                    flexShrink: 0,
                    background: isUnread ? "#1F4D3A" : "#CBD5E1",
                  }}
                />
                <ListItemText
                  disableTypography
                  primary={
                    <Typography sx={{ fontSize: "13px", fontWeight: 700, lineHeight: 1.3 }}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ mt: 0.4 }}>
                      <Typography sx={{ fontSize: "12px", color: "text.secondary", lineHeight: 1.45 }}>
                        {notification.body}
                      </Typography>
                      {showRenewLink ? (
                        <Box
                          component="span"
                          sx={{
                            color: "#B8975A",
                            fontSize: "12px",
                            fontWeight: 700,
                            display: "inline-block",
                            mt: 0.5,
                          }}
                        >
                          Renew →
                        </Box>
                      ) : null}
                      <Typography sx={{ fontSize: "11px", color: "text.secondary", mt: 0.5 }}>
                        {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            );
          })
        )}
      </List>

      <Divider />

      <Box sx={{ p: 1.5 }}>
        <Box
          component="button"
          onClick={() => {
            navigate("/notifications");
            handleClose();
          }}
          sx={{
            width: "100%",
            border: 0,
            background: "#1F4D3A",
            color: "#fff",
            borderRadius: 1.5,
            py: 1,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          View all
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          left: { xs: 16, sm: 20 },
          top: { xs: "auto", sm: "50%" },
          bottom: { xs: 80, sm: "auto" },
          transform: { xs: "none", sm: "translateY(-50%)" },
          zIndex: 1200,
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          invisible={unreadCount < 1}
          overlap="circular"
        >
          <IconButton
            aria-label="Open notifications"
            onClick={() => setPanelOpen((value) => !value)}
            sx={{
              width: 52,
              height: 52,
              background: "#1F4D3A",
              color: "#fff",
              "&:hover": { background: "#173B2C" },
              animation: unreadCount > 0 ? `${pulse} 2s infinite` : "none",
            }}
          >
            <NotificationsOutlinedIcon />
          </IconButton>
        </Badge>
      </Box>

      {isMobile ? (
        <Drawer anchor="bottom" open={panelOpen} onClose={handleClose}>
          <Box sx={{ p: 1.5 }}>{panelContent}</Box>
        </Drawer>
      ) : panelOpen ? (
        <ClickAwayListener onClickAway={handleClose}>
          <Paper
            sx={{
              position: "fixed",
              left: 84,
              top: "50%",
              transform: "translateY(-50%)",
              width: 340,
              zIndex: 1199,
              bgcolor: "background.paper",
              color: "text.primary",
            }}
          >
            {panelContent}
          </Paper>
        </ClickAwayListener>
      ) : null}
    </>
  );
};

export default FloatingNotificationBubble;

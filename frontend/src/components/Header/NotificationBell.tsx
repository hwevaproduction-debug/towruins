import { MouseEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Divider,
  IconButton,
  List,
  Popover,
  Typography,
} from "@mui/material";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import {
  unreadCountPollingOptions,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAllAsReadMutation,
} from "../../redux/api/notificationApiSlice";
import NotificationItem from "./NotificationItem";

const recentNotificationsParams = { page: 1, limit: 5 };

type NotificationBellProps = {
  iconColor?: string;
};

const NotificationBell = ({ iconColor = "#1F2937" }: NotificationBellProps) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const { data: unreadCountResponse } = useGetUnreadCountQuery(
    undefined,
    unreadCountPollingOptions
  );
  const {
    data: notificationsResponse,
    isError,
    isFetching,
  } = useGetNotificationsQuery(recentNotificationsParams, {
    skip: !open,
    refetchOnMountOrArgChange: true,
  });
  const [markAllAsRead, { isLoading: isMarkingAllRead }] =
    useMarkAllAsReadMutation();

  const unreadCount = unreadCountResponse?.data?.count || 0;
  const notifications = notificationsResponse?.data || [];

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllAsRead = async () => {
    if (!unreadCount || isMarkingAllRead) {
      return;
    }

    try {
      await markAllAsRead().unwrap();
    } catch {
      // The next poll/refetch will reconcile if the request fails.
    }
  };

  const handleViewAll = () => {
    handleClose();
    navigate("/notifications");
  };

  return (
    <Box data-element-id="notification-bell">
      <IconButton
        aria-label="Open notifications"
        color="inherit"
        onClick={handleOpen}
        size="large"
        sx={{
          color: iconColor,
          height: 40,
          width: 40,
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          data-element-id="unread-badge"
          invisible={unreadCount < 1}
          max={99}
        >
          <NotificationsOutlinedIcon fontSize="small" />
        </Badge>
      </IconButton>
      <Popover
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        data-element-id="notification-dropdown"
        onClose={handleClose}
        open={open}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            border: "1px solid #E2E8F0",
            borderRadius: 2,
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
            mt: 1,
            overflow: "hidden",
            width: { xs: 320, sm: 360 },
          },
        }}
      >
        <Box
          sx={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
          }}
        >
          <Typography sx={{ color: "#1F2937", fontSize: 15, fontWeight: 700 }}>
            Notifications
          </Typography>
          <Box
            component="button"
            data-element-id="mark-all-read"
            disabled={!unreadCount || isMarkingAllRead}
            onClick={handleMarkAllAsRead}
            sx={{
              background: "transparent",
              border: 0,
              color: unreadCount ? "#2B6A50" : "#94A3B8",
              cursor: unreadCount ? "pointer" : "default",
              font: "inherit",
              fontSize: 12,
              fontWeight: 700,
              p: 0,
            }}
            type="button"
          >
            Mark all as read
          </Box>
        </Box>
        <Divider />
        <List disablePadding sx={{ maxHeight: "360px", overflowY: "auto", py: 0 }}>
          {isFetching ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography sx={{ color: "#64748B", fontSize: 13 }}>
                Loading notifications...
              </Typography>
            </Box>
          ) : null}
          {!isFetching && isError ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography sx={{ color: "#64748B", fontSize: 13 }}>
                Notifications could not be loaded.
              </Typography>
            </Box>
          ) : null}
          {!isFetching && !isError && notifications.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography sx={{ color: "#64748B", fontSize: 13 }}>
                No notifications yet.
              </Typography>
            </Box>
          ) : null}
          {!isFetching && !isError
            ? notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClose={handleClose}
                />
              ))
            : null}
        </List>
        <Box
          component="button"
          data-element-id="view-all"
          onClick={handleViewAll}
          sx={{
            background: "#fff",
            border: 0,
            borderTop: "1px solid #E2E8F0",
            color: "#2B6A50",
            cursor: "pointer",
            font: "inherit",
            fontSize: 13,
            fontWeight: 700,
            py: 1.25,
            textAlign: "center",
            width: "100%",
          }}
          type="button"
        >
          View all
        </Box>
      </Popover>
    </Box>
  );
};

export default NotificationBell;

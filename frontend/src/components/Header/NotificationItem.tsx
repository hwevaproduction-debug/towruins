import { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Divider, ListItem, Typography } from "@mui/material";
import {
  AppNotification,
  useMarkAsReadMutation,
} from "../../redux/api/notificationApiSlice";

interface NotificationItemProps {
  notification: AppNotification;
  onClose?: () => void;
}

const formatRelativeTime = (date: string) => {
  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) {
    return seconds <= 5 ? "Just now" : `${seconds} seconds ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  return `${days} days ago`;
};

const NotificationItem = ({ notification, onClose }: NotificationItemProps) => {
  const navigate = useNavigate();
  const [markAsRead] = useMarkAsReadMutation();
  const bookingId = notification.metadata?.bookingId;

  const handleClick = async () => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id).unwrap();
      } catch {
        // Navigation should not be blocked by a transient read-state failure.
      }
    }

    if (bookingId) {
      navigate(`/stays/bookings/${bookingId}`);
    }

    onClose?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <>
      <ListItem
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-element-id={`notif-${notification.id}`}
        sx={{
          alignItems: "flex-start",
          backgroundColor: notification.isRead ? "#fff" : "#F0F7F4",
          cursor: "pointer",
          gap: 1.25,
          px: 2,
          py: 1.5,
          transition: "background-color 120ms ease",
          "&:hover": {
            backgroundColor: notification.isRead ? "#F8FAFC" : "#E7F1EC",
          },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            backgroundColor: notification.isRead ? "transparent" : "#2B6A50",
            border: notification.isRead ? "1px solid #CBD5E1" : "none",
            borderRadius: "50%",
            flexShrink: 0,
            height: 8,
            mt: "6px",
            width: 8,
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              color: "#1F2937",
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.35,
              mb: 0.25,
            }}
          >
            {notification.title}
          </Typography>
          <Typography
            sx={{
              color: "#64748B",
              display: "-webkit-box",
              fontSize: 12,
              lineHeight: 1.45,
              overflow: "hidden",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {notification.body}
          </Typography>
          <Typography
            sx={{
              color: "#94A3B8",
              fontSize: 11,
              lineHeight: 1.4,
              mt: 0.5,
            }}
          >
            {formatRelativeTime(notification.createdAt)}
          </Typography>
        </Box>
      </ListItem>
      <Divider />
    </>
  );
};

export default NotificationItem;

import { useState } from "react";
import { Box, Skeleton, Switch } from "@mui/material";
import { Bell } from "lucide-react";
import AppButton from "../../components/ui/AppButton";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";
import { Heading, SubHeading } from "../../components/Heading";
import {
  AppNotification,
  useGetNotificationPreferencesQuery,
  useGetNotificationsQuery,
  useMarkAllAsReadMutation,
  useSavePushSubscriptionMutation,
  useUpdateNotificationPreferencesMutation,
} from "../../redux/api/notificationApiSlice";

const getDateGroup = (createdAt: string) => {
  const date = new Date(createdAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return "Earlier";
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)));
};

const groupedNotifications = (notifications: AppNotification[]) =>
  notifications.reduce<Record<string, AppNotification[]>>((groups, notification) => {
    const group = getDateGroup(notification.createdAt);
    groups[group] = groups[group] || [];
    groups[group].push(notification);
    return groups;
  }, {});

const Notifications = () => {
  const [activeFilter, setActiveFilter] = useState<"all" | "tokens" | "listings" | "engagements">("all");
  const { data, isLoading } = useGetNotificationsQuery({ page: 1, limit: 50 });
  const { data: preferencesData } = useGetNotificationPreferencesQuery();
  const [markAllAsRead, { isLoading: markingAllRead }] =
    useMarkAllAsReadMutation();
  const [savePushSubscription] = useSavePushSubscriptionMutation();
  const [updatePreferences] = useUpdateNotificationPreferencesMutation();
  const notifications = data?.data || [];
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "tokens") return n.event.startsWith("wallet.") || n.event === "engagement.approved";
    if (activeFilter === "listings") return n.event.startsWith("listing.");
    if (activeFilter === "engagements") return n.event.startsWith("engagement.");
    return true;
  });
  const groups = groupedNotifications(filteredNotifications);
  const hasUnread = filteredNotifications.some((notification) => !notification.isRead);
  const preferences = preferencesData?.data;
  const [pushMessage, setPushMessage] = useState("");

  const handleEmailToggle = async (checked: boolean) => {
    await updatePreferences({ emailEnabled: checked });
  };

  const handlePushToggle = async (checked: boolean) => {
    setPushMessage("");
    if (!checked) {
      await updatePreferences({ pushEnabled: false });
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushMessage("Not supported in this browser");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushMessage("Enable notifications in your browser settings");
      return;
    }

    const publicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setPushMessage("Push notifications are not configured.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const json = subscription.toJSON();

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Incomplete push subscription");
      }

      await savePushSubscription({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      }).unwrap();
      await updatePreferences({ pushEnabled: true });
    } catch (error) {
      console.error("Push subscription failed:", error);
      setPushMessage("Unable to enable push notifications. Please try again.");
    }
  };

  return (
    <Box>
      <Box
        sx={{
          background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
          py: 6,
          px: 2,
          textAlign: "center",
        }}
      >
        <Heading sx={{ color: "#fff", mb: 1 }}>Notifications</Heading>
        <SubHeading sx={{ color: "rgba(255,255,255,0.7)" }}>
          Stay up to date with your activity
        </SubHeading>
      </Box>
      <AppContainer sx={{ py: 4 }}>
        <AppCard sx={{ p: 3, mb: 3 }}>
          <Heading sx={{ fontSize: "20px", mb: 2 }}>
            Notification Preferences
          </Heading>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1 }}>
            <Box>
              <Box sx={{ fontWeight: 700 }}>Email notifications</Box>
              <SubHeading sx={{ color: "text.secondary", fontSize: 13 }}>
                Receive important account updates by email
              </SubHeading>
            </Box>
            <Switch
              checked={preferences?.emailEnabled ?? true}
              onChange={(event) => handleEmailToggle(event.target.checked)}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1 }}>
            <Box>
              <Box sx={{ fontWeight: 700 }}>Browser push notifications</Box>
              <SubHeading sx={{ color: "text.secondary", fontSize: 13 }}>
                Get alerts in this browser
              </SubHeading>
              {pushMessage ? (
                <Box sx={{ color: "#f59e0b", fontSize: 12, mt: 0.5 }}>{pushMessage}</Box>
              ) : null}
            </Box>
            <Switch
              checked={preferences?.pushEnabled ?? false}
              onChange={(event) => handlePushToggle(event.target.checked)}
            />
          </Box>
          <Box sx={{ fontWeight: 700, py: 1 }}>
            In-app notifications: Always on
          </Box>
        </AppCard>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 3 }}>
          <Heading sx={{ fontSize: "24px" }}>Activity</Heading>
          <AppButton
            variant="outlined"
            size="small"
            disabled={!hasUnread || markingAllRead}
            onClick={() => markAllAsRead()}
          >
            Mark all as read
          </AppButton>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          {(["all", "tokens", "listings", "engagements"] as const).map((filter) => (
            <Box
              key={filter}
              component="button"
              onClick={() => setActiveFilter(filter)}
              sx={{
                fontSize: "12px",
                padding: "4px 14px",
                borderRadius: "999px",
                border: "1.5px solid",
                borderColor: activeFilter === filter ? "#1F4D3A" : "divider",
                background: activeFilter === filter ? "#1F4D3A" : "transparent",
                color: activeFilter === filter ? "#fff" : "text.secondary",
                cursor: "pointer",
                fontWeight: 700,
                font: "inherit",
              }}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Box>
          ))}
        </Box>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <AppCard key={index} sx={{ mb: 1.5, p: "16px 20px" }}>
              <Skeleton width="45%" />
              <Skeleton width="80%" />
              <Skeleton width="25%" />
            </AppCard>
          ))
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <Box>
              <Bell size={44} color="#B8975A" />
              <Heading sx={{ fontSize: "20px", mt: 1.5 }}>
                No notifications yet
              </Heading>
              <SubHeading sx={{ color: "text.secondary", mt: 0.5 }}>
                You're all caught up!
              </SubHeading>
            </Box>
          </Box>
        ) : (
          ["Today", "Yesterday", "Earlier"].map((group) =>
            groups[group]?.length ? (
              <Box key={group} sx={{ mb: 3 }}>
                <Box sx={{ fontWeight: 800, color: "#B8975A", mb: 1 }}>{group}</Box>
                {groups[group].map((notification) => (
                  <AppCard
                    key={notification.id}
                    sx={{
                      mb: 1.5,
                      p: "16px 20px",
                      borderLeft: notification.isRead ? "none" : "3px solid #B8975A",
                      opacity: notification.isRead ? 0.75 : 1,
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: notification.isRead ? "#E2E8F0" : "#B8975A", mt: 0.6, flexShrink: 0 }} />
                      <Box>
                        <Box sx={{ fontWeight: 700, fontSize: "14px" }}>
                          {notification.title}
                        </Box>
                        <Box sx={{ fontSize: "13px", color: "text.secondary", mt: 0.5 }}>
                          {notification.body}
                        </Box>
                        <Box sx={{ fontSize: "11px", color: "#94A3B8", mt: 0.75 }}>
                          {new Date(notification.createdAt).toLocaleString()}
                        </Box>
                      </Box>
                    </Box>
                  </AppCard>
                ))}
              </Box>
            ) : null
          )
        )}
      </AppContainer>
    </Box>
  );
};

export default Notifications;

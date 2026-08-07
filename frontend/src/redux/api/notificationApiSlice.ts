import { apiSlice } from "./apiSlice";

export interface NotificationMetadata {
  bookingId?: string;
  [key: string]: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  event: string;
  title: string;
  body: string;
  isRead: boolean;
  metadata?: NotificationMetadata | null;
  createdAt: string;
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
}

export interface GetNotificationsResponse {
  status: string;
  total: number;
  data: AppNotification[];
}

export interface GetUnreadCountResponse {
  status: string;
  data: {
    count: number;
  };
}

export interface MarkAsReadResponse {
  status: string;
  data: {
    notification: AppNotification;
  };
}

export interface MarkAllAsReadResponse {
  status: string;
  data: {
    updated: number;
  };
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export const unreadCountPollingOptions = {
  pollingInterval: 60000,
};

const notificationApi = apiSlice.enhanceEndpoints({
  addTagTypes: ["Notification", "NotificationCount"],
});

export const notificationApiSlice = notificationApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      GetNotificationsResponse,
      GetNotificationsParams | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams({
          page: String(params?.page || 1),
          limit: String(params?.limit || 20),
        });

        return {
          url: `notifications?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) => [
        { type: "Notification", id: "LIST" },
        ...(result?.data || []).map((notification) => ({
          type: "Notification" as const,
          id: notification.id,
        })),
      ],
    }),
    getUnreadCount: builder.query<GetUnreadCountResponse, void>({
      query: () => ({
        url: "notifications/unread-count",
        method: "GET",
      }),
      providesTags: [{ type: "NotificationCount", id: "UNREAD" }],
    }),
    markAsRead: builder.mutation<MarkAsReadResponse, string>({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Notification", id },
        { type: "Notification", id: "LIST" },
        { type: "NotificationCount", id: "UNREAD" },
      ],
    }),
    markAllAsRead: builder.mutation<MarkAllAsReadResponse, void>({
      query: () => ({
        url: "notifications/read-all",
        method: "PUT",
      }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "NotificationCount", id: "UNREAD" },
      ],
    }),
    savePushSubscription: builder.mutation<any, any>({
      query: (data) => ({
        url: "notifications/push-subscription",
        method: "POST",
        body: data,
      }),
    }),
    deletePushSubscription: builder.mutation<void, void>({
      query: () => ({
        url: "notifications/push-subscription",
        method: "DELETE",
      }),
    }),
    getNotificationPreferences: builder.query<
      { status: string; data: NotificationPreferences },
      void
    >({
      query: () => ({
        url: "notifications/preferences",
        method: "GET",
      }),
      providesTags: ["Notification"],
    }),
    updateNotificationPreferences: builder.mutation<
      { status: string; data: NotificationPreferences },
      Partial<Pick<NotificationPreferences, "emailEnabled" | "pushEnabled" | "inAppEnabled">>
    >({
      query: (data) => ({
        url: "notifications/preferences",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useSavePushSubscriptionMutation,
  useDeletePushSubscriptionMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} = notificationApiSlice;

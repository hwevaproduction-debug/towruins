import { apiSlice } from "./apiSlice";

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signup: builder.mutation({
      query: (data) => {
        return {
          url: "users/signup",
          method: "POST",
          body: data,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        };
      },
    }),
    login: builder.mutation({
      query: (data) => {
        return {
          url: "users/login",
          method: "POST",
          body: data,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        };
      },
    }),
    verifyEmail: builder.query({
      query: (token) => {
        return {
          url: `users/verify-email?token=${encodeURIComponent(token)}`,
          method: "GET",
        };
      },
    }),
    verifyPhone: builder.mutation({
      query: ({ otp, email }) => {
        return {
          url: "users/verify-phone",
          method: "POST",
          body: { otp, email },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        };
      },
    }),
    resendPhoneOtp: builder.mutation({
      query: ({ email }) => {
        return {
          url: "users/resend-phone-otp",
          method: "POST",
          body: { email },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        };
      },
    }),
    forgotPassword: builder.mutation({
      query: (data) => ({
        url: "users/forgot-password",
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" },
      }),
    }),
    resetPassword: builder.mutation({
      query: (data) => ({
        url: "users/reset-password",
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" },
      }),
    }),
    resendVerification: builder.mutation({
      query: (data) => ({
        url: "users/resend-verification",
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" },
      }),
    }),
    checkAvailability: builder.query<
      { status: string; data: { emailAvailable?: boolean; usernameAvailable?: boolean } },
      { email?: string; username?: string }
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.email) searchParams.set("email", params.email);
        if (params.username) searchParams.set("username", params.username);
        return { url: `users/check-availability?${searchParams.toString()}`, method: "GET" };
      },
    }),
    googleLogin: builder.mutation({
      query: (data) => {
        return {
          url: "users/google",
          method: "POST",
          body: data,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        };
      },
    }),
  }),
});

export const {
  useSignupMutation,
  useLoginMutation,
  useVerifyEmailQuery,
  useVerifyPhoneMutation,
  useResendPhoneOtpMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useResendVerificationMutation,
  useCheckAvailabilityQuery,
  useLazyCheckAvailabilityQuery,
  useGoogleLoginMutation,
} = authApiSlice;

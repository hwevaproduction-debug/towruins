import { useEffect, useState } from "react";
import { useGetPricingQuoteQuery } from "../redux/api/stayApiSlice";

interface PricingQuoteParams {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adultCount: number;
  childCount: number;
  infantCount: number;
  couponCode?: string;
}

export const usePricingQuote = (params: PricingQuoteParams) => {
  const [debouncedParams, setDebouncedParams] = useState(params);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedParams(params), 400);
    return () => clearTimeout(t);
  }, [
    params.roomId,
    params.checkIn,
    params.checkOut,
    params.adultCount,
    params.childCount,
    params.infantCount,
    params.couponCode,
  ]);

  const skip =
    !debouncedParams.checkIn || !debouncedParams.checkOut || !debouncedParams.roomId;
  const { data, isFetching, error } = useGetPricingQuoteQuery(debouncedParams, { skip });
  const quote = data?.data?.quote ?? data?.quote ?? null;

  return { quote, isLoading: isFetching, error };
};

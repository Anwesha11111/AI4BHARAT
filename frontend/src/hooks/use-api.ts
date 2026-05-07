import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  type ApiTender,
  type ApiCriterion,
  type ApiBidder,
  type ApiScorecard,
  type ApiTenderStatus,
  type ApiAuditLog,
} from "@/lib/api";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useTenders() {
  const [state, setState] = useState<AsyncState<ApiTender[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.getTenders();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({
        data: null,
        loading: false,
        error: e instanceof ApiError ? e.message : "Failed to fetch tenders",
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export function useCriteria(tenderId: number | null) {
  const [state, setState] = useState<AsyncState<ApiCriterion[]>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (tenderId === null) return;

    setState({ data: null, loading: true, error: null });
    api
      .getCriteria(tenderId)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((e) =>
        setState({
          data: null,
          loading: false,
          error: e instanceof ApiError ? e.message : "Failed to fetch criteria",
        })
      );
  }, [tenderId]);

  return state;
}

export function useBidders(tenderId: number | null) {
  const [state, setState] = useState<AsyncState<ApiBidder[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (tenderId === null) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.getBidders(tenderId);
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({
        data: null,
        loading: false,
        error: e instanceof ApiError ? e.message : "Failed to fetch bidders",
      });
    }
  }, [tenderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export function useScorecard(tenderId: number | null) {
  const [state, setState] = useState<AsyncState<ApiScorecard>>({
    data: null,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (tenderId === null) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.getScorecard(tenderId);
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({
        data: null,
        loading: false,
        error: e instanceof ApiError ? e.message : "Failed to fetch scorecard",
      });
    }
  }, [tenderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export function useTenderStatus(tenderId: number | null) {
  const [state, setState] = useState<AsyncState<ApiTenderStatus>>({
    data: null,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (tenderId === null) return;
    try {
      const data = await api.getTenderStatus(tenderId);
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({
        data: null,
        loading: false,
        error: e instanceof ApiError ? e.message : "Failed to fetch status",
      });
    }
  }, [tenderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export function useTenderStatusStream(tenderId: number | null) {
  const [status, setStatus] = useState<ApiTenderStatus | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (tenderId === null) return;

    setConnected(true);
    const cleanup = api.streamTenderStatus(
      tenderId,
      (data) => setStatus(data),
      () => setConnected(false)
    );

    return cleanup;
  }, [tenderId]);

  return { status, connected };
}

export function useAuditLog(tenderId: number | null) {
  const [state, setState] = useState<AsyncState<ApiAuditLog[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (tenderId === null) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.getAuditLog(tenderId);
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({
        data: null,
        loading: false,
        error: e instanceof ApiError ? e.message : "Failed to fetch audit log",
      });
    }
  }, [tenderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

export function useUploadTender() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await api.uploadTender(file);
      setUploading(false);
      return result;
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Failed to upload tender";
      setError(message);
      setUploading(false);
      throw e;
    }
  }, []);

  return { upload, uploading, error };
}

export function useUploadBidder() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (tenderId: number, vendorName: string, files: File[]) => {
      setUploading(true);
      setError(null);
      try {
        const result = await api.uploadBidder(tenderId, vendorName, files);
        setUploading(false);
        return result;
      } catch (e) {
        const message =
          e instanceof ApiError ? e.message : "Failed to upload bidder";
        setError(message);
        setUploading(false);
        throw e;
      }
    },
    []
  );

  return { upload, uploading, error };
}

export function useReviewVerdict() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const review = useCallback(
    async (
      verdictId: number,
      status: "pass" | "fail" | "review_needed",
      reason: string,
      actor: string
    ) => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await api.reviewVerdict(verdictId, status, reason, actor);
        setSubmitting(false);
        return result;
      } catch (e) {
        const message =
          e instanceof ApiError ? e.message : "Failed to submit review";
        setError(message);
        setSubmitting(false);
        throw e;
      }
    },
    []
  );

  return { review, submitting, error };
}

import { getAuthToken } from "./auth-context";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export type ApiTender = {
  id: number;
  title: string;
  status: string;
  created_at: string | null;
};

export type ApiCriterion = {
  id: number;
  tender_id: number;
  text: string;
  type: "mandatory" | "optional";
  weight: number;
};

export type ApiBidder = {
  id: number;
  vendor_name: string;
  status: string;
  submission_date: string | null;
};

export type ApiVerdict = {
  id: number;
  bidder_id: number;
  criterion_id: number;
  status: "pass" | "fail" | "review_needed";
  confidence: number;
  reasoning: string;
  evidence_citation: {
    excerpt?: string;
    page?: number;
    source_doc?: string;
  } | null;
  is_human_reviewed: boolean;
  created_at: string | null;
};

export type ApiScorecardBidder = {
  bidder_id: number;
  status: string;
  vendor_name: string;
  compliance_score: number;
  disqualified: boolean;
  verdicts: ApiVerdict[];
};

export type ApiScorecard = {
  tender_id: number;
  status: string;
  criteria: ApiCriterion[];
  bidders: ApiScorecardBidder[];
};

export type ApiAuditLog = {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  actor: string;
  reason: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  timestamp: string | null;
};

export type ApiTenderStatus = {
  tender_id: number;
  status: string;
  tender_status?: string;
  bidders: { id: number; status: string; vendor: string }[];
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.detail || `Request failed: ${response.statusText}`
    );
  }

  return response.json();
}

export const api = {
  async getTenders(): Promise<ApiTender[]> {
    return request<ApiTender[]>("/tenders");
  },

  async uploadTender(file: File): Promise<{ id: number; status: string; message: string }> {
    const formData = new FormData();
    formData.append("file", file);

    return request("/upload/tender", {
      method: "POST",
      body: formData,
    });
  },

  async getCriteria(tenderId: number): Promise<ApiCriterion[]> {
    return request<ApiCriterion[]>(`/tenders/${tenderId}/criteria`);
  },

  async getBidders(tenderId: number): Promise<ApiBidder[]> {
    return request<ApiBidder[]>(`/tenders/${tenderId}/bidders`);
  },

  async uploadBidder(
    tenderId: number,
    vendorName: string,
    files: File[]
  ): Promise<{ id: number; status: string; file_count: number; message: string }> {
    const formData = new FormData();
    formData.append("tender_id", tenderId.toString());
    formData.append("vendor_name", vendorName);
    files.forEach((file) => formData.append("files", file));

    return request("/upload/bidder", {
      method: "POST",
      body: formData,
    });
  },

  async getScorecard(tenderId: number): Promise<ApiScorecard> {
    return request<ApiScorecard>(`/tenders/${tenderId}/scorecard`);
  },

  async getTenderStatus(tenderId: number): Promise<ApiTenderStatus> {
    return request<ApiTenderStatus>(`/tenders/${tenderId}/status`);
  },

  async reviewVerdict(
    verdictId: number,
    status: "pass" | "fail" | "review_needed",
    reason: string,
    actor: string
  ): Promise<{ message: string }> {
    const params = new URLSearchParams({
      status,
      reason,
      actor,
    });
    return request(`/verdicts/${verdictId}/review?${params}`, {
      method: "PATCH",
    });
  },

  async getAuditLog(tenderId: number): Promise<ApiAuditLog[]> {
    return request<ApiAuditLog[]>(`/tenders/${tenderId}/audit`);
  },

  async getTenderDocuments(tenderId: number): Promise<{
    tender_id: number;
    documents: Array<{
      type: string;
      id: number;
      name: string;
      path: string;
      bidder_name?: string;
    }>;
  }> {
    return request(`/tenders/${tenderId}/documents`);
  },

  getTenderDocumentUrl(tenderId: number): string {
    return `${API_BASE_URL}/tenders/${tenderId}/document`;
  },

  getBidderDocumentUrl(bidderId: number, filename: string): string {
    return `${API_BASE_URL}/bidders/${bidderId}/document/${encodeURIComponent(filename)}`;
  },

  streamTenderStatus(
    tenderId: number,
    onMessage: (data: ApiTenderStatus) => void,
    onError?: (error: Event) => void
  ): () => void {
    const eventSource = new EventSource(
      `${API_BASE_URL}/tenders/${tenderId}/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error("Stream error:", data.error);
          eventSource.close();
          return;
        }
        onMessage(data);

        if (
          data.tender_status === "completed" ||
          data.tender_status === "failed"
        ) {
          const allBiddersDone = data.bidders.every(
            (b: { status: string }) =>
              b.status === "completed" || b.status === "failed"
          );
          if (allBiddersDone) {
            eventSource.close();
          }
        }
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      onError?.(error);
      eventSource.close();
    };

    return () => eventSource.close();
  },
};

export { ApiError };

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export interface ShopInfo {
  name: string;
  nameUrdu?: string;
  isOpen: boolean;
  rates: {
    rateBwSingle: number;
    rateBwDouble: number;
    rateColorSingle: number;
    rateColorDouble: number;
  };
  maxFileMb: number;
  maxPages: number;
  acceptedTypes: string[];
}

export interface UploadResult {
  uploadId: string;
  fileName: string;
  pageCount: number;
  sizeBytes: number;
}

export interface QuoteResult {
  pagesPerCopy: number;
  printedPages: number;
  unitRate: number;
  total: number;
}

export interface JobResult {
  publicToken: string;
  tokenLabel: string;
  status: string;
  total: number;
}

export interface JobStatusInfo {
  tokenLabel: string;
  status: string;
  total: number;
  paymentStatus: string;
  rejectReason?: string;
  shopName: string;
  createdAt: string;
}

export async function fetchShop(slug: string): Promise<ShopInfo> {
  const res = await fetch(`${API_BASE}/public/shops/${slug}`, {
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error?.message || "Dukan ki maloomat load nahi ho saki",
    );
  }
  return data;
}

export async function uploadDocument(
  slug: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/public/shops/${slug}/uploads`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json);
        } else {
          reject(new Error(json.error?.message || "Upload mein masla aaya"));
        }
      } catch {
        reject(new Error("Server response invalid hai"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network masla aaya, internet check karein"));
    };

    xhr.send(formData);
  });
}

export async function fetchQuote(params: {
  uploadId: string;
  copies: number;
  colorMode: string;
  sides: string;
  paperSize: string;
  pageRange?: string;
}): Promise<QuoteResult> {
  const res = await fetch(`${API_BASE}/public/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error?.message || "Quote calculate karne mein masla aaya",
    );
  }
  return data;
}

export async function submitPrintJob(jobData: {
  uploadId: string;
  customerName: string;
  customerPhone?: string;
  copies: number;
  colorMode: string;
  sides: string;
  paperSize: string;
  pageRange?: string;
}): Promise<JobResult> {
  const res = await fetch(`${API_BASE}/public/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jobData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error?.message || "Order submit karne mein masla aaya",
    );
  }
  return data;
}

export async function fetchJobStatus(
  publicToken: string,
): Promise<JobStatusInfo> {
  const res = await fetch(`${API_BASE}/public/jobs/${publicToken}`, {
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error?.message || "Job status check karne mein masla aaya",
    );
  }
  return data;
}

export async function cancelPrintJob(publicToken: string): Promise<JobResult> {
  const res = await fetch(`${API_BASE}/public/jobs/${publicToken}/cancel`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.error?.message || "Order cancel karne mein masla aaya",
    );
  }
  return data;
}

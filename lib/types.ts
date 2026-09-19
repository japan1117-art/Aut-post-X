export type GeneratedPost = {
  topic: string;
  format: "knowledge" | "dont_buy" | "cost_per_use" | "time_roi";
  hook: string;
  body: string;
  imageTitle: string;
  imagePoints: [string, string, string];
};

export type PostRow = {
  id: string;
  topic: string;
  format: string;
  hook: string;
  body: string;
  image_title: string;
  image_points: string[];
  status: string;
  scheduled_at: string;
  attempts: number;
};

export type ComplianceResult = {
  status: "PASS" | "WARNING" | "FAIL";
  reasons: string[];
  similarity: number;
};

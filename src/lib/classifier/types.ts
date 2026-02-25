export interface ClassificationInput {
  threadId: string;
  sender: string;
  subject: string;
  snippet: string;
  date: string;
}

export interface ClassificationResult {
  threadId: string;
  bucket: string;
  confidence: number;
}

export interface ClassificationBatchResponse {
  classifications: ClassificationResult[];
}

export interface BucketDefinition {
  name: string;
  description: string;
}

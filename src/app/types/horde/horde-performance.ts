export interface HordePerformance {
  queued_requests: number;
  queued_text_requests: number;
  worker_count: number;
  text_worker_count: number;
  thread_count: number;
  text_thread_count: number;
  queued_megapixelsteps: number;
  past_minute_megapixelsteps: number;
  queued_forms: number;
  interrogator_count: number;
  interrogator_thread_count: number;
  queued_tokens: number;
  past_minute_tokens: number;
}

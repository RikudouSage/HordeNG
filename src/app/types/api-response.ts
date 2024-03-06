import {ErrorResponse} from "./error-response";

export interface ApiResponse<T> {
  success: boolean;
  successResponse?: T;
  errorResponse?: ErrorResponse;
  statusCode: number;
}

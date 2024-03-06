import {RequestErrorCode} from "./horde/request-error-code";

export interface ErrorResponse {
  message: string;
  rc: RequestErrorCode;
}

interface PrivateMessage {
  message: string;
  origin: string;
}

export interface IncomingPrivateMessage extends PrivateMessage{
  expiry: string;
  id: string;
  user_id: string;
}

export interface OutgoingPrivateMessage extends PrivateMessage{
  worker_id: string;
  expiry: number;
}

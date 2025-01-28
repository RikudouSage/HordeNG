interface PrivateMessage {
  message: string;
}

export interface IncomingPrivateMessage extends PrivateMessage{
  origin: string;
  expiry: string;
  id: string;
  user_id: string;
}

export interface OutgoingPrivateMessage extends PrivateMessage{
  worker_id: string;
  expiry: number;
}

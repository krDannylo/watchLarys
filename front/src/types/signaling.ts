export interface OfferMessage {
  sender: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerMessage {
  sender: string;
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage {
  sender: string;
  candidate: RTCIceCandidateInit;
}

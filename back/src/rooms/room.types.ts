export interface Room {
  id: string;

  participants: Set<string>;

  screenSharerId: string | null;
}

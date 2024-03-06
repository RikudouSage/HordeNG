import {UserKudosDetails} from "./user-kudos-details";
import {MonthlyKudos} from "./monthly-kudos";
import {UsageDetails} from "./usage-details";
import {ContributionsDetails} from "./contributions-details";
import {UserRecords} from "./user-records";

export interface UserDetails {
  username: string;
  id: number;
  kudos: number;
  evaluating_kudos: number;
  concurrency: number;
  worker_invited: number;
  moderator: boolean;
  kudos_details: UserKudosDetails;
  worker_count: number;
  worker_ids: string[];
  sharedkey_ids: string[];
  monthly_kudos: MonthlyKudos;
  trusted: boolean;
  flagged: boolean;
  vpn: boolean;
  service: boolean;
  education: boolean;
  special: boolean;
  suspicious: number;
  pseudonymous: boolean;
  contact: string;
  admin_comment: string;
  account_age: number;
  usage: UsageDetails;
  contributions: ContributionsDetails;
  records: UserRecords;
}

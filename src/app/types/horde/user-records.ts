import {UserThingRecords} from "./user-thing-records";
import {UserAmountRecords} from "./user-amount-records";

export interface UserRecords {
  usage: UserThingRecords;
  contribution: UserThingRecords;
  fulfillment: UserAmountRecords;
  request: UserAmountRecords;
}

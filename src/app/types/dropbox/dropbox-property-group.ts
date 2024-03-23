import {DropboxPropertyGroupField} from "./dropbox-property-group-field";

export interface DropboxPropertyGroup {
  fields: DropboxPropertyGroupField[];
  template_id: string;
}

import {DropboxFileLockInfo} from "./dropbox-file-lock-info";
import {DropboxPropertyGroup} from "./dropbox-property-group";
import {DropboxSharingInfo} from "./dropbox-sharing-info";

export interface DropboxUploadResponse {
  client_modified: string;
  content_hash: string;
  file_lock_info: DropboxFileLockInfo;
  has_explicit_shared_members: boolean;
  id: string;
  is_downloadable: boolean;
  name: string;
  path_display: string;
  path_lower: string;
  property_groups: DropboxPropertyGroup[];
  rev: string;
  server_modified: string;
  sharing_info: DropboxSharingInfo;
  size: number;
}

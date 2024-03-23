import {DropboxListFolderEntry} from "./dropbox-list-folder-entry";

export interface DropboxListFolderResult {
  cursor: string;
  has_more: boolean;
  entries: DropboxListFolderEntry[];
}

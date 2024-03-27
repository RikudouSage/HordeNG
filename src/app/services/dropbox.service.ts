import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {DropboxCredentials} from "../types/credentials/dropbox.credentials";
import {DatabaseService} from "./database.service";
import {HttpMethod} from "../types/http-method";
import {DropboxUploadResponse} from "../types/dropbox/dropbox-upload-response";
import {catchError, EMPTY, expand, from, map, Observable, of, reduce, switchMap} from "rxjs";
import {DropboxListFolderResult} from "../types/dropbox/dropbox-list-folder-result";

type HttpRequestOptions = Partial<{
  credentials: DropboxCredentials,
  headers: Record<string, string>,
  requestBody: Record<string, any>,
  fileContent: Blob,
  forceHeaderBody: boolean,
}>;

@Injectable({
  providedIn: 'root'
})
export class DropboxService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly database: DatabaseService,
  ) {}

  public validateAccessToken(accessToken: string): Observable<boolean> {
    const random = Math.random();
    return this.httpRequest<{result: string}>(
      HttpMethod.Post,
      this.apiUrl(`check/user`),
      {
        requestBody: {
          query: String(random),
        },
        credentials: {
          accessKey: accessToken,
        },
      },
    ).pipe(
      map(result => result.result === String(random)),
      catchError(() => of(false)),
    );
  }

  public uploadFile(filename: string, content: Blob): Observable<DropboxUploadResponse> {
    return this.httpRequest(HttpMethod.Post, this.contentUrl(`files/upload`), {
      requestBody: {
        path: `/${filename}`,
        mode: 'overwrite',
        autorename: false,
      },
      fileContent: content,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
  }

  public downloadFile<T, TBinary extends boolean>(filename: string, binary: TBinary): Observable<TBinary extends true ? Blob : T> {
    if (!filename.startsWith('/')) {
      filename = `/${filename}`
    }
    return this.httpRequest(HttpMethod.Post, this.contentUrl(`files/download`), {
      requestBody: {
        path: filename,
      },
      forceHeaderBody: true,
      headers: {
        'Content-Type': 'text/plain',
      },
    }, binary);
  }

  public listFolder(folder: string): Observable<DropboxListFolderResult> {
    let path = folder === '' ? '' : `/${folder}`;
    return this.httpRequest<DropboxListFolderResult>(HttpMethod.Post, this.apiUrl(`files/list_folder`), {
      requestBody: {
        path: path,
      }
    }).pipe(
      expand(response => {
        if (!response.has_more) {
          return EMPTY;
        }

        return this.httpRequest<DropboxListFolderResult>(HttpMethod.Post, this.apiUrl(`files/list_folder/continue`), {
          requestBody: {
            cursor: response.cursor,
          },
        });
      }),
      reduce((acc, value) => {
        const result = {...acc};
        result.entries = acc.entries.concat(value.entries);

        return result;
      }),
    );
  }

  public deleteFile(path: string): Observable<any> {
    return this.httpRequest(HttpMethod.Post, this.apiUrl(`files/delete_v2`), {
      requestBody: {
        path: path,
      }
    });
  }

  private httpRequest<T>(method: HttpMethod, url: string, options: HttpRequestOptions): Observable<T>;
  private httpRequest<T, TBinary extends boolean>(method: HttpMethod, url: string, options: HttpRequestOptions, binary: TBinary): Observable<TBinary extends true ? Blob : T>;
  private httpRequest<T, TBinary extends boolean>(method: HttpMethod, url: string, options: HttpRequestOptions, binary?: TBinary): Observable<TBinary extends true ? Blob : T> {
    return <any>of (options.credentials).pipe(
      switchMap(credentials => {
        if (credentials === undefined) {
          return from(this.getCredentials());
        }

        return of(credentials);
      }),
      switchMap(credentials => {
        options.headers ??= {};
        options.forceHeaderBody ??= false;

        options.headers['Content-Type'] ??= 'application/json';
        options.headers['Authorization'] ??= `Bearer ${credentials.accessKey}`;

        const body = method === HttpMethod.Get
          ? undefined
          : (
            options.fileContent === undefined
              ? (options.forceHeaderBody ? undefined : options.requestBody)
              : options.fileContent
          );

        if (options.requestBody && (options.fileContent || options.forceHeaderBody)) {
          options.headers['Dropbox-API-Arg'] = JSON.stringify(options.requestBody);
        }

        if (binary) {
          return this.httpClient.request(method, url, {
            headers: options.headers,
            body: body,
            responseType: 'blob',
          });
        }

        return this.httpClient.request<T>(method, url, {
          headers: options.headers,
          body: body,
        });
      }),
    );
  }

  private async getCredentials(): Promise<DropboxCredentials> {
    const credentials = await this.database.getSetting<DropboxCredentials>('credentials');
    if (credentials === undefined || typeof (<any>credentials.value).accessKey === 'undefined') {
      throw new Error("Cannot use default credentials when Dropbox is not configured");
    }

    return credentials.value;
  }

  private apiUrl(endpoint: string): string {
    return `https://api.dropboxapi.com/2/${endpoint}`;
  }

  private contentUrl(endpoint: string): string {
    return `https://content.dropboxapi.com/2/${endpoint}`
  }
}

import {ImageStorage} from "./image-storage";
import {Injectable} from "@angular/core";
import {S3Credentials} from "../../types/credentials/s3.credentials";

@Injectable({
  providedIn: 'root',
})
export class S3ImageStorage implements ImageStorage<S3Credentials> {
    public async validateCredentials(credentials: S3Credentials): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}

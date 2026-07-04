import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private readonly http = inject(HttpClient);

  upload(file: File, bucket: 'products' | 'categories'): Observable<string> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<{ url: string }>(`${environment.apiUrl}/images/upload?bucket=${bucket}`, form)
      .pipe(map(r => r.url));
  }

  readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
      reader.readAsDataURL(file);
    });
  }
}

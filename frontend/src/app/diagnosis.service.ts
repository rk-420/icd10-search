import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** One row as returned by the PHP API. */
export interface Diagnosis {
  code: string;
  title: string;
}

/** Talks to the backend. Components never build URLs themselves. */
@Injectable({ providedIn: 'root' })
export class DiagnosisService {
  private readonly http = inject(HttpClient);

  search(query: string): Observable<Diagnosis[]> {
    // "/api" is forwarded to the PHP container by proxy.conf.json.
    // HttpClient URL-encodes the parameter, e.g. "Störung" → "St%C3%B6rung".
    return this.http.get<Diagnosis[]>('/api/search.php', { params: { q: query } });
  }
}

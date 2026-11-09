import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Observable, catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';

import { Diagnosis, DiagnosisService } from '../diagnosis.service';
import { HighlightPipe } from '../highlight.pipe';

type Status = 'idle' | 'loading' | 'done' | 'error';

/** Everything the template needs to know about the current search. */
interface SearchState {
  status: Status;
  query: string;
  results: Diagnosis[];
}

const MIN_LENGTH = 2; // same rule as in search.php
const MAX_RESULTS = 50; // same LIMIT as in search.php

function searchState(status: Status, query: string, results: Diagnosis[] = []): SearchState {
  return { status, query, results };
}

@Component({
  selector: 'app-diagnosis-search',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTableModule,
    HighlightPipe,
  ],
  templateUrl: './diagnosis-search.html',
  styleUrl: './diagnosis-search.scss',
})
export class DiagnosisSearch {
  private readonly diagnosisService = inject(DiagnosisService);

  protected readonly minLength = MIN_LENGTH;
  protected readonly maxResults = MAX_RESULTS;
  protected readonly columns = ['code', 'title'];

  /** The search input. nonNullable: reset gives '' instead of null. */
  protected readonly query = new FormControl('', { nonNullable: true });

  /**
   * Turns the stream of typed text into a stream of search states,
   * and toSignal() makes it readable in the template as state().
   */
  protected readonly state = toSignal(
    this.query.valueChanges.pipe(
      map((text) => text.trim()),
      debounceTime(300), // wait until the user stops typing for 300 ms
      distinctUntilChanged(), // "chol" → "chole" → "chol" again: no new request
      switchMap((query) => this.search(query)), // cancel the old request when a new query arrives
    ),
    { initialValue: searchState('idle', '') },
  );

  private search(query: string): Observable<SearchState> {
    if (query.length < MIN_LENGTH) {
      return of(searchState('idle', query));
    }
    return this.diagnosisService.search(query).pipe(
      map((results) => searchState('done', query, results)),
      // catchError is INSIDE switchMap: an error ends only this one request,
      // not the whole valueChanges stream, so the next keystroke works again.
      catchError(() => of(searchState('error', query))),
      startWith(searchState('loading', query)), // emitted immediately, before the response
    );
  }

  protected clear(): void {
    this.query.setValue('');
  }
}

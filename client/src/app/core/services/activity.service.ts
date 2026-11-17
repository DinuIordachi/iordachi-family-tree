import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Activity, ActivityFilterOptions, ActivityQuery, ApiResponse, PaginatedResponse } from '@app/core/models';

/** Admin-only activity log (audit trail). */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly api = inject(ApiService);

  paginate(query: ActivityQuery = {}): Observable<PaginatedResponse<Activity>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.api.get<PaginatedResponse<Activity>>('/activities', params);
  }

  filters(): Observable<ActivityFilterOptions> {
    return this.api
      .get<ApiResponse<ActivityFilterOptions>>('/activities/filters')
      .pipe(map((res) => res.data));
  }
}

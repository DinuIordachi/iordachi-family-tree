import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { DomainRole } from '../models/domain-role.model';

@Injectable({ providedIn: 'root' })
export class DomainRoleService {
  private readonly api = inject(ApiService);

  list(): Observable<ApiResponse<DomainRole[]>> {
    return this.api.get<ApiResponse<DomainRole[]>>('/domain-roles');
  }
}

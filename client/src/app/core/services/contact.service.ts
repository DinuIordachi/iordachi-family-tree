import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { Contact } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly api = inject(ApiService);

  store(personId: number, data: Partial<Contact>): Observable<ApiResponse<Contact>> {
    return this.api.post<ApiResponse<Contact>>(`/persons/${personId}/contacts`, data);
  }

  update(personId: number, contactId: number, data: Partial<Contact>): Observable<ApiResponse<Contact>> {
    return this.api.put<ApiResponse<Contact>>(`/persons/${personId}/contacts/${contactId}`, data);
  }

  remove(personId: number, contactId: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/persons/${personId}/contacts/${contactId}`);
  }
}

import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, Contact, PaginatedResponse, Person } from '@app/core/models';

@Injectable({ providedIn: 'root' })
export class PersonService {
  private readonly api = inject(ApiService);

  list(page = 1, pageSize = 10): Observable<PaginatedResponse<Person>> {
    const params = new HttpParams().appendAll({ page, pageSize });
    return this.api.get<PaginatedResponse<Person>>('/persons', params);
  }

  show(id: number): Observable<ApiResponse<Person>> {
    return this.api.get<ApiResponse<Person>>(`/persons/${id}`);
  }

  store(data: Partial<Person>): Observable<ApiResponse<Person>> {
    return this.api.post<ApiResponse<Person>>('/persons', data);
  }

  update(id: number, data: Partial<Person>): Observable<ApiResponse<Person>> {
    return this.api.put<ApiResponse<Person>>(`/persons/${id}`, data);
  }

  remove(id: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/persons/${id}`);
  }

  addContact(personId: number, data: Partial<Contact>): Observable<ApiResponse<Contact>> {
    return this.api.post<ApiResponse<Contact>>(`/persons/${personId}/contacts`, data);
  }

  updateContact(
    personId: number,
    contactId: number,
    data: Partial<Contact>,
  ): Observable<ApiResponse<Contact>> {
    return this.api.put<ApiResponse<Contact>>(`/persons/${personId}/contacts/${contactId}`, data);
  }

  removeContact(personId: number, contactId: number): Observable<ApiResponse<void>> {
    return this.api.delete<ApiResponse<void>>(`/persons/${personId}/contacts/${contactId}`);
  }
}

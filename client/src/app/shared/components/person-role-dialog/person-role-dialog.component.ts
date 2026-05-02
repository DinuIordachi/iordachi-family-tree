import { Component, inject, input, output, signal, OnInit, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { InputNumber } from 'primeng/inputnumber';
import { DatePicker } from 'primeng/datepicker';
import { FloatLabel } from 'primeng/floatlabel';
import { PersonService } from '../../../core/services/person.service';
import { DomainRoleService } from '../../../core/services/domain-role.service';
import { LimitedPerson } from '../../../core/models/person.model';
import { DomainRole } from '../../../core/models/domain-role.model';
import { DomainRoleScope } from '../../../core/enums/domain-role-scope.enum';

@Component({
  selector: 'app-person-role-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, Dialog, Button, Select, AutoComplete, InputNumber, DatePicker, FloatLabel],
  templateUrl: './person-role-dialog.component.html',
  styles: ``
})
export class PersonRoleDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly personService = inject(PersonService);
  private readonly domainRoleService = inject(DomainRoleService);

  visible = input.required<boolean>();
  scope = input.required<'garage' | 'association'>();

  onHide = output<void>();
  onSaved = output<{
    personId: number;
    roleId: number;
    ownershipPercentage?: number;
    startDate?: string;
  }>();

  personSuggestions = signal<LimitedPerson[]>([]);
  allRoles = signal<DomainRole[]>([]);
  filteredRoles = signal<DomainRole[]>([]);
  saving = signal(false);

  form: FormGroup = this.fb.group({
    person: [null, Validators.required],
    roleId: [null, Validators.required],
    ownershipPercentage: [null],
    startDate: [null],
  });

  constructor() {
    effect(() => {
      const roles = this.allRoles();
      const scopeVal = this.scope();
      this.filteredRoles.set(
        roles.filter(r => r.scope === (scopeVal === 'garage' ? DomainRoleScope.GARAGE : DomainRoleScope.ASSOCIATION))
      );
    });
  }

  ngOnInit(): void {
    this.domainRoleService.list().subscribe(res => {
      this.allRoles.set(res.data);
    });
  }

  searchPersons(event: AutoCompleteCompleteEvent): void {
    this.personService.list(1).subscribe(res => {
      const query = event.query.toLowerCase();
      this.personSuggestions.set(
        res.data
          .filter(p => p.lastName.toLowerCase().includes(query) || p.firstName.toLowerCase().includes(query))
          .map(p => ({ id: p.id, firstName: p.firstName, lastName: p.lastName }))
      );
    });
  }

  onVisibleChange(value: boolean): void {
    if (!value) {
      this.form.reset();
      this.onHide.emit();
    }
  }

  onSave(): void {
    if (this.form.invalid) return;

    const person = this.form.value.person as LimitedPerson;
    const result: any = {
      personId: person.id,
      roleId: this.form.value.roleId,
    };

    if (this.scope() === 'garage' && this.form.value.ownershipPercentage != null) {
      result.ownershipPercentage = this.form.value.ownershipPercentage;
    }

    if (this.scope() === 'association' && this.form.value.startDate) {
      const d = this.form.value.startDate as Date;
      result.startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    this.onSaved.emit(result);
  }
}

import { LimitedAssociation } from './association.model';
import { DomainRole } from './domain-role.model';
import { LimitedPerson } from './person.model';

export interface AssociationPersonRole {
  id: number;
  associationId: number;
  roleId: number;
  personId: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  association?: LimitedAssociation;
  role?: DomainRole;
  person?: LimitedPerson;
}

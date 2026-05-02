import { LimitedGarage } from './garage.model';
import { DomainRole } from './domain-role.model';
import { LimitedPerson } from './person.model';

export interface GaragePersonRole {
  id: number;
  garageId: number;
  roleId: number;
  personId: number;
  ownershipPercentage: number | null;
  garage?: LimitedGarage;
  role?: DomainRole;
  person?: LimitedPerson;
}

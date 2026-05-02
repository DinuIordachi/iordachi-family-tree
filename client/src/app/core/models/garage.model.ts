import { GarageStatus } from '../enums/garage-status.enum';
import { LimitedAssociation } from './association.model';
import { GaragePersonRole } from './garage-person-role.model';

export interface Garage {
  id: number;
  associationId: number;
  name: string;
  status: GarageStatus;
  city: string;
  street: string;
  internalAddress: string;
  addressNumber: string;
  cadastralNumber: string;
  area: number;
  association?: LimitedAssociation;
  personRoles?: GaragePersonRole[];
}

export interface LimitedGarage {
  id: number;
  name: string;
}

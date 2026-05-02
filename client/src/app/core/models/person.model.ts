import { Contact } from './contact.model';
import { GaragePersonRole } from './garage-person-role.model';
import { AssociationPersonRole } from './association-person-role.model';

export interface Person {
  id: number;
  firstName: string;
  lastName: string;
  patronymic: string;
  nameId: string;
  contactsQty?: number;
  garagesQty?: number;
  associationsQty?: number;
  contacts?: Contact[];
  garageRoles?: GaragePersonRole[];
  associationRoles?: AssociationPersonRole[];
}

export interface LimitedPerson {
  id: number;
  firstName: string;
  lastName: string;
}

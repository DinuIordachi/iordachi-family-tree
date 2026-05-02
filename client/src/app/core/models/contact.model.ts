import { ContactType } from '../enums/contact-type.enum';

export interface Contact {
  id: number;
  type: ContactType;
  value: string;
  favorite: boolean;
  whatsapp: boolean;
  viber: boolean;
  telegram: boolean;
  calls: boolean;
  sms: boolean;
}

import { DomainRoleName } from '../enums/domain-role-name.enum';
import { DomainRoleScope } from '../enums/domain-role-scope.enum';

export interface DomainRole {
  id: number;
  name: DomainRoleName;
  scope: DomainRoleScope;
}

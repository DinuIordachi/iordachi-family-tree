export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
  roles?: UserRole[];
}

export interface UserRole {
  id: number;
  name: string;
  displayName: string;
}


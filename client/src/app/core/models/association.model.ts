export interface Association {
  id: number;
  name: string;
  address: string;
  phone: string;
  cadastralNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LimitedAssociation {
  id: number;
  name: string;
}

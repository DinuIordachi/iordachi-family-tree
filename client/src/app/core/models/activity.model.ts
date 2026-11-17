export interface ActivityCauser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface ActivityChange {
  field: string;
  old: unknown;
  new: unknown;
}

export interface Activity {
  id: number;
  logName: string | null;
  event: string | null;
  description: string;
  causer: ActivityCauser | null;
  subjectType: string | null;
  subjectId: number | null;
  subjectLabel: string;
  changes: ActivityChange[];
  properties: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityQuery {
  page?: number;
  pageSize?: number;
  orderBy?: 'createdAt' | 'event' | 'logName';
  orderDirection?: 'asc' | 'desc';
  term?: string;
  causerId?: number;
  event?: string;
  logName?: string;
  subjectType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityFilterOptions {
  events: string[];
  logNames: string[];
  subjectTypes: string[];
  causers: { id: number; name: string; email: string }[];
}

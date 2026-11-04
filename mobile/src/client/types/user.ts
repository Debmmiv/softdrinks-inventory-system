// Role definition — matches MongoDB 'role' field values exactly
export type Role = 'staff' | 'owner/manager';

// The user object held in memory (from SQLite users_cache or online JWT)
export interface User {
  id: string;        // MongoDB ObjectId stored as a plain string
  username: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

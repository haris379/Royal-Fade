// Single source of truth for what each role may do. Roles live ONLY in the database (Admin.role) and are set
// only by the provisioning scripts (npm run seed / npm run create-developer), never by an API request.
//
//   admin      the business owner: reads services and barbers; manages appointments and contact messages.
//              Has NO "services:write", so the service catalogue is read-only for the owner.
//   developer  website maintenance: manages the service catalogue (add / edit / images / delete).
//              Deliberately has NO access to customer data (appointments, messages) - least privilege.
export const ROLES = ['admin', 'developer'];

export const PERMISSIONS = {
  admin: ['services:read', 'barbers:read', 'appointments:read', 'appointments:manage', 'messages:read', 'messages:manage'],
  developer: ['services:read', 'services:write'],
};

export const isRole = (value) => typeof value === 'string' && ROLES.includes(value);
// Own-property lookups only: a role such as "__proto__" or "constructor" must never resolve to anything.
const listFor = (role) => (isRole(role) && Object.hasOwn(PERMISSIONS, role) ? PERMISSIONS[role] : []);
export const permissionsFor = (role) => [...listFor(role)];
export const can = (role, permission) => listFor(role).includes(permission);

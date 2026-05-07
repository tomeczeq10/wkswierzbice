import type { CollectionConfig } from 'payload'

/**
 * Users — konta logujące się do panelu admina.
 *
 * Po refaktorze RBAC (2026-05-06): pole `role` to relacja do kolekcji `roles`,
 * NIE sztywny enum. Każdy user musi mieć przypisaną rolę. Logika permissions
 * (kto może czytać/edytować daną kolekcję) siedzi w `src/access/hasPermission.ts`
 * i odpytuje pole `role.permissions` aktualnie zalogowanego usera.
 *
 * Zarządzanie kontami (CRUD na users + roles) jest twardo zaszyte tylko dla
 * roli "Administrator" — nie podlega systemowi permissions.
 */

const isAdministrator = ({ req }: any): boolean =>
  req.user?.role?.name === 'Administrator'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    group: 'Ustawienia',
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'updatedAt'],
    description: 'Konta z dostępem do panelu. Tylko Administrator może je tworzyć i edytować.',
  },
  auth: {
    depth: 1, // populate `role` jako obiekt (nie samo id) — wymagane przez admin.hidden + hasPermission
  },
  access: {
    read: isAdministrator,
    create: isAdministrator,
    update: isAdministrator,
    delete: isAdministrator,
  },
  fields: [
    {
      name: 'role',
      type: 'relationship',
      relationTo: 'roles',
      required: true,
      label: 'Rola',
      admin: {
        position: 'sidebar',
        description: 'Określa, co użytkownik może robić w panelu.',
      },
    },
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'teams',
      label: { pl: 'Drużyna (opcjonalnie)', en: 'Team (optional)' },
      admin: {
        position: 'sidebar',
        description: 'Pole pomocnicze — np. trenera można powiązać z konkretną drużyną.',
      },
    },
  ],
}

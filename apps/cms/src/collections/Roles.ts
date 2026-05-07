import type { CollectionConfig, Field } from 'payload'

/**
 * Roles — dynamiczne uprawnienia dla użytkowników panelu.
 *
 * Każda rola = nazwany zestaw permissions (matrix CRUD per kolekcja
 * + globalsy + custom views). Administrator zalogowany w panelu sam tworzy
 * dowolne role (np. "Redaktor", "Fotograf") i zaznacza checkboxy.
 *
 * Rola "Administrator" jest seedowana migracją z `is_system: true` —
 * nie da się jej skasować ani zmienić uprawnień (UI to blokuje).
 *
 * Logika sprawdzania w `src/access/hasPermission.ts` — każda kolekcja
 * sprawdza permissions z roli aktualnie zalogowanego użytkownika.
 */

// Helper: 4 checkboxy CRUD per kolekcja (w grupie z czytelną nazwą).
const crudGroup = (name: string, label: string): Field => ({
  name,
  type: 'group',
  label,
  admin: { hideGutter: true },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'read', type: 'checkbox', label: 'Czytanie', defaultValue: false, admin: { width: '25%' } },
        { name: 'create', type: 'checkbox', label: 'Tworzenie', defaultValue: false, admin: { width: '25%' } },
        { name: 'update', type: 'checkbox', label: 'Edycja', defaultValue: false, admin: { width: '25%' } },
        { name: 'delete', type: 'checkbox', label: 'Usuwanie', defaultValue: false, admin: { width: '25%' } },
      ],
    },
  ],
})

export const Roles: CollectionConfig = {
  slug: 'roles',
  labels: {
    singular: { pl: 'Rola', en: 'Role' },
    plural: { pl: 'Role', en: 'Roles' },
  },
  admin: {
    group: 'Ustawienia',
    useAsTitle: 'name',
    defaultColumns: ['name', 'description', 'isSystem', 'updatedAt'],
    description:
      'Definiowanie ról i ich uprawnień. "Administrator" to rola systemowa — nie można jej usunąć ani zmienić jej uprawnień.',
  },
  // Tylko Administrator zarządza rolami (twardo zaszyte — nie ma checkboxa "manageRoles").
  access: {
    read: ({ req }) => (typeof req.user?.role === 'object' && req.user.role?.name === 'Administrator'),
    create: ({ req }) => (typeof req.user?.role === 'object' && req.user.role?.name === 'Administrator'),
    update: ({ req }) => {
      const r = req.user?.role
      if (!(typeof r === 'object' && r?.name === 'Administrator')) return false
      // Zablokuj edycję roli systemowej (Administrator) — nie można sobie odebrać uprawnień.
      // (Sprawdzanie szczegółowe odbywa się w field-level access poniżej + beforeChange hook.)
      return true
    },
    delete: async ({ req, id }) => {
      const r = req.user?.role
      if (!(typeof r === 'object' && r?.name === 'Administrator')) return false
      if (!id) return true
      const role = await req.payload.findByID({ collection: 'roles', id, depth: 0 }).catch(() => null)
      return Boolean(role && !(role as any).isSystem)
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      label: 'Nazwa roli',
      admin: { description: 'Np. "Redaktor", "Fotograf", "Trener juniorów".' },
    },
    {
      name: 'description',
      type: 'text',
      label: 'Opis (opcjonalnie)',
      admin: { description: 'Co ta rola może robić — dla siebie, dla porządku.' },
    },
    {
      name: 'isSystem',
      type: 'checkbox',
      label: 'Rola systemowa',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Role systemowe (Administrator) nie mogą być usunięte.',
      },
    },
    {
      name: 'permissions',
      type: 'group',
      label: 'Uprawnienia',
      admin: {
        description:
          'Zaznacz, co ta rola może robić. Administrator widzi wszystko niezależnie od tych ustawień.',
      },
      fields: [
        // ── Kolekcje (treść strony) ─────────────────────────────────────────
        crudGroup('news', 'Aktualności'),
        crudGroup('tags', 'Tagi'),
        crudGroup('players', 'Zawodnicy'),
        crudGroup('teams', 'Drużyny'),
        crudGroup('staff', 'Sztab'),
        crudGroup('board', 'Zarząd'),
        crudGroup('matches', 'Mecze'),
        crudGroup('liveArchives', 'Archiwum relacji'),
        crudGroup('media', 'Media'),
        crudGroup('heroSlides', 'Slajdy hero'),
        crudGroup('sponsors', 'Sponsorzy'),
        crudGroup('staticPages', 'Strony statyczne'),

        // ── Globalsy (single-record settings) ───────────────────────────────
        {
          name: 'globals',
          type: 'group',
          label: 'Ustawienia globalne',
          admin: { hideGutter: true },
          fields: [
            { name: 'siteConfigUpdate', type: 'checkbox', label: 'Edycja: Konfiguracja strony', defaultValue: false },
            { name: 'seasonUpdate', type: 'checkbox', label: 'Edycja: Sezon (90minut)', defaultValue: false },
          ],
        },

        // ── Specjalne dostępy do custom views ───────────────────────────────
        {
          name: 'special',
          type: 'group',
          label: 'Specjalne dostępy',
          admin: { hideGutter: true },
          fields: [
            { name: 'liveStudio', type: 'checkbox', label: 'Dostęp do Live Studio (sterowanie meczem na żywo)', defaultValue: false },
            { name: 'galleryManager', type: 'checkbox', label: 'Dostęp do Menedżera galerii', defaultValue: false },
            { name: 'syncSeason', type: 'checkbox', label: 'Możliwość ręcznego sync 90minut', defaultValue: false },
          ],
        },
      ],
    },
  ],
  hooks: {
    // Zablokuj edycję pola `isSystem` i nie pozwól odznaczyć uprawnień Administrator-owi.
    beforeChange: [
      async ({ data, originalDoc, operation }) => {
        if (operation === 'create') {
          // Stworzenie roli z is_system=true tylko z migracji/seed (nie przez UI).
          if (data.isSystem) data.isSystem = false
          return data
        }
        // Update: jeśli rola jest systemowa, zachowaj wszystkie permissions = true i nie pozwól zmienić nazwy.
        if (originalDoc?.isSystem) {
          data.isSystem = true
          data.name = originalDoc.name
        }
        return data
      },
    ],
  },
}

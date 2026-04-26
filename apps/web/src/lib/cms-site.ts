import { CONTACT, NAV, SITE, SOCIAL } from '@/config/site'
import type { SiteConfig as SiteConfigDoc } from '@wks/shared'

const CMS_URL: string =
  import.meta.env.CMS_URL || import.meta.env.PUBLIC_CMS_URL || 'http://localhost:3000'

const FETCH_TIMEOUT_MS = 2500

export type SiteConfig = {
  site: {
    name: string
    shortName: string
    tagline: string
    description: string
    url: string
    language: string
    founded: number
    reactivated: number
    league: string
    city: string
    region: string
    defaultOgImage: string
  }
  nav: { label: string; href: string }[]
  contact: typeof CONTACT
  social: typeof SOCIAL
}

function fromLocal(): SiteConfig {
  return {
    site: {
      name: SITE.name,
      shortName: SITE.shortName,
      tagline: SITE.tagline,
      description: SITE.description,
      url: SITE.url,
      language: SITE.language,
      founded: SITE.founded,
      reactivated: SITE.reactivated,
      league: SITE.league,
      city: SITE.city,
      region: SITE.region,
      defaultOgImage: SITE.defaultOgImage,
    },
    nav: NAV,
    contact: CONTACT,
    social: SOCIAL,
  }
}

function adapt(doc: SiteConfigDoc): SiteConfig {
  const local = fromLocal()
  return {
    site: {
      name: doc.site?.name ?? local.site.name,
      shortName: doc.site?.shortName ?? local.site.shortName,
      tagline: doc.site?.tagline ?? local.site.tagline,
      description: doc.site?.description ?? local.site.description,
      url: doc.site?.url ?? local.site.url,
      language: doc.site?.language ?? local.site.language,
      founded: doc.site?.founded ?? local.site.founded,
      reactivated: doc.site?.reactivated ?? local.site.reactivated,
      league: doc.site?.league ?? local.site.league,
      city: doc.site?.city ?? local.site.city,
      region: doc.site?.region ?? local.site.region,
      defaultOgImage: doc.site?.defaultOgImage ?? local.site.defaultOgImage,
    },
    nav:
      Array.isArray(doc.nav) && doc.nav.length > 0
        ? doc.nav
            .map((n) => ({ label: n.label ?? '', href: n.href ?? '' }))
            .filter((n) => n.label.length > 0 && n.href.length > 0)
        : local.nav,
    contact: {
      email: doc.contact?.email ?? local.contact.email,
      phone: doc.contact?.phone ?? local.contact.phone,
      address: {
        street: doc.contact?.address?.street ?? local.contact.address.street,
        postalCode: doc.contact?.address?.postalCode ?? local.contact.address.postalCode,
        city: doc.contact?.address?.city ?? local.contact.address.city,
        country: doc.contact?.address?.country ?? local.contact.address.country,
      },
      officeAddress: {
        street: doc.contact?.officeAddress?.street ?? local.contact.officeAddress.street,
        postalCode: doc.contact?.officeAddress?.postalCode ?? local.contact.officeAddress.postalCode,
        city: doc.contact?.officeAddress?.city ?? local.contact.officeAddress.city,
      },
      googleMapsEmbedSrc: doc.contact?.googleMapsEmbedSrc ?? local.contact.googleMapsEmbedSrc,
      googleMapsLink: doc.contact?.googleMapsLink ?? local.contact.googleMapsLink,
    },
    social: {
      facebook: doc.social?.facebook ?? local.social.facebook,
      facebookAlt: doc.social?.facebookAlt ?? local.social.facebookAlt,
      instagram: doc.social?.instagram ?? local.social.instagram,
      youtube: doc.social?.youtube ?? local.social.youtube,
      tiktok: doc.social?.tiktok ?? local.social.tiktok,
      facebookFollowers: doc.social?.facebookFollowers ?? local.social.facebookFollowers,
    },
  }
}

let cached: Promise<SiteConfig> | null = null

export async function fetchSiteConfig(): Promise<SiteConfig> {
  if (cached) return await cached

  cached = (async () => {
    const url = new URL('/api/globals/siteConfig', CMS_URL)
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { global?: SiteConfigDoc }
      if (!json.global) return fromLocal()
      return adapt(json.global)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[cms] siteConfig niedostępny (${CMS_URL}): ${msg} — fallback do site.ts`)
      return fromLocal()
    }
  })()

  return await cached
}


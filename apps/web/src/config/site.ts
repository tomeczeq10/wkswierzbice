/**
 * Centralna konfiguracja klubu WKS Wierzbice.
 * Dane zebrane z 90minut.pl, regiowyniki.pl, dolfutbol.pl, transfermarkt.pl
 * oraz publicznych komunikatów klubu. Po potwierdzeniu/korekcie przez prezesa
 * wystarczy podmienić wartości w tym pliku - cała strona zaktualizuje się automatycznie.
 */

export const SITE = {
  name: "Wiejski Klub Sportowy Wierzbice",
  shortName: "WKS Wierzbice",
  tagline: "Zielono-biało-czerwoni z Wierzbic – duma gminy Kobierzyce",
  description:
    "Oficjalna strona WKS Wierzbice. Aktualności, terminarz i wyniki, kadra, historia klubu, nabory i kontakt.",
  url: "https://wkswierzbice.pl",
  language: "pl-PL",
  founded: 1985,
  reactivated: 2001,
  league: "Klasa okręgowa 2025/2026, grupa Wrocław",
  city: "Wierzbice",
  region: "gmina Kobierzyce, powiat wrocławski, woj. dolnośląskie",
  defaultOgImage: "/og-default.svg",
} as const;

export const CONTACT = {
  email: "klub@wkswierzbice.pl",
  phone: "+48 501 596 400",
  /** Adres stadionu klubowego – wyświetlany jako główny adres. */
  address: {
    street: "ul. Tarnopolska 21",
    postalCode: "55-040",
    city: "Wierzbice",
    country: "Polska",
  },
  /** Adres korespondencyjny / biura zarządu. */
  officeAddress: {
    street: "ul. Lipowa 12a",
    postalCode: "55-040",
    city: "Wierzbice (gm. Kobierzyce)",
  },
  googleMapsEmbedSrc:
    "https://www.google.com/maps?q=Boisko+WKS+Wierzbice,+Tarnopolska+21,+55-040+Wierzbice&output=embed",
  googleMapsLink:
    "https://www.google.com/maps?q=Boisko+WKS+Wierzbice,+Tarnopolska+21,+55-040+Wierzbice",
} as const;

export const SOCIAL = {
  facebook: "https://www.facebook.com/WKSWIERZBICEOFFICIAL",
  facebookAlt: "https://www.facebook.com/wkswierzbice/",
  instagram: "",
  youtube: "",
  tiktok: "",
  /** Dane z publicznego Open Graph fanpage'a (kwiecień 2026). */
  facebookFollowers: 1811,
} as const;

/**
 * Linki do profilu klubu w serwisach statystycznych i informacyjnych.
 * WKS Wierzbice nie ma embedu z laczynaspilka.pl – podstawowe dane czerpiemy z 90minut.pl.
 */
export const STATS = {
  ninetyMinutProfile:
    "http://www.90minut.pl/skarb.php?id_klub=8677&id_sezon=107",
  ninetyMinutLeague: "http://www.90minut.pl/liga/1/liga14275.html",
  ninetyMinutMatches:
    "http://www.90minut.pl/mecze_druzyna.php?id=8677&id_sezon=107",
  ninetyMinutCup: "http://www.90minut.pl/liga/1/liga14467.html",
  transfermarkt:
    "https://www.transfermarkt.pl/wks-wierzbice/startseite/verein/81197",
  regiowyniki:
    "https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/WKS_Wierzbice/kadra/",
  dolfutbolTag: "https://dolfutbol.pl/tag/wks-wierzbice/",
} as const;

/**
 * Główne pozycje nawigacji (Header/Footer).
 */
export const NAV: { label: string; href: string }[] = [
  { label: "Aktualności", href: "/aktualnosci" },
  { label: "Drużyny", href: "/druzyny" },
  { label: "Terminarz", href: "/terminarz" },
  { label: "Tabela", href: "/tabela" },
  { label: "Galeria", href: "/galeria" },
  { label: "Sponsorzy", href: "/sponsorzy" },
  { label: "Nabory", href: "/nabory" },
  { label: "O klubie", href: "/o-klubie" },
  { label: "Kontakt", href: "/kontakt" },
];

/**
 * Aktualny sztab szkoleniowy pierwszej drużyny (od 22 października 2025 r.).
 */
export const STAFF: {
  name: string;
  role: string;
  bio?: string;
  photo?: string;
}[] = [
  {
    name: "Dawid Pożarycki",
    role: "Pierwszy trener",
    photo: "/team/trenerzy/dawid-pozarycki.jpg",
    bio: "Młody, ale doświadczony szkoleniowiec. W CV prowadzenie takich drużyn jak Burza Bystrzyca oraz IV-ligowy Moto-Jelcz Oława.",
  },
  {
    name: "Mateusz Rycombel",
    role: "Drugi trener",
    photo: "/team/trenerzy/mateusz-rycombel.jpg",
    bio: "Postać dobrze znana wierzbickiej publiczności. Równolegle prowadzi Olympic Wrocław U17 w walce o awans do Centralnej Ligi Juniorów.",
  },
];

/**
 * Zarząd klubu – sekcja „O klubie”.
 * Skład powołany 8 lipca 2025 r. po śmierci wieloletniego prezesa
 * śp. Bogdana Zdunka (2001–2025).
 * Źródło: oficjalny post WKS Wierzbice na Facebooku z 8.07.2025.
 */
export const BOARD: {
  name: string;
  role: string;
  highlight?: boolean;
  bio?: string;
  photo?: string;
}[] = [
  {
    name: "Robert Sala",
    role: "Prezes Zarządu",
    highlight: true,
    photo: "/team/zarzad/robert-sala.jpg",
    bio: "Przejął kierownictwo klubu z zamiarem dalszego rozwoju i profesjonalizacji działalności sportowej. Kontynuuje dzieło śp. Bogdana Zdunka – człowieka, który od 2001 roku odbudował klub i wprowadził go do czołówki amatorskich zespołów okręgu wrocławskiego.",
  },
  {
    name: "Łukasz Majerski",
    role: "Wiceprezes",
    photo: "/team/zarzad/lukasz-majerski.jpg",
  },
  {
    name: "Rafał Zdunek",
    role: "Wiceprezes",
    photo: "/team/zarzad/rafal-zdunek.jpg",
  },
  {
    name: "Marek Posadowski",
    role: "Wiceprezes",
    photo: "/team/zarzad/marek-posadowski.jpg",
  },
  {
    name: "Dariusz Sala",
    role: "Skarbnik / sekretarz",
    photo: "/team/zarzad/dariusz-sala.jpg",
  },
  {
    name: "Wojciech Czapla",
    role: "Skarbnik / sekretarz",
    photo: "/team/zarzad/wojciech-czapla.jpg",
  },
];

/**
 * Najważniejsze statystyki i osiągnięcia – do wykorzystania na stronie głównej / O klubie.
 */
export const HIGHLIGHTS = {
  currentPosition: "2. miejsce (wicelider)",
  currentPositionSeason: "Klasa okręgowa 2025/2026, grupa Wrocław – runda wiosenna",
  topScorerName: "Alefe Lima",
  topScorerGoals: 43,
  topScorerSeason: "2024/2025",
  bestPromotion: "IV liga dolnośląska",
  bestPromotionSeason: "2021/2022",
} as const;

/**
 * Sponsorzy / partnerzy.
 * `logo` to ścieżka względem `public/` (np. "/sponsors/firma.svg").
 * UWAGA: do uzupełnienia przez klub - poniżej placeholdery.
 */
export const SPONSORS: {
  name: string;
  logo: string;
  url: string;
  tier: "strategiczny" | "glowny" | "wspierajacy";
}[] = [
  {
    name: "Gmina Kobierzyce",
    logo: "/sponsors/placeholder-1.svg",
    url: "https://ugk.pl",
    tier: "strategiczny",
  },
  {
    name: "ABM System sp. z o.o.",
    logo: "/sponsors/placeholder-2.svg",
    url: "https://example.com",
    tier: "glowny",
  },
  {
    name: "Zielona Dolina – centrum ogrodnicze",
    logo: "/sponsors/placeholder-3.svg",
    url: "https://example.com",
    tier: "glowny",
  },
  {
    name: "Piekarnia Wierzbicka",
    logo: "/sponsors/placeholder-4.svg",
    url: "https://example.com",
    tier: "wspierajacy",
  },
  {
    name: "Autoserwis Dolny Śląsk",
    logo: "/sponsors/placeholder-5.svg",
    url: "https://example.com",
    tier: "wspierajacy",
  },
  {
    name: "Cafe Tarnopolska",
    logo: "/sponsors/placeholder-6.svg",
    url: "https://example.com",
    tier: "wspierajacy",
  },
];

/**
 * Zdjęcia do galerii. `src` w `public/` - np. /gallery/mecz-01.jpg.
 * Na razie placeholdery - podmienimy po otrzymaniu zdjęć z fanpage'a klubu.
 */
/**
 * Slajdy karuzeli na stronie głównej.
 * Dodaj zdjęcia z meczów/treningów jako kolejne elementy tablicy.
 */
export const HERO_SLIDES: { image: string; kicker?: string; title?: string; subtitle?: string }[] = [
  {
    image: "/hero/placeholder-hero.svg",
    kicker: "Klasa okręgowa 2025/2026",
    title: "WKS Wierzbice",
    subtitle: "Zielono-biało-czerwoni z Wierzbic – duma gminy Kobierzyce",
  },
  {
    image: "/hero/placeholder-hero.svg",
    kicker: "Wicelider sezonu",
    title: "Walczymy o awans",
    subtitle: "2. miejsce · 50 punktów · 73 strzelone gole",
  },
  {
    image: "/hero/placeholder-hero.svg",
    kicker: "Akademia Młodych",
    title: "Nabory do wszystkich grup",
    subtitle: "Żaki, Orliki, Trampkarze, Juniorzy – przyjdź na bezpłatny trening",
  },
];

export const GALLERY: { src: string; alt: string }[] = [
  { src: "/gallery/placeholder-1.svg", alt: "Drużyna WKS Wierzbice" },
  { src: "/gallery/placeholder-2.svg", alt: "Akcja meczowa" },
  { src: "/gallery/placeholder-3.svg", alt: "Trening juniorów" },
  { src: "/gallery/placeholder-4.svg", alt: "Kibice na trybunach" },
  { src: "/gallery/placeholder-5.svg", alt: "Boisko przy ul. Tarnopolskiej" },
  { src: "/gallery/placeholder-6.svg", alt: "Awans do IV ligi 2021/2022" },
  { src: "/gallery/placeholder-7.svg", alt: "Sztab trenerski" },
  { src: "/gallery/placeholder-8.svg", alt: "Mecz w Wierzbicach" },
];

/**
 * Endpoint formularza (Formspree / Web3Forms / własny backend).
 * Dopóki pusty – formularze pokazują komunikat instalacyjny zamiast wysyłać dane.
 */
export const FORMS = {
  contactEndpoint: "",
  joinEndpoint: "",
} as const;

# Oferta dla zarządu WKS Wierzbice — strategia dwutorowa

> Dokument planistyczny przed spotkaniem z zarządem klubu.
> Służy jako „pamięć projektu" — założenia Tomka + otwarte pytania, które trzeba
> domknąć zanim cokolwiek ruszymy kodowo.
>
> **Ostatnia aktualizacja:** 2026-04-21 (po drugiej rundzie decyzji Tomka)
> **Spotkanie z zarządem:** jutro lub sobota (21-22 kwietnia 2026)
> **Tryb pracy:** TEORIA — żadnego kodowania dopóki nie zapadnie decyzja.

---

## Kontekst strategiczny

Projekt dotychczas był prowadzony jako demo/MVP. Na spotkaniu z zarządem klubu
Tomek zaproponuje **dwa warianty** produktu do wyboru:

- **Wariant 1 – tanszy:** strona statyczna bez możliwości edycji przez użytkownika
- **Wariant 2 – droższy:** strona + backend z CMS-em (role, edycja treści, upload)

Zdecyduje zarząd. Dopóki nie zdecyduje — nie kodujemy ani linijki wariantu 2.

---

## Założenia (od Tomka)

### Wariant 1 — strona statyczna, fixed

- Bez panelu edycji, bez logowania, bez backendu.
- Ustalamy raz co ma być, „dopinamy wszystko na jeden guzik", przekazujemy.
- Po przekazaniu — „nic mnie już nie obchodzi". Nikt z poziomu WEB nie edytuje.
- Projekt jest **prawie skończony** (to ten co siedzi teraz w tym repo).
- Przed spotkaniem Tomek chce mieć **3 szaty graficzne (design themes)** żeby
  klub mógł wybrać która im pasuje.

### Wariant 2 — strona + CMS

- Użytkownicy z uprawnieniami (admin / redaktor / ew. więcej).
- Dodawanie aktualności, zdjęć, zawodników, edycja treści.
- **Osobny folder / osobne repo** na komputerze Tomka — traktowane jako nowy projekt.
- Będzie to **kopia obecnej strony + backend**.
- Stack CMS-a: **nie zdecydowano** (wstępnie rozważane: self-hosted Payload CMS,
  Astro SSR + własny admin, Laravel + Filament + Astro — szczegóły w
  [`docs/STATE.md`](STATE.md)).

### Wspólne założenia

- Strona jest **produktem sprzedawanym klubowi**, nie darmowym wkładem.
- Utrzymanie długoterminowo — klub z okazjonalnym wsparciem Tomka.
- Hosting produkcyjny: jeśli klub kupi stronę — **kupią sobie hosting/VPS**
  (obecny tmielczarek.pl to serwer domowy Tomka, tymczasowy).

---

## Obserwacje i ostrzeżenia (od Claude'a)

Rzeczy, które warto wypowiedzieć wprost zanim Tomek usiądzie do stołu z zarządem:

### 1. Brak opcji środkowej może powodować paraliż decyzyjny
Zarząd klubu amatorskiego łatwo utyka między „za mało" a „za drogo".
**Ewentualna opcja 3 (hybryda):** wariant 1 + roczny abonament na ręczne
aktualizacje („raz w miesiącu wrzucam aktualności które mi prześlecie").
Nie CMS, ale też nie „statyka bez życia".

### 2. „Bez możliwości edycji" jest ryzykowne dla relacji
Po miesiącu przyjdzie mail „a czy możecie dodać dwa zdjęcia i wynik meczu?".
- „Nie, kupiliście wariant bez edycji" — niezręcznie.
- „Ok, jednorazowo" — właśnie stałeś się darmowym CMS-em na stałe.

**Rozwiązanie:** spisz w ofercie co jest / nie jest w scope PO przekazaniu (np.
„30 dni wsparcia poprawkowego, ZERO aktualizacji treści" albo „5 zmian treści
w cenie, kolejne 50 zł za zmianę").

### 3. „Nic mnie nie obchodzi" wymaga technicznego domknięcia
Jeśli Tomek po przekazaniu ma być poza pętlą, trzeba explicit ustalić:
- Czy klub dostaje **dostęp do repo** (GitHub / dysk)?
- Czy dostaje **backup** buildowanej strony (zip `dist/`)?
- Hosting — zostaje na tmielczarek.pl (serwer Tomka) czy klub kupuje własny
  w dniu przekazania?
- Jak długo trwa „gwarancja" / wsparcie poprawkowe (0 dni / 30 dni / dłużej)?

---

## Decyzje Tomka (runda 1 + 2 — 2026-04-21)

Odpowiedzi z formularzy. To **nie są decyzje klubu** — to decyzje Tomka,
które pójdą na spotkanie jako gotowa propozycja.

### 🔴 Wariant 1 — strona statyczna

**Q1. Szaty graficzne (3 warianty).**
→ Tomek podesłał 4 referencje:
- [Śląsk Wrocław](https://www.slaskwroclaw.pl) (klasyczny ekstraklasa, te same kolory
  zielony/biały/czerwony jak WKS — `slaskwroclaw.pl` nie załadował się w Web
  Fetch podczas analizy, do ponownego sprawdzenia)
- [Lech Poznań](https://www.lechpoznan.pl)
- [Legia Warszawa](https://legia.com/pilka-nozna)
- [Wisła Kraków](https://wislakrakow.com/)

**Ustalenia:**
- **Kolory zostają** (zielony/biały/czerwony od Śląska) — nie zmieniamy.
- **Zmienia się struktura/layout** — pozycjonowanie, menu, układ sekcji.
- **3 propozycje szat** (różnice strukturalne, ta sama paleta):

### Szata A — „Klubowa klasyka" (inspiracja Lech Poznań)
- Sticky top nav (6 pozycji), herb po lewej, social po prawej.
- **Hero = „Następny mecz"** z datą, countdownem, CTA.
- News grid 3-kolumnowy z tagami kategorii.
- Drużyny jako kafle 5-kolumnowe na home.
- Sponsorzy w tierach w stopce.
- **Charakter:** profesjonalny, „ekstraklasowy".
- **Praca nad wdrożeniem:** ok. 8h (najbliżej obecnego stanu).

### Szata B — „Magazyn klubowy" (inspiracja Legia)
- Top nav minimalistyczny (4 pozycje + hamburger).
- **Hero = featured news** (jeden duży artykuł jak okładka magazynu).
- 3 karty info pod hero: „Następny mecz / Ostatni wynik / Pozycja w tabeli".
- News w układzie asymetrycznym (1 duży + 4 małe).
- Drużyny jako szerokie pasy (nie kafle).
- **Charakter:** redakcyjny, magazynowy, treść-centric.
- **Praca:** ok. 12h. Świetne dla klubu z bogatym fanpage (24 news z FB).

### Szata C — „Dumna marka" (inspiracja Wisła + elementy Lecha)
- Top nav bardzo zwarty, duży herb, 4 pozycje + hamburger.
- **Hero = full-bleed slider** z hasłami brandowymi.
- Sekcja „Dlaczego WKS Wierzbice" (3 kolumny: Tradycja / Społeczność / Sport).
- News w carouselu.
- Drużyny jako wysokie karty portretowe (9:16, plakatowo).
- **CTA rekrutacyjny w hero** (bardziej widoczne „Dołącz do nas").
- **Charakter:** brandowy, minimalistyczny.
- **Praca:** ok. 16h (najdalej od obecnego stanu).

**Obserwacja z analizy referencji:**
- Wisła Kraków to w zasadzie e-commerce (Shopify-like) — **nie pasuje dla
  WKS** (brak sklepu, brak fanshopu do sprzedaży). Wzięliśmy z niej tylko
  element „duży herb + zwarty nav".
- Lech i Legia to dwa różne modele: „informacyjny poważny" vs. „redakcyjny
  magazynowy". Obie dobre dla klubu sportowego.
- Dla amatorskiego klubu gminnego najważniejsza decyzja: **hero = mecz
  (Szata A)** czy **hero = news (Szata B)** czy **hero = marka (Szata C)**.

**TODO:**
- Tomek decyduje, która szata preferowana (lub czy robimy wszystkie 3 na
  spotkanie jako „wybór zarządu").
- Claude wraca do Śląska Wrocław — w następnej sesji, Browser MCP lub
  ponowny WebFetch. Jeśli coś charakterystycznego znajdzie się tam, dodamy
  jako 4. alternatywę lub zmodyfikujemy jedną z 3.

**Q2. Co klub dostaje przy przekazaniu wariantu 1.**
→ **Tylko dostęp do hostingu docelowego** (klub kupuje własny, Tomek pomaga go
ustawić). Bez repo, bez zipa `dist/`, bez instrukcji „jak zbudować".
- Uzasadnienie: klub nie ma kogo ani po co wdrażać w build pipeline;
  jeśli kiedyś będą chcieli zmiany — dzwonią do Tomka.
- **Ryzyko:** jeśli kiedyś relacja się popsuje albo Tomek przestanie działać,
  klub nie ma jak samodzielnie odzyskać kodu. Warto rozważyć zdeponowany zip
  w sejfie/u prawnika, albo dopisać w ofercie klauzulę „kod zostanie przekazany
  na żądanie".

**Q3. Treści demo.**
→ **Klub dostarcza realne dane, Tomek podmienia przed przekazaniem
(wliczone w cenę).** Chodzi o: składy drużyn młodzieżowych, prawdziwe imiona
trenerów, realne nazwy sponsorów, zdjęcia.
- Praktyka: lista „co potrzebujemy od was" pójdzie do klubu wraz z podpisaniem
  umowy. Bez tych danych nie startujemy finalizacji.

**Q4. Wsparcie po przekazaniu.**
→ **Dożywotnio, bo rodzina** (tesť jest prezesem). Cena obejmuje tylko
wdrożenie; drobne poprawki i aktualizacje treści Tomek będzie robił z doskoku.
- **Ostrzeżenie (Claude):** warto mieć to zapisane osobno (np. krótki mail
  „zgadzamy się że wsparcie jest dobrą wolą, nie obietnicą umowną"), żeby
  uniknąć sytuacji „umawialiśmy się że pomagasz zawsze" za 3 lata.
- Granica „rozsądku" nie jest zdefiniowana — to akceptowalne przy rodzinnej
  relacji, ale warto mieć prywatnie w głowie co to znaczy (np. 2h/mies. OK,
  przepisywanie połowy strony NIE).

### 🟡 Wariant 2 — CMS

**Q5. Encje edytowalne w CMS.**
→ **Bardzo szeroki scope:** aktualności, drużyny ze składami, zarząd, sponsorzy,
galeria, site config, statyczne podstrony, wyniki/terminarz.
- Pomijamy tylko: hero slides (na razie).
- **To jest duży CMS.** Realny czas pracy to prawdopodobnie 120–200h, nie 40–60h.
- Lista encji = lista modeli w bazie + panel admina dla każdej + API + uprawnienia.

**Q6. Role uprawnień.**
→ **3 role: Admin + Redaktor + Trener (edytuje tylko swoją drużynę/skład).**
- Implementacyjnie: trener jest przypisany do rekordu drużyny; autoryzacja
  sprawdza `trainer.team_id === request.team_id`.
- Dodaje ok. 15–20h pracy nad modelem uprawnień.

**Q7. Dane z 90minut.pl.**
→ **Hybryda** — automatycznie raz dziennie (cron) + przycisk „odśwież teraz"
w panelu admina.
- Wymaga: serwer potrafi uruchomić cron (VPS, nie prosty shared hosting).
- Jeśli przycisk ma być „tu i teraz" — sync musi być async, żeby admin nie
  czekał 30s na response.

**Q8. Upload zdjęć.**
→ **Na dysk serwera** (bez object storage, bez auto-optymalizacji na razie).
- **Sugestia Claude'a do przemyślenia:** włączenie podstawowej optymalizacji
  (resize do max 1600px + konwersja do WebP przy uploadzie) kosztuje ~3h pracy,
  a strona będzie szybsza i dysk serwera mniej zapchany. Warto to dorzucić.
- Decyzja ostateczna: zostaje „na dysk", optymalizacja jako nice-to-have.

### 🟡 Infrastruktura wariantu 2

**Q9. Backup bazy.**
→ **Automatyczny cron na zewnętrzny storage** (np. Backblaze B2 / S3), płatny
raz przy setupie.
- Koszt operacyjny: ~1–5 zł/mies. za storage.
- Retention: domyślnie 30 dni (do ustalenia).

**Q10. Hosting wariantu 2.**
→ **VPS** (ok. 20–40 PLN/mies., np. OVH SSD / Hetzner).
- Klub kupuje, Tomek setupuje. Tomek ma root access (rodzinnie, nie formalnie).
- **Konsekwencja:** wariant 2 NIE sprzeda się jako „dasz nam kod, my ogarniemy"
  — klub nie jest w stanie utrzymać VPS-a, Tomek jest stałym elementem.

**Q11. Support dla wariantu 2.**
→ **Tak samo jak wariant 1 — rodzinnie.** Tomek kasuje za wdrożenie, pomaga
zawsze z granicami rozsądku.
- Warto mieć to skalibrowane z Q4 (żeby nie obiecywać sprzeczności).

### 🟢 Wspólne / spotkanie

**Q12. Wycena.**
→ **Stała cena za każdy wariant** (fixed, fixed).
- Wariant 1 = X zł, wariant 2 = Y zł (liczby w Q14).
- **Ryzyko scope creep:** klub może dorzucać „a dodajmy jeszcze…" w trakcie.
  Mitygacja: umowa z załącznikiem „co jest w cenie, co nie" — w razie spięć
  Tomek pokazuje tabelkę, a nie kłóci się z pamięci.

### 🟢 Spotkanie i cennik

**Q13. Materiały na spotkanie.**
→ **Prezentacja multimedialna** + live demo wariantu 1 + 3 szaty graficzne +
mockup panelu CMS wariantu 2 + jednostronicowe PDF porównujące warianty +
checklist „co potrzebujemy od was" (realne składy, zdjęcia, sponsorzy) do
wręczenia zarządowi.
- Prezentacja ma pokazać **co już jest zrobione** (live na laptopie) + **co jest
  w planie na wariant 2** (mockupy, wizja przyszłości).
- **Bez animacji** — statyczne slajdy. Zaakceptowany format: HTML
  `reveal.js` (pojedynczy plik, działa offline w przeglądarce, strzałki
  przełączają slajdy) albo PDF. Oba statyczne, kolorystycznie w zieleniach/
  czerwieniach WKS.

**Proponowana struktura (11 slajdów):**
1. Okładka — herb + tytuł + Twoje imię
2. Dlaczego teraz? — 3 bullety (rozwój klubu, FB ≠ strona, pro kanał)
3. Co już jest zrobione — screenshot + QR do `wkswierzbice.pl`
4. Co zawiera wersja podstawowa — aktualności, drużyny, terminarz,
   galeria, kontakt, historia
5. 3 propozycje wyglądu — miniaturki Szat A/B/C (z Q1)
6. **Wariant 1 — „Gotowe i działa"** — scope, cena 2 000 – 4 000 PLN,
   termin 2–3 tygodnie
7. **Wariant 2 — „Z panelem zarządzania"** — scope (8 encji, 3 role,
   upload, cron 90minut), cena 5 000 – 10 000 PLN, termin 3–4 miesiące
8. Co potrzebujemy od was — checklist realnych danych
9. Wsparcie po wdrożeniu — szczerze, co jest „w cenie" (rodzinna formuła)
10. Harmonogram — timeline od podpisania do przekazania
11. Pytania i kontakt — email/telefon, „decyzja bez pośpiechu"

- Nie bierzemy: osobnego pisemnego cennika (wchłania go PDF + slajdy 6-7),
  przykładów stron innych klubów jako osobnego materiału (wchłaniają je
  szaty z Q1 na slajdzie 5).
- **TODO Claude:** wygenerować szkielet prezentacji (HTML reveal.js lub
  PDF) po akceptacji struktury powyżej.

**Q14. Widełki cenowe.**
→ **Wariant 1: 2 000 – 4 000 PLN.** Rozsądnie dla amatorskiego klubu,
szablon i tak już prawie gotowy, podmiana danych + finalizacja szaty mieści
się w tych godzinach. Rabat rodzinny wliczony.
→ **Wariant 2: 5 000 – 10 000 PLN.** **🔴 UWAGA — to jest znacznie poniżej
realnej pracochłonności.** Przy scope z Q5–Q11 (8 encji × 3 role × cron
90minut × backup × VPS setup) realny estymat to 120–200h. 10 000 PLN / 150h
= ok. 67 PLN/godz. Nawet z rabatem rodzinnym to jest „robota za darmo
plus pizza".
- Przed spotkaniem warto sobie odpowiedzieć: **czy to ma być realne
  zlecenie, czy prezent dla rodziny?** Oba OK, ale trzeba wiedzieć które.
- Jeśli realne zlecenie — widełki Q14b są niezdrowe, warto podnieść do
  12–18k albo ściąć scope wariantu 2.
- Jeśli prezent — OK, ale świadomie; wtedy nie traktuj tego jako „zarobek
  z projektu", tylko jako „zainwestowany czas w klub teścia".

**Q15. Deadline dla klubu.**
→ **Bez sztywnego deadline'u** — relacja rodzinna, „i tak się zadzieje".
- **Ryzyko:** bez deadline'u klub może odsunąć decyzję na miesiące,
  a Tomek nie wie czy kodować wariant 2, czy siedzieć na rękach.
- **Mitygacja:** nieformalny deadline w głowie (np. „jeśli do końca maja
  nie ma decyzji, traktuję to jako 'wariant 1, gotowe, bez wariantu 2'")
  zamiast pisanego.

**Q16. Co jeśli klub chce taniej.**
→ **Kombinacja: raty + symboliczny rabat, bez cięcia scope.**
- Przykład: zamiast 8 000 PLN naraz → 8 000 PLN w 4 ratach po 2 000 PLN
  przez 4 miesiące, ewentualnie z „rodzinnym" rabatem 500–1 000 PLN na
  end-price.
- **Uwaga:** przy dolnej granicy Q14b (5 000 PLN za wariant 2) już nie ma
  z czego ciąć. Jeśli klub chce jeszcze taniej — to już nie jest „rabat",
  to jest „praca charytatywna". Warto mieć to zwerbalizowane.

---

## TODO przed spotkaniem

- [x] Runda 1 decyzji Tomka (Q1–Q12).
- [x] Runda 2 decyzji Tomka (Q13–Q16).
- [ ] Tomek decyduje: wariant 2 to **zlecenie komercyjne** czy **prezent
      rodzinny**? Od tego zależy czy Q14b zostaje, czy rośnie.
- [ ] Tomek wkleja linki referencyjne do Q1 (strony innych klubów).
- [ ] Claude analizuje referencje (Browser MCP) i proponuje 3 szaty.
- [ ] Claude proponuje format i strukturę prezentacji multimedialnej
      (Q13) — slajdy, flow, „co pokazujemy live / co statycznie".
- [ ] Claude przygotowuje jednostronicowe PDF „wariant 1 vs wariant 2"
      po decyzji o ostatecznych cenach.
- [ ] Claude przygotowuje checklistę „co potrzebujemy od was" (realne
      dane) — można odpalić już teraz, bo niezależnie od scope'u.
- [ ] Live demo wariantu 1 pod `wkswierzbice.pl` — już działa.

---

## Aktualizacje po spotkaniu

_(Pusto — tu zapiszemy co wybrał klub, jaki scope, jaka cena, jaki termin.)_

---

## Powiązane dokumenty

- [`../README.md`](../README.md) — ogólny opis projektu
- [`STATE.md`](STATE.md) — aktualny stan, co jest demo
- [`../CHANGELOG.md`](../CHANGELOG.md) — chronologia zmian
- [`../CLAUDE.md`](../CLAUDE.md) — architektura i konwencje dla AI

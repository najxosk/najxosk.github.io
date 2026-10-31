# Moje výdavky

Jednoduchá webová appka na prehľad výdavkov z PDF výpisu (napr. Prima banka). Beží **iba v prehliadači** – výpis sa nikam neodosiela.

- Otvor `index.html` cez ľubovoľný statický server (funguje aj v podpriečinku, cesty sú relatívne). Bez buildu, bez internetu.
- PDF číta pribalená knižnica pdf.js 4.10.38 (legacy build) vo `vendor/pdfjs/` (Apache-2.0).
- Prísna Content-Security-Policy: `default-src 'self'; connect-src 'none'` – appka nemôže nič odoslať.
- localStorage ukladá iba pravidlá kategórií a nastavenia. Pohyby len ak zapneš „Zapamätaj si aj pohyby v tomto prehliadači“.

## ⚠️ Súkromie
**Do repozitára sa NIKDY nesmú dostať skutočné výpisy ani dáta.** `.gitignore` ignoruje `*.pdf` a `*.csv`; výnimkou sú iba falošné súbory `tests/fake_*`.

## Testy
- `python3 tests/make_fixtures.py` – vygeneruje falošné zaheslované výpisy (heslo `test1234`, fiktívny IBAN SK00 0000 …), 3 rôzne rozloženia + CSV.
- `python3 tests/e2e_test.py` – Playwright/Chromium test (heslá, parsovanie, kategórie, pravidlá, CSV, súkromie, 0 externých požiadaviek, screenshoty do `tests/screenshots/`).

## Parser
Text z PDF sa zoskupí do riadkov podľa y-pozície a do stĺpcov podľa medzier. Dve stratégie (bloky začínajúce dátumom / jeden riadok = pohyb), vyberie sa lepšia. Znamienko: `-`/`+` pri sume, stĺpce Debet/Kredit podľa hlavičky, inak podľa slov (kredit, mzda…). Ak nič nesedí: ručné mapovanie stĺpcov, ručné pridanie riadku, CSV import a „Nahlás formát“ (čísla maskované).
Skutočné rozloženie výpisu Prima banky zatiaľ **nebolo otestované**.

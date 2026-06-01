# Online instellen (inloggen, data bewaren, vrienden)

De app werkt prima zonder dit — alles staat lokaal en gaat **niet** verloren bij
updates. Wil je inloggen, je voortgang in de cloud bewaren (op al je apparaten)
én meedoen aan de wereldwijde ranglijst? Koppel dan eenmalig een gratis
**Supabase**-project. ~10 minuten.

## Stap 1 — Project aanmaken
1. Ga naar [supabase.com](https://supabase.com) → **Start your project** (gratis).
2. New project → naam + databasewachtwoord, regio Europe. Even wachten.

## Stap 2 — Database klaarzetten
**SQL Editor → New query** → plak dit → **Run**.

```sql
-- Privé voortgang: één JSON-snapshot per gebruiker (alleen jijzelf).
create table if not exists public.player_data (
  id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Publiek mini-profiel voor de globale ranglijst (gebruikersnaam + totaal-XP).
create table if not exists public.players (
  id uuid primary key references auth.users on delete cascade,
  username text not null default 'Speler',
  total_xp int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.player_data enable row level security;
alter table public.players    enable row level security;

-- Privé voortgang: alleen van jezelf.
create policy "eigen voortgang" on public.player_data
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Mini-profiel: iedereen mag lezen (de ranglijst is openbaar, ook voor gasten);
-- schrijven mag alleen je eigen rij.
create policy "spelers lezen" on public.players
  for select using (true);
create policy "eigen speler schrijven" on public.players
  for all using (auth.uid() = id) with check (auth.uid() = id);
```

> In `players` staat bewust niets gevoeligs (alleen gebruikersnaam + totaal-XP).

**Upgrade je vanaf een oudere opzet (met week-XP en vrienden)?** Draai dit eenmalig:

```sql
alter table public.players add column if not exists total_xp int not null default 0;
drop policy if exists "spelers lezen" on public.players;
create policy "spelers lezen" on public.players for select using (true);
-- De vrienden-functie is vervallen; opruimen mag (optioneel):
drop table if exists public.friendships;
```

## Stap 3 — E-mail login aanzetten
**Authentication → Providers → Email**: aan. Voor snel testen kun je
**Confirm email** uitzetten (Authentication → Settings), dan kun je meteen na
registreren inloggen.

## Stap 4 — Sleutels in de build zetten
De app leest de Supabase-config uit **build-time env-variabelen** (Vite). Zet ze
in een `.env`-bestand in de projectroot (niet committen):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ…
```

Die twee waarden vind je in **Project Settings → API** (Project URL + anon
public key). Voor de live site (GitHub Pages) zet je ze als
**repository secrets** en geef je ze door in de deploy-workflow.

> De anon key hoort thuis in de browser; de beveiliging zit in de RLS-policies
> hierboven, niet in de geheimhouding van de key.

## Stap 5 — Gebruiken
- De app opent met een **inlogscherm**: maak een account, log in, of ga **als
  gast** verder (je voortgang blijft dan lokaal op dit apparaat).
- Ingelogd synchroniseert je voortgang automatisch (en wordt bij de eerste login
  veilig samengevoegd met wat al lokaal stond — je verliest dus nooit XP of streak).
- **Ranglijst** (onderbalk): alle spelers gerangschikt op **totaal-XP (aller
  tijden)**; je eigen rij is gemarkeerd.

## Veelgestelde vragen
- **Verlies ik mijn huidige voortgang?** Nee. Bij de eerste login wordt lokaal +
  cloud samengevoegd (hoogste XP/streak, alle voltooide lessen blijven).
- **Werkt het op meerdere apparaten?** Ja: log met hetzelfde account in; de
  snapshot wordt opgehaald en samengevoegd.
- **Updaten zonder dataverlies?** Altijd al zo — code en data staan los. Met een
  account heb je daarbovenop een cloud-back-up.

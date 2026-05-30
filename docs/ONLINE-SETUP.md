# Online instellen (inloggen, data bewaren, vrienden)

De app werkt prima zonder dit — alles staat lokaal en gaat **niet** verloren bij
updates. Wil je inloggen, je voortgang in de cloud bewaren (op al je apparaten)
én vrienden + ranglijst? Koppel dan eenmalig een gratis **Supabase**-project.
~10 minuten.

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

-- Publiek mini-profiel voor de ranglijst.
create table if not exists public.players (
  id uuid primary key references auth.users on delete cascade,
  username text not null default 'Speler',
  week_xp int not null default 0,
  week_key text,
  updated_at timestamptz not null default now()
);

-- Vriendschappen: ik (user_id) volg friend_id.
create table if not exists public.friendships (
  user_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

alter table public.player_data enable row level security;
alter table public.players    enable row level security;
alter table public.friendships enable row level security;

-- Privé voortgang: alleen van jezelf.
create policy "eigen voortgang" on public.player_data
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Mini-profiel: iedereen die ingelogd is mag lezen (nodig voor 'vriend op code'
-- en de ranglijst); schrijven alleen je eigen rij.
create policy "spelers lezen" on public.players
  for select to authenticated using (true);
create policy "eigen speler schrijven" on public.players
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Je beheert je eigen vriendschappen.
create policy "eigen vriendschappen" on public.friendships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

> In `players` staat bewust niets gevoeligs (alleen gebruikersnaam + week-XP).
> De vriendcode wordt in de app afgeleid uit je gebruikers-id, dus die hoeft niet
> opgeslagen te worden.

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
- **Instellingen → Account**: maak een account / log in. Je voortgang
  synchroniseert daarna automatisch (en wordt bij inloggen veilig samengevoegd
  met wat al lokaal stond — je verliest dus nooit XP of streak).
- **Vrienden** (onderbalk): deel je **vriendcode** (`FAU-XXXXX`), voeg vrienden
  toe op hun code, en zie de **week-XP-ranglijst**.

## Veelgestelde vragen
- **Verlies ik mijn huidige voortgang?** Nee. Bij de eerste login wordt lokaal +
  cloud samengevoegd (hoogste XP/streak, alle voltooide lessen blijven).
- **Werkt het op meerdere apparaten?** Ja: log met hetzelfde account in; de
  snapshot wordt opgehaald en samengevoegd.
- **Updaten zonder dataverlies?** Altijd al zo — code en data staan los. Met een
  account heb je daarbovenop een cloud-back-up.

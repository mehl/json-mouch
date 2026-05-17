# json-mouch

Kleines Bun-CLI-Tool, das alle Dokumente aus einer CouchDB-Datenbank liest und als JSONL exportiert.

## Setup

```bash
bun install
cp .env.example .env
```

Anschließend `.env` anpassen.

## Konfiguration (.env)

- `COUCHDB_URL` – Basis-URL deiner CouchDB (z. B. `http://127.0.0.1:5984`)
- `COUCHDB_USERNAME` – optionaler Benutzername
- `COUCHDB_PASSWORD` – optionales Passwort
- `COUCHDB_DATABASE` – Name der Datenbank
- `COUCHDB_PAGE_SIZE` – optional, Standard `500`

## Ausführen

```bash
bun run start
```

Ausgabe-Datei:

- `couch_[datenbankname].json` (JSONL, ein Dokument pro Zeile)

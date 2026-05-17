import { createWriteStream } from "node:fs";

interface CouchAllDocsResponse<T> {
  rows: Array<{
    id: string;
    key: string;
    doc?: T;
  }>;
}

interface EnvConfig {
  couchUrl: string;
  username?: string;
  password?: string;
  database: string;
  pageSize: number;
}

function readConfig(): EnvConfig {
  const couchUrl = process.env.COUCHDB_URL;
  const database = process.env.COUCHDB_DATABASE;

  if (!couchUrl) {
    throw new Error("COUCHDB_URL fehlt in der .env");
  }
  if (!database) {
    throw new Error("COUCHDB_DATABASE fehlt in der .env");
  }

  const pageSize = Number(process.env.COUCHDB_PAGE_SIZE ?? "500");
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("COUCHDB_PAGE_SIZE muss eine positive Ganzzahl sein");
  }

  return {
    couchUrl: couchUrl.replace(/\/$/, ""),
    username: process.env.COUCHDB_USERNAME,
    password: process.env.COUCHDB_PASSWORD,
    database,
    pageSize,
  };
}

function buildAuthHeader(username?: string, password?: string): HeadersInit {
  if (!username) {
    return {};
  }

  const token = Buffer.from(`${username}:${password ?? ""}`).toString("base64");
  return {
    Authorization: `Basic ${token}`,
  };
}

async function fetchDocsPage(
  config: EnvConfig,
  startkeyDocId?: string,
): Promise<CouchAllDocsResponse<Record<string, unknown>>> {
  const params = new URLSearchParams({
    include_docs: "true",
    limit: String(config.pageSize),
  });

  if (startkeyDocId) {
    params.set("startkey_docid", startkeyDocId);
  }

  const url = `${config.couchUrl}/${encodeURIComponent(config.database)}/_all_docs?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...buildAuthHeader(config.username, config.password),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fehler beim Lesen aus CouchDB (${response.status}): ${body}`);
  }

  return (await response.json()) as CouchAllDocsResponse<Record<string, unknown>>;
}

async function exportDatabaseToJsonl(config: EnvConfig): Promise<void> {
  const outputFile = `couch_${config.database}.json`;
  const writer = createWriteStream(outputFile, { encoding: "utf8" });

  let lastDocId: string | undefined;
  let total = 0;
  let firstPage = true;

  try {
    while (true) {
      const page = await fetchDocsPage(config, lastDocId);

      if (page.rows.length === 0) {
        break;
      }

      for (const [index, row] of page.rows.entries()) {
        if (!firstPage && index === 0 && row.id === lastDocId) {
          continue;
        }

        if (row.doc) {
          writer.write(`${JSON.stringify(row.doc)}\n`);
          total += 1;
        }
      }

      lastDocId = page.rows[page.rows.length - 1]?.id;
      firstPage = false;

      if (page.rows.length < config.pageSize) {
        break;
      }
    }
  } finally {
    writer.end();
  }

  console.log(`Export abgeschlossen: ${total} Dokumente -> ${outputFile}`);
}

async function main(): Promise<void> {
  const config = readConfig();
  await exportDatabaseToJsonl(config);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fehler: ${message}`);
  process.exitCode = 1;
});

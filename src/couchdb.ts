import { createWriteStream } from "node:fs";
import type { EnvConfig } from "./config";

interface CouchAllDocsResponse<T> {
  rows: Array<{
    id: string;
    key: string;
    doc?: T;
  }>;
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

export async function exportDatabaseToJsonl(config: EnvConfig): Promise<number> {
  const writer = createWriteStream(config.outputFile, { encoding: "utf8" });

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

  return total;
}

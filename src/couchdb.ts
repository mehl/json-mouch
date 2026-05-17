import { createWriteStream } from "node:fs";
import { join } from "node:path";
import Nano from "nano";
import type { CouchDbExportConfig } from "./config";

function buildConnectionUrl(config: CouchDbExportConfig): string {
  const { url, username, password } = config.connection;

  if (!username) {
    return url;
  }

  const parsedUrl = new URL(url);
  parsedUrl.username = username;
  parsedUrl.password = password ?? "";
  return parsedUrl.toString();
}

function createCouchDbClient(config: CouchDbExportConfig) {
  return Nano(buildConnectionUrl(config));
}

export async function exportDatabaseToJsonl(config: CouchDbExportConfig): Promise<number> {
  const writer = createWriteStream(join(process.cwd(), config.outputFile), { encoding: "utf8" });
  const client = createCouchDbClient(config);
  const db = client.db.use<Record<string, unknown>>(config.database);

  let lastDocId: string | undefined;
  let total = 0;
  let firstPage = true;

  try {
    while (true) {
      const page = await db.list({
        include_docs: true,
        limit: config.pageSize,
        ...(lastDocId ? { startkey_docid: lastDocId } : {}),
      });

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

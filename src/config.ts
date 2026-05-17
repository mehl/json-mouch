export interface EnvConfig {
  couchUrl: string;
  username?: string;
  password?: string;
  database: string;
  pageSize: number;
  outputFile: string;
}

export function readConfig(databaseOverride?: string): EnvConfig {
  const couchUrl = process.env.COUCHDB_URL;
  const database = databaseOverride ?? process.env.COUCHDB_DATABASE;

  if (!couchUrl) {
    throw new Error("COUCHDB_URL fehlt in der .env");
  }
  if (!database) {
    throw new Error(
      "COUCHDB_DATABASE fehlt in der .env oder muss als CLI-Parameter übergeben werden",
    );
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
    outputFile: `couch_${database}.json`,
  };
}

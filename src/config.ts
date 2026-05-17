export interface DatabaseConnectionConfig {
  url: string;
  username?: string;
  password?: string;
}

export interface CouchDbExportConfig {
  connection: DatabaseConnectionConfig;
  database: string;
  pageSize: number;
  outputFile: string;
}

function readPositiveInteger(value: string | undefined, defaultValue: number, field: string): number {
  const parsed = Number(value ?? String(defaultValue));
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} muss eine positive Ganzzahl sein`);
  }
  return parsed;
}

function readCouchDbConnection(): DatabaseConnectionConfig {
  const url = process.env.COUCHDB_URL;

  if (!url) {
    throw new Error("COUCHDB_URL fehlt in der .env");
  }

  return {
    url: url.replace(/\/$/, ""),
    username: process.env.COUCHDB_USERNAME,
    password: process.env.COUCHDB_PASSWORD,
  };
}

export function readCouchDbExportConfig(databaseOverride?: string): CouchDbExportConfig {
  const database = databaseOverride ?? process.env.COUCHDB_DATABASE;

  if (!database) {
    throw new Error(
      "COUCHDB_DATABASE fehlt in der .env oder muss als CLI-Parameter übergeben werden",
    );
  }

  return {
    connection: readCouchDbConnection(),
    database,
    pageSize: readPositiveInteger(process.env.COUCHDB_PAGE_SIZE, 500, "COUCHDB_PAGE_SIZE"),
    outputFile: `couch_${database}.json`,
  };
}

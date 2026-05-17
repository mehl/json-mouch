import { Command } from "commander";
import { readConfig } from "./config";
import { exportDatabaseToJsonl } from "./couchdb";

const program = new Command();

program
  .name("json-mouch")
  .description("Exportiert CouchDB-Dokumente als JSONL-Datei")
  .option("-d, --database <name>", "Name der CouchDB-Datenbank")
  .action(async (options: { database?: string }) => {
    const config = readConfig(options.database);
    const total = await exportDatabaseToJsonl(config);
    console.log(`Export abgeschlossen: ${total} Dokumente -> ${config.outputFile}`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fehler: ${message}`);
  process.exitCode = 1;
});

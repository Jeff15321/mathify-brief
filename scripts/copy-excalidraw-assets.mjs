import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../node_modules/@excalidraw/excalidraw/dist/prod/fonts/", import.meta.url));
const destination = fileURLToPath(new URL("../public/excalidraw-assets/fonts/", import.meta.url));
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Loads ../../openapi.yaml (co-located with the backend rather than in
 * the repo-root docs/ folder specifically so it ships inside the Docker
 * image — see Dockerfile's `COPY openapi.yaml`). Returns null instead of
 * throwing if it's missing, so a packaging mistake takes out interactive
 * docs at /api-docs, not the whole API.
 */
export function loadOpenApiSpec() {
  try {
    const specPath = path.join(__dirname, '..', '..', 'openapi.yaml');
    return YAML.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (err) {
    console.warn('Could not load openapi.yaml — /api-docs will be unavailable:', err.message);
    return null;
  }
}

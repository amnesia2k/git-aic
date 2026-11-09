import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const PACKAGE_NAME = "@amnesia2k/git-aic";

/**
 * Reads the version from this package's package.json. The file sits at a
 * different depth when running from source (bin/cli.ts) and from the build
 * (dist/bin/cli.js), so walk up until the right package.json is found.
 */
export const getPackageVersion = () => {
  let directory = dirname(fileURLToPath(import.meta.url));

  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = join(directory, "package.json");

    if (existsSync(candidate)) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, "utf8")) as {
          name?: string;
          version?: string;
        };

        if (pkg.name === PACKAGE_NAME && pkg.version) {
          return pkg.version;
        }
      } catch {
        // Keep walking up.
      }
    }

    directory = dirname(directory);
  }

  return "unknown";
};

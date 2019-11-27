import fs from "fs-extra";
import pkg from "../package.json";

const docsPath = `docs/jupiterone-io/index.md`;

if (!fs.pathExistsSync(docsPath)) {
  throw new Error("No documentation found!");
}

fs.copySync(docsPath, `dist/docs/index.md`);

fs.writeFileSync(
  "dist/docs/metadata.json",
  JSON.stringify(
    {
      version: pkg.version,
    },
    null,
    2,
  ),
);

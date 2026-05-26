import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      // Enforce absolute imports via the `@/` alias instead of `..` traversal.
      // Sibling `./foo` imports are still fine.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration[source.value=/^\\.\\.\\//]",
          message: "Use the `@/` alias instead of `../` parent imports.",
        },
      ],
    },
  },
  prettier,
];

export default config;

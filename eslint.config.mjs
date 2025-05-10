import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react/react-in-jsx-scope": "off", // Non requis avec React 17+
      "react/prop-types": "off", // Désactive la vérification des prop-types
      "no-unused-vars": "off", // Désactive la vérification des variables inutilisées
    },
  },
];

export default eslintConfig;

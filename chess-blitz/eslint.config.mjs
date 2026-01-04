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
			// Disable overly strict react-hooks v7 rules that produce false positives
			// These rules are new and experimental, catching valid patterns like:
			// - Modifying browser APIs (document.cookie)
			// - Animation state management in effects
			// - Refs modified in callbacks
			"react-hooks/immutability": "off",
			"react-hooks/set-state-in-effect": "off",
		},
	},
];

export default eslintConfig;

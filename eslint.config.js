const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");

module.exports = [
    {
        ignores: [
            "dist/**/*", 
            "node_modules/**/*", 
            "coverage/**/*",
            "*.js", 
            "eslint.config.js",
            "jest.config.js",
            "ormconfig.js"
        ],
    },
    js.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                // Node.js globals
                process: "readonly",
                console: "readonly", 
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                global: "readonly",
                // Jest globals
                describe: "readonly",
                it: "readonly",
                test: "readonly",
                expect: "readonly",
                jest: "readonly",
                beforeAll: "readonly",
                beforeEach: "readonly",
                afterAll: "readonly",
                afterEach: "readonly"
            },
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        rules: {
            ...typescriptEslint.configs.recommended.rules,
            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/return-await": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-extraneous-class": "off",
            "@typescript-eslint/no-unused-vars": ["error", { 
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_"
            }],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/prefer-namespace-keyword": "off",
            "@typescript-eslint/no-var-requires": "error",
            "@typescript-eslint/prefer-as-const": "error",
            "no-redeclare": "off",
            "@typescript-eslint/no-redeclare": ["error", { "ignoreDeclarationMerge": true }],
            "prefer-const": "error",
            "no-var": "error",
            "object-shorthand": "error",
            "prefer-template": "error"
        },
    },
    {
        files: ["src/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off"
        }
    },
    {
        files: ["**/*.d.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off"
        }
    },
    {
        files: ["tests/**/*.ts"],
        rules: {
            // Relax rules in test files for ergonomics
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/no-require-imports": "off",
            "no-undef": "off",
            "object-shorthand": "off",
            "prefer-template": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
        }
    }
];
const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const stylistic = require("@stylistic/eslint-plugin");

module.exports = [
    {
        ignores: [
            "dist/**/*",
            "node_modules/**/*",
            "coverage/**/*",
            "*.js",
            "eslint.config.js",
            "jest.config.js",
            "scripts/**/*.js",
            "tests/**/*.js"
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
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                NodeJS: "readonly",
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
            "@stylistic": stylistic,
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
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/prefer-namespace-keyword": "off",
            "@typescript-eslint/no-var-requires": "error",
            "@typescript-eslint/prefer-as-const": "error",
            "no-redeclare": "off",
            "@typescript-eslint/no-redeclare": ["error", { "ignoreDeclarationMerge": true }],
            "prefer-const": "error",
            "no-var": "error",
            "object-shorthand": "error",
            "prefer-template": "error",
            // Formatting, so `npm run lint` is also the format check
            "@stylistic/indent": ["error", 2],
            "@stylistic/quotes": ["error", "single", { avoidEscape: true }],
            "@stylistic/semi": ["error", "never"],
            "@stylistic/space-before-function-paren": ["error", "always"],
            "@stylistic/comma-dangle": ["error", "never"],
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
            "@stylistic/eol-last": "error",
            "@stylistic/keyword-spacing": "error",
            "@stylistic/space-infix-ops": "error",
            "@stylistic/comma-spacing": "error",
            "@stylistic/key-spacing": "error",
            "@stylistic/arrow-spacing": "error",
            "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }]
        },
    },
    {
        // Dependency rule: domain and application stay framework-agnostic
        files: ["src/domain/**/*.ts", "src/application/**/*.ts"],
        rules: {
            "no-restricted-imports": ["error", {
                paths: [
                    { name: "express", message: "Domain/Application must not depend on Express. Put HTTP concerns in main/infra." },
                    { name: "typeorm", message: "Domain/Application must not depend on TypeORM. Put persistence concerns in infra." },
                    { name: "axios", message: "Domain/Application must not depend on Axios. Put HTTP client concerns in infra." },
                    { name: "multer", message: "Domain/Application must not depend on Multer. Put upload parsing in main." },
                    { name: "winston", message: "Domain/Application must not depend on Winston. Put logging in infra." },
                    { name: "jsonwebtoken", message: "Domain/Application must not depend on jsonwebtoken. Put token signing in infra." }
                ],
                patterns: [
                    { group: ["@aws-sdk/*"], message: "Domain/Application must not depend on the AWS SDK. Put storage concerns in infra." },
                    { group: ["@/infra/*", "@/infra"], message: "Domain/Application must not depend on infra. Depend on domain contracts instead." },
                    { group: ["@/main/*", "@/main"], message: "Domain/Application must not depend on main. Main only composes the other layers." }
                ]
            }]
        }
    },
    {
        // Generated by `typeorm migration:generate`
        files: ["src/infra/repos/postgres/migrations/*.ts"],
        rules: Object.fromEntries(Object.keys(stylistic.rules).map(rule => [`@stylistic/${rule}`, "off"]))
    },
    {
        files: ["tests/**/*.ts"],
        rules: {
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
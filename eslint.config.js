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
            "scripts/**/*.js"
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
        // Dependency rule: domain and application must stay framework-agnostic.
        // Infra implements their contracts and Main is the only composition point.
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
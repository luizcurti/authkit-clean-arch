// Before modules load, so env.ts picks up the test database
process.env.DB_DATABASE = process.env.PG_TEST_DATABASE || 'authkit_test'

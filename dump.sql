CREATE TABLE IF NOT EXISTS users (
  "id" SERIAL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "password" TEXT,
  "facebook_id" TEXT NOT NULL,
  "picture_url" TEXT,
  "initials" TEXT,

  PRIMARY KEY ("id")
);

INSERT INTO users (name, email, password, facebook_id) VALUES ('Loro', 'loro@mail.com', NULL, '123456789');

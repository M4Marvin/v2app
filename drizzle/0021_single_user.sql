PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TEMP TABLE doomed_users AS SELECT id FROM user WHERE id != (SELECT id FROM user ORDER BY (role = 'admin') DESC, created_at ASC, rowid ASC LIMIT 1);
--> statement-breakpoint
DELETE FROM chat_messages WHERE chat_id IN (SELECT id FROM chats WHERE user_id IN (SELECT id FROM doomed_users));
--> statement-breakpoint
DELETE FROM chats WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM user_lore_entry_settings WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM lore_entries WHERE lorebook_id IN (SELECT id FROM lorebooks WHERE user_id IN (SELECT id FROM doomed_users));
--> statement-breakpoint
DELETE FROM user_lorebook_settings WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM lorebooks WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM characters WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM personas WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM presets WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM ai_providers WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM user_settings WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM session WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM account WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM verification;
--> statement-breakpoint
DELETE FROM user_daily_usage WHERE user_id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
DELETE FROM user WHERE id IN (SELECT id FROM doomed_users);
--> statement-breakpoint
UPDATE user_settings SET default_provider_id = NULL WHERE default_provider_id IS NOT NULL AND default_provider_id NOT IN (SELECT id FROM ai_providers);
--> statement-breakpoint
UPDATE user_settings SET default_preset_id = NULL WHERE default_preset_id IS NOT NULL AND default_preset_id NOT IN (SELECT id FROM presets);
--> statement-breakpoint
UPDATE user_settings SET default_persona_id = NULL WHERE default_persona_id IS NOT NULL AND default_persona_id NOT IN (SELECT id FROM personas);
--> statement-breakpoint
UPDATE presets SET provider_id = NULL WHERE provider_id IS NOT NULL AND provider_id NOT IN (SELECT id FROM ai_providers);
--> statement-breakpoint
UPDATE user_settings SET default_provider_id = NULL WHERE default_provider_id = '00000000-0000-0000-0000-000000000001';
--> statement-breakpoint
UPDATE presets SET provider_id = NULL WHERE provider_id = '00000000-0000-0000-0000-000000000001';
--> statement-breakpoint
DELETE FROM ai_providers WHERE id = '00000000-0000-0000-0000-000000000001';
--> statement-breakpoint
ALTER TABLE lorebooks ADD COLUMN enabled INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE lorebooks SET enabled = 1 WHERE id IN (SELECT lorebook_id FROM user_lorebook_settings);
--> statement-breakpoint
DROP TABLE user_lorebook_settings;
--> statement-breakpoint
ALTER TABLE lore_entries ADD COLUMN user_disabled INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE lore_entries SET user_disabled = 1 WHERE id IN (SELECT entry_id FROM user_lore_entry_settings);
--> statement-breakpoint
DROP TABLE user_lore_entry_settings;
--> statement-breakpoint
DROP TABLE user_daily_usage;
--> statement-breakpoint
CREATE TABLE characters__new (
 id text PRIMARY KEY NOT NULL, name text NOT NULL, data text NOT NULL, spec text DEFAULT 'chara_card_v2' NOT NULL, spec_version text DEFAULT '2.0' NOT NULL, image_path text, tagline text, creator text DEFAULT '' NOT NULL, creator_notes text DEFAULT '' NOT NULL, tags text DEFAULT '[]' NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL
);
--> statement-breakpoint
INSERT INTO characters__new (id,name,data,spec,spec_version,image_path,tagline,creator,creator_notes,tags,created_at,updated_at) SELECT id,name,data,spec,spec_version,image_path,tagline,creator,creator_notes,tags,created_at,updated_at FROM characters;
--> statement-breakpoint
DROP TABLE characters;
--> statement-breakpoint
ALTER TABLE characters__new RENAME TO characters;
--> statement-breakpoint
CREATE INDEX characters_updated_idx ON characters (updated_at);
--> statement-breakpoint
CREATE INDEX characters_name_idx ON characters (name);
--> statement-breakpoint
CREATE TABLE lorebooks__new (id text PRIMARY KEY NOT NULL, name text NOT NULL, description text, config text NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, enabled integer NOT NULL DEFAULT 0);
--> statement-breakpoint
INSERT INTO lorebooks__new (id,name,description,config,created_at,updated_at,enabled) SELECT id,name,description,config,created_at,updated_at,enabled FROM lorebooks;
--> statement-breakpoint
DROP TABLE lorebooks;
--> statement-breakpoint
ALTER TABLE lorebooks__new RENAME TO lorebooks;
--> statement-breakpoint
CREATE TABLE presets__new (id text PRIMARY KEY NOT NULL, name text NOT NULL, provider_id text REFERENCES ai_providers(id) ON UPDATE no action ON DELETE set null, model text, data text NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL);
--> statement-breakpoint
INSERT INTO presets__new (id,name,provider_id,model,data,created_at,updated_at) SELECT id,name,provider_id,model,data,created_at,updated_at FROM presets;
--> statement-breakpoint
DROP TABLE presets;
--> statement-breakpoint
ALTER TABLE presets__new RENAME TO presets;
--> statement-breakpoint
CREATE INDEX presets_provider_id_idx ON presets (provider_id);
--> statement-breakpoint
CREATE UNIQUE INDEX presets_name_uq ON presets (name);
--> statement-breakpoint
CREATE TABLE personas__new (id text PRIMARY KEY NOT NULL, name text NOT NULL, description text, icon_path text, created_at integer NOT NULL, updated_at integer NOT NULL);
--> statement-breakpoint
INSERT INTO personas__new (id,name,description,icon_path,created_at,updated_at) SELECT id,name,description,icon_path,created_at,updated_at FROM personas;
--> statement-breakpoint
DROP TABLE personas;
--> statement-breakpoint
ALTER TABLE personas__new RENAME TO personas;
--> statement-breakpoint
CREATE TABLE ai_providers__new (id text PRIMARY KEY NOT NULL, name text NOT NULL, base_url text NOT NULL, api_key text NOT NULL, default_model text, default_headers text, created_at integer NOT NULL, updated_at integer NOT NULL);
--> statement-breakpoint
INSERT INTO ai_providers__new (id,name,base_url,api_key,default_model,default_headers,created_at,updated_at) SELECT id,name,base_url,api_key,default_model,default_headers,created_at,updated_at FROM ai_providers;
--> statement-breakpoint
DROP TABLE ai_providers;
--> statement-breakpoint
ALTER TABLE ai_providers__new RENAME TO ai_providers;
--> statement-breakpoint
CREATE UNIQUE INDEX ai_providers_name_uq ON ai_providers (name);
--> statement-breakpoint
CREATE TABLE chats__new (id text PRIMARY KEY NOT NULL, character_id text NOT NULL, title text NOT NULL, background_id text, character_description text NOT NULL DEFAULT '', character_personality text NOT NULL DEFAULT '', character_scenario text NOT NULL DEFAULT '', character_system_prompt text NOT NULL DEFAULT '', created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (character_id) REFERENCES characters(id) ON UPDATE no action ON DELETE cascade, FOREIGN KEY (background_id) REFERENCES backgrounds(id) ON UPDATE no action ON DELETE set null);
--> statement-breakpoint
INSERT INTO chats__new (id,character_id,title,background_id,character_description,character_personality,character_scenario,character_system_prompt,created_at,updated_at) SELECT id,character_id,title,background_id,character_description,character_personality,character_scenario,character_system_prompt,created_at,updated_at FROM chats;
--> statement-breakpoint
DROP TABLE chats;
--> statement-breakpoint
ALTER TABLE chats__new RENAME TO chats;
--> statement-breakpoint
CREATE INDEX chats_character_id_idx ON chats (character_id);
--> statement-breakpoint
PRAGMA foreign_keys = ON;
--> statement-breakpoint
CREATE TRIGGER single_account_admission BEFORE INSERT ON user WHEN (SELECT count(*) FROM user) >= 1 BEGIN SELECT RAISE(ABORT, 'charon: this instance already has an account'); END;

using Microsoft.EntityFrameworkCore;

namespace Movau.Api.Data;

public static class SchemaBootstrap
{
    public static async Task EnsureAsync(AppDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync("CREATE EXTENSION IF NOT EXISTS postgis");
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE user_role AS ENUM ('client','executor','volunteer','business','moderator','analyst','admin');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE help_request_status AS ENUM ('open','assigned','in_progress','completed','cancelled');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE offer_status AS ENUM ('pending','accepted','rejected','withdrawn');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS users (
              id uuid PRIMARY KEY,
              email varchar(255) NOT NULL UNIQUE,
              phone varchar(32) UNIQUE,
              hashed_password varchar(255) NOT NULL,
              display_name varchar(80) NOT NULL,
              bio varchar(280),
              is_active boolean NOT NULL DEFAULT true,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio varchar(280)");
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE users ADD COLUMN IF NOT EXISTS skills varchar(280)");
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz");
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS user_roles (
              id uuid PRIMARY KEY,
              user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              role user_role NOT NULL,
              UNIQUE (user_id, role)
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS help_requests (
              id uuid PRIMARY KEY,
              client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              executor_id uuid REFERENCES users(id) ON DELETE SET NULL,
              title varchar(140) NOT NULL,
              description text NOT NULL,
              category varchar(64) NOT NULL DEFAULT 'other',
              status help_request_status NOT NULL DEFAULT 'open',
              location geography(Point, 4326) NOT NULL,
              address_text varchar(255),
              price numeric(10,2),
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS executor_id uuid REFERENCES users(id) ON DELETE SET NULL");
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS payment_code varchar(32)");
        await db.Database.ExecuteSqlRawAsync("""
            UPDATE help_requests
            SET payment_code = replace(gen_random_uuid()::text, '-', '')
            WHERE payment_code IS NULL OR payment_code = ''
            """);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_help_requests_payment_code ON help_requests (payment_code)");
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS eta_at timestamptz");
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS offers (
              id uuid PRIMARY KEY,
              help_request_id uuid NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
              executor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              message varchar(280),
              status offer_status NOT NULL DEFAULT 'pending',
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              UNIQUE (help_request_id, executor_id)
            );
            """);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_help_requests_location ON help_requests USING GIST (location)");
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS messages (
              id uuid PRIMARY KEY,
              help_request_id uuid NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
              author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              body varchar(2000) NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_messages_help_request_id ON messages (help_request_id, created_at)");
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_bytes bytea");
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS reviews (
              id uuid PRIMARY KEY,
              help_request_id uuid NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
              author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              subject_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              score smallint NOT NULL,
              comment varchar(500),
              created_at timestamptz NOT NULL DEFAULT now(),
              UNIQUE (help_request_id, author_id)
            );
            """);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_reviews_subject_id ON reviews (subject_id)");
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE wallet_hold_status AS ENUM ('held','released','refunded');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE wallet_txn_kind AS ENUM ('topup','hold','release','refund');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS wallets (
              user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
              balance numeric(12,2) NOT NULL DEFAULT 0,
              updated_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS wallet_holds (
              id uuid PRIMARY KEY,
              help_request_id uuid NOT NULL UNIQUE REFERENCES help_requests(id) ON DELETE CASCADE,
              payer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              payee_id uuid REFERENCES users(id) ON DELETE CASCADE,
              amount numeric(12,2) NOT NULL,
              status wallet_hold_status NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS wallet_txns (
              id uuid PRIMARY KEY,
              wallet_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              amount numeric(12,2) NOT NULL,
              kind wallet_txn_kind NOT NULL,
              help_request_id uuid REFERENCES help_requests(id) ON DELETE SET NULL,
              created_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE wallet_holds ALTER COLUMN payee_id DROP NOT NULL");
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_wallet_txns_user ON wallet_txns (wallet_user_id, created_at DESC)");
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE dispute_status AS ENUM ('open','resolved');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS disputes (
              id uuid PRIMARY KEY,
              help_request_id uuid NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
              author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              reason varchar(500) NOT NULL,
              status dispute_status NOT NULL DEFAULT 'open',
              resolution varchar(500),
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_disputes_request ON disputes (help_request_id, created_at)");
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE identity_status AS ENUM ('pending','verified','rejected');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE identity_document_kind AS ENUM ('passport_by','id_card_by','other');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS identity_verifications (
              id uuid PRIMARY KEY,
              user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
              document_kind identity_document_kind NOT NULL,
              full_name varchar(80) NOT NULL,
              personal_number varchar(32) NOT NULL,
              personal_hash varchar(64) NOT NULL,
              document_number varchar(32) NOT NULL,
              document_bytes bytea,
              selfie_bytes bytea,
              status identity_status NOT NULL DEFAULT 'pending',
              reject_reason varchar(500),
              reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
              reviewed_at timestamptz,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_identity_personal_hash_verified
            ON identity_verifications (personal_hash)
            WHERE status = 'verified';
            """);
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE notification_kind AS ENUM (
                'request_taken','message','identity_reviewed',
                'offer','request_started','request_completed',
                'payment_released','dispute_opened','dispute_resolved'
              );
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await AddEnumValueAsync(db, "ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'offer'");
        await AddEnumValueAsync(db, "ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'request_started'");
        await AddEnumValueAsync(db, "ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'request_completed'");
        await AddEnumValueAsync(db, "ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'payment_released'");
        await AddEnumValueAsync(db, "ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'dispute_opened'");
        await AddEnumValueAsync(db, "ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'dispute_resolved'");
        await AddEnumValueAsync(db, "ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'request_nearby'");
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS notifications (
              id uuid PRIMARY KEY,
              user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              kind notification_kind NOT NULL,
              title varchar(140) NOT NULL,
              body varchar(500) NOT NULL,
              href varchar(255) NOT NULL,
              read_at timestamptz,
              created_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_notifications_user_created ON notifications (user_id, created_at DESC)");
        await db.Database.ExecuteSqlRawAsync("""
            DO $$ BEGIN
              CREATE TYPE admin_event_kind AS ENUM (
                'request_cancelled','user_deactivated','user_activated','dispute_resolved','identity_reviewed',
                'user_role_granted','user_role_revoked'
              );
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """);
        await AddEnumValueAsync(db, "ALTER TYPE admin_event_kind ADD VALUE IF NOT EXISTS 'user_role_granted'");
        await AddEnumValueAsync(db, "ALTER TYPE admin_event_kind ADD VALUE IF NOT EXISTS 'user_role_revoked'");
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS admin_events (
              id uuid PRIMARY KEY,
              actor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              kind admin_event_kind NOT NULL,
              entity_type varchar(32) NOT NULL,
              entity_id uuid NOT NULL,
              detail varchar(500) NOT NULL DEFAULT '',
              created_at timestamptz NOT NULL DEFAULT now()
            );
            """);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_admin_events_created ON admin_events (created_at DESC)");
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS match_events (
              id uuid PRIMARY KEY,
              help_request_id uuid NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
              candidate_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              variant varchar(16) NOT NULL,
              kind varchar(16) NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now(),
              UNIQUE (help_request_id, candidate_id, variant, kind)
            );
            """);
        await db.Database.ExecuteSqlRawAsync(
            "CREATE INDEX IF NOT EXISTS ix_match_events_created ON match_events (created_at DESC)");
    }

    private static Task AddEnumValueAsync(AppDbContext db, string sql) =>
        db.Database.ExecuteSqlRawAsync(sql);
}

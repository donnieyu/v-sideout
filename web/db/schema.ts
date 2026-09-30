import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  revision: integer('revision').notNull().default(0),
});

export const authMembers=sqliteTable('auth_members',{
 id:text('id').primaryKey(),
 loginId:text('login_id').notNull(),
 loginKey:text('login_key').notNull(),
 displayName:text('display_name').notNull(),
 homeClubId:text('home_club_id'),
 kind:text('kind').notNull(),
 isMaster:integer('is_master').notNull().default(0),
 homeRole:text('home_role'),
 grantsJson:text('grants_json').notNull().default('[]'),
 active:integer('active').notNull().default(1),
 passwordHash:text('password_hash').notNull(),
 mustChangePassword:integer('must_change_password').notNull().default(1),
 temporaryExpiresAt:text('temporary_expires_at'),
 authVersion:integer('auth_version').notNull().default(1),
 createdAt:text('created_at').notNull(),
 updatedAt:text('updated_at'),
},table=>[uniqueIndex('auth_members_login_key_unique').on(table.loginKey)]);

export const authSessions=sqliteTable('auth_sessions',{
 tokenHash:text('token_hash').primaryKey(),
 memberId:text('member_id').notNull().references(()=>authMembers.id),
 authVersion:integer('auth_version').notNull(),
 restricted:integer('restricted').notNull().default(1),
 expiresAt:integer('expires_at').notNull(),
 createdAt:text('created_at').notNull(),
});

export const authMemberAudit=sqliteTable('auth_member_audit',{
 id:text('id').primaryKey(),
 actorMemberId:text('actor_member_id').references(()=>authMembers.id),
 targetMemberId:text('target_member_id').notNull().references(()=>authMembers.id),
 action:text('action').notNull(),
 targetAuthVersion:integer('target_auth_version').notNull(),
 createdAt:text('created_at').notNull(),
});

export const joinRequests=sqliteTable('join_requests',{
 id:text('id').primaryKey(),
 requestedName:text('requested_name').notNull(),
 email:text('email').notNull(),
 requestedClubId:text('requested_club_id'),
 status:text('status').notNull().default('pending'),
 approvedMemberId:text('approved_member_id').references(()=>authMembers.id),
 createdAt:text('created_at').notNull(),
 decidedAt:text('decided_at'),
},table=>[uniqueIndex('join_requests_approved_member_unique').on(table.approvedMemberId)]);

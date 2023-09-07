import { pgTable, foreignKey, pgEnum, text, jsonb, timestamp, uniqueIndex, varchar, integer, boolean, doublePrecision, index } from "drizzle-orm/pg-core"

import { sql } from "drizzle-orm"
export const serviceProviderType = pgEnum("ServiceProviderType", ['google_drive', 'notion'])
export const agentModelName = pgEnum("AgentModelName", ['gpt_3_5_turbo', 'gpt_4', 'gpt_3_5_turbo_16k', 'gpt_4_32k'])
export const messageEval = pgEnum("MessageEval", ['good', 'bad'])
export const datasourceType = pgEnum("DatasourceType", ['web_page', 'web_site', 'text', 'file', 'google_drive_file', 'google_drive_folder', 'notion', 'qa'])
export const datastoreVisibility = pgEnum("DatastoreVisibility", ['public', 'private'])
export const datasourceStatus = pgEnum("DatasourceStatus", ['unsynched', 'pending', 'running', 'synched', 'error', 'usage_limit_reached'])
export const datastoreType = pgEnum("DatastoreType", ['pinecone', 'qdrant'])
export const priceType = pgEnum("PriceType", ['recurring'])
export const subscriptionStatus = pgEnum("SubscriptionStatus", ['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'])
export const priceInterval = pgEnum("PriceInterval", ['day', 'month', 'week', 'year'])
export const agentVisibility = pgEnum("AgentVisibility", ['public', 'private'])
export const toolType = pgEnum("ToolType", ['datastore', 'connector', 'agent'])
export const subscriptionPlan = pgEnum("SubscriptionPlan", ['level_0', 'level_1', 'level_2', 'level_3'])
export const promptType = pgEnum("PromptType", ['raw', 'customer_support'])
export const messageFrom = pgEnum("MessageFrom", ['agent', 'human'])
export const conversationChannel = pgEnum("ConversationChannel", ['dashboard', 'website', 'slack', 'crisp'])
export const integrationType = pgEnum("IntegrationType", ['website', 'crisp', 'slack'])


export const serviceProviders = pgTable("service_providers", {
	id: text("id").primaryKey().notNull(),
	type: serviceProviderType("type").notNull(),
	name: text("name"),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	config: jsonb("config"),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
});

export const domains = pgTable("domains", {
	id: text("id").primaryKey().notNull(),
	name: text("name").notNull(),
	agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		nameKey: uniqueIndex("domains_name_key").on(table.name),
	}
});

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar("id", { length: 36 }).primaryKey().notNull(),
	checksum: varchar("checksum", { length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text("logs"),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export const dataSources = pgTable("data_sources", {
	id: text("id").primaryKey().notNull(),
	type: datasourceType("type").notNull(),
	name: text("name").notNull(),
	status: datasourceStatus("status").default('unsynched').notNull(),
	config: jsonb("config"),
	datastoreId: text("datastore_id").references(() => dataStores.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	ownerId: text("owner_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" } ),
	nbChunks: integer("nb_chunks").default(0),
	textSize: integer("text_size").default(0),
	hash: text("hash"),
	nbSynch: integer("nb_synch").default(0),
	lastSynch: timestamp("last_synch", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	groupId: text("group_id"),
	serviceProviderId: text("service_provider_id").references(() => serviceProviders.id, { onDelete: "cascade", onUpdate: "cascade" } ),
},
(table) => {
	return {
		dataSourcesGroupIdFkey: foreignKey({
			columns: [table.groupId],
			foreignColumns: [table.id]
		}).onUpdate("cascade").onDelete("cascade"),
	}
});

export const verificationTokens = pgTable("verification_tokens", {
	identifier: text("identifier").notNull(),
	token: text("token").notNull(),
	expires: timestamp("expires", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		tokenKey: uniqueIndex("verification_tokens_token_key").on(table.token),
		identifierTokenKey: uniqueIndex("verification_tokens_identifier_token_key").on(table.identifier, table.token),
	}
});

export const projects = pgTable("projects", {
	id: text("id").primaryKey().notNull(),
	subdomain: text("subdomain").notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	name: text("name").notNull(),
	disabled: boolean("disabled").default(false),
	publishedAt: timestamp("published_at", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		subdomainKey: uniqueIndex("projects_subdomain_key").on(table.subdomain),
	}
});

export const externalIntegrations = pgTable("external_integrations", {
	id: text("id").primaryKey().notNull(),
	integrationId: text("integration_id").notNull(),
	apiKeyId: text("api_key_id").references(() => datastoreApiKeys.id, { onDelete: "set null", onUpdate: "cascade" } ),
	type: integrationType("type").notNull(),
	integrationToken: text("integration_token"),
	agentId: text("agent_id").references(() => agents.id, { onDelete: "set null", onUpdate: "cascade" } ),
	metadata: jsonb("metadata"),
},
(table) => {
	return {
		integrationIdKey: uniqueIndex("external_integrations_integration_id_key").on(table.integrationId),
	}
});

export const datastoreApiKeys = pgTable("datastore_api_keys", {
	id: text("id").primaryKey().notNull(),
	key: text("key").notNull(),
	datastoreId: text("datastore_id").references(() => dataStores.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		keyKey: uniqueIndex("datastore_api_keys_key_key").on(table.key),
	}
});

export const accounts = pgTable("accounts", {
	id: text("id").primaryKey().notNull(),
	userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	type: text("type").notNull(),
	provider: text("provider").notNull(),
	providerAccountId: text("providerAccountId").notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text("scope"),
	idToken: text("id_token"),
	sessionState: text("session_state"),
},
(table) => {
	return {
		providerProviderAccountIdKey: uniqueIndex("accounts_provider_providerAccountId_key").on(table.provider, table.providerAccountId),
	}
});

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey().notNull(),
	sessionToken: text("sessionToken").notNull(),
	userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	expires: timestamp("expires", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		sessionTokenKey: uniqueIndex("sessions_sessionToken_key").on(table.sessionToken),
	}
});

export const users = pgTable("users", {
	id: text("id").primaryKey().notNull(),
	name: text("name"),
	email: text("email"),
	emailVerified: timestamp("email_verified", { precision: 3, mode: 'string' }),
	image: text("image"),
	picture: text("picture"),
	hasOptInEmail: boolean("has_opt_in_email").default(false),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
},
(table) => {
	return {
		emailKey: uniqueIndex("users_email_key").on(table.email),
	}
});

export const dataStores = pgTable("data_stores", {
	id: text("id").primaryKey().notNull(),
	name: text("name").notNull(),
	description: text("description"),
	type: datastoreType("type").notNull(),
	visibility: datastoreVisibility("visibility").default('private').notNull(),
	config: jsonb("config"),
	ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	pluginIconUrl: text("plugin_icon_url"),
	pluginDescriptionForHumans: text("plugin_description_for_humans"),
	pluginDescriptionForModel: text("plugin_description_for_model"),
	pluginName: text("plugin_name"),
});

export const messages = pgTable("messages", {
	id: text("id").primaryKey().notNull(),
	text: text("text").notNull(),
	from: messageFrom("from").notNull(),
	conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	read: boolean("read").default(false),
	sources: jsonb("sources"),
	eval: messageEval("eval"),
});

export const products = pgTable("products", {
	id: text("id").primaryKey().notNull(),
	active: boolean("active").default(false).notNull(),
	name: text("name").notNull(),
	description: text("description"),
	image: text("image"),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
});

export const prices = pgTable("prices", {
	id: text("id").primaryKey().notNull(),
	productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	active: boolean("active").default(false).notNull(),
	currency: text("currency").notNull(),
	interval: priceInterval("interval"),
	unitAmount: integer("unit_amount"),
	intervalCount: integer("interval_count"),
	trialPeriodDays: integer("trial_period_days"),
	type: priceType("type"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
});

export const agents = pgTable("agents", {
	id: text("id").primaryKey().notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	prompt: text("prompt"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	visibility: agentVisibility("visibility").default('private').notNull(),
	nbQueries: integer("nb_queries").default(0),
	interfaceConfig: jsonb("interface_config"),
	promptType: promptType("prompt_type").default('customer_support').notNull(),
	temperature: doublePrecision("temperature").notNull(),
	iconUrl: text("icon_url"),
	modelName: agentModelName("model_name").default('gpt_3_5_turbo').notNull(),
	handle: text("handle"),
	includeSources: boolean("include_sources").default(true),
	restrictKnowledge: boolean("restrict_knowledge").default(true),
},
(table) => {
	return {
		handleKey: uniqueIndex("agents_handle_key").on(table.handle),
	}
});

export const tools = pgTable("tools", {
	id: text("id").primaryKey().notNull(),
	type: toolType("type").notNull(),
	agentId: text("agent_id").references(() => agents.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	datastoreId: text("datastore_id").references(() => dataStores.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
});

export const userApiKeys = pgTable("user_api_keys", {
	id: text("id").primaryKey().notNull(),
	key: text("key").notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		keyKey: uniqueIndex("user_api_keys_key_key").on(table.key),
	}
});

export const subscriptions = pgTable("subscriptions", {
	id: text("id").primaryKey().notNull(),
	priceId: text("priceId").notNull().references(() => prices.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	status: subscriptionStatus("status").notNull(),
	startDate: timestamp("start_date", { precision: 3, mode: 'string' }),
	endedAt: timestamp("ended_at", { precision: 3, mode: 'string' }),
	trialEnd: timestamp("trial_end", { precision: 3, mode: 'string' }),
	trialStart: timestamp("trial_start", { precision: 3, mode: 'string' }),
	cancelAt: timestamp("cancel_at", { precision: 3, mode: 'string' }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end"),
	canceledAt: timestamp("canceled_at", { precision: 3, mode: 'string' }),
	metadata: jsonb("metadata"),
	coupon: text("coupon"),
	userId: text("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	customerId: text("customer_id").notNull(),
	plan: subscriptionPlan("plan").default('level_1'),
},
(table) => {
	return {
		userIdKey: uniqueIndex("subscriptions_user_id_key").on(table.userId),
	}
});

export const usages = pgTable("usages", {
	id: text("id").primaryKey().notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	nbAgentQueries: integer("nb_agent_queries").default(0).notNull(),
	nbDatastoreQueries: integer("nb_datastore_queries").default(0).notNull(),
	nbUploadedBytes: integer("nb_uploaded_bytes").default(0).notNull(),
	nbDataProcessingBytes: integer("nb_data_processing_bytes").default(0).notNull(),
	nbTokens: integer("nb_tokens").default(0).notNull(),
},
(table) => {
	return {
		userIdKey: uniqueIndex("usages_user_id_key").on(table.userId),
	}
});

export const conversations = pgTable("conversations", {
	id: text("id").primaryKey().notNull(),
	userId: text("user_id").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" } ),
	agentId: text("agent_id").references(() => agents.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	channel: conversationChannel("channel").default('dashboard').notNull(),
	visitorId: text("visitor_id"),
	metadata: jsonb("metadata"),
},
(table) => {
	return {
		visitorIdIdx: index("conversations_visitor_id_idx").on(table.visitorId),
	}
});

export const messagesBnp = pgTable("messages_bnp", {
	id: text("id").primaryKey().notNull(),
	text: text("text").notNull(),
	from: messageFrom("from").notNull(),
	datastoreId: text("datastore_id").references(() => dataStores.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	read: boolean("read").default(false),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	userName: text("user_name"),
});

export const xpBnpEvals = pgTable("xp_bnp_evals", {
	id: text("id").primaryKey().notNull(),
	active: boolean("active").default(false).notNull(),
	userName: text("user_name"),
	feature: text("feature"),
	usecase: text("usecase"),
	promptType: text("prompt_type"),
	prompt: text("prompt"),
	comment: text("comment"),
	score1: integer("score_1"),
	score2: integer("score_2"),
	score3: integer("score_3"),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	result: text("result"),
	datasourceName: text("datasource_name"),
	datastoreName: text("datastore_name"),
});
import fs from "node:fs";

import { env } from "bun";
import { z } from "zod";

const discordSchema = z.object({
	token: z.string(),
	app_id: z.string(),
});

const rbxSchema = z.object({
	token: z.string(),
});

const googleSchema = z.object({
	sheets_id: z.string(),
	credentials: z.object({
		client_email: z.string(),
		private_key: z.string(),
	}),
});

const schema = z.object({
	discord: discordSchema,
	rbx: rbxSchema.optional(),
	google: googleSchema.optional(),
});

function validateConfig() {
	const runtimeConfig = JSON.parse(fs.readFileSync(".wiltilrc.json", "utf8"));
	const conf = schema.safeParse(runtimeConfig);
	if (conf.success) return conf.data;

	console.error("invalid environment variables");
	for (const err of conf.error.errors)
		console.log(`  ${err.message}: ${err.path}`);
	process.exit(1);
}

export default { data: validateConfig() };

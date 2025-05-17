import { Client, Events, GatewayIntentBits } from "discord.js";

import logger from "./utils/logging.ts";
import cfg from "./validateConfig.ts";

const client = new Client({
	intents: (Object.values(GatewayIntentBits) as (string | number)[])
		.filter((value) => typeof value === "number")
		.reduce((a: number, b: number) => a | b, 0),
});

client.on(Events.ClientReady, async (client) => {
	logger.info(`logged in as ${client.user?.tag}!`);
});

await client.login(cfg.data.discord.token);

process.on("unhandledRejection", (error) => {
	logger.error("unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
	logger.error("uncaught exception:", error);
});

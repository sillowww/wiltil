import {
	type ChatInputCommandInteraction,
	type Client,
	SlashCommandBuilder,
	escapeBulletedList,
	inlineCode,
} from "discord.js";
import config from "../../config";
import type { UserSearchResponse } from "../../types/robloxApi";

const commandData = new SlashCommandBuilder()
	.setName("search")
	.setDescription("search for a player")
	.addStringOption((option) =>
		option
			.setName("username")
			.setDescription("the username to search for")
			.setRequired(true),
	);

async function execute(
	_client: Client,
	interaction: ChatInputCommandInteraction,
) {
	if (!config.data.rbx?.token) {
		return interaction.reply({
			content:
				"roblox api token not found, set `rbx.token` in `.wiltilrc.json`",
			flags: ["Ephemeral"],
		});
	}

	const username = interaction.options.getString("username");
	if (!username) {
		return interaction.reply({
			content: "username not provided",
			flags: ["Ephemeral"],
		});
	}

	const url = `https://users.roblox.com/v1/users/search?keyword=${encodeURI(username)}`;

	const response = await fetch(url, {
		headers: {
			"Content-Type": "application/json",
			"x-api-key": config.data.rbx?.token,
		},
	});

	const res = (await response.json()) as UserSearchResponse;
	if ("statusCode" in res) {
		return interaction.reply({
			content: `${res.statusCode} ${res.error}: ${res.message}`,
			flags: ["Ephemeral"],
		});
	}

	if (!res.data.length) {
		return interaction.reply({
			content: `no player found with username ${username}`,
			flags: ["Ephemeral"],
		});
	}

	let resultString = `**results for ${username}**\n`;
	for (const user of res.data) {
		resultString += `\- ${user.name} ${inlineCode(user.id.toString())} | [profile](<https://www.roblox.com/users/${user.id}/profile>)\n`;
	}

	return interaction.reply({
		content: resultString,
		flags: ["Ephemeral"],
	});
}

export default {
	data: commandData,
	execute,
};

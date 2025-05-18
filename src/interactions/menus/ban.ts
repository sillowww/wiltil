import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type Client,
	ContextMenuCommandBuilder,
	type MessageContextMenuCommandInteraction,
	ModalBuilder,
	type ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

import config from "../../config";

enum Game {
	WarfareTycoon = "Warfare Tycoon",
	AirsoftBattles = "Airsoft Battles",
	GroundWar = "Ground War",
}

enum Penalty {
	Ban = "Ban",
	None = "None",
}

type TmpBan = {
	cid: string;
	tgtId?: string;
	reason?: string;
	length?: string;
	messageUrl: string;
	date: Date;
	penalty?: Penalty;
	interaction?: ModalSubmitInteraction;
};

const tmpBans: Record<string, TmpBan> = {};

function constructButtons(cid: string, gamesDone: Game[]) {
	return [
		new ButtonBuilder()
			.setCustomId(`ban:ban_user-gw:${cid}`)
			.setLabel("gw: mark done")
			.setDisabled(Game.WarfareTycoon in gamesDone)
			.setStyle(
				Game.WarfareTycoon in gamesDone
					? ButtonStyle.Success
					: ButtonStyle.Secondary,
			),

		new ButtonBuilder()
			.setCustomId(`ban:ban_user-wft:${cid}`)
			.setLabel("wt: mark done")
			.setDisabled(Game.WarfareTycoon in gamesDone)
			.setStyle(
				Game.WarfareTycoon in gamesDone
					? ButtonStyle.Success
					: ButtonStyle.Secondary,
			),
		new ButtonBuilder()
			.setCustomId(`ban:ban_user-ab:${cid}`)
			.setLabel("ab: mark done")
			.setDisabled(Game.WarfareTycoon in gamesDone)
			.setStyle(
				Game.WarfareTycoon in gamesDone
					? ButtonStyle.Success
					: ButtonStyle.Secondary,
			),
	];
}

const commandData = new ContextMenuCommandBuilder()
	.setName("ban")
	.setType(ApplicationCommandType.Message);

async function execute(
	_client: Client,
	interaction: MessageContextMenuCommandInteraction,
) {
	const customId = new Date().getTime().toString();
	const modal = new ModalBuilder()
		.setTitle("ban user")
		.setCustomId(`ban:ban_user_modal:${customId}`)
		.addComponents([
			new ActionRowBuilder<TextInputBuilder>().addComponents([
				new TextInputBuilder()
					.setCustomId("ban_user-id")
					.setLabel("Player ID/Username")
					.setStyle(TextInputStyle.Short)
					.setRequired(true),
			]),
			new ActionRowBuilder<TextInputBuilder>().addComponents([
				new TextInputBuilder()
					.setCustomId("ban_user-reason")
					.setLabel("Reason")
					.setStyle(TextInputStyle.Short)
					.setRequired(true),
			]),
			new ActionRowBuilder<TextInputBuilder>().addComponents([
				new TextInputBuilder()
					.setCustomId("ban_user-penalty")
					.setLabel("Penalty")
					.setStyle(TextInputStyle.Short)
					.setRequired(true),
			]),
			new ActionRowBuilder<TextInputBuilder>().addComponents([
				new TextInputBuilder()
					.setCustomId("ban_user-length")
					.setLabel("Length")
					.setStyle(TextInputStyle.Short)
					.setRequired(true),
			]),
		]);

	const ban: TmpBan = {
		cid: customId,
		messageUrl: interaction.targetMessage.url,
		date: new Date(),
	};

	tmpBans[customId] = ban;
	await interaction.showModal(modal);
}

async function modalExecute(
	_client: Client,
	interaction: ModalSubmitInteraction,
) {
	const customId = interaction.customId.split(":")[2];
	const target = interaction.fields.getTextInputValue("ban_user-id");
	const reason = interaction.fields.getTextInputValue("ban_user-reason");
	const length = interaction.fields.getTextInputValue("ban_user-length");
	const penalty = interaction.fields.getTextInputValue(
		"ban_user-penalty",
	) as Penalty;
	const userId: string | number = target;

	const banCommand = `banoffline ${userId} ${length} ${reason} -yours truly, willow`;
	const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		constructButtons(customId, []),
	);

	const tmp = tmpBans[customId];
	const newBan = {
		...tmp,
		tgtId: String(userId),
		reason,
		length,
		penalty,
		interaction,
	};

	tmpBans[customId] = newBan;

	await interaction.reply({
		content: banCommand,
		components: [buttonRow],
		flags: ["Ephemeral"],
	});
}

async function buttonExecute(_client: Client, interaction: ButtonInteraction) {
	const [_, action, customId] = interaction.customId.split(":");
	const ban = tmpBans[customId];
	await interaction.deferReply({ flags: ["Ephemeral"] });

	if (!ban) {
		return interaction.reply({
			content: "couldn't find the associated ban data!",
			flags: ["Ephemeral"],
		});
	}

	let game: Game;
	if (action === "ban_user-gw") {
		game = Game.GroundWar;
	} else if (action === "ban_user-wft") {
		game = Game.WarfareTycoon;
	} else if (action === "ban_user-ab") {
		game = Game.AirsoftBattles;
	} else {
		return interaction.editReply({
			content: "invalid game selection",
		});
	}

	try {
		await addBanToSpreadsheet(ban, game);
		await interaction.editReply({
			content: `ban for ${ban.tgtId} recorded for ${game}`,
		});
	} catch (error) {
		console.error(error);
		await interaction.editReply({
			content: `error adding ban to spreadsheet: ${error}`,
		});
	}
}

async function addBanToSpreadsheet(ban: TmpBan, game: Game) {
	if (!config.data.google?.sheets_id || !config.data.google?.credentials) {
		throw new Error("google sheets configuration missing");
	}

	const credentials = config.data.google.credentials;
	const jwt = new JWT({
		email: credentials.client_email,
		key: credentials.private_key,
		scopes: ["https://www.googleapis.com/auth/spreadsheets"],
	});

	const doc = new GoogleSpreadsheet(config.data.google.sheets_id, jwt);
	await doc.loadInfo();

	const sheet = doc.sheetsByIndex[0];

	try {
		await sheet.loadHeaderRow();
	} catch (e) {
		const headers = [
			"CID",
			"Player ID",
			"Username",
			"Banned At",
			"Game",
			"Reason",
			"Penalty",
			"Length",
			"Message",
			"Command",
			"AB",
			"GW",
			"WT",
		];
		await sheet.setHeaderRow(headers);
	}

	await sheet.loadCells();
	const rows = await sheet.getRows();

	let existingRow = null;
	for (let i = 0; i < rows.length; i++) {
		if (rows[i].get("CID") === ban.cid) {
			existingRow = rows[i];
			break;
		}
	}

	const formattedDate = ban.date.toLocaleString("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	if (!ban.tgtId) {
		throw new Error("missing required fields");
	}

	const gameField = existingRow ? existingRow.get("Game") : game;

	if (existingRow) {
		existingRow.set("CID", ban.cid);
		existingRow.set("Player ID", ban.tgtId);
		existingRow.set("Banned At", formattedDate);
		existingRow.set("Game", gameField);
		existingRow.set("Reason", ban.reason || "");
		existingRow.set("Penalty", ban.penalty || "Ban");
		existingRow.set("Length", ban.length || "perma");
		existingRow.set("Message", ban.messageUrl);
		existingRow.set(
			"Command",
			`banoffline ${ban.tgtId || ""} ${ban.length || ""} ${ban.reason || ""} -willow`,
		);

		if (game === Game.GroundWar) existingRow.set("GW", "Y");
		else if (game === Game.WarfareTycoon) existingRow.set("WT", "Y");
		else if (game === Game.AirsoftBattles) existingRow.set("AB", "Y");

		await existingRow.save();
	} else {
		const newRowData = {
			CID: ban.cid,
			"Player ID": ban.tgtId,
			"Banned At": formattedDate,
			Game: gameField,
			Reason: ban.reason || "",
			Penalty: ban.penalty || "Ban",
			Length: ban.length || "perma",
			Message: ban.messageUrl,
			Command: `banoffline ${ban.tgtId || ""} ${ban.length || ""} ${ban.reason || ""} -willow`,
			GW: game === Game.GroundWar ? "Y" : "N",
			WT: game === Game.WarfareTycoon ? "Y" : "N",
			AB: game === Game.AirsoftBattles ? "Y" : "N",
		};
		await sheet.addRow(newRowData);
	}
}

export default {
	data: commandData,
	execute,
	modalExecute,
	buttonExecute,
};

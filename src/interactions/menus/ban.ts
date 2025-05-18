import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	type Client,
	ContextMenuCommandBuilder,
	type MessageContextMenuCommandInteraction,
	ModalBuilder,
	type ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { searchPlayers } from "../../utils/searchPlayers";

const commandData = new ContextMenuCommandBuilder()
	.setName("ban")
	.setType(ApplicationCommandType.Message);

async function execute(
	_client: Client,
	interaction: MessageContextMenuCommandInteraction,
) {
	const modal = new ModalBuilder()
		.setTitle("ban user")
		.setCustomId("ban:ban_user_modal")
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
					.setCustomId("ban_user-length")
					.setLabel("Length")
					.setStyle(TextInputStyle.Short)
					.setRequired(true),
			]),
		]);

	await interaction.showModal(modal);
}

async function modalExecute(
	_client: Client,
	interaction: ModalSubmitInteraction,
) {
	const target = interaction.fields.getTextInputValue("ban_user-id");
	const reason = interaction.fields.getTextInputValue("ban_user-reason");
	const length = interaction.fields.getTextInputValue("ban_user-length");
	let userId: string | number = target;

	if (!Number.isNaN(Number(target))) {
		const possiblePlayers = await searchPlayers(target);
		userId = possiblePlayers[0].id;
	}

	const banCommand = `banoffline ${userId} ${length} ${reason} -yours truly, willow`;
	const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents([
		new ButtonBuilder()
			.setCustomId("ban:ban_user-gw")
			.setLabel("ground war: mark done")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("ban:ban_user-wft")
			.setLabel("warfare tycoon: mark done")
			.setStyle(ButtonStyle.Primary),
	]);

	await interaction.reply({
		content: banCommand,
		components: [buttonRow],
	});
}

export default {
	data: commandData,
	execute,
	modalExecute,
};

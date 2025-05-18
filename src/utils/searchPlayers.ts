import type { UserSearchPlayer } from "../types/robloxApi";

export async function searchPlayers(
	username: string,
): Promise<UserSearchPlayer[]> {
	const url = `https://users.roblox.com/v1/users/search?keyword=${encodeURI(username)}`;
	const response = await fetch(url, {
		headers: {
			"Content-Type": "application/json",
		},
	});
	const data = await response.json();
	return data.data;
}

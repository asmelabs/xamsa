export type MockPlayer = {
	id: string;
	name: string;
	username: string;
	score: number;
	status: "playing" | "left";
	isHost: boolean;
};

export type MockClick = {
	id: string;
	playerId: string;
	position: number;
	status: "pending" | "correct" | "wrong" | "expired";
	reactionMs: number;
};

export const MOCK_GAME = {
	code: "XMS-A4F9K2",
	status: "active" as "waiting" | "active" | "paused" | "completed",
	packName: "Azerbaijani History",
	currentTopicOrder: 2,
	currentTopicName: "Səfəvilər Dövləti",
	currentQuestionOrder: 3,
	totalTopics: 5,
	totalQuestions: 5,
	isQuestionRevealed: false,
};

export const MOCK_CURRENT_QUESTION = {
	text: "Şah İsmayıl Xətai neçənci ildə taxta çıxmışdır?",
	answer: "1501",
	explanation:
		"Şah İsmayıl 1501-ci ildə Təbrizdə Səfəvi dövlətinin əsasını qoymuşdur.",
	points: 300,
};

export const MOCK_PLAYERS: MockPlayer[] = [
	{
		id: "p1",
		name: "Mehdi Asadli",
		username: "mehdi",
		score: 1500,
		status: "playing",
		isHost: false,
	},
	{
		id: "p2",
		name: "Rashad Quliyev",
		username: "rashad",
		score: 900,
		status: "playing",
		isHost: false,
	},
	{
		id: "p3",
		name: "Nigar Hasanova",
		username: "nigar",
		score: 1200,
		status: "playing",
		isHost: false,
	},
	{
		id: "p4",
		name: "Elvin Aliyev",
		username: "elvin",
		score: -300,
		status: "playing",
		isHost: false,
	},
	{
		id: "p5",
		name: "Aysel Karimova",
		username: "aysel",
		score: 0,
		status: "left",
		isHost: false,
	},
];

export const MOCK_CLICKS: MockClick[] = [
	{ id: "c1", playerId: "p2", position: 1, status: "wrong", reactionMs: 420 },
	{ id: "c2", playerId: "p1", position: 2, status: "pending", reactionMs: 680 },
	{ id: "c3", playerId: "p3", position: 3, status: "pending", reactionMs: 950 },
];

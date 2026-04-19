export const UNIVERSAL_SUBAGENT_REPORT_PROMPT = `
Always finish your response with a final report back to the main agent.
- Put the report at the very end of your output.
- Make it self-contained and actionable.
- Summarize the important findings, files, risks, and next steps.
- Do not omit the report even if you already provided intermediate updates.
`.trim();

export interface TextPartLike {
	type: "text";
	text: string;
}

export interface ToolCallPartLike {
	type: "toolCall";
	name: string;
	arguments: Record<string, unknown>;
}

export type AssistantPartLike = TextPartLike | ToolCallPartLike | { type: string; [key: string]: unknown };

export interface MessageLike {
	role: string;
	content: AssistantPartLike[];
}

export interface SubagentResultLike {
	agent: string;
	agentSource: "user" | "project" | "unknown";
	exitCode: number;
	messages: MessageLike[];
	stderr: string;
	stopReason?: string;
	errorMessage?: string;
	step?: number;
}

export function composeSubagentSystemPrompt(prompt: string): string {
	const pieces = [prompt.trim(), UNIVERSAL_SUBAGENT_REPORT_PROMPT].filter(Boolean);
	return pieces.join("\n\n");
}

export function getFinalOutput(messages: MessageLike[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg.role === "assistant") {
			const text = msg.content
				.filter((part): part is TextPartLike => part.type === "text")
				.map((part) => part.text)
				.join("\n")
				.trim();
			if (text) return text;
		}
	}
	return "";
}

export function getResultReport(result: SubagentResultLike): string {
	const finalOutput = getFinalOutput(result.messages);
	if (finalOutput) return finalOutput;
	if (result.errorMessage) return result.errorMessage;
	if (result.stderr.trim()) return result.stderr.trim();
	return "(no output)";
}

export function formatResultForMainAgent(result: SubagentResultLike): string {
	const status = result.exitCode === 0 ? "completed" : result.stopReason || "failed";
	const lines = [`### ${result.agent}${result.step ? ` (step ${result.step})` : ""}`];
	if (result.agentSource !== "unknown") lines.push(`Source: ${result.agentSource}`);
	lines.push(`Status: ${status}`);
	lines.push("");
	lines.push(getResultReport(result));
	return lines.join("\n");
}

export function formatAggregateReport(title: string, results: SubagentResultLike[]): string {
	return `${title}\n\n${results.map((result) => formatResultForMainAgent(result)).join("\n\n")}`;
}

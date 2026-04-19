import { describe, expect, test } from "bun:test";
import {
	composeSubagentSystemPrompt,
	formatAggregateReport,
	formatResultForMainAgent,
	getFinalOutput,
} from "../report.js";

describe("subagent report helpers", () => {
	test("appends the universal report instruction to agent prompts", () => {
		const prompt = composeSubagentSystemPrompt("You are a reviewer.");

		expect(prompt).toContain("You are a reviewer.");
		expect(prompt).toContain("Always finish your response with a final report back to the main agent.");
		expect(prompt.trim().endsWith("Do not omit the report even if you already provided intermediate updates.")).toBe(true);
	});

	test("joins all text parts from the last assistant message", () => {
		const output = getFinalOutput([
			{ role: "assistant", content: [{ type: "text", text: "older" }] },
			{
				role: "assistant",
				content: [
					{ type: "toolCall", name: "read", arguments: { path: "file.ts" } },
					{ type: "text", text: "line one" },
					{ type: "text", text: "line two" },
				],
			},
		]);

		expect(output).toBe("line one\nline two");
	});

	test("formats full findings for the main agent without truncation", () => {
		const report = formatResultForMainAgent({
			agent: "reviewer",
			agentSource: "user",
			exitCode: 0,
			messages: [
				{
					role: "assistant",
					content: [
						{ type: "text", text: "Finding one" },
						{ type: "text", text: "Finding two" },
					],
				},
			],
			stderr: "",
		});

		expect(report).toContain("### reviewer");
		expect(report).toContain("Source: user");
		expect(report).toContain("Status: completed");
		expect(report).toContain("Finding one\nFinding two");
	});

	test("includes each subagent report in aggregate output", () => {
		const report = formatAggregateReport("Parallel: 2/2 succeeded", [
			{
				agent: "reviewer-1",
				agentSource: "project",
				exitCode: 0,
				messages: [{ role: "assistant", content: [{ type: "text", text: "First report" }] }],
				stderr: "",
			},
			{
				agent: "reviewer-2",
				agentSource: "project",
				exitCode: 0,
				messages: [{ role: "assistant", content: [{ type: "text", text: "Second report" }] }],
				stderr: "",
			},
		]);

		expect(report).toContain("Parallel: 2/2 succeeded");
		expect(report).toContain("### reviewer-1");
		expect(report).toContain("### reviewer-2");
		expect(report).toContain("First report");
		expect(report).toContain("Second report");
	});
});

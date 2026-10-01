// ============================================================================
// full-question reader — lets the user read an ask question the native dialog
// would cut off, then hands the call to the native ask tool unchanged.
// ============================================================================

import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

// native ask dialog: header capped at 4 wrapped rows inside a box 4 columns
// narrower than the terminal (pi-tui overlays/ask-dialog.ts MAX_HEADER_ROWS, render()).
const NATIVE_HEADER_ROWS = 4;
const NATIVE_BOX_INSET = 4;
// reader rows outside the scrolled text: title, footer, and the status line under the editor.
const READER_CHROME_ROWS = 4;

type AskParams = { questions: Array<{ question: string }> };

// greedy word wrap by terminal cell width; a word wider than the row splits by character.
function wrap(text: string, width: number): string[] {
	const rows: string[] = [];
	for (const paragraph of text.split("\n")) {
		let row = "";
		for (const word of paragraph.split(" ")) {
			const candidate = row ? `${row} ${word}` : word;
			if (Bun.stringWidth(candidate) <= width) {
				row = candidate;
				continue;
			}
			if (row) rows.push(row);
			row = "";
			for (const char of word) {
				if (row && Bun.stringWidth(row + char) > width) {
					rows.push(row);
					row = "";
				}
				row += char;
			}
		}
		rows.push(row);
	}
	return rows;
}

/**
 * @cc [label:ceiling] ask-full-question-reader
 * re-registers `ask` in the interactive tui session only. questions whose
 * wrapped text exceeds the native header cap open a scrollable reader first;
 * the call then runs the native ask via `invokeTool` with the original params,
 * so answers, cancel, and notes stay native. native ask arms its terminal
 * notification, speech, and `ask.timeout` only after the reader closes. while overridden, the
 * transcript shows omp's generic tool card, not the native ask card, because
 * omp only uses name-keyed renderers for built-in tools. removing it means
 * deleting this file and its install call in index.ts.
 * until: the native ask dialog can show an expanded question in full at any terminal height
 */
export function installFullQuestionReader(pi: ExtensionAPI): void {
	let installed = false;
	pi.on("session_start", (_event, ctx) => {
		if (installed || ctx.mode !== "tui") return;
		const native = pi.getAllTools().find(tool => tool.name === "ask");
		if (!native) return;
		installed = true;
		pi.registerTool({
			name: "ask",
			label: "Ask",
			description: native.description,
			parameters: native.parameters,
			approval: "read",
			strict: true,
			loadMode: "discoverable",
			// omp proxies own keys onto the live tool; native ask must run alone in its batch.
			concurrency: "exclusive",
			async execute(_toolCallId, params, signal, onUpdate, context) {
				if (!context.invokeTool) throw new Error("native ask tool is unavailable");
				const width = Math.max(1, (process.stdout.columns || 80) - NATIVE_BOX_INSET);
				const hidden = (params as AskParams).questions
					// pi-tui renders a tab as 3 columns; Bun.stringWidth counts it as 0.
					.map(question => question.question.replaceAll("\t", "   "))
					.filter(question => wrap(question, width).length > NATIVE_HEADER_ROWS);
				if (hidden.length > 0) await readQuestions(context, hidden, signal);
				return context.invokeTool(params as Record<string, unknown>, { signal, onUpdate });
			},
		} as Parameters<ExtensionAPI["registerTool"]>[0]);
	});
}

function readQuestions(ctx: ExtensionContext, questions: string[], signal: AbortSignal | undefined): Promise<void> {
	return ctx.ui.custom<void>((tui, theme, keybindings, done) => {
		let offset = 0;
		const viewRows = (): number => Math.max(3, tui.terminal.rows - READER_CHROME_ROWS);
		return {
			render(width: number): string[] {
				const lines = questions.flatMap((question, index) => [
					...(index > 0 ? [""] : []),
					...wrap(question, Math.max(1, width)),
				]);
				const rows = viewRows();
				offset = Math.min(offset, Math.max(0, lines.length - rows));
				const end = Math.min(lines.length, offset + rows);
				return [
					theme.bold(theme.fg("accent", "Ask · full question")),
					...lines.slice(offset, end),
					theme.fg("dim", `lines ${offset + 1}-${end} of ${lines.length} · ↑/↓ PgUp/PgDn scroll · Enter answer`),
				];
			},
			handleInput(data: string): void {
				if (keybindings.matches(data, "tui.select.confirm") || keybindings.matches(data, "tui.select.cancel")) {
					done();
					return;
				}
				const page = viewRows() - 1;
				if (keybindings.matches(data, "tui.select.up")) offset -= 1;
				else if (keybindings.matches(data, "tui.select.down")) offset += 1;
				else if (keybindings.matches(data, "tui.select.pageUp")) offset -= page;
				else if (keybindings.matches(data, "tui.select.pageDown")) offset += page;
				else return;
				// render() clamps the upper bound against the current wrap width.
				offset = Math.max(0, offset);
				tui.requestRender();
			},
		};
	}, { signal });
}

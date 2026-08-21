import { resolve } from "node:path";
import { jsonvalueof, stablejson } from "./contracts.ts";
import type { jsonvalue } from "./contracts.ts";
import { orchestrationstore } from "./store.ts";
import type { profilerecord, profilescope } from "./store.ts";

export type profiledocument = Record<string, jsonvalue>;

const profilefields: Record<string, true> = {
	schema: true,
	instructions: true,
	tools: true,
	processes: true,
	metadata: true,
};

function objectdocument(value: jsonvalue, path: string): Record<string, jsonvalue> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${path}: expected object`);
	return value;
}

function validateprofile(value: unknown, path = "profile"): profiledocument {
	const profile = objectdocument(jsonvalueof(value, path), path);
	for (const key of Object.keys(profile)) {
		if (!Object.hasOwn(profilefields, key)) throw new TypeError(`${path}.${key}: unknown field`);
	}
	if (profile.schema !== 1) throw new TypeError(`${path}.schema: expected 1`);
	if (profile.instructions !== undefined) {
		if (!Array.isArray(profile.instructions) || !profile.instructions.every((entry) => typeof entry === "string")) {
			throw new TypeError(`${path}.instructions: expected string array`);
		}
	}
	for (const field of ["tools", "processes", "metadata"] as const) {
		const entry = profile[field];
		if (entry !== undefined && (!entry || typeof entry !== "object" || Array.isArray(entry))) {
			throw new TypeError(`${path}.${field}: expected object`);
		}
	}
	return profile;
}

function setproperty(target: Record<string, jsonvalue>, key: string, value: jsonvalue): void {
	Object.defineProperty(target, key, {
		value,
		enumerable: true,
		configurable: true,
		writable: true,
	});
}

export function mergepatch(target: jsonvalue, patch: jsonvalue): jsonvalue {
	if (!patch || typeof patch !== "object" || Array.isArray(patch)) return jsonvalueof(patch);
	const output: Record<string, jsonvalue> = {};
	if (target && typeof target === "object" && !Array.isArray(target)) {
		for (const [key, value] of Object.entries(target)) setproperty(output, key, jsonvalueof(value));
	}
	for (const [key, value] of Object.entries(patch)) {
		if (value === null) {
			delete output[key];
			continue;
		}
		const current = Object.hasOwn(output, key) ? output[key] : null;
		setproperty(output, key, mergepatch(current ?? null, value));
	}
	return output;
}

export interface profilesnapshot {
	effective: profiledocument;
	userprofileversion: number | null;
	projectprofileversion: number | null;
}

export class profileservice {
	private readonly store: orchestrationstore;

	constructor(store: orchestrationstore) {
		this.store = store;
	}


	validate(document: unknown): profiledocument {
		return validateprofile(document);
	}
	write(scope: profilescope, projectroot: string, document: unknown): profilerecord {
		const root = scope === "user" ? "" : resolve(projectroot);
		return this.store.writeprofile(scope, root, validateprofile(document));
	}

	read(scope: profilescope, projectroot: string): profilerecord | null {
		const root = scope === "user" ? "" : resolve(projectroot);
		return this.store.getprofile(scope, root);
	}

	history(scope: profilescope, projectroot: string): profilerecord[] {
		const root = scope === "user" ? "" : resolve(projectroot);
		return this.store.profilehistory(scope, root);
	}

	snapshot(projectroot: string, defaults: unknown, runpatch: unknown): profilesnapshot {
		let effective: jsonvalue = validateprofile(defaults, "profile.defaults");
		const user = this.read("user", "");
		if (user) effective = mergepatch(effective, user.document);
		const project = this.read("project", projectroot);
		if (project) effective = mergepatch(effective, project.document);
		effective = mergepatch(effective, validateprofile(runpatch, "profile.run"));
		return {
			effective: validateprofile(effective, "profile.effective"),
			userprofileversion: user?.version ?? null,
			projectprofileversion: project?.version ?? null,
		};
	}

	effective(projectroot: string, defaults: unknown, runpatch: unknown): profiledocument {
		return this.snapshot(projectroot, defaults, runpatch).effective;
	}

	render(profile: unknown): string {
		return `omnipotence profile\n${stablejson(validateprofile(profile))}`;
	}
}

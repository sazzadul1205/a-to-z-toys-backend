import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import Settings from "./Settings.js";

const base = createRepository("settings", Settings);

// The settings store is a single document. Reads create it with
// the defaults on first use, so a fresh install boots with a
// complete record instead of null checks at every call site.
const SETTINGS_ID = "store";
const DEFAULTS = { reviewsEnabled: true };

async function getSettings() {
  const existing = await base.findById(SETTINGS_ID);
  if (existing) return existing;

  const { valid, doc } = await validateAndBuild(Settings, {
    _id: SETTINGS_ID,
    ...DEFAULTS,
  });
  if (!valid) {
    throw new Error("Invalid default settings");
  }

  return base.create(doc);
}

async function updateSettings(patch) {
  const current = await getSettings();
  const merged = { ...current, ...patch, _id: SETTINGS_ID };

  const { valid, doc, errors } = await validateAndBuild(Settings, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(SETTINGS_ID, doc);
}

export const settingsRepository = {
  ...base,
  getSettings,
  updateSettings,
};

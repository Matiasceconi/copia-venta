import { base44 } from "@/api/base44Client";

export const DEFAULT_FIELD_EXERCISE_TYPES = ["Activación", "Técnico", "Táctico", "Reducido", "Posesión", "Finalización", "Fuerza", "Regenerativo", "Otro"];
const GROUP = "field_exercise_type";

function cleanLabel(label) {
  return String(label || "").trim();
}

function uniqueLabels(labels) {
  return [...new Set(labels.map(cleanLabel).filter(Boolean))];
}

export async function loadFieldExerciseTypes() {
  const records = await base44.entities.PlannerDropdownOption.filter({ group: GROUP }, "order", 200);
  const inactive = new Set(records.filter(r => r.active === false).map(r => cleanLabel(r.label)));
  const custom = records.filter(r => r.active !== false).map(r => cleanLabel(r.label));
  return uniqueLabels([...DEFAULT_FIELD_EXERCISE_TYPES.filter(label => !inactive.has(label)), ...custom]);
}

export async function addFieldExerciseType(label) {
  const value = cleanLabel(label);
  if (!value) return null;
  const records = await base44.entities.PlannerDropdownOption.filter({ group: GROUP, label: value }, "order", 10);
  if (records[0]) return await base44.entities.PlannerDropdownOption.update(records[0].id, { active: true });
  return await base44.entities.PlannerDropdownOption.create({ group: GROUP, label: value, order: Date.now(), active: true });
}

export async function deleteFieldExerciseType(label) {
  const value = cleanLabel(label);
  if (!value) return;
  const records = await base44.entities.PlannerDropdownOption.filter({ group: GROUP, label: value }, "order", 10);
  if (records[0]) await base44.entities.PlannerDropdownOption.update(records[0].id, { active: false });
  else await base44.entities.PlannerDropdownOption.create({ group: GROUP, label: value, order: Date.now(), active: false });
}

export async function renameFieldExerciseType(oldLabel, newLabel) {
  const oldValue = cleanLabel(oldLabel);
  const newValue = cleanLabel(newLabel);
  if (!oldValue || !newValue || oldValue === newValue) return;
  await deleteFieldExerciseType(oldValue);
  await addFieldExerciseType(newValue);
  await base44.entities.SessionExercise.updateMany({ type: oldValue }, { $set: { type: newValue } });
  await base44.entities.FieldExerciseLibrary.updateMany({ type: oldValue }, { $set: { type: newValue } });
  await base44.entities.FieldExercise.updateMany({ type: oldValue }, { $set: { type: newValue } });
}
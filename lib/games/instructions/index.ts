import { workflowInstruction } from "./workflow";
import { runtimeInstruction } from "./runtime";

export { workflowInstruction } from "./workflow";
export { runtimeInstruction } from "./runtime";

export const gameInstructions: string[] = [
  workflowInstruction,
  runtimeInstruction,
];

export const gameSystemPrompt: string = gameInstructions.join("\n\n");
export default gameInstructions;

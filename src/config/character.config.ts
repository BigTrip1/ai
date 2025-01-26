import { CharacterState } from "@/types/character";

export const defaultCharacterState: CharacterState = {
  status: {
    currentTask: null,
    lastUpdate: new Date(),
  },
  emotion: {
    name: "neutral",
    intensity: 0.5,
    expression: "default",
  },
};

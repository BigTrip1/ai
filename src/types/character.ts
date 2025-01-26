export interface Emotion {
  name: string;
  intensity: number;
  expression: string;
}

export interface CharacterState {
  name: string;
  avatar: {
    model: string; // Path to 3D model or avatar image
    animations: string[];
    currentAnimation: string;
  };
  emotion: {
    name: string;
    intensity: number;
    expression: string;
  };
  personality: {
    traits: string[];
    tone: string;
    responseStyle: string;
  };
  status: {
    isActive: boolean;
    currentTask: string | null;
    lastUpdate: Date;
  };
  customization: {
    appearance: Record<string, any>;
    behavior: Record<string, any>;
  };
}

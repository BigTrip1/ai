import { AnimationClip, AnimationMixer, Object3D } from "three";
import { Emotion } from "@/types/character";

export class AnimationController {
  private mixer: AnimationMixer | null = null;
  private animations: Map<string, AnimationClip> = new Map();
  private currentAction: any = null;

  constructor(model: Object3D, animations: AnimationClip[]) {
    this.mixer = new AnimationMixer(model);
    animations.forEach((clip) => {
      this.animations.set(clip.name, clip);
    });
  }

  playAnimation(name: string, fadeTime: number = 0.5) {
    const clip = this.animations.get(name);
    if (!clip || !this.mixer) return;

    const newAction = this.mixer.clipAction(clip);

    if (this.currentAction) {
      this.currentAction.fadeOut(fadeTime);
    }

    newAction.reset().fadeIn(fadeTime).play();
    this.currentAction = newAction;
  }

  update(delta: number) {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  setEmotionAnimation(emotion: Emotion) {
    const emotionToAnimation: Record<string, string> = {
      happy: "happy",
      sad: "sad",
      neutral: "idle",
      thinking: "thinking",
      talking: "talking",
    };

    const animationName = emotionToAnimation[emotion.name] || "idle";
    this.playAnimation(animationName);
  }

  cleanup() {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }
}

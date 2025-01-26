import { useState } from "react";
import { CharacterState } from "@/types/character";

interface CharacterCustomizerProps {
  characterState: CharacterState;
  onUpdate: (newState: Partial<CharacterState>) => void;
}

export default function CharacterCustomizer({
  characterState,
  onUpdate,
}: CharacterCustomizerProps) {
  const [activeTab, setActiveTab] = useState<"appearance" | "personality">(
    "appearance"
  );

  const handlePersonalityChange = (field: string, value: string | string[]) => {
    onUpdate({
      personality: {
        ...characterState.personality,
        [field]: value,
      },
    });
  };

  const handleAppearanceChange = (field: string, value: any) => {
    onUpdate({
      customization: {
        ...characterState.customization,
        appearance: {
          ...characterState.customization.appearance,
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            activeTab === "appearance"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setActiveTab("appearance")}
        >
          Appearance
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activeTab === "personality"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
          onClick={() => setActiveTab("personality")}
        >
          Personality
        </button>
      </div>

      {activeTab === "appearance" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Customize Appearance</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select
                className="w-full p-2 rounded bg-white/5"
                value={characterState.avatar.model}
                onChange={(e) =>
                  onUpdate({
                    avatar: { ...characterState.avatar, model: e.target.value },
                  })
                }
              >
                <option value="/models/default-character.glb">Default</option>
                <option value="/models/professional-character.glb">
                  Professional
                </option>
                <option value="/models/casual-character.glb">Casual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Animation Style
              </label>
              <select
                className="w-full p-2 rounded bg-white/5"
                value={characterState.avatar.currentAnimation}
                onChange={(e) =>
                  onUpdate({
                    avatar: {
                      ...characterState.avatar,
                      currentAnimation: e.target.value,
                    },
                  })
                }
              >
                {characterState.avatar.animations.map((anim) => (
                  <option key={anim} value={anim}>
                    {anim.charAt(0).toUpperCase() + anim.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === "personality" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Customize Personality</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Personality Traits
            </label>
            <select
              className="w-full p-2 rounded bg-white/5"
              multiple
              value={characterState.personality.traits}
              onChange={(e) =>
                handlePersonalityChange(
                  "traits",
                  Array.from(e.target.selectedOptions, (option) => option.value)
                )
              }
            >
              <option value="helpful">Helpful</option>
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="creative">Creative</option>
              <option value="analytical">Analytical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Communication Tone
            </label>
            <select
              className="w-full p-2 rounded bg-white/5"
              value={characterState.personality.tone}
              onChange={(e) => handlePersonalityChange("tone", e.target.value)}
            >
              <option value="conversational">Conversational</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
              <option value="technical">Technical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Response Style
            </label>
            <select
              className="w-full p-2 rounded bg-white/5"
              value={characterState.personality.responseStyle}
              onChange={(e) =>
                handlePersonalityChange("responseStyle", e.target.value)
              }
            >
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
              <option value="concise">Concise</option>
              <option value="empathetic">Empathetic</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

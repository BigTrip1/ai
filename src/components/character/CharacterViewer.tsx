"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import { CharacterState } from "@/types/character";
import { PlaceholderModel } from "./PlaceholderModel";

interface CharacterViewerProps {
  characterState: CharacterState;
  onInteract?: (event: any) => void;
}

export default function CharacterViewer({
  characterState,
  onInteract,
}: CharacterViewerProps) {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <PlaceholderModel />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>

      <div className="absolute bottom-4 left-4 bg-black/50 text-white p-2 rounded">
        {characterState.status.currentTask && (
          <p>Current Task: {characterState.status.currentTask}</p>
        )}
        <p>Emotion: {characterState.emotion.name}</p>
        <p>Expression: {characterState.emotion.expression}</p>
        <p>Intensity: {characterState.emotion.intensity.toFixed(2)}</p>
      </div>
    </div>
  );
}

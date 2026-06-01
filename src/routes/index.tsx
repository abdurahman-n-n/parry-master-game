import { createFileRoute } from "@tanstack/react-router";
import { GameShell } from "@/game/GameShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PARRY! — A 2D indie game" },
      { name: "description", content: "Read the attack. Strike back at the perfect moment. A one-button parry game." },
      { property: "og:title", content: "PARRY!" },
      { property: "og:description", content: "Read the attack. Strike back at the perfect moment." },
    ],
  }),
  component: Index,
});

function Index() {
  return <GameShell />;
}

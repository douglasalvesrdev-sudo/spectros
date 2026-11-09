import { createFileRoute } from "@tanstack/react-router";
import { ClanPortal } from "@/components/clan-portal";

export const Route = createFileRoute("/")({
  component: ClanPortal,
});

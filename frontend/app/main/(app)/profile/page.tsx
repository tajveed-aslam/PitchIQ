import { redirect } from "next/navigation";

// Lite calls it /profile; Global splits it into the player card and settings.
export default function Profile() {
  redirect("/settings");
}

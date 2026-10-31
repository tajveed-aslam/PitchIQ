import { redirect } from "next/navigation";

// Lite calls it /events; Global has challenges and badges together.
export default function Events() {
  redirect("/challenges");
}

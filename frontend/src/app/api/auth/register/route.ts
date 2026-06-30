import "@/lib/load-env";
import { apiError } from "@/lib/api-helpers";

export async function POST() {
  return apiError(
    "Self-registration is disabled. Please contact your administrator for an account.",
    403
  );
}

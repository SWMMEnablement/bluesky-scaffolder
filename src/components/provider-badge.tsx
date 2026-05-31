import { getProvider, providerStatus } from "@/lib/swmm/provider";
import { StatusPill } from "./tool-kit";

/** Small pill engineers can use to tell real-from-stub at a glance. */
export function ProviderBadge() {
  const p = getProvider();
  const s = providerStatus(p);
  return <StatusPill tone={s.tone}>{s.text}</StatusPill>;
}

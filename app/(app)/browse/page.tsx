"use client";

import { useRouter } from "next/navigation";
import { BrowsePhone } from "@/components/BrowsePhone";

// Routed browse tab — after a food is selected we navigate to /scan where
// the breakdown card lives. In the side-by-side demo, BrowsePhone is rendered
// without onAfterSelect since the breakdown is already on the next phone.
export default function BrowseRoute() {
  const router = useRouter();
  return <BrowsePhone onAfterSelect={(foodId) => router.push(`/food/${foodId}`)} />;
}

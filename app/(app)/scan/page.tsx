"use client";

import { useRouter } from "next/navigation";
import { ProductPhone } from "@/components/ProductPhone";

// Routed scan tab — pure scanner UI. After a successful lookup (camera or
// typed UPC) we navigate to /food/[id] where the breakdown lives, so the
// scanner controls don't sit on top of a result the user already has.
const ScanRoute = () => {
  const router = useRouter();
  return <ProductPhone onAfterScan={(foodId) => router.push(`/food/${foodId}`)} />;
};

export default ScanRoute;

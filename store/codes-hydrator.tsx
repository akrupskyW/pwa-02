"use client";

import { useEffect, useRef } from "react";

import type { SelectableExpression } from "@/lib/types";
import { useAppDispatch } from "@/store/hooks";
import { setCodes } from "@/store/slices/codes-slice";

/** Hydrates the codes catalog (fetched server-side) into the Redux store on
 *  mount. Renders nothing — it's a side-effect bridge between server data
 *  and client store. */
export const CodesHydrator = ({ codes }: { codes: SelectableExpression[] }) => {
  const dispatch = useAppDispatch();
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    dispatch(setCodes(codes));
  }, [codes, dispatch]);
  return null;
};

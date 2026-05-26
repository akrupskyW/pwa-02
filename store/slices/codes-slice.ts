import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { SelectableExpression } from "@/lib/types";

export interface CodesState {
  catalog: SelectableExpression[];
}

const initialState: CodesState = {
  catalog: [],
};

const codesSlice = createSlice({
  name: "codes",
  initialState,
  reducers: {
    setCodes: (state, action: PayloadAction<SelectableExpression[]>) => {
      state.catalog = action.payload;
    },
  },
});

export const { setCodes } = codesSlice.actions;
export default codesSlice.reducer;

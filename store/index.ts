import { configureStore } from "@reduxjs/toolkit";

import { persistenceMiddleware } from "@/store/middleware/persistence";
import codesReducer from "@/store/slices/codes-slice";
import preferencesReducer from "@/store/slices/preferences-slice";

export const makeStore = () =>
  configureStore({
    reducer: {
      preferences: preferencesReducer,
      codes: codesReducer,
    },
    middleware: (getDefault) => getDefault().prepend(persistenceMiddleware.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

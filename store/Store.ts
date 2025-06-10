import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./UserSlice"
import {persistReducer} from "redux-persist";
import storage from  "redux-persist/lib/storage";
import { combineReducers } from "@reduxjs/toolkit";
const persistConfig={
    key:"root",
    storage,
    version:1,
}
const reducer=combineReducers({
    user: userReducer,
})
const persistReducerConfig=persistReducer(persistConfig,reducer);
const store= configureStore({
    reducer:persistReducerConfig,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
})
export default store;

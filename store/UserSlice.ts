import { createSlice } from '@reduxjs/toolkit'
const userSlice= createSlice({
    name: 'user',
    initialState:{
        user:null,
    },
    reducers:{
      
        loging:(state,action)=>{
            state.user=action.payload;
        },
        logout:(state,action)=>{
            state.user=null;
        },
        addUser:(state,action)=>{
           state.user=action.payload;
        }

    }})
    export const {loging,logout,addUser}=userSlice.actions;
    export default userSlice.reducer;

import { connectDB } from '../DB/connection.js';
import authRouter from './modules/authentication/auth.router.js'
import {createAdmin} from '../DB/model/user.js'




const initApp = (app,express)=>{
    connectDB();
    createAdmin();
    app.use(express.json());
    app.use('/auth',authRouter);
    
}

export default initApp;
import { connectDB } from '../DB/connection.js';
import authRouter from './modules/authentication/auth.router.js';
import uploadRouter from './uploadfile-newtask/upload.router.js';
import {createAdmin} from '../DB/model/user.js'
import UserModel from '../DB/model/user.js';
import AnnotationTaskModel from '../DB/model/annotationtask.js';
import SentenceModel from '../DB/model/sentence.js'
import AnnotationModel from '../DB/model/annotation.js';
import FileManager from '../DB/model/filemanager.js'
const initApp = (app,express)=>{
    connectDB();
    createAdmin();
    app.use(express.json());
    app.use('/auth',authRouter);
    app.use('/file',uploadRouter);
}

export default initApp;
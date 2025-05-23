import { connectDB } from '../DB/connection.js';
import authRouter from './modules/authentication/auth.router.js';
import uploadRouter from './uploadfile-newtask/upload.router.js';
import {createAdmin} from '../DB/model/user.js'
import UserModel from '../DB/model/user.js';
import AnnotationTaskModel from '../DB/model/annotationtask.js';
import SentenceModel from '../DB/model/sentence.js'
import AnnotationModel from '../DB/model/annotation.js';
import FileManager from '../DB/model/filemanager.js';
import TaskCollaboratorModel from '../DB/model/taskcollaborator.js';
import sentenceRouter from './sentence/sentence.router.js';
import userRouter from './user/user.router.js';
import taskRouter from './Task/task.router.js';
import annotationRouter from './annotation/annotation.router.js';
import adminRouter from './user/admin.router.js';
import notesRouter from './note/note.router.js';
import { globalErrorHandler } from './middleware/globalErrorHandler.js';
import aiRouter from './ai-Api/ai.router.js'
const initApp = (app,express)=>{
  app.use(express.json());
    connectDB();
    createAdmin();
    app.use('/auth',authRouter);
    app.use('/file',uploadRouter);
    app.use('/sentence',sentenceRouter);
    app.use('/tasks',taskRouter);
    app.use('/users',userRouter);
    app.use('/annotation',annotationRouter)
    app.use('/admin',adminRouter);
    app.use('/ai',aiRouter);
    app.use('/notes',notesRouter);
    app.use(globalErrorHandler);
    
}

export default initApp;

import express, {urlencoded} from 'express';
import initApp from './src/index.router.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
const app = express();
app.use(cors({ credentials: true, origin: "http://localhost:5173" }));
app.use(urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

initApp(app,express);

app.listen(3000 , ()=>{
    console.log('Server is running on port 3000');
});
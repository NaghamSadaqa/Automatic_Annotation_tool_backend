
import express, {urlencoded} from 'express';
import initApp from './src/index.router.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors({ credentials: true, origin: '*' }));
app.use(urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

initApp(app,express);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));




app.listen(3000 , ()=>{
    console.log('Server is running on port 3000');
});
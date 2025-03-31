
import express from 'express';
import initApp from './src/index.router.js';
import cors from 'cors';
const app = express();
app.use(cors());

initApp(app,express);

app.listen(3000 , ()=>{
    console.log('Server is running on port 3000');
});
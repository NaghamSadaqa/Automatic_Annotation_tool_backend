import { Sequelize } from "sequelize";

 export const sequelize = new Sequelize('toolproj', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: null
  });

export const connectDB =()=>{
    sequelize.sync().then(()=>{
     console.log("connection done");
    })
    .catch( (error)=>{
     console.log("error to connection to the database"+error);
    })
    ;
}

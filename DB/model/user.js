import  { Sequelize, DataTypes } from 'sequelize';
import  {sequelize} from '../connection.js';
import { where } from 'sequelize';
import bcrypt from 'bcryptjs';
const UserModel = sequelize.define("User",{
    user_id:{
        type:DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true,
    },
    userName:{
        type:DataTypes.STRING,
        unique:true,
        allowNull:false,
    },
    email:{
        type:DataTypes.STRING,
        unique:true,
        allowNull:false,
    },
    password:{
        type:DataTypes.STRING,
        allowNull:false,
    },
   
    dateofbirth:{
     type:DataTypes.DATE,
     allowNull:false,
    },
   
    role:{
    type:DataTypes.ENUM('user','admin'),
    defaultValue:'user',
    allowNull:false,
    },
    
    is_deleted:{
    type:DataTypes.BOOLEAN,
    defaultValue:false,
    }
});

export async function createAdmin() {
    try {
       
      const adminExists = await UserModel.findOne({ where: { role: "admin" } });
      if (!adminExists) {
        const password= "nagham123";
        const hashedpassword = bcrypt.hashSync("password", 8); 
        await UserModel.create({
          userName: "NaghamSadaqa",
          email: "naghamsadaqa@gmail.com",
          password: hashedpassword, 
          dateofbirth: new Date("2002-10-17"),
          role: "admin",
          is_deleted:false,
        });
        console.log("Admin account created successfully.");
      } else {
        console.log("Admin already exists.");
      }
    } catch (error) {
      console.error("Error creating admin:", error);
    }
  }



export default UserModel;
import  { Sequelize, DataTypes } from 'sequelize';
import  {sequelize} from '../connection.js';
import UserModel from "./user.js";
import AnnotationTaskModel from "./annotationtask.js";

const TaskCollaboratorModel = sequelize.define("TaskCollaborator", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

});


// العلاقات
AnnotationTaskModel.hasMany(TaskCollaboratorModel, { foreignKey: "task_id", as: "Collaborators", onDelete: "CASCADE" });
TaskCollaboratorModel.belongsTo(AnnotationTaskModel, { foreignKey: "task_id", as: "Task" , onDelete: "CASCADE" });


UserModel.hasMany(TaskCollaboratorModel, { foreignKey: "user_id", as: "Tasks" , onDelete: "CASCADE"});
TaskCollaboratorModel.belongsTo(UserModel, { foreignKey: "user_id", as: "Collaborator" , onDelete: "CASCADE" });

export default TaskCollaboratorModel;
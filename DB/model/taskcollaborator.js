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
  }
});

// العلاقات
AnnotationTaskModel.hasMany(TaskCollaboratorModel, { foreignKey: "task_id" });
TaskCollaboratorModel.belongsTo(AnnotationTaskModel, { foreignKey: "task_id" });

UserModel.hasMany(TaskCollaboratorModel, { foreignKey: "user_id" });
TaskCollaboratorModel.belongsTo(UserModel, { foreignKey: "user_id" });

export default TaskCollaboratorModel;
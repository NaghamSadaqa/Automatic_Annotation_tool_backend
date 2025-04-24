
import  { Sequelize, DataTypes } from 'sequelize';
import  {sequelize} from '../connection.js';
import UserModel from './user.js';
const AnnotationTaskModel = sequelize.define("AnnotationTask", {
    task_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    task_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    task_description: {
        type: DataTypes.STRING,
    },
    annotation_type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    labels: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('in-progress', 'completed'),
        defaultValue: "in-progress",
    }
   
});
UserModel.hasMany(AnnotationTaskModel, { foreignKey: "created_by" , as: "OwnedTasks" });
AnnotationTaskModel.belongsTo(UserModel, { foreignKey: "created_by",as: "Owner" ,onDelete: "SET NULL" });

export default AnnotationTaskModel;
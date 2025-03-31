import { Sequelize, DataTypes } from "sequelize";
import { sequelize } from "../connection.js";
import AnnotationTaskModel from "./annotationtask.js";
import UserModel from "./user.js";

const FileManager = sequelize.define("FileManager", {
    file_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    file_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    file_path: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    file_type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    task_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
});

UserModel.hasMany(FileManager, { foreignKey: "uploaded_by" });
AnnotationTaskModel.hasMany(FileManager, { foreignKey: "task_id" });
FileManager.belongsTo(UserModel, { foreignKey: "uploaded_by" });
FileManager.belongsTo(AnnotationTaskModel, { foreignKey: "task_id", onDelete: "CASCADE" });

export default FileManager;
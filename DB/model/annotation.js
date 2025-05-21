import  { Sequelize, DataTypes } from 'sequelize';
import  {sequelize} from '../connection.js';
import UserModel from './user.js';
import SentenceModel from './sentence.js'
import AnnotationTaskModel from './annotationtask.js';

const AnnotationModel = sequelize.define("Annotation", {
    annotation_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    label: {
        type: DataTypes.STRING,
        allowNull: false,
    }
   
});
SentenceModel.hasMany(AnnotationModel, { foreignKey: "sentence_id" , onDelete: "CASCADE"});
AnnotationModel.belongsTo(SentenceModel, { foreignKey: "sentence_id", onDelete: "CASCADE" });

UserModel.hasMany(AnnotationModel, { foreignKey: "annotator_id", onDelete: "CASCADE" });
AnnotationModel.belongsTo(UserModel, { foreignKey: "annotator_id",as: "annotator", onDelete: "CASCADE" });

AnnotationTaskModel.hasMany(AnnotationModel, { foreignKey: "task_id" , onDelete: "CASCADE"});
AnnotationModel.belongsTo(AnnotationTaskModel, { as: 'Task' ,foreignKey: "task_id", onDelete: "CASCADE" });

export default AnnotationModel;
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
        allowNull: true,
    },
  certainty: {
    type: DataTypes.INTEGER, // نسبة مئوية من 0 إلى 100
    allowNull: true
  }
   
});
SentenceModel.hasMany(AnnotationModel, { foreignKey: "sentence_id" , as: "Annotations",onDelete: "CASCADE"});
AnnotationModel.belongsTo(SentenceModel, {
  foreignKey: 'sentence_id',
  as: 'Sentence'
});

UserModel.hasMany(AnnotationModel, { foreignKey: "annotator_id", onDelete: "CASCADE" });
AnnotationModel.belongsTo(UserModel, { foreignKey: "annotator_id",as: "annotator", onDelete: "CASCADE" });

AnnotationTaskModel.hasMany(AnnotationModel, { foreignKey: "task_id" , onDelete: "CASCADE"});
AnnotationModel.belongsTo(AnnotationTaskModel, { as: 'Task' ,foreignKey: "task_id", onDelete: "CASCADE" });

export default AnnotationModel;
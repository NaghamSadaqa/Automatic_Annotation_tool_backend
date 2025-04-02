import  { Sequelize, DataTypes } from 'sequelize';
import  {sequelize} from '../connection.js';
import UserModel from './user.js';
import SentenceModel from './sentence.js'

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
SentenceModel.hasMany(AnnotationModel, { foreignKey: "sentence_id" });
AnnotationModel.belongsTo(SentenceModel, { foreignKey: "sentence_id", onDelete: "CASCADE" });

UserModel.hasMany(AnnotationModel, { foreignKey: "annotator_id" });
AnnotationModel.belongsTo(UserModel, { foreignKey: "annotator_id", onDelete: "CASCADE" });

export default AnnotationModel;
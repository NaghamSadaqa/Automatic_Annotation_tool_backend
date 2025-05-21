import  { Sequelize, DataTypes } from 'sequelize';
import  {sequelize} from '../connection.js';
import AnnotationTaskModel from './annotationtask.js';



const SentenceModel = sequelize.define("Sentence", {
    sentence_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    sentence_text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    original_file_row_id: {
        type: DataTypes.INTEGER,
    },
 ai_label: {
  type: DataTypes.STRING,
  allowNull: true,
},
ai_score: {
  type: DataTypes.FLOAT,
  allowNull: true,
}
   
});
AnnotationTaskModel.hasMany(SentenceModel, { foreignKey: "task_id", onDelete: "CASCADE"  });
SentenceModel.belongsTo(AnnotationTaskModel, { foreignKey: "task_id", onDelete: "CASCADE" });
export default SentenceModel;